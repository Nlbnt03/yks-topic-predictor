from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

DATA_RAW_DIR = BASE_DIR / "data" / "raw"
DATA_PROCESSED_DIR = BASE_DIR / "data" / "processed"
MODELS_DIR = BASE_DIR / "models"
OUTPUTS_DIR = BASE_DIR / "outputs"

TRAIN_FILE = DATA_RAW_DIR / "model_train_2019_2023.csv"
VALID_FILE = DATA_RAW_DIR / "model_valid_2024.csv"
TEST_FILE = DATA_RAW_DIR / "model_test_2025.csv"
FEATURES_FILE = DATA_RAW_DIR / "model_training_features_2019_2025.csv"
PREDICT_INPUT_FILE = DATA_RAW_DIR / "model_prediction_input_2026.csv"
TOPIC_DIST_FILE = DATA_RAW_DIR / "topic_yearly_distribution_complete.csv"

BEST_MODEL_FILE = MODELS_DIR / "best_model.pkl"
METRICS_FILE = OUTPUTS_DIR / "model_metrics.csv"
PREDICTIONS_FILE = OUTPUTS_DIR / "yks_2026_predictions.csv"
SUMMARY_FILE = OUTPUTS_DIR / "prediction_summary.json"

TARGET_COL = "target_total_question_count"

CATEGORICAL_FEATURES = ["session", "field", "subject", "topic"]

NUMERICAL_FEATURES = [
    "lag_1",
    "lag_2",
    "lag_3",
    "rolling_mean_2_prev",
    "rolling_mean_3_prev",
    "historical_mean_prev",
    "historical_std_prev",
    "nonzero_frequency_prev",
    "trend_slope_prev",
    "historical_confidence_mean_prev",
]

ALL_FEATURES = CATEGORICAL_FEATURES + NUMERICAL_FEATURES

TRAIN_YEARS = list(range(2019, 2024))
VALID_YEAR = 2024
TEST_YEAR = 2025
PREDICT_YEAR = 2026

YEAR_COL = "target_year"

# AYT subjects per field
AYT_SUBJECTS = {
    "SAYISAL": ["Matematik", "Fizik", "Kimya", "Biyoloji"],
    "ESIT_AGIRLIK": ["Matematik", "Türk Dili ve Edebiyatı", "Tarih-1", "Coğrafya-1"],
    "SOZEL": [
        "Türk Dili ve Edebiyatı",
        "Tarih-1",
        "Coğrafya-1",
        "Tarih-2",
        "Coğrafya-2",
        "Felsefe Grubu",
        "Din Kültürü ve Ahlak Bilgisi",
    ],
}

RANDOM_STATE = 42
