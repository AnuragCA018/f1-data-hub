"""
Data pipeline: check SQLite → load from FastF1 → store → return.
All blocking FastF1 calls are run inside asyncio executor to avoid
blocking the uvicorn event loop.
"""
import asyncio
import logging
from typing import Any, Optional

from database.connection import get_db
from services import f1_service as f1

logger = logging.getLogger(__name__)


# ─── Race helpers ─────────────────────────────────────────────────────────────

def _upsert_race(conn, year: int, race_name: str, circuit: str, country: str, date: str, round_number: int) -> int:
    conn.execute(
        """INSERT INTO races (year, race_name, circuit, country, date, round_number)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(year, race_name) DO UPDATE SET
             circuit=excluded.circuit, country=excluded.country,
             date=excluded.date, round_number=excluded.round_number""",
        (year, race_name, circuit, country, date, round_number),
    )
    row = conn.execute("SELECT race_id FROM races WHERE year=? AND race_name=?", (year, race_name)).fetchone()
    return row["race_id"]


def _upsert_session(conn, race_id: int, session_type: str) -> int:
    conn.execute(
        """INSERT INTO sessions (race_id, session_type, loaded)
           VALUES (?, ?, 0)
           ON CONFLICT(race_id, session_type) DO NOTHING""",
        (race_id, session_type),
    )
    row = conn.execute(
        "SELECT session_id, loaded FROM sessions WHERE race_id=? AND session_type=?",
        (race_id, session_type),
    ).fetchone()
    return row["session_id"], bool(row["loaded"])


def _find_race(conn, year: int, race: Any) -> Optional[dict]:
    """Try to find a race row by round number or by name (partial match)."""
    if isinstance(race, int) or str(race).isdigit():
        row = conn.execute(
            "SELECT * FROM races WHERE year=? AND round_number=?", (year, int(race))
        ).fetchone()
    else:
        row = conn.execute(
            "SELECT * FROM races WHERE year=? AND LOWER(race_name) LIKE ?",
            (year, f"%{str(race).lower()}%"),
        ).fetchone()
    return dict(row) if row else None


# ─── Core pipeline ────────────────────────────────────────────────────────────

async def ensure_session_loaded(year: int, race: Any, session_type: str = "R") -> int:
    """
    Ensure laps (and basic results) for the session exist in SQLite.
    Returns the session_id.
    """
    loop = asyncio.get_running_loop()

    # 1. Try to resolve from DB without loading FastF1
    with get_db() as conn:
        race_row = _find_race(conn, year, race)
        if race_row:
            row = conn.execute(
                "SELECT session_id, loaded FROM sessions WHERE race_id=? AND session_type=?",
                (race_row["race_id"], session_type),
            ).fetchone()
            if row and row["loaded"]:
                return row["session_id"]

    # 2. Load from FastF1 (blocking – run in executor)
    logger.info("Loading FastF1 session: %s %s %s", year, race, session_type)
    try:
        session = await loop.run_in_executor(None, f1.load_f1_session, year, race, session_type)
    except Exception as exc:
        logger.error("FastF1 load failed: %s", exc)
        raise

    # 3. Persist to SQLite
    ev = session.event
    race_name  = str(ev.get("EventName", str(race)))
    circuit    = str(ev.get("Location", ""))
    country    = str(ev.get("Country", ""))
    date       = str(ev.get("EventDate", ""))[:10]
    round_num  = int(ev.get("RoundNumber", 0) or 0)

    with get_db() as conn:
        race_id    = _upsert_race(conn, year, race_name, circuit, country, date, round_num)
        session_id, already_loaded = _upsert_session(conn, race_id, session_type)

        if already_loaded:
            return session_id

        # Laps
        laps_data = f1.extract_laps(session, session_id)
        conn.executemany(
            """INSERT INTO laps
               (session_id, driver_code, lap_number, lap_time, sector1, sector2, sector3,
                tyre_compound, tyre_life, stint, pit_in_time, pit_out_time, is_personal_best)
               VALUES
               (:session_id,:driver_code,:lap_number,:lap_time,:sector1,:sector2,:sector3,
                :tyre_compound,:tyre_life,:stint,:pit_in_time,:pit_out_time,:is_personal_best)""",
            laps_data,
        )

        # Race results
        results_data = f1.extract_race_results(session)
        conn.executemany(
            """INSERT INTO race_results
               (session_id, driver_code, driver_name, team_name, position, grid_position,
                points, status, time_seconds, fastest_lap)
               VALUES
               (:session_id,:driver_code,:driver_name,:team_name,:position,:grid_position,
                :points,:status,:time_seconds,:fastest_lap)""",
            [{**r, "session_id": session_id} for r in results_data],
        )

        # Merge drivers
        driver_rows = f1.extract_drivers(session)
        conn.executemany(
            """INSERT INTO drivers (driver_code, name, team, number, nationality)
               VALUES (:driver_code,:name,:team,:number,:nationality)
               ON CONFLICT(driver_code) DO UPDATE SET
                 name=excluded.name, team=excluded.team,
                 number=excluded.number, nationality=excluded.nationality""",
            driver_rows,
        )

        # Weather
        weather_data = f1.extract_weather(session, session_id)
        conn.executemany(
            """INSERT INTO weather (session_id, time, air_temp, track_temp, humidity, wind_speed, rainfall)
               VALUES (:session_id,:time,:air_temp,:track_temp,:humidity,:wind_speed,:rainfall)""",
            weather_data,
        )

        # Pit stops
        pit_data = f1.extract_pit_stops(session, session_id)
        conn.executemany(
            """INSERT INTO pit_stops (session_id, driver_code, lap_number, duration, stop_number)
               VALUES (:session_id,:driver_code,:lap_number,:duration,:stop_number)""",
            pit_data,
        )

        # Mark loaded
        conn.execute("UPDATE sessions SET loaded=1 WHERE session_id=?", (session_id,))

    return session_id


async def ensure_telemetry_loaded(session_id: int, year: int, race: Any, session_type: str, driver_code: str, lap_number: int) -> None:
    """Lazy-load telemetry for a specific driver + lap into SQLite."""
    with get_db() as conn:
        count = conn.execute(
            "SELECT COUNT(*) FROM telemetry WHERE session_id=? AND driver_code=? AND lap_number=?",
            (session_id, driver_code, lap_number),
        ).fetchone()[0]
        if count > 0:
            return

    loop = asyncio.get_running_loop()
    logger.info("Loading telemetry: %s %s %s driver=%s lap=%s", year, race, session_type, driver_code, lap_number)
    try:
        session = await loop.run_in_executor(None, f1.load_f1_session_with_telemetry, year, race, session_type)
    except Exception as exc:
        # Telemetry unavailable (network, session not found, etc.) – log and
        # return cleanly so the route returns {"points": []} instead of 500.
        logger.warning(
            "Telemetry load failed for %s %s %s driver=%s lap=%s: %s",
            year, race, session_type, driver_code, lap_number, exc,
        )
        return

    points = f1.extract_telemetry_for_lap(session, session_id, driver_code, lap_number)
    if not points:
        return
    with get_db() as conn:
        conn.executemany(
            """INSERT INTO telemetry
               (session_id, driver_code, lap_number, speed, throttle, brake, rpm, gear, drs,
                distance, timestamp, x, y)
               VALUES
               (:session_id,:driver_code,:lap_number,:speed,:throttle,:brake,:rpm,:gear,:drs,
                :distance,:timestamp,:x,:y)""",
            points,
        )
