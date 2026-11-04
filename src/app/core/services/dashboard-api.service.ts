import { httpResource, HttpResourceRef } from '@angular/common/http';
import { Injectable, Signal, inject } from '@angular/core';
import {
  Activity,
  Alerts,
  ApiResponse,
  Budget,
  Departments,
  DocumentDetail,
  Documents,
  KpiId,
  Keywords,
  Kpis,
  Overview,
  ServiceQuality,
  Themes,
} from '../models/dashboard.model';
import { FilterStore } from '../state/filter.store';

export const API_BASE = '/api/dashboard';

export type ApiResource<T> = HttpResourceRef<ApiResponse<T> | undefined>;

/**
 * Typed client for the dashboard API. Each method returns an `httpResource` bound to the global filters:
 * a filter change re-issues the request and cancels the in-flight one (switchMap semantics), `isLoading()` /
 * `error()` / `reload()` drive the skeleton and retry UI. Must be called from an injection context (component field).
 * Plain HttpClient underneath: removing `mockApiInterceptor` points it at a real backend.
 */
@Injectable({ providedIn: 'root' })
export class DashboardApi {
  private readonly filters = inject(FilterStore);

  private get<T>(endpoint: string, params: () => Record<string, string> | undefined = () => this.filters.params()): ApiResource<T> {
    return httpResource<ApiResponse<T>>(() => {
      const p = params();
      return p ? { url: `${API_BASE}/${endpoint}`, params: p } : undefined;
    });
  }

  /** Period label, month list, departments: depends on the month only. */
  overview(): ApiResource<Overview> {
    return this.get('overview', () => this.monthOnly());
  }

  kpis(): ApiResource<Kpis> {
    return this.get('kpis', () => this.monthDept());
  }

  /** Full history, so the month filter is ignored (PBI "NoFilter" interaction). */
  activity(metric: Signal<KpiId>): ApiResource<Activity> {
    return this.get('activity', () => {
      const { month: _ignored, ...p } = this.filters.params();
      return { ...p, metric: metric() };
    });
  }

  /** All departments of the month; the selected one is only highlighted. */
  departments(): ApiResource<Departments> {
    return this.get('departments', () => this.monthOnly());
  }

  budget(): ApiResource<Budget> {
    return this.get('budget', () => this.monthDept());
  }

  alerts(): ApiResource<Alerts> {
    return this.get('alerts', () => this.monthDept());
  }

  serviceQuality(): ApiResource<ServiceQuality> {
    return this.get('service-quality', () => this.monthDept());
  }

  themes(): ApiResource<Themes> {
    return this.get('themes', () => this.monthDept());
  }

  keywords(): ApiResource<Keywords> {
    return this.get('keywords', () => this.monthDept());
  }

  documents(): ApiResource<Documents> {
    return this.get('documents', () => this.monthDept());
  }

  documentDetail(id: Signal<number | null>): ApiResource<DocumentDetail> {
    return httpResource<ApiResponse<DocumentDetail>>(() => {
      const docId = id();
      return docId === null ? undefined : { url: `${API_BASE}/documents/${docId}`, params: this.monthDept() };
    });
  }

  private monthOnly(): Record<string, string> {
    const m = this.filters.month();
    return m ? { month: m } : {};
  }

  private monthDept(): Record<string, string> {
    const { granularity: _ignored, ...p } = this.filters.params();
    return p;
  }
}
