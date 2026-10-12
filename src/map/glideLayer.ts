import type { CanvasSource, Map as MapLibreMap } from 'maplibre-gl';
import { loadSdf } from '../data/loadEmpire';
import { DIFF_COLORS } from './diff';
import { variantFill, variantLine } from './color';
import { FILL_OPACITY } from './territoryLayers';

/** Durée nominale du glissement par champs de distance (ms, à vitesse 1). */
export const GLIDE_MS = 3000;
/** Durée du fondu vers le territoire vectoriel final. */
export const GLIDE_HANDOFF_MS = 250;

const MAX_CANVAS = 2048;
const SOURCE = 'glide';
const LAYER = 'glide-raster';
const LINE_OPACITY = 0.9;

const easeInOutSine = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

const VERT = `#version 300 es
in vec2 pos;
out vec2 uv;
void main() {
  uv = vec2(pos.x * 0.5 + 0.5, 0.5 - pos.y * 0.5);
  gl_Position = vec4(pos, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D tex;
uniform float p;
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
  outColor = vec4(rgb, outA);
}`;

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

/**
 * Frontière qui glisse en continu : champs de distance signés (PNG) seuillés par un fragment shader
 * dans un canvas WebGL2 hors écran, injecté dans MapLibre comme source « canvas » (couche raster).
 */
export class GlideLayer {
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private ready = false;
  private visible = false;
  private raf = 0;
  private gen = 0;
  private p = 0;
  private hideTimer = 0;
  private overlay: HTMLElement | null = null;
  private mode = 'sdf';
  private readonly debug = new URLSearchParams(window.location.search).get('debug') === '1';

