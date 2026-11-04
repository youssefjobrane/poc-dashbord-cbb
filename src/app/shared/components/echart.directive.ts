import { DestroyRef, Directive, ElementRef, afterRenderEffect, inject, input, output } from '@angular/core';
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, MarkLineComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';

echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, MarkLineComponent, SVGRenderer]);

export type EChartsOption = echarts.EChartsCoreOption;

/** `<div [appEchart]="options">` — tree-shaken ECharts with resize handling and cleanup. */
@Directive({ selector: '[appEchart]' })
export class EchartDirective {
  readonly options = input.required<EChartsOption>({ alias: 'appEchart' });
  readonly chartClick = output<echarts.ECElementEvent>();

  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    let chart: echarts.ECharts | undefined;
    const ro = new ResizeObserver(() => chart?.resize());

    afterRenderEffect(() => {
      const options = this.options();
      if (!chart) {
        chart = echarts.init(el, null, { renderer: 'svg' });
        chart.on('click', (e) => this.chartClick.emit(e));
        ro.observe(el);
      }
      chart.setOption(options, true);
    });

    inject(DestroyRef).onDestroy(() => {
      ro.disconnect();
      chart?.dispose();
    });
  }
}
