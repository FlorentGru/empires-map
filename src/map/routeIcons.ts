// Porteurs des routes commerciales : animaux de bât et navires, de profil, tournés vers la droite
// (retournés quand le voyageur va vers l'ouest). SVG 32×24, style parchemin : aplats et contour brun.
import type { RouteCarrier } from '../types-route';

const INK = '#3b2a1a';
const SAIL = '#f4ead3';
const WOOD = '#8a5a2b';
const DARK = '#5c3a1c';
const RED = '#a8281e';
const BALE = '#c9a26a';
const leg = (x1: number, y1: number, x2: number, y2: number) =>
  `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`;
const sea = '<path d="M3 21.5Q8 20 13 21.5T23 21.5T31 21" fill="none" stroke="#5d86a3" stroke-width="1" opacity="0.8"/>';

const ART: Record<RouteCarrier, string> = {
  // Dromadaire : une bosse, long cou, ballots rouges.
  chameau:
    leg(10, 15, 9, 22) +
    leg(13, 15, 13.5, 22) +
    leg(20, 15, 20, 22) +
    leg(23, 15, 24, 22) +
    `<path d="M7 14Q6 9 11 9Q13 4.5 17 8Q20 8.5 22 11L24 10L25.5 5.5Q26.5 4 28 4.6L29.5 6L27.5 7L26.5 12Q25 16 21 16H11Q7.5 16 7 14Z" fill="#c9a26a" stroke="${INK}" stroke-width="1"/>` +
    `<path d="M11.5 9.5L13 7.6L15 9.6Z" fill="${RED}" stroke="${INK}" stroke-width="0.6"/><circle cx="27.6" cy="5.6" r="0.6" fill="${INK}"/>` +
    `<path d="M6.8 12.5Q5 13 4.6 15.5" fill="none" stroke="${INK}" stroke-width="0.9"/>`,
  // Cheval de bât : crinière, sacoches.
  cheval:
    leg(9, 15, 8.5, 22) +
    leg(12, 15, 12.5, 22) +
    leg(20, 15, 20.5, 22) +
    leg(23, 14.5, 24, 22) +
    `<path d="M7 13Q7 9.5 11 9.5H21L24.5 5.5Q26 4 28 5L29 8.5L27 9.5L25.5 13Q24 16 21 16H10Q7 16 7 13Z" fill="#8f5a34" stroke="${INK}" stroke-width="1"/>` +
    `<path d="M21.5 9.6L25 5.6L26 4.6" fill="none" stroke="${DARK}" stroke-width="1.6"/>` +
    `<rect x="12" y="8" width="7" height="5" rx="1.2" fill="${BALE}" stroke="${INK}" stroke-width="0.8"/>` +
    `<path d="M7 11Q4.5 12 4.5 15.5" fill="none" stroke="${DARK}" stroke-width="1.4"/><circle cx="27.2" cy="6.4" r="0.6" fill="${INK}"/>`,
  // Mule : grandes oreilles, bât et ballots de thé.
  mule:
    leg(9, 15, 8.8, 22) +
    leg(12, 15, 12.4, 22) +
    leg(19.5, 15, 19.8, 22) +
    leg(22.5, 14.5, 23.4, 22) +
    `<path d="M7.5 13Q7.5 10 11 10H20.5L24 7L27.5 7.5L28.5 10.5L26.5 11.5L25 14Q23.5 16 20.5 16H10.5Q7.5 16 7.5 13Z" fill="#7d6a5a" stroke="${INK}" stroke-width="1"/>` +
    `<path d="M24.5 7.3L23.6 2.8L25.3 6.8M26 7.4L26.4 2.6L27 7.4" fill="#7d6a5a" stroke="${INK}" stroke-width="0.8"/>` +
    `<rect x="11" y="6.5" width="4" height="4" rx="0.8" fill="#7a8f4a" stroke="${INK}" stroke-width="0.7"/><rect x="15.3" y="6.5" width="4" height="4" rx="0.8" fill="#7a8f4a" stroke="${INK}" stroke-width="0.7"/>` +
    `<circle cx="27" cy="9" r="0.6" fill="${INK}"/>`,
  // Lama : long cou droit, laine claire, couverture tissée.
  lama:
    leg(11, 15, 10.6, 22) +
    leg(13.5, 15, 13.8, 22) +
    leg(19.5, 15, 19.5, 22) +
    leg(22, 15, 22.6, 22) +
    `<path d="M9 13Q9 10.5 12 10.5H21L22 4Q22.4 2.2 24.4 2.5L26.5 3.6L25 5L24.5 12Q24 16 21 16H12Q9 16 9 13Z" fill="#efe3c2" stroke="${INK}" stroke-width="1"/>` +
    `<path d="M22.6 2.6L22.8 0.6L23.8 2.4" fill="#efe3c2" stroke="${INK}" stroke-width="0.7"/>` +
    `<rect x="13" y="9.4" width="7" height="3.6" rx="0.6" fill="${RED}" stroke="${INK}" stroke-width="0.7"/><path d="M13.5 11.2H19.5" stroke="#e0b43a" stroke-width="0.8"/>` +
    `<circle cx="24.6" cy="3.6" r="0.5" fill="${INK}"/>`,
  // Bœuf tirant une charrette.
  boeuf:
    `<circle cx="7.5" cy="18" r="3.6" fill="${WOOD}" stroke="${INK}" stroke-width="1"/><circle cx="7.5" cy="18" r="0.9" fill="${INK}"/>` +
    `<path d="M3 13H13V16H3Z" fill="${BALE}" stroke="${INK}" stroke-width="0.9"/><path d="M13 14.5H17" stroke="${INK}" stroke-width="1.2"/>` +
    leg(18, 16, 17.8, 22) +
    leg(21, 16, 21.2, 22) +
    leg(25, 16, 25.4, 22) +
    `<path d="M16.5 14Q16.5 10.5 20 10.5H25.5L28 10Q30 10.6 30 13L28.5 14.5L27 16.2H19Q16.5 16.2 16.5 14Z" fill="#8a6a4a" stroke="${INK}" stroke-width="1"/>` +
    `<path d="M27.5 10.2Q28.5 7.5 30.5 8" fill="none" stroke="#e9dcbc" stroke-width="1.2"/><circle cx="28.4" cy="12.1" r="0.6" fill="${INK}"/>`,
  // Yak : toison longue et sombre, cornes.
  yak:
    leg(10, 16, 10, 22) +
    leg(13, 16, 13, 22) +
    leg(20, 16, 20, 22) +
    leg(23, 16, 23.5, 22) +
    `<path d="M7 14Q7 8.5 13 8.5H22Q26 8.5 27 11L28.5 12.5L27 15L24.5 17.5H10Q7 17 7 14Z" fill="#4a3a2e" stroke="${INK}" stroke-width="1"/>` +
    `<path d="M8 17.5L9 19M11 17.6L12 19.4M15 17.6L15.5 19.4M19 17.6L19.4 19.4" stroke="#4a3a2e" stroke-width="1.2"/>` +
    `<path d="M25 9.5Q26 6.5 28 7" fill="none" stroke="#e9dcbc" stroke-width="1.2"/><rect x="12" y="6" width="7" height="3.5" rx="1" fill="${BALE}" stroke="${INK}" stroke-width="0.7"/>`,
  // Porteur à pied avec sa hotte.
  porteur:
    `<circle cx="17" cy="5" r="2.4" fill="#e0b48a" stroke="${INK}" stroke-width="0.9"/>` +
    `<path d="M14.5 8.5H19L20 15H14Z" fill="#9b6b3a" stroke="${INK}" stroke-width="0.9"/>` +
    `<rect x="10" y="7.5" width="5" height="7" rx="1" fill="${BALE}" stroke="${INK}" stroke-width="0.9"/>` +
    leg(15.5, 15, 13.5, 22) +
    leg(18.5, 15, 20.5, 22) +
    `<path d="M19.5 10L23 14" stroke="${INK}" stroke-width="1.3" stroke-linecap="round"/><path d="M23.5 6V22" stroke="${WOOD}" stroke-width="1.2"/>`,
  // Galère : rames, voile carrée, éperon.
  galere:
    sea +
    `<path d="M4 15H28L31 13.5L28.5 18H6.5Z" fill="${WOOD}" stroke="${INK}" stroke-width="1"/>` +
    `<path d="M8 18L6.5 21.5M11 18L9.5 21.5M14 18L12.5 21.5M17 18L15.5 21.5M20 18L18.5 21.5M23 18L21.5 21.5" stroke="${INK}" stroke-width="0.9"/>` +
    `<path d="M16 15V3" stroke="${INK}" stroke-width="1"/><path d="M10.5 4H21.5V12H10.5Z" fill="${SAIL}" stroke="${INK}" stroke-width="0.9"/><path d="M10.5 7H21.5" stroke="${RED}" stroke-width="1.4"/>`,
  // Cogue hanséatique : coque ronde, château arrière, voile carrée unique.
  cogue:
    sea +
    `<path d="M4 13H28L26.5 19.5H6Q4.5 17 4 13Z" fill="${WOOD}" stroke="${INK}" stroke-width="1"/><path d="M4 13V10H9V13" fill="${DARK}" stroke="${INK}" stroke-width="0.8"/>` +
    `<path d="M17 13V2" stroke="${INK}" stroke-width="1"/><path d="M11.5 3H22.5Q23.5 7.5 22.5 11.5H11.5Q10.5 7.5 11.5 3Z" fill="${SAIL}" stroke="${INK}" stroke-width="0.9"/><path d="M17 2L20 2.8L17 3.6" fill="${RED}"/>`,
  // Jonque : voiles lattées en éventail, poupe haute.
  jonque:
    sea +
    `<path d="M3 12L7 14H27L30 11.5L28 19H7Z" fill="#7a4a2a" stroke="${INK}" stroke-width="1"/>` +
    `<path d="M12 14V3M21 14V5" stroke="${INK}" stroke-width="1"/>` +
    `<path d="M12 3.5Q6.5 6 7.5 12.5H12Z" fill="#c8673a" stroke="${INK}" stroke-width="0.8"/><path d="M8 6H12M7.4 8.5H12M7.4 11H12" stroke="${INK}" stroke-width="0.6"/>` +
    `<path d="M21 5.5Q16 8 16.6 13H21Z" fill="#c8673a" stroke="${INK}" stroke-width="0.8"/><path d="M17 8H21M16.6 10.5H21" stroke="${INK}" stroke-width="0.6"/>`,
  // Boutre arabe : voile latine triangulaire.
  boutre:
    sea +
    `<path d="M5 14H27L30 12L27 18.5H7Z" fill="${WOOD}" stroke="${INK}" stroke-width="1"/>` +
    `<path d="M15 14V5" stroke="${INK}" stroke-width="1"/><path d="M7 4L25 8.5L15 13.5Z" fill="${SAIL}" stroke="${INK}" stroke-width="0.9"/><path d="M7 4L25 8.5" stroke="${INK}" stroke-width="1.2"/>`,
  // Galion / trois-mâts : trois mâts, voiles carrées, pavillon.
  galion:
    sea +
    `<path d="M3 12.5L6.5 11.5V13.5H25L29 11L27 19H6Q3.5 16 3 12.5Z" fill="#6e4424" stroke="${INK}" stroke-width="1"/><path d="M7 16H26" stroke="#e0b43a" stroke-width="0.7"/>` +
    `<path d="M10 13.5V4M17 13.5V1.5M23 13.5V4.5" stroke="${INK}" stroke-width="0.9"/>` +
    `<path d="M7.8 5H12.2V9H7.8ZM14.2 2.5H19.8V7H14.2ZM14 7.8H20V12H14ZM20.8 5.5H25.2V9.5H20.8Z" fill="${SAIL}" stroke="${INK}" stroke-width="0.7"/>` +
    `<path d="M17 1.5L20.5 2.3L17 3.1" fill="${RED}"/>`,
  // Barge du Grand Canal : coque plate, toit de nattes, perche.
  barge:
    `<path d="M2 20Q16 18.6 31 20" fill="none" stroke="#5d86a3" stroke-width="1.1"/>` +
    `<path d="M3 15H29L27.5 19H4.5Z" fill="#7a4a2a" stroke="${INK}" stroke-width="1"/>` +
    `<path d="M9 15V10.5Q15 7.5 21 10.5V15Z" fill="#c9a26a" stroke="${INK}" stroke-width="0.9"/><path d="M11 10V15M15 9V15M19 10V15" stroke="${INK}" stroke-width="0.5"/>` +
    `<path d="M25 4L28.5 20" stroke="${WOOD}" stroke-width="1.2"/><circle cx="25" cy="11.5" r="1.4" fill="#e0b48a" stroke="${INK}" stroke-width="0.6"/>`,
  // Drakkar : proue en tête de dragon, boucliers, voile rayée.
  drakkar:
    sea +
    `<path d="M3 11Q4 15 7 16H25Q28 15 29.5 9.5L31 8.5L30 11Q29 17 25 18.5H7.5Q3.5 17 3 11Z" fill="${WOOD}" stroke="${INK}" stroke-width="1"/>` +
    `<circle cx="10" cy="15.5" r="1.3" fill="${RED}" stroke="${INK}" stroke-width="0.5"/><circle cx="14" cy="15.5" r="1.3" fill="#e0b43a" stroke="${INK}" stroke-width="0.5"/><circle cx="18" cy="15.5" r="1.3" fill="${RED}" stroke="${INK}" stroke-width="0.5"/><circle cx="22" cy="15.5" r="1.3" fill="#e0b43a" stroke="${INK}" stroke-width="0.5"/>` +
    `<path d="M16 15V3" stroke="${INK}" stroke-width="1"/><path d="M10.5 3.5H21.5V12.5H10.5Z" fill="${SAIL}" stroke="${INK}" stroke-width="0.9"/><path d="M12.5 3.5V12.5M16 3.5V12.5M19.5 3.5V12.5" stroke="${RED}" stroke-width="1.4"/>`,
};

/** SVG du porteur (32×24, rendu ×2). `flip` : tourné vers la gauche. */
export function carrierSvg(carrier: RouteCarrier, flip = false): string {
  const g = flip ? `<g transform="translate(32 0) scale(-1 1)">${ART[carrier]}</g>` : ART[carrier];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 24" width="64" height="48"><g stroke-linejoin="round">${g}</g></svg>`;
}

export const CARRIER_LABELS: Record<RouteCarrier, string> = {
  chameau: 'Dromadaires',
  cheval: 'Chevaux de bât',
  mule: 'Mules',
  lama: 'Lamas',
  boeuf: 'Chars à bœufs',
  yak: 'Yacks',
  porteur: 'Porteurs',
  galere: 'Galères',
  cogue: 'Cogues',
  jonque: 'Jonques',
  boutre: 'Boutres',
  galion: 'Galions et trois-mâts',
  barge: 'Barges',
  drakkar: 'Drakkars',
};
