import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';

/** Crans du tiroir : replié (date, titre, bouton bataille), mi-hauteur (résumé), plein (récit complet). */
export type SheetSnap = 'peek' | 'half' | 'full';

const ORDER: SheetSnap[] = ['peek', 'half', 'full'];
const LABEL: Record<SheetSnap, string> = { peek: 'replié', half: 'à mi-hauteur', full: 'déplié' };

/** Hauteur (px) de chaque cran pour une zone disponible `avail` (entre la barre du haut et la frise). */
function heights(avail: number): Record<SheetSnap, number> {
  return { peek: Math.min(150, avail), half: Math.round(avail * 0.5), full: avail };
}

/** Distance (px) en deçà de laquelle un appui sur la poignée est un clic, pas un glissé. */
const TAP_PX = 6;

interface Props {
  snap: SheetSnap;
  onSnap: (s: SheetSnap) => void;
  /** Titre lu par les lecteurs d'écran sur la poignée. */
  title?: string;
  children: ReactNode;
}

/**
 * Tiroir du bas, sur téléphone (comme Google Maps) : la carte reste plein écran et manipulable au-dessus.
 * La poignée se glisse au doigt (pointer events) ; un clic, Entrée ou Espace passe au cran suivant, ↑ et ↓ montent et descendent.
 */
export function BottomSheet({ snap, onSnap, title, children }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  // Hauteur suivie pendant le glissé (null : celle du cran, posée par le CSS).
  const [drag, setDrag] = useState<number | null>(null);
  const start = useRef<{ y: number; h: number; avail: number; moved: boolean } | null>(null);

  // Le contenu repart du haut quand on replie le tiroir (le résumé reste visible).
  useEffect(() => {
    if (snap !== 'full') rootRef.current?.querySelector('.event-panel__body')?.scrollTo({ top: 0 });
  }, [snap]);

  const available = () => {
    const parent = rootRef.current?.parentElement;
    const top = document.querySelector('.top-bar')?.getBoundingClientRect().bottom ?? 60;
    const bottom = document.querySelector('.timeline')?.getBoundingClientRect().top ?? parent?.clientHeight ?? window.innerHeight;
    return Math.max(120, bottom - top - 8);
  };

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { y: e.clientY, h: rootRef.current?.getBoundingClientRect().height ?? 0, avail: available(), moved: false };
  };
  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const s = start.current;
    if (!s) return;
    const dy = s.y - e.clientY;
    if (!s.moved && Math.abs(dy) < TAP_PX) return;
    s.moved = true;
    setDrag(Math.min(s.avail, Math.max(heights(s.avail).peek * 0.6, s.h + dy)));
  };
  const onPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    const s = start.current;
    start.current = null;
    if (!s) return;
    if (!s.moved) {
      // Clic : cran suivant, et du plein on revient au replié.
      onSnap(ORDER[(ORDER.indexOf(snap) + 1) % ORDER.length]!);
      return;
    }
    // Glissé : le cran le plus proche de la hauteur relâchée.
    const h = s.h + (s.y - e.clientY);
    const hs = heights(s.avail);
    const nearest = ORDER.reduce((best, k) => (Math.abs(hs[k] - h) < Math.abs(hs[best] - h) ? k : best), snap);
    setDrag(null);
    onSnap(nearest);
  };
  const onPointerCancel = () => {
    start.current = null;
    setDrag(null);
  };
  // Les clics clavier (Entrée, Espace) passent par onKeyDown : pas de onClick, qui doublerait le clic souris.
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = ORDER.indexOf(snap);
    if (e.key === 'Enter' || e.key === ' ') onSnap(ORDER[(i + 1) % ORDER.length]!);
    else if (e.key === 'ArrowUp') onSnap(ORDER[Math.min(ORDER.length - 1, i + 1)]!);
    else if (e.key === 'ArrowDown') onSnap(ORDER[Math.max(0, i - 1)]!);
    else return;
    e.preventDefault();
  };

  const next = snap === 'full' ? 'replier' : 'agrandir';
  return (
    <div
      ref={rootRef}
      className={`bottom-sheet bottom-sheet--${snap}${drag !== null ? ' bottom-sheet--dragging' : ''}`}
      data-snap={snap}
      style={drag !== null ? { height: drag } : undefined}
    >
      <button
        type="button"
        className="bottom-sheet__handle"
        aria-label={`${title ? `${title} : ` : ''}panneau ${LABEL[snap]}, ${next}`}
        aria-expanded={snap !== 'peek'}
        title={`Glisser ou toucher pour ${next}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onKeyDown={onKeyDown}
      >
        <span className="bottom-sheet__grip" aria-hidden="true" />
      </button>
      <div className="bottom-sheet__content">{children}</div>
    </div>
  );
}
