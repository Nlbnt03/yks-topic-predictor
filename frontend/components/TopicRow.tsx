import Link from 'next/link';
import { TopicPrediction } from '@/lib/types';
import { ImportanceBadge, TrendBadge, ConfidenceBadge } from '@/components/ui/Badge';
import { IMPORTANCE_STYLE } from '@/lib/utils';

interface Props {
  topic: TopicPrediction;
  href: string;
  rank?: number;
}

export function TopicRow({ topic: t, href, rank }: Props) {
  const maxScore = 100;
  const barWidth = `${(t.importance_score / maxScore) * 100}%`;

  return (
    <Link href={href} className="group block">
      <div className="bg-white rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all duration-150 px-4 py-3.5">
        <div className="flex items-start gap-3">
          {rank !== undefined && (
            <span className="text-sm font-bold text-gray-300 w-5 text-right shrink-0 mt-0.5">{rank}</span>
          )}

          {/* Left: topic info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="font-semibold text-gray-900 text-sm leading-tight">{t.topic}</h4>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-lg font-bold text-gray-900">{t.predicted_question_count_rounded}</span>
                <span className="text-xs text-gray-400">soru</span>
              </div>
            </div>

            {/* Importance bar */}
            <div className="flex items-center gap-2 mb-2.5">
              <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: barWidth, backgroundColor: IMPORTANCE_STYLE[t.importance_label].hex }}
                />
              </div>
              <span className="text-xs text-gray-400 w-7 text-right">{t.importance_score.toFixed(0)}</span>
            </div>

            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-2">
              <ImportanceBadge label={t.importance_label} />
              <TrendBadge label={t.trend_label} />
              <ConfidenceBadge label={t.confidence_label} />
              <span className="text-xs text-gray-400 ml-auto">
                Aralık: {t.lower_bound}–{t.upper_bound}
              </span>
            </div>
          </div>

          <span className="text-gray-300 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-1">›</span>
        </div>
      </div>
    </Link>
  );
}
