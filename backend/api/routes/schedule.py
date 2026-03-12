import asyncio
import logging
from fastapi import APIRouter, HTTPException
from services import f1_service as f1
from utils.cache import ttl_cache

router = APIRouter()
logger = logging.getLogger(__name__)

# Cache schedules for 6 hours — they rarely change mid-season
@ttl_cache(ttl=6 * 3600)
def _cached_schedule(year: int) -> list:
    return f1.get_race_schedule(year)


@router.get("/schedule/{year}")
async def get_schedule(year: int):
    if year < 2020 or year > 2030:
        raise HTTPException(status_code=400, detail="Year must be between 2020 and 2030")
    try:
        loop = asyncio.get_running_loop()
        races = await loop.run_in_executor(None, _cached_schedule, year)
        return {"year": year, "races": races, "total": len(races)}
    except Exception as exc:
        logger.error("Schedule error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))
