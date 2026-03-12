import logging
from fastapi import APIRouter, HTTPException, Query

from database.connection import get_db
from services.data_pipeline import ensure_session_loaded
from utils.helpers import to_int_or_str, row_to_dict

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/pitstops/{year}/{race}")
async def get_pit_stops(year: int, race: str, session_type: str = Query("R")):
    race_key = to_int_or_str(race)
    try:
        session_id = await ensure_session_loaded(year, race_key, session_type)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    with get_db() as conn:
        rows = conn.execute(
            """SELECT driver_code, lap_number, duration, stop_number
               FROM pit_stops WHERE session_id=?
               ORDER BY driver_code, stop_number""",
            (session_id,),
        ).fetchall()

    # Summary stats
    with get_db() as conn:
        stats = conn.execute(
            """SELECT
                 COUNT(*)          AS total_stops,
                 ROUND(AVG(duration), 3) AS avg_duration,
                 MIN(duration)     AS fastest_stop,
                 MAX(duration)     AS slowest_stop
               FROM pit_stops WHERE session_id=? AND duration IS NOT NULL""",
            (session_id,),
        ).fetchone()

    return {
        "year":         year,
        "race":         race,
        "session_type": session_type,
        "pit_stops":    [row_to_dict(r) for r in rows],
        "summary":      row_to_dict(stats) if stats else {},
    }
