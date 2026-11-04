import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { DashboardApi } from '../../core/services/dashboard-api.service';
import { Loadable, ready } from '../../shared/components/loadable';
import { fmt } from '../../shared/format';
import { layoutCloud } from './cloud-layout';

const FONT = "'Segoe UI', system-ui, sans-serif";

/** "Nuage de mots-clés" (Deneb spec 612651): size = frequency, color = business theme. */
@Component({
  selector: 'app-keyword-cloud',
  imports: [Loadable],
  host: { class: 'card' },
  template: `
    <div class="card-head">
      <h2 class="card-title">Nuage de mots-clés</h2>
      <span class="card-sub">{{ scope() }} · taille = fréquence</span>
    </div>
    <div class="card-body" #box>
      @if (words(); as list) {
        <div class="cloud" role="list" aria-label="Mots-clés les plus fréquents">
          @for (w of list; track w.text) {
            <span
              role="listitem"
              class="w"
              [style.left.px]="w.x"
              [style.top.px]="w.y"
              [style.font-size.px]="w.size"
              [style.color]="w.color"
              [attr.data-tip]="w.tip"
              >{{ w.text }}</span
            >
          }
        </div>
        <ul class="legend">
          @for (l of legend(); track l.theme) {
            <li><i [style.background]="l.color"></i>{{ l.theme }}</li>
          }
        </ul>
      } @else {
        <app-loadable [res]="res" kind="block" />
      }
    </div>
  `,
  styles: `
    .card-body { display: flex; flex-direction: column; }
    .cloud { position: relative; flex: 1; min-height: 0; }
    .w { position: absolute; font-weight: 700; line-height: 1.05; padding: 2px; white-space: nowrap; cursor: default; }
    .w:hover { opacity: 0.6; }
    .legend { list-style: none; margin: 0; padding: 6px 0 2px; display: grid; grid-template-columns: repeat(5, auto); justify-content: start; gap: 4px 12px; font-size: 10px; color: var(--c-text-2); }
    .legend i { display: inline-block; width: 8px; height: 8px; margin-right: 4px; }
  `,
})
export class KeywordCloud {
  protected readonly res = inject(DashboardApi).keywords();
  private readonly box = viewChild.required<ElementRef<HTMLElement>>('box');
  private readonly size = signal({ w: 0, h: 0 });
  private readonly ctx = document.createElement('canvas').getContext('2d');
  private readonly data = computed(() => (ready(this.res) ? this.res.value()?.data : undefined));

  protected readonly legend = computed(() => this.data()?.legend ?? []);
  protected readonly scope = computed(() => this.data()?.scopeLabel ?? '');

  protected readonly words = computed(() => {
    const d = this.data();
    const { w, h } = this.size();
    if (!d || !w) return null;
    const measure = (text: string, px: number) => {
      if (!this.ctx) return text.length * px * 0.58;
      this.ctx.font = `700 ${px}px ${FONT}`;
      return this.ctx.measureText(text).width;
    };
    const legendH = 40;
    return layoutCloud(
      d.words.map((k) => ({ ...k, weight: k.questions })),
      w,
      h - legendH,
      measure,
      [10, 32],
    ).map((p) => ({
      text: p.item.text,
      x: p.x,
      y: p.y,
      size: p.size,
      color: p.item.color,
      tip: `${p.item.text} — ${p.item.theme} : ${fmt.int(p.item.questions)} questions`,
    }));
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const el = this.box().nativeElement;
      const ro = new ResizeObserver(([e]) => this.size.set({ w: Math.floor(e.contentRect.width), h: Math.floor(e.contentRect.height) }));
      ro.observe(el);
      destroyRef.onDestroy(() => ro.disconnect());
    });
  }
}
