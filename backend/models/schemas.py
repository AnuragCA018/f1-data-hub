from typing import Optional, List
from pydantic import BaseModel, Field


# ─── Race / Schedule ──────────────────────────────────────────────────────────

class RaceEvent(BaseModel):
    round: int
    race_name: str
    circuit: str
    country: str
    date: str
    event_format: Optional[str] = None


class ScheduleResponse(BaseModel):
    year: int
    races: List[RaceEvent]


# ─── Results ──────────────────────────────────────────────────────────────────

class RaceResult(BaseModel):
    position: Optional[int]
    driver_code: str
    driver_name: str
    team_name: str
    grid_position: Optional[int]
    points: float
    status: str
    time_seconds: Optional[float]
    fastest_lap: bool


class DriverStanding(BaseModel):
    position: int
    driver_code: str
    driver_name: str
    team_name: str
    points: float
    wins: int


class ConstructorStanding(BaseModel):
    position: int
    team_name: str
    points: float
    wins: int


class StandingsResponse(BaseModel):
    year: int
    driver_standings: List[DriverStanding]
    constructor_standings: List[ConstructorStanding]


# ─── Drivers ──────────────────────────────────────────────────────────────────

class Driver(BaseModel):
    driver_code: str
    name: str
    team: Optional[str]
    number: Optional[int]
    nationality: Optional[str]


# ─── Laps ─────────────────────────────────────────────────────────────────────

class Lap(BaseModel):
    lap_id: Optional[int] = None
    driver_code: str
    lap_number: Optional[int]
    lap_time: Optional[float]
    sector1: Optional[float]
    sector2: Optional[float]
    sector3: Optional[float]
    tyre_compound: Optional[str]
    tyre_life: Optional[int]
    stint: Optional[int]
    pit_in_time: Optional[float]
    pit_out_time: Optional[float]
    is_personal_best: bool = False


# ─── Telemetry ────────────────────────────────────────────────────────────────

class TelemetryPoint(BaseModel):
    distance: Optional[float]
    speed: Optional[float]
    throttle: Optional[float]
    brake: Optional[int]
    rpm: Optional[int]
    gear: Optional[int]
    drs: Optional[int]
    timestamp: Optional[float]
    x: Optional[float]
    y: Optional[float]


class TelemetryResponse(BaseModel):
    driver_code: str
    lap_number: int
    points: List[TelemetryPoint]


# ─── Weather ──────────────────────────────────────────────────────────────────

class WeatherPoint(BaseModel):
    time: Optional[float]
    air_temp: Optional[float]
    track_temp: Optional[float]
    humidity: Optional[float]
    wind_speed: Optional[float]
    rainfall: bool = False


# ─── Strategy ─────────────────────────────────────────────────────────────────

class Stint(BaseModel):
    driver_code: str
    stint_number: int
    tyre_compound: str
    start_lap: int
    end_lap: int
    lap_count: int


class StrategyResponse(BaseModel):
    year: int
    race: str
    stints: List[Stint]


# ─── Pit stops ────────────────────────────────────────────────────────────────

class PitStop(BaseModel):
    driver_code: str
    lap_number: int
    duration: Optional[float]
    stop_number: int
