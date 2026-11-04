import { Dataset } from '../models/dataset.model';
import {
  Activity,
  Alerts,
  AlertStatus,
  Budget,
  Compared,
  DashboardAlert,
  DashboardFilters,
  DepartmentRow,
  Departments,
  DocumentDetail,
  Documents,
  Granularity,
  KpiId,
  Keywords,
  Kpis,
  Overview,
  ServiceQuality,
  Themes,
} from '../models/dashboard.model';
import { fmt } from '../../shared/format';

/**
 * In-memory port of the Power BI measures (POC.SemanticModel/_Mesures.tmdl).
 * Every endpoint aggregates the same fact rows, so both dashboards stay coherent by construction.
 */

const DAY_MS = 86_400_000;
const MONTH_NAMES = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

/** Colors used by the Deneb visuals of the Power BI report (they differ slightly from Dim_Theme[Couleur]). */
const THEME_COLORS: Record<string, string> = {
  'Crédits': '#7B4FBF',
  'Banque digitale': '#3D7EDB',
  'Virements & paiements': '#C8701E',
  'Tarifs & commissions': '#1E56A0',
  'Ouverture de compte & KYC': '#138A99',
  'Cartes bancaires': '#2E8B57',
  'Réclamations': '#C0392B',
  'Conformité & réglementation': '#8B5A00',
  'Épargne & placements': '#C4466D',
  'Procédures RH': '#6E9A1F',
  'Autre': '#7D8794',
};
const CLOUD_LEGEND = ['Banque digitale', 'Crédits', 'Tarifs & commissions', 'Réclamations', 'Virements & paiements', 'Ouverture de compte & KYC'];
/** Column / row order of the heatmap matrix (OrdreHeatmap / OrdreDept in the PBI model). */
const HEATMAP_THEMES = ['Tarifs', 'Cartes', 'Virements', 'Crédits', 'Ouverture / KYC', 'Épargne', 'Réclam.', 'Digital', 'RH', 'Conformité'];
const HEATMAP_DEPTS = ['Réseau', 'Back-office', 'Crédits', 'Conformité', 'Marketing', 'Finance', 'RH', 'DSI'];
const ACTIVITY_BUCKETS: Record<Granularity, number> = { day: 42, week: 12, month: 8 };

interface Period {
  start: number;
  end: number;
  previousStart: number;
  previousEnd: number;
  monthFirst: number;
  monthLast: number;
}

/** Running aggregate of question rows: everything a DAX measure needs. */
class Acc {
  n = 0;
  cost = 0;
  rt = 0;
  votes = 0;
  likes = 0;
  errors = 0;
  readonly users = new Set<number>();
  readonly convs = new Set<number>();

  constructor(private readonly q: Dataset['questions']) {}

  add(i: number): void {
    const q = this.q;
    this.n++;
    this.cost += q.cost[i];
    this.rt += q.rt[i];
    this.errors += q.err[i];
    if (q.fb[i] >= 0) {
      this.votes++;
      this.likes += q.fb[i];
    }
    this.users.add(q.user[i]);
    this.convs.add(q.conv[i]);
  }
}

const div = (a: number, b: number): number | null => (b ? a / b : null);

function measure(id: KpiId, a: Acc, headcount: number): number | null {
  switch (id) {
    case 'activeUsers':
      return a.users.size;
    case 'usageRate':
      return div(a.users.size, headcount);
    case 'questions':
      return a.n;
    case 'questionsPerUser':
      return div(a.n, a.users.size);
    case 'cost':
      return a.cost;
    case 'costPerQuestion':
      return div(a.cost, a.n);
    case 'responseTime':
      return div(a.rt, a.n);
    case 'satisfaction':
      return div(a.likes, a.votes);
  }
}

export class Engine {
  private readonly startMs: number;
  private readonly asOf: number;
  private readonly q: Dataset['questions'];
  /** CSR index: citations of question i are citeDocs[citeStart[i] .. citeStart[i+1]) */
  private readonly citeStart: Int32Array;
  private readonly citeDocs: Int32Array;
  private readonly keywordTheme: number[];

