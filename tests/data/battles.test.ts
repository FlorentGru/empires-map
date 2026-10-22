import { describe, expect, it } from 'vitest';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { BattleScenario, BattleTroopsFile, BattlePoint } from '../../src/types-battle';
import { DATA, readJson, itAll } from './helpers';

const BATTLES = join(DATA, 'battles');
const troopsFile = readJson<BattleTroopsFile>(join(BATTLES, 'troops.json'));
const scenarioIds = readdirSync(join(BATTLES, 'scenarios'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''))
  .sort();

const step = (empire: string, stepId: string) =>
  readJson(join(DATA, 'empires', empire, 'timeline.json')).steps.find((s: { id: string }) => s.id === stepId);

const inField = ([x, y]: BattlePoint) => x >= 0 && x <= 100 && y >= 0 && y <= 60;

describe('data/battles', () => {
  itAll('troops.json « %s » : étape, armées et effectifs', Object.entries(troopsFile), (key, entry) => {
    const [empire, stepId] = key.split('/');
    const s = step(empire!, stepId!);
    expect(s, 'étape introuvable').toBeTruthy();
    expect(s.battle, 'pas de battle').toBeTruthy();
    expect(Array.isArray(s.armies) && s.armies.length > 0, 'pas d\'armies').toBe(true);
    expect(entry.troops.length, 'longueur != armies').toBe(s.armies.length);
    for (const n of entry.troops) expect(Number.isInteger(n) && n > 0, `effectif invalide ${n}`).toBe(true);
  });

  describe.each(scenarioIds)('scénario %s', (stepId) => {
    const scenario = readJson<BattleScenario>(join(BATTLES, 'scenarios', `${stepId}.json`));
    const entries = Object.entries(troopsFile).filter(([k]) => k.split('/')[1] === stepId);

    it('a une entrée dans troops.json', () => expect(entries.length).toBeGreaterThan(0));

    it('est cohérent (unités, mouvements, bornes)', () => {
      const ids = scenario.units.map((u) => u.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(scenario.units.length).toBeGreaterThanOrEqual(4);
      for (const u of scenario.units) expect(inField(u.at), `départ ${u.id}`).toBe(true);
      for (const d of scenario.decor ?? []) for (const p of d.points) expect(inField(p), `décor ${d.label}`).toBe(true);
      expect(scenario.phases.length).toBeGreaterThanOrEqual(3);
      const last = new Map<string, number>();
      for (const [i, ph] of scenario.phases.entries()) {
        expect(ph.duration, `durée phase ${i}`).toBeGreaterThan(0);
        expect(ph.label.length, `label phase ${i}`).toBeGreaterThan(20);
        for (const [id, m] of Object.entries(ph.moves)) {
          expect(ids, `unité inconnue ${id}`).toContain(id);
          if (m.to) expect(inField(m.to), `${id} phase ${i}`).toBe(true);
          if (m.losses !== undefined) {
            expect(m.losses, `${id} pertes`).toBeGreaterThanOrEqual(0);
            expect(m.losses, `${id} pertes`).toBeLessThanOrEqual(1);
            expect(m.losses, `${id} pertes décroissantes`).toBeGreaterThanOrEqual(last.get(id) ?? 0);
            last.set(id, m.losses);
          }
        }
      }
    });

    it('actions de combat cohérentes (feu / baïonnette)', () => {
      const kind = new Map(scenario.units.map((u) => [u.id, u.kind]));
      const state = new Map<string, string>();
      for (const [i, ph] of scenario.phases.entries()) {
        for (const [id, m] of Object.entries(ph.moves)) {
          if (m.state) state.set(id, m.state);
          if (!m.action) continue;
          expect(state.get(id), `${id} phase ${i} : action hors combat`).toBe('combat');
          if (kind.get(id) === 'artillerie') expect(m.action, `${id} : artillerie en baïonnette`).not.toBe('baionnette');
        }
      }
    });

    it.runIf(['austerlitz-1805', 'waterloo-1815', 'rocroi-1643'].includes(stepId))('a de l\'artillerie', () => {
      expect(scenario.units.some((u) => u.kind === 'artillerie')).toBe(true);
    });

    it.each(entries)('%s : armées et effectifs', (key, entry) => {
      const [empire] = key.split('/');
      const s = step(empire!, stepId);
      for (const u of scenario.units) expect(u.army, u.id).toBeLessThan(s.armies.length);
      const per = new Map<number, number>();
      for (const u of scenario.units) per.set(u.army, (per.get(u.army) ?? 0) + u.troops);
      for (const [a, n] of per) {
        const ratio = n / entry.troops[a]!;
        expect(ratio, `armée ${a}: ${n} / ${entry.troops[a]}`).toBeGreaterThanOrEqual(0.8);
        expect(ratio, `armée ${a}: ${n} / ${entry.troops[a]}`).toBeLessThanOrEqual(1.2);
      }
      // Le camp perdant (sans winner) finit en fuite : au moins une unité en fuite à la dernière phase.
      const losers = new Set<number>(s.armies.map((a: { winner?: boolean }, i: number) => (a.winner ? -1 : i)).filter((i: number) => i >= 0));
      const state = new Map<string, string>();
      for (const ph of scenario.phases) for (const [id, m] of Object.entries(ph.moves)) if (m.state) state.set(id, m.state);
      const lastMoves = scenario.phases.at(-1)!.moves;
      const fleeing = scenario.units.filter((u) => losers.has(u.army) && state.get(u.id) === 'fuite');
      expect(fleeing.length, 'aucune unité perdante en fuite').toBeGreaterThan(0);
      expect(
        scenario.units.some((u) => losers.has(u.army) && lastMoves[u.id]?.state === 'fuite'),
        'pas de fuite dans la dernière phase',
      ).toBe(true);
    });
  });
});
