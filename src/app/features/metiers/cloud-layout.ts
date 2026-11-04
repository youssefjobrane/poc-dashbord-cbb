export interface CloudInput {
  text: string;
  weight: number;
}

export interface Placed<T> {
  item: T;
  x: number;
  y: number;
  w: number;
  h: number;
  size: number;
}

/**
 * Word-cloud layout (same idea as Vega's wordcloud transform used by the PBI Deneb visual):
 * sqrt font scale on the weights, biggest words first, each placed on an Archimedean spiral at the first
 * spot that overlaps nothing. Words that never fit are dropped.
 * ponytail: O(n² · spiral steps) collision scan, fine for ~50 words; use a quadtree if the cloud grows to hundreds.
 */
export function layoutCloud<T extends CloudInput>(
  items: T[],
  width: number,
  height: number,
  measure: (text: string, size: number) => number,
  sizeRange: [number, number] = [10, 32],
  padding = 2,
): Placed<T>[] {
  if (!items.length || width <= 0 || height <= 0) return [];
  const weights = items.map((i) => Math.sqrt(i.weight));
  const lo = Math.min(...weights);
  const hi = Math.max(...weights);
  const sizeOf = (w: number) => (hi === lo ? sizeRange[1] : sizeRange[0] + ((Math.sqrt(w) - lo) / (hi - lo)) * (sizeRange[1] - sizeRange[0]));

  const placed: Placed<T>[] = [];
  const ratio = width / height;
  const sorted = [...items].sort((a, b) => b.weight - a.weight);

  for (const item of sorted) {
    const size = Math.round(sizeOf(item.weight));
    const w = measure(item.text, size) + padding * 2;
    const h = size * 1.05 + padding * 2;
    if (w > width) continue;
    for (let t = 0; t < 600; t += 0.15) {
      const x = width / 2 + ratio * 3 * t * Math.cos(t) - w / 2;
      const y = height / 2 + 3 * t * Math.sin(t) - h / 2;
      if (x < 0 || y < 0 || x + w > width || y + h > height) continue;
      if (placed.some((p) => x < p.x + p.w && x + w > p.x && y < p.y + p.h && y + h > p.y)) continue;
      placed.push({ item, x, y, w, h, size });
      break;
    }
  }
  return placed;
}
