/** Narrateur : Web Speech API (voix du navigateur) avec repli en lecture silencieuse. Sans React. */

export type VoiceRole = 'narrator' | 'quote';

export interface SpeechSegment {
  /** Texte affiché. */
  text: string;
  /** Texte lu à voix haute si différent (abréviations développées…). */
  spoken?: string;
  voice?: VoiceRole;
}

export interface SpeakHandlers {
  /** Début de lecture du segment i. */
  onSegment(i: number): void;
  /** Frontière de mot (voix réelles uniquement ; charIndex relatif au texte lu du segment). */
  onWord?(segIndex: number, charIndex: number): void;
  /** Tous les segments ont été lus. */
  onEnd(): void;
}

export const SILENT_WORDS_PER_MIN = 180;
const MAX_CHUNK = 220;
const KEEPALIVE_MS = 10_000;

/** Voix fr classées par préférence décroissante. */
export function rankFrenchVoices(all: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const fr = all.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('fr'));
  const score = (v: SpeechSynthesisVoice): number => {
    const n = v.name;
    if (/google fran[cç]ais/i.test(n)) return 0;
    if (/microsoft .*online \(natural\)/i.test(n)) return 1;
    if (/am[ée]lie/i.test(n)) return 2;
    if (/thomas/i.test(n)) return 3;
    if (v.lang.toLowerCase().replace('_', '-') === 'fr-fr') return 4;
    return 5;
  };
  return fr
    .map((v, i) => ({ v, i, s: score(v) }))
    .sort((a, b) => a.s - b.s || a.i - b.i)
    .map((x) => x.v);
}

/** Découpe un texte trop long en morceaux ≤ MAX_CHUNK (sur , ; : puis espaces). */
function chunkText(text: string): { text: string; offset: number }[] {
  if (text.length <= MAX_CHUNK) return [{ text, offset: 0 }];
  const out: { text: string; offset: number }[] = [];
  let start = 0;
  while (start < text.length) {
    if (text.length - start <= MAX_CHUNK) {
      out.push({ text: text.slice(start), offset: start });
      break;
    }
    const window = text.slice(start, start + MAX_CHUNK);
    let cut = Math.max(window.lastIndexOf(', '), window.lastIndexOf('; '), window.lastIndexOf(' : '));
    if (cut < MAX_CHUNK / 3) cut = window.lastIndexOf(' ');
    if (cut <= 0) cut = MAX_CHUNK - 1;
    const end = start + cut + 1;
    out.push({ text: text.slice(start, end), offset: start });
    start = end;
  }
  return out;
}

interface Run {
  id: number;
  segments: SpeechSegment[];
  handlers: SpeakHandlers;
  silent: boolean;
  seg: number;
  chunks: { text: string; offset: number }[];
  chunk: number;
  paused: boolean;
}

export class Narrator {
  private voices: SpeechSynthesisVoice[] = [];
  private listeners = new Set<() => void>();
  private voiceURI: string | null = null;
  private rate = 0.95;
  private run: Run | null = null;
  private runId = 0;
  private timer: number | null = null;
  private timerStart = 0;
  private timerRemaining = 0;
  private keepAlive: number | null = null;
  private readonly synth: SpeechSynthesis | null =
    typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined' ? window.speechSynthesis : null;
  private ready: Promise<void>;
  private disposed = false;

  constructor() {
    if (!this.synth) {
      this.ready = Promise.resolve();
      return;
    }
    this.refreshVoices();
    this.ready = new Promise((resolve) => {
      if (this.voices.length > 0) return resolve();
      const done = () => resolve();
      this.synth!.addEventListener('voiceschanged', done, { once: true });
      window.setTimeout(done, 1500);
    });
    this.synth.addEventListener('voiceschanged', this.onVoicesChanged);
  }

  private onVoicesChanged = () => {
    this.refreshVoices();
    this.listeners.forEach((l) => l());
  };

  private refreshVoices() {
    this.voices = rankFrenchVoices(this.synth?.getVoices() ?? []);
  }

