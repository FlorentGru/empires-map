import type { Archetype } from '../types';
import { OUT } from './soldiers';

/** Personnages par archétype : chaînes SVG plates (viewBox 0 0 36 48). */

const path = (d: string, fill: string, extra = '') => `<path d="${d}" fill="${fill}"${extra ? ' ' + extra : ''}/>`;
const circ = (cx: number, cy: number, r: number, fill: string, extra = '') =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"${extra ? ' ' + extra : ''}/>`;
const rect = (x: number, y: number, w: number, h: number, fill: string, rx = 0, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"${extra ? ' ' + extra : ''}/>`;
const ell = (cx: number, cy: number, rx: number, ry: number, fill: string, extra = '') =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"${extra ? ' ' + extra : ''}/>`;
const line = (d: string, color: string, w = 1, extra = '') => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}"${extra ? ' ' + extra : ''}/>`;
const NS = 'stroke="none"';

const GOLD = '#e0b43a';
const PURPLE = '#6d2a7a';
const RED = '#a8281e';
const WHITE = '#f4efe0';
const WOOD = '#8a5a2b';
const SKIN = '#e0b48a';
const STEEL_C = '#a9adb0';
const BLACK_C = '#1f1a14';

interface CharSpec {
  skin?: string;
  /** Couleur du vêtement principal (remplaçable par `tint`). */
  robe: string;
  /** Silhouette du vêtement. */
  body?: string;
  back?: string;
  deco?: string;
  head: string;
  front?: string;
}

const BODY = 'M11 18Q18 15 25 18L28 46L8 46Z';
const WIDE = 'M10 18Q18 15 26 18L30 46L6 46Z';

const beard = (c: string) => path('M13.4 12.4Q18 21 22.6 12.4Q18 15.4 13.4 12.4Z', c, NS);
const moust = (c: string) => path('M14.6 13Q16.3 12 18 13Q19.7 12 21.4 13Q20 14.8 18.8 13.8L18 13.4L17.2 13.8Q16 14.8 14.6 13Z', c, NS);
const hairCap = (c: string) => path('M12.9 11Q12.4 5.6 18 5.6Q23.6 5.6 23.1 11Q22.4 7.6 18 7.6Q13.6 7.6 12.9 11Z', c);
const dots = (pts: [number, number][]) => pts.map(([x, y]) => circ(x, y, 0.6, OUT, NS)).join('');

