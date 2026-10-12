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
const line = (d: string, color: string, w = 1, extra = '') =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}"${extra ? ' ' + extra : ''}/>`;
const NS = 'stroke="none"';

const GOLD = '#e0b43a';
const PURPLE = '#6d2a7a';
const RED = '#a8281e';
const WHITE = '#f4efe0';
const WOOD = '#8a5a2b';
const SKIN = '#e0b48a';

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
const moust = (c: string) =>
  path('M14.6 13Q16.3 12 18 13Q19.7 12 21.4 13Q20 14.8 18.8 13.8L18 13.4L17.2 13.8Q16 14.8 14.6 13Z', c, NS);
const hairCap = (c: string) =>
  path('M12.9 11Q12.4 5.6 18 5.6Q23.6 5.6 23.1 11Q22.4 7.6 18 7.6Q13.6 7.6 12.9 11Z', c);
const dots = (pts: [number, number][]) => pts.map(([x, y]) => circ(x, y, 0.6, OUT, NS)).join('');

export const CHARACTER_SPECS = {
  senateur: {
    robe: '#f1ead8',
    deco:
      path('M14.5 17L17.5 17.5L16.8 46L12.6 46Z', PURPLE, NS) +
      line('M25.5 18.5Q19 26 11.5 31', '#c9bfa4', 0.9) + line('M26.5 26Q19 32 11 38', '#c9bfa4', 0.9),
    head: hairCap('#b8b3a8'),
    front: rect(22, 28, 3.6, 10, '#e8dcc0', 1.4) + circ(23.8, 28, 1.3, '#c9a878') + circ(23.8, 38, 1.3, '#c9a878'),
  },
  consul: {
    robe: '#f1ead8',
    deco:
      rect(8.5, 43.2, 19, 2.8, PURPLE, 0, NS) + line('M25 18.5Q19 27 12 33', PURPLE, 1.6) +
      line('M25.5 28Q19 34 11 40', '#c9bfa4', 0.9),
    back:
      rect(2.2, 17, 5, 26, WOOD, 1) + line('M3.8 17V43M5.6 17V43', '#5c3a1c', 0.7) +
      rect(1.8, 22, 5.8, 1.4, RED, 0, NS) + rect(1.8, 36, 5.8, 1.4, RED, 0, NS) +
      path('M7 14.4L11 12.4L11 17.6L7 16.6Z', '#aeb3b8'),
    head: hairCap('#5c3a1c'),
  },
  empereur: {
    robe: PURPLE,
    body: WIDE,
    deco:
      path('M13 19Q18 17.4 23 19L22.4 30Q18 31.6 13.6 30Z', GOLD) + line('M15.4 22H20.6M15.6 25.4H20.4', '#a07a1a', 0.8) +
      circ(11.4, 20.4, 1.9, GOLD) + rect(8.5, 43.2, 19, 2.8, GOLD, 0, NS),
    head:
      hairCap('#5c3a1c') +
      line('M12.6 12.5Q11.4 5.6 18 4.8Q24.6 5.6 23.4 12.5', '#5a8a3a', 2.4) +
      line('M13.4 8Q18 5.8 22.6 8', GOLD, 0.8) + circ(18, 4.8, 1.2, GOLD),
  },
  'empereur-byzantin': {
    robe: '#5b2a86',
    body: WIDE,
    deco:
      path('M12.5 18L17.5 18.4L25.5 37L21 37.4Z', GOLD) + path('M8 41.5H28L28.6 46H7.4Z', GOLD) +
      circ(14.8, 21.5, 0.9, '#c0392b', NS) + circ(18.6, 29, 0.9, '#2f6fa8', NS) + circ(22.4, 35.5, 0.9, '#c0392b', NS),
    head:
      path('M12.8 7.8H23.2L23.4 4.6L21 6.2L18 3.2L15 6.2L12.6 4.6Z', GOLD) + circ(18, 5, 0.9, '#c0392b', NS) +
      line('M12.8 8.4V13.6M23.2 8.4V13.6', GOLD, 0.8) +
      circ(12.8, 10.6, 1.1, WHITE) + circ(12.8, 13.8, 1.1, WHITE) + circ(23.2, 10.6, 1.1, WHITE) + circ(23.2, 13.8, 1.1, WHITE) +
      hairCap('#2d2018') + beard('#2d2018'),
  },
  roi: {
    robe: '#2f4f9b',
    back: path('M9 18Q18 15 27 18L31 46L5 46Z', RED),
    deco:
      path('M10 18Q18 14.5 26 18L25 23.4Q18 20.4 11 23.4Z', WHITE) +
      dots([[13, 19.6], [17, 18.6], [21, 18.6], [24.4, 20], [15, 21.6], [20, 21.2]]) +
      rect(15.5, 26, 5, 1.6, GOLD, 0, NS) + rect(8.5, 43.5, 19, 2.5, GOLD, 0, NS),
    head:
      hairCap('#7a4a24') + beard('#7a4a24') +
      path('M13 7.4H23L23.6 3L21 5.4L18 2L15 5.4L12.4 3Z', GOLD) + circ(18, 5.6, 0.9, '#c0392b', NS),
    front: rect(26.6, 23, 1.3, 22, GOLD) + circ(27.2, 21.4, 2, GOLD) + line('M25.4 21.4H29', '#a07a1a', 0.7),
  },
  pape: {
    robe: WHITE,
    deco:
      path('M10.2 18Q18 14.8 25.8 18L26.4 26.4Q18 29.4 9.6 26.4Z', RED) +
      line('M18 28V40M15 31H21', GOLD, 1.2) + rect(8.5, 43.5, 19, 2.5, GOLD, 0, NS),
    head:
      path('M12.8 7.6L15.4 1.8L18 0.6L20.6 1.8L23.2 7.6Q18 6 12.8 7.6Z', WHITE) +
      line('M13.2 6.6Q18 5.2 22.8 6.6', GOLD, 1.3) + line('M18 2.2V5M16.4 3.4H19.6', GOLD, 0.9),
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
    front:
      rect(29, 17, 1.4, 29, WOOD) + path('M29.7 16.4Q35.2 17.4 34.6 24Q32 22.8 29.7 25Z', '#9aa0a6'),
  },
  calife: {
    skin: '#d0a070',
    robe: '#262626',
    body: WIDE,
    deco:
      path('M15 18.4L21 18.4L21.8 46L14.2 46Z', '#f1ead8') +
      rect(8, 43.4, 20, 2, GOLD, 0, NS) + line('M13 18.6L10.6 44M23 18.6L25.4 44', GOLD, 0.9),
    back: path('M24 8Q28.6 14 25.4 20L23 13Z', '#262626'),
    head:
      ell(18, 6.8, 7.6, 4.4, '#262626') + line('M11 7.4Q18 10.6 25 7.4M12.4 4.6Q18 7.2 23.6 4.6', '#6e6e6e', 0.8) +
      beard('#3b2a1a'),
  },
  sultan: {
    skin: '#d2a070',
    robe: '#9b2d20',
    body: WIDE,
    deco:
      rect(17.1, 18, 1.8, 28, GOLD, 0, NS) + line('M14.6 22.4H21.4M14.6 27.4H21.4M14.6 32.4H21.4', GOLD, 0.9) +
      rect(10, 34, 16, 2.4, GOLD, 0, NS) + path('M10 18.4Q18 15 26 18.4L25 22.4Q18 19.6 11 22.4Z', '#6b4a2e'),
    head:
      ell(18, 6.2, 8.2, 4.5, WHITE) + line('M10.6 6.8Q18 10 25.4 6.8M12 4.6Q18 7 24 4.6', '#c9bfa4', 0.8) +
      path('M17.6 4Q16.4 1.4 18.4 0.8Q19.4 2 18.6 4Z', WHITE) + circ(18, 4.8, 1.3, GOLD) + circ(18, 4.8, 0.5, '#c0392b', NS) +
      moust('#2d2018') + beard('#2d2018'),
  },
  doge: {
    robe: '#d8b04a',
    deco:
      path('M9.4 18Q18 14.8 26.6 18L26.4 25Q18 21.4 9.6 25Z', WHITE) +
      dots([[12, 20.4], [16, 19], [20, 19], [24, 20.4], [14, 22.6], [22, 22.6]]) +
      line('M18 24V45M13 30Q18 33 23 30M12 37Q18 40 24 37', '#a07a1a', 0.8) + rect(8.5, 43.5, 19, 2.5, WHITE, 0, NS),
    head:
      path('M12.8 9.6Q13 5 18 5Q23 5 23.2 9.6Q18 7.4 12.8 9.6Z', WHITE) +
      path('M13.6 7.6Q14 3.6 17.4 3Q22.6 2.4 24 6.4Q24.6 9.4 23 9.8Q22.6 6.6 18.6 6.6Z', RED) +
      line('M17.4 3Q22.6 2.4 24 6.4', GOLD, 0.8) +
      beard(WHITE),
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
