import { useEffect, useRef, useState } from 'react';
import { EMPIRES } from '../data/loadEmpire';
import { GOTO_EVENT, type GotoDetail } from '../map/contemporaryLayers';
import { readString, writeString } from '../lib/settings';
import { fetchQuiz, fetchQuizHorsLigne, STATIC_SITE, type Difficulte, type Quiz, type QuizParams, type QuizSource } from './api';
import './quiz.css';

const BEST_KEY = 'atlas.quizBest';
const SERVER_DOWN = STATIC_SITE
  ? "Le quiz rédigé par le sage n'existe que dans la version locale (il faut le serveur Python et une clé). Le quiz hors ligne, lui, marche ici."
  : "Le sage n'est pas lancé : npm run agent";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Empire affiché sur la carte, présélectionné. */
  empire: string;
}

type Phase = 'setup' | 'loading' | 'play' | 'end' | 'down' | 'failed';

function readBest(): number | null {
  const v = Number(readString(BEST_KEY, null));
  return Number.isFinite(v) && v > 0 ? v : null;
}

/** Quiz mené par le sage : une question à la fois, correction immédiate, score final. */
export function QuizDialog({ open, onClose, empire }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [phase, setPhase] = useState<Phase>('setup');
  const [choice, setChoice] = useState(empire);
  const [difficulte, setDifficulte] = useState<Difficulte>('moyen');
  const [n, setN] = useState(5);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [source, setSource] = useState<QuizSource>('sage');
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number | null>(readBest);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setPhase('setup');
      setChoice(empire);
      d.showModal();
    }
    if (!open && d.open) d.close();
    // `empire` n'est lu qu'à l'ouverture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const params = (): QuizParams => ({ empire: choice === 'tous' ? undefined : choice, difficulte, n });

  function start(q: Quiz, s: QuizSource) {
    setQuiz(q);
    setSource(s);
    setIndex(0);
    setPicked(null);
    setScore(0);
    setPhase('play');
  }

  async function launch(offline: boolean) {
    setPhase('loading');
    try {
      const r = offline ? await fetchQuizHorsLigne(params()) : await fetchQuiz(params());
      start(r.quiz, r.source);
    } catch {
      setPhase(offline ? 'failed' : 'down');
    }
  }

  function answer(i: number) {
    if (picked !== null || !quiz) return;
    setPicked(i);
    if (i === quiz.questions[index].bonne_reponse) setScore((s) => s + 1);
  }

  function next() {
    if (!quiz) return;
    if (index + 1 < quiz.questions.length) {
      setIndex(index + 1);
      setPicked(null);
      return;
    }
    if (best === null || score > best) {
      writeString(BEST_KEY, String(score));
      setBest(score);
    }
    setPhase('end');
  }

  function goTo(empireId: string, step: string) {
    window.dispatchEvent(new CustomEvent<GotoDetail>(GOTO_EVENT, { detail: { empire: empireId, step } }));
    onClose();
  }

  const q = quiz?.questions[index];
  const badge = source === 'sage' ? 'par le sage' : 'hors ligne';

  return (
    <dialog
      ref={ref}
      className="about quiz"
      aria-labelledby="quiz-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="about__inner quiz__inner">
        <h2 id="quiz-title">🎓 Quiz du sage</h2>

        {phase === 'setup' && (
          <form
            className="quiz__form"
            onSubmit={(e) => {
              e.preventDefault();
              void launch(false);
            }}
          >
            <label className="quiz__field">
              Empire
              <select value={choice} onChange={(e) => setChoice(e.target.value)}>
                {EMPIRES.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
                <option value="tous">Tous les empires</option>
              </select>
            </label>
            <label className="quiz__field">
              Difficulté
              <select value={difficulte} onChange={(e) => setDifficulte(e.target.value as Difficulte)}>
                <option value="facile">Facile</option>
                <option value="moyen">Moyen</option>
                <option value="difficile">Difficile</option>
              </select>
            </label>
            <label className="quiz__field">
              Nombre de questions
              <select value={n} onChange={(e) => setN(Number(e.target.value))}>
                {[3, 5, 8, 10].map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            {best !== null && <p className="quiz__hint">Meilleur score : {best}</p>}
            <div className="quiz__actions">
              <button type="submit" className="btn">
                Commencer
              </button>
              <button type="button" className="btn btn--ghost" onClick={onClose}>
                Fermer
              </button>
            </div>
          </form>
        )}

        {phase === 'loading' && (
          <p role="status" className="quiz__status">
            Le sage prépare ses questions…
          </p>
        )}

        {(phase === 'down' || phase === 'failed') && (
          <div role="alert" className="quiz__error">
            {phase === 'down' ? (
              <>
                <p>{SERVER_DOWN}</p>
                <p className="quiz__hint">Vous pouvez aussi jouer sans le sage, avec des questions fabriquées depuis les données.</p>
              </>
            ) : (
              <p>
                Impossible de générer un quiz, même hors ligne : le serveur de l'agent ne répond pas. Lancez <code>npm run agent</code> puis réessayez.
              </p>
            )}
            <div className="quiz__actions">
              {phase === 'down' && (
                <button type="button" className="btn" onClick={() => void launch(true)}>
                  Quiz hors ligne
                </button>
              )}
              <button type="button" className="btn btn--ghost" onClick={() => setPhase('setup')}>
                Retour
              </button>
              <button type="button" className="btn btn--ghost" onClick={onClose}>
                Fermer
              </button>
            </div>
          </div>
        )}

        {phase === 'play' && quiz && q && (
          <div className="quiz__play">
            <p className="quiz__meta">
              <span>
                Question {index + 1} / {quiz.questions.length} · score {score}
              </span>
              <span className={`quiz__badge quiz__badge--${source}`}>{badge}</span>
            </p>
            <h3 className="quiz__question" tabIndex={-1} ref={(el) => el?.focus({ preventScroll: true })} key={index}>
              {q.question}
            </h3>
            <div className="quiz__choices">
              {q.choix.map((c, i) => {
                const state = picked === null ? '' : i === q.bonne_reponse ? ' quiz__choice--right' : i === picked ? ' quiz__choice--wrong' : '';
                return (
                  <button
                    key={i}
                    type="button"
                    className={`quiz__choice${state}`}
                    disabled={picked !== null}
                    aria-disabled={picked !== null}
                    onClick={() => answer(i)}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
            <div aria-live="polite" className="quiz__result">
              {picked !== null && (
                <>
                  <p className={picked === q.bonne_reponse ? 'quiz__verdict quiz__verdict--ok' : 'quiz__verdict quiz__verdict--ko'}>
                    {picked === q.bonne_reponse ? 'Bonne réponse !' : `Raté. Bonne réponse : ${q.choix[q.bonne_reponse]}`}
                  </p>
                  <p>{q.explication}</p>
                  <div className="quiz__actions">
                    <button type="button" className="btn btn--ghost" onClick={() => goTo(q.empire, q.etape_id)}>
                      Voir sur la carte
                    </button>
                    <button type="button" className="btn" autoFocus onClick={next}>
                      {index + 1 < quiz.questions.length ? 'Question suivante' : 'Voir mon score'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {phase === 'end' && quiz && (
          <div className="quiz__end">
            <p className="quiz__score" role="status">
              Score : {score} / {quiz.questions.length}
            </p>
            {best !== null && <p className="quiz__hint">Meilleur score : {best}</p>}
            <p className="quiz__meta">
              <span className={`quiz__badge quiz__badge--${source}`}>{badge}</span>
            </p>
            <div className="quiz__actions">
              <button type="button" className="btn" onClick={() => setPhase('setup')}>
                Rejouer
              </button>
              <button type="button" className="btn btn--ghost" onClick={onClose}>
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
}
