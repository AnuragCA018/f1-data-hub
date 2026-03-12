import asyncio
import logging
import math
from typing import Optional

import pandas as pd
from fastapi import APIRouter, HTTPException, Query

from database.connection import get_db
from services.data_pipeline import ensure_session_loaded, ensure_telemetry_loaded
import services.f1_service as f1
from utils.helpers import to_int_or_str, row_to_dict

router = APIRouter()
logger = logging.getLogger(__name__)


def _downsample(rows: list, target: int) -> list:
    """Reduce row list to at most `target` evenly-spaced entries."""
    if len(rows) <= target:
        return rows
    factor = len(rows) / target
    return [rows[round(i * factor)] for i in range(target)]


# NOTE: this route MUST be declared before /telemetry/{year}/{race}/{driver}
# so that FastAPI does not swallow requests to /telemetry/compare/... with a 422.
@router.get("/telemetry/compare/{year}/{race}")
async def compare_telemetry(
    year: int,
    race: str,
    driver1: str = Query(...),
    driver2: str = Query(...),
    lap1: int = Query(...),
    lap2: int = Query(...),
    session_type: str = Query("R"),
    max_points: int = Query(400, ge=50, le=2000, description="Downsample telemetry to N points"),
):
    """Return telemetry for two drivers/laps together for easy comparison."""
    driver1, driver2 = driver1.upper(), driver2.upper()
    race_key = to_int_or_str(race)

    try:
        session_id = await ensure_session_loaded(year, race_key, session_type)
        await ensure_telemetry_loaded(session_id, year, race_key, session_type, driver1, lap1)
        await ensure_telemetry_loaded(session_id, year, race_key, session_type, driver2, lap2)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    with get_db() as conn:
        rows1 = conn.execute(
            """SELECT distance, speed, throttle, brake, rpm, gear, drs, timestamp, x, y
               FROM telemetry
               WHERE session_id=? AND UPPER(driver_code)=? AND lap_number=?
               ORDER BY distance""",
            (session_id, driver1, lap1),
        ).fetchall()
        rows2 = conn.execute(
            """SELECT distance, speed, throttle, brake, rpm, gear, drs, timestamp, x, y
               FROM telemetry
               WHERE session_id=? AND UPPER(driver_code)=? AND lap_number=?
               ORDER BY distance""",
            (session_id, driver2, lap2),
        ).fetchall()

    rows1 = _downsample(rows1, max_points)
    rows2 = _downsample(rows2, max_points)

    return {
        "year": year,
        "race": race,
        "session_type": session_type,
        "driver1": {"code": driver1, "lap": lap1, "points": [row_to_dict(r) for r in rows1]},
        "driver2": {"code": driver2, "lap": lap2, "points": [row_to_dict(r) for r in rows2]},
    }


def _safe_to_float(val) -> Optional[float]:
    """Convert to float, returning None for NaN/None/non-numeric."""
    if val is None:
        return None
    try:
        f = float(val)
        return None if math.isnan(f) or math.isinf(f) else f
    except (TypeError, ValueError):
        return None


