export const runtime = 'edge';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSubjectTopics } from '@/lib/api';
import { getApiField, getSubjectIcon, FIELD_META, IMPORTANCE_STYLE } from '@/lib/utils';
import { TopicRow } from '@/components/TopicRow';
import { ImportanceBarChart } from '@/components/charts/ImportanceBarChart';
import { Disclaimer } from '@/components/ui/Disclaimer';
import type { Field } from '@/lib/types';

type Params = { field: string; session: string; subject: string };

export default async function SubjectPage({ params }: { params: Promise<Params> }) {
  const { field: fieldParam, session: sessionParam, subject: subjectParam } = await params;
  const field = fieldParam as Field;
  const session = decodeURIComponent(sessionParam);
  const subject = decodeURIComponent(subjectParam);

  if (!['SAYISAL', 'ESIT_AGIRLIK', 'SOZEL'].includes(field)) notFound();

  const apiField = getApiField(field, session);
  const meta = FIELD_META[field];
  const icon = getSubjectIcon(subject);

  let topics;
  try {
    topics = await getSubjectTopics(field, session, subject);
  } catch {
    return (
      <div className="text-center py-20">
        <p className="text-3xl mb-3">⚠️</p>
        <p className="text-gray-600">Veri yüklenemedi. Backend çalışıyor mu?</p>
        <Link href={`/dashboard/${field}`} className="mt-4 inline-block text-blue-600 text-sm hover:underline">← Geri dön</Link>
      </div>
    );
  }

  if (topics.length === 0) notFound();

  const sorted = [...topics].sort((a, b) => b.importance_score - a.importance_score);
  const totalQ = topics.reduce((s, t) => s + t.predicted_question_count_rounded, 0);

  const labelCounts = topics.reduce((acc, t) => {
    acc[t.importance_label] = (acc[t.importance_label] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-8">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
        <Link href="/" className="hover:text-gray-600">Ana Sayfa</Link>
        <span>/</span>
        <Link href={`/dashboard/${field}`} className={`hover:underline ${meta.color}`}>{meta.name}</Link>
        <span>/</span>
        <span className="font-medium text-gray-700">
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded mr-1.5 text-white ${session === 'TYT' ? 'bg-slate-600' : ''}`}
            style={session === 'AYT' ? { backgroundColor: field === 'SAYISAL' ? '#1d4ed8' : field === 'ESIT_AGIRLIK' ? '#7e22ce' : '#065f46' } : {}}>
            {session}
          </span>
          {subject}
        </span>
      </nav>

      {/* Header */}
      <div className="flex items-start gap-4">
        <span className="text-5xl">{icon}</span>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded text-white"
              style={{ backgroundColor: session === 'TYT' ? '#475569' : field === 'SAYISAL' ? '#1d4ed8' : field === 'ESIT_AGIRLIK' ? '#7e22ce' : '#065f46' }}>
              {session}
            </span>
            <span className="text-xs text-gray-400">{meta.name}</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">{subject}</h1>
          <p className="text-gray-500 text-sm mt-1">
            <strong>{topics.length}</strong> konu ·{' '}
            Tahmini toplam: <strong>~{totalQ} soru</strong>
          </p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="flex flex-wrap gap-3">
        {(['Çok yüksek', 'Yüksek', 'Orta', 'Düşük'] as const).map(label => {
          const n = labelCounts[label] ?? 0;
          if (n === 0) return null;
          const s = IMPORTANCE_STYLE[label];
          return (
            <div key={label} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${s.bg}`}>
              <span className={`w-2 h-2 rounded-full ${s.dot}`} />
              <span className={`text-sm font-semibold ${s.text}`}>{label}:</span>
              <span className={`text-sm font-bold ${s.text}`}>{n} konu</span>
            </div>
          );
        })}
      </div>

      <Disclaimer compact />

      {/* Bar chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-bold text-gray-900 mb-1">Konu Önem Skoru Dağılımı</h2>
        <p className="text-xs text-gray-400 mb-5">Yüksek skor = geçmişte daha sık çıkmış, daha yüksek tahmini soru</p>
        <ImportanceBarChart topics={topics} />
      </div>

      {/* Topic list */}
      <div>
        <h2 className="text-base font-bold text-gray-900 mb-4">
          Tüm Konular — Önem Sırasına Göre
        </h2>
        <div className="space-y-2">
          {sorted.map((t, i) => (
            <TopicRow
              key={`${t.topic}-${i}`}
              topic={t}
              rank={i + 1}
              href={`/dashboard/${field}/${session}/${encodeURIComponent(subject)}/${encodeURIComponent(t.topic)}`}
            />
          ))}
        </div>
      </div>

    </div>
  );
}
