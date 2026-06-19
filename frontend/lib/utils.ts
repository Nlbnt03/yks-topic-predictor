import { Field, ImportanceLabel, TrendLabel, ConfidenceLabel } from './types';

export const FIELD_META: Record<Field, {
  name: string;
  shortName: string;
  icon: string;
  color: string;
  bg: string;
  border: string;
  aytSubjects: string[];
}> = {
  SAYISAL: {
    name: 'Sayısal',
    shortName: 'SAY',
    icon: '🔢',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    aytSubjects: ['Matematik', 'Fizik', 'Kimya', 'Biyoloji'],
  },
  ESIT_AGIRLIK: {
    name: 'Eşit Ağırlık',
    shortName: 'EA',
    icon: '⚖️',
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    aytSubjects: ['Matematik', 'Türk Dili ve Edebiyatı', 'Tarih-1', 'Coğrafya-1'],
  },
  SOZEL: {
    name: 'Sözel',
    shortName: 'SÖZ',
    icon: '📚',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    aytSubjects: ['Türk Dili ve Edebiyatı', 'Tarih-1', 'Coğrafya-1', 'Tarih-2', 'Coğrafya-2', 'Felsefe Grubu', 'Din Kültürü ve Ahlak Bilgisi'],
  },
};

export const IMPORTANCE_STYLE: Record<ImportanceLabel, { bg: string; text: string; dot: string; hex: string }> = {
  'Çok yüksek': { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500', hex: '#22c55e' },
  'Yüksek':     { bg: 'bg-blue-100',  text: 'text-blue-800',  dot: 'bg-blue-500',  hex: '#3b82f6' },
  'Orta':        { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500', hex: '#f59e0b' },
  'Düşük':       { bg: 'bg-gray-100',  text: 'text-gray-600',  dot: 'bg-gray-400',  hex: '#9ca3af' },
};

export const TREND_STYLE: Record<TrendLabel, { icon: string; color: string }> = {
  'Artış eğiliminde':   { icon: '↑', color: 'text-green-600' },
  'Azalış eğiliminde':  { icon: '↓', color: 'text-red-500'   },
  'Stabil':             { icon: '→', color: 'text-gray-500'   },
};

export const CONFIDENCE_STYLE: Record<ConfidenceLabel, { bg: string; text: string }> = {
  'Yüksek': { bg: 'bg-green-50', text: 'text-green-700' },
  'Orta':   { bg: 'bg-amber-50', text: 'text-amber-700' },
  'Düşük':  { bg: 'bg-red-50',   text: 'text-red-700'   },
};

export const SUBJECT_ICONS: Record<string, string> = {
  'Matematik': '📐',
  'Türkçe': '📝',
  'Fizik': '⚡',
  'Kimya': '🧪',
  'Biyoloji': '🧬',
  'Tarih': '🏛️',
  'Coğrafya': '🌍',
  'Felsefe': '💭',
  'Din Kültürü ve Ahlak Bilgisi': '📖',
  'Türk Dili ve Edebiyatı': '✍️',
  'Tarih-1': '🏛️',
  'Tarih-2': '🏺',
  'Coğrafya-1': '🌍',
  'Coğrafya-2': '🗺️',
  'Felsefe Grubu': '💭',
};

export function getSubjectIcon(subject: string): string {
  return SUBJECT_ICONS[subject] ?? '📚';
}

export function getApiField(field: string, session: string): string {
  return session === 'TYT' ? 'ALL' : field;
}

export function buildUrl(...segments: string[]): string {
  return segments.map(s => encodeURIComponent(s)).join('/');
}

export function groupBySubject(topics: import('./types').TopicPrediction[]) {
  const map: Record<string, import('./types').TopicPrediction[]> = {};
  for (const t of topics) {
    if (!map[t.subject]) map[t.subject] = [];
    map[t.subject].push(t);
  }
  return map;
}
