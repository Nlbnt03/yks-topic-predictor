"""
Loads yks_2026_predictions.csv once at startup and provides
filtered views per endpoint.
"""

from pathlib import Path
from functools import lru_cache
from typing import Optional

import pandas as pd

PREDICTIONS_PATH = Path(__file__).resolve().parent.parent.parent / "outputs" / "yks_2026_predictions.csv"
YEARLY_DIST_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "raw" / "topic_yearly_distribution_complete.csv"

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

VALID_FIELDS = ["SAYISAL", "ESIT_AGIRLIK", "SOZEL"]


@lru_cache(maxsize=1)
def _load_df() -> pd.DataFrame:
    if not PREDICTIONS_PATH.exists():
        raise FileNotFoundError(
            f"Tahmin dosyası bulunamadı: {PREDICTIONS_PATH}\n"
            "Önce `python src/predict_2026.py` komutunu çalıştırın."
        )
    return pd.read_csv(PREDICTIONS_PATH)


def _df_to_records(df: pd.DataFrame) -> list[dict]:
    return df.fillna("").to_dict(orient="records")


def get_fields() -> list[str]:
    return VALID_FIELDS


def get_predictions_by_field(field: str) -> dict:
    """
    Returns TYT (field=ALL) + AYT (field=<field>) records combined.
    TYT is common for all fields.
    AYT is filtered by field.
    """
    if field not in VALID_FIELDS:
        raise ValueError(f"Geçersiz alan: {field}. Geçerli değerler: {VALID_FIELDS}")

    df = _load_df()

    tyt_df = df[(df["session"] == "TYT") & (df["field"] == "ALL")]
    ayt_subjects = AYT_SUBJECTS.get(field, [])
    ayt_df = df[
        (df["session"] == "AYT")
        & (df["field"] == field)
        & (df["subject"].isin(ayt_subjects))
    ]

    return {
        "field": field,
        "tyt": _df_to_records(tyt_df),
        "ayt": _df_to_records(ayt_df),
    }


def get_predictions_by_subject(field: str, subject: str) -> list[dict]:
    if field not in VALID_FIELDS:
        raise ValueError(f"Geçersiz alan: {field}")

    df = _load_df()

    tyt_result = df[(df["session"] == "TYT") & (df["field"] == "ALL") & (df["subject"] == subject)]
    ayt_result = df[(df["session"] == "AYT") & (df["field"] == field) & (df["subject"] == subject)]

    combined = pd.concat([tyt_result, ayt_result], ignore_index=True)
    if combined.empty:
        raise ValueError(f"'{subject}' dersi bulunamadı (alan={field})")
    return _df_to_records(combined)


def get_topic_detail(session: str, field: str, subject: str, topic: str) -> dict:
    df = _load_df()

    mask = (
        (df["session"] == session)
        & (df["subject"] == subject)
        & (df["topic"] == topic)
    )
    if field != "ALL":
        mask = mask & (df["field"] == field)

    row = df[mask]
    if row.empty:
        raise ValueError(
            f"Konu bulunamadı: session={session}, field={field}, subject={subject}, topic={topic}"
        )
    return _df_to_records(row)[0]


def get_yearly_distribution(session: str, field: str, subject: str, topic: str) -> dict:
    """Return year-by-year question counts for a topic (2018–2025)."""
    if not YEARLY_DIST_PATH.exists():
        raise FileNotFoundError(f"Yıllık dağılım dosyası bulunamadı: {YEARLY_DIST_PATH}")

    df = pd.read_csv(YEARLY_DIST_PATH)
    api_field = "ALL" if session == "TYT" else field

    mask = (
        (df["session"] == session)
        & (df["field"] == api_field)
        & (df["subject"] == subject)
        & (df["topic"] == topic)
    )
    rows = df[mask].sort_values("year")
    if rows.empty:
        raise ValueError(f"Konu bulunamadı: {session}/{api_field}/{subject}/{topic}")

    data = [
        {
            "year": int(r["year"]),
            "count": int(r["total_question_count"]),
            "is_real": not bool(r["is_zero_filled"]),
        }
        for _, r in rows.iterrows()
    ]
    return {
        "session": session,
        "field": field,
        "subject": subject,
        "topic": topic,
        "data": data,
    }


def reload_predictions() -> dict:
    """Force reload the predictions CSV (clears lru_cache)."""
    _load_df.cache_clear()
    df = _load_df()
    return {"status": "reloaded", "rows": len(df)}
