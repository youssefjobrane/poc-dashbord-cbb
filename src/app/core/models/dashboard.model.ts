export type Granularity = 'day' | 'week' | 'month';

export interface DashboardFilters {
  /** 'YYYY-MM' */
  month: string;
  /** null = tous départements */
  deptId: number | null;
  granularity: Granularity;
}

export interface ApiResponse<T> {
  data: T;
  meta: { endpoint: string; latencyMs: number; generatedAt: string };
}

/** A measure for the selected period and the same days one month earlier (EDATE -1). */
export interface Compared {
  value: number | null;
  previous: number | null;
}

export interface MonthOption {
  key: string;
  label: string;
}

export interface Overview {
  dataAsOf: string;
  months: MonthOption[];
  defaultMonth: string;
  departments: { id: number; name: string; short: string }[];
  period: { start: string; end: string; previousStart: string; previousEnd: string };
}

export type KpiId =
  | 'activeUsers'
  | 'usageRate'
  | 'questions'
  | 'questionsPerUser'
  | 'cost'
  | 'costPerQuestion'
  | 'responseTime'
  | 'satisfaction';

export interface Kpis {
  headcount: number;
  values: Record<KpiId, Compared>;
}

export interface ActivityPoint {
  /** ISO start date of the day / week / month bucket */
  date: string;
  value: number;
  /** bucket still open at the data date (drawn dashed) */
  partial: boolean;
}

export interface Activity {
  metric: KpiId;
  granularity: Granularity;
  scopeLabel: string;
  points: ActivityPoint[];
}

export interface DepartmentRow {
  id: number;
  name: string;
  short: string;
  headcount: number;
  activeUsers: number;
  usageRate: number;
  questions: number;
  questionsPerUser: number | null;
  cost: number;
  costShare: number;
  satisfaction: number | null;
}

export interface Departments {
  rows: DepartmentRow[];
  total: Omit<DepartmentRow, 'id' | 'name' | 'short'>;
  adoptionThreshold: number;
  satisfactionThreshold: number;
}

export interface Budget {
  costToDate: number;
  projection: number;
  costPerQuestion: number | null;
  costPerUser: number | null;
  monthlyBudget: number;
  consumedRatio: number;
  projectedRatio: number;
  scopeLabel: string;
  /** one point per day of the month; cumulative until the data date, projected from it to month end */
  series: { date: string; cumulative: number | null; projected: number | null }[];
}

export type AlertStatus = 'ALERTE' | 'À SUIVRE' | 'OK';

export interface DashboardAlert {
  id: number;
  category: string;
  status: AlertStatus;
  severity: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  date: string;
}

export interface Alerts {
  active: number;
  items: DashboardAlert[];
}

export interface ServiceQuality {
  errorRate: Compared;
  responseTime: Compared;
  documentsUsed: number;
  documentsTotal: number;
  documentShare: number;
  conversations: Compared;
  scopeLabel: string;
}

export interface ThemeShare {
  id: number;
  name: string;
  short: string;
  color: string;
  share: number;
  /** evolution of the share vs M-1, in percentage points */
  evolutionPt: number | null;
}

export interface Themes {
  bars: ThemeShare[];
  heatmap: {
    columns: { id: number; short: string }[];
    rows: { deptId: number; short: string; values: number[] }[];
  };
}

export interface KeywordWeight {
  text: string;
  questions: number;
  theme: string;
  color: string;
}

export interface Keywords {
  scopeLabel: string;
  words: KeywordWeight[];
  legend: { theme: string; color: string }[];
}

export interface DocumentRank {
  rank: number;
  id: number;
  title: string;
  category: string;
  citations: number;
  evolution: number | null;
}

export interface Documents {
  top: DocumentRank[];
}

export interface DocumentDetail {
  id: number;
  title: string;
  category: string;
  citations: number;
  previous: number;
  byDepartment: { short: string; citations: number }[];
  byTheme: { name: string; color: string; citations: number }[];
}
