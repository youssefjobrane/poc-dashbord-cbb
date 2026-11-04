import { Component, signal } from '@angular/core';
import { KpiId } from '../../core/models/dashboard.model';
import { ActivityChart } from './activity-chart';
import { AlertsCard } from './alerts-card';
import { BudgetCard } from './budget-card';
import { DeptBars } from './dept-bars';
import { KpiStrip } from './kpi-strip';
import { ServiceQualityCard } from './service-quality-card';

/** Layout follows the PBI canvas (1600 px): rows 96 / 294 / 228 px, columns 926:599 and 536:488:489. */
@Component({
  selector: 'app-pilotage-page',
  imports: [KpiStrip, ActivityChart, DeptBars, BudgetCard, AlertsCard, ServiceQualityCard],
  host: { class: 'page' },
  template: `
    <app-kpi-strip [(selected)]="metric" />
    <div class="row r2">
      <app-activity-chart [metric]="metric()" />
      <app-dept-bars />
    </div>
    <div class="row r3">
      <app-budget-card />
      <app-alerts-card />
      <app-service-quality-card />
    </div>
  `,
  styles: `
    .r2 { grid-template-columns: 926fr 599fr; height: 294px; }
    .r3 { grid-template-columns: 536fr 488fr 489fr; height: 228px; }
    @media (max-width: 1100px) { .r2, .r3 { height: auto; } .r2 > *, .r3 > * { min-height: 260px; } }
  `,
})
export class PilotagePage {
  protected readonly metric = signal<KpiId>('activeUsers');
}
