import glob
import logging
import math
import os
import threading
from typing import Any, Optional

import fastf1
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# ─── In-memory session cache ──────────────────────────────────────────────────
# Keeps FastF1 session objects alive for the server's lifetime so repeated
# calls for the same race don't re-download the data.
_session_cache: dict = {}
_session_lock = threading.Lock()

# ─── Helpers ──────────────────────────────────────────────────────────────────

def _safe_float(val) -> Optional[float]:
    """Convert value to float, return None for NaN/NaT/None."""
    if val is None:
        return None
    try:
        if pd.isna(val):
            return None
    except (TypeError, ValueError):
        pass
    try:
        f = float(val)
        return None if math.isnan(f) or math.isinf(f) else f
    except (TypeError, ValueError):
        return None


def _safe_int(val) -> Optional[int]:
    f = _safe_float(val)
    return None if f is None else int(f)


def _timedelta_seconds(val) -> Optional[float]:
    """Convert a pandas Timedelta / datetime.timedelta to float seconds."""
    if val is None or (hasattr(val, 'isnull') and val.isnull()):
        return None
    try:
        if pd.isna(val):
            return None
    except (TypeError, ValueError):
        pass
    if hasattr(val, 'total_seconds'):
        return val.total_seconds()
    return _safe_float(val)


# ─── Schedule ─────────────────────────────────────────────────────────────────

def get_race_schedule(year: int) -> list[dict]:
    schedule = fastf1.get_event_schedule(year, include_testing=False)
    races = []
    for _, ev in schedule.iterrows():
        races.append({
            "round":        int(ev.get("RoundNumber", 0) or 0),
            "race_name":    str(ev.get("EventName", "")),
            "circuit":      str(ev.get("Location", "")),
            "country":      str(ev.get("Country", "")),
            "date":         str(ev.get("EventDate", ""))[:10],
            "event_format": str(ev.get("EventFormat", "")),
        })
    return races


# ─── Session loading ──────────────────────────────────────────────────────────

def load_f1_session(year: int, race: Any, session_type: str = "R") -> fastf1.core.Session:
    """Load a FastF1 session (blocking – run in executor for async routes).
    Returns a cached copy if the same session was previously loaded with telemetry.
    """
    cache_key_tel = (year, str(race), session_type, True)
    with _session_lock:
        if cache_key_tel in _session_cache:
            return _session_cache[cache_key_tel]

    cache_key = (year, str(race), session_type, False)
    with _session_lock:
        if cache_key in _session_cache:
            return _session_cache[cache_key]

    session = fastf1.get_session(year, race, session_type)
    session.load(laps=True, telemetry=False, weather=True, messages=False)
    with _session_lock:
        _session_cache[cache_key] = session
    return session


def load_f1_session_with_telemetry(year: int, race: Any, session_type: str = "R") -> fastf1.core.Session:
    """Load a FastF1 session with telemetry, caching so repeated calls are instant."""
    cache_key = (year, str(race), session_type, True)
    with _session_lock:
        if cache_key in _session_cache:
            return _session_cache[cache_key]

    session = fastf1.get_session(year, race, session_type)
    session.load(laps=True, telemetry=True, weather=True, messages=False)
    with _session_lock:
        _session_cache[cache_key] = session
    return session


# ── Per-key loading locks – prevents two threads racing to load the same session ──
_track_load_locks: dict = {}
_track_load_locks_guard = threading.Lock()

# FastF1 session-type abbreviation → directory-name fragment inside the cache
_SESSION_DIR_MAP: dict = {
    "R":   "Race",
    "Q":   "Qualifying",
    "FP1": "Practice_1",
    "FP2": "Practice_2",
    "FP3": "Practice_3",
    "SQ":  "Sprint_Qualifying",
    "S":   "Sprint",
}


def _get_track_load_lock(key: tuple) -> threading.Lock:
    """Return a per-session-key lock (created on first use)."""
    with _track_load_locks_guard:
        if key not in _track_load_locks:
            _track_load_locks[key] = threading.Lock()
        return _track_load_locks[key]


