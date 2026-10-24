/**
 * Navires de la fenêtre de bataille, dessinés au canvas, vus de côté et tournés vers la droite : galère à rames
 * (coque longue, éperon, rangée de rames qui battent, voile latine repliée), vaisseau à voiles carrées, galion
 * (château arrière, trois mâts, sabords), jonque (voiles à lattes, œil peint) et barque à rames.
 * L'origine est le milieu du pont au niveau où se tient l'équipage ; `L` est la longueur de la coque en pixels.
 */
import type { ShipType } from './weapons';

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
  /** Souffle sur les voiles : 1 par temps calme, plus au vent et dans la tempête (voiles plus gonflées). */
  wind?: number;
  /** Croix rouge sur les voiles (Espagne). */
  cross?: boolean;
}

export type { ShipType } from './weapons';

/** Part de longueur de coque que prend chaque type de navire (la barque est plus petite). */
export const SHIP_SCALE: Record<ShipType, number> = { galere: 1, vaisseau: 1, galion: 1.12, jonque: 1.05, barque: 0.72 };

/** Dessine le navire du type demandé. */
export function drawShip(ctx: CanvasRenderingContext2D, type: ShipType, L: number, o: ShipOpts) {
  const l = L * SHIP_SCALE[type];
  if (type === 'galere') drawGalley(ctx, l, o);
  else if (type === 'galion') drawGalleon(ctx, l, o);
  else if (type === 'jonque') drawJunk(ctx, l, o);
  else if (type === 'barque') drawBarque(ctx, l, o);
  else drawSailer(ctx, l, o);
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
        const belly = (0.035 + Math.sin(o.t * 1.5 + mx * 9 + o.seed) * 0.008) * (o.wind ?? 1);
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

/** Voile carrée gonflée par le vent, avec bande ou croix aux couleurs du camp. */
function squareSail(ctx: CanvasRenderingContext2D, o: ShipOpts, mx: number, sy: number, w: number, h: number, lw: number) {
  const belly = (0.03 + Math.sin(o.t * 1.5 + mx * 9 + sy * 5 + o.seed) * 0.007) * (o.wind ?? 1);
  ctx.fillStyle = '#efe6cc';
  ctx.strokeStyle = INK;
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
  if (o.cross) {
    // Croix de Bourgogne simplifiée : deux bras rouges.
    ctx.fillStyle = '#b3261e';
    const a = Math.min(w, h) * 0.2;
    ctx.fillRect(mx - a / 2, sy + h * 0.08, a, h * 0.84);
    ctx.fillRect(mx - w * 0.38, sy + h / 2 - a / 2, w * 0.76, a);
  } else {
    ctx.fillStyle = o.color;
    ctx.fillRect(mx - w / 2 + 0.01, sy + h * 0.42, w - 0.02, h * 0.16);
  }
  ctx.lineWidth = 0.02;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.moveTo(mx - w / 2 - 0.02, sy);
  ctx.lineTo(mx + w / 2 + 0.02, sy);
  ctx.stroke();
}

/** Galion : haut sur l'eau, château arrière élevé, trois mâts (deux carrés, un latin), deux rangs de sabords. */
export function drawGalleon(ctx: CanvasRenderingContext2D, L: number, o: ShipOpts) {
  ctx.save();
  ctx.scale(L, L);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.translate(0, Math.sin(o.t * 1.5 + o.seed) * 0.01 + (o.wreck ? 0.06 : 0));
  const lw = Math.max(1 / L, 0.011);
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  if (!o.wreck) {
    // Beaupré et civadière.
    ctx.lineWidth = 0.022;
    ctx.beginPath();
    ctx.moveTo(0.44, -0.13);
    ctx.lineTo(0.7, -0.22);
    ctx.stroke();
    // Mâts : misaine (avant), grand mât, artimon (arrière, voile latine).
    const masts: [number, number][] = [
      [0.3, -0.66],
      [-0.02, -0.84],
      [-0.33, -0.6],
    ];
    masts.forEach(([mx, top], i) => {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.022;
      ctx.beginPath();
      ctx.moveTo(mx, -0.06);
      ctx.lineTo(mx, top);
      ctx.stroke();
      if (i < 2) {
        const big = i === 1;
        squareSail(ctx, o, mx, top + 0.1, big ? 0.34 : 0.28, big ? 0.24 : 0.2, lw);
        squareSail(ctx, o, mx, top + (big ? 0.37 : 0.32), big ? 0.42 : 0.34, big ? 0.3 : 0.24, lw);
      } else {
        // Voile latine triangulaire de l'artimon.
        const belly = 0.02 * (o.wind ?? 1);
        ctx.fillStyle = '#efe6cc';
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(mx, top + 0.04);
        ctx.quadraticCurveTo(mx - 0.1 - belly, top + 0.2, mx - 0.24, top + 0.42);
        ctx.lineTo(mx, top + 0.42);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      // Flamme du camp en haut du mât.
      ctx.fillStyle = o.color;
      ctx.lineWidth = lw;
      const fl = Math.sin(o.t * 5 + mx * 7 + o.seed) * 0.014;
      ctx.beginPath();
      ctx.moveTo(mx, top);
      ctx.lineTo(mx - 0.12, top + 0.012 + fl);
      ctx.lineTo(mx, top + 0.04);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
  }
  // Coque : château arrière très haut, pont, gaillard d'avant, tonture relevée.
  ctx.fillStyle = '#5a3a1c';
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(-0.52, -0.34);
  ctx.lineTo(-0.26, -0.34);
  ctx.lineTo(-0.24, -0.1);
  ctx.lineTo(0.3, -0.07);
  ctx.lineTo(0.38, -0.18);
  ctx.lineTo(0.56, -0.2);
  ctx.lineTo(0.5, 0.1);
  ctx.quadraticCurveTo(0.1, 0.25, -0.38, 0.19);
  ctx.lineTo(-0.52, 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Galerie de poupe dorée et pavois du château.
  ctx.fillStyle = '#c99a3a';
  ctx.fillRect(-0.52, -0.34, 0.26, 0.02);
  ctx.fillRect(-0.5, -0.22, 0.2, 0.025);
  ctx.fillStyle = o.color;
  ctx.fillRect(-0.5, -0.31, 0.24, 0.05);
  // Bande aux couleurs du camp, puis deux rangs de sabords.
  ctx.fillRect(-0.48, -0.025, 0.96, 0.025);
  ctx.fillStyle = '#1f1a14';
  for (let k = 0; k < 7; k++) {
    ctx.fillRect(-0.28 + k * 0.1, 0.02, 0.034, 0.03);
    ctx.fillRect(-0.3 + k * 0.1, 0.1, 0.034, 0.03);
  }
  if (!o.wreck) foam(ctx, o, 0.23, -0.45, 0.55);
  ctx.restore();
}

/** Jonque : coque à fond plat et poupe relevée, trois voiles à lattes en éventail, œil peint à la proue. */
export function drawJunk(ctx: CanvasRenderingContext2D, L: number, o: ShipOpts) {
  ctx.save();
  ctx.scale(L, L);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.translate(0, Math.sin(o.t * 1.8 + o.seed) * 0.009 + (o.wreck ? 0.06 : 0));
  const lw = Math.max(1 / L, 0.011);
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  if (!o.wreck) {
    // Trois mâts penchés en éventail ; chaque voile est un panneau divisé par des lattes de bambou.
    const masts: [number, number, number, string][] = [
      [0.3, -0.5, 0.2, '#d9a441'],
      [-0.02, -0.74, 0.3, '#c0392b'],
      [-0.32, -0.52, 0.22, '#d9a441'],
    ];
    masts.forEach(([mx, top, w, col], i) => {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.022;
      ctx.beginPath();
      ctx.moveTo(mx, -0.04);
      ctx.lineTo(mx, top);
      ctx.stroke();
      const lean = (i - 1) * 0.035; // éventail : la voile avant est brassée vers l'avant
      const belly = (0.025 + Math.sin(o.t * 1.4 + i + o.seed) * 0.006) * (o.wind ?? 1);
      const bottom = -0.07;
      const sailTop = top + 0.04;
      ctx.fillStyle = col;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(mx - w * 0.15 + lean, sailTop);
      ctx.lineTo(mx + w + lean, sailTop + 0.02);
      ctx.quadraticCurveTo(mx + w + belly, (sailTop + bottom) / 2, mx + w * 0.9, bottom);
      ctx.lineTo(mx - w * 0.15, bottom);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Lattes horizontales.
      ctx.lineWidth = lw * 0.8;
      const slats = 6;
      for (let k = 1; k < slats; k++) {
        const y = sailTop + ((bottom - sailTop) * k) / slats;
        ctx.beginPath();
        ctx.moveTo(mx - w * 0.15 + lean * (1 - k / slats), y);
        ctx.lineTo(mx + w * (0.98 - 0.08 * (k / slats)) + belly * Math.sin((k / slats) * Math.PI), y);
        ctx.stroke();
      }
      // Fanion du camp.
      ctx.fillStyle = o.color;
      ctx.lineWidth = lw;
      const fl = Math.sin(o.t * 5 + i * 3 + o.seed) * 0.012;
      ctx.beginPath();
      ctx.moveTo(mx, top);
      ctx.lineTo(mx - 0.1, top + 0.01 + fl);
      ctx.lineTo(mx, top + 0.035);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
  }
  // Coque : fond plat, étrave carrée un peu relevée, haute poupe avec petite dunette.
  ctx.fillStyle = '#7a4a24';
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(-0.52, -0.2);
  ctx.lineTo(-0.34, -0.2);
  ctx.lineTo(-0.3, -0.07);
  ctx.lineTo(0.42, -0.07);
  ctx.lineTo(0.56, -0.12);
  ctx.lineTo(0.5, 0.13);
  ctx.lineTo(-0.42, 0.15);
  ctx.lineTo(-0.52, 0.0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Cloisons verticales (la coque est compartimentée) et bande du camp.
  ctx.lineWidth = lw * 0.8;
  for (let k = 0; k < 8; k++) {
    ctx.beginPath();
    ctx.moveTo(-0.36 + k * 0.1, -0.06);
    ctx.lineTo(-0.36 + k * 0.1, 0.13);
    ctx.stroke();
  }
  ctx.fillStyle = o.color;
  ctx.fillRect(-0.46, -0.07, 0.94, 0.03);
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(-0.52, -0.21, 0.18, 0.02);
  // Œil peint à la proue.
  ctx.fillStyle = '#f4efe0';
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(0.45, 0.01, 0.026, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(0.455, 0.01, 0.012, 0, Math.PI * 2);
  ctx.fill();
  if (!o.wreck) foam(ctx, o, 0.17, -0.45, 0.55);
  ctx.restore();
}

/** Barque : petite coque basse aux deux bouts relevés, deux rames, banc et petite voile roulée. */
export function drawBarque(ctx: CanvasRenderingContext2D, L: number, o: ShipOpts) {
  ctx.save();
  ctx.scale(L, L);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.translate(0, Math.sin(o.t * 2.4 + o.seed) * 0.012 + (o.wreck ? 0.05 : 0));
  const lw = Math.max(1 / L, 0.013);
  if (!o.wreck) {
    // Mât court et voile roulée.
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.025;
    ctx.beginPath();
    ctx.moveTo(0.05, 0);
    ctx.lineTo(0.05, -0.34);
    ctx.stroke();
    ctx.strokeStyle = '#ddd3b8';
    ctx.lineWidth = 0.04;
    ctx.beginPath();
    ctx.moveTo(-0.12, -0.3);
    ctx.lineTo(0.22, -0.3);
    ctx.stroke();
    // Rames qui plongent à tour de rôle.
    for (let k = 0; k < 2; k++) {
      const x = -0.2 + k * 0.32;
      const swing = o.rowing ? Math.sin(o.t * 3 + k * 1.3 + o.seed) * 0.07 : 0;
      const x1 = x - 0.12 + swing;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.022;
      ctx.beginPath();
      ctx.moveTo(x, 0.0);
      ctx.lineTo(x1, 0.24);
      ctx.stroke();
      ctx.strokeStyle = '#b08a52';
      ctx.lineWidth = 0.012;
      ctx.stroke();
    }
  }
  ctx.fillStyle = '#6b4526';
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(-0.5, -0.1);
  ctx.quadraticCurveTo(-0.4, 0.02, -0.34, 0.04);
  ctx.lineTo(0.34, 0.04);
  ctx.quadraticCurveTo(0.44, 0.02, 0.52, -0.12);
  ctx.quadraticCurveTo(0.5, 0.14, 0.2, 0.17);
  ctx.lineTo(-0.2, 0.17);
  ctx.quadraticCurveTo(-0.5, 0.14, -0.5, -0.1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = o.color;
  ctx.fillRect(-0.36, 0.06, 0.7, 0.03);
  if (!o.wreck) foam(ctx, o, 0.19, -0.4, 0.5);
  ctx.restore();
}
