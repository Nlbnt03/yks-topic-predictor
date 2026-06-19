"""
Metric computation and baseline evaluation.
"""

import numpy as np
import pandas as pd
from config import TARGET_COL


def compute_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    mae = float(np.mean(np.abs(y_true - y_pred)))
    rmse = float(np.sqrt(np.mean((y_true - y_pred) ** 2)))
    return {"mae": mae, "rmse": rmse}


def baseline_metrics(train_df: pd.DataFrame, valid_df: pd.DataFrame, test_df: pd.DataFrame) -> dict:
    """
    Baseline: predict using rolling_mean_3_prev (last 3 years' average).
    Column must already exist in valid/test DataFrames.
    """
    val_pred = valid_df["rolling_mean_3_prev"].values
    val_true = valid_df[TARGET_COL].values
    val_m = compute_metrics(val_true, val_pred)

    test_pred = test_df["rolling_mean_3_prev"].values
    test_true = test_df[TARGET_COL].values
    test_m = compute_metrics(test_true, test_pred)

    return {
        "val_mae": val_m["mae"],
        "val_rmse": val_m["rmse"],
        "test_mae": test_m["mae"],
        "test_rmse": test_m["rmse"],
    }


def print_comparison_table(metrics_df: pd.DataFrame) -> None:
    print("\n" + "=" * 72)
    print(f"{'Model':<35} {'Val MAE':>8} {'Val RMSE':>9} {'Test MAE':>9} {'Test RMSE':>10}")
    print("-" * 72)
    for _, row in metrics_df.iterrows():
        print(
            f"{row['model']:<35} {row['val_mae']:>8.4f} {row['val_rmse']:>9.4f}"
            f" {row['test_mae']:>9.4f} {row['test_rmse']:>10.4f}"
        )
    print("=" * 72)
