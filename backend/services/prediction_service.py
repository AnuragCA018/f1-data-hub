"""
prediction_service.py
─────────────────────
Loads the trained XGBoost model at server startup and provides a single public
function:

    predict_winner(year, round_num, session_type, session) -> list[dict]

The function:
  1. Builds feature rows for every driver in the given session's results.
  2. Runs the calibrated classifier to get win probabilities.
  3. Returns a sorted list (highest → lowest probability).
"""

import json
import logging
import math
import os
from typing import Optional

import numpy as np
import pandas as pd

log = logging.getLogger(__name__)

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
MODEL_PATH  = os.path.join(MODELS_DIR, "winner_predictor.joblib")
META_PATH   = os.path.join(MODELS_DIR, "model_meta.json")

FEATURES = [
    "grid_pos",
    "quali_gap_ms",
    "driver_points",
    "team_points",
    "last_finish_pos",
    "track_win_rate",
    "track_podium_rate",
    "dnf_rate",
    "season_win_rate",
]

# Loaded once at module import (or at startup); None until load_predictor() runs.
_MODEL = None
_META: dict = {}


# ──────────────────────────────────────────────────────────────────────────────
# Startup loader
# ──────────────────────────────────────────────────────────────────────────────

def load_predictor() -> bool:
    """Load model + meta from disk.  Returns True if successful."""
    global _MODEL, _META
    if not os.path.exists(MODEL_PATH):
        log.warning("Prediction model not found at %s — run scripts/train_model.py", MODEL_PATH)
        return False
    try:
        import joblib
        _MODEL = joblib.load(MODEL_PATH)
        log.info("Prediction model loaded from %s", MODEL_PATH)
    except Exception as exc:
        log.error("Failed to load prediction model: %s", exc)
        return False

    if os.path.exists(META_PATH):
        try:
            with open(META_PATH) as fh:
                _META = json.load(fh)
        except Exception:
            _META = {}

    return True


def model_ready() -> bool:
    return _MODEL is not None


def get_meta() -> dict:
    return _META


# ──────────────────────────────────────────────────────────────────────────────
# History helpers (read from DB)
# ──────────────────────────────────────────────────────────────────────────────

def _load_history(year: int, round_num: int, circuit: str) -> list[dict]:
    """Load historical training rows from the DB scoped to before this race."""
    try:
        from database.connection import get_db
        with get_db() as conn:
            rows = conn.execute(
                """SELECT driver_code, team_name, year, round, circuit,
                          finish_pos, winner
                   FROM prediction_training_data
                   WHERE (year < ? OR (year = ? AND round < ?))
                   ORDER BY year, round""",
                (year, year, round_num),
            ).fetchall()
        return [dict(r) for r in rows]
    except Exception as exc:
        log.warning("Could not load history from DB: %s", exc)
        return []


# ──────────────────────────────────────────────────────────────────────────────
# Feature helpers
# ──────────────────────────────────────────────────────────────────────────────

def _safe_float(val, default: float = np.nan) -> float:
    if val is None:
        return default
    try:
        if pd.isna(val):
            return default
    except (TypeError, ValueError):
        pass
    try:
        f = float(val)
        return default if (math.isnan(f) or math.isinf(f)) else f
    except (TypeError, ValueError):
        return default


def _pts_for_pos(pos) -> float:
    PTS = {1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1}
    try:
        return float(PTS.get(int(_safe_float(pos, 20)), 0))
    except (TypeError, ValueError):
        return 0.0


def _quali_gap_for_driver(session, code: str) -> float:
    try:
        ql = session.laps.pick_driver(code)
        if ql is None or len(ql) == 0:
            return 20_000.0
        best = ql["LapTime"].dropna().min()
        pole = session.laps["LapTime"].dropna().min()
        if pd.isna(best) or pd.isna(pole):
            return 20_000.0
        gap = (best - pole).total_seconds() * 1000
        return float(gap) if gap >= 0 else 20_000.0
    except Exception:
        return 20_000.0


