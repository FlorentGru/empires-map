// Quiz hors ligne côté navigateur : même logique que quiz_hors_ligne (agent/atlas_agent/quiz.py),
// pour la version en ligne sans serveur Python (GitHub Pages). Déterministe pour une graine donnée.
import { EMPIRES } from '../data/loadEmpire';
import { PEOPLE } from '../data/loadPeople';
import { formatYear } from '../lib/years';
import type { City, Empire, Person, TimelineStep } from '../types';
import type { Quiz, QuizQuestion } from './api';
import { choices, plain, qBattle, qYear, rng, shuffle } from './questionKit';

export { rng } from './questionKit';

function qCapital(r: () => number, e: Empire, s: TimelineStep, cities: City[]): QuizQuestion | null {
  const isCap = (c: City) => (c.capitalOf ?? []).some((k) => k.empire === e.id && k.from <= s.year && s.year <= k.to);
  const good = cities.find(isCap);
  if (!good) return null;
  const c = choices(
    r,
    good.modern,
    shuffle(
      r,
      cities.filter((x) => !isCap(x) && x.rank <= 2).map((x) => x.modern),
    ).slice(0, 6),
  );
  if (!c) return null;
  return {
    question: `Quelle était la capitale de ${e.name} en ${formatYear(s.year)} ?`,
    choix: c.choix,
    bonne_reponse: c.i,
    empire: e.id,
    etape_id: s.id,
    explication: `En ${formatYear(s.year)}, la capitale est ${good.modern} (étape : ${s.title}).`,
  };
}

function qPerson(r: () => number, e: Empire, p: Person, all: (Person & { empire: string })[]): QuizQuestion | null {
  const s = e.steps.find((x) => x.figures?.some((f) => f.person === p.id));
  if (!s || !p.title) return null;
  if (
    plain(p.name)
      .split(/\s+/)
      .some((w) => w.length > 3 && plain(p.title).includes(w))
  )
    return null; // l'énoncé donnerait la réponse
  const same = shuffle(
    r,
    all.filter((x) => x.empire === e.id && x.id !== p.id).map((x) => x.name),
  ).slice(0, 3);
  const others = shuffle(
    r,
    all.filter((x) => x.empire !== e.id).map((x) => x.name),
  ).slice(0, 3);
  const c = choices(r, p.name, [...same, ...others]);
  if (!c) return null;
  return {
    question: `Quel personnage est décrit ainsi : « ${p.title} » ?`,
    choix: c.choix,
    bonne_reponse: c.i,
    empire: e.id,
    etape_id: s.id,
    explication: `Il s'agit de ${p.name}, présent à l'étape « ${s.title} » (${formatYear(s.year)}).`,
  };
}

/** Quiz de n questions, en alternant les types (année, bataille, capitale, personnage) sans répéter d'étape si possible. */
export function offlineQuiz(empireId: string | undefined, n: number, cities: City[], seed = Date.now()): Quiz {
  const r = rng(seed);
  const empires = empireId ? EMPIRES.filter((e) => e.id === empireId) : EMPIRES;
  const allPeople = Object.entries(PEOPLE).flatMap(([empire, ps]) => ps.map((p) => ({ ...p, empire })));
  const piles: Record<string, QuizQuestion[]> = { annee: [], bataille: [], capitale: [], personnage: [] };
  for (const e of empires) {
    const others = [...new Set(EMPIRES.filter((x) => x.id !== e.id).flatMap((x) => x.steps.flatMap((s) => s.battle?.belligerents ?? [])))];
    for (const s of shuffle(r, e.steps)) {
      const a = qYear(r, e, s);
      const b = qBattle(r, e, s, others);
      const c = qCapital(r, e, s, cities);
      if (a) piles.annee!.push(a);
      if (b) piles.bataille!.push(b);
      if (c) piles.capitale!.push(c);
    }
    for (const p of shuffle(r, PEOPLE[e.id] ?? [])) {
      const q = qPerson(r, e, p, allPeople);
      if (q) piles.personnage!.push(q);
    }
  }
  for (const k of Object.keys(piles)) piles[k] = shuffle(r, piles[k]!);
  const out: QuizQuestion[] = [];
  const seen = new Set<string>();
  for (const allowDup of [false, true]) {
    let progress = true;
    while (out.length < n && progress) {
      progress = false;
      for (const k of Object.keys(piles)) {
        if (out.length >= n) break;
        const pile = piles[k]!;
        const i = pile.findIndex((q) => allowDup || !seen.has(`${q.empire}/${q.etape_id}`));
        if (i >= 0) {
          const [q] = pile.splice(i, 1);
          seen.add(`${q!.empire}/${q!.etape_id}`);
          out.push(q!);
          progress = true;
        }
      }
    }
  }
  const name = empireId ? (EMPIRES.find((e) => e.id === empireId)?.name ?? empireId) : 'tous les empires';
  return { titre: `Quiz : ${name}`, questions: out };
}
