import { useId, useState } from 'react';
import { readBool, writeBool } from '../lib/settings';

interface Props {
  tilted: boolean;
  relief: boolean;
  figures: boolean;
  countries2026: boolean;
  stateNames: boolean;
  neighbors: boolean;
  contemporaries: boolean;
  monuments: boolean;
  routes: boolean;
  disasters: boolean;
  inventions: boolean;
  onToggleTilt: () => void;
  onToggleRelief: () => void;
  onToggleFigures: () => void;
  onToggleCountries2026: () => void;
  onToggleStateNames: () => void;
  onToggleNeighbors: () => void;
  onToggleContemporaries: () => void;
  onToggleMonuments: () => void;
  onToggleRoutes: () => void;
  onToggleDisasters: () => void;
  onToggleInventions: () => void;
}

export function ViewControls({
  tilted,
  relief,
  figures,
  countries2026,
  stateNames,
  neighbors,
  contemporaries,
  monuments,
  routes,
  disasters,
  inventions,
  onToggleTilt,
  onToggleRelief,
  onToggleFigures,
  onToggleCountries2026,
  onToggleStateNames,
  onToggleNeighbors,
  onToggleContemporaries,
  onToggleMonuments,
  onToggleRoutes,
  onToggleDisasters,
  onToggleInventions,
}: Props) {
  // Réglages repliables (mémorisés) : repliés par défaut sur petit écran.
  const [open, setOpen] = useState(() => readBool('atlas.controlsOpen', typeof window === 'undefined' || window.innerWidth >= 900));
  const id = useId();
  const toggle = () =>
    setOpen((v) => {
      writeBool('atlas.controlsOpen', !v);
      return !v;
    });
  return (
    <>
      <button
        type="button"
        className="btn btn--ghost view-controls__toggle"
        aria-expanded={open}
        aria-controls={id}
        onClick={toggle}
        title={open ? "Masquer les réglages d'affichage" : "Afficher les réglages d'affichage"}
      >
        ⚙ Affichage {open ? '▴' : '▾'}
      </button>
      <div className="view-controls" id={id} role="group" aria-label="Affichage de la carte" hidden={!open}>
        <button type="button" className="btn btn--ghost" onClick={onToggleTilt} title="Basculer entre vue à plat et vue inclinée">
          {tilted ? 'Vue 2D' : 'Vue inclinée'}
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          aria-pressed={relief}
          onClick={onToggleRelief}
          disabled={!tilted}
          title={tilted ? 'Activer / désactiver le relief 3D' : 'Le relief 3D nécessite la vue inclinée'}
        >
          Relief 3D : {relief ? 'oui' : 'non'}
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          aria-pressed={figures}
          onClick={onToggleFigures}
          title="Afficher / masquer les armées en marche et les personnages"
        >
          Soldats : {figures ? 'oui' : 'non'}
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          aria-pressed={countries2026}
          onClick={onToggleCountries2026}
          title="Superposer les frontières et les noms des pays actuels"
        >
          Pays 2026 : {countries2026 ? 'oui' : 'non'}
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          aria-pressed={stateNames}
          onClick={onToggleStateNames}
          title="Afficher / masquer les noms des États sur la carte"
        >
          Noms des États : {stateNames ? 'oui' : 'non'}
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          aria-pressed={neighbors}
          onClick={onToggleNeighbors}
          title="Afficher / masquer les États voisins de l'époque (contours et noms)"
        >
          Voisins : {neighbors ? 'oui' : 'non'}
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          aria-pressed={contemporaries}
          onClick={onToggleContemporaries}
          title="Afficher / masquer les autres empires de l'Atlas existant à la même date"
        >
          Contemporains : {contemporaries ? 'oui' : 'non'}
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          aria-pressed={monuments}
          onClick={onToggleMonuments}
          title="Afficher / masquer les grands monuments debout à cette date"
        >
          Monuments : {monuments ? 'oui' : 'non'}
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          aria-pressed={routes}
          onClick={onToggleRoutes}
          title="Afficher / masquer les routes commerciales actives à cette date"
        >
          Routes : {routes ? 'oui' : 'non'}
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          aria-pressed={disasters}
          onClick={onToggleDisasters}
          title="Afficher / masquer les épidémies, catastrophes et guerres meurtrières en cours"
        >
          Catastrophes : {disasters ? 'oui' : 'non'}
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          aria-pressed={inventions}
          onClick={onToggleInventions}
          title="Afficher / masquer les inventions révolutionnaires de l'empire"
        >
          Inventions : {inventions ? 'oui' : 'non'}
        </button>
      </div>
    </>
  );
}
