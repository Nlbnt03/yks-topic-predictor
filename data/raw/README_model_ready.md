# YKS Model-Ready Dataset

Bu paket, `yks_dataset.csv` dosyasından model eğitimine daha uygun hale getirilmiş CSV dosyalarını içerir.

## Dosyalar

- `canonical_questions.csv`: Aynı gerçek soruları tekilleştirilmiş ana soru tablosu.
- `question_fields.csv`: Tekil soruların hangi alanlarda geçerli olduğunu gösteren ilişki tablosu.
- `clean_question_level.csv`: Uygulamada alan bazlı filtreleme için temizlenmiş soru-level tablo.
- `dedupe_conflicts.csv`: Aynı soru farklı alanlarda farklı konu/alt konu etiketi aldıysa manuel kontrol listesi.
- `topic_yearly_distribution.csv`: Yıl + oturum + alan + ders + konu bazında gerçek aggregate tablo.
- `topic_yearly_distribution_complete.csv`: Model için 2018-2025 arasındaki eksik yıl-konu kombinasyonları 0 ile tamamlanmış tablo.
- `model_training_features_2019_2025.csv`: Count prediction/regression için kullanılabilecek feature tablosu.
- `model_train_2019_2023.csv`: Eğitim split'i.
- `model_valid_2024.csv`: Validasyon split'i.
- `model_test_2025.csv`: Test split'i.
- `model_prediction_input_2026.csv`: 2026 tahmini üretmek için target boş bırakılmış feature tablosu.
- `quality_summary.csv`: Yıl/oturum/alan bazlı satır sayısı kontrolü.
- `quality_report.txt`: Temizlik işlemi ve kalite raporu.

## Eğitim için önerilen ana dosya

İlk deneme için `model_training_features_2019_2025.csv` dosyasını kullan.
Hedef değişken: `target_total_question_count`.

Kategorik kolonlar:

- `session`
- `field`
- `branch`
- `subject`
- `topic`

Sayısal feature kolonları:

- `lag_1`, `lag_2`, `lag_3`
- `rolling_mean_2_prev`, `rolling_mean_3_prev`
- `historical_mean_prev`, `historical_std_prev`
- `historical_min_prev`, `historical_max_prev`
- `nonzero_year_count_prev`, `nonzero_frequency_prev`
- `trend_slope_prev`
- `last_year_nonzero`
- `historical_confidence_mean_prev`
- zorluk oranı kolonları

## Önerilen split

- Train: 2019-2023
- Validation: 2024
- Test: 2025

## Not

Bu veri seti hâlâ `AI_ASSISTED_LABEL` kaynaklı olduğu için `dedupe_conflicts.csv` mutlaka manuel kontrol edilmelidir.
