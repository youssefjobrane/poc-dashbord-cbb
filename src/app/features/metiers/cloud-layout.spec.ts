import { layoutCloud } from './cloud-layout';

describe('layoutCloud', () => {
  const measure = (text: string, size: number) => text.length * size * 0.55;
  const words = Array.from({ length: 34 }, (_, i) => ({ text: `mot-clé ${i}`, weight: 100 + i * 40 }));

  it('places words inside the box without overlaps, biggest word largest', () => {
    const out = layoutCloud(words, 520, 300, measure);
    expect(out.length).toBeGreaterThan(25);
    for (const a of out) {
      expect(a.x).toBeGreaterThanOrEqual(0);
      expect(a.y + a.h).toBeLessThanOrEqual(300);
      for (const b of out) {
        if (a !== b) expect(a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y).toBe(false);
      }
    }
    expect(out[0].item.weight).toBe(Math.max(...words.map((w) => w.weight)));
    expect(out[0].size).toBe(32);
  });

  it('returns nothing for an empty box', () => {
    expect(layoutCloud(words, 0, 0, measure)).toEqual([]);
  });
});
