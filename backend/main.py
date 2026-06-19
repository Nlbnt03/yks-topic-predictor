"""
YKS Topic Predictor — FastAPI Backend
Run: uvicorn backend.main:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from backend.services.prediction_service import (
    get_fields,
    get_predictions_by_field,
    get_predictions_by_subject,
    get_topic_detail,
    get_yearly_distribution,
    reload_predictions,
)

app = FastAPI(
    title="YKS Konu Tahmin API",
    description=(
        "2018-2025 yılları arasındaki YKS konu dağılımlarına dayanarak "
        "2026 için tahmini soru aralığı ve çalışma önceliği sunar. "
        "Bu sistem kesin tahmin değil, geçmiş yıl örüntülerine dayalı istatistiksel bir rehberdir."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "yks-topic-predictor"}


@app.get("/api/fields")
def fields():
    return {"fields": get_fields()}


@app.get("/api/predictions")
def predictions(
    field: str = Query(..., description="Alan: SAYISAL | ESIT_AGIRLIK | SOZEL"),
):
    """
    TYT (ortak) + AYT (alana göre filtrelenmiş) tahminlerini döndürür.
    """
    try:
        return get_predictions_by_field(field)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.get("/api/predictions/subject")
def predictions_by_subject(
    field: str = Query(..., description="Alan: SAYISAL | ESIT_AGIRLIK | SOZEL"),
    subject: str = Query(..., description="Ders adı (örn. Matematik)"),
):
    """Belirli bir ders için tüm konu tahminlerini döndürür."""
    try:
        return {"field": field, "subject": subject, "topics": get_predictions_by_subject(field, subject)}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.get("/api/topic-detail")
def topic_detail(
    session: str = Query(..., description="TYT veya AYT"),
    field: str = Query(..., description="Alan: ALL | SAYISAL | ESIT_AGIRLIK | SOZEL"),
    subject: str = Query(..., description="Ders adı"),
    topic: str = Query(..., description="Konu adı"),
):
    """Tek bir konu için detaylı tahmin bilgisi döndürür."""
    try:
        return get_topic_detail(session, field, subject, topic)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.get("/api/yearly-distribution")
def yearly_distribution(
    session: str = Query(..., description="TYT veya AYT"),
    field: str = Query(..., description="Alan: ALL | SAYISAL | ESIT_AGIRLIK | SOZEL"),
    subject: str = Query(..., description="Ders adı"),
    topic: str = Query(..., description="Konu adı"),
):
    """2018-2025 yıllık soru dağılımını döndürür."""
    try:
        return get_yearly_distribution(session, field, subject, topic)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.post("/api/reload")
def reload():
    """Tahmin CSV'sini yeniden yükler (güncelleme sonrası)."""
    return reload_predictions()
