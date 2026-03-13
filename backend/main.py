import asyncio
import os
import fastf1
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database.connection import init_db
from api.routes import schedule, results, drivers, laps, telemetry, weather, strategy, pitstops
# prediction router disabled until model is trained — re-enable by uncommenting:
# from api.routes import prediction
from services.prewarm_service import prewarm_default_content
from utils.cache import _cache as api_cache

CACHE_DIR = os.getenv("FASTF1_CACHE_DIR", os.path.join(os.path.dirname(__file__), "cache"))
os.makedirs(CACHE_DIR, exist_ok=True)
fastf1.Cache.enable_cache(CACHE_DIR)

# ── CORS origins ──────────────────────────────────────────────────────────────
# In production set ALLOWED_ORIGINS to your Netlify domain, e.g.:
#   ALLOWED_ORIGINS=https://your-app.netlify.app
# Multiple origins can be comma-separated.
_raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
)
ALLOWED_ORIGINS: list[str] = [o.strip() for o in _raw_origins.split(",") if o.strip()]

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    # load_predictor() disabled — re-enable once model is trained
    # from services.prediction_service import load_predictor; load_predictor()
    prewarm_task = asyncio.create_task(prewarm_default_content())
    try:
        yield
    finally:
        if not prewarm_task.done():
            prewarm_task.cancel()


app = FastAPI(
    title="F1 Analytics API",
    version="1.0.0",
    description="Formula 1 Analytics Platform – powered by FastF1",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(schedule.router, prefix="/api", tags=["schedule"])
app.include_router(results.router,  prefix="/api", tags=["results"])
app.include_router(drivers.router,  prefix="/api", tags=["drivers"])
app.include_router(laps.router,     prefix="/api", tags=["laps"])
app.include_router(telemetry.router,prefix="/api", tags=["telemetry"])
app.include_router(weather.router,  prefix="/api", tags=["weather"])
app.include_router(strategy.router, prefix="/api", tags=["strategy"])
app.include_router(pitstops.router,   prefix="/api", tags=["pitstops"])
# app.include_router(prediction.router, prefix="/api", tags=["prediction"])


@app.get("/")
def root():
    return {"message": "F1 Analytics API", "version": "1.0.0", "status": "running"}


@app.get("/health")
def health_check():
    return {"status": "healthy", "cache_entries": len(api_cache)}


@app.post("/api/cache/clear", tags=["admin"])
def clear_api_cache():
    """Clear the in-process API response cache (schedule, standings)."""
    api_cache.clear()
    return {"message": "Cache cleared"}
