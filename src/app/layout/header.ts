import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <div class="titles">
      <h1>Chatbot Banque — Tableau de bord Direction</h1>
      <p>Back-office administrateur · source : traces Laminar · <strong>maquette, données fictives</strong></p>
    </div>
    <div class="actions">
      <a class="docs" routerLink="/docs" routerLinkActive="on" ariaCurrentWhenActive="page" title="Schémas des API et documentation technique des graphiques">
        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 4 1 8l4 4M11 4l4 4-4 4M9.5 2.5l-3 11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
        Docs API &amp; graphiques
      </a>
      <nav aria-label="Pages du tableau de bord">
        <a routerLink="/pilotage" routerLinkActive="active" ariaCurrentWhenActive="page">Pilotage</a>
        <a routerLink="/metiers" routerLinkActive="active" ariaCurrentWhenActive="page">Métiers &amp; thématiques</a>
      </nav>
    </div>
  `,
  styles: `
    :host { display: flex; justify-content: space-between; align-items: center; min-height: 52px; gap: 16px; flex-wrap: wrap; }
    .actions { display: flex; align-items: center; gap: 10px; }
    a.docs { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--c-border); background: #fff; color: var(--c-navy); }
    a.docs:hover { border-color: var(--c-navy); background: #fff; }
    a.docs.on { border-color: var(--c-navy); box-shadow: inset 0 0 0 1px var(--c-navy); }
    h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.01em; line-height: 1.2; }
    p { margin: 2px 0 0; font-size: 11px; color: var(--c-text-3); }
    p strong { font-weight: 600; color: var(--c-text-2); }
    nav { display: flex; gap: 6px; background: #fff; border: 1px solid var(--c-border); border-radius: 8px; padding: 5px; }
    a { padding: 7px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; color: var(--c-text-2); text-decoration: none; white-space: nowrap; }
    a:hover { background: #f3f4f6; }
    a.active { background: var(--c-navy); color: #fff; }
  `,
})
export class Header {}
