import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, input } from '@angular/core';

/** Minimal view of an Angular resource: enough to render loading / error states. */
export interface LoadableResource {
  isLoading(): boolean;
  error(): unknown;
  reload(): boolean;
}

/**
 * Placeholder shown instead of a widget's content while its request is in flight (skeleton, never stale data)
 * or after it failed (message + retry). Usage: `@if (ready(res)) { content } @else { <app-loadable [res]="res" /> }`.
 */
@Component({
  selector: 'app-loadable',
  template: `
    @if (res().isLoading()) {
      <div class="sk" [class]="kind()" aria-busy="true" aria-label="Chargement">
        @for (l of lines(); track $index) {
          <div class="skeleton" [style.width.%]="l"></div>
        }
      </div>
    } @else if (res().error()) {
      <div class="err" role="alert">
        <span class="err-icon" aria-hidden="true">!</span>
        <div>
          <div class="err-title">Données indisponibles</div>
          <div class="err-msg">{{ message() }}</div>
        </div>
        <button type="button" (click)="res().reload()">Réessayer</button>
      </div>
    }
  `,
  styles: `
    :host { display: block; height: 100%; }
    .sk { display: flex; flex-direction: column; gap: 10px; height: 100%; padding-top: 4px; }
    .sk .skeleton { height: 12px; }
    .sk.block .skeleton { flex: 1; height: auto; }
    .sk.kpi { gap: 12px; padding-top: 2px; }
    .sk.kpi .skeleton:nth-child(2) { height: 26px; }
    .err { height: 100%; display: flex; align-items: center; justify-content: center; gap: 10px; text-align: left; }
    .err-icon { width: 22px; height: 22px; border-radius: 50%; background: var(--c-bad-bg); color: var(--c-bad); display: grid; place-items: center; font-weight: 700; flex: none; }
    .err-title { font-weight: 600; font-size: 12px; }
    .err-msg { font-size: 10.5px; color: var(--c-text-3); }
    button { border: 1px solid var(--c-border); background: #fff; border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: 600; cursor: pointer; }
    button:hover { background: #f3f4f6; }
  `,
})
export class Loadable {
  readonly res = input.required<LoadableResource>();
  /** 'rows' = text lines, 'block' = one chart-sized block, 'kpi' = card */
  readonly kind = input<'rows' | 'block' | 'kpi'>('rows');
  readonly rows = input(5);

  protected readonly lines = computed(() => {
    if (this.kind() === 'block') return [100];
    if (this.kind() === 'kpi') return [70, 55, 45];
    return Array.from({ length: this.rows() }, (_, i) => 100 - ((i * 17) % 40));
  });

  protected readonly message = computed(() => {
    const e = this.res().error();
    if (e instanceof HttpErrorResponse) {
      const body = e.error as { message?: string } | null;
      return `${body?.message ?? e.statusText} (HTTP ${e.status})`;
    }
    return e instanceof Error ? e.message : 'Erreur inattendue';
  });
}

/** True when the resource has a fresh value to display (not loading, not failed). */
export function ready(res: LoadableResource & { hasValue(): boolean }): boolean {
  return !res.isLoading() && !res.error() && res.hasValue();
}
