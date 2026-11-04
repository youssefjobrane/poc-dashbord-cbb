/** fr-FR formatting identical to the Power BI report ("6 892", "58,7 %", "0,056", "5,2 s"). */
const nf = (min: number, max = min) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: min, maximumFractionDigits: max });
const INT = nf(0);
const D1 = nf(1);
const D2 = nf(2);
const D3 = nf(3);
// Intl uses narrow no-break spaces; the report uses plain (no-break) spaces.
const clean = (s: string) => s.replace(/[  ]/g, ' ');
const dash = '—';

export type FormatKind = 'int' | 'dec1' | 'dec2' | 'dec3' | 'pct0' | 'pct1' | 'sec' | 'tnd';

export const fmt = {
  int: (v: number) => clean(INT.format(v)),
  dec1: (v: number) => clean(D1.format(v)),
  dec2: (v: number) => clean(D2.format(v)),
  dec3: (v: number) => clean(D3.format(v)),
  pct0: (v: number) => `${clean(INT.format(v * 100))} %`,
  pct1: (v: number) => `${clean(D1.format(v * 100))} %`,
  sec: (v: number) => `${clean(D1.format(v))} s`,
  tnd: (v: number) => `${clean(INT.format(v))} TND`,
  /** '2026-10-14' -> '14/10' */
  ddmm: (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`,
  ddmmyyyy: (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`,
};

export function format(v: number | null | undefined, kind: FormatKind): string {
  return v === null || v === undefined || Number.isNaN(v) ? dash : fmt[kind](v);
}

export type Tone = 'good' | 'bad' | 'muted';

export interface Delta {
  text: string;
  tone: Tone;
}

/**
 * "▲ 17,0 % vs M-1" / "▼ 4,7 pt vs M-1" — same rules as the KPI Deneb spec:
 * `pt` deltas are absolute percentage points, `pct` deltas are relative; `upIsBad` flips the color (cost, response time, errors).
 */
export function delta(value: number | null, previous: number | null, unit: 'pct' | 'pt', upIsBad = false, suffix = ' vs M-1'): Delta {
  if (value === null || previous === null || previous === 0) return { text: 'pas de comparaison M-1', tone: 'muted' };
  const d = unit === 'pt' ? (value - previous) * 100 : (value - previous) / previous;
  const arrow = d >= 0 ? '▲ ' : '▼ ';
  const amount = unit === 'pt' ? `${fmt.dec1(Math.abs(d))} pt` : fmt.pct1(Math.abs(d));
  return { text: `${arrow}${amount}${suffix}`, tone: d >= 0 !== upIsBad ? 'good' : 'bad' };
}
