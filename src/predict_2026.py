"""
Generate 2026 predictions using the saved best model.
Outputs: outputs/yks_2026_predictions.csv, outputs/prediction_summary.json
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import json
import joblib
import numpy as np
import pandas as pd

from config import (
    BEST_MODEL_FILE,
    PREDICT_INPUT_FILE,
    PREDICTIONS_FILE,
    SUMMARY_FILE,
    ALL_FEATURES,
    OUTPUTS_DIR,
)
from feature_utils import add_importance_scores

OUTPUT_COLS = [
    "session",
    "field",
    "subject",
    "topic",
    "predicted_question_count",
    "predicted_question_count_rounded",
    "lower_bound",
    "upper_bound",
    "importance_score",
    "importance_label",
    "trend_label",
    "confidence_label",
    "nonzero_frequency_prev",
    "historical_mean_prev",
    "historical_std_prev",
]


def generate_predictions():
    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Loading model from {BEST_MODEL_FILE}...")
    pipeline = joblib.load(BEST_MODEL_FILE)

    print(f"Loading 2026 input from {PREDICT_INPUT_FILE}...")
    df = pd.read_csv(PREDICT_INPUT_FILE)
    print(f"  Input rows: {len(df)}")

    X = df[ALL_FEATURES].copy()
    raw_preds = pipeline.predict(X)

    df["predicted_question_count"] = np.clip(raw_preds, 0, None)
    df["predicted_question_count_rounded"] = np.clip(raw_preds, 0, None).round().astype(int)

    std = df["historical_std_prev"].fillna(0).values
    df["lower_bound"] = np.maximum(0, df["predicted_question_count"] - std).round(2)
    df["upper_bound"] = (df["predicted_question_count"] + std).round(2)
    df["predicted_question_count"] = df["predicted_question_count"].round(4)

    df = add_importance_scores(df)

    out_df = df[OUTPUT_COLS].copy()
    out_df.to_csv(PREDICTIONS_FILE, index=False)
    print(f"Predictions saved → {PREDICTIONS_FILE}  ({len(out_df)} rows)")

    _write_summary(out_df)

    return out_df


def _write_summary(df: pd.DataFrame) -> None:
    summary = {
        "total_topics": int(len(df)),
        "by_session": df.groupby("session").size().to_dict(),
        "by_field": df.groupby("field").size().to_dict(),
        "by_importance_label": df["importance_label"].value_counts().to_dict(),
        "by_trend_label": df["trend_label"].value_counts().to_dict(),
        "by_confidence_label": df["confidence_label"].value_counts().to_dict(),
        "predicted_total_questions": {
            "TYT": int(df[df["session"] == "TYT"]["predicted_question_count_rounded"].sum()),
            "AYT": int(df[df["session"] == "AYT"]["predicted_question_count_rounded"].sum()),
        },
        "top_importance_topics": (
            df.nlargest(10, "importance_score")[
                ["session", "field", "subject", "topic", "importance_score", "importance_label"]
            ].to_dict(orient="records")
        ),
    }

    with open(SUMMARY_FILE, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print(f"Summary saved → {SUMMARY_FILE}")


if __name__ == "__main__":
    generate_predictions()
