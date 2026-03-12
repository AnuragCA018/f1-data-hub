"""
prediction.py
─────────────
REST endpoint for AI race winner probability predictions.

GET /api/predict/winner/{year}/{round}
    → { year, round, race, circuit, model_version, model_ready,
        predictions: [{ driver, team, grid_pos, probability, win_pct }],
        top_features: { feature: importance } }
"""

import asyncio
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

import services.f1_service as f1
from services.prediction_service import (
    model_ready,
    predict_winner,
    get_meta,
)

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/predict/winner/{year}/{round_num}")
async def get_winner_prediction(
    year: int,
    round_num: int,
    session_type: str = Query("R", description="Session type for feature extraction (R = Race)"),
):
    """
    Return AI-predicted win probabilities for every driver in the given race.

    The model uses: grid position, qualifying gap, championship points, circuit
    history, DNF rate, and season form to produce calibrated win probabilities.
    Probabilities are normalised so they sum to 1 across the field.
    """
    if year < 2018 or year > 2030:
        raise HTTPException(status_code=400, detail="Year must be between 2018 and 2030")
    if round_num < 1 or round_num > 30:
        raise HTTPException(status_code=400, detail="Round must be between 1 and 30")

    loop = asyncio.get_running_loop()

    # Load session via schedule lookup (same robust loader as Track Map)
    try:
        session = await loop.run_in_executor(
            None, f1.load_session_for_track, year, round_num, session_type
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        logger.error("Prediction: session load failed %s/%s/%s: %s", year, round_num, session_type, exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to load session: {exc}")

    # Resolve race / circuit metadata from the session event
    ev      = session.event
    race    = str(ev.get("EventName", f"Round {round_num}"))
    circuit = str(ev.get("Location", "Unknown"))

    meta = get_meta()

    if not model_ready():
        # Return a structured "no model" response rather than a 500
        return {
            "year": year,
            "round": round_num,
            "race": race,
            "circuit": circuit,
            "model_version": None,
            "model_ready": False,
            "predictions": [],
            "top_features": {},
            "message": (
                "Prediction model has not been trained yet. "
                "Run: cd backend && python scripts/build_dataset.py && python scripts/train_model.py"
            ),
        }

    try:
        predictions = await loop.run_in_executor(
            None, predict_winner, year, round_num, circuit, session
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        logger.error("Prediction: inference failed %s/%s: %s", year, round_num, exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}")

    top_features = meta.get("feature_importances", {})

    return {
        "year": year,
        "round": round_num,
        "race": race,
        "circuit": circuit,
        "session_type": session_type,
        "model_version": meta.get("model_version", "unknown"),
        "algorithm": meta.get("algorithm", "RandomForestClassifier"),
        "model_ready": True,
        "cv_auc": meta.get("cv_auc_mean"),
        "predictions": predictions,
        "top_features": top_features,
    }
