import { useEffect, useMemo, useRef, useState } from 'react';
import type { Player } from '../player/usePlayer';
import type { Empire } from '../types';
import { guessQuestion } from './questions';
import './guess.css';

interface Props {
  empire: Empire;
  player: Player;
}

/**
 * Mode « Devine la suite » : carte posée au-dessus de la frise quand le lecteur attend une réponse
 * (player.asking). Après le choix : verdict et explication, puis « Voir la suite » affiche l'étape.
 */
export function GuessCard({ empire, player }: Props) {
  const [score, setScore] = useState({ good: 0, total: 0 });
  const [picked, setPicked] = useState<number | null>(null);
  const target = player.asking;
  const from = player.index;
  const q = useMemo(() => (target === null ? null : guessQuestion(empire, from, target)), [empire, from, target]);
  const firstChoice = useRef<HTMLButtonElement>(null);
  const goOn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setPicked(null);
    if (q) firstChoice.current?.focus({ preventScroll: true });
  }, [q]);

  useEffect(() => {
    if (picked !== null) goOn.current?.focus({ preventScroll: true });
  }, [picked]);

  if (!player.guess) return null;
  const scoreLabel = score.total > 0 ? `${score.good} / ${score.total}` : null;
  if (!q) {
    return scoreLabel ? (
      <div className="guess-score" aria-live="polite">
        🎯 Devine la suite : {scoreLabel}
      </div>
    ) : null;
  }

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    setScore((s) => ({ good: s.good + (i === q.bonne_reponse ? 1 : 0), total: s.total + 1 }));
  };

  return (
    <section className="guess-card" role="dialog" aria-label="Devine la suite" aria-live="polite">
      <header className="guess-card__head">
        <span className="guess-card__badge">🎯 Devine la suite</span>
        {scoreLabel && <span className="guess-card__score">Score : {scoreLabel}</span>}
      </header>
      <p className="guess-card__question">{q.question}</p>
      <div className="guess-card__choices">
        {q.choix.map((c, i) => {
          const state = picked === null ? '' : i === q.bonne_reponse ? ' guess-card__choice--right' : i === picked ? ' guess-card__choice--wrong' : '';
          return (
            <button
              key={c}
              ref={i === 0 ? firstChoice : undefined}
              type="button"
              className={`guess-card__choice${state}`}
              disabled={picked !== null}
              onClick={() => choose(i)}
            >
              {c}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <>
          <p className="guess-card__verdict">
            <strong>{picked === q.bonne_reponse ? 'Bien vu !' : `Raté : c'était « ${q.choix[q.bonne_reponse]} ».`}</strong> {q.explication}
          </p>
          <button ref={goOn} type="button" className="btn guess-card__go" onClick={player.answered}>
            Voir la suite →
          </button>
        </>
      )}
    </section>
  );
}

/** Bouton de la frise qui active ou coupe le mode. */
export function GuessButton({ player, disabled }: { player: Player; disabled?: boolean }) {
  return (
    <button
      type="button"
      className="btn story-btn guess-btn"
      aria-pressed={player.guess}
      disabled={disabled}
      title={disabled ? 'Indisponible pendant le mode Histoire' : 'Une question avant chaque étape : devinerez-vous la suite ?'}
      onClick={() => player.setGuess(!player.guess)}
    >
      🎯 <span className="story-btn__label">Devine la suite</span>
    </button>
  );
}