  /** Voix françaises disponibles, la préférée en premier. */
  getVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }

  /** Vrai si une voix française est utilisable (sinon lecture silencieuse). */
  hasVoice(): boolean {
    return !!this.synth && this.voices.length > 0;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setVoiceURI(uri: string | null) {
    this.voiceURI = uri;
  }

  setRate(rate: number) {
    this.rate = rate;
  }

  private narratorVoice(): SpeechSynthesisVoice | null {
    return this.voices.find((v) => v.voiceURI === this.voiceURI) ?? this.voices[0] ?? null;
  }

  private quoteVoice(): SpeechSynthesisVoice | null {
    const main = this.narratorVoice();
    return this.voices.find((v) => v !== main && v.lang === main?.lang) ?? this.voices.find((v) => v !== main) ?? null;
  }

  speak(segments: SpeechSegment[], handlers: SpeakHandlers): void {
    this.cancel();
    const id = ++this.runId;
    if (segments.length === 0) {
      handlers.onEnd();
      return;
    }
    this.ready.then(() => {
      if (this.disposed || id !== this.runId) return;
      const run: Run = {
        id,
        segments,
        handlers,
        silent: !this.hasVoice(),
        seg: -1,
        chunks: [],
        chunk: 0,
        paused: false,
      };
      this.run = run;
      this.nextSegment(run);
    });
  }

  private nextSegment(run: Run) {
    if (this.run !== run) return;
    run.seg += 1;
    if (run.seg >= run.segments.length) {
      this.run = null;
      this.stopKeepAlive();
      run.handlers.onEnd();
      return;
    }
    const s = run.segments[run.seg];
    run.chunks = run.silent ? [{ text: s.spoken ?? s.text, offset: 0 }] : chunkText(s.spoken ?? s.text);
    run.chunk = 0;
    run.handlers.onSegment(run.seg);
    if (run.silent) this.startTimer(run, silentDuration(s.spoken ?? s.text));
    else this.speakChunk(run);
  }

  private startTimer(run: Run, ms: number) {
    this.timerRemaining = ms;
    this.timerStart = performance.now();
    this.timer = window.setTimeout(() => {
      this.timer = null;
      this.nextSegment(run);
    }, ms);
  }

  private speakChunk(run: Run) {
    if (!this.synth || this.run !== run) return;
    const seg = run.segments[run.seg];
    const chunk = run.chunks[run.chunk];
    const u = new SpeechSynthesisUtterance(chunk.text);
    const isQuote = seg.voice === 'quote';
    const voice = isQuote ? this.quoteVoice() : this.narratorVoice();
    const main = this.narratorVoice();
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    } else {
      u.lang = 'fr-FR';
    }
    u.rate = this.rate;
    u.pitch = isQuote && (!voice || voice === main) ? 0.9 : 1;
    u.onboundary = (e) => {
      if (this.run === run) run.handlers.onWord?.(run.seg, chunk.offset + e.charIndex);
    };
    const finish = () => {
      if (this.run !== run) return;
      if (run.chunk + 1 < run.chunks.length) {
        run.chunk += 1;
        this.speakChunk(run);
      } else {
        this.nextSegment(run);
      }
    };
    u.onend = finish;
    u.onerror = (e) => {
      // 'canceled' / 'interrupted' : annulation volontaire, déjà traitée.
      if (e.error === 'canceled' || e.error === 'interrupted') return;
      finish();
    };
    this.synth.speak(u);
    this.startKeepAlive(voice);
  }

  /** Chrome interrompt les voix réseau (non locales) après ~15 s : pause/reprise périodique. */
  private startKeepAlive(voice: SpeechSynthesisVoice | null) {
    this.stopKeepAlive();
    if (!this.synth || (voice && voice.localService)) return;
    this.keepAlive = window.setInterval(() => {
      if (this.run && !this.run.paused && this.synth!.speaking) {
        this.synth!.pause();
        this.synth!.resume();
      }
    }, KEEPALIVE_MS);
  }

  private stopKeepAlive() {
    if (this.keepAlive !== null) window.clearInterval(this.keepAlive);
    this.keepAlive = null;
  }

  pause() {
    const run = this.run;
    if (!run || run.paused) return;
    run.paused = true;
    if (run.silent) {
      if (this.timer !== null) {
        window.clearTimeout(this.timer);
        this.timer = null;
        this.timerRemaining = Math.max(0, this.timerRemaining - (performance.now() - this.timerStart));
      }
    } else {
      this.synth?.pause();
    }
  }

  resume() {
    const run = this.run;
    if (!run || !run.paused) return;
    run.paused = false;
    if (run.silent) {
      this.startTimer(run, this.timerRemaining);
      return;
    }
    this.synth?.resume();
    // Chrome abandonne l'énoncé après une longue pause : on relit le morceau courant.
    window.setTimeout(() => {
      if (this.run === run && !run.paused && this.synth && !this.synth.speaking && !this.synth.pending) {
        this.synth.cancel();
        this.speakChunk(run);
      }
    }, 250);
  }

  cancel() {
    this.runId += 1;
    this.run = null;
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
    this.stopKeepAlive();
    this.synth?.cancel();
  }

  /** Réactive après un dispose() (StrictMode monte, démonte puis remonte). */
  attach() {
    this.disposed = false;
    this.synth?.addEventListener('voiceschanged', this.onVoicesChanged);
    this.refreshVoices();
  }

  dispose() {
    this.disposed = true;
    this.cancel();
    this.synth?.removeEventListener('voiceschanged', this.onVoicesChanged);
    this.listeners.clear();
  }
}

export function silentDuration(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(900, (words / SILENT_WORDS_PER_MIN) * 60_000);
}