# NOTE: must be declared before /telemetry/{year}/{race}/{driver} so FastAPI
# does not try to parse "track" as the race path parameter.
@router.get("/telemetry/track/{year}/{race}/{driver}")
async def get_track_position(
    year: int,
    race: str,
    driver: str,
    lap: Optional[int] = Query(None, description="Lap number; omit for fastest lap"),
    session_type: str = Query("Q", description="Session type (Q recommended for clean racing line)"),
):
    """
    Return GPS position (X, Y), speed and distance for Track Map rendering.

    Race is interpreted as a round number (integer). The event is resolved
    reliably via the FastF1 event schedule rather than passing the raw integer
    to get_session(), which is fragile for sprint/testing weekends.
    """
    driver = driver.upper()

    # Validate round number — must be a plain integer
    round_number = to_int_or_str(race)
    if not isinstance(round_number, int):
        raise HTTPException(
            status_code=422,
            detail=f"Race must be a round number (integer), got: '{race}'"
        )

    loop = asyncio.get_running_loop()

    # ── Load session via schedule lookup ────────────────────────────────────
    try:
        session = await loop.run_in_executor(
            None, f1.load_session_for_track, year, round_number, session_type
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        logger.error(
            "Track: session load failed year=%s round=%s session=%s: %s",
            year, round_number, session_type, exc, exc_info=True,
        )
        raise HTTPException(status_code=500, detail=f"Failed to load session: {exc}")

    # Guard: probe that the loaded session actually has accessible laps.
    # Even with the robust load_session_for_track, a thread-timing edge case
    # could return a cached object whose laps became stale.  Always verify.
    try:
        _ = session.laps
    except Exception as not_loaded_exc:
        logger.warning(
            "Track: session probe failed year=%s round=%s session_type=%s (%s) "
            "- evicting stale cache entry and reloading",
            year, round_number, session_type, not_loaded_exc,
        )
        with f1._session_lock:
            f1._session_cache.pop(("track", year, round_number, session_type), None)
        try:
            session = await loop.run_in_executor(
                None, f1.load_session_for_track, year, round_number, session_type
            )
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc))
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Failed to reload session: {exc}")

    logger.info(
        "Track: request year=%s round=%s driver=%s lap=%s session_type=%s",
        year, round_number, driver, lap, session_type,
    )

    # ── Select lap ──────────────────────────────────────────────────────────
    try:
        driver_laps = session.laps.pick_driver(driver)
        if driver_laps.empty:
            available = sorted(session.laps["Driver"].unique().tolist())
            raise HTTPException(
                status_code=404,
                detail=f"Driver '{driver}' not found in this session. Available: {available}",
            )

        total_laps = len(driver_laps)

        if lap is not None and lap > total_laps:
            # Lap number exceeds available laps → fall back to fastest
            logger.warning(
                "Track: lap %s > total %s for %s, falling back to fastest",
                lap, total_laps, driver,
            )
            lap_row = driver_laps.pick_fastest()
            if lap_row is None:
                # pick_fastest() returns None when every LapTime is NaN.
                # driver_laps.iloc[0] is always a FastF1 Lap (has get_pos_data).
                lap_row = driver_laps.iloc[0]
        elif lap is not None:
            # Try an exact LapNumber match first; fall back to positional (iloc)
            # so gaps in lap numbering (safety car, in-lap) don't cause 404s.
            target = driver_laps[driver_laps["LapNumber"] == lap]
            if not target.empty:
                lap_row = target.iloc[0]
            else:
                logger.warning(
                    "Track: LapNumber %s not found for %s, using positional iloc[%s]",
                    lap, driver, lap - 1,
                )
                lap_row = driver_laps.iloc[lap - 1]  # 1-based → 0-based
        else:
            # No lap specified -> fastest
            lap_row = driver_laps.pick_fastest()
            if lap_row is None:
                lap_row = driver_laps.iloc[0]

        # ── Extract position + car data separately, then merge ───────────────
        # get_car_data() → Speed, Throttle, Brake, RPM, nGear, DRS + Distance
        # get_pos_data() → X, Y, Z (GPS coordinates)
        # Some laps (out-laps, formation laps, red-flag laps) exist in the laps
        # DataFrame but have no recorded position telemetry.  We try the
        # requested lap first and fall back to the fastest lap automatically.
        def _get_pos(candidate_lap_row):
            """Return (pos_data, car_data); returns (None, None) on any telemetry error."""
            pd_data = None
            try:
                pd_data = candidate_lap_row.get_pos_data()
            except Exception as e:
                logger.warning(
                    "Track: get_pos_data failed for lap %s: %s",
                    candidate_lap_row["LapNumber"], e,
                )
            cd_data = None
            try:
                cd_data = candidate_lap_row.get_car_data().add_distance()
            except Exception as e:
                logger.warning(
                    "Track: get_car_data failed for lap %s: %s",
                    candidate_lap_row["LapNumber"], e,
                )
            return pd_data, cd_data

        pos_data, car_data = _get_pos(lap_row)

        if pos_data is None or pos_data.empty:
            # Requested lap has no GPS data — automatically try the fastest lap
            logger.warning(
                "Track: lap %s for %s has no pos data, falling back to fastest lap",
                lap_row["LapNumber"], driver,
            )
            fastest = driver_laps.pick_fastest()
            if fastest is None:
                fastest = driver_laps.iloc[0]

            if fastest is not None and int(fastest["LapNumber"]) != int(lap_row["LapNumber"]):
                pos_data, car_data = _get_pos(fastest)
                lap_row = fastest
                logger.info("Track: fell back to fastest lap %s", lap_row["LapNumber"])

        if pos_data is None or pos_data.empty:
            raise HTTPException(
                status_code=404,
                detail="No GPS position data available for this lap or the fastest lap. "
                       "Try a different session type (Q/R).",
            )

        pos_sorted = (
            pos_data.dropna(subset=["SessionTime"])
            .sort_values("SessionTime")
            .reset_index(drop=True)
        )

        if car_data is not None and not car_data.empty and "Speed" in car_data.columns:
            car_sorted = (
                car_data[["SessionTime", "Speed", "Distance"]]
                .dropna(subset=["SessionTime"])
                .sort_values("SessionTime")
                .reset_index(drop=True)
            )
            merged = pd.merge_asof(
                pos_sorted,
                car_sorted,
                on="SessionTime",
                direction="nearest",
                tolerance=pd.Timedelta("0.2s"),
            )
            speed_col = "Speed"
            dist_col  = "Distance"
        else:
            merged    = pos_sorted
            speed_col = None
            dist_col  = None

        x_list    = [_safe_to_float(v) for v in merged["X"]] if "X" in merged.columns else []
        y_list    = [_safe_to_float(v) for v in merged["Y"]] if "Y" in merged.columns else []
        speed_list = (
            [_safe_to_float(v) for v in merged[speed_col]]
            if speed_col and speed_col in merged.columns
            else [None] * len(x_list)
        )
        dist_list = (
            [_safe_to_float(v) for v in merged[dist_col]]
            if dist_col and dist_col in merged.columns
            else [None] * len(x_list)
        )

        if not x_list or not y_list:
            raise HTTPException(
                status_code=404,
                detail="Position columns (X/Y) are missing from telemetry for this lap.",
            )

        # Build compact points list (frontend Track Map can use either format).
        points = [
            {"x": x, "y": y, "speed": s}
            for x, y, s in zip(x_list, y_list, speed_list)
            if x is not None and y is not None
        ]

        return {
            "year":         year,
            "race":         race,
            "driver":       driver,
            "session_type": session_type,
            "lap_number":   int(lap_row["LapNumber"]),
            "x":            x_list,
            "y":            y_list,
            "speed":        speed_list,
            "distance":     dist_list,
            "points":       points,
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(
            "Track position error %s/%s/%s: %s",
            year, round_number, driver, exc, exc_info=True,
        )
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/telemetry/{year}/{race}/{driver}")
async def get_telemetry(
    year: int,
    race: str,
    driver: str,
    lap: int = Query(..., description="Lap number"),
    session_type: str = Query("R"),
    max_points: int = Query(400, ge=50, le=2000, description="Downsample telemetry to N points"),
):
    driver = driver.upper()
    race_key = to_int_or_str(race)

    try:
        session_id = await ensure_session_loaded(year, race_key, session_type)
        await ensure_telemetry_loaded(session_id, year, race_key, session_type, driver, lap)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    with get_db() as conn:
        rows = conn.execute(
            """SELECT distance, speed, throttle, brake, rpm, gear, drs, timestamp, x, y
               FROM telemetry
               WHERE session_id=? AND UPPER(driver_code)=? AND lap_number=?
               ORDER BY distance""",
            (session_id, driver, lap),
        ).fetchall()

    rows = _downsample(rows, max_points)

    return {
        "year":         year,
        "race":         race,
        "driver":       driver,
        "lap_number":   lap,
        "session_type": session_type,
        "points":       [row_to_dict(r) for r in rows],
    }