  constructor(private readonly ds: Dataset) {
    this.startMs = Date.parse(ds.calendar.start);
    this.asOf = this.dayOf(ds.settings.dataAsOf);
    this.q = ds.questions;

    const n = this.q.day.length;
    this.citeStart = new Int32Array(n + 1);
    for (const qi of ds.citations.q) this.citeStart[qi + 1]++;
    for (let i = 0; i < n; i++) this.citeStart[i + 1] += this.citeStart[i];
    this.citeDocs = new Int32Array(ds.citations.q.length);
    const fill = this.citeStart.slice(0, n);
    ds.citations.q.forEach((qi, k) => (this.citeDocs[fill[qi]++] = ds.citations.doc[k]));

    this.keywordTheme = [];
    for (let i = 0; i < n; i++) this.keywordTheme[this.q.kw[i]] ??= this.q.theme[i];
  }

  // ---------------------------------------------------------------- dates

  private dayOf(iso: string): number {
    return Math.round((Date.parse(iso) - this.startMs) / DAY_MS);
  }

  iso(day: number): string {
    return new Date(this.startMs + day * DAY_MS).toISOString().slice(0, 10);
  }

  private utc(day: number): Date {
    return new Date(this.startMs + day * DAY_MS);
  }

  private fromUtc(y: number, m: number, d: number): number {
    return Math.round((Date.UTC(y, m, d) - this.startMs) / DAY_MS);
  }

  /** Excel / DAX EDATE: same day of month, clamped to the target month's length. */
  private edate(day: number, months: number): number {
    const d = this.utc(day);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + months;
    const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return this.fromUtc(y, m, Math.min(d.getUTCDate(), last));
  }

  private monthKey(day: number): string {
    return this.iso(day).slice(0, 7);
  }

  private period(month: string): Period {
    const [y, m] = month.split('-').map(Number);
    const monthFirst = this.fromUtc(y, m - 1, 1);
    const monthLast = this.fromUtc(y, m, 0);
    const start = monthFirst;
    const end = Math.min(monthLast, this.asOf);
    return { start, end, previousStart: this.edate(start, -1), previousEnd: this.edate(end, -1), monthFirst, monthLast };
  }

  // ----------------------------------------------------------------- rows

  private rows(from: number, to: number, dept: number | null): number[] {
    const { day, dept: d } = this.q;
    const out: number[] = [];
    for (let i = 0; i < day.length; i++) {
      if (day[i] >= from && day[i] <= to && (dept === null || d[i] === dept)) out.push(i);
    }
    return out;
  }

  private acc(rows: number[]): Acc {
    const a = new Acc(this.q);
    for (const i of rows) a.add(i);
    return a;
  }

  private groupBy(rows: number[], key: (i: number) => number): Map<number, Acc> {
    const groups = new Map<number, Acc>();
    for (const i of rows) {
      const k = key(i);
      let a = groups.get(k);
      if (!a) groups.set(k, (a = new Acc(this.q)));
      a.add(i);
    }
    return groups;
  }

  private headcount(dept: number | null): number {
    return this.ds.departments.filter((d) => dept === null || d.id === dept).reduce((s, d) => s + d.headcount, 0);
  }

  private dept(id: number | null) {
    return this.ds.departments.find((d) => d.id === id);
  }

  private current(f: DashboardFilters): { p: Period; cur: number[]; prev: number[] } {
    const p = this.period(f.month);
    return { p, cur: this.rows(p.start, p.end, f.deptId), prev: this.rows(p.previousStart, p.previousEnd, f.deptId) };
  }

  // ------------------------------------------------------------ endpoints

  /** Valid 'YYYY-MM' keys, from the first month of data to the data date. */
  monthKeys(): string[] {
    const keys: string[] = [];
    for (let d = 0; d <= this.asOf; d++) {
      const k = this.monthKey(d);
      if (keys.at(-1) !== k) keys.push(k);
    }
    return keys;
  }

  overview(f: DashboardFilters): Overview {
    const p = this.period(f.month);
    const asOfMonth = this.monthKey(this.asOf);
    const asOfClosed = this.period(asOfMonth).monthLast === this.asOf;
    return {
      dataAsOf: this.ds.settings.dataAsOf,
      defaultMonth: asOfMonth,
      months: this.monthKeys().map((key) => {
        const [y, m] = key.split('-').map(Number);
        const label = `${MONTH_NAMES[m - 1]} ${y}`;
        return { key, label: key === asOfMonth && !asOfClosed ? `${label} (en cours)` : label };
      }),
      departments: [...this.ds.departments].sort((a, b) => a.order - b.order).map(({ id, name, short }) => ({ id, name, short })),
      period: { start: this.iso(p.start), end: this.iso(p.end), previousStart: this.iso(p.previousStart), previousEnd: this.iso(p.previousEnd) },
    };
  }

