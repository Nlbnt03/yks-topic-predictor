# YKS Konu Tahmin Rehberi 📊

**2018–2025 yıllarına dayalı YKS konu bazlı tahmini soru dağılımı, çalışma öncelikleri ve trend analizi.**

🌐 **Canlı Site:** [yks-tahmincim.pages.dev](https://yks-tahmincim.pages.dev)

> ⚠️ Bu sistem **kesin soru tahmini yapmaz.** Geçmiş yıl örüntülerine dayalı istatistiksel bir rehberdir. ÖSYM ile ilişkili değildir.

---

## Ne Yapar?

Kardeşim YKS'ye hazırlanırken "hangi konudan kaç soru çıkar?" sorusundan doğdu.

- Her konu için **2026 tahmini soru sayısı** ve **aralığı** (alt–üst sınır)
- **Önem skoru (0–100):** Geçmişte ne sıklıkla çıktı, trend ne yönde?
- **Trend etiketi:** Artış / Azalış / Stabil
- **Güven seviyesi:** Verinin kalitesine göre Yüksek / Orta / Düşük
- **2018–2025 yıllık dağılım grafiği** her konu için

Kapsam: **TYT** (tüm alanlar) + **AYT** (Sayısal, Eşit Ağırlık, Sözel)

---

## Teknik Yığın

```
Veri Kaynağı  →  universitego.com (web scraping) + manuel doğrulama
ML Modeli     →  Gradient Boosting (scikit-learn)  |  test MAE: 0.376
Backend API   →  Cloudflare Workers (TypeScript) + D1 SQLite
Frontend      →  Next.js 15 + TailwindCSS + Recharts
Deploy        →  Cloudflare Pages + Workers (tamamen ücretsiz)
```

---

## Proje Yapısı

```
yks-topic-predictor/
├── src/                              # Python ML pipeline
│   ├── scrape_and_build_dataset.py   # Veri toplama (universitego.com)
│   ├── rebuild_from_raw.py           # Feature engineering + model eğitimi
│   ├── feature_utils.py              # Lag, rolling mean, trend
│   ├── train_model.py                # Model karşılaştırma (LR/RF/GB)
│   └── config.py                     # Sabitler ve dosya yolları
│
├── data/raw/
│   ├── yks_dataset.csv               # Ham veri (2813 soru, 2018–2025)
│   └── topic_yearly_distribution_complete.csv
│
├── outputs/
│   └── yks_2026_predictions.csv      # 530 konu için 2026 tahminleri
│
├── worker/                           # Cloudflare Workers API (TypeScript)
│   ├── src/index.ts                  # 6 REST endpoint, D1 sorguları
│   ├── migrations/0001_seed.sql      # 530 tahmin + 4240 yıllık veri
│   └── wrangler.toml
│
├── frontend/                         # Next.js 15 uygulaması
│   ├── app/                          # Sayfalar (App Router)
│   ├── components/                   # UI bileşenleri + Recharts grafikleri
│   └── lib/                          # API istemcisi, tipler, utils
│
└── backend/                          # FastAPI (local geliştirme için)
    ├── main.py
    └── services/prediction_service.py
```

---

## ML Pipeline

### 1. Veri Toplama

```bash
cd src && python scrape_and_build_dataset.py
```

`universitego.com`'dan TYT/AYT konu–soru dağılımlarını scrape eder:
- 22 tablo (TYT 10 ders + AYT 12 ders)
- 2018–2025 yılları, 355 benzersiz konu
- BeautifulSoup ile sağlam HTML parse

### 2. Feature Engineering

Her `(yıl, session, alan, ders, konu)` satırı için:

| Feature | Açıklama | Önem |
|---|---|---|
| `rolling_mean_3_prev` | Son 3 yıl ortalaması | **%29.3** |
| `historical_mean_prev` | Tüm geçmiş yılların ortalaması | **%21.4** |
| `lag_1` | Geçen yılın soru sayısı | **%16.5** |
| `rolling_mean_2_prev` | Son 2 yıl ortalaması | **%14.8** |
| `trend_slope_prev` | Doğrusal trend yönü | %1.7 |
| `nonzero_frequency_prev` | Kaç yılda soru çıkmış (0–1) | %1.1 |
| `historical_std_prev` | Tarihsel standart sapma | %1.4 |

### 3. Model Seçimi

Zaman serisi verisi olduğu için **sıkı kronolojik split** (random split kullanılmadı):

```
Train:      2019–2023  (2650 satır)
Validation: 2024       (530 satır)
Test:       2025       (530 satır)
```

| Model | Val MAE | Test MAE | Test RMSE |
|---|---|---|---|
| Baseline (rolling_mean_3) | 0.418 | 0.388 | 0.544 |
| Random Forest | 0.442 | 0.405 | 0.507 |
| **Gradient Boosting ✓** | **0.418** | **0.376** | **0.486** |

**Neden Gradient Boosting?** 300 ağaç sıralı çalışır; her ağaç bir öncekinin hatasını düzelterek giderek daha iyi tahmin üretir.

### 4. 2026 Tahmini

```python
predicted    = model.predict(X_2026)
lower_bound  = max(0, predicted - historical_std)
upper_bound  = predicted + historical_std

importance_score = (
    0.35 * nonzero_frequency   +
    0.30 * normalize(hist_mean)+
    0.20 * normalize(trend)    +
    0.15 * confidence
) * 100  # → [0, 100]
```

---

## API Endpoints

**Base URL:** `https://yks-tahmincim.yks-tahmincim.workers.dev`

| Endpoint | Açıklama |
|---|---|
| `GET /api/health` | Servis durumu |
| `GET /api/fields` | Geçerli alan listesi |
| `GET /api/predictions?field=SAYISAL` | TYT + AYT tahminleri |
| `GET /api/predictions/subject?field=SAYISAL&subject=Matematik` | Ders bazlı |
| `GET /api/topic-detail?session=AYT&field=SAYISAL&subject=Fizik&topic=Manyetizma` | Konu detayı |
| `GET /api/yearly-distribution?session=AYT&field=SAYISAL&subject=Fizik&topic=Manyetizma` | 2018–2025 geçmiş |

---

## Yerel Geliştirme

### Gereksinimler

- Python 3.11+
- Node.js 20+

### Kurulum

```bash
git clone https://github.com/ynalbant/yks-topic-predictor.git
cd yks-topic-predictor

# Python bağımlılıkları
pip install pandas scikit-learn numpy scipy beautifulsoup4 joblib fastapi uvicorn

# Veri topla + model eğit + tahmin üret (hepsi bir komutta)
cd src && python scrape_and_build_dataset.py

# Backend başlat
cd .. && uvicorn backend.main:app --port 8000

# Frontend (ayrı terminal)
cd frontend && npm install && npm run dev
# Tarayıcı: http://localhost:3000
```

---

## Deploy (Cloudflare — Ücretsiz)

### Worker API

```bash
cd worker
wrangler login
npm run db:create           # D1 veritabanı oluştur
# wrangler.toml içindeki database_id'yi gerçek değerle değiştir
npm run db:migrate:remote   # 530 tahmin + 4240 yıllık veriyi yükle
npm run deploy              # API'yi yayınla
```

### Frontend (Cloudflare Pages)

```bash
cd frontend
NEXT_PUBLIC_API_URL=https://yks-tahmincim.yks-tahmincim.workers.dev \
  npx @cloudflare/next-on-pages
wrangler pages deploy .vercel/output/static \
  --project-name yks-tahmincim-frontend
```

---

## Veri Güncelleme (Yeni Yıl Verisi Geldiğinde)

```bash
cd src

# 1. Siteyi yeniden scrape et (yeni yıl eklendi mi?)
python scrape_and_build_dataset.py

# 2. Modeli yeniden eğit + 2026 tahminlerini güncelle
python rebuild_from_raw.py

# 3. D1'i güncelle
cd ../worker
python scripts/csv_to_sql.py       # Yeni SQL migration oluştur
npm run db:migrate:remote           # Cloudflare'e yükle
```

---

## Sınırlılıklar

- **Kesin tahmin değil:** YKS soruları ÖSYM tarafından belirlenir
- **Veri kalitesi:** Konu etiketleri web scraping ile alındı, hata payı var
- **Küçük dataset:** 8 yıl verisi (2018–2025), istatistiksel güç sınırlı
- **Doğal değişkenlik:** Konuların yıldan yıla ~0.88 soru std sapması var (indirgenemez gürültü)

---

## Lisans

MIT — Serbestçe kullanabilir, değiştirebilir ve dağıtabilirsiniz.

---

*YKS'ye hazırlanan herkese başarılar! 🎓*
