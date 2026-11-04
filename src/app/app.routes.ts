import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'pilotage' },
  {
    path: 'pilotage',
    title: 'Pilotage — Chatbot Banque',
    loadComponent: () => import('./features/pilotage/pilotage-page').then((m) => m.PilotagePage),
  },
  {
    path: 'metiers',
    title: 'Métiers & thématiques — Chatbot Banque',
    loadComponent: () => import('./features/metiers/metiers-page').then((m) => m.MetiersPage),
  },
  { path: '**', redirectTo: 'pilotage' },
];
