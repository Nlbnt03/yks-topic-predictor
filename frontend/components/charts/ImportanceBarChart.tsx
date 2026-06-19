'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Cell, ResponsiveContainer,
} from 'recharts';
import { TopicPrediction, ImportanceLabel } from '@/lib/types';
import { IMPORTANCE_STYLE } from '@/lib/utils';

interface Props {
  topics: TopicPrediction[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as TopicPrediction;
  return (
    <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-3 text-sm max-w-xs">
      <p className="font-semibold text-gray-900 mb-1">{d.topic}</p>
      <p className="text-gray-600">Önem skoru: <span className="font-bold">{d.importance_score.toFixed(1)}</span></p>
      <p className="text-gray-600">Tahmini soru: <span className="font-bold">~{d.predicted_question_count_rounded}</span></p>
      <p className="text-gray-600">Aralık: <span className="font-bold">{d.lower_bound}–{d.upper_bound}</span></p>
    </div>
  );
};

export function ImportanceBarChart({ topics }: Props) {
  const sorted = [...topics].sort((a, b) => b.importance_score - a.importance_score);

  return (
    <div className="w-full" style={{ height: Math.max(280, sorted.length * 36) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={sorted}
          margin={{ top: 4, right: 60, left: 8, bottom: 4 }}
          barSize={18}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="topic"
            width={160}
            tick={{ fontSize: 12, fill: '#374151' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
          <Bar dataKey="importance_score" radius={[0, 4, 4, 0]}>
            {sorted.map((t, i) => (
              <Cell
                key={`cell-${i}`}
                fill={IMPORTANCE_STYLE[t.importance_label as ImportanceLabel]?.hex ?? '#9ca3af'}
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
