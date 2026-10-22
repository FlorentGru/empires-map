import { useEffect, useRef, type ReactNode } from 'react';

interface Item {
  label: string;
  icon: string;
  onClick: () => void;
  /** Ouvre une fenêtre (aria-haspopup). */
  dialog?: boolean;
}

interface Props {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  /** Pages et fenêtres (Empires, Galerie, Quiz…) : le menu se ferme avant de les ouvrir. */
  items: Item[];
  /** Commandes de lecture (Mode Histoire, Devine la suite, vitesse, boucle). */
  playback: ReactNode;
  /** Réglages d'affichage de la carte. */
  view: ReactNode;
}

/**
 * Menu ☰ du téléphone : tout ce qui ne tient pas dans la barre du haut et la frise compacte, en plein écran.
 * Une boîte de dialogue native (`<dialog>` modal) : focus piégé, Échap et retour du focus au bouton gérés par le navigateur.
 */
export function MobileMenu({ open, onOpen, onClose, items, playback, view }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);

  return (
    <>
      <button type="button" className="icon-btn mobile-menu__open" aria-label="Menu" aria-haspopup="dialog" aria-expanded={open} onClick={onOpen}>
        ☰
      </button>
      <dialog ref={ref} className="mobile-menu" aria-label="Menu" onClose={onClose}>
        <div className="mobile-menu__head">
          <span className="mobile-menu__title">Atlas des Empires</span>
          <button type="button" className="icon-btn" aria-label="Fermer le menu" onClick={onClose}>
            ✕
          </button>
        </div>
        {open && (
          <div className="mobile-menu__body">
            <nav aria-label="Pages" className="mobile-menu__items">
              {items.map((it) => (
                <button
                  key={it.label}
                  type="button"
                  className="mobile-menu__item"
                  aria-haspopup={it.dialog ? 'dialog' : undefined}
                  onClick={() => {
                    onClose();
                    it.onClick();
                  }}
                >
                  <span aria-hidden="true">{it.icon}</span> {it.label}
                </button>
              ))}
            </nav>
            <section className="mobile-menu__section" aria-label="Lecture">
              <h2>Lecture</h2>
              {playback}
            </section>
            <section className="mobile-menu__section" aria-label="Affichage de la carte">
              <h2>Affichage de la carte</h2>
              {view}
            </section>
          </div>
        )}
      </dialog>
    </>
  );
}
