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
    <nav aria-label="Pages du tableau de bord">
      <a routerLink="/pilotage" routerLinkActive="active" ariaCurrentWhenActive="page">Pilotage</a>
      <a routerLink="/metiers" routerLinkActive="active" ariaCurrentWhenActive="page">Métiers &amp; thématiques</a>
    </nav>
  `,
  styles: `
    :host { display: flex; justify-content: space-between; align-items: center; min-height: 52px; gap: 16px; }
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
