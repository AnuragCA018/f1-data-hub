import asyncio
import logging
from fastapi import APIRouter, HTTPException, Query

from database.connection import get_db
from services import f1_service as f1
from utils.helpers import row_to_dict

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/drivers")
async def get_all_drivers():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT driver_code, name, team, number, nationality FROM drivers ORDER BY name"
        ).fetchall()
    return {"drivers": [row_to_dict(r) for r in rows]}


@router.get("/driver/{driver_code}")
async def get_driver(driver_code: str):
    driver_code = driver_code.upper()
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM drivers WHERE UPPER(driver_code)=?", (driver_code,)
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Driver not found")

    driver = row_to_dict(row)

    # Attach recent stats from stored laps
    with get_db() as conn:
        stats = conn.execute(
            """SELECT
                 COUNT(DISTINCT s.race_id)                              AS races_entered,
                 ROUND(AVG(l.lap_time), 3)                             AS avg_lap_time,
                 MIN(l.lap_time)                                        AS fastest_lap,
                 SUM(CASE WHEN l.is_personal_best=1 THEN 1 ELSE 0 END) AS personal_bests
               FROM laps l
               JOIN sessions s ON l.session_id = s.session_id
               WHERE UPPER(l.driver_code)=? AND l.lap_time IS NOT NULL""",
            (driver_code,),
        ).fetchone()

    driver["stats"] = row_to_dict(stats) if stats else {}
    return driver
