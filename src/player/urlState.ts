/**
 * Adresse de la page : /<empire>/<étape>/ (ex. /rome/cannes-216/) et pages de synthèse (/monuments/…), sous le
 * préfixe du site (import.meta.env.BASE_URL). Les anciennes adresses ?empire=<id>&step=<id> restent comprises.
 * Écriture par replaceState (sans historique), avec mise à jour du titre, de la description et du canonical
 * (mêmes textes que les pages statiques de scripts/prerender.ts, via src/lib/seo.ts).
 */
import { HOME_TEXT, pageDescription, pageTitle, parsePath, pathOf, type Hub, type Route } from '../lib/seo';
import type { Empire, TimelineStep } from '../types';

const BASE = import.meta.env.BASE_URL;

/** Chemin relatif à la racine du site ('rome/cannes-216/'). */
function relPath(): string {
  const p = window.location.pathname;
  return p.startsWith(BASE) ? p.slice(BASE.length) : p.replace(/^\//, '');
}

export function readUrlState(): { empire: string | null; step: string | null; hub: Hub | null } {
  const params = new URLSearchParams(window.location.search);
  if (params.get('empire')) return { empire: params.get('empire'), step: params.get('step'), hub: null };
  const r = parsePath(relPath());
  if (r.kind === 'step') return { empire: r.empire, step: r.step, hub: null };
  if (r.kind === 'empire') return { empire: r.empire, step: null, hub: null };
  return { empire: null, step: null, hub: r.kind === 'hub' ? r.hub : null };
}

/* ---------- Tête de page ---------- */

/** Pose `attr="value"` sur la balise <tag key="name"> de <head>, créée si besoin. */
function setTag(tag: 'meta' | 'link', key: 'name' | 'property' | 'rel', name: string, attr: string, value: string) {
  let el = document.head.querySelector(`${tag}[${key}="${name}"]`);
  if (!el) {
    el = document.createElement(tag);
    el.setAttribute(key, name);
    document.head.append(el);
  }
  el.setAttribute(attr, value);
}

function applyHead(route: Route, empire?: Empire, step?: TimelineStep) {
  const title = pageTitle(route, empire, step);
  const description = route.kind === 'home' ? HOME_TEXT.description : pageDescription(route, empire, step);
  const url = new URL(BASE + pathOf(route), window.location.origin).href;
  document.title = title;
  setTag('meta', 'name', 'description', 'content', description);
  setTag('link', 'rel', 'canonical', 'href', url);
  setTag('meta', 'property', 'og:title', 'content', title);
  setTag('meta', 'property', 'og:description', 'content', description);
  setTag('meta', 'property', 'og:url', 'content', url);
}

/* ---------- Écriture ---------- */

/** Page de synthèse affichée (/monuments/…) : tant qu'elle est ouverte, l'Atlas en dessous ne change pas l'adresse. */
let hub: Hub | null = typeof window === 'undefined' ? null : readUrlState().hub;
/** Dernière étape de l'Atlas, rétablie à la fermeture de la page de synthèse. */
let last: { empire: Empire; step?: TimelineStep } | null = null;

function replacePath(route: Route) {
  const url = new URL(window.location.href);
  url.pathname = BASE + pathOf(route);
  url.searchParams.delete('empire');
  url.searchParams.delete('step');
  if (url.href !== window.location.href) window.history.replaceState(null, '', url);
}

export function writeUrlState(empire: Empire, step: TimelineStep | undefined): void {
  last = { empire, step };
  if (hub) return;
  const route: Route = step ? { kind: 'step', empire: empire.id, step: step.id } : { kind: 'empire', empire: empire.id };
  replacePath(route);
  applyHead(route, empire, step);
}

export const currentHub = (): Hub | null => hub;

/** Ouvre une page de synthèse : adresse et tête de page à elle. */
export function enterHub(h: Hub): void {
  hub = h;
  replacePath({ kind: 'hub', hub: h });
  applyHead({ kind: 'hub', hub: h });
}

/** Ferme la page de synthèse et rétablit l'adresse de l'étape affichée (si l'Atlas en a déjà écrit une). */
export function leaveHub(): void {
  if (!hub) return;
  hub = null;
  if (last) writeUrlState(last.empire, last.step);
}