export const CHARACTER_SPECS = {
  senateur: {
    robe: '#f1ead8',
    deco:
      path('M14.5 17L17.5 17.5L16.8 46L12.6 46Z', PURPLE, NS) + line('M25.5 18.5Q19 26 11.5 31', '#c9bfa4', 0.9) + line('M26.5 26Q19 32 11 38', '#c9bfa4', 0.9),
    head: hairCap('#b8b3a8'),
    front: rect(22, 28, 3.6, 10, '#e8dcc0', 1.4) + circ(23.8, 28, 1.3, '#c9a878') + circ(23.8, 38, 1.3, '#c9a878'),
  },
  consul: {
    robe: '#f1ead8',
    deco: rect(8.5, 43.2, 19, 2.8, PURPLE, 0, NS) + line('M25 18.5Q19 27 12 33', PURPLE, 1.6) + line('M25.5 28Q19 34 11 40', '#c9bfa4', 0.9),
    back:
      rect(2.2, 17, 5, 26, WOOD, 1) +
      line('M3.8 17V43M5.6 17V43', '#5c3a1c', 0.7) +
      rect(1.8, 22, 5.8, 1.4, RED, 0, NS) +
      rect(1.8, 36, 5.8, 1.4, RED, 0, NS) +
      path('M7 14.4L11 12.4L11 17.6L7 16.6Z', '#aeb3b8'),
    head: hairCap('#5c3a1c'),
  },
  empereur: {
    robe: PURPLE,
    body: WIDE,
    deco:
      path('M13 19Q18 17.4 23 19L22.4 30Q18 31.6 13.6 30Z', GOLD) +
      line('M15.4 22H20.6M15.6 25.4H20.4', '#a07a1a', 0.8) +
      circ(11.4, 20.4, 1.9, GOLD) +
      rect(8.5, 43.2, 19, 2.8, GOLD, 0, NS),
    head:
      hairCap('#5c3a1c') +
      line('M12.6 12.5Q11.4 5.6 18 4.8Q24.6 5.6 23.4 12.5', '#5a8a3a', 2.4) +
      line('M13.4 8Q18 5.8 22.6 8', GOLD, 0.8) +
      circ(18, 4.8, 1.2, GOLD),
  },
  'empereur-byzantin': {
    robe: '#5b2a86',
    body: WIDE,
    deco:
      path('M12.5 18L17.5 18.4L25.5 37L21 37.4Z', GOLD) +
      path('M8 41.5H28L28.6 46H7.4Z', GOLD) +
      circ(14.8, 21.5, 0.9, '#c0392b', NS) +
      circ(18.6, 29, 0.9, '#2f6fa8', NS) +
      circ(22.4, 35.5, 0.9, '#c0392b', NS),
    head:
      path('M12.8 7.8H23.2L23.4 4.6L21 6.2L18 3.2L15 6.2L12.6 4.6Z', GOLD) +
      circ(18, 5, 0.9, '#c0392b', NS) +
      line('M12.8 8.4V13.6M23.2 8.4V13.6', GOLD, 0.8) +
      circ(12.8, 10.6, 1.1, WHITE) +
      circ(12.8, 13.8, 1.1, WHITE) +
      circ(23.2, 10.6, 1.1, WHITE) +
      circ(23.2, 13.8, 1.1, WHITE) +
      hairCap('#2d2018') +
      beard('#2d2018'),
  },
  roi: {
    robe: '#2f4f9b',
    back: path('M9 18Q18 15 27 18L31 46L5 46Z', RED),
    deco:
      path('M10 18Q18 14.5 26 18L25 23.4Q18 20.4 11 23.4Z', WHITE) +
      dots([
        [13, 19.6],
        [17, 18.6],
        [21, 18.6],
        [24.4, 20],
        [15, 21.6],
        [20, 21.2],
      ]) +
      rect(15.5, 26, 5, 1.6, GOLD, 0, NS) +
      rect(8.5, 43.5, 19, 2.5, GOLD, 0, NS),
    head: hairCap('#7a4a24') + beard('#7a4a24') + path('M13 7.4H23L23.6 3L21 5.4L18 2L15 5.4L12.4 3Z', GOLD) + circ(18, 5.6, 0.9, '#c0392b', NS),
    front: rect(26.6, 23, 1.3, 22, GOLD) + circ(27.2, 21.4, 2, GOLD) + line('M25.4 21.4H29', '#a07a1a', 0.7),
  },
  pape: {
    robe: WHITE,
    deco: path('M10.2 18Q18 14.8 25.8 18L26.4 26.4Q18 29.4 9.6 26.4Z', RED) + line('M18 28V40M15 31H21', GOLD, 1.2) + rect(8.5, 43.5, 19, 2.5, GOLD, 0, NS),
    head:
      path('M12.8 7.6L15.4 1.8L18 0.6L20.6 1.8L23.2 7.6Q18 6 12.8 7.6Z', WHITE) +
      line('M13.2 6.6Q18 5.2 22.8 6.6', GOLD, 1.3) +
      line('M18 2.2V5M16.4 3.4H19.6', GOLD, 0.9),
    front:
      `<path d="M28 46V12" fill="none" stroke="${OUT}" stroke-width="3.2" stroke-linecap="round"/>` +
      `<path d="M28.2 12Q28.2 6.4 32.6 7.6Q34 10.8 31 11.6" fill="none" stroke="${OUT}" stroke-width="3.2" stroke-linecap="round"/>` +
      `<path d="M28 46V12" fill="none" stroke="${GOLD}" stroke-width="1.4" stroke-linecap="round"/>` +
      `<path d="M28.2 12Q28.2 6.4 32.6 7.6Q34 10.8 31 11.6" fill="none" stroke="${GOLD}" stroke-width="1.4" stroke-linecap="round"/>`,
  },
  'chef-barbare': {
    skin: '#d9a982',
    robe: '#7a5230',
    back: path('M12 10Q11 4 18 3.8Q25 4 24 10L26.4 21L22 15.4H14L9.6 21Z', '#c9952b'),
    deco:
      path('M9 19Q18 14 27 19L28 25L25.5 23.6L24 27.6L21.5 24.6L18 28.6L14.5 24.6L12 27.6L10.5 23.6L8 25Z', '#9a8a78') +
      line('M13.4 15.4Q18 19.6 22.6 15.4', GOLD, 1.5),
    head: path('M12.4 8.6Q18 4.6 23.6 8.6Q18 6.8 12.4 8.6Z', '#c9952b') + beard('#b07a20'),
    front: rect(29, 17, 1.4, 29, WOOD) + path('M29.7 16.4Q35.2 17.4 34.6 24Q32 22.8 29.7 25Z', '#9aa0a6'),
  },
  calife: {
    skin: '#d0a070',
    robe: '#262626',
    body: WIDE,
    deco: path('M15 18.4L21 18.4L21.8 46L14.2 46Z', '#f1ead8') + rect(8, 43.4, 20, 2, GOLD, 0, NS) + line('M13 18.6L10.6 44M23 18.6L25.4 44', GOLD, 0.9),
    back: path('M24 8Q28.6 14 25.4 20L23 13Z', '#262626'),
    head: ell(18, 6.8, 7.6, 4.4, '#262626') + line('M11 7.4Q18 10.6 25 7.4M12.4 4.6Q18 7.2 23.6 4.6', '#6e6e6e', 0.8) + beard('#3b2a1a'),
  },
  sultan: {
    skin: '#d2a070',
    robe: '#9b2d20',
    body: WIDE,
    deco:
      rect(17.1, 18, 1.8, 28, GOLD, 0, NS) +
      line('M14.6 22.4H21.4M14.6 27.4H21.4M14.6 32.4H21.4', GOLD, 0.9) +
      rect(10, 34, 16, 2.4, GOLD, 0, NS) +
      path('M10 18.4Q18 15 26 18.4L25 22.4Q18 19.6 11 22.4Z', '#6b4a2e'),
    head:
      ell(18, 6.2, 8.2, 4.5, WHITE) +
      line('M10.6 6.8Q18 10 25.4 6.8M12 4.6Q18 7 24 4.6', '#c9bfa4', 0.8) +
      path('M17.6 4Q16.4 1.4 18.4 0.8Q19.4 2 18.6 4Z', WHITE) +
      circ(18, 4.8, 1.3, GOLD) +
      circ(18, 4.8, 0.5, '#c0392b', NS) +
      moust('#2d2018') +
      beard('#2d2018'),
  },
  doge: {
    robe: '#d8b04a',
    deco:
      path('M9.4 18Q18 14.8 26.6 18L26.4 25Q18 21.4 9.6 25Z', WHITE) +
      dots([
        [12, 20.4],
        [16, 19],
        [20, 19],
        [24, 20.4],
        [14, 22.6],
        [22, 22.6],
      ]) +
      line('M18 24V45M13 30Q18 33 23 30M12 37Q18 40 24 37', '#a07a1a', 0.8) +
      rect(8.5, 43.5, 19, 2.5, WHITE, 0, NS),
    head:
      path('M12.8 9.6Q13 5 18 5Q23 5 23.2 9.6Q18 7.4 12.8 9.6Z', WHITE) +
      path('M13.6 7.6Q14 3.6 17.4 3Q22.6 2.4 24 6.4Q24.6 9.4 23 9.8Q22.6 6.6 18.6 6.6Z', RED) +
      line('M17.4 3Q22.6 2.4 24 6.4', GOLD, 0.8) +
      beard(WHITE),
  },
  'empereur-napoleon': {
    robe: '#7d8590',
    deco:
      path('M15 17.4L21 17.4L19.6 33L16.4 33Z', WHITE) +
      line('M16.4 33L18 38L19.6 33', '#b9b2a0', 0.7) +
      path('M13.2 17.2L16.6 24L14.6 33L10.8 20Z', '#6a717b') +
      path('M22.8 17.2L19.4 24L21.4 33L25.2 20Z', '#6a717b') +
      circ(14.4, 24, 0.9, RED, NS) +
      rect(8.5, 43.5, 19, 2.5, '#6a717b', 0, NS),
    head:
      hairCap('#5c3a1c') +
      `<g transform="rotate(-9 18 8)">` +
      path('M5.4 9.4Q10 4.4 18 3.8Q26 4.4 30.6 9.4Q25 7.4 18 7.4Q11 7.4 5.4 9.4Z', '#1f1a14') +
      circ(28.2, 8.6, 1.1, RED, NS) +
      circ(28.2, 8.6, 0.5, WHITE, NS) +
      `</g>`,
    front: path('M24.6 26Q19 24.4 17.4 26.6L18.4 29.4Q21 29 25.8 31.6Z', '#7d8590') + circ(17.6, 27.6, 1.6, SKIN),
  },
  general: {
    robe: '#24408a',
    deco:
      path('M14 17.2L22 17.2L22.4 22L13.6 22Z', GOLD) +
      line('M14.6 19.4H21.4', '#a07a1a', 0.7) +
      circ(18, 26, 0.7, GOLD, NS) +
      circ(18, 29.5, 0.7, GOLD, NS) +
      circ(18, 33, 0.7, GOLD, NS) +
      path('M8.6 18.6Q11 16.4 14 17.4L13 20.4Q10.6 19.6 8.2 21Z', GOLD) +
      path('M27.4 18.6Q25 16.4 22 17.4L23 20.4Q25.4 19.6 27.8 21Z', GOLD) +
      line('M9.2 20.6V23.4M10.6 20.4V23.2M12 20.2V23M26.8 20.6V23.4M25.4 20.4V23.2M24 20.2V23', GOLD, 0.7) +
      path('M9 30.6L27 34.4L27 37.6L9 33.8Z', '#c9473a') +
      line('M9 32.2L27 36', GOLD, 0.8) +
      rect(8.5, 43.5, 19, 2.5, GOLD, 0, NS),
    head:
      hairCap('#5c3a1c') +
      path('M5 9.4Q9 2.6 18 2.4Q27 2.6 31 9.4Q25 7 18 7Q11 7 5 9.4Z', '#1f1a14') +
      line('M5.6 9Q9.4 3.4 18 3.2Q26.6 3.4 30.4 9', GOLD, 0.9) +
      path('M16.4 3Q14.8 -2.4 18 -2.6Q21.2 -2.4 19.6 3Z', WHITE) +
      path('M17.2 2.4Q18 -1 18.8 2.4Z', RED) +
      circ(18, 4.8, 0.9, RED, NS),
  },
  'roi-moderne': {
    robe: '#2f4f9b',
    back: path('M8 18Q18 14.5 28 18L32 46L4 46Z', WHITE),
    deco:
      path('M9.6 18Q18 14.6 26.4 18L26 24Q18 20.6 10 24Z', WHITE) +
      dots([
        [12, 19.6],
        [16, 18.4],
        [20, 18.4],
        [24, 19.6],
        [14, 21.8],
        [22, 21.8],
      ]) +
      line('M24 17.8L12 38', '#2f6fa8', 2) +
      circ(12, 38, 1.6, GOLD) +
      rect(15, 28, 6, 1.5, GOLD, 0, NS) +
      dots([
        [8, 34],
        [28, 36],
        [7, 41],
        [30, 42],
        [10, 44],
        [26, 44],
      ]),
    head:
      hairCap('#8a8a8a') +
      path('M12.8 7.6H23.2L23.8 3.8L21 5.6L18 2.4L15 5.6L12.2 3.8Z', GOLD) +
      line('M13.4 5.6Q18 -0.8 22.6 5.6', GOLD, 1) +
      circ(18, 0.8, 1, '#c0392b') +
      circ(18, 5.8, 0.8, '#c0392b', NS),
  },
  tsar: {
    robe: '#2f5a3a',
    deco:
      path('M9 18.6Q11.4 16.2 14.4 17.4L13.4 20.6Q10.8 19.8 8.4 21.4Z', GOLD) +
      path('M27 18.6Q24.6 16.2 21.6 17.4L22.6 20.6Q25.2 19.8 27.6 21.4Z', GOLD) +
      line('M9.4 21V24M11 20.6V23.6M26.6 21V24M25 20.6V23.6', GOLD, 0.7) +
      line('M13 17.4L25 40', '#2f6fa8', 2.6) +
      line('M13 17.4L25 40', WHITE, 0.6) +
      path('M14.6 24.6L15.6 26.6L17.8 26.8L16.2 28.2L16.7 30.4L14.6 29.2L12.6 30.4L13 28.2L11.4 26.8L13.6 26.6Z', GOLD, NS) +
      rect(8.5, 33.4, 19, 2, GOLD, 0, NS) +
      circ(18, 34.4, 1.2, '#c0392b', NS),
    head:
      hairCap('#7a4a24') +
      path('M12.9 10Q12.4 15.4 14.6 14.8L14 10.6Z', '#7a4a24', NS) +
      path('M23.1 10Q23.6 15.4 21.4 14.8L22 10.6Z', '#7a4a24', NS) +
      moust('#7a4a24'),
  },
  diplomate: {
    robe: '#2b2a33',
    back: path('M21 6.4Q27 9 25.6 17Q23.4 12 21 10Z', '#e8e4da') + path('M24.6 16L27 18L24.8 19.6Z', '#1f1a14'),
    deco:
      path('M13.6 17.6L22.4 17.6L22 20Q18 27.4 14 20Z', WHITE) +
      line('M14.6 21L18 25.8L21.4 21M15.6 19.4L18 22.6L20.4 19.4', '#bdb59a', 0.7) +
      path('M11.5 18L14 17.6L15.8 29L12.4 33Z', '#1f1e25') +
      path('M24.5 18L22 17.6L20.2 29L23.6 33Z', '#1f1e25') +
      circ(14.4, 31.4, 0.7, GOLD, NS) +
      circ(21.6, 31.4, 0.7, GOLD, NS),
    head:
      path('M12.7 11.2Q11.8 4.6 18 4.4Q24.2 4.6 23.3 11.2Q22.6 7 18 7Q13.4 7 12.7 11.2Z', '#e8e4da') +
      ell(12.4, 11.6, 1.5, 2, '#e8e4da') +
      ell(23.6, 11.6, 1.5, 2, '#e8e4da'),
    front:
      rect(22, 29.5, 6.6, 9.4, WHITE, 0.6) +
      line('M23.4 32H27.2M23.4 34H27.2M23.4 36H26', '#8a8470', 0.6) +
      circ(26.2, 37.6, 1, RED, NS) +
      circ(24.5, 34, 1.9, SKIN),
  },
  amiral: {
    robe: '#1f2f5a',
    deco:
      path('M14.2 17.2L18 18L18 40L14 40Z', WHITE) +
      path('M21.8 17.2L18 18L18 40L22 40Z', WHITE) +
      circ(16, 24, 0.7, GOLD, NS) +
      circ(16, 28, 0.7, GOLD, NS) +
      circ(16, 32, 0.7, GOLD, NS) +
      circ(20, 24, 0.7, GOLD, NS) +
      circ(20, 28, 0.7, GOLD, NS) +
      circ(20, 32, 0.7, GOLD, NS) +
      path('M8.6 18.6Q11 16.4 14 17.4L13 20.4Q10.6 19.6 8.2 21Z', GOLD) +
      path('M27.4 18.6Q25 16.4 22 17.4L23 20.4Q25.4 19.6 27.8 21Z', GOLD) +
      line('M9.2 20.6V23.4M10.6 20.4V23.2M26.8 20.6V23.4M25.4 20.4V23.2', GOLD, 0.7) +
      rect(8.5, 43.5, 19, 2.5, GOLD, 0, NS),
    head:
      hairCap('#8a7a5a') +
      path('M5.4 8.6Q9 5.4 18 5Q27 5.4 30.6 8.6Q26 3.4 18 3Q10 3.4 5.4 8.6Z', '#1f1a14') +
      path('M5.4 8.6Q9 5.4 18 5Q27 5.4 30.6 8.6Q26 8.4 18 8Q10 8.4 5.4 8.6Z', '#1f1a14') +
      line('M6 8.4Q18 6.6 30 8.4', GOLD, 0.8) +
      circ(18, 5.4, 1, '#c0392b', NS),
    front: path('M8.8 20.4L13.4 20.8L13.6 36.4L9.2 36.6Z', '#1f2f5a') + line('M10.2 31L12.8 36', '#161f3d', 0.6) + circ(12.8, 29.4, 1, GOLD),
  },
  'empereur-chinois': {
    robe: '#e0b43a',
    body: WIDE,
    deco:
      path('M12 19Q18 17 24 19L24.6 24Q18 22.4 11.4 24Z', RED) +
      line('M13 27Q16 24 18 28Q20 32 23 29M12 36Q15 33 18 37Q21 41 24 38', RED, 1.3) +
      circ(18, 31, 2.2, RED) +
      circ(18, 31, 0.8, GOLD, NS) +
      rect(8.5, 43.2, 19, 2.8, RED, 0, NS) +
      line('M10 43.2Q13 41.4 16 43.2M20 43.2Q23 41.4 26 43.2', '#2f6fa8', 0.9),
    head:
      beard('#2d2018') +
      rect(11, 4.6, 14, 2.2, '#1f1a14', 0.6) +
      rect(13.4, 3, 9.2, 1.8, '#1f1a14', 0.4) +
      line('M11.6 6.8V11M13.6 6.8V12M22.4 6.8V12M24.4 6.8V11', GOLD, 0.8) +
      circ(11.6, 11.4, 0.9, WHITE, NS) +
      circ(13.6, 12.4, 0.9, WHITE, NS) +
      circ(22.4, 12.4, 0.9, WHITE, NS) +
      circ(24.4, 11.4, 0.9, WHITE, NS),
  },
  'lettre-mandarin': {
    robe: '#2f5f8a',
    body: WIDE,
    deco:
      path('M11.5 18Q18 15.4 24.5 18L24 21Q18 18.6 12 21Z', '#1f3f5a') +
      rect(13.4, 24, 9.2, 8.4, '#c9473a', 1) +
      circ(18, 28.2, 2.2, GOLD) +
      circ(18, 28.2, 0.8, '#c9473a', NS) +
      line('M10 36L12 44M26 36L24 44', '#1f3f5a', 0.9) +
      rect(8, 43.4, 20, 2.2, '#1f3f5a', 0, NS),
    head:
      beard('#2d2018') +
      moust('#2d2018') +
      path('M12.6 8.4Q12.4 3.4 18 3.4Q23.6 3.4 23.4 8.4Q18 6.6 12.6 8.4Z', '#1f1a14') +
      path('M11.6 5.2L5 4.2L5.4 6.6L12 7.6Z', '#1f1a14') +
      path('M24.4 5.2L31 4.2L30.6 6.6L24 7.6Z', '#1f1a14'),
    front: rect(22, 30, 7, 9.6, '#efe6cc', 0.6) + line('M23.4 32.4H27.6M23.4 34.6H27.6M23.4 36.8H26.4', '#8a8470', 0.6) + circ(23.6, 34.4, 1.8, SKIN),
  },
  'general-chinois': {
    robe: '#7a2a20',
    back: path('M9 18Q18 14.5 27 18L31 46L5 46Z', RED),
    deco:
      path('M12 18.4Q18 16 24 18.4L24.6 34L11.4 34Z', '#6e5a3a') +
      line('M12 22H24M12 26H24M12 30H24M18 18V34', GOLD, 0.8) +
      circ(18, 22, 1.6, GOLD) +
      path('M8.6 18.6Q11 16.4 14 17.4L13 20.6Q10.6 19.8 8.2 21Z', '#5c5c62') +
      path('M27.4 18.6Q25 16.4 22 17.4L23 20.6Q25.4 19.8 27.8 21Z', '#5c5c62') +
      rect(10.5, 34, 15, 2.2, '#3a2a1a', 0, NS) +
      path('M11 36.4L25 36.4L26 44L10 44Z', '#5c5c62'),
    head:
      beard('#2d2018') +
      path('M12.6 9.4Q12.2 3.6 18 3.4Q23.8 3.6 23.4 9.4L22.4 7.6L13.6 7.6Z', '#5c5c62') +
      path('M16.8 3.6Q18 -2 19.2 3.6Z', RED) +
      line('M13 7.8L12.2 12M23 7.8L23.8 12', '#5c5c62', 1.4),
    front: rect(28.6, 5, 1.4, 41, WOOD) + path('M29.3 1.2L31 5.6L27.6 5.6Z', '#d6dadc') + path('M30 7.5L34.4 7L33.6 11.4L30 11.2Z', RED),
  },
  khan: {
    skin: '#d2a070',
    robe: '#2f5f9b',
    body: WIDE,
    deco:
      path('M12 18.4Q18 16 24 18.4L18 34Z', '#264d80', NS) +
      line('M18 18V45M24 19L18 36', GOLD, 1) +
      rect(10, 32.6, 16, 2.8, '#c9473a', 0, NS) +
      circ(18, 34, 1.5, GOLD) +
      rect(8, 43.4, 20, 2.2, GOLD, 0, NS),
    back: path('M11.4 10Q11 4 18 3.6Q25 4 24.6 10L26 20L23 15L13 15L10 20Z', '#2d2018'),
    head:
      ell(18, 6.4, 8.6, 2.2, '#2b2219') +
      path('M12.8 6.4Q13 1.4 18 1.2Q23 1.4 23.2 6.4Z', '#c9a02a') +
      path('M17 1.4Q18 -1.4 19 1.4Z', RED) +
      moust('#2d2018') +
      path('M16.6 14.4Q18 18 19.4 14.4Z', '#2d2018', NS),
  },
  shogun: {
    robe: '#3a3a5a',
    body: WIDE,
    deco:
      path('M12 18.4Q18 16.4 24 18.4L18 31Z', '#efe6cc') +
      line('M18 31V45', '#26263a', 1) +
      rect(10, 31, 16, 3, '#a8281e', 0, NS) +
      circ(14.4, 38, 1.4, GOLD, NS) +
      circ(21.6, 38, 1.4, GOLD, NS) +
      circ(18, 41.4, 1.4, GOLD, NS) +
      path('M7 20Q10 17 13 19L13 28Q9 28 7 24Z', '#3a3a5a') +
      path('M29 20Q26 17 23 19L23 28Q27 28 29 24Z', '#3a3a5a'),
    head:
      path('M12.8 10.6Q12.4 6 18 5.6Q23.6 6 23.2 10.6Q22.4 8 18 8Q13.6 8 12.8 10.6Z', '#1f1a14') +
      path('M13.2 6.6Q14 1.4 18 1.2Q22 1.4 22.8 6.6Q18 5 13.2 6.6Z', '#1f1a14') +
      circ(18, 3, 0.8, GOLD, NS) +
      moust('#2d2018'),
    front:
      path('M30 24L31.4 24L26 44.6L24.8 44.6Z', '#d6dadc') +
      rect(23.4, 43.6, 4.8, 1.4, '#2b2219') +
      path('M28.8 27L33 27L33 40L28.8 40Z', '#efe6cc', 'opacity="0"'),
  },
  'moine-bouddhiste': {
    skin: '#d9a982',
    robe: '#e08a1a',
    deco:
      path('M12 18Q18 16 25 20L24 34L11 28Z', '#c96f10', NS) +
      line('M12 18Q18 24 26 20', '#a85a0a', 0.9) +
      line('M13 30L24 36', '#a85a0a', 0.8) +
      rect(8, 43.4, 20, 2.2, '#c96f10', 0, NS),
    head: line('M15.2 5.6Q18 4.6 20.8 5.6', '#c9a878', 0.8) + circ(15.4, 6.6, 0.4, '#c9a878', NS) + circ(20.6, 6.6, 0.4, '#c9a878', NS),
    front:
      line('M14.2 18.6Q12 28 18 31Q24 28 21.8 18.6', '#5c3a1c', 1.6, 'stroke-dasharray="1.2 1.2"') +
      circ(18, 31, 1.4, '#5c3a1c') +
      rect(28.6, 14, 1.2, 32, WOOD) +
      circ(29.2, 12.6, 2, GOLD) +
      circ(29.2, 12.6, 0.8, WHITE, NS),
  },
  imperatrice: {
    skin: '#e8c8a0',
    robe: '#c0392b',
    body: WIDE,
    deco:
      path('M12 18.4Q18 16 24 18.4L24.4 24Q18 22.6 11.6 24Z', GOLD) +
      line('M14 28Q18 25 22 28M13 34Q18 30 23 34M12 40Q18 36 24 40', GOLD, 1.1) +
      circ(18, 30, 1.8, '#2f6fa8') +
      circ(14, 38, 1, '#2f8a4a', NS) +
      circ(22, 38, 1, '#2f8a4a', NS) +
      rect(8.5, 43.2, 19, 2.8, GOLD, 0, NS) +
      path('M6 24Q3 28 6.4 33L9.4 30Z', RED) +
      path('M30 24Q33 28 29.6 33L26.6 30Z', RED),
    back: path('M10.6 8Q10 3.4 18 3.4Q26 3.4 25.4 8L26 20L10 20Z', '#1f1a14'),
    head:
      path('M12.6 9.6Q12.4 4.8 18 4.6Q23.6 4.8 23.4 9.6Q22.8 6.6 18 6.6Q13.2 6.6 12.6 9.6Z', '#1f1a14') +
      path('M12.4 5.4Q18 2.6 23.6 5.4L23 7Q18 5 13 7Z', GOLD) +
      path('M18 4Q15 1.6 12.4 2.4Q14.6 0 18 1.6Q21.4 0 23.6 2.4Q21 1.6 18 4Z', '#2f8a4a') +
      path('M17 3.4L18 -0.6L19 3.4Z', RED) +
      line('M12.6 7V12M23.4 7V12', GOLD, 0.8) +
      circ(12.6, 12.6, 1, '#2f8a4a', NS) +
      circ(23.4, 12.6, 1, '#2f8a4a', NS) +
      circ(18, 13.4, 0.9, '#c0392b', NS),
  },
  'general-mongol': {
    skin: '#d2a070',
    robe: '#2f5f9b',
    body: WIDE,
    deco:
      path('M12 18.4Q18 16 24 18.4L24.6 34L11.4 34Z', '#6e5a3a') +
      line('M12 22H24M12 26H24M12 30H24M18 18V34', GOLD, 0.8) +
      rect(10.5, 34, 15, 2.2, '#c9473a', 0, NS) +
      circ(18, 35.1, 1.2, GOLD) +
      path('M11 36.4L25 36.4L26 44L10 44Z', '#264d80'),
    back: path('M11.4 10Q11 4 18 3.6Q25 4 24.6 10L25.4 18L22.6 14L13.4 14L10.6 18Z', '#2d2018'),
    head:
      path('M12.6 9Q12.4 3.4 18 3Q23.6 3.4 23.4 9L22.4 7.6L13.6 7.6Z', '#8e949a') +
      path('M17.2 3.2L18 -1.6L18.8 3.2Z', STEEL_C) +
      path('M18 -1.4Q22 -3 21 1.6Q20 -0.4 18 -1.2Z', RED) +
      line('M13 7.8L12.2 12.4M23 7.8L23.8 12.4', '#8e949a', 1.4) +
      moust('#2d2018') +
      path('M16.6 14.4Q18 18 19.4 14.4Z', '#2d2018', NS),
    front: rect(28.6, 12, 1.4, 34, WOOD) + circ(29.3, 10.6, 2.2, GOLD) + path('M27.8 12.4L26.4 17M30.8 12.4L32.2 17', RED, 'stroke-width="1"'),
  },
  khatoun: {
    skin: '#e0b48a',
    robe: '#a8281e',
    body: WIDE,
    back: path('M8.6 18Q18 14 27.4 18L31 46L5 46Z', '#2f5f9b'),
    deco:
      path('M12 18.4Q18 16 24 18.4L24.4 24Q18 22.6 11.6 24Z', GOLD) +
      line('M13 28Q18 25 23 28M12 34Q18 30 24 34M11 40Q18 36 25 40', GOLD, 1.1) +
      circ(18, 30, 1.6, '#2f8a8f') +
      rect(8.5, 43.2, 19, 2.8, GOLD, 0, NS) +
      line('M12.4 18.6L11 46M23.6 18.6L25 46', '#2f5f9b', 1.6),
    head:
      path('M12.8 10.4Q12.4 6 18 5.8Q23.6 6 23.2 10.4Q22.4 8 18 8Q13.6 8 12.8 10.4Z', '#1f1a14') +
      path('M14.6 6.4L14 -2.6Q18 -4.6 22 -2.6L21.4 6.4Z', '#c0392b') +
      line('M14.3 1.6H21.7M14.2 -1H21.8', GOLD, 1) +
      path('M17 -3L18 -6.4L19 -3Z', '#f4efe0') +
      line('M12.8 9L11.8 15M23.2 9L24.2 15', '#1f1a14', 1.2) +
      circ(18, 13.6, 0.8, '#c0392b', NS),
  },
  conquistador: {
    robe: '#1f1a14',
    body: WIDE,
    back: path('M9 18Q18 15 27 18L29 38L7 38Z', RED),
    deco:
      path('M12 18.4Q18 16.4 24 18.4L24.6 30Q18 32.4 11.4 30Z', STEEL_C) +
      line('M18 18.4V31M13 23H23', '#6e747a', 0.8) +
      path('M11 16.6Q18 20.4 25 16.6L24.6 19.4Q18 23 11.4 19.4Z', WHITE) +
      rect(8.5, 43.2, 19, 2.8, '#3a2a1a', 0, NS),
    head:
      path('M12.6 8.6Q12.8 4.4 18 4Q23.2 4.4 23.4 8.6L22.4 7.2L13.6 7.2Z', STEEL_C) +
      path('M11 7.6Q18 9.6 25 7.6Q24.6 6.4 23 6.8Q18 8 13 6.8Q11.4 6.4 11 7.6Z', STEEL_C) +
      path('M14 4.4Q18 -1.2 22 4.4Q18 3 14 4.4Z', STEEL_C) +
      moust('#2d2018') +
      path('M16.8 14.4Q18 19 19.2 14.4Z', '#2d2018', NS),
    front: rect(26.8, 14, 1.2, 33, WOOD) + path('M28 15L35 17L28 21Z', GOLD) + line('M28.6 17.6H32', RED, 1),
  },
  'vice-roi': {
    robe: '#1f1a14',
    body: WIDE,
    deco:
      path('M11.4 16.8Q18 20.6 24.6 16.8L25 20Q18 24 11 20Z', WHITE) +
      line('M12.6 19.4Q18 28 23.4 19.4', GOLD, 1.3) +
      path('M16.6 27.6H19.4V31.4L18 32.8L16.6 31.4Z', RED) +
      rect(8.5, 43.2, 19, 2.8, '#3a3028', 0, NS),
    head:
      ell(18, 6.2, 8, 1.6, '#1f1a14') +
      path('M13 6.4Q13.2 1.8 18 1.6Q22.8 1.8 23 6.4Z', '#1f1a14') +
      moust('#5c3a1c') +
      path('M16.8 14.2Q18 18.6 19.2 14.2Z', '#5c3a1c', NS),
    front: rect(25.2, 31, 8, 4.4, '#efe6cc', 1) + line('M26.6 33.2H31.6', '#8a7a5a', 0.7) + circ(29.2, 35.6, 1.1, RED),
  },
  'roi-habsbourg': {
    robe: '#1f1a14',
    body: WIDE,
    back: path('M9 18Q18 15 27 18L31 46L5 46Z', '#2b2219'),
    deco:
      path('M11 16.4Q18 22 25 16.4L25.6 19.6Q18 25 10.4 19.6Z', WHITE) +
      line('M12 20Q18 24 24 20', '#c9c2ae', 0.7) +
      line('M14 21Q18 30 22 21', GOLD, 1.6) +
      path('M16.6 28.4L18 26.6L19.4 28.4L18 31.6Z', '#c9473a') +
      rect(8.5, 43.4, 19, 2.6, GOLD, 0, NS),
    head:
      hairCap('#8a5a2b') +
      path('M13.6 7.6H22.4L23 3.4L20.8 5.6L18 2.4L15.2 5.6L13 3.4Z', GOLD) +
      circ(18, 5.4, 0.8, '#c0392b', NS) +
      moust('#8a5a2b') +
      path('M16.2 14.2Q18 17.4 19.8 14.2Q18 15.4 16.2 14.2Z', '#d09878', NS),
    front: rect(27, 22, 1.2, 24, GOLD) + circ(27.6, 20.8, 2, GOLD),
  },
  'souverain-precolombien': {
    skin: '#b97a50',
    robe: '#2f6fa8',
    body: WIDE,
    deco:
      path('M11 18.4Q18 16 25 18.4L26 30L10 30Z', '#e8dcc0') +
      line('M11.4 22H24.6M11 26H25', '#c9473a', 1) +
      path('M12.6 17.6Q18 24 23.4 17.6L23 19.6Q18 26 13 19.6Z', GOLD) +
      circ(18, 25.4, 1.4, '#2f9a6a') +
      rect(8.5, 43.2, 19, 2.8, '#c9473a', 0, NS) +
      line('M8.5 39.4H27.5', GOLD, 1),
    head:
      path('M12.6 8.4Q12.2 4 18 3.6Q23.8 4 23.4 8.4Z', '#1f1a14') +
      line('M12.8 6.6Q18 4.8 23.2 6.6', GOLD, 1.6) +
      path('M12.4 5.6Q7.6 2.4 8.4 -2.4Q12.4 -0.4 14 3.6ZM23.6 5.6Q28.4 2.4 27.6 -2.4Q23.6 -0.4 22 3.6ZM15 3.6Q14.4 -4 18 -5.4Q21.6 -4 21 3.6Z', '#2f9a6a') +
      circ(18, 1, 1.1, '#c9473a', NS) +
      circ(12.2, 13, 1.3, GOLD) +
      circ(23.8, 13, 1.3, GOLD),
    front: line('M10 31L8.4 38M26 31L27.6 38', GOLD, 1.8),
  },
  'militaire-xxe': {
    robe: '#8a8a54',
    body: BODY,
    deco:
      path('M11.6 18.2Q18 16 24.4 18.2L24.6 22L18 25Q12 22 11.4 22Z', '#7a7a46', NS) +
      line('M18 17V30', '#5a5a34', 0.8) +
      circ(15, 22, 0.8, GOLD, NS) +
      circ(21, 22, 0.8, '#c9473a', NS) +
      circ(15, 25.6, 0.8, '#2f5f9b', NS) +
      rect(10.6, 31, 14.8, 2.2, '#4a2f1a', 0, NS) +
      line('M12 18L24 33', '#4a2f1a', 1.4),
    head:
      path('M12.6 8Q12.8 3.6 18 3.4Q23.2 3.6 23.4 8L22.6 7.4Q18 5.8 13.4 7.4Z', '#6a6a40') +
      rect(12.4, 6.6, 11.2, 1.4, '#2b2219', 0.6) +
      circ(18, 4.8, 1, GOLD, NS) +
      moust('#2d2018'),
    front: rect(11, 36, 14, 2, '#4a2f1a', 0, NS),
  },
  'empereur-germanique': {
    robe: '#7a2a7a',
    body: WIDE,
    back: path('M9 18Q18 15 27 18L31 46L5 46Z', '#5a1f5a'),
    deco:
      path('M10.6 16.6Q18 22.4 25.4 16.6L26.2 21Q18 27.6 9.8 21Z', WHITE) +
      dots([
        [13, 19.4],
        [16, 21],
        [20, 21],
        [23, 19.4],
        [11.6, 21.2],
        [24.4, 21.2],
      ]) +
      path('M14.6 27H21.4L22 33Q18 35 14 33Z', GOLD) +
      path('M18 28L19.4 30L18 32.4L16.6 30Z', BLACK_C) +
      rect(8.5, 43.2, 19, 2.8, GOLD, 0, NS) +
      line('M8.5 40H27.5', WHITE, 1.4),
    head:
      hairCap('#8a6a3a') +
      beard('#8a6a3a') +
      path('M12.8 7.6H23.2L23.6 3.6L21 5.2L18 2L15 5.2L12.4 3.6Z', GOLD) +
      line('M13 4.6Q18 -1.6 23 4.6', GOLD, 1.3) +
      rect(17.4, -3.2, 1.2, 3.6, GOLD, 0, NS) +
      rect(16.2, -2, 3.6, 1.1, GOLD, 0, NS) +
      circ(18, 5.2, 0.8, '#c0392b', NS),
    front:
      rect(27.2, 18, 1.2, 28, GOLD) +
      circ(27.8, 16.6, 2, GOLD) +
      circ(8.6, 33, 3.2, GOLD) +
      line('M5.6 33H11.6M8.6 30V36', '#a8281e', 0.9) +
      rect(8, 28.4, 1.2, 1.6, GOLD, 0, NS),
  },
  'prince-electeur': {
    robe: '#a8281e',
    body: WIDE,
    back: path('M9 18Q18 15 27 18L30 46L6 46Z', '#7a1a14'),
    deco:
      path('M10.6 16.6Q18 22.4 25.4 16.6L26.2 21Q18 27.6 9.8 21Z', WHITE) +
      dots([
        [13, 19.4],
        [16, 21],
        [20, 21],
        [23, 19.4],
      ]) +
      line('M12 21.4Q18 33 24 21.4', GOLD, 1.5) +
      circ(18, 29.6, 1.4, GOLD) +
      rect(8.5, 43.2, 19, 2.8, WHITE, 0, NS) +
      dots([
        [11, 44.6],
        [15, 44.6],
        [19, 44.6],
        [23, 44.6],
      ]),
    head:
      hairCap('#6a4a2a') +
      moust('#6a4a2a') +
      path('M12.8 7.4Q12.4 0.6 18 0.2Q23.6 0.6 23.2 7.4Z', '#a8281e') +
      rect(12.2, 5.8, 11.6, 2.8, WHITE, 1) +
      dots([
        [14, 7.2],
        [17, 7.2],
        [20, 7.2],
        [23, 7.2],
      ]) +
      circ(18, 0.2, 1, GOLD, NS),
    front: rect(26.8, 14, 1.2, 33, WOOD) + circ(27.4, 13, 1.9, GOLD),
  },
  reformateur: {
    skin: '#e0b48a',
    robe: '#1f1a14',
    body: WIDE,
    deco: path('M12 17.2Q18 21.6 24 17.2L24.6 20.4Q18 24 11.4 20.4Z', WHITE) + line('M18 22.4V43', '#3a3028', 0.8) + rect(8.5, 43.2, 19, 2.8, '#3a3028', 0, NS),
    head:
      path('M12.6 10.4Q12.2 5.4 18 5.4Q23.8 5.4 23.4 10.4Q22.6 7.8 18 7.8Q13.4 7.8 12.6 10.4Z', '#5c3a1c') +
      ell(18, 5, 7.6, 1.6, '#1f1a14') +
      path('M12.6 4.8Q13 1.6 18 1.4Q23 1.6 23.4 4.8Z', '#1f1a14') +
      path('M14.4 14.2Q18 16.4 21.6 14.2Q18 15 14.4 14.2Z', '#c9a07a', NS),
    front:
      path('M9.4 30.4L18 32.6L26.6 30.4L26.6 40L18 42.2L9.4 40Z', '#7a4a1e') +
      path('M10.6 31.4L18 33.4L25.4 31.4L25.4 38.8L18 40.8L10.6 38.8Z', '#f5ecd2', 'stroke-width="0.7"') +
      line('M18 33.4V40.8M12 34.4L16.4 35.4M12 36.2L16.4 37.2M19.6 35.4L24 34.4M19.6 37.2L24 36.2', '#8a8470', 0.5) +
      circ(9.4, 32.4, 1.9, SKIN) +
      circ(26.6, 32.4, 1.9, SKIN),
  },
  capitaine: {
    robe: '#8e949a',
    body: BODY,
    back: path('M10 18Q18 15 26 18L29 40L7 40Z', '#2f5f9b'),
    deco:
      path('M11.4 18.4Q18 16 24.6 18.4L25.2 31Q18 33 10.8 31Z', STEEL_C) +
      line('M18 18.6V31.6M13 24H23', '#6e747a', 0.8) +
      path('M11 16.8Q18 21 25 16.8L24.6 19.8Q18 23.6 11.4 19.8Z', WHITE) +
      line('M11 18L26 34', RED, 2.6) +
      rect(10.6, 33, 14.8, 2.2, '#4a2f1a', 0, NS) +
      line('M9 38H27', '#4a2f1a', 1),
    head:
      ell(18, 6.4, 9.4, 1.8, '#4a2f1a') +
      path('M12.4 6.4Q12.6 1.6 18 1.4Q23.4 1.6 23.6 6.4Z', '#4a2f1a') +
      path('M21 2.4Q28 -2.6 31 3Q27 1.6 22.6 5.6Z', WHITE) +
      path('M20 2Q25.4 -4 29 -1.6Q25 -1.4 21.6 3.4Z', RED) +
      moust('#3a2a1a') +
      path('M16.8 14.4Q18 17.8 19.2 14.4Z', '#3a2a1a', NS),
    front: rect(26.4, 28, 1.2, 12, WOOD) + circ(27, 27.4, 1.5, GOLD) + rect(26.6, 38.6, 0.8, 1, GOLD, 0, NS) + line('M9 36L5 45', STEEL_C, 1.2),
  },
  sage: {
    robe: '#2b3a6b',
    body: WIDE,
    back:
      circ(18, 10, 9.5, 'rgba(255,214,102,0.35)', NS) +
      circ(18, 10, 7.4, 'rgba(255,226,140,0.45)', NS) +
      line('M18 -2.6V-0.4M9.6 0.8L11 2.4M26.4 0.8L25 2.4M6.4 8H8.4M27.6 8H29.6', GOLD, 0.9),
    deco:
      path('M10 18Q18 15.6 26 18L26.6 22Q18 19.6 9.4 22Z', '#1d284d') +
      path('M13.4 27.4L14 28.8L15.4 29L14.3 29.9L14.7 31.4L13.4 30.6L12.1 31.4L12.5 29.9L11.4 29L12.8 28.8Z', GOLD, NS) +
      path('M23.6 39.4L24.1 40.6L25.4 40.8L24.4 41.6L24.8 42.9L23.6 42.2L22.4 42.9L22.8 41.6L21.8 40.8L23.1 40.6Z', GOLD, NS) +
      circ(10.6, 40.4, 0.8, GOLD, NS) +
      circ(25.4, 24.6, 0.7, GOLD, NS) +
      circ(15.6, 37.6, 0.6, GOLD, NS) +
      rect(7.6, 43.4, 20.8, 2.2, '#1d284d', 0, NS) +
      line('M8 43.4H28', GOLD, 0.7),
    head:
      path('M12.6 11.6Q11.6 5 18 4.6Q24.4 5 23.4 11.6Q23 8 21 7.2L18 8.4L15 7.2Q13 8 12.6 11.6Z', WHITE, 'stroke-width="0.7"') +
      path('M13 12Q12.6 20 15 25Q16.6 28.4 18 29.6Q19.4 28.4 21 25Q23.4 20 23 12Q20.6 15.4 18 15Q15.4 15.4 13 12Z', WHITE, 'stroke-width="0.7"') +
      line('M16 17.6Q16.6 22 17.4 25.6M20 17.6Q19.4 22 18.6 25.6', '#c9c2ae', 0.6) +
      path('M14.4 13.2Q16.3 12 18 13Q19.7 12 21.6 13.2Q20 14.8 18.6 14L18 13.6L17.4 14Q16 14.8 14.4 13.2Z', '#ece6d4', NS) +
      line('M14.8 9.6Q16.2 8.8 17.2 9.6M18.8 9.6Q19.8 8.8 21.2 9.6', '#d8d2c0', 0.9),
    front:
      path('M9.6 31.6Q14 30 18 32.2L18 38.6Q14 36.6 9.6 38Z', '#f5ecd2') +
      path('M26.4 31.6Q22 30 18 32.2L18 38.6Q22 36.6 26.4 38Z', '#efe3c2') +
      line('M11.4 33.4Q14 32.6 16.6 33.8M11.4 35.2Q14 34.4 16.6 35.6M19.4 33.8Q22 32.6 24.6 33.4M19.4 35.6Q22 34.4 24.6 35.2', '#8a8470', 0.5) +
      circ(9.6, 34.8, 1.9, SKIN) +
      circ(26.4, 34.8, 1.9, SKIN),
  },
} satisfies Record<Archetype, CharSpec>;