  kpis(f: DashboardFilters): Kpis {
    const { cur, prev } = this.current(f);
    const hc = this.headcount(f.deptId);
    const a = this.acc(cur);
    const b = this.acc(prev);
    const ids: KpiId[] = ['activeUsers', 'usageRate', 'questions', 'questionsPerUser', 'cost', 'costPerQuestion', 'responseTime', 'satisfaction'];
    const values = Object.fromEntries(ids.map((id) => [id, { value: measure(id, a, hc), previous: b.n ? measure(id, b, hc) : null }])) as Record<KpiId, Compared>;
    return { headcount: hc, values };
  }

  /** Full history (ignores the month filter, like the PBI "NoFilter" interaction), last N buckets. */
  activity(f: DashboardFilters, metric: KpiId): Activity {
    const bucketStart = (day: number): number => {
      if (f.granularity === 'day') return day;
      const d = this.utc(day);
      if (f.granularity === 'month') return this.fromUtc(d.getUTCFullYear(), d.getUTCMonth(), 1);
      return day - ((d.getUTCDay() + 6) % 7); // Monday
    };
    const bucketEnd = (s: number): number => {
      if (f.granularity === 'day') return s;
      if (f.granularity === 'week') return s + 6;
      const d = this.utc(s);
      return this.fromUtc(d.getUTCFullYear(), d.getUTCMonth() + 1, 0);
    };
    const starts: number[] = [];
    for (let d = 0; d <= this.asOf; d++) {
      const s = bucketStart(d);
      if (s >= 0 && starts.at(-1) !== s) starts.push(s);
    }
    const kept = starts.slice(-ACTIVITY_BUCKETS[f.granularity]);
    const groups = this.groupBy(this.rows(kept[0], this.asOf, f.deptId), (i) => bucketStart(this.q.day[i]));
    const hc = this.headcount(f.deptId);
    return {
      metric,
      granularity: f.granularity,
      scopeLabel: this.dept(f.deptId)?.short ?? 'tous départements',
      points: kept.map((s) => {
        const a = groups.get(s) ?? new Acc(this.q);
        return { date: this.iso(s), value: measure(metric, a, hc) ?? 0, partial: bucketEnd(s) > this.asOf };
      }),
    };
  }

  /** All departments (the UI highlights the selected one, like a PBI cross-highlight). */
  departments(f: DashboardFilters): Departments {
    const p = this.period(f.month);
    const rows = this.rows(p.start, p.end, null);
    const all = this.acc(rows);
    const groups = this.groupBy(rows, (i) => this.q.dept[i]);
    const line = (a: Acc, headcount: number): Omit<DepartmentRow, 'id' | 'name' | 'short'> => ({
      headcount,
      activeUsers: a.users.size,
      usageRate: a.users.size / headcount,
      questions: a.n,
      questionsPerUser: div(a.n, a.users.size),
      cost: a.cost,
      costShare: div(a.cost, all.cost) ?? 0,
      satisfaction: div(a.likes, a.votes),
    });
    return {
      rows: [...this.ds.departments]
        .sort((a, b) => a.order - b.order)
        .map((d) => ({ id: d.id, name: d.name, short: d.short, ...line(groups.get(d.id) ?? new Acc(this.q), d.headcount) })),
      total: line(all, this.headcount(null)),
      adoptionThreshold: this.ds.settings.adoptionThreshold,
      satisfactionThreshold: this.ds.settings.satisfactionThreshold,
    };
  }

  budget(f: DashboardFilters): Budget {
    const { p, cur } = this.current(f);
    const a = this.acc(cur);
    const elapsed = p.end - p.monthFirst + 1;
    const days = p.monthLast - p.monthFirst + 1;
    const projection = (a.cost / elapsed) * days;
    const monthlyBudget = this.ds.settings.monthlyBudgetTnd;
    const daily = new Array<number>(days).fill(0);
    for (const i of cur) daily[this.q.day[i] - p.monthFirst] += this.q.cost[i];
    let running = 0;
    const series = daily.map((c, k) => {
      const day = p.monthFirst + k;
      running += c;
      return {
        date: this.iso(day),
        cumulative: day <= p.end ? running : null,
        projected: day >= p.end ? (a.cost / elapsed) * (k + 1) : null,
      };
    });
    return {
      costToDate: a.cost,
      projection,
      costPerQuestion: div(a.cost, a.n),
      costPerUser: div(a.cost, a.users.size),
      monthlyBudget,
      consumedRatio: a.cost / monthlyBudget,
      projectedRatio: projection / monthlyBudget,
      scopeLabel: this.dept(f.deptId)?.short ?? 'tous départements',
      series,
    };
  }

