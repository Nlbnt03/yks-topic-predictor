import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTopicDetail, getYearlyDistribution } from '@/lib/api';
import { getApiField, getSubjectIcon, FIELD_META, IMPORTANCE_STYLE, TREND_STYLE, CONFIDENCE_STYLE } from '@/lib/utils';
import { ImportanceBadge, TrendBadge, ConfidenceBadge, FrequencyBar } from '@/components/ui/Badge';
import { YearlyTrendChart } from '@/components/charts/YearlyTrendChart';
import type { Field } from '@/lib/types';

type Params = { field: string; session: string; subject: string; topic: string };

function DetailRow({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <div className="text-right">
        <span className="text-sm font-semibold text-gray-900">{value}</span>
        {sub && <div className="text-xs text-gray-400">{sub}</div>}
      </div>
    </div>
  );
}

export default async function TopicDetailPage({ params }: { params: Params }) {
  const field = params.field as Field;
  const session = decodeURIComponent(params.session);
  const subject = decodeURIComponent(params.subject);
  const topic = decodeURIComponent(params.topic);

  if (!['SAYISAL', 'ESIT_AGIRLIK', 'SOZEL'].includes(field)) notFound();

  const apiField = getApiField(field, session);
  const meta = FIELD_META[field];
  const icon = getSubjectIcon(subject);

  let detail, yearly;
  try {
    [detail, yearly] = await Promise.all([
      getTopicDetail(session, apiField, subject, topic),
      getYearlyDistribution(session, apiField, subject, topic),
    ]);
  } catch {
    return (
      <div className="text-center py-20">
        <p className="text-3xl mb-3">⚠️</p>
        <p className="text-gray-600">Konu verisi yüklenemedi.</p>
        <Link href={`/dashboard/${field}/${session}/${encodeURIComponent(subject)}`} className="mt-4 inline-block text-blue-600 text-sm hover:underline">← Geri dön</Link>
      </div>
    );
  }

  const importanceStyle = IMPORTANCE_STYLE[detail.importance_label];
  const predRange = detail.upper_bound - detail.lower_bound;
  const rangeMax = Math.max(detail.upper_bound * 1.2, 5);

  return (
    <div className="space-y-8 max-w-3xl">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
        <Link href="/" className="hover:text-gray-600">Ana Sayfa</Link>
        <span>/</span>
        <Link href={`/dashboard/${field}`} className={`hover:underline ${meta.color}`}>{meta.name}</Link>
        <span>/</span>
        <Link href={`/dashboard/${field}/${session}/${encodeURIComponent(subject)}`} className="hover:text-gray-600">{subject}</Link>
        <span>/</span>
        <span className="font-medium text-gray-700 truncate max-w-[180px]">{topic}</span>
      </nav>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-xs font-bold px-2 py-0.5 rounded text-white"
            style={{ backgroundColor: session === 'TYT' ? '#475569' : field === 'SAYISAL' ? '#1d4ed8' : field === 'ESIT_AGIRLIK' ? '#7e22ce' : '#065f46' }}>
            {session}
          </span>
          <span className="text-sm text-gray-400">{meta.name}</span>
          <span className="text-gray-300">·</span>
          <span className="text-sm text-gray-500">{icon} {subject}</span>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">{topic}</h1>
      </div>

      {/* Prediction Hero */}
      <div className={`rounded-2xl border-2 ${importanceStyle.bg.replace('100','200')} p-6`} style={{ borderColor: importanceStyle.hex }}>
        <p className="text-sm font-semibold text-gray-500 mb-1">2026 Tahmini Soru Sayısı</p>
        <div className="flex items-end gap-4 mb-4">
          <div className="flex items-baseline gap-1">
            <span className="text-6xl font-extrabold text-gray-900">{detail.predicted_question_count_rounded}</span>
            <span className="text-lg text-gray-400 mb-1">soru</span>
          </div>
          <div className="mb-1.5">
            <p className="text-xs text-gray-400 mb-0.5">Tahmini aralık</p>
            <p className="text-xl font-bold text-gray-700">
              {detail.lower_bound} – {detail.upper_bound}
            </p>
          </div>
        </div>

        {/* Range bar */}
        <div className="relative h-5 bg-white/60 rounded-full overflow-hidden border border-white">
          <div
            className="absolute top-0 h-full rounded-full opacity-70"
            style={{
              left: `${(detail.lower_bound / rangeMax) * 100}%`,
              width: `${(predRange / rangeMax) * 100}%`,
              backgroundColor: importanceStyle.hex,
            }}
          />
          <div
            className="absolute top-0 h-full w-1 rounded-full bg-gray-800"
            style={{ left: `${(detail.predicted_question_count / rangeMax) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1 px-0.5">
          <span>0</span>
          <span>{Math.round(rangeMax)}</span>
        </div>

        <div className="flex flex-wrap gap-3 mt-5">
          <ImportanceBadge label={detail.importance_label} />
          <TrendBadge label={detail.trend_label} />
          <ConfidenceBadge label={detail.confidence_label} />
        </div>
      </div>

      {/* Historical chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-bold text-gray-900 mb-1">Yıllara Göre Dağılım (2018–2026)</h2>
        <p className="text-xs text-gray-400 mb-5">
          Gri sütunlar soru çıkmayan yılları, mavi sütunlar gerçek verileri, koyu mavi 2026 tahminini gösterir.
        </p>
        {yearly.data.length > 0 ? (
          <YearlyTrendChart
            data={yearly.data}
            prediction={detail.predicted_question_count}
            lowerBound={detail.lower_bound}
            upperBound={detail.upper_bound}
          />
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">Yıllık veri bulunamadı.</p>
        )}
      </div>

      {/* Detail grid */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-bold text-gray-900 mb-4">Detaylı Bilgi</h2>
        <DetailRow
          label="Geçmişte çıkma sıklığı"
          value={<FrequencyBar value={detail.nonzero_frequency_prev} />}
          sub={`${Math.round(detail.nonzero_frequency_prev * 8)}/8 yılda soru çıkmış`}
        />
        <DetailRow
          label="Tarihsel ortalama"
          value={`${detail.historical_mean_prev.toFixed(2)} soru/yıl`}
        />
        <DetailRow
          label="Tarihsel standart sapma"
          value={`± ${detail.historical_std_prev.toFixed(2)} soru`}
          sub="Tahmin belirsizliği"
        />
        <DetailRow
          label="Ham tahmin (ML modeli)"
          value={`${detail.predicted_question_count.toFixed(3)} soru`}
        />
        <DetailRow
          label="Yuvarlanmış tahmin"
          value={`${detail.predicted_question_count_rounded} soru`}
        />
        <DetailRow
          label="Önem skoru"
          value={
            <span style={{ color: importanceStyle.hex }} className="font-bold">
              {detail.importance_score.toFixed(1)} / 100
            </span>
          }
        />
      </div>

      {/* What to know */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
        <h3 className="font-bold text-blue-900 mb-3">💡 Bu Konu Hakkında</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="mt-0.5">{TREND_STYLE[detail.trend_label].icon}</span>
            <span>
              <strong>{detail.trend_label}</strong> —{' '}
              {detail.trend_label === 'Artış eğiliminde'
                ? 'Bu konudan son yıllarda soru sayısı artış gösteriyor. Öncelikli olarak çalışmak faydalı olabilir.'
                : detail.trend_label === 'Azalış eğiliminde'
                  ? 'Bu konudan soru sayısı azalış eğiliminde. Temel konuları kavramak yeterli olabilir.'
                  : 'Bu konudan soru sayısı istikrarlı seyrediyor.'}
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5">📊</span>
            <span>
              <strong>Güven: {detail.confidence_label}</strong> —{' '}
              {detail.confidence_label === 'Yüksek'
                ? 'Soruların büyük çoğunluğu sınıflandırılabilmiş, veri kalitesi yüksek.'
                : detail.confidence_label === 'Orta'
                  ? 'Kısmi veri mevcut, tahmin makul güvenilirlikte.'
                  : 'Sınırlı veri nedeniyle tahmin daha belirsiz.'}
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5">⚠️</span>
            <span className="text-blue-700">
              Bu bilgi ÖSYM'nin 2026 kararlarını yansıtmaz. Yalnızca istatistiksel bir rehberdir.
            </span>
          </li>
        </ul>
      </div>

      {/* Back */}
      <Link
        href={`/dashboard/${field}/${session}/${encodeURIComponent(subject)}`}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        ← {subject} konularına geri dön
      </Link>

    </div>
  );
}
