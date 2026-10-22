/**
 * Poses de combat des figurines (visée, rechargement, charge). Tout est ici, dans le chunk de la fenêtre, pour ne pas
 * alourdir le JS initial : src/figures/soldiers.tsx n'expose qu'un point d'accroche (`SoldierPoseFn`).
 * Le dessin d'un soldat est un SVG 32×40 regardant vers la droite ; l'arme habituelle est verticale près de x = 26.
 */
import type { SoldierPoseFn } from '../figures/soldiers';

export type SoldierPose = 'marche' | 'vise' | 'recharge' | 'baionnette';
export type WeaponClass = 'fusil' | 'arquebuse' | 'arc' | 'autre';

/** Reconnaît l'arme d'après son dessin (fusil gris #6e7378, arquebuse #5e646a, arc courbé en Q31.5). */
export function weaponClass(weapon: string): WeaponClass {
  if (weapon.includes('Q31.5')) return 'arc';
  if (weapon.includes('#6e7378')) return 'fusil';
  if (weapon.includes('#5e646a')) return 'arquebuse';
  return 'autre';
}

/** Largeur marginale ajoutée de chaque côté du dessin : les armes pointées en avant dépassent des 32 unités. */
export const PAD = 8;
export const SPRITE_W = 32 + 2 * PAD;

const SHOULDER = [20.5, 14.5] as const;
const GRIP = [26, 22] as const;

/** Pose l'arme (verticale, pointe en haut) : poignée en (tx, ty), tournée de `deg`, raccourcie de `sy` selon son axe. */
const place = (w: string, tx: number, ty: number, deg: number, sy: number, px: number = GRIP[0], py: number = GRIP[1]) =>
  `<g transform="translate(${tx} ${ty}) rotate(${deg}) scale(1 ${sy}) translate(${-px} ${-py})">${w}</g>`;

/** Bras tendu de l'épaule à la main (h), avec la main. */
function arm(tunic: string, skin: string, hx: number, hy: number): string {
  const dx = hx - SHOULDER[0];
  const dy = hy - SHOULDER[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * 1.3;
  const ny = (dx / len) * 1.3;
  const f = (n: number) => n.toFixed(2);
  const d = `M${f(SHOULDER[0] + nx)} ${f(SHOULDER[1] + ny)}L${f(hx + nx * 0.8)} ${f(hy + ny * 0.8)}L${f(hx - nx * 0.8)} ${f(hy - ny * 0.8)}L${f(SHOULDER[0] - nx)} ${f(SHOULDER[1] - ny)}Z`;
  return `<path d="${d}" fill="${tunic}"/><circle cx="${hx}" cy="${hy}" r="1.8" fill="${skin}"/>`;
}

/** Paramètres de la pose « en joue » d'une arme à feu : poignée, angle, raccourci. */
const AIM = { tx: 27.5, ty: 17, deg: 88, sy: 0.5 };
/** Haut du canon (y du dessin d'origine) : sert à placer la bouche de l'arme. */
const BARREL_TOP = { fusil: 9, arquebuse: 6.4 };

/**
 * Bouche de l'arme (fusil, arquebuse) ou pointe de la flèche (arc) dans le repère du dessin 32×40 en pose `vise`.
 * Le moteur en tire l'origine des éclairs, des fumées et des flèches.
 */
export const MUZZLE: Record<'fusil' | 'arquebuse' | 'arc', [number, number]> = {
  fusil: muzzleOf(BARREL_TOP.fusil),
  arquebuse: muzzleOf(BARREL_TOP.arquebuse),
  arc: [35, 16],
};
function muzzleOf(top: number): [number, number] {
  const r = (GRIP[1] - top) * AIM.sy;
  const a = (AIM.deg * Math.PI) / 180;
  return [AIM.tx + r * Math.sin(a), AIM.ty - r * Math.cos(a)];
}

/** Inclinaison du corps (degrés, autour des pieds) selon la pose. */
export const LEAN: Record<SoldierPose, number> = { marche: 0, vise: 0, recharge: 0, baionnette: 8 };

/** Fonction à passer à `soldierSvg` ; `undefined` pour la marche habituelle. */
export function poseFn(pose: SoldierPose): SoldierPoseFn | undefined {
  if (pose === 'marche') return undefined;
  return ({ weapon, tunic, skin }) => {
    const cls = weaponClass(weapon);
    if (cls === 'fusil' || cls === 'arquebuse') {
      if (pose === 'vise') return { arm: arm(tunic, skin, AIM.tx - 0.5, AIM.ty + 0.6), weapon: place(weapon, AIM.tx, AIM.ty, AIM.deg, AIM.sy) };
      if (pose === 'baionnette') return { arm: arm(tunic, skin, 24.5, 22.5), weapon: place(weapon, 24.5, 22.5, 75, 0.62) };
      // recharge : arme verticale devant soi, crosse au sol, baguette dressée au-dessus du canon
      const top = 38 - (38 - BARREL_TOP[cls]) * 0.85;
      const rod = `<path d="M28.6 ${top.toFixed(1)}L28.6 0.8" fill="none" stroke="#d2b27a" stroke-width="1"/>`;
      return {
        arm: arm(tunic, skin, 27.6, top + 1.5),
        weapon: place(weapon, 27.5, 38, 0, 0.85, 26, 38) + rod,
      };
    }
    if (cls === 'arc') {
      if (pose !== 'vise') return null;
      // arc tenu à bout de bras, corde tirée jusqu'à la joue, flèche encochée
      const bow = weapon.replace(/<path d="M25 7L25 37"[^>]*\/>/, '');
      const bx = 26.75;
      const string = `<path d="M${bx} 4L20.5 15L${bx} 28" fill="none" stroke="#efe6cc" stroke-width="0.6"/>`;
      const shaft = `<path d="M20.5 15L35 15" fill="none" stroke="#6b4a24" stroke-width="0.9"/><path d="M35 15L33.6 14L33.6 16Z" fill="#d6dadc" stroke="none"/>`;
      return {
        arm: arm(tunic, skin, 30, 16),
        weapon: place(bow, 30.5, 16, 0, 0.8, 28.25, 22) + string + shaft + `<circle cx="20.5" cy="15" r="1.4" fill="${skin}"/>`,
      };
    }
    // lance, épée, hallebarde… : brandie (vise) ou pointée en avant (baionnette)
    if (pose === 'vise') return { arm: arm(tunic, skin, 24, 15.5), weapon: place(weapon, 24, 15.5, 64, 0.7) };
    if (pose === 'baionnette') return { arm: arm(tunic, skin, 24, 21.5), weapon: place(weapon, 24, 21.5, 84, 0.68) };
    return null;
  };
}

/** Élargit le dessin (marges PAD) et l'affiche à `k` fois sa taille ; incline le corps si `lean` ≠ 0. */
export function finishSvg(svg: string, lean: number, k = 2): string {
  let out = svg.replace('viewBox="0 0 32 40" width="32" height="40"', `viewBox="${-PAD} 0 ${SPRITE_W} 40" width="${SPRITE_W * k}" height="${40 * k}"`);
  if (lean) out = out.replace(/(<g stroke[^>]*>)/, `$1<g transform="rotate(${lean} 16 38)">`).replace('</g></svg>', '</g></g></svg>');
  return out;
}
