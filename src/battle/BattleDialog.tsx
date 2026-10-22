import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { battleTroops, loadBattleScenario } from '../data/loadBattles';
import { prefersReducedMotion } from '../lib/motion';
import { formatYear } from '../lib/years';
import type { TimelineStep } from '../types';
import type { BattleScenario } from '../types-battle';
import { durationOf, genericScenario, phaseStart, scaleFor, stateAt, totalTroops } from './engine';
import { drawBattle, fitCanvas } from './render';
import { loadSprites, type FactionSprites } from './sprites';
import './battle.css';

interface Props {
  empireId: string;
  step: TimelineStep;
  /** Bouton qui a ouvert la fenêtre : il récupère le focus à la fermeture. */
  opener: HTMLElement | null;
  onClose: () => void;
}

interface Loaded {
  scenario: BattleScenario;
  historic: boolean;
  sprites: FactionSprites[];
}

const SPEEDS = [0.5, 1, 2];
const fmt = (n: number) => n.toLocaleString('fr-FR').replace(/ /g, ' ');

/**
 * « Voir la bataille » : fenêtre modale qui rejoue une bataille sur un canvas, avec les figurines de chaque peuple.
 * Scénario historique (data/battles/scenarios/<étape>.json) ou, à défaut, simulation schématique déduite des armées.
 */
