import { Component, computed, inject } from '@angular/core';
import { AlertStatus } from '../../core/models/dashboard.model';
import { DashboardApi } from '../../core/services/dashboard-api.service';
import { Loadable, ready } from '../../shared/components/loadable';
import { fmt } from '../../shared/format';

const BADGE: Record<AlertStatus, string> = { ALERTE: 'alert', 'À SUIVRE': 'watch', OK: 'ok' };

/** "Alertes" (Deneb spec c8d51c): one row per rule, status badge, title, detail, date. */
@Component({
  selector: 'app-alerts-card',
  imports: [Loadable],
  host: { class: 'card' },
  template: `
    <div class="card-head">
      <h2 class="card-title">Alertes</h2>
      @if (vm(); as v) {
        <span class="badge" [class]="v.active ? 'alert' : 'ok'">{{ v.active }} ACTIVE{{ v.active > 1 ? 'S' : '' }}</span>
      }
    </div>
    <div class="card-body">
      @if (vm(); as v) {
        <ul>
          @for (a of v.items; track a.id) {
            <li [attr.data-severity]="a.severity">
              <span class="badge st" [class]="a.badge">{{ a.status }}</span>
              <div class="txt">
                <div class="t">{{ a.title }}</div>
                <div class="d">{{ a.detail }}</div>
              </div>
              <time [attr.datetime]="a.date" title="Date de référence">{{ a.day }}</time>
            </li>
          }
        </ul>
      } @else {
        <app-loadable [res]="res" [rows]="6" />
      }
    </div>
  `,
  styles: `
    ul { list-style: none; margin: 0; padding: 4px 0 0; height: 100%; display: flex; flex-direction: column; justify-content: space-around; }
    li { display: grid; grid-template-columns: 64px 1fr auto; align-items: center; gap: 12px; }
    .st { width: 64px; padding: 0; }
    .txt { min-width: 0; }
    .t { font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .d { font-size: 10px; color: var(--c-text-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    time { font-size: 10px; color: var(--c-text-4); }
  `,
})
export class AlertsCard {
  protected readonly res = inject(DashboardApi).alerts();

  protected readonly vm = computed(() => {
    const a = ready(this.res) ? this.res.value()?.data : undefined;
    return a && { active: a.active, items: a.items.map((i) => ({ ...i, badge: BADGE[i.status], day: fmt.ddmm(i.date) })) };
  });
}
