import type { Chapter } from '../lib/periods';
import type { TimelineStep } from '../types';
import { numberToFrench } from './numbers';
import type { SpeechSegment } from './narrator';

export type SegmentKind = 'chapter' | 'date' | 'title' | 'summary' | 'details' | 'consequence' | 'quote';

export interface StorySegment extends SpeechSegment {
  kind: SegmentKind;
  /** Numéro de paragraphe au sein de `details` (regroupement à l'affichage). */
  para?: number;
}

/** « En l'an 216 avant Jésus-Christ » / « En 1805 », nombres en lettres. */
export function spokenDate(year: number): string {
  const n = numberToFrench(year);
  const abs = Math.abs(year);
  if (year < 0) return `En ${abs < 1000 ? "l'an " : ''}${n} avant Jésus-Christ`;
  return `En ${abs < 1000 ? "l'an " : ''}${n}`;
}

export function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*([-*+]|\d+\.)\s+/gm, '')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(\*|_)(.+?)\1/g, '$2')
    .replace(/`([^`]+)`/g, '$1');
}

const ABBREVIATIONS = /(?:\b(?:av|apr|M|Mme|Mlle|Dr|St|Ste|env|vol|ex|cf|etc|p|n°|J|C|Mgr)|J\.-C)\.$/;

/** Découpe en phrases sans couper après les abréviations (« av. J.-C. »). */
export function splitSentences(text: string): string[] {
  const parts = text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?…»])\s+(?=[A-ZÀ-ÖØ-Þ«"“(\d])/);
  const out: string[] = [];
  for (const p of parts) {
    const prev = out[out.length - 1];
    if (prev && ABBREVIATIONS.test(prev)) out[out.length - 1] = `${prev} ${p}`;
    else if (p) out.push(p);
  }
  return out;
}

/** Texte lu : abréviations développées. */
const ORDINALS = [
  '',
  'premier',
  'deuxième',
  'troisième',
  'quatrième',
  'cinquième',
  'sixième',
  'septième',
  'huitième',
  'neuvième',
  'dixième',
  'onzième',
  'douzième',
  'treizième',
  'quatorzième',
  'quinzième',
  'seizième',
  'dix-septième',
  'dix-huitième',
  'dix-neuvième',
  'vingtième',
  'vingt et unième',
];

function romanToInt(r: string): number {
  const v: Record<string, number> = { I: 1, V: 5, X: 10, L: 50 };
  let n = 0;
  for (let i = 0; i < r.length; i++) n += v[r[i]] < (v[r[i + 1]] ?? 0) ? -v[r[i]] : v[r[i]];
  return n;
}

export function toSpoken(text: string): string {
  return text
    .replace(/\b([IVXL]+)(e|er)\b/g, (m, r: string) => ORDINALS[romanToInt(r)] ?? m)
    .replace(/\bav\. J\.-C\./g, 'avant Jésus-Christ')
    .replace(/\bapr\. J\.-C\./g, 'après Jésus-Christ')
    .replace(/\bJ\.-C\./g, 'Jésus-Christ')
    .replace(/\bXVIIIe\b/g, 'dix-huitième')
    .replace(/\bXIXe\b/g, 'dix-neuvième')
    .replace(/\bIer\b/g, 'premier')
    .replace(/&/g, ' et ');
}

export function buildScript(step: TimelineStep, chapter?: Chapter | null): StorySegment[] {
  const segs: StorySegment[] = [];
  const push = (kind: SegmentKind, text: string, voice: 'narrator' | 'quote' = 'narrator', para?: number) => {
    const t = text.trim();
    if (!t) return;
    segs.push({ kind, text: t, spoken: toSpoken(t), voice, para });
  };
  if (chapter) {
    push('chapter', `Chapitre ${chapter.n} : ${chapter.name}.`);
    splitSentences(chapter.summary).forEach((t) => push('chapter', t));
  }
  const date = `${spokenDate(step.year)}.`;
  segs.push({ kind: 'date', text: date, spoken: date, voice: 'narrator' });
  push('title', /[.!?…]$/.test(step.title) ? step.title : `${step.title}.`);
  splitSentences(step.summary).forEach((s) => push('summary', s));
  stripMarkdown(step.details)
    .split(/\n\s*\n/)
    .forEach((p, pi) => splitSentences(p).forEach((s) => push('details', s, 'narrator', pi)));
  if (step.consequences[0]) push('consequence', `Conséquence : ${step.consequences[0]}`);
  for (const f of step.figures ?? []) {
    if (f.quote) push('quote', `${f.name} : ${f.quote}`, 'quote');
  }
  return segs;
}