  alerts(f: DashboardFilters): Alerts {
    const s = this.ds.settings;
    const { p, cur, prev } = this.current(f);
    const end = this.iso(p.end);

    const byDay = this.groupBy(cur, (i) => this.q.day[i]);
    let peakDay = p.end;
    let peak = 0;
    for (const [day, a] of byDay) {
      const v = a.rt / a.n;
      if (v > peak) [peak, peakDay] = [v, day];
    }

    const lowAdoption = this.departments(f)
      .rows.filter((r) => r.usageRate < s.adoptionThreshold)
      .map((r) => r.short);
    const budget = this.budget(f);
    const sat = div(this.acc(cur).likes, this.acc(cur).votes) ?? 0;
    const prevAcc = this.acc(prev);
    const satPrev = div(prevAcc.likes, prevAcc.votes);
    const satDrop = satPrev !== null && (satPrev - sat) * 100 >= 1;

    const item = (id: number, category: string, status: AlertStatus, title: string, detail: string, date: string): DashboardAlert => ({
      id,
      category,
      status,
      severity: status === 'ALERTE' ? 'high' : status === 'À SUIVRE' ? 'medium' : 'low',
      title,
      detail,
      date,
    });
    const items = [
      item(
        1,
        'Temps de réponse',
        peak > s.responseTimeThresholdSec ? 'ALERTE' : 'OK',
        `Pic de temps de réponse : ${fmt.dec1(peak)} s le ${fmt.ddmm(this.iso(peakDay))}`,
        `seuil ${s.responseTimeThresholdSec} s · périmètre filtré`,
        this.iso(peakDay),
      ),
      item(
        2,
        'Adoption',
        lowAdoption.length ? 'À SUIVRE' : 'OK',
        lowAdoption.length ? `Adoption faible : ${lowAdoption.join(', ')}` : 'Adoption : aucun département sous le seuil',
        `taux d'utilisation < ${fmt.pct0(s.adoptionThreshold)} — accompagnement à prévoir`,
        end,
      ),
      item(
        3,
        'Budget',
        budget.projectedRatio > 1 ? 'ALERTE' : budget.projectedRatio > 0.9 ? 'À SUIVRE' : 'OK',
        `Projection budget : ${fmt.pct0(budget.projectedRatio)}`,
        `${fmt.int(budget.projection)} TND prévus pour ${budget.monthlyBudget} TND`,
        end,
      ),
      item(
        4,
        'Satisfaction',
        sat < s.satisfactionThreshold ? 'ALERTE' : satDrop ? 'À SUIVRE' : 'OK',
        `Satisfaction : ${fmt.pct0(sat)}`,
        satDrop ? `seuil ${fmt.pct0(s.satisfactionThreshold)} · en baisse vs M-1` : `seuil ${fmt.pct0(s.satisfactionThreshold)}`,
        end,
      ),
    ];
    return { active: items.filter((i) => i.status !== 'OK').length, items };
  }

  private docsUsed(rows: number[]): Map<number, number> {
    const counts = new Map<number, number>();
    for (const i of rows) {
      for (let k = this.citeStart[i]; k < this.citeStart[i + 1]; k++) {
        const doc = this.citeDocs[k];
        counts.set(doc, (counts.get(doc) ?? 0) + 1);
      }
    }
    return counts;
  }

  serviceQuality(f: DashboardFilters): ServiceQuality {
    const { cur, prev } = this.current(f);
    const a = this.acc(cur);
    const b = this.acc(prev);
    const used = this.docsUsed(cur).size;
    const total = this.ds.documents.length;
    const cmp = (x: (acc: Acc) => number | null): Compared => ({ value: x(a), previous: b.n ? x(b) : null });
    return {
      errorRate: cmp((acc) => div(acc.errors, acc.n)),
      responseTime: cmp((acc) => div(acc.rt, acc.n)),
      conversations: cmp((acc) => acc.convs.size),
      documentsUsed: used,
      documentsTotal: total,
      documentShare: used / total,
      scopeLabel: this.dept(f.deptId)?.short ?? 'tous dép.',
    };
  }

