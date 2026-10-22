/**
 * Navires de la fenêtre de bataille, dessinés au canvas, vus de côté et tournés vers la droite : galère à rames avant 1600
 * (coque longue, éperon, rangée de rames qui battent, voile latine repliée), vaisseau à voiles carrées ensuite.
 * L'origine est le milieu du pont au niveau où se tient l'équipage ; `L` est la longueur de la coque en pixels.
 */
const INK = '#3b2a1a';

export interface ShipOpts {
  /** Couleur du camp (boucliers de bordée, bandes de voiles). */
  color: string;
  t: number;
  /** 0 à 1 : les rames battent (en mouvement) ou reposent (à l'arrêt). */
  rowing: boolean;
  seed: number;
  /** Coque coulée : plus bas, sans mâture. */
  wreck: boolean;
}

/** Vagues d'étrave et sillage : quelques traits blancs. */
function foam(ctx: CanvasRenderingContext2D, o: ShipOpts, y: number, from: number, to: number) {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 0.012;
  ctx.beginPath();
  for (let x = from; x < to; x += 0.1) {
    const dy = Math.sin(o.t * 2 + x * 14 + o.seed) * 0.012;
    ctx.moveTo(x, y + dy);
    ctx.lineTo(x + 0.06, y + dy);
  }
  ctx.stroke();
}

