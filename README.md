# F1 Analytics Platform

A full-stack Formula 1 data analytics platform powered by the **FastF1** Python library, **FastAPI**, and **Next.js 14**.

---

## Features

| Module | Description |
|---|---|
| **Dashboard** | Championship standings, race calendar, season overview |
| **Race Page** | Results table, tyre strategy, pit stop analysis, lap times |
| **Driver Page** | Stats, lap data table, sector analysis |
| **Telemetry Comparison** | Speed / throttle / brake traces for any two drivers |
| **Track Map** | GPS racing line with speed heatmap & animated lap replay |
| **Qualifying Analysis** | Sector breakdowns, fastest lap delta |

Supports seasons **2020 – present**.

---

## Stack

```
backend/   FastAPI + FastF1 + SQLite
frontend/  Next.js 14 (App Router) + TypeScript + Tailwind CSS + Chart.js
```

---

## Quick Start

### 1 – Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

FastF1 caches downloaded session data under `backend/cache/`.  
The SQLite database is created automatically at `backend/f1_data.db`.

### 2 – Frontend

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
```

The Next.js `next.config.js` proxies `/api/*` requests to `http://localhost:8000`.

---

## Project Structure

```
root/
├── index.html              ← Landing / quick-start page
├── backend/
│   ├── main.py             ← FastAPI application entry point
│   ├── requirements.txt
│   ├── f1_data.db          ← SQLite database (auto-created)
│   ├── cache/              ← FastF1 cache directory
│   ├── api/routes/         ← REST endpoints
│   │   ├── schedule.py     GET /api/schedule/{year}
│   │   ├── results.py      GET /api/results/{year}/{race}
│   │   │                   GET /api/standings/{year}
│   │   ├── drivers.py      GET /api/drivers
│   │   │                   GET /api/driver/{code}
│   │   ├── laps.py         GET /api/laps/{year}/{race}/{driver}
│   │   ├── telemetry.py    GET /api/telemetry/{year}/{race}/{driver}
│   │   │                   GET /api/telemetry/compare/{year}/{race}
│   │   ├── weather.py      GET /api/weather/{year}/{race}
│   │   ├── strategy.py     GET /api/strategy/{year}/{race}
│   │   └── pitstops.py     GET /api/pitstops/{year}/{race}
│   ├── database/
│   │   ├── connection.py   SQLite connection helpers
│   │   └── schema.py       CREATE TABLE DDL
│   ├── models/
│   │   └── schemas.py      Pydantic request/response models
│   ├── services/
│   │   ├── f1_service.py   FastF1 data extraction helpers
│   │   └── data_pipeline.py Orchestration (check DB → load F1 → store)
│   └── utils/helpers.py
└── frontend/
    ├── app/
    │   ├── page.tsx                        Home / dashboard
    │   ├── race/[year]/[race]/page.tsx     Race detail
    │   ├── driver/[code]/page.tsx          Driver profile
    │   ├── telemetry/page.tsx              Telemetry comparison
    │   ├── track/page.tsx                  Track map
    │   └── qualifying/page.tsx             Qualifying analysis
    ├── components/
    │   ├── layout/    Navbar, Sidebar
    │   ├── cards/     StatCard, DriverCard, RaceCard
    │   ├── tables/    RaceResultsTable, StandingsTable
    │   └── charts/    SpeedTrace, LapTimeChart, TyreStrategy,
    │                  ThrottleBrake, SectorComparison, TrackMap
    ├── services/api.ts       Typed fetch helpers for all endpoints
    └── types/index.ts        Shared TypeScript interfaces
```

---

## API Reference

All endpoints are prefixed with `/api`.

| Endpoint | Description |
|---|---|
| `GET /api/schedule/{year}` | Full race calendar |
| `GET /api/results/{year}/{race}` | Race finishing order |
| `GET /api/standings/{year}` | Driver & constructor championship |
| `GET /api/drivers` | All known drivers |
| `GET /api/driver/{code}` | Driver profile + stats |
| `GET /api/laps/{year}/{race}/{driver}?session_type=R` | All laps for a driver |
| `GET /api/telemetry/{year}/{race}/{driver}?lap=N` | Single-lap telemetry |
| `GET /api/telemetry/compare/{year}/{race}?driver1=VER&driver2=HAM&lap1=1&lap2=1` | Two-driver telemetry comparison |
| `GET /api/weather/{year}/{race}` | Session weather data |
| `GET /api/strategy/{year}/{race}` | Tyre stint data per driver |
| `GET /api/pitstops/{year}/{race}` | Pit stop log + summary |

Interactive API docs are available at `http://localhost:8000/docs`.

---

## Data Pipeline

```
Request → Check SQLite → Found? → Return
                ↓
          Not found
                ↓
         Load FastF1 session (run in async executor)
                ↓
         Extract laps / results / weather / pit stops
                ↓
         Store in SQLite, mark session loaded
                ↓
         Return response
```

Telemetry is loaded **lazily** (per driver per lap) so that sessions load quickly and telemetry data is only fetched when explicitly requested.

---

## Database Schema

Tables: `drivers`, `teams`, `races`, `sessions`, `laps`, `telemetry`, `weather`, `pit_stops`, `race_results`, `standings`.

All tables are created automatically on startup via `database/schema.py`.

---

## Performance

- FastF1 cache stores downloaded session data locally (avoids repeat downloads)
- SQLite WAL mode for concurrent reads
- Indexes on `(session_id)`, `(driver_code)`, `(year)` columns
- Telemetry downsampled client-side to ~400 points for chart rendering
- Next.js `fetch` with `revalidate: 300` for API caching
