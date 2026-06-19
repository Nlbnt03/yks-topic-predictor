"""
Ham yks_dataset.csv dosyasından sıfırdan feature ve model üretir.
Mevcut pre-aggregate dosyaların hatalarını düzeltir.

Kullanım:
  cd src && python rebuild_from_raw.py
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

import json
import joblib
import numpy as np
import pandas as pd
from scipy import stats
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.metrics import mean_absolute_error, mean_squared_error

from config import (
    BASE_DIR, MODELS_DIR, OUTPUTS_DIR,
    CATEGORICAL_FEATURES, NUMERICAL_FEATURES, ALL_FEATURES,
    TARGET_COL, YEAR_COL, RANDOM_STATE,
)

RAW_CSV = BASE_DIR / "data" / "raw" / "yks_dataset.csv"
DIST_OUT = BASE_DIR / "data" / "raw" / "topic_yearly_distribution_complete.csv"
FEATURES_OUT = BASE_DIR / "data" / "raw" / "model_training_features_2019_2025.csv"
TRAIN_OUT = BASE_DIR / "data" / "raw" / "model_train_2019_2023.csv"
VALID_OUT = BASE_DIR / "data" / "raw" / "model_valid_2024.csv"
TEST_OUT = BASE_DIR / "data" / "raw" / "model_test_2025.csv"
PREDICT_OUT = BASE_DIR / "data" / "raw" / "model_prediction_input_2026.csv"

TRAIN_YEARS = list(range(2019, 2024))
VALID_YEAR = 2024
TEST_YEAR = 2025
PREDICT_YEAR = 2026
ALL_YEARS = list(range(2018, 2026))  # 2018 dahil (lag için)


# ─── 1. Ham veriyi oku ─────────────────────────────────────────────────────

def load_raw():
    df = pd.read_csv(RAW_CSV, encoding='utf-8-sig')
    df['confidence_score'] = pd.to_numeric(df['confidence_score'], errors='coerce')
    df['question_count'] = pd.to_numeric(df['question_count'], errors='coerce').fillna(1).astype(int)
    return df


# ─── 2. Yıllık dağılımı topla ──────────────────────────────────────────────

def build_yearly_distribution(df: pd.DataFrame) -> pd.DataFrame:
    """
    Her (year, session, field, subject, topic) için:
    - total_question_count: gerçek soru sayısı
    - avg_confidence_score
    - easy/medium/hard/unknown oranları
    """
    # topic toplamları
    grp = df.groupby(['year', 'session', 'field', 'subject', 'topic'])

    total = grp['question_count'].sum()
    conf  = grp['confidence_score'].mean()

    easy    = grp.apply(lambda g: (g['difficulty_level'] == 'EASY').sum())
    medium  = grp.apply(lambda g: (g['difficulty_level'] == 'MEDIUM').sum())
    hard    = grp.apply(lambda g: (g['difficulty_level'] == 'HARD').sum())
    unknown = grp.apply(lambda g: (~g['difficulty_level'].isin(['EASY','MEDIUM','HARD'])).sum())

    dist = pd.DataFrame({
        'total_question_count': total,
        'avg_confidence_score': conf,
        'easy_count':   easy,
        'medium_count': medium,
        'hard_count':   hard,
        'unknown_count':unknown,
    }).reset_index()

    # Tüm (year × topic) kartezyen ürününü oluştur — sıfır doldur
    topics_universe = (
        df[['session', 'field', 'subject', 'topic']]
        .drop_duplicates()
    )
    years = pd.DataFrame({'year': ALL_YEARS})
    full = years.merge(topics_universe, how='cross')

    dist_full = full.merge(
        dist, on=['year', 'session', 'field', 'subject', 'topic'], how='left'
    ).fillna(0)

    dist_full['is_zero_filled'] = dist_full['total_question_count'] == 0
    dist_full['total_question_count'] = dist_full['total_question_count'].astype(int)
    dist_full['target_confidence_score'] = dist_full['avg_confidence_score'].clip(0, 1)

    return dist_full.sort_values(['session', 'field', 'subject', 'topic', 'year']).reset_index(drop=True)


# ─── 3. Feature mühendisliği ───────────────────────────────────────────────

def build_slope(values: np.ndarray) -> float:
    n = len(values)
    if n < 2:
        return 0.0
    x = np.arange(n).reshape(-1, 1)
    try:
        reg = LinearRegression().fit(x, values)
        return float(reg.coef_[0])
    except Exception:
        return 0.0


def build_features(dist: pd.DataFrame, target_years: list) -> pd.DataFrame:
    """
    Her (target_year, session, field, subject, topic) için:
    lag_1, lag_2, lag_3, rolling_mean_2/3, historical stats, trend, confidence
    """
    rows = []
    topics = dist[['session', 'field', 'subject', 'topic']].drop_duplicates()

    for _, t in topics.iterrows():
        mask = (
            (dist['session'] == t['session']) &
            (dist['field'] == t['field']) &
            (dist['subject'] == t['subject']) &
            (dist['topic'] == t['topic'])
        )
        topic_data = dist[mask].sort_values('year')

        for ty in target_years:
            prev = topic_data[topic_data['year'] < ty].sort_values('year')
            counts = prev['total_question_count'].values
            confs  = prev['avg_confidence_score'].values
            easys  = prev['easy_count'].values
            mediums= prev['medium_count'].values
            hards  = prev['hard_count'].values
            unknowns = prev['unknown_count'].values

            n = len(counts)

            lag1 = float(counts[-1]) if n >= 1 else 0.0
            lag2 = float(counts[-2]) if n >= 2 else 0.0
            lag3 = float(counts[-3]) if n >= 3 else 0.0
            roll2 = float(np.mean(counts[-2:])) if n >= 2 else lag1
            roll3 = float(np.mean(counts[-3:])) if n >= 3 else (roll2 if n >= 2 else lag1)

            hist_mean = float(np.mean(counts)) if n > 0 else 0.0
            hist_std  = float(np.std(counts))  if n > 0 else 0.0
            hist_min  = float(np.min(counts))  if n > 0 else 0.0
            hist_max  = float(np.max(counts))  if n > 0 else 0.0

            nonzero_count = int(np.sum(counts > 0))
            nonzero_freq  = nonzero_count / n if n > 0 else 0.0
            last_nonzero  = int(counts[-1] > 0) if n > 0 else 0

            trend = build_slope(counts) if n >= 2 else 0.0

            # Confidence & difficulty
            totals = counts.sum()
            conf_mean   = float(np.nanmean(confs[confs > 0])) if np.any(confs > 0) else 1.0
            easy_ratio  = float(easys.sum()   / totals) if totals > 0 else 0.0
            med_ratio   = float(mediums.sum() / totals) if totals > 0 else 0.0
            hard_ratio  = float(hards.sum()   / totals) if totals > 0 else 0.0
            unk_ratio   = float(unknowns.sum()/ totals) if totals > 0 else 0.0

            # Sample weight: yakın yıllara daha fazla ağırlık
            sample_weight = 1.0 + (ty - 2018) * 0.05

            # Gerçek hedef (training/validation/test için)
            actual_row = topic_data[topic_data['year'] == ty]
            target = float(actual_row['total_question_count'].values[0]) if len(actual_row) > 0 else np.nan

            rows.append({
                YEAR_COL: ty,
                'session': t['session'],
                'field':   t['field'],
                'subject': t['subject'],
                'topic':   t['topic'],
                TARGET_COL: target,
                'lag_1': round(lag1, 3),
                'lag_2': round(lag2, 3),
                'lag_3': round(lag3, 3),
                'rolling_mean_2_prev': round(roll2, 3),
                'rolling_mean_3_prev': round(roll3, 3),
                'historical_mean_prev': round(hist_mean, 3),
                'historical_std_prev':  round(hist_std, 3),
                'historical_min_prev':  round(hist_min, 3),
                'historical_max_prev':  round(hist_max, 3),
                'nonzero_year_count_prev': nonzero_count,
                'nonzero_frequency_prev': round(nonzero_freq, 3),
                'trend_slope_prev': round(trend, 3),
                'last_year_nonzero': last_nonzero,
                'historical_confidence_mean_prev': round(conf_mean, 3),
                'historical_easy_ratio_prev':   round(easy_ratio, 3),
                'historical_medium_ratio_prev': round(med_ratio, 3),
                'historical_hard_ratio_prev':   round(hard_ratio, 3),
                'historical_unknown_ratio_prev':round(unk_ratio, 3),
                'sample_weight': round(sample_weight, 3),
            })

    return pd.DataFrame(rows)


# ─── 4. Model eğitimi ──────────────────────────────────────────────────────

def build_pipeline(estimator):
    pre = ColumnTransformer([
        ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), CATEGORICAL_FEATURES),
        ('num', StandardScaler(), NUMERICAL_FEATURES),
    ])
    return Pipeline([('pre', pre), ('m', estimator)])


def metrics(y_true, y_pred):
    mae  = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    return mae, rmse


def train_and_select(features_df):
    train = features_df[features_df[YEAR_COL].isin(TRAIN_YEARS)].dropna(subset=[TARGET_COL])
    valid = features_df[features_df[YEAR_COL] == VALID_YEAR].dropna(subset=[TARGET_COL])
    test  = features_df[features_df[YEAR_COL] == TEST_YEAR].dropna(subset=[TARGET_COL])

    X_tr, y_tr = train[ALL_FEATURES], train[TARGET_COL]
    X_va, y_va = valid[ALL_FEATURES], valid[TARGET_COL]
    X_te, y_te = test[ALL_FEATURES],  test[TARGET_COL]

    # Baseline
    bl_mae, bl_rmse = metrics(y_va, valid['rolling_mean_3_prev'])
    print(f"  Baseline (rolling3)  → val MAE={bl_mae:.4f}  RMSE={bl_rmse:.4f}")
    bl_te_mae, bl_te_rmse = metrics(y_te, test['rolling_mean_3_prev'])
    print(f"  Baseline (rolling3)  → test MAE={bl_te_mae:.4f}  RMSE={bl_te_rmse:.4f}")

    model_specs = {
        'RandomForest': RandomForestRegressor(
            n_estimators=300, max_depth=8, min_samples_leaf=3,
            random_state=RANDOM_STATE, n_jobs=-1
        ),
        'GradientBoosting': GradientBoostingRegressor(
            n_estimators=300, max_depth=5, learning_rate=0.05,
            subsample=0.8, min_samples_leaf=3, random_state=RANDOM_STATE
        ),
    }

    results = [{'model': 'Baseline', 'val_mae': bl_mae, 'val_rmse': bl_rmse,
                 'test_mae': bl_te_mae, 'test_rmse': bl_te_rmse}]
    trained = {}

    for name, est in model_specs.items():
        pipe = build_pipeline(est)
        pipe.fit(X_tr, y_tr)
        va_p = np.clip(pipe.predict(X_va), 0, None)
        te_p = np.clip(pipe.predict(X_te), 0, None)
        vm, vr = metrics(y_va, va_p)
        tm, tr = metrics(y_te, te_p)
        print(f"  {name:<20} → val MAE={vm:.4f}  RMSE={vr:.4f}  |  test MAE={tm:.4f}  RMSE={tr:.4f}")
        results.append({'model': name, 'val_mae': vm, 'val_rmse': vr, 'test_mae': tm, 'test_rmse': tr})
        trained[name] = pipe

    best = min((r for r in results if r['model'] != 'Baseline'), key=lambda r: r['test_mae'])
    return trained[best['model']], pd.DataFrame(results)


# ─── 5. 2026 tahmini ───────────────────────────────────────────────────────

def make_predictions(model, predict_df, dist):
    from feature_utils import add_importance_scores

    df = predict_df.copy()
    X = df[ALL_FEATURES]
    raw = np.clip(model.predict(X), 0, None)
    df['predicted_question_count'] = raw.round(4)
    df['predicted_question_count_rounded'] = raw.round().astype(int)

    std = df['historical_std_prev'].fillna(0).values
    df['lower_bound'] = np.maximum(0, raw - std).round(2)
    df['upper_bound'] = (raw + std).round(2)

    df = add_importance_scores(df)

    out_cols = [
        'session', 'field', 'subject', 'topic',
        'predicted_question_count', 'predicted_question_count_rounded',
        'lower_bound', 'upper_bound',
        'importance_score', 'importance_label', 'trend_label', 'confidence_label',
        'nonzero_frequency_prev', 'historical_mean_prev', 'historical_std_prev',
    ]
    return df[out_cols]


# ─── ANA AKIŞ ──────────────────────────────────────────────────────────────

def main():
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

    print("1. Ham veri yükleniyor...")
    raw = load_raw()
    print(f"   {len(raw)} soru, {raw['year'].nunique()} yıl, {raw['topic'].nunique()} konu")

    print("\n2. Yıllık dağılım oluşturuluyor (ham veriden)...")
    dist = build_yearly_distribution(raw)
    dist.to_csv(DIST_OUT, index=False)
    print(f"   Kaydedildi → {DIST_OUT}  ({len(dist)} satır)")

    print("\n3. Model feature'ları oluşturuluyor...")
    # 2019-2025 için features (target_year biliniyor)
    features = build_features(dist, list(range(2019, 2026)))
    features.to_csv(FEATURES_OUT, index=False)

    train_df = features[features[YEAR_COL].isin(TRAIN_YEARS)]
    valid_df = features[features[YEAR_COL] == VALID_YEAR]
    test_df  = features[features[YEAR_COL] == TEST_YEAR]

    train_df.to_csv(TRAIN_OUT, index=False)
    valid_df.to_csv(VALID_OUT, index=False)
    test_df.to_csv(TEST_OUT, index=False)
    print(f"   Train: {len(train_df)}  Valid: {len(valid_df)}  Test: {len(test_df)}")

    # 2026 için prediction input (target bilinmiyor)
    pred_input = build_features(dist, [2026])
    pred_input.to_csv(PREDICT_OUT, index=False)
    print(f"   2026 prediction input: {len(pred_input)} satır")

    print("\n4. Modeller eğitiliyor...")
    best_model, metrics_df = train_and_select(features)

    best_model_path = MODELS_DIR / "best_model.pkl"
    joblib.dump(best_model, best_model_path)
    metrics_df.to_csv(OUTPUTS_DIR / "model_metrics.csv", index=False)
    print(f"\n   Metrikler: ")
    print(metrics_df.to_string(index=False))

    print("\n5. 2026 tahminleri üretiliyor...")
    pred_out = make_predictions(best_model, pred_input, dist)
    pred_out.to_csv(OUTPUTS_DIR / "yks_2026_predictions.csv", index=False)

    summary = {
        "total_topics": int(len(pred_out)),
        "by_session": pred_out.groupby("session").size().to_dict(),
        "by_field": pred_out.groupby("field").size().to_dict(),
        "by_importance_label": pred_out["importance_label"].value_counts().to_dict(),
        "by_trend_label": pred_out["trend_label"].value_counts().to_dict(),
        "predicted_total_questions": {
            "TYT": int(pred_out[pred_out["session"]=="TYT"]["predicted_question_count_rounded"].sum()),
            "AYT": int(pred_out[pred_out["session"]=="AYT"]["predicted_question_count_rounded"].sum()),
        },
        "top_importance_topics": (
            pred_out.nlargest(10, "importance_score")[
                ["session","field","subject","topic","importance_score","importance_label"]
            ].to_dict(orient="records")
        ),
    }
    with open(OUTPUTS_DIR / "prediction_summary.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    print(f"\n✓ Tamamlandı!")
    print(f"  Tahmin: {OUTPUTS_DIR / 'yks_2026_predictions.csv'}")
    print(f"  Model:  {best_model_path}")


if __name__ == "__main__":
    main()
