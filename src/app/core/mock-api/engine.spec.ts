import dataset from '../../../../public/data/dataset.json';
import { Dataset } from '../models/dataset.model';
import { DashboardFilters } from '../models/dashboard.model';
import { Engine } from './engine';

// Golden values come from tools/xlsx_to_json.py (same rows as the Power BI model, guide step 9).
const engine = new Engine(dataset as Dataset);
const oct: DashboardFilters = { month: '2026-10', deptId: null, granularity: 'week' };
const octCredits: DashboardFilters = { ...oct, deptId: 3 };

describe('Engine (DAX port)', () => {
  it('computes the period and its M-1 window with the same number of days', () => {
    const o = engine.overview(oct);
    expect(o.period).toEqual({
      start: '2026-10-01',
      end: '2026-10-21',
      previousStart: '2026-09-01',
      previousEnd: '2026-09-21',
    });
    expect(o.months.map((m) => m.key)).toEqual(['2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
    expect(o.months.at(-1)?.label).toBe('Octobre 2026 (en cours)');
  });

  it('matches the Power BI KPIs for Octobre 2026, tous départements', () => {
    const k = engine.kpis(oct);
    expect(k.headcount).toBe(1500);
    expect(k.values.activeUsers).toEqual({ value: 881, previous: 752 });
    expect(k.values.questions).toEqual({ value: 6892, previous: 5188 });
    expect(k.values.usageRate.value).toBeCloseTo(881 / 1500, 6);
    expect(k.values.questionsPerUser.value).toBeCloseTo(6892 / 881, 6);
    expect(k.values.cost.value).toBeCloseTo(387.4803, 3);
    expect(k.values.cost.previous).toBeCloseTo(288.4648, 3);
    expect(k.values.responseTime.value).toBeCloseTo(5.3574, 3);
    expect(k.values.satisfaction.value).toBeCloseTo(0.7511, 3);
  });

  it('filters every measure by department', () => {
    const k = engine.kpis(octCredits);
    expect(k.headcount).toBe(180);
    expect(k.values.activeUsers).toEqual({ value: 91, previous: 78 });
    expect(k.values.questions).toEqual({ value: 675, previous: 486 });
    expect(k.values.cost.value).toBeCloseTo(39.0905, 3);
  });

  it('keeps the department table coherent with the KPIs', () => {
    const d = engine.departments(oct);
    const k = engine.kpis(oct);
    expect(d.rows.map((r) => r.short)).toEqual(['Réseau', 'Back-office', 'Crédits', 'Conformité', 'Marketing', 'DSI', 'Finance', 'RH']);
    expect(d.total.activeUsers).toBe(k.values.activeUsers.value);
    expect(d.rows.reduce((s, r) => s + r.questions, 0)).toBe(6892);
    expect(d.rows.reduce((s, r) => s + r.costShare, 0)).toBeCloseTo(1, 9);
  });

  it('projects the monthly budget linearly to month end', () => {
    const b = engine.budget(oct);
    expect(b.projection).toBeCloseTo((387.4803 / 21) * 31, 2);
    expect(b.monthlyBudget).toBe(700);
    expect(b.series).toHaveLength(31);
    expect(b.series[20]).toEqual({ date: '2026-10-21', cumulative: expect.closeTo(387.4803, 3), projected: expect.closeTo(387.4803, 3) });
    expect(b.series[21].cumulative).toBeNull();
    expect(b.series[0].projected).toBeNull();
  });

  it('raises the Power BI alerts', () => {
    const a = engine.alerts(oct);
    const byCat = Object.fromEntries(a.items.map((i) => [i.category, i]));
    expect(byCat['Adoption'].status).toBe('À SUIVRE');
    expect(byCat['Adoption'].title).toBe('Adoption faible : Finance, RH');
    expect(byCat['Budget'].status).toBe('OK');
    expect(byCat['Budget'].title).toBe('Projection budget : 82 %');
    expect(a.active).toBe(a.items.filter((i) => i.status !== 'OK').length);
  });

  it('counts documents of the knowledge base used in the period', () => {
    const s = engine.serviceQuality(oct);
    expect(s.documentsUsed).toBe(230);
    expect(s.documentsTotal).toBe(420);
    expect(engine.documents(oct).top).toHaveLength(10);
  });

  it('builds the weekly activity series over the last 12 buckets, last one partial', () => {
    const a = engine.activity(oct, 'activeUsers');
    expect(a.points).toHaveLength(12);
    expect(a.points[0].date).toBe('2026-08-03');
    expect(a.points.at(-1)).toEqual({ date: '2026-10-19', value: 585, partial: true });
    expect(a.points.slice(0, -1).every((p) => !p.partial)).toBe(true);
  });

  it('splits questions by theme so that shares sum to 100 %', () => {
    const t = engine.themes(oct);
    expect(t.bars.reduce((s, b) => s + b.share, 0)).toBeCloseTo(1, 9);
    expect(t.bars.at(-1)?.name).toBe('Autre');
    expect(t.heatmap.columns).toHaveLength(10);
    expect(t.heatmap.rows).toHaveLength(8);
  });
});
