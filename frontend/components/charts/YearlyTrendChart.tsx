'use client';

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Legend, Cell,
} from 'recharts';
import { YearlyDataPoint } from '@/lib/types';

interface Props {
  data: YearlyDataPoint[];
  prediction: number;
  lowerBound: number;
  upperBound: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as YearlyDataPoint & { prediction?: number };
  if (d.prediction !== undefined) {
    return (
      <div className="bg-white border border-blue-200 shadow-lg rounded-lg p-3 text-sm">
        <p className="font-bold text-blue-700">{label} — TAHMİN</p>
        <p className="text-gray-600">Tahmini soru: <span className="font-bold">{d.prediction}</span></p>
      </div>
    );
  }
  return (
    <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-3 text-sm">
      <p className="font-semibold text-gray-700">{label}</p>
      <p className="text-gray-600">Soru sayısı: <span className="font-bold">{d.count}</span></p>
      {!d.is_zero_filled
        ? null
        : <p className="text-xs text-gray-400 italic">Bu yıl veri yok (0 soru)</p>
      }
    </div>
  );
};

export function YearlyTrendChart({ data, prediction, lowerBound, upperBound }: Props) {
  const chartData = [
    ...data.map(d => ({ year: d.year, count: d.count, is_zero_filled: d.is_zero_filled })),
    { year: 2026, count: null, prediction: Math.round(prediction), is_zero_filled: false },
  ];

  return (
    <div className="w-full" style={{ height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
            width={24}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine x={2026} stroke="#93c5fd" strokeDasharray="4 3" label="" />

          {/* Historical bars */}
          <Bar dataKey="count" name="Geçmiş yıllar" radius={[3, 3, 0, 0]} maxBarSize={32}>
            {chartData.map((d, i) => (
              <Cell
                key={`h-${i}`}
                fill={d.year === 2026 ? 'transparent' : d.is_zero_filled ? '#e5e7eb' : '#60a5fa'}
              />
            ))}
          </Bar>

          {/* 2026 prediction bar */}
          <Bar dataKey="prediction" name="2026 Tahmini" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={32} />

          {/* Trend line (exclude 2026) */}
          <Line
            dataKey="count"
            type="monotone"
            stroke="#93c5fd"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center gap-4 justify-center mt-2 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-blue-400" />
          <span>Geçmiş yıllar</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-blue-600" />
          <span>2026 Tahmini</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-gray-200" />
          <span>Soru çıkmamış yıl</span>
        </div>
      </div>
    </div>
  );
}