def _clear_session_disk_cache(year: int, event_name: str, session_type: str) -> int:
    """
    Delete .ff1pkl files for a session from the FastF1 disk cache so the next
    load re-downloads fresh data from the F1 timing API.

    FastF1 stores files under:
        cache/{year}/{date}_{EventName}/{date}_{SessionName}/*.ff1pkl
    Returns the count of deleted files.
    """
    cache_dir = os.path.join(os.path.dirname(__file__), "..", "cache")
    year_dir = os.path.join(cache_dir, str(year))
    if not os.path.isdir(year_dir):
        return 0

    safe_event   = event_name.replace(" ", "_")
    session_name = _SESSION_DIR_MAP.get(session_type.upper(), session_type)

    deleted = 0
    for event_dir in glob.glob(os.path.join(year_dir, f"*{safe_event}*")):
        if not os.path.isdir(event_dir):
            continue
        for session_dir in glob.glob(os.path.join(event_dir, f"*{session_name}*")):
            if not os.path.isdir(session_dir):
                continue
            for pkl in glob.glob(os.path.join(session_dir, "*.ff1pkl")):
                try:
                    os.remove(pkl)
                    deleted += 1
                    logger.info("Track cache: deleted %s", pkl)
                except OSError as e:
                    logger.warning("Track cache: cannot remove %s: %s", pkl, e)

    logger.info(
        "Track cache: cleared %d file(s) for %s '%s' [%s]",
        deleted, year, event_name, session_type,
    )
    return deleted


def load_session_for_track(year: int, round_number: int, session_type: str = "Q") -> fastf1.core.Session:
    """
    Load a FastF1 session for Track Map rendering.

    Guarantees:
    - Event is resolved via schedule (round number -> EventName) so sprint /
      pre-season weeks never cause an integer-lookup failure.
    - Only one thread loads each (year, round, session_type) at a time.
    - session.laps is probed after load; on failure the disk cache is cleared
      and the load is retried, forcing a fresh network download.
    - On persistent failure raises ValueError so the endpoint returns HTTP 404.
    """
    cache_key = ("track", year, round_number, session_type)

    # ── Fast path: return a healthy cached session ───────────────────────────
    with _session_lock:
        session = _session_cache.get(cache_key)
    if session is not None:
        try:
            _ = len(session.laps)   # probe – raises DataNotLoadedError if broken
            return session
        except Exception:
            logger.warning(
                "Track: evicting stale in-memory session (%s/%s/%s)",
                year, round_number, session_type,
            )
            with _session_lock:
                _session_cache.pop(cache_key, None)

    # ── Serialised load (one thread per unique key) ──────────────────────────
    key_lock = _get_track_load_lock(cache_key)
    with key_lock:
        # Double-check: another thread may have completed the load while we waited.
        with _session_lock:
            session = _session_cache.get(cache_key)
        if session is not None:
            return session

        # Resolve event name from round number via schedule
        schedule = fastf1.get_event_schedule(year, include_testing=False)
        matching = schedule[schedule["RoundNumber"] == round_number]
        if matching.empty:
            max_round = int(schedule["RoundNumber"].max()) if not schedule.empty else 0
            raise ValueError(
                f"Round {round_number} not found in {year} schedule (max available: {max_round})"
            )
        event_name = str(matching.iloc[0]["EventName"])
        logger.info(
            "Track: resolved %s round %s -> '%s' [%s]",
            year, round_number, event_name, session_type,
        )

        def _fresh_load() -> fastf1.core.Session:
            sess = fastf1.get_session(year, event_name, session_type)
            sess.load(laps=True, telemetry=True, weather=False, messages=False)
            return sess

        # Attempt 1
        try:
            session = _fresh_load()
        except Exception as exc:
            logger.warning(
                "Track: load attempt 1 raised %s for %s/%s/%s - retrying",
                exc, year, event_name, session_type,
            )
            session = _fresh_load()   # attempt 2; propagates if also fails

        # Probe: verify session.laps is accessible after load.
        # session.load() can silently "succeed" on a corrupted disk-cache entry
        # while leaving laps in an unloaded state.  When this happens, delete
        # those cache files so attempt 3 fetches fresh data from the network.
        try:
            n = len(session.laps)
            logger.info(
                "Track: loaded OK - %d laps [%s/%s/%s]",
                n, year, round_number, session_type,
            )
        except Exception as probe_exc:
            logger.warning(
                "Track: probe failed after load (%s). "
                "Clearing disk cache and retrying from network.",
                probe_exc,
            )
            _clear_session_disk_cache(year, event_name, session_type)
            session = _fresh_load()   # attempt 3 - reads from network, not disk
            try:
                n = len(session.laps)
                logger.info(
                    "Track: fresh-download succeeded - %d laps [%s/%s/%s]",
                    n, year, round_number, session_type,
                )
            except Exception as final_exc:
                raise ValueError(
                    f"Session data for {year} round {round_number} "
                    f"({session_type}) could not be loaded even after clearing "
                    f"the cache. The race may not have occurred yet or "
                    f"telemetry is unavailable: {final_exc}"
                ) from final_exc

        # Store only after a successful probe.
        with _session_lock:
            _session_cache[cache_key] = session
        return session


