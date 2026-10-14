import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const ROOT = join(import.meta.dirname, '..', '..');
export const DATA = join(ROOT, 'data');
export const PUBLIC_EMPIRES = join(ROOT, 'public', 'data', 'empires');

export const readJson = <T = any>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
export const exists = (path: string) => existsSync(path);
export const size = (path: string) => statSync(path).size;

/** Dossiers d'empires disponibles (data/empires/<id>/timeline.json). */
export function empireIds(): string[] {
  return readdirSync(join(DATA, 'empires'), { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(DATA, 'empires', d.name, 'timeline.json')))
    .map((d) => d.name)
    .sort();
}

export const publicFile = (empire: string, ...parts: string[]) => join(PUBLIC_EMPIRES, empire, ...parts);

/** Lit l'en-tête IHDR d'un PNG (sans décoder les pixels). */
export function pngHeader(path: string): { width: number; height: number; bitDepth: number; colorType: number } | null {
  const b = readFileSync(path);
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (b.length < 29 || sig.some((v, i) => b[i] !== v) || b.toString('ascii', 12, 16) !== 'IHDR') return null;
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), bitDepth: b[24]!, colorType: b[25]! };
}

export function coordsOf(g: any): [number, number][] {
  const out: [number, number][] = [];
  const walk = (c: any) => {
    if (typeof c[0] === 'number') out.push([c[0], c[1]]);
    else for (const x of c) walk(x);
  };
  walk(g.coordinates);
  return out;
}

export const validLonLat = ([x, y]: [number, number]) =>
  Number.isFinite(x) && Number.isFinite(y) && x >= -180 && x <= 180 && y >= -90 && y <= 90;
