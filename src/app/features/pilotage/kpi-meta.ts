import { KpiId } from '../../core/models/dashboard.model';
import { FormatKind } from '../../shared/format';

export interface KpiMeta {
  id: KpiId;
  title: string;
  format: FormatKind;
  /** relative change (%) or absolute change in points */
  deltaUnit: 'pct' | 'pt';
  /** an increase is bad (cost, response time) -> red */
  upIsBad: boolean;
  /** label used in the evolution chart title */
  chartLabel: string;
}

/** Same order, formats and color rules as the Power BI KPI strip. */
export const KPI_META: KpiMeta[] = [
  { id: 'activeUsers', title: 'Utilisateurs actifs', format: 'int', deltaUnit: 'pct', upIsBad: false, chartLabel: 'Utilisateurs actifs' },
  { id: 'usageRate', title: "Taux d'utilisation", format: 'pct1', deltaUnit: 'pt', upIsBad: false, chartLabel: "Taux d'utilisation" },
  { id: 'questions', title: 'Questions posées', format: 'int', deltaUnit: 'pct', upIsBad: false, chartLabel: 'Questions posées' },
  { id: 'questionsPerUser', title: 'Questions par utilisateur', format: 'dec1', deltaUnit: 'pct', upIsBad: false, chartLabel: 'Questions par utilisateur' },
  { id: 'cost', title: 'Coût (TND)', format: 'int', deltaUnit: 'pct', upIsBad: true, chartLabel: 'Coût (TND)' },
  { id: 'costPerQuestion', title: 'Coût par question (TND)', format: 'dec3', deltaUnit: 'pct', upIsBad: true, chartLabel: 'Coût par question (TND)' },
  { id: 'responseTime', title: 'Temps de réponse moyen', format: 'sec', deltaUnit: 'pct', upIsBad: true, chartLabel: 'Temps de réponse moyen' },
  { id: 'satisfaction', title: 'Satisfaction (% 👍)', format: 'pct0', deltaUnit: 'pt', upIsBad: false, chartLabel: 'Satisfaction' },
];

export const kpiMeta = (id: KpiId): KpiMeta => KPI_META.find((k) => k.id === id)!;
