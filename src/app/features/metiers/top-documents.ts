import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { DashboardApi } from '../../core/services/dashboard-api.service';
import { Loadable, ready } from '../../shared/components/loadable';
import { delta, fmt } from '../../shared/format';

/** "Documents les plus sollicités" (Deneb spec ddec33) + document detail dialog fetched from /documents/:id. */
@Component({
  selector: 'app-top-documents',
  imports: [Loadable],
  host: { class: 'card' },
  template: `
    <div class="card-head">
      <h2 class="card-title">Documents les plus sollicités</h2>
      <span class="card-sub">questions · vs M-1</span>
    </div>
    <div class="card-body">
      @if (rows(); as list) {
        <ol>
          @for (d of list; track d.id) {
            <li>
              <button type="button" (click)="open(d.id)" [attr.aria-label]="d.title + ', ' + d.count + ' questions, détails'">
                <span class="rk">{{ d.rank }}</span>
                <span class="main">
                  <span class="t">{{ d.title }}</span>
                  <span class="bar"><span [style.width.%]="d.pct"></span></span>
                </span>
                <span class="n">{{ d.count }}</span>
                <span class="ev" [class]="d.tone">{{ d.evol }}</span>
              </button>
            </li>
          }
        </ol>
      } @else {
        <app-loadable [res]="res" [rows]="10" />
      }
    </div>

    <dialog #dlg (close)="docId.set(null)" aria-labelledby="doc-title">
      @if (detail(); as d) {
        <header>
          <div>
            <div class="cat">{{ d.category }}</div>
            <h3 id="doc-title">{{ d.title }}</h3>
          </div>
          <button type="button" class="x" (click)="dlg.close()" aria-label="Fermer">×</button>
        </header>
        <div class="kpis">
          <div><span>Questions citant ce document</span><b>{{ d.count }}</b><small [class]="d.delta.tone">{{ d.delta.text }}</small></div>
          <div><span>Période M-1</span><b>{{ d.previous }}</b></div>
        </div>
        <h4>Par département</h4>
        <ul class="hb">
          @for (r of d.byDepartment; track r.short) {
            <li><span>{{ r.short }}</span><i [style.width.%]="r.pct"></i><b>{{ r.citations }}</b></li>
          }
        </ul>
        <h4>Thématiques principales</h4>
        <ul class="hb">
          @for (r of d.byTheme; track r.name) {
            <li><span>{{ r.name }}</span><i [style.width.%]="r.pct" [style.background]="r.color"></i><b>{{ r.citations }}</b></li>
          }
        </ul>
      } @else {
        <div class="dl-load"><app-loadable [res]="detailRes" [rows]="8" /></div>
      }
    </dialog>
  `,
  styles: `
    ol { list-style: none; margin: 0; padding: 0; height: 100%; display: flex; flex-direction: column; }
    li { flex: 1; border-bottom: 1px solid var(--c-grid); display: flex; }
    li:last-child { border-bottom: 0; }
    li button { all: unset; box-sizing: border-box; flex: 1; display: grid; grid-template-columns: 20px minmax(0, 1fr) 46px 52px; align-items: center; gap: 0 4px; cursor: pointer; }
    li button:hover .t { color: var(--c-blue); text-decoration: underline; }
    li button:focus-visible { outline: 2px solid var(--c-blue-focus); }
    .rk { font-size: 11px; color: var(--c-text-4); padding-left: 2px; }
    .main { display: flex; flex-direction: column; gap: 4px; min-width: 0; padding-right: 8px; }
    .t { font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .bar { height: 4px; }
    .bar span { display: block; height: 100%; border-radius: 2px; background: var(--c-docs); }
    .n { font-size: 12px; font-weight: 700; text-align: right; }
    .ev { font-size: 11px; font-weight: 700; text-align: right; }
    dialog { border: 1px solid var(--c-border); border-radius: 12px; padding: 18px 20px; width: min(520px, 92vw); box-shadow: 0 20px 50px rgb(17 24 39 / 20%); color: var(--c-text); }
    dialog::backdrop { background: rgb(15 27 61 / 35%); }
    header { display: flex; justify-content: space-between; gap: 12px; }
    .cat { font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--c-text-3); }
    h3 { margin: 2px 0 0; font-size: 16px; }
    .x { border: 0; background: none; font-size: 22px; line-height: 1; cursor: pointer; color: var(--c-text-3); }
    .kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 14px 0 6px; }
    .kpis div { border: 1px solid var(--c-border); border-radius: 8px; padding: 8px 10px; display: flex; flex-direction: column; }
    .kpis span { font-size: 10.5px; color: var(--c-text-3); }
    .kpis b { font-size: 22px; }
    .kpis small { font-size: 11px; }
    h4 { font-size: 12px; margin: 12px 0 6px; }
    .hb { list-style: none; margin: 0; padding: 0; display: grid; gap: 5px; }
    .hb li { display: grid; grid-template-columns: 170px 1fr 40px; align-items: center; gap: 8px; border: 0; font-size: 11px; }
    .hb li span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .hb i { display: block; height: 10px; border-radius: 2px; background: var(--c-purple); }
    .hb b { text-align: right; }
    .dl-load { height: 260px; }
  `,
})
export class TopDocuments {
  private readonly api = inject(DashboardApi);
  protected readonly res = this.api.documents();
  protected readonly docId = signal<number | null>(null);
  protected readonly detailRes = this.api.documentDetail(this.docId);
  private readonly dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  protected readonly rows = computed(() => {
    const d = ready(this.res) ? this.res.value()?.data : undefined;
    if (!d) return null;
    const max = Math.max(...d.top.map((t) => t.citations), 1);
    return d.top.map((t) => ({
      id: t.id,
      rank: t.rank,
      title: t.title,
      count: fmt.int(t.citations),
      pct: (t.citations / max) * 100,
      evol: t.evolution === null ? '—' : `${t.evolution >= 0 ? '▲' : '▼'} ${fmt.int(Math.abs(t.evolution) * 100)} %`,
      tone: t.evolution === null ? 'muted' : t.evolution >= 0 ? 'good' : 'bad',
    }));
  });

  protected readonly detail = computed(() => {
    const d = ready(this.detailRes) ? this.detailRes.value()?.data : undefined;
    if (!d) return null;
    const maxDept = Math.max(...d.byDepartment.map((x) => x.citations), 1);
    const maxTheme = Math.max(...d.byTheme.map((x) => x.citations), 1);
    return {
      ...d,
      count: fmt.int(d.citations),
      delta: delta(d.citations, d.previous, 'pct'),
      byDepartment: d.byDepartment.map((x) => ({ ...x, pct: (x.citations / maxDept) * 100 })),
      byTheme: d.byTheme.map((x) => ({ ...x, pct: (x.citations / maxTheme) * 100 })),
    };
  });

  constructor() {
    effect(() => {
      const el = this.dlg().nativeElement;
      if (this.docId() !== null && !el.open) el.showModal();
    });
  }

  protected open(id: number): void {
    this.docId.set(id);
  }
}