  themes(f: DashboardFilters): Themes {
    const { p, cur, prev } = this.current(f);
    const byTheme = this.groupBy(cur, (i) => this.q.theme[i]);
    const prevByTheme = this.groupBy(prev, (i) => this.q.theme[i]);
    const bars = this.ds.themes
      .map((t) => {
        const share = (byTheme.get(t.id)?.n ?? 0) / (cur.length || 1);
        const prevShare = prev.length ? (prevByTheme.get(t.id)?.n ?? 0) / prev.length : null;
        return {
          id: t.id,
          name: t.name,
          short: t.short,
          color: THEME_COLORS[t.name] ?? t.color,
          share,
          evolutionPt: prevShare === null ? null : (share - prevShare) * 100,
        };
      })
      .sort((a, b) => (a.name === 'Autre' ? 1 : b.name === 'Autre' ? -1 : b.share - a.share));

    const columns = HEATMAP_THEMES.map((short) => this.ds.themes.find((t) => t.short === short)!).map(({ id, short }) => ({ id, short }));
    const all = this.rows(p.start, p.end, null);
    const cells = this.groupBy(all, (i) => this.q.dept[i] * 100 + this.q.theme[i]);
    const perDept = this.groupBy(all, (i) => this.q.dept[i]);
    const rows = HEATMAP_DEPTS.map((short) => this.ds.departments.find((d) => d.short === short)!).map((d) => ({
      deptId: d.id,
      short: d.short,
      values: columns.map((c) => Math.round(((cells.get(d.id * 100 + c.id)?.n ?? 0) / (perDept.get(d.id)?.n || 1)) * 100)),
    }));
    return { bars, heatmap: { columns, rows } };
  }

  keywords(f: DashboardFilters): Keywords {
    const { cur } = this.current(f);
    const counts = new Map<number, number>();
    for (const i of cur) counts.set(this.q.kw[i], (counts.get(this.q.kw[i]) ?? 0) + 1);
    const themeName = (kw: number) => this.ds.themes.find((t) => t.id === this.keywordTheme[kw])?.name ?? 'Autre';
    return {
      scopeLabel: this.dept(f.deptId)?.short ?? 'tous départements',
      words: [...counts]
        .sort((a, b) => b[1] - a[1])
        .map(([kw, questions]) => ({ text: this.ds.keywords[kw], questions, theme: themeName(kw), color: THEME_COLORS[themeName(kw)] })),
      legend: CLOUD_LEGEND.map((theme) => ({ theme, color: THEME_COLORS[theme] })),
    };
  }

  documents(f: DashboardFilters): Documents {
    const { cur, prev } = this.current(f);
    const now = this.docsUsed(cur);
    const before = this.docsUsed(prev);
    const top = [...now].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 10);
    return {
      top: top.map(([id, citations], k) => {
        const doc = this.ds.documents.find((d) => d.id === id)!;
        const p = before.get(id);
        return { rank: k + 1, id, title: doc.title, category: doc.category, citations, evolution: p ? (citations - p) / p : null };
      }),
    };
  }

  documentDetail(f: DashboardFilters, id: number): DocumentDetail | null {
    const doc = this.ds.documents.find((d) => d.id === id);
    if (!doc) return null;
    const { cur, prev } = this.current(f);
    const citing = (rows: number[]) =>
      rows.filter((i) => {
        for (let k = this.citeStart[i]; k < this.citeStart[i + 1]; k++) if (this.citeDocs[k] === id) return true;
        return false;
      });
    const rows = citing(cur);
    const byDept = this.groupBy(rows, (i) => this.q.dept[i]);
    const byTheme = this.groupBy(rows, (i) => this.q.theme[i]);
    return {
      id,
      title: doc.title,
      category: doc.category,
      citations: rows.length,
      previous: citing(prev).length,
      byDepartment: [...this.ds.departments]
        .sort((a, b) => a.order - b.order)
        .map((d) => ({ short: d.short, citations: byDept.get(d.id)?.n ?? 0 }))
        .filter((d) => d.citations > 0)
        .sort((a, b) => b.citations - a.citations),
      byTheme: [...byTheme]
        .map(([tid, a]) => {
          const t = this.ds.themes.find((x) => x.id === tid)!;
          return { name: t.name, color: THEME_COLORS[t.name] ?? t.color, citations: a.n };
        })
        .sort((a, b) => b.citations - a.citations)
        .slice(0, 5),
    };
  }
}
