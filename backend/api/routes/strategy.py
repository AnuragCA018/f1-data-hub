import logging
from fastapi import APIRouter, HTTPException, Query

from database.connection import get_db
from services.data_pipeline import ensure_session_loaded
from utils.helpers import to_int_or_str, row_to_dict

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/strategy/{year}/{race}")
async def get_strategy(year: int, race: str, session_type: str = Query("R")):
    """Return tyre stint data per driver for strategy visualization."""
    race_key = to_int_or_str(race)
    try:
        session_id = await ensure_session_loaded(year, race_key, session_type)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    with get_db() as conn:
        rows = conn.execute(
            """SELECT driver_code, stint, tyre_compound,
                      MIN(lap_number) AS start_lap,
                      MAX(lap_number) AS end_lap,
                      COUNT(*)        AS lap_count
               FROM laps
               WHERE session_id=? AND stint IS NOT NULL AND tyre_compound IS NOT NULL
               GROUP BY driver_code, stint, tyre_compound
               ORDER BY driver_code, stint""",
            (session_id,),
        ).fetchall()

    stints: dict[str, list] = {}
    for r in rows:
        d = row_to_dict(r)
        drv = d["driver_code"]
        if drv not in stints:
            stints[drv] = []
        stints[drv].append(d)

    return {
        "year":         year,
        "race":         race,
        "session_type": session_type,
        "strategy":     stints,
    }
