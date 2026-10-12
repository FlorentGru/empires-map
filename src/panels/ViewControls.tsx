interface Props {
  tilted: boolean;
  relief: boolean;
  onToggleTilt: () => void;
  onToggleRelief: () => void;
}

export function ViewControls({ tilted, relief, onToggleTilt, onToggleRelief }: Props) {
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
    </div>
  );
}
