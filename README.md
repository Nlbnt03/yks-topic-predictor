# YKS Konu Bazlı Soru Dağılımı Tahmin Sistemi

> **Önemli Uyarı:** Bu sistem kesin soru tahmini yapmaz. Geçmiş yıllardaki (2018-2025) konu dağılımlarına göre **tahmini soru aralığı**, **trend** ve **çalışma önceliği** üretir.

---

## Projenin Amacı

YKS (TYT + AYT) sınavlarında 2018-2025 yılları arasında ölçülen konu bazlı soru dağılımlarını kullanarak 2026 yılı için:

- Her konu için **tahmini soru sayısı aralığı** (`lower_bound` – `upper_bound`)
- **Önem skoru** (hangi konulara öncelik verilmeli)
- **Trend etiketi** (artış / azalış / stabil)
- **Güven düzeyi** (tarihi tutarlılık)

üretmek ve öğrencinin alanına göre (SAYISAL / ESIT_AGIRLIK / SOZEL) kişiselleştirmektir.

---

## Proje Yapısı

```
yks-topic-predictor/
├── data/
│   ├── raw/                   # Ham veri dosyaları
│   └── processed/             # İşlenmiş veriler
├── notebooks/
│   ├── 01_data_analysis.ipynb
│   ├── 02_model_training.ipynb
│   └── 03_prediction_2026.ipynb
├── src/
│   ├── config.py              # Yollar, sabitler, alan tanımları
│   ├── feature_utils.py       # Özellik mühendisliği + önişleme
│   ├── train_model.py         # Model eğitimi ve kaydetme
│   ├── evaluate.py            # MAE / RMSE hesaplama
│   └── predict_2026.py        # 2026 tahmin üretimi
├── models/
│   └── best_model.pkl         # En iyi eğitilmiş model
├── outputs/
│   ├── model_metrics.csv      # Model karşılaştırma tablosu
│   ├── yks_2026_predictions.csv
│   └── prediction_summary.json
├── backend/
│   ├── main.py                # FastAPI uygulaması
│   ├── services/
│   │   └── prediction_service.py
│   └── requirements.txt
└── frontend/                  # Next.js (yakında)
```

---

## Dataset Yapısı

| Dosya | Açıklama |
|---|---|
| `model_training_features_2019_2025.csv` | Tam özellik seti (2019-2025) |
| `model_train_2019_2023.csv` | Eğitim verisi |
| `model_valid_2024.csv` | Doğrulama verisi |
| `model_test_2025.csv` | Test verisi |
| `model_prediction_input_2026.csv` | 2026 tahmin girdisi |
| `topic_yearly_distribution_complete.csv` | Konu bazlı yıllık dağılım |

**Hedef kolon:** `target_total_question_count`

**Temel özellikler:**
- `lag_1 / lag_2 / lag_3` — gecikmeli soru sayıları
- `rolling_mean_2_prev / rolling_mean_3_prev` — hareketli ortalamalar
- `historical_mean_prev / historical_std_prev` — tarihsel istatistikler
- `nonzero_frequency_prev` — konunun kaç yılda soru çıkma oranı
- `trend_slope_prev` — lineer trend eğimi
- `historical_confidence_mean_prev` — tarihsel güven skoru

---

## Neden Yıl Bazlı Split?

YKS verisi **zamana bağımlıdır (time-series)**. Random split kullanmak veri sızıntısına (data leakage) neden olur çünkü 2024-2025 verisi 2019-2023'teki örüntüleri içerebilir. Bu nedenle:

- **Train:** 2019–2023 (1121 satır)
- **Validation:** 2024 (255 satır)
- **Test:** 2025 (248 satır)

---

## Modeller

### Baseline

`rolling_mean_3_prev` — son 3 yılın konu ortalaması. Basit ama güçlü bir referans noktası.

### Linear Regression

Doğrusal ilişkileri yakalar. Düşük varyans, yüksek bias riski. Interpretability yüksek.

### Random Forest Regressor

- Özellikler arası etkileşimleri doğrusal olmayan biçimde öğrenir
- Overfitting'e karşı dayanıklı (bagging)
- 300 ağaç, max_depth=8

### Gradient Boosting Regressor

- Artık hataları sıralı düzeltir
- Düşük learning rate (0.05) ile dikkatli öğrenim
- Genellikle ağırlıklı veri setlerinde daha iyi sonuç verir

---

## Metrikler

| Metrik | Açıklama |
|---|---|
| **MAE** | Ortalama Mutlak Hata — soru sayısı birimi |
| **RMSE** | Büyük hatalara daha duyarlı, aykırı değerlerin etkisini vurgular |
| **lower_bound / upper_bound** | `tahmin ± historical_std_prev` |

---

## 2026 Tahmin Çıktısı

`outputs/yks_2026_predictions.csv` kolonları:

| Kolon | Açıklama |
|---|---|
| `predicted_question_count` | Ham tahmin (float) |
| `predicted_question_count_rounded` | Yuvarlanmış tahmin (int) |
| `lower_bound / upper_bound` | Tahmini aralık |
| `importance_score` | 0-100 çalışma önceliği skoru |
| `importance_label` | Çok yüksek / Yüksek / Orta / Düşük |
| `trend_label` | Artış / Azalış / Stabil eğiliminde |
| `confidence_label` | Yüksek / Orta / Düşük güven |

---

## API Endpointleri

| Method | Endpoint | Açıklama |
|---|---|---|
| GET | `/api/health` | Servis sağlığı |
| GET | `/api/fields` | Desteklenen alanlar |
| GET | `/api/predictions?field=SAYISAL` | Alan bazlı tahminler (TYT+AYT) |
| GET | `/api/predictions/subject?field=SAYISAL&subject=Matematik` | Ders bazlı tahminler |
| GET | `/api/topic-detail?session=AYT&field=SAYISAL&subject=Fizik&topic=Manyetizma` | Konu detayı |
| POST | `/api/reload` | CSV'yi yeniden yükle |

---

## Kurulum ve Çalıştırma

### 1. Python ortamı

```bash
cd yks-topic-predictor
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install scikit-learn pandas numpy joblib
```

### 2. Model eğitimi

```bash
cd src
python train_model.py
```

### 3. 2026 tahmini üret

```bash
python predict_2026.py
```

### 4. Backend başlat

```bash
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000
```

API dokümantasyonu: `http://localhost:8000/docs`

### 5. Notebook analizi

```bash
pip install jupyter matplotlib
cd notebooks
jupyter notebook
```

---

## Alan Bazlı TYT / AYT Dersleri

| Alan | AYT Dersleri |
|---|---|
| SAYISAL | Matematik, Fizik, Kimya, Biyoloji |
| ESIT_AGIRLIK | Matematik, Türk Dili ve Edebiyatı, Tarih-1, Coğrafya-1 |
| SOZEL | Türk Dili ve Edebiyatı, Tarih-1, Coğrafya-1, Tarih-2, Coğrafya-2, Felsefe Grubu, Din Kültürü |

TYT tüm alanlar için ortaktır (`field=ALL`).

---

*Bu proje YKS hazırlığında veri odaklı karar almayı desteklemek amacıyla geliştirilmiştir. Tahminler istatistiksel örüntülere dayanır; sınav soruları ÖSYM tarafından belirlenir.*