# ─── Race results ─────────────────────────────────────────────────────────────

def extract_race_results(session: fastf1.core.Session) -> list[dict]:
    results = []
    try:
        res = session.results
        for _, row in res.iterrows():
            pos = _safe_int(row.get("Position"))
            classification = str(row.get("ClassifiedPosition", ""))
            if classification.upper() in ("NC", "DSQ", "DNF", "DNS", "EX"):
                pos = None
            time_sec = _timedelta_seconds(row.get("Time"))
            results.append({
                "driver_code":   str(row.get("Abbreviation", "")),
                "driver_name":   str(row.get("FullName", row.get("BroadcastName", ""))),
                "team_name":     str(row.get("TeamName", "")),
                "position":      pos,
                "grid_position": _safe_int(row.get("GridPosition")),
                "points":        _safe_float(row.get("Points")) or 0.0,
                "status":        str(row.get("Status", "")),
                "time_seconds":  time_sec,
                "fastest_lap":   bool(row.get("FastestLap", False)),
            })
    except Exception as exc:
        logger.error("Error extracting race results: %s", exc)
    return results


# ─── Lap processing ───────────────────────────────────────────────────────────

def extract_laps(session: fastf1.core.Session, session_id: int) -> list[dict]:
    laps_data = []
    try:
        laps = session.laps
        for _, lap in laps.iterrows():
            laps_data.append({
                "session_id":      session_id,
                "driver_code":     str(lap.get("Driver", "")),
                "lap_number":      _safe_int(lap.get("LapNumber")),
                "lap_time":        _timedelta_seconds(lap.get("LapTime")),
                "sector1":         _timedelta_seconds(lap.get("Sector1Time")),
                "sector2":         _timedelta_seconds(lap.get("Sector2Time")),
                "sector3":         _timedelta_seconds(lap.get("Sector3Time")),
                "tyre_compound":   str(lap.get("Compound", "")) if pd.notna(lap.get("Compound")) else None,
                "tyre_life":       _safe_int(lap.get("TyreLife")),
                "stint":           _safe_int(lap.get("Stint")),
                "pit_in_time":     _timedelta_seconds(lap.get("PitInTime")),
                "pit_out_time":    _timedelta_seconds(lap.get("PitOutTime")),
                "is_personal_best": 1 if lap.get("IsPersonalBest") else 0,
            })
    except Exception as exc:
        logger.error("Error extracting laps: %s", exc)
    return laps_data


# ─── Telemetry processing ─────────────────────────────────────────────────────