export function BattleDialog({ empireId, step, opener, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const troops = battleTroops(empireId, step.id);
  const biome = troops?.biome;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [speed, setSpeed] = useState(1);
  const [phase, setPhase] = useState(0);
  const [ended, setEnded] = useState(false);
  const [closing, setClosing] = useState(false);
  // Temps courant (secondes à vitesse ×1) : dans une ref, la boucle d'animation ne passe pas par React.
  const timeRef = useRef(0);
  const speedRef = useRef(1);
  const playingRef = useRef(playing);
  useEffect(() => {
    speedRef.current = speed;
    playingRef.current = playing;
  }, [speed, playing]);

  // Ouverture modale ; Échap ferme avec l'animation de sortie.
  const close = useCallback(() => {
    if (closing) return;
    const d = dialogRef.current;
    if (prefersReducedMotion() || !d) {
      d?.close();
      onClose();
      opener?.focus();
      return;
    }
    setClosing(true);
    window.setTimeout(() => {
      d.close();
      onClose();
      opener?.focus();
    }, 200);
  }, [closing, onClose, opener]);

  useEffect(() => {
    const d = dialogRef.current;
    if (d && !d.open) d.showModal();
  }, []);

  // Chargement : scénario historique ou générique, et figurines de chaque peuple.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const hist = await loadBattleScenario(step.id);
        const scenario = hist ?? genericScenario(step, troops?.troops ?? []);
        const sprites = await Promise.all((step.armies ?? []).map((a) => loadSprites(a.faction)));
        if (!cancelled) setLoaded({ scenario, historic: !!hist, sprites });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, troops]);

  const scale = useMemo(() => (loaded ? scaleFor(totalTroops(loaded.scenario)) : 100), [loaded]);
  const duration = useMemo(() => (loaded ? durationOf(loaded.scenario) : 0), [loaded]);
  const factions = useMemo(() => (step.armies ?? []).map((a) => a.faction), [step]);

  // Boucle d'animation : arrêtée à la fermeture (démontage) et pendant que l'onglet est caché.
  useEffect(() => {
    if (!loaded) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let raf = 0;
    let last: number | null = null;
    let lastPhase = -1;
    const paint = () => {
      const fit = fitCanvas(canvas);
      if (!fit) return;
      const frame = stateAt(loaded.scenario, scale, timeRef.current, factions);
      drawBattle(fit.ctx, fit.w, fit.h, loaded.scenario, frame, loaded.sprites, biome);
      if (frame.phase !== lastPhase) {
        lastPhase = frame.phase;
        setPhase(frame.phase);
      }
      if (barRef.current) barRef.current.style.setProperty('--p', String(duration ? timeRef.current / duration : 0));
    };
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (playingRef.current && last !== null) {
        timeRef.current = Math.min(duration, timeRef.current + ((now - last) / 1000) * speedRef.current);
        if (timeRef.current >= duration) {
          setPlaying(false);
          setEnded(true);
        }
      }
      last = now;
      paint();
    };
    const onVisibility = () => {
      last = null;
      if (document.hidden) cancelAnimationFrame(raf);
      else raf = requestAnimationFrame(tick);
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('resize', paint);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', paint);
    };
  }, [loaded, scale, duration, factions, biome]);

  const seek = (t: number) => {
    timeRef.current = Math.max(0, Math.min(duration, t));
    setEnded(false);
  };
  const restart = () => {
    seek(0);
    setPlaying(true);
  };
  const toggle = () => {
    if (ended) return restart();
    setPlaying((p) => !p);
  };

  const date = formatYear(step.year);
  const phases = loaded?.scenario.phases ?? [];

  return (
    <dialog
      ref={dialogRef}
      className={`battle-dialog${closing ? ' is-closing' : ''}`}
      data-testid="battle-dialog"
      aria-labelledby="battle-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="battle-dialog__frame">
        <span className="battle-dialog__seal" aria-hidden="true">
          ⚔
        </span>
        <button type="button" className="battle-dialog__close" onClick={close} aria-label="Fermer la bataille">
          ✕
        </button>
        <header className="battle-dialog__head">
          <h2 id="battle-title">{step.title}</h2>
          <p className="battle-dialog__date">{date}</p>
          {loaded && (
            <p className="battle-dialog__meta">
              <span className={`battle-dialog__badge${loaded.historic ? ' is-historic' : ''}`} data-testid="battle-kind">
                {loaded.historic ? 'Scénario historique' : 'Simulation schématique'}
              </span>
              <span>1 figurine ≈ {fmt(scale)} hommes</span>
            </p>
          )}
          <ul className="battle-dialog__legend">
            {(step.armies ?? []).map((a, i) => (
              <li key={`${a.side}-${i}`}>
                {loaded && <img src={loaded.sprites[i]?.url} alt="" width={20} height={25} />}
                <span className="battle-dialog__swatch" style={{ background: loaded?.sprites[i]?.color }} aria-hidden="true" />
                <strong>{a.side}</strong>
                {troops?.troops[i] !== undefined && (
                  <span>
                    {' '}
                    ≈ {fmt(troops.troops[i]!)}
                    {troops.uncertain ? ' (chiffres incertains)' : ''}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </header>

        <div className="battle-dialog__stage">
          <canvas ref={canvasRef} data-testid="battle-canvas" role="img" aria-label={`Simulation animée : ${step.title}`} />
          {!loaded && <p className="battle-dialog__loading">{failed ? 'Impossible de charger la bataille.' : 'Les armées se rassemblent…'}</p>}
        </div>

        {loaded && (
          <>
            <div className="battle-dialog__controls">
              <button type="button" className="btn" onClick={toggle} data-testid="battle-play" aria-pressed={playing}>
                {playing ? '⏸ Pause' : ended ? '↺ Rejouer' : '▶ Lecture'}
              </button>
              <button type="button" className="btn" onClick={restart} data-testid="battle-restart">
                ⏮ Recommencer
              </button>
              <span className="battle-dialog__speeds" role="group" aria-label="Vitesse">
                {SPEEDS.map((s) => (
                  <button key={s} type="button" className="btn" aria-pressed={speed === s} onClick={() => setSpeed(s)}>
                    ×{String(s).replace('.', ',')}
                  </button>
                ))}
              </span>
            </div>

            <div className="battle-dialog__phases">
              <span ref={barRef} className="battle-dialog__progress" aria-hidden="true" />
              {phases.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  className={i === phase ? 'is-current' : undefined}
                  style={{ flexGrow: Math.max(0.001, p.duration) }}
                  aria-label={`Phase ${i + 1} : ${p.label}`}
                  aria-current={i === phase ? 'step' : undefined}
                  onClick={() => {
                    seek(phaseStart(loaded.scenario, i));
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <p className="battle-dialog__narration" aria-live="polite" data-testid="battle-narration">
              {phases[phase]?.label}
            </p>
            {ended && step.battle?.outcome && (
              <p className="battle-dialog__outcome" data-testid="battle-outcome">
                <strong>Issue :</strong> {step.battle.outcome}
              </p>
            )}
            {loaded.scenario.sources && loaded.scenario.sources.length > 0 && (
              <p className="battle-dialog__sources">Sources : {loaded.scenario.sources.join(' ; ')}</p>
            )}
          </>
        )}
      </div>
    </dialog>
  );
}
