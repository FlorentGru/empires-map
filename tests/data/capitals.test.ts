import { describe, expect, it } from 'vitest';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DATA, PUBLIC_EMPIRES, empireIds, exists, readJson } from './helpers';

interface Capital {
  city: string;
  at: [number, number];
  from?: number;
  to?: number;
}

const capitals = readJson<Record<string, Capital[]>>(join(DATA, 'capitals.json'));

/** Capitale valable une année donnée (bornes inclusives, absentes = ouvertes). */
const validAt = (list: Capital[], year: number) =>
  list.find((c) => (c.from ?? -Infinity) <= year && year <= (c.to ?? Infinity));

/** Distance orthodromique en km. */
function haversine([lon1, lat1]: number[], [lon2, lat2]: number[]): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const a =
    Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lon2 - lon1) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
}

interface Label {
  empire: string;
  step: string;
  year: number;
  name: string;
  point: [number, number];
  area: number;
}

const labels: Label[] = [];
for (const empire of empireIds()) {
  const dir = join(PUBLIC_EMPIRES, empire, 'neighbors');
  if (!exists(dir)) continue;
  const years = new Map<string, number>(
    readJson(join(DATA, 'empires', empire, 'timeline.json')).steps.map((s: any) => [s.id, s.year]),
  );
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.geojson'))) {
    const step = file.replace(/\.geojson$/, '');
    const year = years.get(step);
    if (year === undefined) continue;
    for (const f of readJson(join(dir, file)).features) {
      if (f.properties?.kind === 'label') {
        labels.push({ empire, step, year, name: f.properties.name, point: f.geometry.coordinates, area: f.properties.area ?? 0 });
      }
    }
  }
}
const labelNames = new Set(labels.map((l) => l.name));

describe('capitals.json', () => {
  const entries = Object.entries(capitals);

  it('contient plusieurs centaines de voisins', () => {
    expect(entries.length).toBeGreaterThan(150);
  });

  it.each(entries.map(([name]) => name))('« %s » est un voisin affiché sur la carte', (name) => {
    expect(labelNames.has(name), name).toBe(true);
  });

  it.each(entries)('« %s » : capitales valides, triées, sans chevauchement', (name, list) => {
    expect(list.length, name).toBeGreaterThan(0);
    for (const c of list) {
      expect(c.city.trim().length, name).toBeGreaterThan(0);
      const [lon, lat] = c.at;
      expect(lon, `${name}/${c.city}`).toBeGreaterThanOrEqual(-180);
      expect(lon, `${name}/${c.city}`).toBeLessThanOrEqual(180);
      expect(lat, `${name}/${c.city}`).toBeGreaterThanOrEqual(-90);
      expect(lat, `${name}/${c.city}`).toBeLessThanOrEqual(90);
      if (c.from !== undefined && c.to !== undefined) expect(c.from, `${name}/${c.city}`).toBeLessThanOrEqual(c.to);
    }
    for (let i = 1; i < list.length; i++) {
      const prevEnd = list[i - 1]!.to ?? Infinity;
      const start = list[i]!.from ?? -Infinity;
      expect(start, `${name}: ${list[i]!.city} chevauche ${list[i - 1]!.city}`).toBeGreaterThan(prevEnd);
    }
  });

  it('chaque capitale est proche du libellé du voisin à l’étape concernée', () => {
    // Un même nom peut avoir plusieurs polygones (ex. Royaume-Uni = métropole + Belize) : on garde le plus proche.
    // Les grands empires sont tronqués par l'emprise de la carte, d'où une tolérance plus large (4500 km au lieu de 2500).
    // Anomalies connues du fond de carte (étiquette placée au Cap alors que le nom est « Indes néerlandaises »).
    const anomalies = new Set(['espagne/ayacucho-1824|Indes néerlandaises', 'espagne/mexique-1821|Indes néerlandaises']);
    const best = new Map<string, { d: number; max: number; msg: string }>();
    for (const l of labels) {
      const c = capitals[l.name] && validAt(capitals[l.name]!, l.year);
      if (!c) continue;
      const key = `${l.empire}/${l.step}|${l.name}`;
      if (anomalies.has(key)) continue;
      const d = haversine(c.at, l.point);
      const max = l.area >= 1_000_000 ? 4500 : 2500;
      const prev = best.get(key);
      if (!prev || d - max < prev.d - prev.max) best.set(key, { d, max, msg: `${key} -> ${c.city} : ${Math.round(d)} km` });
    }
    const errors = [...best.values()].filter((b) => b.d > b.max).map((b) => b.msg);
    expect(errors).toEqual([]);
  });
});
