import { Component, computed, inject, input } from '@angular/core';
import { Granularity, Overview } from '../core/models/dashboard.model';
import { FilterStore } from '../core/state/filter.store';
import { fmt } from '../shared/format';

@Component({
  selector: 'app-filter-bar',
  template: `
    <label class="field">
      <span class="lbl">Mois</span>
      <select class="month" (change)="onMonth($event)" [disabled]="!overview()">
        @for (m of overview()?.months; track m.key) {
          <option [value]="m.key" [selected]="m.key === monthValue()">{{ m.label }}</option>
        }
      </select>
    </label>
    <label class="field">
      <span class="lbl">Département</span>
      <select class="dept" (change)="onDept($event)" [disabled]="!overview()">
        <option value="" [selected]="store.deptId() === null">Tous les départements</option>
        @for (d of overview()?.departments; track d.id) {
          <option [value]="d.id" [selected]="d.id === store.deptId()">{{ d.name }}</option>
        }
      </select>
    </label>
    <div class="field" role="radiogroup" aria-label="Granularité">
      <span class="lbl" aria-hidden="true">Granularité</span>
      <div class="seg">
        @for (g of granularities; track g.key) {
          <button
            type="button"
            role="radio"
            [attr.aria-checked]="store.granularity() === g.key"
            [class.on]="store.granularity() === g.key"
            (click)="store.granularity.set(g.key)"
          >
            {{ g.label }}
          </button>
        }
      </div>
    </div>
    <button type="button" class="reset" (click)="store.reset()">Réinitialiser</button>
    <p class="period" aria-live="polite">
      @if (period(); as p) {
        Période du <b>{{ p.start }}</b> au <b>{{ p.end }}</b> · comparée au {{ p.previousStart }} → {{ p.previousEnd }} (même nombre de jours)
      } @else {
        <span class="skeleton period-sk"></span>
      }
    </p>
  `,
  styles: `
    :host { display: flex; align-items: center; gap: 14px; height: 44px; padding: 0 9px; background: #fff; border: 1px solid var(--c-border); border-radius: var(--radius); }
    .field { display: flex; align-items: center; gap: 8px; }
    .lbl { font-size: 10px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--c-text-3); }
    select { height: 28px; padding: 0 26px 0 8px; border: 1px solid #c8cdd5; border-radius: 4px; background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%23374151' stroke-width='1.4'/%3E%3C/svg%3E") no-repeat right 9px center; appearance: none; font-size: 12px; cursor: pointer; }
    select.month { width: 186px; }
    select.dept { width: 215px; }
    .seg { display: flex; border: 1px solid #c8cdd5; border-radius: 4px; overflow: hidden; height: 26px; }
    .seg button { border: 0; background: #fff; padding: 0 11px; font-size: 11.5px; cursor: pointer; }
    .seg button + button { border-left: 1px solid #c8cdd5; }
    .seg button.on { background: var(--c-blue-line); color: #fff; font-weight: 600; }
    .reset { height: 24px; padding: 0 10px; border: 1px solid var(--c-border); background: #f3f4f6; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; }
    .reset:hover { background: #e9ebef; }
    .period { margin: 0 0 0 auto; font-size: 11px; color: var(--c-text-3); white-space: nowrap; }
    .period b { color: var(--c-text); font-weight: 700; }
    .period-sk { display: inline-block; width: 380px; height: 12px; vertical-align: middle; }
    @media (max-width: 1350px) { :host { flex-wrap: wrap; height: auto; padding: 8px 9px; } .period { margin-left: 0; } }
  `,
})
export class FilterBar {
  protected readonly store = inject(FilterStore);
  /** Last successful overview: lists stay usable while a new period loads. */
  readonly overview = input<Overview | undefined>();
  /** False while the overview of the selected month is loading. */
  readonly fresh = input(false);

  protected readonly granularities: { key: Granularity; label: string }[] = [
    { key: 'day', label: 'Jour' },
    { key: 'week', label: 'Semaine' },
    { key: 'month', label: 'Mois' },
  ];

  protected readonly monthValue = computed(() => this.store.month() ?? this.overview()?.defaultMonth ?? '');

  protected readonly period = computed(() => {
    const p = this.fresh() ? this.overview()?.period : undefined;
    return p && { start: fmt.ddmm(p.start), end: fmt.ddmm(p.end), previousStart: fmt.ddmm(p.previousStart), previousEnd: fmt.ddmm(p.previousEnd) };
  });

  protected onMonth(e: Event): void {
    const key = (e.target as HTMLSelectElement).value;
    this.store.month.set(key === this.overview()?.defaultMonth ? null : key);
  }

  protected onDept(e: Event): void {
    const v = (e.target as HTMLSelectElement).value;
    this.store.deptId.set(v === '' ? null : Number(v));
  }
}
