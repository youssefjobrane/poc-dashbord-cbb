import dataset from '../../../../public/data/dataset.json';
import { Dataset } from '../../core/models/dataset.model';
import { DashboardFilters } from '../../core/models/dashboard.model';
import { Engine } from '../../core/mock-api/engine';
import { ENDPOINTS, FieldDoc } from './api-docs';

const engine = new Engine(dataset as Dataset);
const f: DashboardFilters = { month: '2026-10', deptId: null, granularity: 'week' };
const output: Record<string, unknown> = {
  overview: engine.overview(f),
  kpis: engine.kpis(f),
  activity: engine.activity(f, 'activeUsers'),
  departments: engine.departments(f),
  budget: engine.budget(f),
  alerts: engine.alerts(f),
  'service-quality': engine.serviceQuality(f),
  themes: engine.themes(f),
  keywords: engine.keywords(f),
  documents: engine.documents(f),
  'document-detail': engine.documentDetail(f, 1),
};

/** Returns the paths where the documented fields and the real payload disagree. */
function diff(value: unknown, fields: FieldDoc[], path: string): string[] {
  if (value === null || typeof value !== 'object') return [`${path}: expected object`];
  const obj = value as Record<string, unknown>;
  const documented = fields.map((x) => x.name).sort();
  const actual = Object.keys(obj).sort();
  const out: string[] = [];
  if (documented.join() !== actual.join()) out.push(`${path}: documented [${documented}] vs actual [${actual}]`);
  for (const field of fields) {
    const v = obj[field.name];
    if (!field.children || v === null || v === undefined) continue;
    if (field.map) {
      for (const [k, item] of Object.entries(v as Record<string, unknown>)) out.push(...diff(item, field.children, `${path}.${field.name}.${k}`));
    } else if (Array.isArray(v)) {
      if (v.length) out.push(...diff(v[0], field.children, `${path}.${field.name}[0]`));
    } else {
      out.push(...diff(v, field.children, `${path}.${field.name}`));
    }
  }
  return out;
}

describe('API docs', () => {
  it('documents every endpoint served by the mock API', () => {
    expect(ENDPOINTS.map((e) => e.id).sort()).toEqual(Object.keys(output).sort());
  });

  for (const ep of ENDPOINTS) {
    it(`matches the real payload of ${ep.path}`, () => {
      expect(diff(output[ep.id], ep.response, ep.id)).toEqual([]);
    });
  }
});