  constructor(private map: MapLibreMap, beforeId?: string) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 2;
    const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: true });
    if (!gl) return;
    this.canvas = canvas;
    this.gl = gl;
    if (!this.initGl(gl)) {
      this.gl = null;
      return;
    }
    map.addSource(SOURCE, {
      type: 'canvas',
      canvas,
      coordinates: [[-1, 1], [1, 1], [1, -1], [-1, -1]],
      animate: false,
    } as never);
    map.addLayer(
      {
        id: LAYER,
        type: 'raster',
        source: SOURCE,
        layout: { visibility: 'none' },
        paint: { 'raster-opacity': 1, 'raster-fade-duration': 0, 'raster-resampling': 'linear', 'raster-opacity-transition': { duration: 0 } },
      },
      beforeId,
    );
  }

  get available(): boolean {
    return this.gl !== null;
  }

  private initGl(gl: WebGL2RenderingContext): boolean {
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
    if (!vs || !fs) return false;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, 'pos');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('[glide] link :', gl.getProgramInfoLog(prog));
      return false;
    }
    this.program = prog;
    gl.useProgram(prog);
    for (const n of ['tex', 'p', 'color', 'lineColor', 'gainColor', 'lossColor', 'fillOpacity', 'lineOpacity']) {
      this.uniforms[n] = gl.getUniformLocation(prog, n);
    }
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1i(this.uniforms.tex!, 0);
    gl.uniform1f(this.uniforms.fillOpacity!, FILL_OPACITY);
    gl.uniform1f(this.uniforms.lineOpacity!, LINE_OPACITY);
    const g = cssToRgb(DIFF_COLORS.gained);
    const l = cssToRgb(DIFF_COLORS.lost);
    gl.uniform3f(this.uniforms.gainColor!, g[0], g[1], g[2]);
    gl.uniform3f(this.uniforms.lossColor!, l[0], l[1], l[2]);
    gl.clearColor(0, 0, 0, 0);
    return true;
  }

  private draw(p: number) {
    const gl = this.gl;
    if (!gl || !this.ready) return;
    this.p = p;
    gl.uniform1f(this.uniforms.p!, p);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /**
   * Charge le SDF de l'étape, l'uploade, positionne la source et rend la progression initiale p.
   * Renvoie false si les fichiers sont absents ou si WebGL2 est indisponible.
   */
  async prepare(empireId: string, stepId: string, color = '#888888', p = 0): Promise<boolean> {
    const gl = this.gl;
    const canvas = this.canvas;
    if (!gl || !canvas) return false;
    this.cancel();
    this.hide();
    const gen = ++this.gen;
    const sdf = await loadSdf(empireId, stepId);
    if (!sdf || gen !== this.gen) return false;
    const { bitmap, meta } = sdf;
    const size = (n: number) => Math.max(2, Math.min(MAX_CANVAS, Math.round(n * 2)));
    try {
      if (!this.texture) this.texture = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      canvas.width = size(meta.width);
      canvas.height = size(meta.height);
      gl.viewport(0, 0, canvas.width, canvas.height);
      const fill = cssToRgb(variantFill(color, 0));
      const line = cssToRgb(variantLine(color, 0));
      gl.uniform3f(this.uniforms.color!, fill[0], fill[1], fill[2]);
      gl.uniform3f(this.uniforms.lineColor!, line[0], line[1], line[2]);
      (this.map.getSource(SOURCE) as CanvasSource | undefined)?.setCoordinates(meta.bounds);
      this.ready = true;
      this.draw(p);
    } catch (err) {
      console.warn('[glide] préparation impossible :', err);
      this.ready = false;
      return false;
    }
    this.showOverlay();
    return true;
  }

  private setVisible(v: boolean) {
    if (this.visible === v || !this.gl) return;
    this.visible = v;
    this.map.setLayoutProperty(LAYER, 'visibility', v ? 'visible' : 'none');
    const src = this.map.getSource(SOURCE) as CanvasSource | undefined;
    if (v) src?.play?.();
    else src?.pause?.();
  }

  /** Affiche le raster à la progression courante (sans animer). */
  show() {
    window.clearTimeout(this.hideTimer);
    if (!this.ready) return;
    this.map.setPaintProperty(LAYER, 'raster-opacity-transition', { duration: 0 });
    this.map.setPaintProperty(LAYER, 'raster-opacity', 1);
    this.setVisible(true);
  }

  /** Anime p : from → 1 − from. onDone est appelé après avoir dessiné la progression finale. */
  play(from: 0 | 1, durationMs: number, onDone: () => void) {
    this.cancel();
    if (!this.ready) {
      onDone();
      return;
    }
    this.show();
    const to = 1 - from;
    const t0 = performance.now();
    const frame = (now: number) => {
      const k = Math.min(1, Math.max(0, (now - t0) / durationMs));
      this.draw(from + (to - from) * easeInOutSine(k));
      this.updateOverlay();
      if (k < 1) this.raf = requestAnimationFrame(frame);
      else {
        this.raf = 0;
        onDone();
      }
    };
    this.raf = requestAnimationFrame(frame);
  }

  /** Estompe le raster (fondu) puis le masque ; la progression finale reste affichée pendant le fondu. */
  fadeOut(ms: number) {
    window.clearTimeout(this.hideTimer);
    if (!this.visible) return;
    this.map.setPaintProperty(LAYER, 'raster-opacity-transition', { duration: ms });
    this.map.setPaintProperty(LAYER, 'raster-opacity', 0);
    this.hideTimer = window.setTimeout(() => this.hide(), ms + 50);
  }

  cancel() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  hide() {
    this.cancel();
    window.clearTimeout(this.hideTimer);
    this.gen++;
    if (this.gl) {
      this.setVisible(false);
      this.map.setPaintProperty(LAYER, 'raster-opacity-transition', { duration: 0 });
      this.map.setPaintProperty(LAYER, 'raster-opacity', 1);
    }
    this.ready = false;
    this.overlay?.remove();
    this.overlay = null;
  }

  /** Mode affiché dans l'overlay de debug : sdf / bandes / fondu. */
  setMode(mode: string) {
    this.mode = mode;
    if (this.debug) this.showOverlay(true);
  }

  private showOverlay(force = false) {
    if (!this.debug) return;
    if (!this.overlay) {
      this.overlay = document.createElement('div');
      this.overlay.className = 'debug-overlay';
      this.overlay.style.bottom = '38px';
      document.body.appendChild(this.overlay);
    } else if (!force) {
      /* déjà là */
    }
    this.overlay.textContent = `glide p=${this.p.toFixed(2)} · mode ${this.mode}`;
  }

  private lastOverlay = 0;
  private updateOverlay() {
    if (!this.overlay) return;
    const now = performance.now();
    if (now - this.lastOverlay < 100) return;
    this.lastOverlay = now;
    this.overlay.textContent = `glide p=${this.p.toFixed(2)} · mode ${this.mode}`;
  }

  /** Pour les tests : lit les pixels du canvas hors écran. */
  debugCanvas(): { canvas: HTMLCanvasElement | null; gl: WebGL2RenderingContext | null; draw: (p: number) => void } {
    return { canvas: this.canvas, gl: this.gl, draw: (p) => this.draw(p) };
  }

  destroy() {
    this.cancel();
    window.clearTimeout(this.hideTimer);
    this.overlay?.remove();
    this.overlay = null;
  }
}
