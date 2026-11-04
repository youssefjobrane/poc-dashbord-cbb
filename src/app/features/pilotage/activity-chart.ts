import { Component, computed, inject, input } from '@angular/core';
import { Activity, KpiId } from '../../core/models/dashboard.model';
import { DashboardApi } from '../../core/services/dashboard-api.service';
import { EchartDirective, EChartsOption } from '../../shared/components/echart.directive';
import { Loadable, ready } from '../../shared/components/loadable';
import { format, fmt } from '../../shared/format';
import { kpiMeta } from './kpi-meta';

const BLUE = '#2F6DB5';
const GRAN_LABEL = { day: 'jour', week: 'semaine', month: 'mois' } as const;

/** "Évolution" line chart (Deneb spec 568c7b): full history, last open bucket dashed, latest value labelled. */
@Component({
  selector: 'app-activity-chart',
  imports: [EchartDirective, Loadable],
  host: { class: 'card' },
  template: `
    <div class="card-head">
      <h2 class="card-title">Évolution — {{ label() }}</h2>
      <span class="card-sub">{{ subtitle() }}</span>
    </div>
    <div class="card-body">
      @if (options(); as o) {
        <div class="chart" [appEchart]="o" role="img" [attr.aria-label]="'Évolution ' + label()"></div>
      } @else {
        <app-loadable [res]="res" kind="block" />
      }
    </div>
  `,
  styles: `.chart { position: absolute; inset: 0; }`,
})
export class ActivityChart {
  readonly metric = input.required<KpiId>();
  protected readonly res = inject(DashboardApi).activity(this.metric);
  protected readonly label = computed(() => kpiMeta(this.metric()).chartLabel);
  private readonly data = computed(() => (ready(this.res) ? this.res.value()?.data : undefined));

  protected readonly subtitle = computed(() => {
    const d = this.data();
    return d ? `${d.scopeLabel} · par ${GRAN_LABEL[d.granularity]}` : '';
  });

  protected readonly options = computed<EChartsOption | null>(() => {
    const d = this.data();
    return d ? this.build(d) : null;
  });

  private build(d: Activity): EChartsOption {
    const kind = kpiMeta(d.metric).format;
    const pts = d.points;
    const last = pts.length - 1;
    const hasPartial = pts[last]?.partial ?? false;
    const max = Math.max(...pts.map((p) => p.value));
    const fixedScale = d.metric === 'activeUsers' && max <= 900;
    const axisFmt = (v: number) => (kind === 'pct1' || kind === 'pct0' ? fmt.pct0(v) : kind === 'dec3' ? fmt.dec2(v) : kind === 'sec' || kind === 'dec1' ? fmt.dec1(v) : fmt.int(v));

    return {
      animationDuration: 400,
      textStyle: { fontFamily: 'Segoe UI, system-ui, sans-serif' },
      grid: { left: 44, right: 16, top: 14, bottom: 26 },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line', lineStyle: { color: '#D1D5DB' } },
        backgroundColor: '#fff',
        borderColor: '#E5E7EB',
        textStyle: { color: '#111827', fontSize: 11 },
        formatter: (params: unknown) => {
          const i = (params as { dataIndex: number }[])[0].dataIndex;
          const p = pts[i];
          return `${p.partial ? 'Période en cours' : 'Début de période'} : <b>${fmt.ddmmyyyy(p.date)}</b><br/>${this.label()} : <b>${format(p.value, kind)}</b>`;
        },
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: pts.map((p) => fmt.ddmm(p.date)),
        axisLine: { lineStyle: { color: '#E5E7EB' } },
        axisTick: { show: false },
        axisLabel: { color: '#6B7280', fontSize: 10, margin: 8, interval: d.granularity === 'week' ? 1 : 'auto' },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: fixedScale ? 1000 : undefined,
        interval: fixedScale ? 250 : undefined,
        splitLine: { lineStyle: { color: '#EEF0F3' } },
        axisLabel: { color: '#6B7280', fontSize: 10, formatter: axisFmt },
      },
      series: [
        {
          name: 'closed',
          type: 'line',
          data: pts.map((p) => (p.partial ? null : p.value)),
          lineStyle: { color: BLUE, width: 2 },
          areaStyle: { color: BLUE, opacity: 0.09 },
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: { color: '#fff', borderColor: BLUE, borderWidth: 1.5 },
          label: { show: !hasPartial, position: 'top', formatter: (p: { dataIndex: number; value: number }) => (p.dataIndex === last ? format(p.value, kind) : ''), fontWeight: 700, fontSize: 11, color: '#111827' },
          z: 2,
        },
        {
          name: 'partial',
          type: 'line',
          data: pts.map((p, i) => (hasPartial && i >= last - 1 ? p.value : null)),
          lineStyle: { color: BLUE, width: 2, type: [5, 4] },
          symbol: 'circle',
          symbolSize: (_v: unknown, p: { dataIndex: number }) => (p.dataIndex === last ? 9 : 0),
          itemStyle: { color: BLUE },
          label: { show: true, position: 'top', formatter: (p: { dataIndex: number; value: number }) => (p.dataIndex === last ? format(p.value, kind) : ''), fontWeight: 700, fontSize: 11, color: '#111827' },
          tooltip: { show: false },
          z: 3,
        },
      ],
    };
  }
}