def _build_feature_vector(
    code: str,
    team: str,
    grid: float,
    quali_gap_ms: float,
    circuit: str,
    year: int,
    round_num: int,
    history: list[dict],
) -> dict:
    # Championship points before this race
    prev_season = [h for h in history if h["year"] == year and h["round"] < round_num]
    driver_pts = sum(_pts_for_pos(h["finish_pos"]) for h in prev_season if h["driver_code"] == code)
    team_pts   = sum(_pts_for_pos(h["finish_pos"]) for h in prev_season if h["team_name"] == team)

    # Last finish position
    by_driver = sorted(
        [h for h in history if h["driver_code"] == code],
        key=lambda h: (h["year"], h["round"]),
    )
    last_finish = float(by_driver[-1]["finish_pos"]) if by_driver else 10.0

    # Track record
    at_circuit = [h for h in history if h["driver_code"] == code and h["circuit"] == circuit]
    if at_circuit:
        track_win = sum(1 for h in at_circuit if h["winner"] == 1) / len(at_circuit)
        track_pod = sum(1 for h in at_circuit if _safe_float(h["finish_pos"], 20) <= 3) / len(at_circuit)
    else:
        track_win, track_pod = 0.0, 0.0

    # DNF rate last 20
    recent = sorted(
        [h for h in history if h["driver_code"] == code],
        key=lambda h: (h["year"], h["round"]),
    )[-20:]
    dnf_rate = (sum(1 for h in recent if _safe_float(h["finish_pos"], 20) >= 18) / len(recent)) if recent else 0.0

    # Season win rate
    season_prev = [h for h in history if h["driver_code"] == code and h["year"] == year and h["round"] < round_num]
    season_win_rate = (sum(1 for h in season_prev if h["winner"] == 1) / len(season_prev)) if season_prev else 0.0

    return {
        "grid_pos":         max(1.0, min(20.0, grid)),
        "quali_gap_ms":     quali_gap_ms,
        "driver_points":    driver_pts,
        "team_points":      team_pts,
        "last_finish_pos":  last_finish,
        "track_win_rate":   track_win,
        "track_podium_rate":track_pod,
        "dnf_rate":         dnf_rate,
        "season_win_rate":  season_win_rate,
    }


# ──────────────────────────────────────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────────────────────────────────────

def predict_winner(year: int, round_num: int, circuit: str, session) -> list[dict]:
    """
    Given a FastF1 session (Race or Qualifying already loaded), return a list of
      { driver, team, grid_pos, probability, win_pct }
    sorted by probability descending.

    Raises RuntimeError if the model has not been loaded.
    """
    if _MODEL is None:
        raise RuntimeError("Prediction model is not loaded. Run scripts/train_model.py then restart the server.")

    results = session.results
    if results is None or len(results) == 0:
        raise ValueError("Session has no results data")

    history = _load_history(year, round_num, circuit)

    feature_rows = []
    driver_meta  = []

    for _, drv in results.iterrows():
        code = str(drv.get("Abbreviation", "???")).upper()
        team = str(drv.get("TeamName", ""))
        grid = _safe_float(drv.get("GridPosition"), default=20.0)
        grid = max(1.0, min(20.0, grid))

        quali_gap = _quali_gap_for_driver(session, code)

        fvec = _build_feature_vector(
            code, team, grid, quali_gap,
            circuit, year, round_num, history,
        )
        feature_rows.append([fvec[f] for f in FEATURES])
        driver_meta.append({"driver": code, "team": team, "grid_pos": int(grid)})

    X = np.array(feature_rows, dtype=np.float32)

    # Predict
    probas = _MODEL.predict_proba(X)[:, 1]

    # Normalise per-race so probabilities sum to 1
    total = probas.sum()
    if total > 0:
        probas = probas / total

    predictions = []
    for meta, p in zip(driver_meta, probas):
        predictions.append({
            **meta,
            "probability": round(float(p), 4),
            "win_pct":     round(float(p) * 100, 1),
        })

    predictions.sort(key=lambda d: d["probability"], reverse=True)
    return predictions
