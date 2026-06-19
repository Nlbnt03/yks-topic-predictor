"""
Train Linear Regression, Random Forest, and Gradient Boosting models.
Saves the best model (lowest test MAE) to models/best_model.pkl.
Writes metrics to outputs/model_metrics.csv.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import joblib
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.pipeline import Pipeline

from config import BEST_MODEL_FILE, METRICS_FILE, MODELS_DIR, OUTPUTS_DIR, RANDOM_STATE
from feature_utils import load_splits_from_full, get_X_y, build_preprocessor
from evaluate import compute_metrics, baseline_metrics


def build_pipeline(estimator):
    preprocessor = build_preprocessor()
    return Pipeline([
        ("preprocessor", preprocessor),
        ("model", estimator),
    ])


def train_all():
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

    print("Loading data splits...")
    train_df, valid_df, test_df = load_splits_from_full()

    print(f"  Train: {len(train_df)} rows  |  Valid: {len(valid_df)} rows  |  Test: {len(test_df)} rows")

    X_train, y_train = get_X_y(train_df)
    X_valid, y_valid = get_X_y(valid_df)
    X_test, y_test = get_X_y(test_df)

    # --- Baseline ---
    print("\nComputing baseline (rolling_mean_3_prev)...")
    b_metrics = baseline_metrics(train_df, valid_df, test_df)
    print(f"  Baseline  → val MAE={b_metrics['val_mae']:.4f}  val RMSE={b_metrics['val_rmse']:.4f}"
          f"  test MAE={b_metrics['test_mae']:.4f}  test RMSE={b_metrics['test_rmse']:.4f}")

    # --- ML models ---
    model_specs = {
        "LinearRegression": LinearRegression(),
        "RandomForest": RandomForestRegressor(
            n_estimators=300,
            max_depth=8,
            min_samples_leaf=3,
            random_state=RANDOM_STATE,
            n_jobs=-1,
        ),
        "GradientBoosting": GradientBoostingRegressor(
            n_estimators=300,
            max_depth=5,
            learning_rate=0.05,
            subsample=0.8,
            min_samples_leaf=3,
            random_state=RANDOM_STATE,
        ),
    }

    results = [
        {
            "model": "Baseline (rolling_mean_3_prev)",
            "val_mae": b_metrics["val_mae"],
            "val_rmse": b_metrics["val_rmse"],
            "test_mae": b_metrics["test_mae"],
            "test_rmse": b_metrics["test_rmse"],
        }
    ]

    trained_pipelines = {}

    for name, estimator in model_specs.items():
        print(f"\nTraining {name}...")
        pipeline = build_pipeline(estimator)
        pipeline.fit(X_train, y_train)

        val_pred = pipeline.predict(X_valid)
        test_pred = pipeline.predict(X_test)

        val_m = compute_metrics(y_valid, val_pred)
        test_m = compute_metrics(y_test, test_pred)

        print(f"  {name} → val MAE={val_m['mae']:.4f}  val RMSE={val_m['rmse']:.4f}"
              f"  test MAE={test_m['mae']:.4f}  test RMSE={test_m['rmse']:.4f}")

        results.append({
            "model": name,
            "val_mae": val_m["mae"],
            "val_rmse": val_m["rmse"],
            "test_mae": test_m["mae"],
            "test_rmse": test_m["rmse"],
        })
        trained_pipelines[name] = pipeline

    # --- Save metrics ---
    metrics_df = pd.DataFrame(results)
    metrics_df = metrics_df.round(4)
    metrics_df.to_csv(METRICS_FILE, index=False)
    print(f"\nMetrics saved → {METRICS_FILE}")

    # --- Choose best model (lowest test MAE among ML models) ---
    ml_results = [r for r in results if r["model"] != "Baseline (rolling_mean_3_prev)"]
    best_entry = min(ml_results, key=lambda r: r["test_mae"])
    best_name = best_entry["model"]
    best_pipeline = trained_pipelines[best_name]

    joblib.dump(best_pipeline, BEST_MODEL_FILE)
    print(f"Best model: {best_name}  (test MAE={best_entry['test_mae']:.4f})")
    print(f"Model saved → {BEST_MODEL_FILE}")

    print("\n--- Final Metrics Summary ---")
    print(metrics_df.to_string(index=False))

    return best_pipeline, metrics_df


if __name__ == "__main__":
    train_all()
