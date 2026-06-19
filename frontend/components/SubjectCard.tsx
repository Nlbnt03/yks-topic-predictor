import Link from 'next/link';
import { TopicPrediction } from '@/lib/types';
import { getSubjectIcon, IMPORTANCE_STYLE, FIELD_META } from '@/lib/utils';
import type { Field } from '@/lib/types';

interface Props {
  field: string;
  session: string;
  subject: string;
  topics: TopicPrediction[];
}

export function SubjectCard({ field, session, subject, topics }: Props) {
  const icon = getSubjectIcon(subject);
  const totalQ = topics.reduce((s, t) => s + t.predicted_question_count_rounded, 0);

  const counts = {
    'Çok yüksek': 0,
    'Yüksek': 0,
    'Orta': 0,
    'Düşük': 0,
  } as Record<string, number>;
  for (const t of topics) counts[t.importance_label] = (counts[t.importance_label] ?? 0) + 1;

  const topTopics = [...topics]
    .sort((a, b) => b.importance_score - a.importance_score)
    .slice(0, 3);

  const href = `/dashboard/${field}/${session}/${encodeURIComponent(subject)}`;

  const fieldMeta = FIELD_META[field as Field];

  return (
    <Link href={href} className="group block">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200 overflow-hidden h-full flex flex-col">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 flex items-start gap-3">
          <span className="text-3xl">{icon}</span>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-gray-900 text-base leading-tight">{subject}</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              <span className="font-semibold text-gray-700">~{totalQ}</span> soru tahmini
              {' · '}
              <span className="text-gray-400">{topics.length} konu</span>
            </p>
          </div>
        </div>

        {/* Importance distribution bar */}
        <div className="px-5 pb-3">
          <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
            {(['Çok yüksek', 'Yüksek', 'Orta', 'Düşük'] as const).map(label => {
              const pct = topics.length ? (counts[label] / topics.length) * 100 : 0;
              if (pct === 0) return null;
              return (
                <div
                  key={label}
                  title={`${label}: ${counts[label]} konu`}
                  className="h-full rounded-sm"
                  style={{ width: `${pct}%`, backgroundColor: IMPORTANCE_STYLE[label].hex }}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
            {(['Çok yüksek', 'Yüksek', 'Orta', 'Düşük'] as const).map(label =>
              counts[label] > 0 ? (
                <span key={label} className="text-xs text-gray-500 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: IMPORTANCE_STYLE[label].hex }} />
                  {label}: {counts[label]}
                </span>
              ) : null,
            )}
          </div>
        </div>

        {/* Top topics */}
        <div className="px-5 pb-4 flex-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Öne çıkan konular</p>
          <div className="space-y-1.5">
            {topTopics.map(t => (
              <div key={t.topic} className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: IMPORTANCE_STYLE[t.importance_label].hex }}
                />
                <span className="text-sm text-gray-700 truncate">{t.topic}</span>
                <span className="text-xs text-gray-400 ml-auto shrink-0">~{t.predicted_question_count_rounded}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className={`px-5 py-3 border-t border-gray-100 flex items-center justify-between ${fieldMeta?.bg ?? 'bg-gray-50'}`}>
          <span className="text-sm font-medium text-gray-600">Tüm konuları gör</span>
          <span className={`text-lg group-hover:translate-x-1 transition-transform ${fieldMeta?.color ?? 'text-blue-600'}`}>→</span>
        </div>
      </div>
    </Link>
  );
}
