import { MercatorCoordinate, type CustomLayerInterface, type CustomRenderMethodInput, type CustomTerrainRenderInput, type Map as MapLibreMap } from 'maplibre-gl';
import { loadSdf } from '../data/loadEmpire';
import { DIFF_COLORS } from './diff';
import { variantFill, variantLine } from './color';
import { FILL_OPACITY } from './territoryLayers';

/** Durée nominale du glissement par champs de distance (ms, à vitesse 1). */
export const GLIDE_MS = 3000;
/** Durée du fondu vers le territoire vectoriel final. */
export const GLIDE_HANDOFF_MS = 250;

const LAYER = 'glide-sdf';
const LINE_OPACITY = 0.9;
/** Au-delà de cet intervalle entre deux images, l'image compte comme « lente » (overlay de debug). */
const SLOW_FRAME_MS = 25;

const easeInOutSine = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

// Quad unitaire (u vers l'est, v vers le sud), placé sur l'emprise Web Mercator du SDF par u_bounds.
const VERT = `#version 300 es
uniform mat4 u_matrix;
uniform vec4 u_bounds; // x0, y0 (nord-ouest), x1, y1 (sud-est) en coordonnées Mercator 0..1
in vec2 a_uv;
out vec2 uv;
void main() {
  uv = a_uv;
  gl_Position = u_matrix * vec4(mix(u_bounds.xy, u_bounds.zw, a_uv), 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D tex;
uniform float p;
uniform float opacity;
uniform vec3 color;
uniform vec3 lineColor;
uniform vec3 gainColor;
uniform vec3 lossColor;
uniform float fillOpacity;
uniform float lineOpacity;
in vec2 uv;
out vec4 outColor;
void main() {
  vec3 s = texture(tex, uv).rgb;
  float dNew = (s.r - 0.502) * 2.0;
  float dOld = (s.g - 0.502) * 2.0;
  float aa = fwidth(dNew) + 1e-4;
  float aa2 = fwidth(dOld) + 1e-4;
  float inNew = smoothstep(-aa, aa, dNew);
  float inOld = smoothstep(-aa2, aa2, dOld);
  // Temps : interpolation bilinéaire manuelle en ignorant les texels sans objet (B = 0), pour que
  // la valeur ne s'effondre pas vers 0 le long des bords de la zone gagnée / perdue.
  ivec2 sz = textureSize(tex, 0);
  vec2 st = uv * vec2(sz) - 0.5;
  ivec2 i0 = ivec2(floor(st));
  vec2 f = fract(st);
  float tSum = 0.0;
  float wSum = 0.0;
  for (int k = 0; k < 4; k++) {
    ivec2 o = ivec2(k & 1, k >> 1);
    float wk = (o.x == 1 ? f.x : 1.0 - f.x) * (o.y == 1 ? f.y : 1.0 - f.y);
    float bv = texelFetch(tex, clamp(i0 + o, ivec2(0), sz - 1), 0).b * 255.0;
    if (bv > 0.5) { tSum += wk * (bv - 1.0) / 254.0; wSum += wk; }
  }
  float t = wSum > 1e-4 ? clamp(tSum / wSum, 0.0, 1.0) : 0.5;
  float w = 0.012;
  float reach = smoothstep(t - w, t + w, p);
  float stable = inNew * inOld;
  float gainedA = inNew * (1.0 - inOld);
  float lostA = inOld * (1.0 - inNew);
  float gained = gainedA * reach;
  float lost = lostA * (1.0 - reach);
  float a = clamp(stable + gained + lost, 0.0, 1.0);

  // Liseré du front : zone en transition (|t - p| < 0.03)
  float front = 1.0 - smoothstep(0.0, 0.03, abs(t - p));
  float fg = gainedA * front;
  float fl = lostA * front;
  vec3 c = color;
  c = mix(c, gainColor, fg * 0.5);
  c = mix(c, lossColor, fl * 0.5);

  // Contour fin sur la frontière visible (a = 0.5)
  float fa = fwidth(a) + 1e-4;
  float line = (1.0 - smoothstep(0.0, fa * 1.2, abs(a - 0.5))) * lineOpacity;
  float fillA = a * fillOpacity;
  float outA = fillA * (1.0 - line) + line;
  vec3 rgb = c * fillA * (1.0 - line) + lineColor * line;
  // Alpha prémultiplié (blendFunc ONE, ONE_MINUS_SRC_ALPHA de MapLibre).
  outColor = vec4(rgb, outA) * opacity;
}`;

