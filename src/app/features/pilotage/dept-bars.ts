import { Component, computed, inject } from '@angular/core';
import { DashboardApi } from '../../core/services/dashboard-api.service';
import { FilterStore } from '../../core/state/filter.store';
import { Loadable, ready } from '../../shared/components/loadable';
import { fmt } from '../../shared/format';

/** "Par département — Utilisateurs actifs": click a bar to set the global department filter. */
@Component({
  selector: 'app-dept-bars',
  imports: [Loadable],
  host: { class: 'card' },
  template: `
    <div class="card-head">
      <h2 class="card-title">Par département — Utilisateurs actifs</h2>
      <span class="card-sub">cliquer une barre pour filtrer</span>
    </div>
    <div class="card-body">
      @if (bars(); as list) {
        <ul class="bars">
          @for (b of list; track b.id) {
            <li>
              <button
                type="button"
                [class.dim]="b.dim"
                [attr.aria-pressed]="b.selected"
                (click)="store.toggleDept(b.id)"
                [attr.data-tip]="b.tip"
              >
                <span class="name">{{ b.short }}</span>
                <span class="track"><span class="bar" [style.width.%]="b.pct"></span><span class="val">{{ b.label }}</span></span>
              </button>
            </li>
          }
        </ul>
      } @else {
        <app-loadable [res]="res" [rows]="8" />
      }
    </div>
  `,
  styles: `
    .bars { list-style: none; margin: 0; padding: 4px 0 0; height: 100%; display: flex; flex-direction: column; justify-content: space-around; }
    button { all: unset; box-sizing: border-box; width: 100%; display: grid; grid-template-columns: 78px 1fr; align-items: center; gap: 8px; cursor: pointer; padding: 2px 0; }
    button:focus-visible { outline: 2px solid var(--c-blue-focus); }
    button.dim { opacity: 0.35; }
    button:hover .bar { filter: brightness(1.12); }
    .name { text-align: right; font-size: 10.5px; color: var(--c-text); white-space: nowrap; }
    .track { display: flex; align-items: center; gap: 6px; padding-right: 36px; }
    .bar { height: 15px; background: var(--c-purple); border-radius: 0 2px 2px 0; min-width: 2px; }
    .val { font-size: 10.5px; font-weight: 700; }
  `,
})
export class DeptBars {
  protected readonly store = inject(FilterStore);
  protected readonly res = inject(DashboardApi).departments();

  protected readonly bars = computed(() => {
    const d = ready(this.res) ? this.res.value()?.data : undefined;
    if (!d) return null;
    const max = Math.max(...d.rows.map((r) => r.activeUsers), 1);
    const sel = this.store.deptId();
    return [...d.rows]
      .sort((a, b) => b.activeUsers - a.activeUsers)
      .map((r) => ({
        id: r.id,
        short: r.short,
        pct: (r.activeUsers / max) * 100,
        label: fmt.int(r.activeUsers),
        selected: sel === r.id,
        dim: sel !== null && sel !== r.id,
        tip: `${r.name}\n${fmt.int(r.activeUsers)} utilisateurs actifs · ${fmt.pct0(r.usageRate)} de l'effectif`,
      }));
  });
}
