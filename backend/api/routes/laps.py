import logging
from fastapi import APIRouter, HTTPException, Query

from database.connection import get_db
from services.data_pipeline import ensure_session_loaded
from utils.helpers import to_int_or_str, row_to_dict, seconds_to_laptime

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/laps/{year}/{race}/{driver}")
async def get_driver_laps(
    year: int,
    race: str,
    driver: str,
    session_type: str = Query("R", description="R=Race, Q=Qualifying, FP1/FP2/FP3"),
):
    driver = driver.upper()
    race_key = to_int_or_str(race)

    try:
        session_id = await ensure_session_loaded(year, race_key, session_type)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    with get_db() as conn:
        rows = conn.execute(
            """SELECT lap_number, lap_time, sector1, sector2, sector3,
                      tyre_compound, tyre_life, stint, pit_in_time, pit_out_time, is_personal_best
               FROM laps
               WHERE session_id=? AND UPPER(driver_code)=?
               ORDER BY lap_number""",
            (session_id, driver),
        ).fetchall()

    laps = []
    for r in rows:
        d = row_to_dict(r)
        d["lap_time_display"] = seconds_to_laptime(d["lap_time"]) if d["lap_time"] else None
        laps.append(d)

    return {"year": year, "race": race, "driver": driver, "session_type": session_type, "laps": laps}
