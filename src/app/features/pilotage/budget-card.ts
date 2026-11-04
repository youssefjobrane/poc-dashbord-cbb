import { Component, computed, inject } from '@angular/core';
import { Budget } from '../../core/models/dashboard.model';
import { DashboardApi } from '../../core/services/dashboard-api.service';
import { EchartDirective, EChartsOption } from '../../shared/components/echart.directive';
import { Loadable, ready } from '../../shared/components/loadable';
import { format, fmt } from '../../shared/format';

/** "Budget LLM du mois" (Deneb specs 5408f4 + 5b28c9): figures, consumption bar with projection marker, cumulative chart. */
@Component({
  selector: 'app-budget-card',
  imports: [EchartDirective, Loadable],
  host: { class: 'card' },
  template: `
    <div class="card-head">
      <h2 class="card-title">Budget LLM du mois</h2>
      @if (vm(); as v) {
        <span class="badge" [class]="v.tone">PROJECTION {{ v.projectedPct }} DU BUDGET</span>
      }
    </div>
    @if (vm(); as v) {
      <div class="figures">
        @for (f of v.figures; track f.label) {
          <div>
            <div class="f-lbl">{{ f.label }}</div>
            <div class="f-val">{{ f.value }}</div>
          </div>
        }
      </div>
      <div class="progress" role="meter" aria-label="Budget consommé" [attr.aria-valuenow]="v.consumedPctNum" aria-valuemin="0" aria-valuemax="100">
        <span class="fill" [style.width.%]="v.consumedPctNum"></span>
        <span class="marker" [style.left.%]="v.projectedPctNum" [attr.data-tip]="'Projection : ' + v.projectedPct"></span>
      </div>
      <div class="legend">
        <span>{{ v.consumedPct }} du budget de {{ v.budget }} TND consommé ({{ v.scope }})</span>
        <span class="proj"><i></i> projection fin de mois</span>
      </div>
      <div class="chart" [appEchart]="v.chart" role="img" aria-label="Coût cumulé et projection du mois"></div>
    } @else {
      <app-loadable [res]="res" [rows]="6" />
    }
  `,
  styles: `
    .figures { display: grid; grid-template-columns: 25% 27% 24% 24%; margin-top: 6px; }
    .f-lbl { font-size: 11px; color: var(--c-text-3); }
    .f-val { font-size: 17px; font-weight: 700; margin-top: 1px; white-space: nowrap; }
    .progress { position: relative; height: 10px; border-radius: 5px; background: var(--c-track); margin: 14px 0 6px; }
    .fill { position: absolute; inset: 0 auto 0 0; border-radius: 5px; background: var(--c-blue); max-width: 100%; }
    .marker { position: absolute; top: -6px; width: 3px; height: 22px; background: var(--c-neutral); transform: translateX(-1.5px); }
    .legend { display: flex; justify-content: space-between; font-size: 11px; color: var(--c-text-2); }
    .proj { font-size: 10px; color: var(--c-text-3); }
    .proj i { display: inline-block; width: 3px; height: 10px; background: var(--c-neutral); vertical-align: -1px; margin-right: 3px; }
    .chart { flex: 1; min-height: 70px; margin: 2px -6px -6px -4px; }
  `,
})
export class BudgetCard {
  protected readonly res = inject(DashboardApi).budget();

  protected readonly vm = computed(() => {
    const b = ready(this.res) ? this.res.value()?.data : undefined;
    if (!b) return null;
    return {
      tone: b.projectedRatio > 1 ? 'alert' : b.projectedRatio > 0.9 ? 'watch' : 'ok',
      projectedPct: fmt.pct0(b.projectedRatio),
      projectedPctNum: Math.min(b.projectedRatio, 1) * 100,
      consumedPct: fmt.pct0(b.consumedRatio),
      consumedPctNum: Math.min(b.consumedRatio, 1) * 100,
      budget: b.monthlyBudget,
      scope: b.scopeLabel,
      figures: [
        { label: 'Coût à date', value: format(b.costToDate, 'tnd') },
        { label: 'Projection fin de mois', value: format(b.projection, 'tnd') },
        { label: 'Coût / question', value: `${format(b.costPerQuestion, 'dec3')} TND` },
        { label: 'Coût / utilisateur', value: `${format(b.costPerUser, 'dec2')} TND` },
      ],
      chart: this.chart(b),
    };
  });

  private chart(b: Budget): EChartsOption {
    const top = Math.max(1000, Math.ceil(Math.max(b.projection, b.monthlyBudget) / 500) * 500);
    const dates = b.series.map((p) => fmt.ddmm(p.date));
    return {
      animationDuration: 400,
      textStyle: { fontFamily: 'Segoe UI, system-ui, sans-serif' },
      grid: { left: 30, right: 8, top: 10, bottom: 16 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#fff',
        borderColor: '#E5E7EB',
        textStyle: { color: '#111827', fontSize: 11 },
        valueFormatter: (v: unknown) => (typeof v === 'number' ? `${fmt.int(v)} TND` : '—'),
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: dates,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#6B7280', fontSize: 9, margin: 4, interval: (i: number) => i === 0 || i === dates.length - 1, alignMinLabel: 'left', alignMaxLabel: 'right' },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: top,
        interval: top / 2,
        splitLine: { lineStyle: { color: '#EEF0F3' } },
        axisLabel: { color: '#6B7280', fontSize: 9 },
      },
      series: [
        {
          name: 'Coût cumulé',
          type: 'line',
          data: b.series.map((p) => p.cumulative),
          showSymbol: false,
          lineStyle: { color: '#2F6DB5', width: 2 },
          itemStyle: { color: '#2F6DB5' },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#C62828', type: [4, 3], width: 1.2 },
            label: { position: 'insideEndTop', formatter: `Budget ${b.monthlyBudget}`, color: '#C62828', fontSize: 9 },
            data: [{ yAxis: b.monthlyBudget }],
          },
        },
        {
          name: 'Projection',
          type: 'line',
          data: b.series.map((p) => p.projected),
          showSymbol: false,
          lineStyle: { color: '#B8860B', width: 2, type: [4, 3] },
          itemStyle: { color: '#B8860B' },
        },
      ],
    };
  }
}
