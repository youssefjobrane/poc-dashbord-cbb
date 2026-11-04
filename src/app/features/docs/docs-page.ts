import { Component } from '@angular/core';
import { CHARTS, ENDPOINTS, ENVELOPE } from './api-docs';
import { EndpointCard, flatten } from './endpoint-card';

/** Technical documentation: API contract per endpoint + how each chart is built. */
@Component({
  selector: 'app-docs-page',
  imports: [EndpointCard],
  template: `
    <nav class="toc card" aria-label="Sommaire de la documentation">
      <div class="toc-title">Sommaire</div>
      <a href="#conventions" (click)="go($event, 'conventions')">Conventions</a>
      <div class="toc-group">Endpoints</div>
      @for (e of endpoints; track e.id) {
        <a [href]="'#' + e.id" (click)="go($event, e.id)"><code>{{ e.path.replace('/api/dashboard', '') }}</code></a>
      }
      <a class="top" href="#charts" (click)="go($event, 'charts')">Graphiques</a>
    </nav>

    <div class="content">
      <section class="card intro" id="conventions">
        <h2>Documentation technique — API &amp; graphiques</h2>
        <p>
          Chaque widget du tableau de bord appelle son propre endpoint REST. Dans ce POC, les réponses sont produites par une API simulée
          (intercepteur HTTP Angular, latence aléatoire de 1 à 3 s) à partir du jeu de données du rapport Power BI. Un backend réel doit
          renvoyer exactement les structures ci-dessous : les graphiques fonctionnent alors sans modification.
        </p>
        <h3>Conventions</h3>
        <ul>
          <li>Toutes les routes sont en <code>GET</code>, filtres en query string ; un paramètre absent prend sa valeur par défaut.</li>
          <li>Dates au format <code>YYYY-MM-DD</code>, mois au format <code>YYYY-MM</code>.</li>
          <li>Ratios entre <code>0</code> et <code>1</code> (le front les affiche en %), montants en TND, temps en secondes.</li>
          <li><code>null</code> = mesure non calculable (aucune donnée ou division par zéro) ; le front affiche « — ».</li>
          <li>M-1 = mêmes jours un mois plus tôt (ex. 01/10 → 21/10 comparé au 01/09 → 21/09).</li>
          <li>Erreurs : statut HTTP <code>400</code> (filtre invalide), <code>404</code> (ressource inconnue), <code>503</code> (indisponible), corps <code>{{ '{' }} "message": string {{ '}' }}</code>.</li>
        </ul>
        <h3>Enveloppe commune des réponses</h3>
        <table>
          <thead>
            <tr><th>Champ</th><th>Type</th><th>Description</th></tr>
          </thead>
          <tbody>
            @for (r of envelope; track $index) {
              <tr>
                <td [style.padding-left.px]="8 + r.depth * 18"><code>{{ r.name }}</code></td>
                <td class="type">{{ r.type }}</td>
                <td>{{ r.desc }}</td>
              </tr>
            }
          </tbody>
        </table>
      </section>

      @for (e of endpoints; track e.id) {
        <app-endpoint-card [doc]="e" />
      }

      <section class="card" id="charts">
        <h2>Graphiques</h2>
        <p>
          Composants Angular autonomes (standalone), alimentés uniquement par les endpoints ci-dessus : réutilisables tels quels dès qu’une API
          renvoie ces structures. Rendu ECharts (import partiel, rendu SVG) pour les courbes, HTML/CSS pour le reste, ce qui permet de reproduire
          fidèlement le design.
        </p>
        <div class="charts">
          @for (c of charts; track c.id) {
            <article>
              <header>
                <h3>{{ c.name }}</h3>
                <span class="page">{{ c.page }}</span>
              </header>
              <dl>
                <dt>Composant</dt><dd><code>src/app/{{ c.component }}</code></dd>
                <dt>Rendu</dt><dd>{{ c.rendering }}</dd>
                <dt>Endpoint</dt><dd><code>{{ c.endpoint }}</code></dd>
                <dt>Champs utilisés</dt><dd><code>{{ c.fields }}</code></dd>
                <dt>Interactions</dt><dd>{{ c.interactions }}</dd>
                <dt>États</dt><dd>{{ c.states }}</dd>
                <dt>Équivalent Power BI</dt><dd>{{ c.powerBi }}</dd>
              </dl>
            </article>
          }
        </div>
      </section>
    </div>
  `,
  styles: `
    :host { display: grid; grid-template-columns: 230px minmax(0, 1fr); gap: var(--gap); align-items: start; }
    .toc { position: sticky; top: 12px; padding: 12px 14px; gap: 2px; max-height: calc(100vh - 24px); overflow: auto; }
    .toc-title { font-weight: 700; font-size: 13px; margin-bottom: 4px; }
    .toc-group { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--c-text-3); margin: 8px 0 2px; }
    .toc a { color: var(--c-text); text-decoration: none; font-size: 12px; padding: 3px 6px; border-radius: 4px; }
    .toc a:hover { background: #f3f4f6; color: var(--c-blue); }
    .toc .top { margin-top: 8px; font-weight: 600; }
    .content { display: grid; gap: var(--gap); min-width: 0; }
    section { padding: 16px 18px; scroll-margin-top: 16px; }
    h2 { margin: 0 0 6px; font-size: 17px; }
    h3 { font-size: 12.5px; margin: 14px 0 6px; }
    p, li { font-size: 12.5px; color: var(--c-text-2); line-height: 1.5; }
    p { margin: 0; }
    ul { margin: 0; padding-left: 18px; }
    code { font-family: ui-monospace, 'Cascadia Code', Consolas, monospace; font-size: 11.5px; }
    table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
    th { text-align: left; font-size: 10px; font-weight: 600; color: var(--c-text-3); padding: 4px 8px; border-bottom: 1px solid var(--c-border); }
    td { padding: 5px 8px; border-bottom: 1px solid var(--c-grid); }
    .type { font-family: ui-monospace, 'Cascadia Code', Consolas, monospace; color: var(--c-blue); }
    .charts { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 12px; margin-top: 12px; }
    article { border: 1px solid var(--c-border); border-radius: 8px; padding: 12px 14px; }
    article header { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
    article h3 { margin: 0; font-size: 13px; }
    .page { font-size: 10px; color: var(--c-text-3); white-space: nowrap; }
    dl { display: grid; grid-template-columns: 118px 1fr; gap: 5px 10px; margin: 10px 0 0; font-size: 11.5px; }
    dt { color: var(--c-text-3); }
    dd { margin: 0; word-break: break-word; }
    @media (max-width: 900px) { :host { grid-template-columns: 1fr; } .toc { position: static; max-height: none; } }
  `,
})
export class DocsPage {
  protected readonly endpoints = ENDPOINTS;
  protected readonly charts = CHARTS;
  protected readonly envelope = flatten(ENVELOPE);

  /** In-page anchors without touching the router URL. */
  protected go(e: Event, id: string): void {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
