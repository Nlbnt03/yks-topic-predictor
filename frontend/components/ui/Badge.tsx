import { ImportanceLabel, TrendLabel, ConfidenceLabel } from '@/lib/types';
import { IMPORTANCE_STYLE, TREND_STYLE, CONFIDENCE_STYLE } from '@/lib/utils';

export function ImportanceBadge({ label }: { label: ImportanceLabel }) {
  const s = IMPORTANCE_STYLE[label];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {label}
    </span>
  );
}

export function TrendBadge({ label }: { label: TrendLabel }) {
  const s = TREND_STYLE[label];
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${s.color}`}>
      <span className="text-sm font-bold">{s.icon}</span>
      {label}
    </span>
  );
}

export function ConfidenceBadge({ label }: { label: ConfidenceLabel }) {
  const s = CONFIDENCE_STYLE[label];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${s.bg} ${s.text}`}>
      Güven: {label}
    </span>
  );
}

export function FrequencyBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full rounded-full bg-blue-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
    </div>
  );
}
