import { useLayoutEffect, useRef, useState } from 'react';
import { formatYear } from '../lib/years';

interface Props {
  year: number;
  /** Petite ligne au-dessus de l'année (période en cours, sinon nom de l'empire). */
  label: string;
  apogee?: boolean;
}

/**
 * Grande année de l'étape, en haut au centre de la carte (comme la vue « Le monde en l'an X ») :
 * centrée entre la légende et le panneau de l'étape, juste sous la barre de boutons (qui se replie).
 */
export function StepDate({ year, label, apogee }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const place = () => {
      const q = (s: string) => document.querySelector(s)?.getBoundingClientRect();
      const bar = q('.top-bar__right');
      const picker = q('.empire-picker');
      const legend = q('.legend');
      const panel = q('.event-panel');
      const narrow = window.innerWidth < 768;
      const from = !narrow && legend && legend.width > 0 ? legend.right : 0;
      const to = !narrow && panel && panel.width > 0 ? panel.left : window.innerWidth;
      const top = Math.max(bar?.bottom ?? 0, narrow ? (picker?.bottom ?? 0) : 0) + 10;
      setPos({ left: (from + to) / 2, top });
    };
    place();
    const ro = new ResizeObserver(place);
    for (const s of ['.top-bar__right', '.legend', '.event-panel', '.empire-picker']) {
      const el = document.querySelector(s);
      if (el) ro.observe(el);
    }
    window.addEventListener('resize', place);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', place);
    };
  }, []);

  return (
    <div ref={ref} className="step-date" aria-hidden="true" style={pos ? { left: pos.left, top: pos.top } : { visibility: 'hidden' }}>
      <span className="step-date__label">{label}</span>
      <span key={year} className="step-date__value">
        {formatYear(year)}
      </span>
      {apogee && <span className="step-date__apogee">♛ apogée</span>}
    </div>
  );
}
