// Quiz hors ligne côté navigateur : même logique que quiz_hors_ligne (agent/atlas_agent/quiz.py),
// pour la version en ligne sans serveur Python (GitHub Pages). Déterministe pour une graine donnée.
import { EMPIRES } from '../data/loadEmpire';
import { PEOPLE } from '../data/loadPeople';
import { formatYear } from '../lib/years';
import type { City, Empire, Person, TimelineStep } from '../types';
import type { Quiz, QuizQuestion } from './api';

/** Générateur pseudo-aléatoire (mulberry32) : un quiz rejouable à graine égale. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(r: () => number, xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

const plain = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** 4 choix distincts (la bonne réponse + 3 leurres), mélangés ; null s'il manque des leurres. */
function choices(r: () => number, good: string, pool: string[]): { choix: string[]; i: number } | null {
  const lures = [...new Set(pool.filter((p) => p && p !== good))].slice(0, 3);
  if (lures.length < 3) return null;
  const choix = shuffle(r, [good, ...lures]);
  return { choix, i: choix.indexOf(good) };
}

function qYear(r: () => number, e: Empire, s: TimelineStep): QuizQuestion | null {
  const offsets = shuffle(r, [-30, -20, -12, -8, -5, -3, -2, -1, 1, 2, 3, 5, 8, 12, 20, 30]).filter((d) => s.year + d !== 0);
  const c = choices(r, formatYear(s.year), offsets.slice(0, 6).map((d) => formatYear(s.year + d)));
  if (!c) return null;
  return { question: `En quelle année a lieu : « ${s.title} » (${e.name}) ?`, choix: c.choix, bonne_reponse: c.i, empire: e.id, etape_id: s.id, explication: `${s.title} se situe en ${formatYear(s.year)}. ${s.summary}` };
}

function qBattle(r: () => number, e: Empire, s: TimelineStep, others: string[]): QuizQuestion | null {
  const b = s.battle;
  if (!b || b.belligerents.length < 2) return null;
  const winners = [...new Set((s.armies ?? []).filter((a) => a.winner && a.side).map((a) => a.side))];
  const match = (side: string, bel: string) => {
    const first = plain(side).split(/\s+/)[0];
    return !!first && plain(bel).includes(first);
  };
  const cands = b.belligerents.filter((x) => winners.some((w) => match(w, x)));
  if (winners.length !== 1 || cands.length !== 1) return null;
  const good = cands[0]!;
  const same = [...new Set(e.steps.flatMap((x) => x.battle?.belligerents ?? []))].filter((x) => !b.belligerents.includes(x));
  const c = choices(r, good, [...b.belligerents.filter((x) => x !== good), ...shuffle(r, same).slice(0, 4), ...shuffle(r, others).slice(0, 3)]);
  if (!c) return null;
  return { question: `Qui remporte l'épisode « ${s.title} » ?`, choix: c.choix, bonne_reponse: c.i, empire: e.id, etape_id: s.id, explication: `${good} l'emporte. Issue : ${b.outcome}. (${formatYear(s.year)}, ${s.title})` };
}

function qCapital(r: () => number, e: Empire, s: TimelineStep, cities: City[]): QuizQuestion | null {
  const isCap = (c: City) => (c.capitalOf ?? []).some((k) => k.empire === e.id && k.from <= s.year && s.year <= k.to);
  const good = cities.find(isCap);
  if (!good) return null;
  const c = choices(r, good.modern, shuffle(r, cities.filter((x) => !isCap(x) && x.rank <= 2).map((x) => x.modern)).slice(0, 6));
  if (!c) return null;
  return { question: `Quelle était la capitale de ${e.name} en ${formatYear(s.year)} ?`, choix: c.choix, bonne_reponse: c.i, empire: e.id, etape_id: s.id, explication: `En ${formatYear(s.year)}, la capitale est ${good.modern} (étape : ${s.title}).` };
}

function qPerson(r: () => number, e: Empire, p: Person, all: (Person & { empire: string })[]): QuizQuestion | null {
  const s = e.steps.find((x) => x.figures?.some((f) => f.person === p.id));
  if (!s || !p.title) return null;
  if (plain(p.name).split(/\s+/).some((w) => w.length > 3 && plain(p.title).includes(w))) return null; // l'énoncé donnerait la réponse
  const same = shuffle(r, all.filter((x) => x.empire === e.id && x.id !== p.id).map((x) => x.name)).slice(0, 3);
  const others = shuffle(r, all.filter((x) => x.empire !== e.id).map((x) => x.name)).slice(0, 3);
  const c = choices(r, p.name, [...same, ...others]);
  if (!c) return null;
  return { question: `Quel personnage est décrit ainsi : « ${p.title} » ?`, choix: c.choix, bonne_reponse: c.i, empire: e.id, etape_id: s.id, explication: `Il s'agit de ${p.name}, présent à l'étape « ${s.title} » (${formatYear(s.year)}).` };
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
