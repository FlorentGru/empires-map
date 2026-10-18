import { useEffect, useRef } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Modal « À propos » basé sur <dialog> (focus piégé et Échap gérés par le navigateur). */
export function AboutModal({ open, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="about"
      aria-labelledby="about-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // clic sur le fond
      }}
    >
      <div className="about__inner">
        <h2 id="about-title">À propos de l'Atlas des Empires</h2>
        <p>Une carte animée de l'évolution territoriale des grands empires, étape par étape, avec le récit des événements qui l'ont façonnée.</p>
        <h3>Crédits des données</h3>
        <ul>
          <li>
            Frontières historiques :{' '}
            <a href="https://github.com/aourednik/historical-basemaps" target="_blank" rel="noopener noreferrer">
              historical-basemaps
            </a>{' '}
            © André Ourednik et contributeurs, licence GPL-3.0.
          </li>
          <li>
            Terres émergées :{' '}
            <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">
              Natural Earth
            </a>{' '}
            (domaine public).
          </li>
          <li>
            Terrain : Mapzen / AWS Terrain Tiles (relief SRTM, GMTED, ETOPO1 et autres sources ouvertes), via{' '}
            <a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noopener noreferrer">
              AWS Open Data
            </a>
            .
          </li>
          <li>Polices des noms de villes : Open Sans et Noto Sans (licence SIL OFL / Apache 2.0).</li>
          <li>
            Rendu cartographique :{' '}
            <a href="https://maplibre.org/" target="_blank" rel="noopener noreferrer">
              MapLibre GL JS
            </a>{' '}
            (BSD-3-Clause).
          </li>
        </ul>
        <p className="about__note">
          Les frontières anciennes sont des approximations : elles simplifient des réalités souvent floues (zones d'influence, royaumes clients, frontières
          mouvantes).
        </p>
        <h3>Raccourcis clavier</h3>
        <ul>
          <li>
            <kbd>Espace</kbd> : lecture / pause
          </li>
          <li>
            <kbd>←</kbd> / <kbd>→</kbd> : étape précédente / suivante
          </li>
        </ul>
        <form method="dialog">
          <button type="submit" className="btn" autoFocus>
            Fermer
          </button>
        </form>
      </div>
    </dialog>
  );
}
