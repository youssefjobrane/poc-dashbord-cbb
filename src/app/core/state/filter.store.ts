import { Injectable, computed, signal } from '@angular/core';
import { Granularity } from '../models/dashboard.model';

/** Global filters shared by both dashboards. `month = null` means "current month" (server default). */
@Injectable({ providedIn: 'root' })
export class FilterStore {
  readonly month = signal<string | null>(null);
  readonly deptId = signal<number | null>(null);
  readonly granularity = signal<Granularity>('week');

  /** Query params for the mock API (only what is set). */
  readonly params = computed(() => {
    const p: Record<string, string> = { granularity: this.granularity() };
    const month = this.month();
    const dept = this.deptId();
    if (month) p['month'] = month;
    if (dept !== null) p['dept'] = String(dept);
    return p;
  });

  /** Clicking the selected department again clears it (PBI cross-filter toggle). */
  toggleDept(id: number): void {
    this.deptId.update((cur) => (cur === id ? null : id));
  }

  reset(): void {
    this.month.set(null);
    this.deptId.set(null);
    this.granularity.set('week');
  }
}
