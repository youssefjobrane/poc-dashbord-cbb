import { Component } from '@angular/core';
import { DeptTable } from './dept-table';
import { KeywordCloud } from './keyword-cloud';
import { ThemeBars } from './theme-bars';
import { ThemeHeatmap } from './theme-heatmap';
import { TopDocuments } from './top-documents';

/** Layout follows the PBI canvas (1600 px): rows 300 / 377 px, columns 847:679 and 480:551:480. */
@Component({
  selector: 'app-metiers-page',
  imports: [DeptTable, ThemeHeatmap, ThemeBars, KeywordCloud, TopDocuments],
  host: { class: 'page' },
  template: `
    <div class="row r1">
      <app-dept-table />
      <app-theme-heatmap />
    </div>
    <div class="row r2">
      <app-theme-bars />
      <app-keyword-cloud />
      <app-top-documents />
    </div>
  `,
  styles: `
    :host { gap: 13px; }
    .r1 { grid-template-columns: 847fr 679fr; height: 300px; }
    .r2 { grid-template-columns: 480fr 551fr 480fr; height: 377px; gap: 13px; }
    @media (max-width: 1100px) { .r1, .r2 { height: auto; } .r1 > *, .r2 > * { min-height: 320px; } }
  `,
})
export class MetiersPage {}
