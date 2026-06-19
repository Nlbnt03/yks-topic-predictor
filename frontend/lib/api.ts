import { FieldPredictions, TopicPrediction, YearlyDistribution } from './types';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { cache: 'no-store' });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(detail || `HTTP ${res.status}`);
  }
  return res.json() as T;
}

export function getPredictions(field: string): Promise<FieldPredictions> {
  return apiFetch(`/api/predictions?field=${field}`);
}

export async function getSubjectTopics(
  field: string,
  session: string,
  subject: string,
): Promise<TopicPrediction[]> {
  const all = await apiFetch<{ topics: TopicPrediction[] }>(
    `/api/predictions/subject?field=${field}&subject=${encodeURIComponent(subject)}`,
  );
  return all.topics.filter(t => t.session === session);
}

export function getTopicDetail(
  session: string,
  field: string,
  subject: string,
  topic: string,
): Promise<TopicPrediction> {
  return apiFetch(
    `/api/topic-detail?session=${session}&field=${field}&subject=${encodeURIComponent(subject)}&topic=${encodeURIComponent(topic)}`,
  );
}

export function getYearlyDistribution(
  session: string,
  field: string,
  subject: string,
  topic: string,
): Promise<YearlyDistribution> {
  return apiFetch(
    `/api/yearly-distribution?session=${session}&field=${field}&subject=${encodeURIComponent(subject)}&topic=${encodeURIComponent(topic)}`,
  );
}
