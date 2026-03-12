import logging
from fastapi import APIRouter, HTTPException, Query

from database.connection import get_db
from services.data_pipeline import ensure_session_loaded
from utils.helpers import to_int_or_str, row_to_dict

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/weather/{year}/{race}")
async def get_weather(
    year: int,
    race: str,
    session_type: str = Query("R"),
):
    race_key = to_int_or_str(race)
    try:
        session_id = await ensure_session_loaded(year, race_key, session_type)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    with get_db() as conn:
        rows = conn.execute(
            """SELECT time, air_temp, track_temp, humidity, wind_speed, rainfall
               FROM weather WHERE session_id=? ORDER BY time""",
            (session_id,),
        ).fetchall()

    return {
        "year":         year,
        "race":         race,
        "session_type": session_type,
        "weather":      [row_to_dict(r) for r in rows],
    }
