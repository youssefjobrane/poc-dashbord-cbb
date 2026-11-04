import { Component, computed, inject, model } from '@angular/core';
import { KpiId } from '../../core/models/dashboard.model';
import { DashboardApi } from '../../core/services/dashboard-api.service';
import { Loadable, ready } from '../../shared/components/loadable';
import { delta, format, fmt } from '../../shared/format';
import { KPI_META } from './kpi-meta';

/** 8 KPI cards; the selected one (blue border, "ANALYSE") drives the evolution chart. */
@Component({
  selector: 'app-kpi-strip',
  imports: [Loadable],
  template: `
    @for (k of cards(); track k.id) {
      <button
        type="button"
        class="kpi"
        [class.on]="k.id === selected()"
        [attr.aria-pressed]="k.id === selected()"
        (click)="selected.set(k.id)"
        [attr.aria-label]="k.title + ' : ' + (k.value ?? 'chargement')"
      >
        <span class="title">
          {{ k.title }}
          @if (k.note) {
            <small>{{ k.note }}</small>
          }
        </span>
        @if (k.id === selected()) {
          <span class="tag">ANALYSE</span>
        }
        @if (k.value !== null) {
          <span class="value">{{ k.value }}</span>
          <span class="delta" [class]="k.delta!.tone">{{ k.delta!.text }}</span>
        } @else {
          <app-loadable class="ph" [res]="res" kind="kpi" />
        }
      </button>
    }
  `,
  styles: `
    :host { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 9px; }
    .kpi { position: relative; height: 96px; text-align: left; background: #fff; border: 1px solid var(--c-border); border-radius: 8px; padding: 13px 13px 0; cursor: pointer; display: flex; flex-direction: column; min-width: 0; }
    .kpi:hover { border-color: #c7d2fe; }
    .kpi.on { border: 2px solid var(--c-blue-focus); padding: 12px 12px 0; }
    .title { font-size: 10.5px; color: var(--c-text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .on .title { padding-right: 44px; }
    .title small { font-size: 9.5px; color: var(--c-text-4); }
    .tag { position: absolute; top: 14px; right: 12px; font-size: 9px; font-weight: 700; color: var(--c-blue-focus); }
    .on .tag { top: 13px; right: 11px; }
    .value { margin-top: 9px; font-size: 28px; font-weight: 700; line-height: 1; color: var(--c-text); white-space: nowrap; }
    .delta { margin-top: 8px; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ph { margin-top: 10px; height: 52px; }
    @media (max-width: 1100px) { :host { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
  `,
})
export class KpiStrip {
  readonly selected = model<KpiId>('activeUsers');
  protected readonly res = inject(DashboardApi).kpis();

  protected readonly cards = computed(() => {
    const data = ready(this.res) ? this.res.value()?.data : undefined;
    return KPI_META.map((m) => {
      const c = data?.values[m.id];
      const note = m.id === 'usageRate' && data ? `(effectif ${fmt.int(data.headcount)})` : '';
      return {
        id: m.id,
        title: m.title,
        note,
        value: c ? format(c.value, m.format) : null,
        delta: c ? delta(c.value, c.previous, m.deltaUnit, m.upIsBad) : null,
      };
    });
  });
}
