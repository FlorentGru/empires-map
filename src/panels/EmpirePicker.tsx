import { useEffect, useRef, useState } from 'react';
import { formatYear } from '../lib/years';
import type { Empire } from '../types';

interface Props {
  empires: Empire[];
  current: Empire;
  onSelect: (id: string) => void;
}

const COMING_SOON = ['Empire mongol', 'Perse achéménide', 'Empire napoléonien'];

export function EmpirePicker({ empires, current, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Fermeture sur clic extérieur ou Échap.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="empire-picker" ref={rootRef}>
      <button
        type="button"
        className="empire-picker__current"
        aria-expanded={open}
        aria-controls="empire-picker-list"
        aria-label={`Empire affiché : ${current.name}. Changer d'empire`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="empire-picker__swatch" style={{ background: current.color }} aria-hidden="true" />
        <span>
          <span className="empire-picker__name">{current.name}</span>
          <span className="empire-picker__dates">
            {formatYear(current.start)} – {formatYear(current.end)}
          </span>
        </span>
        <span aria-hidden="true" className="empire-picker__chevron">
          ▾
        </span>
      </button>

      {open && (
        <ul id="empire-picker-list" className="empire-picker__list">
          {empires.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                className="empire-card"
                aria-current={e.id === current.id ? 'true' : undefined}
                onClick={() => {
                  onSelect(e.id);
                  setOpen(false);
                }}
              >
                <span className="empire-picker__swatch" style={{ background: e.color }} aria-hidden="true" />
                <span className="empire-card__name">{e.name}</span>
                <span className="empire-card__dates">
                  {formatYear(e.start)} – {formatYear(e.end)}
                </span>
              </button>
            </li>
          ))}
          {COMING_SOON.map((name) => (
            <li key={name}>
              <div className="empire-card empire-card--disabled" aria-disabled="true">
                <span className="empire-picker__swatch" aria-hidden="true" />
                <span className="empire-card__name">{name}</span>
                <span className="empire-card__soon">Bientôt</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