export function characterSvg(archetype: Archetype, tint?: string): string {
  const s: CharSpec = CHARACTER_SPECS[archetype];
  const skin = s.skin ?? SKIN;
  let g = '';
  g += s.back ?? '';
  g += path(s.body ?? BODY, tint ?? s.robe);
  g += s.deco ?? '';
  g += circ(11.5, 34, 1.9, skin) + circ(24.5, 34, 1.9, skin);
  g += rect(16.3, 14, 3.4, 5, skin);
  g += circ(18, 11, 5, skin);
  g += circ(16.2, 11.2, 0.6, OUT, NS) + circ(19.8, 11.2, 0.6, OUT, NS);
  g += s.head;
  g += s.front ?? '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 48" width="36" height="48" role="img" ` +
    `aria-label="${archetype}" focusable="false" style="overflow:visible">` +
    `<g stroke="${OUT}" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round">${g}</g></svg>`
  );
}

export function Character(props: { archetype: Archetype; tint?: string; width?: number; height?: number }) {
  const { archetype, tint, width = 36, height = 48 } = props;
  return (
    <span
      style={{ display: 'inline-block', width, height, lineHeight: 0 }}
      dangerouslySetInnerHTML={{
        __html: characterSvg(archetype, tint).replace('width="36" height="48"', `width="${width}" height="${height}"`),
      }}
    />
  );
}
