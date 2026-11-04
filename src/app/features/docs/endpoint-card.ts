import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input, signal } from '@angular/core';
import { ApiResponse } from '../../core/models/dashboard.model';
import { API_BASE } from '../../core/services/dashboard-api.service';
import { FilterStore } from '../../core/state/filter.store';
import { Loadable, ready } from '../../shared/components/loadable';
import { EndpointDoc, FieldDoc } from './api-docs';

interface Row {
  depth: number;
  name: string;
  type: string;
  desc: string;
}

export function flatten(fields: FieldDoc[], depth = 0): Row[] {
  return fields.flatMap((f) => {
    const suffix = f.children && f.type === 'array' ? '[]' : f.map ? '{…}' : '';
    return [{ depth, name: f.name + suffix, type: f.type, desc: f.desc }, ...(f.children ? flatten(f.children, depth + 1) : [])];
  });
}

/** Keeps long arrays readable in the example: first 3 items + a count. */
function shorten(value: unknown): unknown {
  if (Array.isArray(value)) {
    const head = value.slice(0, 3).map(shorten);
    return value.length > 3 ? [...head, `… ${value.length - 3} autres éléments`] : head;
  }
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shorten(v)]));
  return value;
}

@Component({
  selector: 'app-endpoint-card',
  imports: [Loadable],
  host: { class: 'card', '[id]': 'doc().id' },
  template: `
    <header>
      <span class="method">GET</span>
      <code class="path">{{ doc().path }}</code>
    </header>
    <p class="summary">{{ doc().summary }}</p>
    <div class="used">
      <span class="lbl">Alimente</span>
      @for (u of doc().usedBy; track u) {
        <span class="chip">{{ u }}</span>
      }
    </div>

    <h3>Paramètres de requête</h3>
    <table>
      <thead>
        <tr><th>Nom</th><th>Type</th><th>Requis</th><th>Description</th></tr>
      </thead>
      <tbody>
        @for (p of doc().params; track p.name) {
          <tr>
            <td><code>{{ p.name }}</code></td>
            <td class="type">{{ p.type }}</td>
            <td>{{ p.required ? 'oui' : 'non' }}</td>
            <td>{{ p.desc }}</td>
          </tr>
        }
      </tbody>
    </table>

    <h3>Réponse — contenu de <code>data</code></h3>
    <table>
      <thead>
        <tr><th>Champ</th><th>Type</th><th>Description</th></tr>
      </thead>
      <tbody>
        @for (r of rows(); track $index) {
          <tr [class.nested]="r.depth > 0">
            <td [style.padding-left.px]="8 + r.depth * 18">
              @if (r.depth > 0) {
                <span class="branch" aria-hidden="true">└</span>
              }
              <code>{{ r.name }}</code>
            </td>
            <td class="type">{{ r.type }}</td>
            <td>{{ r.desc }}</td>
          </tr>
        }
      </tbody>
    </table>

    <div class="try">
      <button type="button" (click)="run()">{{ runs() ? 'Relancer' : 'Essayer' }} avec les filtres actuels</button>
      <code class="url">GET {{ url() }}</code>
    </div>
    @if (runs()) {
      @if (example(); as ex) {
        <div class="meta">Réponse en {{ ex.latency }} ms (latence simulée)</div>
        <pre>{{ ex.json }}</pre>
      } @else {
        <div class="pending"><app-loadable [res]="res" [rows]="4" /></div>
      }
    }
  `,
  styles: `
    :host { padding: 16px 18px; gap: 4px; scroll-margin-top: 16px; }
    header { display: flex; align-items: center; gap: 10px; }
    .method { background: #e8f5e9; color: var(--c-good); font-weight: 700; font-size: 11px; border-radius: 4px; padding: 2px 8px; }
    .path { font-size: 15px; font-weight: 700; }
    .summary { margin: 6px 0 4px; color: var(--c-text-2); font-size: 12.5px; }
    .used { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
    .lbl { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--c-text-3); }
    .chip { background: #f1effb; color: var(--c-purple); border-radius: 10px; padding: 2px 9px; font-size: 11px; }
    h3 { font-size: 12px; margin: 14px 0 6px; }
    table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
    th { text-align: left; font-size: 10px; font-weight: 600; color: var(--c-text-3); padding: 4px 8px; border-bottom: 1px solid var(--c-border); }
    td { padding: 5px 8px; border-bottom: 1px solid var(--c-grid); vertical-align: top; }
    tr.nested td { background: #fafbfc; }
    .branch { color: var(--c-text-4); margin-right: 4px; }
    code { font-family: ui-monospace, 'Cascadia Code', Consolas, monospace; font-size: 11.5px; }
    .type { font-family: ui-monospace, 'Cascadia Code', Consolas, monospace; color: var(--c-blue); white-space: nowrap; }
    .try { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 14px; }
    .try button { border: 0; background: var(--c-navy); color: #fff; border-radius: 6px; padding: 6px 12px; font-size: 11.5px; font-weight: 600; cursor: pointer; }
    .try button:hover { background: #1c2b5a; }
    .url { color: var(--c-text-3); word-break: break-all; }
    .meta { margin-top: 8px; font-size: 11px; color: var(--c-text-3); }
    pre { margin: 6px 0 0; max-height: 340px; overflow: auto; background: #0f1b3d; color: #e5e7eb; border-radius: 8px; padding: 12px; font-size: 11px; line-height: 1.45; }
    .pending { height: 110px; margin-top: 8px; }
    @media (max-width: 700px) { table { display: block; overflow-x: auto; } }
  `,
})
export class EndpointCard {
  readonly doc = input.required<EndpointDoc>();
  private readonly filters = inject(FilterStore);
  protected readonly runs = signal(0);
  protected readonly rows = computed(() => flatten(this.doc().response));

  /** Only the parameters this endpoint accepts, taken from the global filters. */
  private readonly params = computed(() => {
    const accepted = new Set(this.doc().params.map((p) => p.name));
    return Object.fromEntries(Object.entries(this.filters.params()).filter(([k]) => accepted.has(k)));
  });

  protected readonly url = computed(() => {
    const q = new URLSearchParams(this.params()).toString();
    return `${API_BASE}/${this.doc().tryPath ?? this.doc().id}${q ? '?' + q : ''}`;
  });

  protected readonly res = httpResource<ApiResponse<unknown>>(() =>
    this.runs() ? { url: `${API_BASE}/${this.doc().tryPath ?? this.doc().id}`, params: this.params() } : undefined,
  );

  protected readonly example = computed(() => {
    const r = ready(this.res) ? this.res.value() : undefined;
    return r && { latency: r.meta.latencyMs, json: JSON.stringify(shorten(r), null, 2) };
  });

  protected run(): void {
    this.runs.update((n) => n + 1);
  }
}
