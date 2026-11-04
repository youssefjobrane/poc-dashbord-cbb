import { Component, inject, linkedSignal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Overview } from './core/models/dashboard.model';
import { DashboardApi } from './core/services/dashboard-api.service';
import { FilterBar } from './layout/filter-bar';
import { Header } from './layout/header';
import { ready } from './shared/components/loadable';
import { fmt } from './shared/format';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, FilterBar],
  template: `
    <app-header />
    <app-filter-bar [overview]="overview()" [fresh]="fresh()" />
    <main>
      <router-outlet />
    </main>
    <footer>
      <span>Maquette interactive — données fictives générées pour illustration. Thématiques et mots-clés : classification LLM légère à la volée, stockée dans les métadonnées Laminar.</span>
      @if (overview(); as o) {
        <span>Données au {{ asOf(o.dataAsOf) }}</span>
      }
    </footer>
  `,
  styles: `
    :host { display: grid; gap: 6px; padding: 14px var(--gutter) 16px; max-width: 2400px; margin: 0 auto; }
    main { margin-top: 6px; }
    footer { display: flex; justify-content: space-between; gap: 16px; font-size: 10px; color: var(--c-text-4); padding: 6px 2px 0; }
  `,
})
export class App {
  private readonly res = inject(DashboardApi).overview();
  protected readonly fresh = () => ready(this.res);
  /** Keeps the last successful overview so the filter lists never disappear while a new month loads. */
  protected readonly overview = linkedSignal<Overview | undefined, Overview | undefined>({
    source: () => (ready(this.res) ? this.res.value()?.data : undefined),
    computation: (next, prev) => next ?? prev?.value,
  });
  protected readonly asOf = fmt.ddmmyyyy;
}