/** Galère : longue coque basse, éperon à l'étrave, rames, mât à voile latine repliée. */
export function drawGalley(ctx: CanvasRenderingContext2D, L: number, o: ShipOpts) {
  ctx.save();
  ctx.scale(L, L);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const bob = Math.sin(o.t * 2 + o.seed) * 0.008;
  ctx.translate(0, bob + (o.wreck ? 0.05 : 0));
  ctx.lineWidth = Math.max(1 / L, 0.012);
  ctx.strokeStyle = INK;
  if (!o.wreck) {
    // Mât et antenne de la voile latine repliée (derrière l'équipage).
    ctx.lineWidth = 0.02;
    ctx.beginPath();
    ctx.moveTo(0.02, 0);
    ctx.lineTo(0.02, -0.4);
    ctx.stroke();
    ctx.strokeStyle = '#8a5a2b';
    ctx.lineWidth = 0.012;
    ctx.stroke();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.034;
    ctx.beginPath();
    ctx.moveTo(-0.3, -0.12);
    ctx.lineTo(0.34, -0.43);
    ctx.stroke();
    ctx.strokeStyle = '#efe6cc';
    ctx.lineWidth = 0.022;
    ctx.stroke();
    // Voile roulée le long de l'antenne.
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    ctx.moveTo(-0.22, -0.145);
    ctx.lineTo(0.2, -0.35);
    ctx.stroke();
    ctx.strokeStyle = '#ddd3b8';
    ctx.lineWidth = 0.036;
    ctx.stroke();
  }
  // Rames : l'angle varie avec le temps quand le navire avance, chaque rame un peu décalée.
  const oarCount = 8;
  for (let k = 0; k < oarCount; k++) {
    const x = -0.36 + (k * 0.66) / (oarCount - 1);
    const swing = o.rowing ? Math.sin(o.t * 3.4 + k * 0.45 + o.seed) * 0.07 : 0;
    const x1 = x - 0.1 + swing;
    const y1 = o.wreck ? 0.2 : 0.26;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.02;
    ctx.beginPath();
    ctx.moveTo(x, 0.05);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.strokeStyle = '#b08a52';
    ctx.lineWidth = 0.011;
    ctx.stroke();
    ctx.fillStyle = '#8a5a2b';
    ctx.fillRect(x1 - 0.012, y1 - 0.01, 0.026, 0.035);
  }
  // Coque : pont, éperon, poupe relevée.
  ctx.fillStyle = '#6b4526';
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1 / L, 0.012);
  ctx.beginPath();
  ctx.moveTo(-0.5, -0.12);
  ctx.lineTo(-0.44, 0);
  ctx.lineTo(0.36, 0);
  ctx.lineTo(0.47, -0.05);
  ctx.lineTo(0.5, -0.02);
  ctx.lineTo(0.5, 0.07);
  ctx.lineTo(0.61, 0.11);
  ctx.lineTo(0.47, 0.13);
  ctx.quadraticCurveTo(0.1, 0.21, -0.3, 0.14);
  ctx.lineTo(-0.47, 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Bande de plat-bord et rang de boucliers du camp.
  ctx.fillStyle = '#8a5a2b';
  ctx.fillRect(-0.43, 0.003, 0.79, 0.018);
  ctx.fillStyle = o.color;
  for (let k = 0; k < 9; k++) {
    ctx.beginPath();
    ctx.arc(-0.37 + k * 0.088, 0.055, 0.021, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // Œil peint à l'étrave.
  ctx.fillStyle = '#f4efe0';
  ctx.beginPath();
  ctx.arc(0.43, 0.055, 0.014, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (!o.wreck) foam(ctx, o, 0.2, -0.45, 0.55);
  ctx.restore();
}

/** Vaisseau à voiles : coque haute à gaillards, sabords, deux mâts à voiles carrées, beaupré. */
export function drawSailer(ctx: CanvasRenderingContext2D, L: number, o: ShipOpts) {
  ctx.save();
  ctx.scale(L, L);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const bob = Math.sin(o.t * 1.7 + o.seed) * 0.01;
  const roll = Math.sin(o.t * 1.3 + o.seed) * 0.012;
  ctx.translate(0, bob + (o.wreck ? 0.06 : 0));
  ctx.rotate(roll);
  const lw = Math.max(1 / L, 0.012);
  ctx.lineWidth = lw;
  ctx.strokeStyle = INK;
  if (!o.wreck) {
    // Beaupré, mâts, vergues et voiles (gonflées par le vent), flammes.
    ctx.lineWidth = 0.025;
    ctx.beginPath();
    ctx.moveTo(0.46, -0.1);
    ctx.lineTo(0.68, -0.22);
    ctx.stroke();
    for (const [mx, top] of [
      [-0.14, -0.5],
      [0.2, -0.44],
    ] as const) {
      ctx.lineWidth = 0.022;
      ctx.beginPath();
      ctx.moveTo(mx, -0.02);
      ctx.lineTo(mx, top);
      ctx.stroke();
      const sails: [number, number, number][] = [
        [top + 0.03, 0.3, 0.17],
        [top + 0.2, 0.38, 0.2],
      ];
      for (const [sy, w, h] of sails) {
        const belly = 0.035 + Math.sin(o.t * 1.5 + mx * 9 + o.seed) * 0.008;
        ctx.fillStyle = '#efe6cc';
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(mx - w / 2, sy);
        ctx.lineTo(mx + w / 2, sy);
        ctx.quadraticCurveTo(mx + w / 2 + belly, sy + h / 2, mx + w / 2 - 0.02, sy + h);
        ctx.quadraticCurveTo(mx, sy + h + belly, mx - w / 2 + 0.02, sy + h);
        ctx.quadraticCurveTo(mx - w / 2 - belly, sy + h / 2, mx - w / 2, sy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = o.color;
        ctx.fillRect(mx - w / 2 + 0.01, sy + h * 0.42, w - 0.02, h * 0.16);
        ctx.lineWidth = 0.02;
        ctx.beginPath();
        ctx.moveTo(mx - w / 2 - 0.02, sy);
        ctx.lineTo(mx + w / 2 + 0.02, sy);
        ctx.stroke();
      }
      ctx.fillStyle = o.color;
      ctx.lineWidth = lw;
      const fl = Math.sin(o.t * 5 + mx * 7) * 0.012;
      ctx.beginPath();
      ctx.moveTo(mx, top);
      ctx.lineTo(mx - 0.1, top + 0.015 + fl);
      ctx.lineTo(mx, top + 0.045);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  // Coque haute : château arrière, pont, proue.
  ctx.fillStyle = '#5e3d1c';
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(-0.5, -0.22);
  ctx.lineTo(-0.32, -0.22);
  ctx.lineTo(-0.32, -0.06);
  ctx.lineTo(0.38, -0.03);
  ctx.lineTo(0.54, -0.14);
  ctx.lineTo(0.5, 0.1);
  ctx.quadraticCurveTo(0.1, 0.23, -0.38, 0.17);
  ctx.lineTo(-0.5, 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Bande aux couleurs du camp et sabords.
  ctx.fillStyle = o.color;
  ctx.fillRect(-0.47, 0.0, 0.95, 0.025);
  ctx.fillStyle = '#1f1a14';
  for (let k = 0; k < 6; k++) ctx.fillRect(-0.3 + k * 0.11, 0.055, 0.035, 0.032);
  ctx.fillStyle = '#8a5a2b';
  ctx.fillRect(-0.5, -0.235, 0.18, 0.016);
  if (!o.wreck) foam(ctx, o, 0.21, -0.45, 0.55);
  ctx.restore();
}