const UNIFORMS = ['u_matrix', 'u_bounds', 'tex', 'p', 'opacity', 'color', 'lineColor', 'gainColor', 'lossColor', 'fillOpacity', 'lineOpacity'] as const;

function cssToRgb(css: string): [number, number, number] {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 1;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [0.5, 0.5, 0.5];
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return [d[0]! / 255, d[1]! / 255, d[2]! / 255];
}

/** Matrice (colonnes) qui envoie les coordonnées Mercator 0..1 dans l'espace d'une tuile de relief : (−1, −1) au sud-ouest, (1, 1) au nord-est. */
function terrainTileMatrix({ tileID }: CustomTerrainRenderInput): Float32Array {
  const { z, x, y } = tileID.canonical;
  const s = 2 ** z;
  return new Float32Array([2 * s, 0, 0, 0, 0, -2 * s, 0, 0, 0, 0, 1, 0, -2 * x - 1, 2 * y + 1, 0, 1]);
}

/**
 * Frontière qui glisse en continu : champs de distance signés (PNG) seuillés par un fragment shader,
 * dessinés directement dans le contexte WebGL de MapLibre (couche personnalisée).
 * - Carte plate : `render`, un quad sur l'emprise du SDF.
 * - Relief 3D : `renderToTerrainTile`, drapé sur le terrain avec les autres couches ; chaque image
 *   incrémente `terrainTileRevision` pour que MapLibre redrape toutes les tuiles à la nouvelle progression.
 * Aucune copie de canvas par image : seul l'uniform p change.
 */
export class GlideLayer {
  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private texture: WebGLTexture | null = null;
  private uniforms: Partial<Record<(typeof UNIFORMS)[number], WebGLUniformLocation | null>> = {};
  private readonly layer: CustomLayerInterface;
  private bounds: [number, number, number, number] = [0, 0, 0, 0];
  private fill: [number, number, number] = [0.5, 0.5, 0.5];
  private line: [number, number, number] = [0.5, 0.5, 0.5];
  private ready = false;
  private visible = false;
  private raf = 0;
  private gen = 0;
  /** Progression courante du front (0 = ancienne frontière, 1 = nouvelle). */
  p = 0;
  private opacity = 1;
  private overlay: HTMLElement | null = null;
  private mode = 'sdf';
  private frames: number[] = [];
  private worstFrame = 0;
  private slowFrames = 0;
  private lastOverlay = 0;
  private readonly debug = new URLSearchParams(window.location.search).get('debug') === '1';

  constructor(private map: MapLibreMap, beforeId?: string) {
    this.layer = {
      id: LAYER,
      type: 'custom',
      renderingMode: '2d',
      terrainTileRevision: 0,
      onAdd: (_map, gl) => this.onAdd(gl),
      onRemove: () => this.release(),
      render: (gl, args) => this.render(gl, args),
      renderToTerrainTile: (gl, args) => this.renderTerrain(gl, args),
    };
    map.addLayer(this.layer, beforeId);
    map.setLayoutProperty(LAYER, 'visibility', 'none');
  }

  get available(): boolean {
    return this.program !== null;
  }

