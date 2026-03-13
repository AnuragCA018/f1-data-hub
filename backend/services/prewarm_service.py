import asyncio
import logging
import os

from services.data_pipeline import ensure_session_loaded, ensure_telemetry_loaded
from services.f1_service import load_session_for_track

logger = logging.getLogger(__name__)


def _env_flag(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() not in {"0", "false", "no", "off"}


async def prewarm_default_content() -> None:
    if not _env_flag("PREWARM_ENABLED", True):
        logger.info("Prewarm disabled via PREWARM_ENABLED")
        return

    year = int(os.getenv("PREWARM_YEAR", "2024"))
    round_number = int(os.getenv("PREWARM_ROUND", "1"))
    drivers = [
        code.strip().upper()
        for code in os.getenv("PREWARM_DRIVERS", "VER,HAM,LEC,NOR").split(",")
        if code.strip()
    ]

    logger.info(
        "Prewarm starting for year=%s round=%s drivers=%s",
        year,
        round_number,
        ",".join(drivers),
    )

    try:
        race_session_id = await ensure_session_loaded(year, round_number, "R")
        await ensure_session_loaded(year, round_number, "Q")

        for driver in drivers[:2]:
            try:
                await ensure_telemetry_loaded(race_session_id, year, round_number, "R", driver, 1)
            except Exception as exc:
                logger.warning("Prewarm telemetry skipped for %s: %s", driver, exc)

        loop = asyncio.get_running_loop()
        try:
            await loop.run_in_executor(None, load_session_for_track, year, round_number, "Q")
        except Exception as exc:
            logger.warning("Prewarm track session skipped: %s", exc)

        logger.info("Prewarm completed for %s round %s", year, round_number)
    except Exception as exc:
        logger.warning("Prewarm failed: %s", exc)