"""
build_dataset.py
────────────────
Collect per-driver per-race features from FastF1 and write them to the
SQLite database (table: prediction_training_data).

Run once offline to build / refresh the training set:
    cd backend
    python scripts/build_dataset.py [--start 2018] [--end 2024]

Features written for every (year, round, driver) row:
    grid_pos          – grid position at race start (1-based, 20 if unknown)
    quali_gap_ms      – gap to pole in Q (ms); None if not available
    driver_points     – championship points before this race
    team_points       – constructor points before this race
    last_finish_pos   – finishing position in the previous race
    track_win_rate    – (driver wins at circuit) / (driver starts at circuit)
    track_podium_rate – same for podiums
    dnf_rate          – (DNF races in last 20 starts) / 20
    season_win_rate   – (wins so far this season) / (races so far this season)
    winner            – 1 if this driver won, 0 otherwise
"""

import argparse
import logging
import os
import sys
import traceback
import warnings

warnings.filterwarnings("ignore")

# Make sure "backend/" is on sys.path so we can import our own modules
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)

import fastf1
import numpy as np
import pandas as pd

from database.connection import get_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

CACHE_DIR = os.path.join(BACKEND_DIR, "cache")
os.makedirs(CACHE_DIR, exist_ok=True)
fastf1.Cache.enable_cache(CACHE_DIR)

# ────────────────────────────────────────────────────────────────────────────────
# DB schema
# ────────────────────────────────────────────────────────────────────────────────

CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS prediction_training_data (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    year             INTEGER NOT NULL,
    round            INTEGER NOT NULL,
    circuit          TEXT    NOT NULL,
    driver_code      TEXT    NOT NULL,
    team_name        TEXT,
    grid_pos         REAL,
    quali_gap_ms     REAL,
    driver_points    REAL,
    team_points      REAL,
    last_finish_pos  REAL,
    track_win_rate   REAL,
    track_podium_rate REAL,
    dnf_rate         REAL,
    season_win_rate  REAL,
    finish_pos       REAL,
    winner           INTEGER NOT NULL DEFAULT 0,
    UNIQUE(year, round, driver_code)
);
"""

# ────────────────────────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────────────────────────

def _safe(val, default=np.nan):
    try:
        if pd.isna(val):
            return default
    except (TypeError, ValueError):
        pass
    return val


def _pos(val) -> float:
    """Grid / finish position as float; 20.0 if unknown."""
    v = _safe(val)
    try:
        return float(v)
    except (TypeError, ValueError):
        return 20.0


# ────────────────────────────────────────────────────────────────────────────────
# Feature engineering from race session
# ────────────────────────────────────────────────────────────────────────────────

def build_race_rows(session, year: int, rnd: int, circuit: str,
                    history: list[dict]) -> list[dict]:
    """
    Returns one feature-dict per driver in `session.results`.
    `history` is a list of dicts (previous race rows) used for rolling stats.
    """
    results = session.results  # DataFrame indexed by driver abbreviation
    if results is None or len(results) == 0:
        return []

    rows = []
    for _, drv in results.iterrows():
        code = str(drv.get("Abbreviation", "???")).upper()
        team = str(drv.get("TeamName", ""))
        grid = _pos(drv.get("GridPosition"))
        finish = _pos(drv.get("Position"))
        winner = 1 if finish == 1.0 else 0

        # ── qualifying gap to pole ──────────────────────────────────────────
        quali_gap_ms = _quali_gap(session, code)

        # ── championship points before this race ───────────────────────────
        driver_pts, team_pts = _points_before(history, code, team, year, rnd)

        # ── last finish position ────────────────────────────────────────────
        last_finish = _last_finish(history, code)

        # ── circuit record ─────────────────────────────────────────────────
        track_win_rate, track_podium_rate = _track_record(history, code, circuit)

        # ── DNF rate (last 20 races) ────────────────────────────────────────
        dnf_rate = _dnf_rate(history, code)

        # ── season win rate (races so far this season) ─────────────────────
        season_win_rate = _season_win_rate(history, code, year, rnd)

        rows.append({
            "year": year,
            "round": rnd,
            "circuit": circuit,
            "driver_code": code,
            "team_name": team,
            "grid_pos": grid,
            "quali_gap_ms": quali_gap_ms,
            "driver_points": driver_pts,
            "team_points": team_pts,
            "last_finish_pos": last_finish,
            "track_win_rate": track_win_rate,
            "track_podium_rate": track_podium_rate,
            "dnf_rate": dnf_rate,
            "season_win_rate": season_win_rate,
            "finish_pos": finish,
            "winner": winner,
        })
    return rows


def _quali_gap(session, code: str) -> float:
    """Best Q lap time gap to pole in milliseconds."""
    try:
        ql = session.laps.pick_driver(code)
        if ql is None or len(ql) == 0:
            return np.nan
        best = ql["LapTime"].dropna().min()
        pole = session.laps["LapTime"].dropna().min()
        if pd.isna(best) or pd.isna(pole):
            return np.nan
        return float((best - pole).total_seconds() * 1000)
    except Exception:
        return np.nan


def _points_before(history, code, team, year, rnd) -> tuple[float, float]:
    prev = [h for h in history if h["year"] == year and h["round"] < rnd]
    drv = sum(p for h in prev if h["driver_code"] == code for p in [_pts_for_pos(h["finish_pos"])])
    tmn = sum(p for h in prev if h["team_name"] == team for p in [_pts_for_pos(h["finish_pos"])])
    return drv, tmn


def _pts_for_pos(pos) -> float:
    PTS = {1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1}
    try:
        return PTS.get(int(pos), 0)
    except (TypeError, ValueError):
        return 0


def _last_finish(history, code) -> float:
    prev = sorted(
        [h for h in history if h["driver_code"] == code],
        key=lambda h: (h["year"], h["round"]),
    )
    return prev[-1]["finish_pos"] if prev else 10.0  # neutral default


def _track_record(history, code, circuit) -> tuple[float, float]:
    at_circuit = [h for h in history if h["driver_code"] == code and h["circuit"] == circuit]
    if not at_circuit:
        return 0.0, 0.0
    wins = sum(1 for h in at_circuit if h["winner"] == 1)
    podiums = sum(1 for h in at_circuit if h["finish_pos"] <= 3)
    n = len(at_circuit)
    return wins / n, podiums / n


def _dnf_rate(history, code) -> float:
    recent = sorted(
        [h for h in history if h["driver_code"] == code],
        key=lambda h: (h["year"], h["round"]),
    )[-20:]
    if not recent:
        return 0.0
    dnfs = sum(1 for h in recent if h["finish_pos"] >= 18)
    return dnfs / len(recent)


def _season_win_rate(history, code, year, rnd) -> float:
    season = [h for h in history if h["driver_code"] == code and h["year"] == year and h["round"] < rnd]
    if not season:
        return 0.0
    wins = sum(1 for h in season if h["winner"] == 1)
    return wins / len(season)


# ────────────────────────────────────────────────────────────────────────────────
# Main loop
# ────────────────────────────────────────────────────────────────────────────────

def build_dataset(start_year: int = 2018, end_year: int = 2024):
    with get_db() as conn:
        conn.execute(CREATE_TABLE)

    all_history: list[dict] = []

    for year in range(start_year, end_year + 1):
        log.info("═══ Season %d ═══", year)
        try:
            schedule = fastf1.get_event_schedule(year, include_testing=False)
        except Exception as exc:
            log.warning("Could not fetch schedule for %d: %s", year, exc)
            continue

        for _, ev in schedule.iterrows():
            rnd = int(ev.get("RoundNumber", 0) or 0)
            circuit = str(ev.get("Location", "Unknown"))
            event_name = str(ev.get("EventName", ""))
            if rnd == 0:
                continue

            log.info("  Round %2d  %s  (%s)", rnd, event_name, circuit)

            # Load race session
            try:
                session = fastf1.get_session(year, rnd, "R")
                session.load(laps=True, telemetry=False, weather=False, messages=False)
            except Exception as exc:
                log.warning("    Skipped – could not load: %s", exc)
                continue

            try:
                new_rows = build_race_rows(session, year, rnd, circuit, all_history)
            except Exception as exc:
                log.warning("    Skipped – feature extraction failed: %s", exc)
                traceback.print_exc()
                continue

            if not new_rows:
                log.warning("    No rows extracted")
                continue

            # Upsert
            with get_db() as conn:
                for row in new_rows:
                    conn.execute(
                        """INSERT INTO prediction_training_data
                               (year, round, circuit, driver_code, team_name,
                                grid_pos, quali_gap_ms, driver_points, team_points,
                                last_finish_pos, track_win_rate, track_podium_rate,
                                dnf_rate, season_win_rate, finish_pos, winner)
                           VALUES
                               (:year,:round,:circuit,:driver_code,:team_name,
                                :grid_pos,:quali_gap_ms,:driver_points,:team_points,
                                :last_finish_pos,:track_win_rate,:track_podium_rate,
                                :dnf_rate,:season_win_rate,:finish_pos,:winner)
                           ON CONFLICT(year, round, driver_code) DO UPDATE SET
                               circuit=excluded.circuit,
                               team_name=excluded.team_name,
                               grid_pos=excluded.grid_pos,
                               quali_gap_ms=excluded.quali_gap_ms,
                               driver_points=excluded.driver_points,
                               team_points=excluded.team_points,
                               last_finish_pos=excluded.last_finish_pos,
                               track_win_rate=excluded.track_win_rate,
                               track_podium_rate=excluded.track_podium_rate,
                               dnf_rate=excluded.dnf_rate,
                               season_win_rate=excluded.season_win_rate,
                               finish_pos=excluded.finish_pos,
                               winner=excluded.winner
                        """,
                        {k: (None if isinstance(v, float) and np.isnan(v) else v) for k, v in row.items()},
                    )

            all_history.extend(new_rows)
            winners = [r["driver_code"] for r in new_rows if r["winner"] == 1]
            log.info("    %d drivers stored, winner: %s", len(new_rows), winners)

    log.info("Done. Total history rows: %d", len(all_history))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build F1 prediction training dataset")
    parser.add_argument("--start", type=int, default=2020, help="First season to collect (default 2020)")
    parser.add_argument("--end",   type=int, default=2024, help="Last season to collect (default 2024)")
    args = parser.parse_args()
    build_dataset(args.start, args.end)
