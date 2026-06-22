export type Field = 'SAYISAL' | 'ESIT_AGIRLIK' | 'SOZEL';
export type Session = 'TYT' | 'AYT';
export type ImportanceLabel = 'Çok yüksek' | 'Yüksek' | 'Orta' | 'Düşük';
export type TrendLabel = 'Artış eğiliminde' | 'Azalış eğiliminde' | 'Stabil';
export type ConfidenceLabel = 'Yüksek' | 'Orta' | 'Düşük';

export interface TopicPrediction {
  session: Session;
  field: string;
  subject: string;
  topic: string;
  predicted_question_count: number;
  predicted_question_count_rounded: number;
  lower_bound: number;
  upper_bound: number;
  importance_score: number;
  importance_label: ImportanceLabel;
  trend_label: TrendLabel;
  confidence_label: ConfidenceLabel;
  nonzero_frequency_prev: number;
  historical_mean_prev: number;
  historical_std_prev: number;
}

export interface FieldPredictions {
  field: string;
  tyt: TopicPrediction[];
  ayt: TopicPrediction[];
}

export interface YearlyDataPoint {
  year: number;
  count: number;
  is_zero_filled: boolean;
}

export interface YearlyDistribution {
  session: string;
  field: string;
  subject: string;
  topic: string;
  data: YearlyDataPoint[];
}
