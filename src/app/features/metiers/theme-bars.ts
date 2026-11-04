import { Component, computed, inject } from '@angular/core';
import { DashboardApi } from '../../core/services/dashboard-api.service';
import { Loadable, ready } from '../../shared/components/loadable';
import { fmt } from '../../shared/format';

/** "Thématiques des questions" (Deneb spec 4cda3f): share per theme + evolution in points vs M-1 (±0,55 pt = neutral). */
@Component({
  selector: 'app-theme-bars',
  imports: [Loadable],
  host: { class: 'card' },
  template: `
    <div class="card-head">
      <h2 class="card-title">Thématiques des questions</h2>
      <span class="card-sub">part · évolution vs M-1</span>
    </div>
    <div class="card-body">
      @if (bars(); as list) {
        <ul>
          @for (b of list; track b.id) {
            <li [attr.data-tip]="b.tip">
              <span class="name">{{ b.name }}</span>
              <span class="track"><span class="bar" [style.width.%]="b.pct" [style.background]="b.color"></span><b>{{ b.share }}</b></span>
              <span class="ev" [class]="b.tone">{{ b.evol }}</span>
            </li>
          }
        </ul>
      } @else {
        <app-loadable [res]="res" [rows]="11" />
      }
    </div>
  `,
  styles: `
    ul { list-style: none; margin: 0; padding: 2px 0 0; height: 100%; display: flex; flex-direction: column; justify-content: space-around; }
    li { display: grid; grid-template-columns: 150px 1fr 62px; align-items: center; gap: 8px; }
    .name { font-size: 10px; color: var(--c-text); text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .track { display: flex; align-items: center; gap: 5px; min-width: 0; }
    .bar { height: 17px; border-radius: 0 2px 2px 0; min-width: 2px; }
    b { font-size: 10px; white-space: nowrap; }
    .ev { font-size: 10px; font-weight: 700; text-align: right; white-space: nowrap; }
  `,
})
export class ThemeBars {
  protected readonly res = inject(DashboardApi).themes();

  protected readonly bars = computed(() => {
    const t = ready(this.res) ? this.res.value()?.data : undefined;
    if (!t) return null;
    const max = Math.max(...t.bars.map((b) => b.share), 0.0001);
    return t.bars.map((b) => {
      const e = b.evolutionPt;
      const evol = e === null ? '—' : `${e >= 0 ? '▲ +' : '▼ -'}${fmt.dec1(Math.abs(e))} pt`;
      return {
        id: b.id,
        name: b.name,
        color: b.color,
        pct: (b.share / max) * 82,
        share: fmt.pct1(b.share),
        evol,
        tone: e === null ? 'muted' : e > 0.55 ? 'good' : e < -0.55 ? 'bad' : 'muted',
        tip: `${b.name}\n${fmt.pct1(b.share)} des questions · ${evol} vs M-1`,
      };
    });
  });
}
