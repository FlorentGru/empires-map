// Budget du chargement initial : JS que le navigateur télécharge avant d'afficher l'Atlas
// (scripts et modulepreload de dist/index.html), mesuré compressé (gzip), comme sur le réseau.
// Usage : npm run check:bundle (après npx vite build).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const DIST = path.resolve(import.meta.dirname, '..', 'dist');
// 460 Ko : les SVG des figurines (src/figures/) grossissent à chaque empire, donc ils sont chargés à la demande
// (src/map/sprites.ts) et hors du JS initial. La CI mesure ~2 Ko de plus qu'en local : garder de la marge.
const BUDGET_KB = Number(process.env.BUNDLE_BUDGET_KB ?? 460);

const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const files = [...html.matchAll(/(?:src|href)="[^"]*?(assets\/[^"]+\.js)"/g)].map((m) => m[1]!);
let total = 0;
for (const f of new Set(files)) {
  const kb = zlib.gzipSync(fs.readFileSync(path.join(DIST, f))).length / 1024;
  total += kb;
  console.log(`${kb.toFixed(1).padStart(8)} Ko  ${f}`);
}
console.log(`${total.toFixed(1).padStart(8)} Ko  total initial (budget ${BUDGET_KB} Ko)`);
if (total > BUDGET_KB) {
  console.error(`✗ Le JS initial dépasse le budget de ${(total - BUDGET_KB).toFixed(1)} Ko.`);
  process.exit(1);
}
