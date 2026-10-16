/** Client du quiz mené par le sage (voir agent/atlas_agent/quiz.py). */

export interface QuizQuestion {
  question: string;
  choix: string[];
  bonne_reponse: number;
  explication: string;
  empire: string;
  etape_id: string;
}

export interface Quiz {
  titre: string;
  questions: QuizQuestion[];
}

export type QuizSource = 'sage' | 'hors_ligne';
export type Difficulte = 'facile' | 'moyen' | 'difficile';

export interface QuizResponse {
  source: QuizSource;
  quiz: Quiz;
}

export interface QuizParams {
  /** Identifiant d'empire, ou undefined pour « tous ». */
  empire?: string;
  difficulte: Difficulte;
  n: number;
}

/** Vérifie la forme minimale reçue : un serveur absent ou un proxy HTML ne doit pas casser le dialogue. */
function parse(data: unknown): QuizResponse {
  const r = data as QuizResponse;
  const ok =
    r && (r.source === 'sage' || r.source === 'hors_ligne') && Array.isArray(r.quiz?.questions) && r.quiz.questions.length > 0 &&
    r.quiz.questions.every((q) => Array.isArray(q.choix) && q.choix.length === 4 && q.bonne_reponse >= 0 && q.bonne_reponse < 4);
  if (!ok) throw new Error('réponse de quiz invalide');
  return r;
}

export async function fetchQuiz(p: QuizParams): Promise<QuizResponse> {
  const res = await fetch('/api/quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ empire: p.empire ?? null, difficulte: p.difficulte, n: p.n }),
  });
  if (!res.ok) throw new Error(String(res.status));
  return parse(await res.json());
}

export async function fetchQuizHorsLigne(p: QuizParams): Promise<QuizResponse> {
  const qs = new URLSearchParams({ n: String(p.n) });
  if (p.empire) qs.set('empire', p.empire);
  const res = await fetch(`/api/quiz/hors-ligne?${qs}`);
  if (!res.ok) throw new Error(String(res.status));
  return parse(await res.json());
}
