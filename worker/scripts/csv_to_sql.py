"""
yks_2026_predictions.csv ve topic_yearly_distribution_complete.csv dosyalarını
Cloudflare D1 için SQL migration dosyasına dönüştürür.

Kullanım: python csv_to_sql.py
Çıktı:    migrations/0001_seed.sql
"""

import pandas as pd
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent.parent
PRED_CSV = BASE / "outputs" / "yks_2026_predictions.csv"
DIST_CSV = BASE / "data" / "raw" / "topic_yearly_distribution_complete.csv"
OUT_DIR  = Path(__file__).resolve().parent.parent / "migrations"
OUT_DIR.mkdir(exist_ok=True)
OUT_SQL  = OUT_DIR / "0001_seed.sql"

def escape(val) -> str:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return "NULL"
    if isinstance(val, bool):
        return "1" if val else "0"
    if isinstance(val, (int, float)):
        return str(val)
    return "'" + str(val).replace("'", "''") + "'"

def df_to_insert(df: pd.DataFrame, table: str, chunk=500) -> str:
    cols = ", ".join(df.columns)
    lines = [f"-- {table}: {len(df)} satır\n"]
    rows = df.values.tolist()
    for i in range(0, len(rows), chunk):
        batch = rows[i:i+chunk]
        vals = ",\n  ".join(
            "(" + ", ".join(escape(v) for v in row) + ")"
            for row in batch
        )
        lines.append(f"INSERT INTO {table} ({cols}) VALUES\n  {vals};\n")
    return "\n".join(lines)

def main():
    print("Predictions CSV yükleniyor...")
    pred = pd.read_csv(PRED_CSV)
    pred["is_zero_filled"] = 0  # predictions zaten gerçek

    print("Yearly distribution CSV yükleniyor...")
    dist = pd.read_csv(DIST_CSV)
    dist["is_zero_filled"] = dist["is_zero_filled"].map(
        {True: 1, False: 0, "True": 1, "False": 0}
    ).fillna(0).astype(int)

    # Sadece gerekli kolonlar
    pred_cols = [
        "session", "field", "subject", "topic",
        "predicted_question_count", "predicted_question_count_rounded",
        "lower_bound", "upper_bound",
        "importance_score", "importance_label", "trend_label", "confidence_label",
        "nonzero_frequency_prev", "historical_mean_prev", "historical_std_prev",
    ]
    dist_cols = [
        "year", "session", "field", "subject", "topic",
        "total_question_count", "is_zero_filled",
    ]

    pred = pred[[c for c in pred_cols if c in pred.columns]]
    dist = dist[[c for c in dist_cols if c in dist.columns]]

    sql = f"""-- YKS Predictor — D1 Migration
-- Otomatik oluşturuldu: csv_to_sql.py

-- ─── Schema ────────────────────────────────────────────────
DROP TABLE IF EXISTS predictions;
CREATE TABLE predictions (
  session                          TEXT NOT NULL,
  field                            TEXT NOT NULL,
  subject                          TEXT NOT NULL,
  topic                            TEXT NOT NULL,
  predicted_question_count         REAL,
  predicted_question_count_rounded INTEGER,
  lower_bound                      REAL,
  upper_bound                      REAL,
  importance_score                 REAL,
  importance_label                 TEXT,
  trend_label                      TEXT,
  confidence_label                 TEXT,
  nonzero_frequency_prev           REAL,
  historical_mean_prev             REAL,
  historical_std_prev              REAL
);
CREATE INDEX idx_pred_field    ON predictions(field);
CREATE INDEX idx_pred_session  ON predictions(session);
CREATE INDEX idx_pred_subject  ON predictions(subject);

DROP TABLE IF EXISTS yearly_distribution;
CREATE TABLE yearly_distribution (
  year                  INTEGER NOT NULL,
  session               TEXT    NOT NULL,
  field                 TEXT    NOT NULL,
  subject               TEXT    NOT NULL,
  topic                 TEXT    NOT NULL,
  total_question_count  INTEGER DEFAULT 0,
  is_zero_filled        INTEGER DEFAULT 0
);
CREATE INDEX idx_dist_lookup ON yearly_distribution(session, field, subject, topic);

-- ─── Veri ──────────────────────────────────────────────────
{df_to_insert(pred, "predictions")}

{df_to_insert(dist, "yearly_distribution")}
"""

    OUT_SQL.write_text(sql, encoding="utf-8")
    print(f"✓ Yazıldı → {OUT_SQL}")
    print(f"  predictions:          {len(pred)} satır")
    print(f"  yearly_distribution:  {len(dist)} satır")
    print(f"  Dosya boyutu:         {OUT_SQL.stat().st_size / 1024:.0f} KB")

if __name__ == "__main__":
    main()
