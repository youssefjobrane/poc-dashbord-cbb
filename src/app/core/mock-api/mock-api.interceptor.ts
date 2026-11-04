import { HttpErrorResponse, HttpInterceptorFn, HttpParams, HttpRequest, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { defer, from, map, mergeMap, Observable, throwError, timer } from 'rxjs';
import { Dataset } from '../models/dataset.model';
import { ApiResponse, DashboardFilters, Granularity, KpiId } from '../models/dashboard.model';
import { API_BASE } from '../services/dashboard-api.service';
import { Engine } from './engine';

const GRANULARITIES: Granularity[] = ['day', 'week', 'month'];
const METRICS: KpiId[] = ['activeUsers', 'usageRate', 'questions', 'questionsPerUser', 'cost', 'costPerQuestion', 'responseTime', 'satisfaction'];

export const randomLatency = (): number => 1000 + Math.floor(Math.random() * 2001);

/**
 * Simulated backend: owns the dataset and the error-injection settings read from the app URL
 *   ?errorRate=0.2   every request fails with this probability
 *   ?fail=kpis,alerts  the first call of each listed endpoint fails (demo the retry)
 */
@Injectable({ providedIn: 'root' })
export class MockBackend {
  private engine?: Promise<Engine>;
  private readonly url = new URLSearchParams(globalThis.location?.search ?? '');
  private readonly errorRate = Math.min(Math.max(Number(this.url.get('errorRate')) || 0, 0), 1);
  private readonly failOnce = new Set((this.url.get('fail') ?? '').split(',').filter(Boolean));

  engine$(): Observable<Engine> {
    return defer(() => {
      this.engine ??= fetch('data/dataset.json')
        .then((r) => {
          if (!r.ok) throw new Error(`dataset.json: HTTP ${r.status}`);
          return r.json() as Promise<Dataset>;
        })
        .then((ds) => new Engine(ds))
        .catch((e: unknown) => {
          this.engine = undefined; // allow a retry to reload
          throw e;
        });
      return from(this.engine);
    });
  }

  shouldFail(endpoint: string): boolean {
    if (this.failOnce.delete(endpoint)) return true;
    return Math.random() < this.errorRate;
  }
}

function parseFilters(engine: Engine, p: HttpParams): DashboardFilters | string {
  const months = engine.monthKeys();
  const month = p.get('month') ?? months.at(-1)!;
  if (!months.includes(month)) return `month must be one of ${months.join(', ')}`;
  const deptRaw = p.get('dept');
  const deptId = deptRaw === null ? null : Number(deptRaw);
  if (deptId !== null && !(Number.isInteger(deptId) && engine.overview({ month, deptId: null, granularity: 'week' }).departments.some((d) => d.id === deptId))) {
    return 'unknown dept';
  }
  const granularity = (p.get('granularity') ?? 'week') as Granularity;
  if (!GRANULARITIES.includes(granularity)) return 'granularity must be day, week or month';
  return { month, deptId, granularity };
}

/** Routes GET /api/dashboard/<endpoint> to the engine. Returns [status, body]. */
function route(engine: Engine, req: HttpRequest<unknown>, endpoint: string): [number, unknown] {
  const f = parseFilters(engine, req.params);
  if (typeof f === 'string') return [400, { message: f }];
  const doc = /^documents\/(\d+)$/.exec(endpoint);
  if (doc) {
    const detail = engine.documentDetail(f, Number(doc[1]));
    return detail ? [200, detail] : [404, { message: 'document not found' }];
  }
  switch (endpoint) {
    case 'overview':
      return [200, engine.overview(f)];
    case 'kpis':
      return [200, engine.kpis(f)];
    case 'activity': {
      const metric = (req.params.get('metric') ?? 'activeUsers') as KpiId;
      return METRICS.includes(metric) ? [200, engine.activity(f, metric)] : [400, { message: 'unknown metric' }];
    }
    case 'departments':
      return [200, engine.departments(f)];
    case 'budget':
      return [200, engine.budget(f)];
    case 'alerts':
      return [200, engine.alerts(f)];
    case 'service-quality':
      return [200, engine.serviceQuality(f)];
    case 'themes':
      return [200, engine.themes(f)];
    case 'keywords':
      return [200, engine.keywords(f)];
    case 'documents':
      return [200, engine.documents(f)];
    default:
      return [404, { message: `unknown endpoint ${endpoint}` }];
  }
}

/** Intercepts /api/dashboard/* and answers from the in-memory engine after a random 1–3 s delay. Remove it to hit a real backend. */
export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_BASE + '/')) return next(req);
  const backend = inject(MockBackend);
  const endpoint = req.url.slice(API_BASE.length + 1);
  const latencyMs = randomLatency();

  return timer(latencyMs).pipe(
    mergeMap(() => backend.engine$()),
    map((engine) => {
      if (req.method !== 'GET') return [405, { message: 'method not allowed' }] as [number, unknown];
      if (backend.shouldFail(endpoint)) return [503, { message: 'Service temporairement indisponible (erreur simulée)' }] as [number, unknown];
      return route(engine, req, endpoint);
    }),
    mergeMap(([status, body]) => {
      if (status >= 400) return throwError(() => new HttpErrorResponse({ status, error: body, url: req.urlWithParams, statusText: 'Mock error' }));
      const payload: ApiResponse<unknown> = { data: body, meta: { endpoint: `GET ${API_BASE}/${endpoint}`, latencyMs, generatedAt: new Date().toISOString() } };
      return [new HttpResponse({ status, body: payload, url: req.urlWithParams })];
    }),
  );
};
