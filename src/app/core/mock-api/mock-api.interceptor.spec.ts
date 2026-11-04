import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import dataset from '../../../../public/data/dataset.json';
import { Dataset } from '../models/dataset.model';
import { ApiResponse, Kpis } from '../models/dashboard.model';
import { Engine } from './engine';
import { MockBackend, mockApiInterceptor } from './mock-api.interceptor';

describe('mockApiInterceptor', () => {
  const engine = new Engine(dataset as Dataset);
  let http: HttpClient;
  let failNext = false;

  beforeEach(() => {
    vi.useFakeTimers();
    failNext = false;
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([mockApiInterceptor])),
        { provide: MockBackend, useValue: { engine$: () => of(engine), shouldFail: () => failNext } },
      ],
    });
    http = TestBed.inject(HttpClient);
  });

  afterEach(() => vi.useRealTimers());

  it('answers after a random latency between 1 and 3 s', () => {
    let body: ApiResponse<Kpis> | undefined;
    http.get<ApiResponse<Kpis>>('/api/dashboard/kpis', { params: { month: '2026-10' } }).subscribe((r) => (body = r));
    vi.advanceTimersByTime(999);
    expect(body).toBeUndefined();
    vi.advanceTimersByTime(2001);
    expect(body?.data.values.activeUsers.value).toBe(881);
    expect(body?.meta.latencyMs).toBeGreaterThanOrEqual(1000);
    expect(body?.meta.latencyMs).toBeLessThanOrEqual(3000);
  });

  it('returns an HttpErrorResponse for simulated failures and invalid filters', () => {
    const errors: number[] = [];
    failNext = true;
    http.get('/api/dashboard/kpis').subscribe({ error: (e: HttpErrorResponse) => errors.push(e.status) });
    vi.advanceTimersByTime(3000);
    failNext = false;
    http.get('/api/dashboard/kpis', { params: { month: '1999-01' } }).subscribe({ error: (e: HttpErrorResponse) => errors.push(e.status) });
    http.get('/api/dashboard/nope').subscribe({ error: (e: HttpErrorResponse) => errors.push(e.status) });
    vi.advanceTimersByTime(3000);
    expect(errors[0]).toBe(503);
    expect(errors.slice(1).sort()).toEqual([400, 404]);
  });

  it('cancels the simulated request when the subscriber unsubscribes (switchMap on filter change)', () => {
    let done = false;
    const sub = http.get('/api/dashboard/kpis').subscribe(() => (done = true));
    vi.advanceTimersByTime(500);
    sub.unsubscribe();
    vi.advanceTimersByTime(3000);
    expect(done).toBe(false);
  });
});
