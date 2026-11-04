import { Component, computed, inject } from '@angular/core';
import { DashboardApi } from '../../core/services/dashboard-api.service';
import { Loadable, ready } from '../../shared/components/loadable';
import { delta, format, fmt, Tone } from '../../shared/format';

/** "Qualité de service & documents" (Deneb spec 6e8c1f). */
@Component({
  selector: 'app-service-quality-card',
  imports: [Loadable],
  host: { class: 'card' },
  template: `
    <div class="card-head">
      <h2 class="card-title">Qualité de service &amp; documents</h2>
      <span class="card-sub">{{ scope() }}</span>
    </div>
    <div class="card-body">
      @if (rows(); as list) {
        <dl>
          @for (r of list; track r.title) {
            <div class="r">
              <dt>
                {{ r.title }}
                <span class="sub" [class]="r.tone">{{ r.sub }}</span>
              </dt>
              <dd>{{ r.value }}</dd>
            </div>
          }
        </dl>
      } @else {
        <app-loadable [res]="res" [rows]="6" />
      }
    </div>
  `,
  styles: `
    dl { margin: 0; height: 100%; display: flex; flex-direction: column; justify-content: space-around; }
    .r { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 3px 0 5px; border-bottom: 1px solid var(--c-grid); }
    .r:last-child { border-bottom: 0; }
    dt { font-size: 12px; display: flex; flex-direction: column; }
    .sub { font-size: 11px; margin-top: 1px; }
    .sub.muted { color: var(--c-text-3); }
    dd { margin: 0; font-size: 22px; font-weight: 700; white-space: nowrap; }
  `,
})
export class ServiceQualityCard {
  protected readonly res = inject(DashboardApi).serviceQuality();
  private readonly data = computed(() => (ready(this.res) ? this.res.value()?.data : undefined));
  protected readonly scope = computed(() => {
    const s = this.data()?.scopeLabel;
    return s === 'tous dép.' ? 'tous départements' : (s ?? '');
  });

  protected readonly rows = computed(() => {
    const s = this.data();
    if (!s) return null;
    const row = (title: string, value: string, d: { text: string; tone: Tone }) => ({ title, value, sub: d.text, tone: d.tone });
    return [
      row("Taux d'erreur", format(s.errorRate.value, 'pct1'), delta(s.errorRate.value, s.errorRate.previous, 'pt', true)),
      row('Temps de réponse moyen', format(s.responseTime.value, 'sec'), delta(s.responseTime.value, s.responseTime.previous, 'pct', true)),
      row('Part de la base documentaire utilisée', format(s.documentShare, 'pct0'), {
        text: `${fmt.int(s.documentsUsed)} documents sur ${fmt.int(s.documentsTotal)} · ${s.scopeLabel}`,
        tone: 'muted',
      }),
      row('Conversations', format(s.conversations.value, 'int'), delta(s.conversations.value, s.conversations.previous, 'pct')),
    ];
  });
}
