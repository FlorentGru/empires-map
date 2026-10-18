// Briques communes aux questions générées hors ligne (quiz du sage, mode « Devine la suite ») :
// aucune donnée importée ici, pour rester léger dans le JS initial.
import { formatYear } from '../lib/years';
import type { Empire, TimelineStep } from '../types';
import type { QuizQuestion } from './api';

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

export function shuffle<T>(r: () => number, xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export const plain = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** 4 choix distincts (la bonne réponse + 3 leurres), mélangés ; null s'il manque des leurres. */
export function choices(r: () => number, good: string, pool: string[]): { choix: string[]; i: number } | null {
  const lures = [...new Set(pool.filter((p) => p && p !== good))].slice(0, 3);
  if (lures.length < 3) return null;
  const choix = shuffle(r, [good, ...lures]);
  return { choix, i: choix.indexOf(good) };
}

export function qYear(r: () => number, e: Empire, s: TimelineStep): QuizQuestion | null {
  const offsets = shuffle(r, [-30, -20, -12, -8, -5, -3, -2, -1, 1, 2, 3, 5, 8, 12, 20, 30]).filter((d) => s.year + d !== 0);
  const c = choices(
    r,
    formatYear(s.year),
    offsets.slice(0, 6).map((d) => formatYear(s.year + d)),
  );
  if (!c) return null;
  return {
    question: `En quelle année a lieu : « ${s.title} » (${e.name}) ?`,
    choix: c.choix,
    bonne_reponse: c.i,
    empire: e.id,
    etape_id: s.id,
    explication: `${s.title} se situe en ${formatYear(s.year)}. ${s.summary}`,
  };
}

export function qBattle(r: () => number, e: Empire, s: TimelineStep, others: string[]): QuizQuestion | null {
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
  return {
    question: `Qui remporte l'épisode « ${s.title} » ?`,
    choix: c.choix,
    bonne_reponse: c.i,
    empire: e.id,
    etape_id: s.id,
    explication: `${good} l'emporte. Issue : ${b.outcome}. (${formatYear(s.year)}, ${s.title})`,
  };
}