  private onAdd(gl: WebGL2RenderingContext) {
    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn('[glide] shader :', gl.getShaderInfoLog(sh));
        return null;
      }
      return sh;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, 'a_uv');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('[glide] link :', gl.getProgramInfoLog(prog));
      return;
    }
    for (const n of UNIFORMS) this.uniforms[n] = gl.getUniformLocation(prog, n);
    // VAO propre : ne jamais modifier les attributs d'un VAO de MapLibre.
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    this.texture = gl.createTexture();
    this.program = prog;
    this.vao = vao;
    this.gl = gl;
  }

  private draw(gl: WebGL2RenderingContext, matrix: ArrayLike<number>) {
    if (!this.ready || !this.program || this.opacity <= 0) return;
    const u = this.uniforms;
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniformMatrix4fv(u.u_matrix!, false, matrix instanceof Float32Array ? matrix : Float32Array.from(matrix));
    gl.uniform4f(u.u_bounds!, ...this.bounds);
    gl.uniform1i(u.tex!, 0);
    gl.uniform1f(u.p!, this.p);
    gl.uniform1f(u.opacity!, this.opacity);
    gl.uniform3f(u.color!, ...this.fill);
    gl.uniform3f(u.lineColor!, ...this.line);
    gl.uniform3f(u.gainColor!, ...cssToRgbCached(DIFF_COLORS.gained));
    gl.uniform3f(u.lossColor!, ...cssToRgbCached(DIFF_COLORS.lost));
    gl.uniform1f(u.fillOpacity!, FILL_OPACITY);
    gl.uniform1f(u.lineOpacity!, LINE_OPACITY);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }

  private render(gl: WebGL2RenderingContext, args: CustomRenderMethodInput) {
    this.draw(gl, args.defaultProjectionData.mainMatrix);
  }

  private renderTerrain(gl: WebGL2RenderingContext, args: CustomTerrainRenderInput) {
    this.draw(gl, terrainTileMatrix(args));
  }

  /** Demande une nouvelle image ; en relief, force le redrapage des tuiles. */
  private repaint() {
    this.layer.terrainTileRevision = (this.layer.terrainTileRevision ?? 0) + 1;
    this.map.triggerRepaint();
  }

  /**
   * Charge le SDF de l'étape, l'uploade et positionne le quad à la progression initiale p (sans l'afficher).
   * Renvoie false si les fichiers sont absents ou si le shader n'a pas pu être compilé.
   */
  async prepare(empireId: string, stepId: string, color = '#888888', p = 0): Promise<boolean> {
    if (!this.gl || !this.program) return false;
    this.hide();
    const gen = this.gen;
    const sdf = await loadSdf(empireId, stepId);
    const gl = this.gl;
    if (!sdf || gen !== this.gen || !gl) return false;
    const { bitmap, meta } = sdf;
    try {
      // Hors rendu : MapLibre remet son état GL en cache à zéro au début de chaque image.
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindTexture(gl.TEXTURE_2D, null);
    } catch (err) {
      console.warn('[glide] préparation impossible :', err);
      return false;
    }
    // bounds : [nord-ouest, nord-est, sud-est, sud-ouest] ; grille alignée sur Web Mercator.
    const nw = MercatorCoordinate.fromLngLat(meta.bounds[0]);
    const se = MercatorCoordinate.fromLngLat(meta.bounds[2]);
    this.bounds = [nw.x, nw.y, se.x, se.y];
    this.fill = cssToRgbCached(variantFill(color, 0));
    this.line = cssToRgbCached(variantLine(color, 0));
    this.p = p;
    this.opacity = 1;
    this.ready = true;
    this.showOverlay();
    return true;
  }

  private setVisible(v: boolean) {
    if (this.visible === v || !this.gl || !this.map.getLayer(LAYER)) return;
    this.visible = v;
    this.map.setLayoutProperty(LAYER, 'visibility', v ? 'visible' : 'none');
  }

  /** Affiche le glissement à la progression courante (sans animer). */
  show() {
    if (!this.ready) return;
    this.opacity = 1;
    this.setVisible(true);
    this.repaint();
  }

  /**
   * Anime p : from → 1 − from, une valeur par image, au rythme de requestAnimationFrame.
   * onDone est appelé quand la progression finale est posée (elle s'affiche à l'image suivante).
   */
  play(from: 0 | 1, durationMs: number, onDone: () => void) {
    this.cancel();
    if (!this.ready) {
      onDone();
      return;
    }
    this.show();
    const to = 1 - from;
    this.frames = [];
    this.worstFrame = 0;
    this.slowFrames = 0;
    this.animate(durationMs, (k) => {
      this.p = from + (to - from) * easeInOutSine(k);
    }, onDone);
  }

  /** Estompe le glissement (opacité dans le shader) puis le masque ; la progression finale reste affichée pendant le fondu. */
  fadeOut(ms: number) {
    if (!this.visible) return;
    this.animate(ms, (k) => {
      this.opacity = 1 - k;
    }, () => this.hide());
  }

  /** Boucle d'animation unique : t0 = première image, k ∈ [0, 1]. */
  private animate(durationMs: number, apply: (k: number) => void, onDone: () => void) {
    this.cancel();
    let t0 = -1;
    let last = 0;
    const frame = (now: number) => {
      if (t0 < 0) t0 = now;
      if (last > 0) this.tickOverlay(now, now - last);
      last = now;
      const k = durationMs > 0 ? Math.min(1, Math.max(0, (now - t0) / durationMs)) : 1;
      apply(k);
      this.repaint();
      if (k < 1) this.raf = requestAnimationFrame(frame);
      else {
        this.raf = 0;
        onDone();
      }
    };
    this.raf = requestAnimationFrame(frame);
  }

  cancel() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  hide() {
    this.cancel();
    this.gen++;
    this.setVisible(false);
    this.ready = false;
    this.opacity = 1;
    this.overlay?.remove();
    this.overlay = null;
  }

  /** Mode affiché dans l'overlay de debug : sdf / bandes / fondu ; aussi exposé sur le conteneur (data-transition). */
  setMode(mode: string) {
    this.mode = mode;
    this.map.getContainer().dataset.transition = mode;
    if (this.debug) this.showOverlay();
  }

  private showOverlay() {
    if (!this.debug) return;
    if (!this.overlay) {
      this.overlay = document.createElement('div');
      this.overlay.className = 'debug-overlay';
      this.overlay.style.bottom = '38px';
      document.body.appendChild(this.overlay);
    }
    this.overlay.textContent = this.overlayText();
  }

  private overlayText(): string {
    const fps = this.frames.length > 0 ? String(this.frames.length) : '–';
    return `glide p=${this.p.toFixed(2)} · mode ${this.mode} · FPS ${fps} · pire image ${Math.round(this.worstFrame)} ms · images lentes ${this.slowFrames}`;
  }

  /** Overlay de debug (?debug=1) : FPS sur 1 s, pire intervalle et images > 25 ms depuis le début du glissement. */
  private tickOverlay(now: number, dt: number) {
    if (!this.debug || !this.overlay) return;
    this.frames.push(now);
    while (this.frames.length > 0 && now - this.frames[0]! > 1000) this.frames.shift();
    if (dt > this.worstFrame) this.worstFrame = dt;
    if (dt > SLOW_FRAME_MS) this.slowFrames++;
    if (now - this.lastOverlay < 100) return;
    this.lastOverlay = now;
    this.overlay.textContent = this.overlayText();
  }

  private release() {
    const gl = this.gl;
    if (gl) {
      gl.deleteTexture(this.texture);
      gl.deleteVertexArray(this.vao);
      gl.deleteProgram(this.program);
    }
    this.gl = null;
    this.program = null;
    this.ready = false;
  }

  destroy() {
    this.cancel();
    this.overlay?.remove();
    this.overlay = null;
  }
}

const rgbCache = new Map<string, [number, number, number]>();
function cssToRgbCached(css: string): [number, number, number] {
  let v = rgbCache.get(css);
  if (!v) {
    v = cssToRgb(css);
    rgbCache.set(css, v);
  }
  return v;
}
