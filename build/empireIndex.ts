// Module virtuel « virtual:empire-index » : métadonnées légères de chaque empire (id, nom, couleur, dates,
// description), calculées au build depuis data/empires/<id>/timeline.json. Le code de démarrage n'importe ainsi
// aucune timeline complète : elles sont chargées à la demande (src/data/loadEmpire.ts).
import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

const ID = 'virtual:empire-index';
const RESOLVED = '\0' + ID;

export function empireIndex(root = process.cwd()): Plugin {
  const dir = path.join(root, 'data', 'empires');
  return {
    name: 'empire-index',
    resolveId: (id) => (id === ID ? RESOLVED : undefined),
    load(id) {
      if (id !== RESOLVED) return;
      const list = [];
      for (const name of fs.readdirSync(dir)) {
        const file = path.join(dir, name, 'timeline.json');
        if (!fs.existsSync(file)) continue;
        this.addWatchFile(file);
        const t = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (typeof t.id !== 'string' || !Array.isArray(t.steps) || t.steps.length === 0) continue;
        list.push({ id: t.id, name: t.name, color: t.color, start: t.start, end: t.end, description: t.description ?? '' });
      }
      return `export default ${JSON.stringify(list)};`;
    },
  };
}
