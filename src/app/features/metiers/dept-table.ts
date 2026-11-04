import { Component, computed, inject, signal } from '@angular/core';
import { DepartmentRow } from '../../core/models/dashboard.model';
import { DashboardApi } from '../../core/services/dashboard-api.service';
import { FilterStore } from '../../core/state/filter.store';
import { Loadable, ready } from '../../shared/components/loadable';
import { NumPipe } from '../../shared/num.pipe';

type SortKey = 'name' | 'headcount' | 'activeUsers' | 'usageRate' | 'questions' | 'questionsPerUser' | 'cost' | 'costShare' | 'satisfaction';

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Département' },
  { key: 'headcount', label: 'Effectif' },
  { key: 'activeUsers', label: 'Actifs' },
  { key: 'usageRate', label: "Taux d'utilisation" },
  { key: 'questions', label: 'Questions' },
  { key: 'questionsPerUser', label: 'Q. / util.' },
  { key: 'cost', label: 'Coût (TND)' },
  { key: 'costShare', label: 'Part coût' },
  { key: 'satisfaction', label: 'Satisfaction' },
];

/** "Utilisation par département": sortable, row click = department filter, total row, conditional colors. */
@Component({
  selector: 'app-dept-table',
  imports: [Loadable, NumPipe],
  host: { class: 'card' },
  template: `
    <div class="card-head">
      <h2 class="card-title">Utilisation par département</h2>
      <span class="card-sub">cliquer une ligne pour filtrer</span>
    </div>
    <div class="card-body">
      @if (vm(); as v) {
        <table>
          <thead>
            <tr>
              @for (c of columns; track c.key) {
                <th [attr.aria-sort]="sort().key === c.key ? (sort().desc ? 'descending' : 'ascending') : 'none'" [class.txt]="c.key === 'name'" [class.rate]="c.key === 'usageRate'">
                  <button type="button" (click)="sortBy(c.key)">
                    {{ c.label }}<span class="arrow" aria-hidden="true">{{ sort().key === c.key ? (sort().desc ? '▼' : '▲') : '' }}</span>
                  </button>
                </th>
              }
            </tr>
          </thead>
          <tbody>
            @for (r of v.rows; track r.id) {
              <tr [class.sel]="r.id === store.deptId()" [class.dim]="store.deptId() !== null && r.id !== store.deptId()" (click)="store.toggleDept(r.id)" tabindex="0" (keydown.enter)="store.toggleDept(r.id)" [attr.aria-selected]="r.id === store.deptId()">
                <td class="txt">{{ r.name }}</td>
                <td>{{ r.headcount | num: 'int' }}</td>
                <td class="b">{{ r.activeUsers | num: 'int' }}</td>
                <td>
                  <div class="rc"><span class="bar"><span [style.width.%]="r.usageRate * 100" [class.low]="r.usageRate < v.adoption"></span></span>
                  <span class="pct">{{ r.usageRate | num: 'pct0' }}</span></div>
                </td>
                <td>{{ r.questions | num: 'int' }}</td>
                <td>{{ r.questionsPerUser | num: 'dec1' }}</td>
                <td>{{ r.cost | num: 'int' }}</td>
                <td>{{ r.costShare | num: 'pct0' }}</td>
                <td [class.bad]="r.satisfaction !== null && r.satisfaction < v.satisfaction">{{ r.satisfaction | num: 'pct0' }}</td>
              </tr>
            }
          </tbody>
          <tfoot>
            <tr>
              <td class="txt">Total</td>
              <td>{{ v.total.headcount | num: 'int' }}</td>
              <td>{{ v.total.activeUsers | num: 'int' }}</td>
              <td><div class="rc"><span class="pct">{{ v.total.usageRate | num: 'pct0' }}</span></div></td>
              <td>{{ v.total.questions | num: 'int' }}</td>
              <td>{{ v.total.questionsPerUser | num: 'dec1' }}</td>
              <td>{{ v.total.cost | num: 'int' }}</td>
              <td>{{ v.total.costShare | num: 'pct0' }}</td>
              <td>{{ v.total.satisfaction | num: 'pct0' }}</td>
            </tr>
          </tfoot>
        </table>
      } @else {
        <app-loadable [res]="res" [rows]="9" />
      }
    </div>
  `,
  styles: `
    table { width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed; }
    th { font-size: 10px; font-weight: 600; color: var(--c-text-3); text-align: right; padding: 0 4px 6px; white-space: nowrap; }
    th button { all: unset; cursor: pointer; }
    th button:focus-visible { outline: 2px solid var(--c-blue-focus); }
    th:first-child { width: 24%; }
    th.rate { width: 20%; }
    .arrow { font-size: 8px; margin-left: 2px; }
    td { text-align: right; padding: 0 4px; height: 25px; border-top: 1px solid var(--c-grid); white-space: nowrap; }
    .txt { text-align: left; overflow: hidden; text-overflow: ellipsis; }
    .b { font-weight: 700; }
    tbody tr { cursor: pointer; }
    tbody tr:hover { background: #f7f8fb; }
    tbody tr.sel { background: #f1effb; }
    tbody tr.dim { opacity: 0.45; }
    .rc { display: flex; align-items: center; justify-content: flex-end; gap: 6px; }
    .bar { flex: 1; height: 8px; display: block; }
    .bar span { display: block; height: 100%; background: var(--c-purple); border-radius: 2px; margin-left: auto; max-width: 100%; }
    .bar span.low { background: var(--c-neutral); }
    .pct { width: 32px; }
    td.bad { color: var(--c-bad); }
    tfoot td { font-weight: 700; border-top: 1px solid #d1d5db; height: 27px; }
  `,
})
export class DeptTable {
  protected readonly store = inject(FilterStore);
  protected readonly res = inject(DashboardApi).departments();
  protected readonly columns = COLUMNS;
  protected readonly sort = signal<{ key: SortKey; desc: boolean }>({ key: 'usageRate', desc: true });

  protected readonly vm = computed(() => {
    const d = ready(this.res) ? this.res.value()?.data : undefined;
    if (!d) return null;
    const { key, desc } = this.sort();
    const val = (r: DepartmentRow) => r[key] ?? -1;
    const rows = [...d.rows].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      const c = typeof x === 'string' ? x.localeCompare(String(y), 'fr') : x - Number(y);
      return desc ? -c : c;
    });
    return { rows, total: d.total, adoption: d.adoptionThreshold, satisfaction: d.satisfactionThreshold };
  });

  protected sortBy(key: SortKey): void {
    this.sort.update((s) => ({ key, desc: s.key === key ? !s.desc : key !== 'name' }));
  }
}
