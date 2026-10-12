// TEMPORAIRE : remplacé par src/figures/registry.ts (même API) à l'intégration.
import type { Archetype, Faction } from '../types';

export const FACTION_COLORS: Record<Faction, string> = {
  romains: '#a63a2b', latins: '#c2693a', samnites: '#6b7f3a', carthaginois: '#6a3d8f',
  gaulois: '#2f7f8f', 'grecs-macedoniens': '#2a5f9f', germains: '#5a6b3a', 'parthes-perses': '#b8872a',
  egyptiens: '#c9a23a', daces: '#7a5a3a', 'goths-vandales': '#4a5a6a', arabes: '#3a8f5a',
  'turcs-seldjoukides': '#2f6f6f', 'croises-latins': '#8f2a3a', ottomans: '#2f7f4f', byzantins: '#7a2f8f',
};

function disc(color: string, text: string, size: number, dim: boolean): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true">` +
    `<circle cx="16" cy="16" r="14" fill="${color}" stroke="#fff8ec" stroke-width="2" opacity="${dim ? 0.6 : 1}"/>` +
    `<text x="16" y="21" text-anchor="middle" font-size="14" font-family="sans-serif" fill="#fff8ec">${text}</text></svg>`;
}

export function soldierSvg(faction: Faction, frame: 0 | 1, state: 'marche' | 'vaincu' = 'marche'): string {
  const c = state === 'vaincu' ? '#6b6258' : FACTION_COLORS[faction];
  return disc(c, (frame === 0 ? faction[0] : faction[0]?.toLowerCase() ?? '').toUpperCase(), 28, state === 'vaincu');
}

export function characterSvg(archetype: Archetype, tint?: string): string {
  return disc(tint ?? '#5c4a38', (archetype[0] ?? '?').toUpperCase(), 44, false);
}
