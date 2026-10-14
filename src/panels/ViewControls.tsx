interface Props {
  tilted: boolean;
  relief: boolean;
  figures: boolean;
  countries2026: boolean;
  stateNames: boolean;
  neighbors: boolean;
  onToggleTilt: () => void;
  onToggleRelief: () => void;
  onToggleFigures: () => void;
  onToggleCountries2026: () => void;
  onToggleStateNames: () => void;
  onToggleNeighbors: () => void;
}

export function ViewControls({ tilted, relief, figures, countries2026, stateNames, neighbors, onToggleTilt, onToggleRelief, onToggleFigures, onToggleCountries2026, onToggleStateNames, onToggleNeighbors }: Props) {
  return (
    <div className="view-controls" role="group" aria-label="Affichage de la carte">
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
        Figurines : {figures ? 'oui' : 'non'}
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
    </div>
  );
}