def extract_telemetry_for_lap(session: fastf1.core.Session, session_id: int, driver_code: str, lap_number: int) -> list[dict]:
    """Extract telemetry for a specific driver + lap number."""
    points: list[dict] = []
    try:
        # Use direct DataFrame filter – compatible with all FastF1 3.x versions
        # regardless of whether pick_driver / pick_drivers API changed.
        driver_laps = session.laps[session.laps["Driver"] == driver_code]
        target_laps = driver_laps[driver_laps["LapNumber"] == lap_number]
        if target_laps.empty:
            logger.warning("No lap found for driver=%s lap=%s", driver_code, lap_number)
            return points
        lap = target_laps.iloc[0]

        # get_telemetry() returns a single merged Telemetry object that already
        # contains Speed, Throttle, Brake, RPM, nGear, DRS, X, Y and Distance
        # (via add_distance internally).  This avoids the broken
        # resample_channels(car_data) call and the pick_drivers API change.
        tel = lap.get_telemetry().add_distance()
        if tel is None or tel.empty:
            return points

        for _, row in tel.iterrows():
            ts = row.name
            ts_sec = ts.total_seconds() if hasattr(ts, "total_seconds") else _safe_float(ts)
            points.append({
                "session_id":  session_id,
                "driver_code": driver_code,
                "lap_number":  lap_number,
                "speed":       _safe_float(row.get("Speed")),
                "throttle":    _safe_float(row.get("Throttle")),
                "brake":       _safe_int(row.get("Brake")),
                "rpm":         _safe_int(row.get("RPM")),
                "gear":        _safe_int(row.get("nGear")),
                "drs":         _safe_int(row.get("DRS")),
                "distance":    _safe_float(row.get("Distance")),
                "timestamp":   ts_sec,
                "x":           _safe_float(row.get("X")),
                "y":           _safe_float(row.get("Y")),
            })
    except Exception as exc:
        logger.error("Error extracting telemetry for %s lap %s: %s", driver_code, lap_number, exc)
    return points


# ─── Weather processing ───────────────────────────────────────────────────────

def extract_weather(session: fastf1.core.Session, session_id: int) -> list[dict]:
    rows: list[dict] = []
    try:
        weather = session.weather_data
        if weather is None or weather.empty:
            return rows
        for _, row in weather.iterrows():
            t = row.name
            ts = t.total_seconds() if hasattr(t, "total_seconds") else _safe_float(t)
            rows.append({
                "session_id": session_id,
                "time":       ts,
                "air_temp":   _safe_float(row.get("AirTemp")),
                "track_temp": _safe_float(row.get("TrackTemp")),
                "humidity":   _safe_float(row.get("Humidity")),
                "wind_speed": _safe_float(row.get("WindSpeed")),
                "rainfall":   1 if row.get("Rainfall") else 0,
            })
    except Exception as exc:
        logger.error("Error extracting weather: %s", exc)
    return rows


# ─── Pit stops ────────────────────────────────────────────────────────────────

def extract_pit_stops(session: fastf1.core.Session, session_id: int) -> list[dict]:
    stops: list[dict] = []
    try:
        laps = session.laps
        pit_laps = laps[laps["PitInTime"].notna()]
        driver_stop_counts: dict[str, int] = {}
        for _, lap in pit_laps.iterrows():
            drv = str(lap.get("Driver", ""))
            driver_stop_counts[drv] = driver_stop_counts.get(drv, 0) + 1
            pit_in  = _timedelta_seconds(lap.get("PitInTime"))
            pit_out = _timedelta_seconds(lap.get("PitOutTime"))
            duration = (pit_out - pit_in) if (pit_in is not None and pit_out is not None) else None
            stops.append({
                "session_id":  session_id,
                "driver_code": drv,
                "lap_number":  _safe_int(lap.get("LapNumber")),
                "duration":    duration,
                "stop_number": driver_stop_counts[drv],
            })
    except Exception as exc:
        logger.error("Error extracting pit stops: %s", exc)
    return stops


# ─── Drivers from session ─────────────────────────────────────────────────────

def extract_drivers(session: fastf1.core.Session) -> list[dict]:
    drivers: list[dict] = []
    try:
        results = session.results
        for _, row in results.iterrows():
            drivers.append({
                "driver_code": str(row.get("Abbreviation", "")),
                "name":        str(row.get("FullName", "")),
                "team":        str(row.get("TeamName", "")),
                "number":      _safe_int(row.get("DriverNumber")),
                "nationality": str(row.get("CountryCode", "")),
            })
    except Exception as exc:
        logger.error("Error extracting drivers: %s", exc)
    return drivers
