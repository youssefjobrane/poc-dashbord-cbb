import { Component, computed, inject } from '@angular/core';
import { DashboardApi } from '../../core/services/dashboard-api.service';
import { FilterStore } from '../../core/state/filter.store';
import { Loadable, ready } from '../../shared/components/loadable';

/** Threshold scale of the Deneb heatmap spec (e0dfc9). */
const STEPS = [4, 8, 12, 16, 22, 35, 50];
const COLORS = ['#F3F7FC', '#E4EEF8', '#D2E3F3', '#BCD4EC', '#A3C3E4', '#6E9FD4', '#3F7DC6', '#1F5FAD'];
const colorOf = (v: number) => COLORS[STEPS.filter((s) => v >= s).length];

/** "Thématiques par département": share (%) of each department's questions per theme. Click a row to filter. */
@Component({
  selector: 'app-theme-heatmap',
  imports: [Loadable],
  host: { class: 'card' },
  template: `
    <div class="card-head">
      <h2 class="card-title">Thématiques par département</h2>
      <span class="card-sub">part des questions de chaque département</span>
    </div>
    <div class="card-body">
      @if (vm(); as v) {
        <div class="grid" role="table" aria-label="Part des questions par département et thématique" [style.grid-template-columns]="'78px repeat(' + v.columns.length + ', minmax(0, 1fr))'">
          <div role="row" class="contents">
            <span role="columnheader"></span>
            @for (c of v.columns; track c.id) {
              <span role="columnheader" class="col">{{ c.short }}</span>
            }
          </div>
          @for (r of v.rows; track r.deptId) {
            <div role="row" class="contents" [class.dim]="r.dim">
              <button type="button" role="rowheader" class="rh" [class.sel]="r.selected" (click)="store.toggleDept(r.deptId)">{{ r.short }}</button>
              @for (c of r.cells; track $index) {
                <span role="cell" class="cell" [style.background]="c.bg" [class.light]="c.light" [attr.data-tip]="c.tip">{{ c.v }}</span>
              }
            </div>
          }
        </div>
      } @else {
        <app-loadable [res]="res" [rows]="9" />
      }
    </div>
  `,
  styles: `
    .grid { display: grid; grid-template-rows: 30px; grid-auto-rows: 1fr; gap: 2px 3px; height: 100%; padding-top: 2px; }
    .contents { display: contents; }
    .col { font-size: 10px; color: var(--c-text-2); text-align: center; align-self: end; line-height: 11px; padding-bottom: 4px; }
    .rh { all: unset; font-size: 10px; color: var(--c-text); text-align: right; padding-right: 6px; cursor: pointer; align-self: center; }
    .rh.sel { font-weight: 700; color: var(--c-blue); }
    .rh:focus-visible { outline: 2px solid var(--c-blue-focus); }
    .cell { display: grid; place-items: center; font-size: 10px; color: var(--c-text); }
    .cell.light { color: #fff; }
    .dim .cell { opacity: 0.35; }
  `,
})
export class ThemeHeatmap {
  protected readonly store = inject(FilterStore);
  protected readonly res = inject(DashboardApi).themes();

  protected readonly vm = computed(() => {
    const t = ready(this.res) ? this.res.value()?.data : undefined;
    if (!t) return null;
    const sel = this.store.deptId();
    const { columns, rows } = t.heatmap;
    return {
      columns: columns.map((c) => ({ id: c.id, short: c.short })),
      rows: rows.map((r) => ({
        deptId: r.deptId,
        short: r.short,
        selected: r.deptId === sel,
        dim: sel !== null && r.deptId !== sel,
        cells: r.values.map((v, i) => ({ v, bg: colorOf(v), light: v >= 22, tip: `${r.short} · ${columns[i].short}\n${v} % des questions` })),
      })),
    };
  });
}
