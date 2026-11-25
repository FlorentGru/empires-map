import { useSyncExternalStore } from 'react';
import { getPresentReligions, PRESENT_EVENT } from '../lib/religions';
import { RELIGIONS } from '../types-religion';

const subscribe = (cb: () => void) => {
  window.addEventListener(PRESENT_EVENT, cb);
  return () => window.removeEventListener(PRESENT_EVENT, cb);
};

/** Une ligne par religion colorée en ce moment sur la carte (pastille + libellé ; le survol donne ce que la catégorie recouvre). */
export function ReligionRows() {
  const present = useSyncExternalStore(subscribe, getPresentReligions);
  if (present.length === 0) return <li className="legend__none">Chargement des religions…</li>;
  return (
    <>
      {present.map((r) => (
        <li key={r} title={RELIGIONS[r].scope}>
          <span className="legend__icon">
            <span className="legend__swatch" style={{ background: RELIGIONS[r].color, borderColor: RELIGIONS[r].color }} aria-hidden="true" />
          </span>
          <span className="legend__label">{RELIGIONS[r].label}</span>
        </li>
      ))}
    </>
  );
}
