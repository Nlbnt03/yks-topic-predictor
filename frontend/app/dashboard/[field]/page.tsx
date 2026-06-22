export const runtime = 'edge';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPredictions } from '@/lib/api';
import { FIELD_META, groupBySubject } from '@/lib/utils';
import { SubjectCard } from '@/components/SubjectCard';
import { Disclaimer } from '@/components/ui/Disclaimer';
import type { Field, TopicPrediction } from '@/lib/types';

const VALID_FIELDS: Field[] = ['SAYISAL', 'ESIT_AGIRLIK', 'SOZEL'];

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 text-center">
      <div className="text-2xl font-extrabold text-gray-900">{value}</div>
      <div className="text-xs font-medium text-gray-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
    </div>
  );
}

export default async function DashboardPage({ params }: { params: Promise<{ field: string }> }) {
  const { field: fieldParam } = await params;
  const field = fieldParam as Field;
  if (!VALID_FIELDS.includes(field)) notFound();

  const meta = FIELD_META[field];
  let data;
  let fetchError: string | null = null;
  try {
    data = await getPredictions(field);
  } catch (e) {
    fetchError = e instanceof Error ? e.message : String(e);
  }

  if (fetchError || !data) {
    return (
      <div className="text-center py-20">
        <p className="text-4xl mb-4">⚠️</p>
        <p className="text-lg font-semibold text-gray-700">API'ye bağlanılamadı</p>
        <p className="text-gray-500 text-sm mt-1">Veri yüklenirken bir hata oluştu.</p>
        {fetchError && (
          <code className="block mt-2 text-xs bg-red-50 text-red-700 px-3 py-2 rounded max-w-lg mx-auto break-all">
            {fetchError}
          </code>
        )}
        <Link href="/" className="mt-6 inline-block text-sm text-blue-600 hover:underline">← Ana sayfaya dön</Link>
      </div>
    );
  }

  const tytBySubject = groupBySubject(data.tyt);
  const aytBySubject = groupBySubject(data.ayt);

  const allTopics: TopicPrediction[] = [...data.tyt, ...data.ayt];
  const highCount = allTopics.filter(t => t.importance_label === 'Çok yüksek' || t.importance_label === 'Yüksek').length;
  const risingCount = allTopics.filter(t => t.trend_label === 'Artış eğiliminde').length;
  const totalQ = allTopics.reduce((s, t) => s + t.predicted_question_count_rounded, 0);

  return (
    <div className="space-y-10">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/" className="hover:text-gray-600">Ana Sayfa</Link>
        <span>/</span>
        <span className={`font-semibold ${meta.color}`}>{meta.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 ${meta.bg} rounded-2xl flex items-center justify-center text-3xl border ${meta.border}`}>
          {meta.icon}
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            {meta.name} <span className="text-gray-300">/</span> 2026 Tahminleri
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Geçmiş yıl verilerine dayalı tahmini konu dağılımı
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Toplam Konu" value={allTopics.length} />
        <StatCard label="Yüksek Öncelikli" value={highCount} sub="Çok yüksek + Yüksek" />
        <StatCard label="Artış Eğiliminde" value={risingCount} sub="konu" />
        <StatCard label="Tahmini Toplam" value={`~${totalQ}`} sub="TYT + AYT soru" />
      </div>

      <Disclaimer compact />

      {/* TYT Section */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-slate-700 text-white px-3 py-1 rounded-lg text-sm font-bold">TYT</div>
          <h2 className="text-xl font-bold text-gray-900">Temel Yeterlilik Testi</h2>
          <span className="text-sm text-gray-400 ml-auto">Tüm alanlar için ortak · {data.tyt.length} konu</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(tytBySubject).map(([subject, topics]) => (
            <SubjectCard
              key={subject}
              field={field}
              session="TYT"
              subject={subject}
              topics={topics}
            />
          ))}
        </div>
      </section>

      {/* AYT Section */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className={`${meta.bg.replace('50','700').replace('bg-','').length > 0 ? '' : ''}text-white px-3 py-1 rounded-lg text-sm font-bold`}
            style={{ backgroundColor: field === 'SAYISAL' ? '#1d4ed8' : field === 'ESIT_AGIRLIK' ? '#7e22ce' : '#065f46', color: '#fff' }}>
            AYT
          </div>
          <h2 className="text-xl font-bold text-gray-900">Alan Yeterlilik Testi — {meta.name}</h2>
          <span className="text-sm text-gray-400 ml-auto">{data.ayt.length} konu</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(aytBySubject).map(([subject, topics]) => (
            <SubjectCard
              key={subject}
              field={field}
              session="AYT"
              subject={subject}
              topics={topics}
            />
          ))}
        </div>
      </section>

    </div>
  );
}
