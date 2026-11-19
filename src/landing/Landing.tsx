import { useEffect, useRef, useState } from 'react';
import { formatYear } from '../lib/years';
import type { EmpireMeta } from '../types';
import './landing.css';

interface Props {
  empires: EmpireMeta[];
  /** Démarrer déjà cliqué : la liste des empires d'emblée (au retour de la frise, l'accueil est remonté). */
  choosing: boolean;
  onStart: () => void;
  /** Empire choisi : l'Atlas bascule dessus (l'accueil se ferme une fois sa timeline chargée). */
  onChoose: (id: string) => void;
  /** Échap : l'Atlas reste sur l'empire déjà affiché. */
  onClose: () => void;
  onOpenAllEmpires: () => void;
  onOpenWorld: () => void;
}

/** Accueil de « / », posé par-dessus l'Atlas : la carte se charge derrière pendant que le visiteur lit et choisit. */
export function Landing({ empires, choosing, onStart, onChoose, onClose, onOpenAllEmpires, onOpenWorld }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [emblems, setEmblems] = useState<Record<string, { svg: string }>>({});

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  // Emblèmes hors du JS initial (chunk partagé avec la page « Tous les empires »).
  useEffect(() => {
    void import('../empires/emblems').then((m) => setEmblems(m.EMBLEMS));
  }, []);

  return (
    <dialog ref={ref} className="landing" aria-labelledby="landing-title" onClose={onClose}>
      <div className="landing__inner">
        <h1 id="landing-title" className="landing__title">
          Atlas des Empires
        </h1>
        {!choosing ? (
          <>
            <p className="landing__lead">
              Suivez étape par étape l’évolution des frontières, les batailles et les grands personnages de {empires.length} empires, sur une carte animée en
              relief.
            </p>
            <button type="button" className="btn landing__start" onClick={onStart}>
              Démarrer
            </button>
          </>
        ) : (
          <>
            <h2 className="landing__subtitle">Choisissez un empire</h2>
            <ul className="landing__grid">
              {empires.map((e, i) => (
                <li key={e.id}>
                  <button
                    type="button"
                    className="landing__empire"
                    style={{ '--c': e.color } as React.CSSProperties}
                    autoFocus={i === 0}
                    onClick={() => onChoose(e.id)}
                  >
                    <span className="landing__emblem" aria-hidden="true" dangerouslySetInnerHTML={{ __html: emblems[e.id]?.svg ?? '' }} />
                    <span className="landing__name">{e.name}</span>
                    <span className="landing__dates">
                      {formatYear(e.start)} – {formatYear(e.end)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="landing__more">
              <button type="button" className="btn" onClick={onOpenAllEmpires}>
                Tous les empires sur une frise
              </button>
              <button type="button" className="btn" onClick={onOpenWorld}>
                Le monde en l’an…
              </button>
            </p>
          </>
        )}
      </div>
    </dialog>
  );
}
