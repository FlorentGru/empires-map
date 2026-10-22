/** La pièce d'artillerie en vue de côté, dessinée au canvas (pas d'image : le recul s'anime à la volée). */
import { CANNON_MUZZLE } from './weapons';

const WOOD = '#8a5a2b';
const WOOD_DARK = '#5e3d1c';
const BRONZE = '#b8832f';
const INK = '#3b2a1a';

/**
 * Dessine un canon dont le pied de roue est en (0, 0) après translation, regardant vers la droite (le miroir se fait
 * avec ctx.scale avant l'appel). `u` : largeur d'une figurine en pixels ; `recoil` de 0 à 1 ; `roll` : angle des rayons.
 */
export function drawCannon(ctx: CanvasRenderingContext2D, u: number, recoil: number, roll: number) {
  const back = -recoil * u * 0.28;
  const r = u * 0.3;
  ctx.save();
  ctx.translate(back, 0);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, u * 0.05);

  // Flèche de l'affût (la queue qui traîne au sol), puis les flasques.
  ctx.fillStyle = WOOD_DARK;
  ctx.beginPath();
  ctx.moveTo(-u * 0.75, -u * 0.03);
  ctx.lineTo(-u * 0.12, -r * 1.55);
  ctx.lineTo(u * 0.2, -r * 1.45);
  ctx.lineTo(-u * 0.55, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Tube : bronze, légèrement relevé, avec renfort et bourrelet de bouche.
  const mx = CANNON_MUZZLE.dx * u;
  const mz = CANNON_MUZZLE.dz * u;
  ctx.fillStyle = BRONZE;
  ctx.beginPath();
  ctx.moveTo(-u * 0.22, -r * 1.35);
  ctx.lineTo(mx - u * 0.02, mz * -1 - u * 0.08);
  ctx.lineTo(mx - u * 0.02, mz * -1 + u * 0.1);
  ctx.lineTo(-u * 0.22, -r * 1.05);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(mx - u * 0.1, -mz - u * 0.12, u * 0.1, u * 0.24);
  ctx.strokeRect(mx - u * 0.1, -mz - u * 0.12, u * 0.1, u * 0.24);

  // Roue : jante, rayons, moyeu (les rayons tournent quand le canon recule).
  ctx.fillStyle = WOOD;
  ctx.beginPath();
  ctx.arc(0, -r, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = Math.max(0.8, u * 0.03);
  for (let i = 0; i < 4; i++) {
    const a = roll + (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.95, -r + Math.sin(a) * r * 0.95);
    ctx.lineTo(-Math.cos(a) * r * 0.95, -r - Math.sin(a) * r * 0.95);
    ctx.stroke();
  }
  ctx.fillStyle = WOOD_DARK;
  ctx.beginPath();
  ctx.arc(0, -r, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
