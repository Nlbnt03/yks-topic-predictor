import pandas as pd
import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder

from config import (
    CATEGORICAL_FEATURES,
    NUMERICAL_FEATURES,
    ALL_FEATURES,
    TARGET_COL,
    YEAR_COL,
    TRAIN_YEARS,
    VALID_YEAR,
    TEST_YEAR,
    FEATURES_FILE,
    TRAIN_FILE,
    VALID_FILE,
    TEST_FILE,
)


def load_splits_from_full(features_path=None):
    """Load train/valid/test splits from the combined features file using year-based split."""
    path = features_path or FEATURES_FILE
    df = pd.read_csv(path)
    df = df.dropna(subset=[TARGET_COL])

    train = df[df[YEAR_COL].isin(TRAIN_YEARS)].copy()
    valid = df[df[YEAR_COL] == VALID_YEAR].copy()
    test = df[df[YEAR_COL] == TEST_YEAR].copy()

    return train, valid, test


def load_splits_from_files():
    """Load pre-split CSV files."""
    train = pd.read_csv(TRAIN_FILE)
    valid = pd.read_csv(VALID_FILE)
    test = pd.read_csv(TEST_FILE)
    return train, valid, test


def get_X_y(df: pd.DataFrame):
    X = df[ALL_FEATURES].copy()
    y = df[TARGET_COL].values
    return X, y


def build_preprocessor():
    """Build ColumnTransformer: OHE for categoricals, StandardScaler for numericals."""
    cat_pipeline = Pipeline([
        ("ohe", OneHotEncoder(handle_unknown="ignore", sparse_output=False))
    ])

    num_pipeline = Pipeline([
        ("scaler", StandardScaler())
    ])

    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", cat_pipeline, CATEGORICAL_FEATURES),
            ("num", num_pipeline, NUMERICAL_FEATURES),
        ],
        remainder="drop",
    )
    return preprocessor


def add_importance_scores(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute importance_score (0-100) for each topic row based on:
    - nonzero_frequency_prev  (0-1)
    - historical_mean_prev    (raw count, normalised)
    - trend_slope_prev        (can be negative)
    - historical_confidence_mean_prev (0-1)
    """
    df = df.copy()

    freq = df["nonzero_frequency_prev"].clip(0, 1)

    mean_vals = df["historical_mean_prev"]
    max_mean = mean_vals.max() if mean_vals.max() > 0 else 1.0
    norm_mean = (mean_vals / max_mean).clip(0, 1)

    slope = df["trend_slope_prev"]
    slope_min, slope_max = slope.min(), slope.max()
    slope_range = slope_max - slope_min if slope_max != slope_min else 1.0
    norm_slope = ((slope - slope_min) / slope_range).clip(0, 1)

    conf = df["historical_confidence_mean_prev"].clip(0, 1)

    raw_score = (
        0.35 * freq
        + 0.30 * norm_mean
        + 0.20 * norm_slope
        + 0.15 * conf
    )
    df["importance_score"] = (raw_score * 100).clip(0, 100).round(1)

    def importance_label(s):
        if s >= 75:
            return "Çok yüksek"
        elif s >= 55:
            return "Yüksek"
        elif s >= 35:
            return "Orta"
        else:
            return "Düşük"

    df["importance_label"] = df["importance_score"].apply(importance_label)

    def trend_label(slope_val):
        if slope_val > 0.2:
            return "Artış eğiliminde"
        elif slope_val < -0.2:
            return "Azalış eğiliminde"
        else:
            return "Stabil"

    df["trend_label"] = df["trend_slope_prev"].apply(trend_label)

    def confidence_label(conf_val):
        if conf_val >= 0.90:
            return "Yüksek"
        elif conf_val >= 0.75:
            return "Orta"
        else:
            return "Düşük"

    df["confidence_label"] = df["historical_confidence_mean_prev"].apply(confidence_label)

    return df
