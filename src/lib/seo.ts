// Adresses et textes des pages (titre, description), partagés par l'application (tête de page dynamique)
// et par scripts/prerender.ts (pages HTML statiques) : les deux restent ainsi toujours d'accord.
// Module pur (pas de DOM) : importable depuis Node.
import { formatYear } from './years';

export const SITE_NAME = 'Atlas des Empires';
/** Adresse publique par défaut (GitHub Pages) ; le déploiement la fournit via SITE_URL. */
export const DEFAULT_SITE_URL = 'https://florentgru.github.io/empires-map/';

/** Pages de synthèse : la page « Tous les empires » et les onglets de la galerie. */
export type Hub = 'empires' | 'monuments' | 'personnages' | 'inventions';
export const HUBS: Hub[] = ['empires', 'monuments', 'personnages', 'inventions'];

export type Route = { kind: 'home' } | { kind: 'empire'; empire: string } | { kind: 'step'; empire: string; step: string } | { kind: 'hub'; hub: Hub };

/** Slug d'URL en français quand l'identifiant ne l'est pas (les autres ids servent tels quels). */
const SLUGS: Record<string, string> = { china: 'chine' };
const IDS: Record<string, string> = Object.fromEntries(Object.entries(SLUGS).map(([id, slug]) => [slug, id]));

export const slugOf = (empireId: string): string => SLUGS[empireId] ?? empireId;
export const idOfSlug = (slug: string): string => IDS[slug] ?? slug;

/** Chemin relatif à la racine du site, sans « / » initial : '' | 'rome/' | 'rome/cannes-216/' | 'monuments/'. */
export function pathOf(route: Route): string {
  switch (route.kind) {
    case 'home':
      return '';
    case 'hub':
      return `${route.hub}/`;
    case 'empire':
      return `${slugOf(route.empire)}/`;
    case 'step':
      return `${slugOf(route.empire)}/${route.step}/`;
  }
}

/** Route d'un chemin relatif ('rome/cannes-216/'). Ne vérifie pas que l'empire ou l'étape existent. */
export function parsePath(rel: string): Route {
  const parts = rel.split('/').filter(Boolean).map(decodeURIComponent);
  if (parts.length === 0) return { kind: 'home' };
  const [first, second] = parts as [string, string | undefined];
  if ((HUBS as string[]).includes(first) && !second) return { kind: 'hub', hub: first as Hub };
  return second ? { kind: 'step', empire: idOfSlug(first), step: second } : { kind: 'empire', empire: idOfSlug(first) };
}

/** Adresse absolue d'une route (`site` se termine par « / »). */
export const absoluteUrl = (site: string, route: Route): string => site + pathOf(route);

/** Texte brut d'un extrait markdown (gras, italiques, liens). */
export function plainText(md: string): string {
  return md
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`#>]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Coupe à `max` caractères sur une fin de mot, avec « … ». */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.–-]+$/, '')}…`;
}

export const DESCRIPTION_MAX = 155;

/** Ajoute « | Atlas des Empires » si le titre reste court (Google tronque vers 60-65 caractères). */
function withSite(title: string): string {
  const full = `${title} | ${SITE_NAME}`;
  return full.length <= 70 ? full : title;
}

interface EmpireLike {
  name: string;
  start: number;
  end: number;
  description: string;
}
interface StepLike {
  year: number;
  title: string;
  summary: string;
}

const span = (e: EmpireLike) => `${formatYear(e.start)} – ${formatYear(e.end)}`;

export const HUB_TEXT: Record<Hub, { title: string; heading: string; description: string }> = {
  empires: {
    title: 'Tous les empires de l’histoire, sur une frise',
    heading: 'Tous les empires',
    description: 'La frise de tous les grands empires de l’histoire, de Rome aux Mongols et à l’Empire britannique : dates, continents et cartes interactives.',
  },
  monuments: {
    title: 'Grands monuments et sept merveilles du monde',
    heading: 'Monuments du monde',
    description: 'Les grands monuments de l’histoire et les sept merveilles du monde antique : dates, civilisation, histoire et emplacement sur la carte.',
  },
  personnages: {
    title: 'Personnages illustres des grands empires',
    heading: 'Personnages illustres',
    description: 'Empereurs, généraux, khans et réformateurs des grands empires : biographies courtes, dates clés et étapes où les retrouver sur la carte.',
  },
  inventions: {
    title: 'Inventions qui ont changé les empires',
    heading: 'Inventions révolutionnaires',
    description: 'Béton romain, papier, imprimerie, poudre, boussole… les inventions nées dans les grands empires, avec leur date, leur lieu et leur impact.',
  },
};

export const HOME_TEXT = {
  title: `${SITE_NAME} : cartes interactives des grands empires`,
  description:
    'Rome, Napoléon, la Chine, les Mongols, l’Espagne, le Saint-Empire : suivez étape par étape l’évolution des frontières, batailles et personnages sur une carte animée.',
};

export function pageTitle(route: Route, empire?: EmpireLike, step?: StepLike): string {
  if (route.kind === 'hub') return withSite(HUB_TEXT[route.hub].title);
  if (route.kind === 'step' && empire && step) return withSite(`${step.title} (${formatYear(step.year)}) – ${empire.name}`);
  if (route.kind === 'empire' && empire) return withSite(`${empire.name} : carte interactive, ${span(empire)}`);
  return HOME_TEXT.title;
}

export function pageDescription(route: Route, empire?: EmpireLike, step?: StepLike): string {
  if (route.kind === 'hub') return HUB_TEXT[route.hub].description;
  if (route.kind === 'step' && step) return truncate(`${formatYear(step.year)} : ${plainText(step.summary)}`, DESCRIPTION_MAX);
  if (route.kind === 'empire' && empire) return truncate(plainText(empire.description), DESCRIPTION_MAX);
  return HOME_TEXT.description;
}
