"""
train_model.py
──────────────
Train a RandomForest winner-probability model from the SQLite training set
built by build_dataset.py, then save the artefacts to backend/models/.

Run once after building the dataset:
    cd backend
    python scripts/train_model.py

Outputs:
    models/winner_predictor.joblib   – CalibratedClassifierCV(RandomForestClassifier)
    models/model_meta.json           – version, feature list, eval metrics
"""

import json
import logging
import os
import sys
import warnings

warnings.filterwarnings("ignore")

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)

import numpy as np
import pandas as pd
import joblib

from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import GroupKFold
from sklearn.metrics import roc_auc_score, brier_score_loss

from database.connection import get_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

MODELS_DIR = os.path.join(BACKEND_DIR, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

FEATURES = [
    "grid_pos",
    "quali_gap_ms",
    "driver_points",
    "team_points",
    "last_finish_pos",
    "track_win_rate",
    "track_podium_rate",
    "dnf_rate",
    "season_win_rate",
]

MODEL_VERSION = "1.0.0"


def load_data() -> pd.DataFrame:
    with get_db() as conn:
        df = pd.read_sql_query(
            "SELECT * FROM prediction_training_data ORDER BY year, round",
            conn,
        )
    log.info("Loaded %d rows from prediction_training_data", len(df))
    return df


def preprocess(df: pd.DataFrame) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Return X, y, groups (race_id for group-aware CV)."""
    df = df.copy()

    # Fill missing quali gap with a large penalty (20 s gap ≈ last on grid)
    df["quali_gap_ms"] = df["quali_gap_ms"].fillna(20_000)

    # Clip grid to [1, 20]
    df["grid_pos"] = df["grid_pos"].clip(1, 20)

    # Neutral fallbacks
    for col in ["driver_points", "team_points"]:
        df[col] = df[col].fillna(0)
    for col in ["last_finish_pos"]:
        df[col] = df[col].fillna(10)
    for col in ["track_win_rate", "track_podium_rate", "dnf_rate", "season_win_rate"]:
        df[col] = df[col].fillna(0)

    X = df[FEATURES].values.astype(np.float32)
    y = df["winner"].values.astype(np.int32)

    # Group by race so we never train on drivers from a race we evaluate on
    race_id = df["year"].astype(str) + "_" + df["round"].astype(str)
    groups = pd.factorize(race_id)[0]

    return X, y, groups


def train(df: pd.DataFrame):
    X, y, groups = preprocess(df)

    n_pos = y.sum()
    n_neg = len(y) - n_pos
    log.info("class balance  pos=%d  neg=%d", n_pos, n_neg)

    rf = RandomForestClassifier(
        n_estimators=500,
        max_depth=8,
        min_samples_leaf=5,
        class_weight="balanced",   # handles the 1:19 winner imbalance
        random_state=42,
        n_jobs=-1,
    )

    # ── Cross-validation by race group ────────────────────────────────────────
    gkf = GroupKFold(n_splits=5)
    auc_scores, brier_scores = [], []

    for fold, (tr_idx, va_idx) in enumerate(gkf.split(X, y, groups)):
        fold_rf = RandomForestClassifier(
            n_estimators=500, max_depth=8, min_samples_leaf=5,
            class_weight="balanced", random_state=42, n_jobs=-1,
        )
        fold_rf.fit(X[tr_idx], y[tr_idx])
        proba = fold_rf.predict_proba(X[va_idx])[:, 1]
        auc = roc_auc_score(y[va_idx], proba) if y[va_idx].sum() > 0 else float("nan")
        brier = brier_score_loss(y[va_idx], proba)
        auc_scores.append(auc)
        brier_scores.append(brier)
        log.info("  fold %d  AUC=%.4f  Brier=%.4f", fold + 1, auc, brier)

    log.info("CV  AUC=%.4f±%.4f  Brier=%.4f±%.4f",
             np.nanmean(auc_scores), np.nanstd(auc_scores),
             np.nanmean(brier_scores), np.nanstd(brier_scores))

    # ── Final model on all data (with Platt scaling for better calibration) ───
    calibrated = CalibratedClassifierCV(rf, cv=5, method="sigmoid")
    calibrated.fit(X, y)
    log.info("Final model trained on %d samples", len(X))

    # Feature importances: average across calibrated estimators
    all_importances = np.mean(
        [c.estimator.feature_importances_ for c in calibrated.calibrated_classifiers_],
        axis=0,
    )
    importances = dict(zip(FEATURES, all_importances.tolist()))
    log.info("Feature importances: %s", importances)

    # ── Save artefacts ─────────────────────────────────────────────────────────
    model_path = os.path.join(MODELS_DIR, "winner_predictor.joblib")
    joblib.dump(calibrated, model_path)
    log.info("Model saved → %s", model_path)

    meta = {
        "model_version": MODEL_VERSION,
        "algorithm": "RandomForestClassifier",
        "features": FEATURES,
        "cv_auc_mean": round(float(np.nanmean(auc_scores)), 4),
        "cv_auc_std":  round(float(np.nanstd(auc_scores)), 4),
        "cv_brier_mean": round(float(np.nanmean(brier_scores)), 4),
        "feature_importances": {k: round(v, 4) for k, v in importances.items()},
        "training_samples": int(len(X)),
        "training_years": "2020-2024",
    }
    meta_path = os.path.join(MODELS_DIR, "model_meta.json")
    with open(meta_path, "w") as fh:
        json.dump(meta, fh, indent=2)
    log.info("Meta saved → %s", meta_path)

    return meta


if __name__ == "__main__":
    df = load_data()
    if len(df) == 0:
        log.error("No training data found. Run build_dataset.py first.")
        sys.exit(1)
    meta = train(df)
    log.info("Training complete. AUC=%.4f", meta["cv_auc_mean"])
