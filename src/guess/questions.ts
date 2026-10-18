// Mode « Devine la suite » : une question à choix sur l'étape qui vient, posée avant de l'afficher.
// Hors ligne et déterministe (même étape → même question), à partir des données de la timeline.
import { formatYear } from '../lib/years';
import { choices, qBattle, qYear, rng, shuffle } from '../quiz/questionKit';
import type { QuizQuestion } from '../quiz/api';
import type { Empire } from '../types';

/** Graine stable tirée de l'identifiant d'étape (même question à chaque passage). */
function seedOf(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** « Que se passe-t-il ensuite ? » : le bon titre parmi ceux d'autres étapes (ni l'actuelle, ni la suivante). */
function qNext(r: () => number, e: Empire, from: number, to: number): QuizQuestion | null {
  const cur = e.steps[from]!;
  const next = e.steps[to]!;
  const lures = shuffle(
    r,
    e.steps.filter((_, i) => i !== from && i !== to && Math.abs(i - to) <= 8).map((s) => s.title),
  );
  const c = choices(r, next.title, lures);
  if (!c) return null;
  return {
    question: `Après « ${cur.title} » (${formatYear(cur.year)}), que se passe-t-il ensuite ?`,
    choix: c.choix,
    bonne_reponse: c.i,
    empire: e.id,
    etape_id: next.id,
    explication: `${next.title} (${formatYear(next.year)}). ${next.summary}`,
  };
}

/** L'empire grandit-il ou recule-t-il à l'étape suivante ? (surfaces de stats.json, écart d'au moins 3 %). */
function qArea(e: Empire, from: number, to: number): QuizQuestion | null {
  const a = e.stats?.areas[e.steps[from]!.id];
  const b = e.stats?.areas[e.steps[to]!.id];
  if (!a || !b) return null;
  const ratio = b / a;
  const options = ["Il s'agrandit", 'Il reste à peu près le même', 'Il recule'];
  const good = ratio > 1.03 ? 0 : ratio < 0.97 ? 2 : 1;
  const next = e.steps[to]!;
  return {
    question: `Prochaine étape : « ${next.title} ». Que devient le territoire de l'empire ?`,
    choix: options,
    bonne_reponse: good,
    empire: e.id,
    etape_id: next.id,
    explication: `${options[good]} (${Math.round((ratio - 1) * 100)} % de surface). ${next.summary}`,
  };
}

/**
 * Question sur l'étape `to`, posée depuis l'étape `from`. Selon l'étape : qui l'emporte (bataille),
 * que se passe-t-il ensuite, en quelle année, ou que devient le territoire. Toujours au moins une question.
 */
export function guessQuestion(e: Empire, from: number, to: number): QuizQuestion {
  const next = e.steps[to]!;
  const r = rng(seedOf(next.id));
  const pick = r();
  const candidates = [
    pick < 0.6 ? qBattle(r, e, next, []) : null,
    pick < 0.35 ? qArea(e, from, to) : null,
    pick < 0.7 ? qNext(r, e, from, to) : null,
    qYear(r, e, next),
    qNext(r, e, from, to),
  ];
  // Une question dont l'énoncé contient déjà la réponse (ex. bataille nommée d'après un camp) est écartée.
  const fair = (x: QuizQuestion | null): x is QuizQuestion => !!x && !(x.choix.length > 2 && x.question.includes(x.choix[x.bonne_reponse]!));
  const q = candidates.find(fair);
  if (q) return q;
  // Repli (timeline très courte) : vrai ou faux sur l'année.
  return {
    question: `« ${next.title} » a-t-il lieu en ${formatYear(next.year)} ?`,
    choix: ['Oui', 'Non'],
    bonne_reponse: 0,
    empire: e.id,
    etape_id: next.id,
    explication: next.summary,
  };
}
