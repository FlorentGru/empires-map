// Icônes de monuments (SVG 28×28, style parchemin : pastille claire, trait brun, dorure).
// Une icône par type ; chargées dans MapLibre via map.addImage (rendu en raster ×2 pour la netteté).
import type { MonumentKind } from '../types-monument';

const INK = '#3b2a1a';
const GOLD = '#c99a2e';
const STONE = '#e9dcbc';

const shape: Record<MonumentKind, string> = {
  temple: `<path d="M7 11L14 7L21 11Z" fill="${STONE}"/><path d="M8 12H20M9 12V19M12 12V19M16 12V19M19 12V19M7.5 19.5H20.5" stroke="${INK}" stroke-width="1.4" fill="none"/>`,
  palais: `<path d="M7 20V12H10V9.5H12V12H16V9.5H18V12H21V20Z" fill="${STONE}"/><path d="M14 7.5L15.5 10H12.5Z" fill="${GOLD}"/><path d="M12.5 20V16.5H15.5V20" fill="none" stroke="${INK}" stroke-width="1.2"/>`,
  tombeau: `<path d="M6.5 20L14 7L21.5 20Z" fill="${STONE}"/><path d="M14 7L16.5 20" stroke="${INK}" stroke-width="1" fill="none"/>`,
  forteresse: `<path d="M7 20V10H9V12H11V10H13V12H15V10H17V12H19V10H21V20Z" fill="${STONE}"/><path d="M12.5 20V16Q14 14.5 15.5 16V20" fill="${INK}"/>`,
  muraille: `<path d="M5 18L9 15L14 16.5L19 13.5L23 15V18.5L19 17L14 20L9 18.5L5 21Z" fill="${STONE}"/><path d="M9 15V13.5H10.5V15.3M18.5 13.8V12.2H20V14.3" stroke="${INK}" stroke-width="1.1" fill="none"/>`,
  eglise: `<path d="M9 20V13L14 9L19 13V20Z" fill="${STONE}"/><path d="M14 4.5V9M12.3 6.3H15.7" stroke="${GOLD}" stroke-width="1.5"/><path d="M12.6 20V16.5Q14 15 15.4 16.5V20" fill="${INK}"/>`,
  mosquee: `<path d="M9 20V15Q9 10.5 14 10.5Q19 10.5 19 15V20Z" fill="${STONE}"/><path d="M14 7.2V10.5" stroke="${GOLD}" stroke-width="1.4"/><circle cx="14" cy="7" r="1.1" fill="${GOLD}"/><path d="M21.5 20V9.5M6.5 20V9.5" stroke="${INK}" stroke-width="1.6"/>`,
  amphitheatre: `<ellipse cx="14" cy="15" rx="8" ry="5.2" fill="${STONE}"/><ellipse cx="14" cy="15.6" rx="4.4" ry="2.4" fill="#cdb98c"/><path d="M8 13.2V17M11 11.4V15M14 10.8V13.2M17 11.4V15M20 13.2V17" stroke="${INK}" stroke-width="0.9"/>`,
  cite: `<path d="M6 20V14H9V11H12V15H15V9H18V13H22V20Z" fill="${STONE}"/><path d="M10 13.5H11M16 11.5H17M19.5 15H20.5" stroke="${INK}" stroke-width="1.1"/>`,
  phare: `<path d="M11.5 20L12.6 10H15.4L16.5 20Z" fill="${STONE}"/><path d="M12 9.5H16L15 7H13Z" fill="${GOLD}"/><path d="M8 7.5L11.5 8.3M20 7.5L16.5 8.3" stroke="${GOLD}" stroke-width="1.1"/>`,
  statue: `<path d="M11 20H17L16.2 17.5H11.8Z" fill="${STONE}"/><circle cx="14" cy="9" r="1.9" fill="${STONE}"/><path d="M12.4 17.5L13 11.3H15L15.6 17.5Z" fill="${STONE}"/><path d="M15 11.6L18 8" stroke="${INK}" stroke-width="1.2"/>`,
  jardin: `<path d="M6 20H22V17.5H6ZM8.5 17.5V15H19.5V17.5M11 15V12.5H17V15" fill="${STONE}"/><circle cx="9.5" cy="15.6" r="1.6" fill="#7a9a5a"/><circle cx="18.5" cy="15.6" r="1.6" fill="#7a9a5a"/><circle cx="12" cy="11.3" r="1.7" fill="#7a9a5a"/><circle cx="16" cy="11.3" r="1.7" fill="#7a9a5a"/><path d="M14 12.5V8.5" stroke="#5b7a3e" stroke-width="1.2"/><circle cx="14" cy="7.6" r="1.8" fill="#7a9a5a"/>`,
  pont: `<path d="M5 14H23V16H21Q19 12.5 17 16H15Q14 13 13 16H11Q9 12.5 7 16H5Z" fill="${STONE}"/><path d="M5 20Q14 18.5 23 20" stroke="#6e8fa8" stroke-width="1.2" fill="none"/>`,
};

/** Icône d'un type de monument ; `wonder` : anneau doré épais et étoile (sept merveilles du monde antique). */
export function monumentIconSvg(kind: MonumentKind, opts: { wonder?: boolean } = {}): string {
  const ring = opts.wonder
    ? `<circle cx="14" cy="14" r="12" fill="#f7efd9" stroke="${GOLD}" stroke-width="2.4"/><circle cx="14" cy="14" r="13.4" fill="none" stroke="${INK}" stroke-width="0.6"/>`
    : `<circle cx="14" cy="14" r="12.5" fill="#f7efd9" stroke="${INK}" stroke-width="1.3"/>`;
  const star = opts.wonder
    ? `<path d="M22.5 2.2L23.3 4.3L25.5 4.4L23.8 5.8L24.4 7.9L22.5 6.7L20.6 7.9L21.2 5.8L19.5 4.4L21.7 4.3Z" fill="${GOLD}" stroke="${INK}" stroke-width="0.4"/>`
    : '';
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="56" height="56">' +
    ring +
    `<g stroke="${INK}" stroke-width="0.9" stroke-linejoin="round">${shape[kind]}</g>${star}</svg>`
  );
}

/** Charge les icônes dans la carte (images « monument-<type> » et « monument-<type>-wonder »), une seule fois par style. */
export async function addMonumentIcons(map: import('maplibre-gl').Map, kinds: MonumentKind[]): Promise<void> {
  await Promise.all(
    kinds
      .flatMap((kind) => [false, true].map((wonder) => ({ kind, wonder })))
      .map(
        ({ kind, wonder }) =>
          new Promise<void>((resolve) => {
            const id = `monument-${kind}${wonder ? '-wonder' : ''}`;
            // Carte détruite entre-temps (changement d'empire) : plus rien à ajouter.
            if (!map.style || map.hasImage(id)) return resolve();
            const img = new Image(56, 56);
            img.onload = () => {
              if (map.style && !map.hasImage(id)) map.addImage(id, img, { pixelRatio: 2 });
              resolve();
            };
            img.onerror = () => resolve();
            img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(monumentIconSvg(kind, { wonder }))}`;
          }),
      ),
  );
}
