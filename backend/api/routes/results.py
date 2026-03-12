import asyncio
import logging
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException, Query

from database.connection import get_db
from services.data_pipeline import ensure_session_loaded
from utils.helpers import to_int_or_str, row_to_dict
from utils.cache import ttl_cache

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/results/{year}/{race}")
async def get_race_results(year: int, race: str):
    race_key = to_int_or_str(race)
    try:
        session_id = await ensure_session_loaded(year, race_key, "R")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not load race data: {exc}")

    with get_db() as conn:
        rows = conn.execute(
            """SELECT driver_code, driver_name, team_name, position, grid_position,
                      points, status, time_seconds, fastest_lap
               FROM race_results WHERE session_id=?
               ORDER BY COALESCE(position, 999)""",
            (session_id,),
        ).fetchall()

    return {"year": year, "race": race, "results": [row_to_dict(r) for r in rows]}


@router.get("/standings/{year}")
@ttl_cache(ttl=30 * 60)   # cache standings for 30 minutes
async def get_standings(year: int):
    """Fetch driver and constructor standings from Jolpica/Ergast API."""
    if year < 2020 or year > 2030:
        raise HTTPException(status_code=400, detail="Year must be between 2020 and 2030")

    async with httpx.AsyncClient(timeout=15) as client:
        try:
            drv_resp = await client.get(
                f"https://api.jolpi.ca/ergast/f1/{year}/driverStandings/?format=json"
            )
            con_resp = await client.get(
                f"https://api.jolpi.ca/ergast/f1/{year}/constructorStandings/?format=json"
            )
        except Exception as exc:
            raise HTTPException(status_code=503, detail=f"Standings API unavailable: {exc}")

    driver_standings = []
    constructor_standings = []

    try:
        drv_data = drv_resp.json()
        standings_table = drv_data["MRData"]["StandingsTable"]["StandingsLists"]
        if standings_table:
            for entry in standings_table[0]["DriverStandings"]:
                driver_standings.append({
                    "position":    int(entry["position"]),
                    "driver_code": entry["Driver"]["code"],
                    "driver_name": f"{entry['Driver']['givenName']} {entry['Driver']['familyName']}",
                    "team_name":   entry["Constructors"][0]["name"] if entry.get("Constructors") else "",
                    "points":      float(entry["points"]),
                    "wins":        int(entry["wins"]),
                })
    except Exception as exc:
        logger.warning("Could not parse driver standings: %s", exc)

    try:
        con_data = con_resp.json()
        standings_table = con_data["MRData"]["StandingsTable"]["StandingsLists"]
        if standings_table:
            for entry in standings_table[0]["ConstructorStandings"]:
                constructor_standings.append({
                    "position":  int(entry["position"]),
                    "team_name": entry["Constructor"]["name"],
                    "points":    float(entry["points"]),
                    "wins":      int(entry["wins"]),
                })
    except Exception as exc:
        logger.warning("Could not parse constructor standings: %s", exc)

    return {
        "year": year,
        "driver_standings": driver_standings,
        "constructor_standings": constructor_standings,
    }
