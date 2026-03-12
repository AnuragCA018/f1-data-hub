from database.connection import get_connection

_DDL = """
CREATE TABLE IF NOT EXISTS drivers (
    driver_id       INTEGER PRIMARY KEY AUTOINCREMENT,
    driver_code     TEXT    NOT NULL UNIQUE,
    name            TEXT    NOT NULL,
    team            TEXT,
    number          INTEGER,
    nationality     TEXT
);

CREATE TABLE IF NOT EXISTS teams (
    team_id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL UNIQUE,
    engine_supplier TEXT
);

CREATE TABLE IF NOT EXISTS races (
    race_id         INTEGER PRIMARY KEY AUTOINCREMENT,
    year            INTEGER NOT NULL,
    race_name       TEXT    NOT NULL,
    circuit         TEXT,
    country         TEXT,
    date            TEXT,
    round_number    INTEGER,
    UNIQUE(year, race_name)
);

CREATE TABLE IF NOT EXISTS sessions (
    session_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    race_id         INTEGER NOT NULL,
    session_type    TEXT    NOT NULL,
    loaded          INTEGER DEFAULT 0,
    FOREIGN KEY (race_id) REFERENCES races(race_id),
    UNIQUE(race_id, session_type)
);

CREATE TABLE IF NOT EXISTS laps (
    lap_id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      INTEGER NOT NULL,
    driver_code     TEXT    NOT NULL,
    lap_number      INTEGER,
    lap_time        REAL,
    sector1         REAL,
    sector2         REAL,
    sector3         REAL,
    tyre_compound   TEXT,
    tyre_life       INTEGER,
    stint           INTEGER,
    pit_in_time     REAL,
    pit_out_time    REAL,
    is_personal_best INTEGER DEFAULT 0,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);

CREATE TABLE IF NOT EXISTS telemetry (
    telemetry_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      INTEGER NOT NULL,
    driver_code     TEXT    NOT NULL,
    lap_number      INTEGER,
    speed           REAL,
    throttle        REAL,
    brake           INTEGER,
    rpm             INTEGER,
    gear            INTEGER,
    drs             INTEGER,
    distance        REAL,
    timestamp       REAL,
    x               REAL,
    y               REAL,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);

CREATE TABLE IF NOT EXISTS weather (
    weather_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      INTEGER NOT NULL,
    time            REAL,
    air_temp        REAL,
    track_temp      REAL,
    humidity        REAL,
    wind_speed      REAL,
    rainfall        INTEGER DEFAULT 0,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);

CREATE TABLE IF NOT EXISTS pit_stops (
    pit_stop_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      INTEGER NOT NULL,
    driver_code     TEXT    NOT NULL,
    lap_number      INTEGER,
    duration        REAL,
    stop_number     INTEGER,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);

CREATE TABLE IF NOT EXISTS standings (
    standing_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    year            INTEGER NOT NULL,
    type            TEXT    NOT NULL,
    position        INTEGER,
    driver_code     TEXT,
    team_name       TEXT,
    points          REAL,
    wins            INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS race_results (
    result_id       INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      INTEGER NOT NULL,
    driver_code     TEXT    NOT NULL,
    position        INTEGER,
    grid_position   INTEGER,
    points          REAL,
    status          TEXT,
    fastest_lap     INTEGER DEFAULT 0,
    time_seconds    REAL,
    team_name       TEXT,
    driver_name     TEXT,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);

CREATE INDEX IF NOT EXISTS idx_laps_session    ON laps(session_id);
CREATE INDEX IF NOT EXISTS idx_laps_driver     ON laps(driver_code);
CREATE INDEX IF NOT EXISTS idx_telemetry_sess  ON telemetry(session_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_drv   ON telemetry(driver_code, lap_number);
CREATE INDEX IF NOT EXISTS idx_races_year      ON races(year);
CREATE INDEX IF NOT EXISTS idx_standings_year  ON standings(year);
CREATE INDEX IF NOT EXISTS idx_results_sess    ON race_results(session_id);
"""


def create_tables() -> None:
    conn = get_connection()
    try:
        for stmt in _DDL.strip().split(";"):
            s = stmt.strip()
            if s:
                conn.execute(s)
        conn.commit()
    finally:
        conn.close()
