// Pages statiques pour les moteurs de recherche, les aperçus de partage et les assistants IA, après `vite build`.
// Chaque page (accueil, empire, étape, synthèses) est une copie de dist/index.html avec sa propre tête
// (titre, description, canonical, Open Graph, JSON-LD) et, dans <div id="root">, un article lisible sans
// JavaScript. Au démarrage, React remplace cet article par la carte, ouverte au même endroit.
// Écrit aussi sitemap.xml, robots.txt, llms.txt et 404.html.
// Usage : npx tsx scripts/prerender.ts   (SITE_URL=https://…/ pour l'adresse publique, avec « / » final)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from 'react-markdown';
import { DEFAULT_SITE_URL, HOME_TEXT, HUB_TEXT, HUBS, pageDescription, pageTitle, pathOf, SITE_NAME, type Hub, type Route } from '../src/lib/seo.ts';
import { formatYear, toAstronomical } from '../src/lib/years.ts';
import { apogeeStepId } from '../src/lib/apogee.ts';
import { ERA_LABELS, eraOf, stepsShowing, type Era } from '../src/lib/monumentInfo.ts';
import type { Empire, EmpireCatalogEntry, EmpireStats, Person, TimelineStep } from '../src/types.ts';
import type { Invention } from '../src/types-invention.ts';
import type { Monument } from '../src/types-monument.ts';
import type { RegionInfo } from '../src/types-region.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const DATA = path.join(ROOT, 'data');
const SITE = (process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/?$/, '/');
const TODAY = new Date().toISOString().slice(0, 10);

const template = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
// Préfixe des liens internes : celui des fichiers du build (« / » en local, « /empires-map/ » sur GitHub Pages).
const BASE = /src="([^"]*?)assets\//.exec(template)?.[1] ?? '/';

/* ---------- Données ---------- */

const readJson = <T>(file: string): T => JSON.parse(fs.readFileSync(file, 'utf8')) as T;
const readOpt = <T>(file: string, fallback: T): T => (fs.existsSync(file) ? readJson<T>(file) : fallback);

const empires: Empire[] = fs
  .readdirSync(path.join(DATA, 'empires'))
  .filter((id) => !id.startsWith('_') && fs.existsSync(path.join(DATA, 'empires', id, 'timeline.json')))
  .map((id) => {
    const e = readJson<Empire>(path.join(DATA, 'empires', id, 'timeline.json'));
    const stats = readOpt<EmpireStats | undefined>(path.join(DATA, 'empires', id, 'stats.json'), undefined);
    return { ...e, steps: [...e.steps].sort((a, b) => a.year - b.year), stats: e.stats ?? stats };
  })
  .sort((a, b) => a.start - b.start);
const extra = <T>(id: string, file: string): T[] => readOpt<T[]>(path.join(DATA, 'empires', id, file), []);
const people = Object.fromEntries(empires.map((e) => [e.id, extra<Person>(e.id, 'people.json')]));
const inventions = Object.fromEntries(empires.map((e) => [e.id, extra<Invention>(e.id, 'inventions.json')]));
const regions = Object.fromEntries(empires.map((e) => [e.id, extra<RegionInfo>(e.id, 'regions.json')]));
const monuments = readJson<Monument[]>(path.join(DATA, 'monuments.json')).sort((a, b) => a.built - b.built);
const catalog = readJson<EmpireCatalogEntry[]>(path.join(DATA, 'empires-catalog.json')).sort((a, b) => a.start - b.start);

/* ---------- HTML ---------- */

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const md = (text: string) => renderToStaticMarkup(createElement(Markdown, null, text));
const href = (route: Route) => BASE + pathOf(route);
const abs = (route: Route) => SITE + pathOf(route);
const link = (route: Route, text: string) => `<a href="${href(route)}">${esc(text)}</a>`;
const years = (a?: number, b?: number) => (a === undefined ? '' : b === undefined ? formatYear(a) : `${formatYear(a)} – ${formatYear(b)}`);
/** Année ISO 8601 (année astronomique sur 4 chiffres : 216 av. J.-C. → « -0215 »). */
const isoYear = (y: number) => {
  const a = toAstronomical(y);
  return `${a < 0 ? '-' : ''}${String(Math.abs(a)).padStart(4, '0')}`;
};
const ogImage = (empireId?: string) => {
  const own = empireId && fs.existsSync(path.join(ROOT, 'public', 'og', `${empireId}.png`));
  return `${SITE}og/${own ? empireId : 'atlas'}.png`;
};

const PUBLISHER = { '@type': 'Organization', name: SITE_NAME, url: SITE, logo: { '@type': 'ImageObject', url: `${SITE}icon-512.png` } };

function breadcrumb(items: [string, Route][]) {
  const nav = `<nav class="seo-crumbs" aria-label="Fil d'Ariane">${items
    .map(([name, r], i) => (i < items.length - 1 ? `${link(r, name)} › ` : `<span>${esc(name)}</span>`))
    .join('')}</nav>`;
  const ld = {
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, r], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(r) })),
  };
  return { nav, ld };
}

interface Page {
  route: Route;
  title: string;
  description: string;
  type: 'website' | 'article';
  image: string;
  body: string;
  ld: object[];
}

/** Style minimal de l'article (affiché le temps du chargement de la carte, et sans JavaScript). */
const STYLE = `<style>.seo-page{box-sizing:border-box;height:100%;overflow:auto;padding:24px 16px 48px;background:#f4ead3;color:#2b2219;font:16px/1.6 Georgia,'Times New Roman',serif}.seo-page>*{max-width:760px;margin-left:auto;margin-right:auto}.seo-page h1{font-size:2rem;line-height:1.2;margin:.4em auto}.seo-page h2{font-size:1.35rem;margin:1.4em auto .4em}.seo-page h3{font-size:1.1rem;margin:1em auto .2em}.seo-page a{color:#7a2e1c}.seo-crumbs{font-size:.9rem}.seo-lead{font-size:1.1rem;font-style:italic}.seo-cta{display:inline-block;margin:.6em 0;padding:.4em 1em;background:#6d4c2a;color:#f4ead3!important;border-radius:6px;text-decoration:none}.seo-meta{color:#5c4a38;font-size:.95rem}</style>`;

function render(page: Page): string {
  const canonical = abs(page.route);
  const head = [
    `<link rel="canonical" href="${canonical}" />`,
    `<meta property="og:type" content="${page.type}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:locale" content="fr_FR" />`,
    `<meta property="og:title" content="${esc(page.title)}" />`,
    `<meta property="og:description" content="${esc(page.description)}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:image" content="${page.image}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(page.title)}" />`,
    `<meta name="twitter:description" content="${esc(page.description)}" />`,
    `<meta name="twitter:image" content="${page.image}" />`,
    `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': page.ld }).replace(/</g, '\\u003c')}</script>`,
    STYLE,
  ].join('\n    ');
  return template
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(page.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${esc(page.description)}" />`)
    .replace('</head>', `    ${head}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root"><main class="seo-page">${page.body}</main></div>`);
}

function write(page: Page) {
  const file = path.join(DIST, pathOf(page.route), 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, render(page));
}

const cta = (route: Route, text = 'Ouvrir la carte interactive') => `<p><a class="seo-cta" href="${href(route)}">${esc(text)} →</a></p>`;
const article = (route: Route, headline: string, description: string, image: string, about: object) => ({
  '@type': 'Article',
  headline: headline.slice(0, 110),
  description,
  image,
  inLanguage: 'fr',
  url: abs(route),
  mainEntityOfPage: abs(route),
  dateModified: TODAY,
  author: { '@type': 'Organization', name: SITE_NAME, url: SITE },
  publisher: PUBLISHER,
  isAccessibleForFree: true,
  about,
});
const hubLinks = () =>
  `<ul>${HUBS.map((h) => `<li>${link({ kind: 'hub', hub: h }, HUB_TEXT[h].heading)} : ${esc(HUB_TEXT[h].description)}</li>`).join('')}</ul>`;

/* ---------- Pages ---------- */

const pages: Page[] = [];

// Accueil
{
  const route: Route = { kind: 'home' };
  pages.push({
    route,
    title: HOME_TEXT.title,
    description: HOME_TEXT.description,
    type: 'website',
    image: ogImage(),
    body: [
      `<h1>${SITE_NAME}</h1>`,
      `<p class="seo-lead">${esc(HOME_TEXT.description)}</p>`,
      `<p>Une carte animée et gratuite : les frontières glissent d'une étape à l'autre, les armées marchent vers les champs de bataille, les personnages racontent leur époque. Chaque étape est expliquée par un récit, ses conséquences et ses sources.</p>`,
      cta({ kind: 'empire', empire: empires[0]!.id }, 'Commencer l’exploration'),
      `<h2>Les empires</h2>`,
      `<ul>${empires.map((e) => `<li>${link({ kind: 'empire', empire: e.id }, e.name)} (${years(e.start, e.end)}) : ${esc(pageDescription({ kind: 'empire', empire: e.id }, e))}</li>`).join('')}</ul>`,
      `<h2>Explorer autrement</h2>`,
      hubLinks(),
    ].join('\n'),
    ld: [
      { '@type': 'WebSite', name: SITE_NAME, url: SITE, inLanguage: 'fr', description: HOME_TEXT.description, publisher: PUBLISHER },
      {
        '@type': 'WebApplication',
        name: SITE_NAME,
        url: SITE,
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Web',
        inLanguage: 'fr',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
        description: HOME_TEXT.description,
        image: ogImage(),
      },
    ],
  });
}

// Empires et étapes
for (const e of empires) {
  const eRoute: Route = { kind: 'empire', empire: e.id };
  const image = ogImage(e.id);
  const apogee = apogeeStepId(e);
  const crumbs = breadcrumb([
    [SITE_NAME, { kind: 'home' }],
    [e.name, eRoute],
  ]);
  const desc = pageDescription(eRoute, e);
  const others = empires.filter((x) => x.id !== e.id);
  pages.push({
    route: eRoute,
    title: pageTitle(eRoute, e),
    description: desc,
    type: 'article',
    image,
    body: [
      crumbs.nav,
      `<h1>${esc(e.name)}</h1>`,
      `<p class="seo-meta">${years(e.start, e.end)} · ${e.steps.length} étapes sur la carte interactive</p>`,
      `<p class="seo-lead">${esc(e.description)}</p>`,
      cta(eRoute),
      e.periods?.length
        ? `<h2>Les grandes périodes</h2>${e.periods.map((p) => `<h3>${esc(p.name)} (${years(p.start, p.end)})</h3><p>${esc(p.summary)}</p>`).join('')}`
        : '',
      `<h2>Chronologie</h2><ol>${e.steps
        .map(
          (s) =>
            `<li>${link({ kind: 'step', empire: e.id, step: s.id }, `${formatYear(s.year)} – ${s.title}`)}${s.id === apogee ? ' (apogée territoriale)' : ''} : ${esc(md(s.summary).replace(/<[^>]+>/g, ''))}</li>`,
        )
        .join('')}</ol>`,
      people[e.id]!.length
        ? `<h2>Personnages illustres</h2><ul>${people[e.id]!.map((p) => `<li><a href="${href({ kind: 'hub', hub: 'personnages' })}#${e.id}-${p.id}">${esc(p.name)}</a> (${years(p.born, p.died)}) : ${esc(p.title)}</li>`).join('')}</ul>`
        : '',
      inventions[e.id]!.length
        ? `<h2>Inventions</h2><ul>${inventions[e.id]!.map((i) => `<li><a href="${href({ kind: 'hub', hub: 'inventions' })}#${e.id}-${i.id}">${esc(i.name)}</a> (${formatYear(i.year)}, ${esc(i.place)})</li>`).join('')}</ul>`
        : '',
      regions[e.id]!.length
        ? `<h2>Régions et États</h2>${regions[e.id]!.map((r) => `<h3>${esc(r.name)} (${years(r.years[0], r.years[1] === r.years[0] ? undefined : r.years[1])})</h3><p>${esc(r.summary)}</p>`).join('')}`
        : '',
      `<h2>Autres empires</h2><ul>${others.map((o) => `<li>${link({ kind: 'empire', empire: o.id }, o.name)} (${years(o.start, o.end)})</li>`).join('')}</ul>`,
    ].join('\n'),
    ld: [article(eRoute, e.name, desc, image, { '@type': 'Thing', name: e.name }), crumbs.ld],
  });

  e.steps.forEach((s: TimelineStep, i: number) => {
    const route: Route = { kind: 'step', empire: e.id, step: s.id };
    const prev = e.steps[i - 1];
    const next = e.steps[i + 1];
    const sc = breadcrumb([
      [SITE_NAME, { kind: 'home' }],
      [e.name, eRoute],
      [s.title, route],
    ]);
    const d = pageDescription(route, e, s);
    const b = s.battle;
    pages.push({
      route,
      title: pageTitle(route, e, s),
      description: d,
      type: 'article',
      image,
      body: [
        sc.nav,
        `<h1>${esc(s.title)}</h1>`,
        `<p class="seo-meta">${formatYear(s.year)} · ${esc(s.type)} · ${esc(e.name)}${s.id === apogee ? ' · apogée territoriale' : ''}</p>`,
        `<div class="seo-lead">${md(s.summary)}</div>`,
        cta(route, 'Voir cette étape sur la carte'),
        md(s.details),
        b
          ? `<h2>La bataille</h2><ul><li>Belligérants : ${esc(b.belligerents.join(' contre '))}</li><li>Commandants : ${esc(b.commanders.join(', '))}</li>${b.forces ? `<li>Forces : ${esc(b.forces)}</li>` : ''}${b.losses ? `<li>Pertes : ${esc(b.losses)}</li>` : ''}<li>Issue : ${esc(b.outcome)}</li></ul>`
          : '',
        s.consequences.length ? `<h2>Conséquences</h2><ul>${s.consequences.map((c) => `<li>${md(c).replace(/^<p>|<\/p>$/g, '')}</li>`).join('')}</ul>` : '',
        s.sources.length
          ? `<h2>Sources</h2><ul>${s.sources.map((src) => `<li>${src.url ? `<a href="${esc(src.url)}" rel="noopener">${esc(src.label)}</a>` : esc(src.label)}</li>`).join('')}</ul>`
          : '',
        `<nav class="seo-meta" aria-label="Étapes">${prev ? `← ${link({ kind: 'step', empire: e.id, step: prev.id }, `${formatYear(prev.year)} – ${prev.title}`)}` : ''}${prev && next ? ' · ' : ''}${next ? `${link({ kind: 'step', empire: e.id, step: next.id }, `${formatYear(next.year)} – ${next.title}`)} →` : ''}</nav>`,
        `<p>${link(eRoute, `Toute la chronologie : ${e.name}`)}</p>`,
      ].join('\n'),
      ld: [
        {
          ...article(route, s.title, d, image, { '@type': 'Thing', name: s.title }),
          temporalCoverage: isoYear(s.year),
          isPartOf: { '@type': 'CreativeWorkSeries', name: e.name, url: abs(eRoute) },
        },
        sc.ld,
      ],
    });
  });
}

// Pages de synthèse
const hubPage = (hub: Hub, body: string, items: { name: string; url?: string }[]): Page => {
  const route: Route = { kind: 'hub', hub };
  const c = breadcrumb([
    [SITE_NAME, { kind: 'home' }],
    [HUB_TEXT[hub].heading, route],
  ]);
  return {
    route,
    title: pageTitle(route),
    description: pageDescription(route),
    type: 'website',
    image: ogImage(),
    body: `${c.nav}\n<h1>${esc(HUB_TEXT[hub].heading)}</h1>\n<p class="seo-lead">${esc(HUB_TEXT[hub].description)}</p>\n${cta(route)}\n${body}\n<h2>Explorer autrement</h2>${hubLinks()}`,
    ld: [
      { '@type': 'CollectionPage', name: HUB_TEXT[hub].title, description: HUB_TEXT[hub].description, url: abs(route), inLanguage: 'fr', publisher: PUBLISHER },
      {
        '@type': 'ItemList',
        numberOfItems: items.length,
        itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, ...(it.url ? { url: it.url } : {}) })),
      },
      c.ld,
    ],
  };
};

{
  const available = new Set(empires.map((e) => e.id));
  pages.push(
    hubPage(
      'empires',
      `<ul>${catalog
        .map((c) =>
          available.has(c.id)
            ? `<li>${link({ kind: 'empire', empire: c.id }, c.name)} (${years(c.start, c.end)}, ${esc(c.region)})</li>`
            : `<li>${esc(c.name)} (${years(c.start, c.end)}, ${esc(c.region)}) – bientôt disponible</li>`,
        )
        .join('')}</ul>`,
      catalog.map((c) => ({ name: c.name, url: available.has(c.id) ? abs({ kind: 'empire', empire: c.id }) : undefined })),
    ),
  );

  const monumentItem = (m: Monument) => {
    const seen = stepsShowing(m, empires).slice(0, 3);
    return `<h3 id="${m.id}">${esc(m.name)}${m.wonder ? ' ✦' : ''}</h3><p class="seo-meta">${esc(m.civilization)} · ${m.until === undefined ? `depuis ${formatYear(m.built)}` : years(m.built, m.until)}${m.wonder ? ' · l’une des sept merveilles du monde' : ''}</p><p>${esc(m.description)}</p>${seen.length ? `<p>Sur la carte : ${seen.map((x) => link({ kind: 'step', empire: x.empireId, step: x.stepId }, `${x.title} (${formatYear(x.year)})`)).join(', ')}.</p>` : ''}`;
  };
  const eras = Object.keys(ERA_LABELS) as Era[];
  pages.push(
    hubPage(
      'monuments',
      `<h2>Les sept merveilles du monde</h2>${monuments
        .filter((m) => m.wonder)
        .map(monumentItem)
        .join('')}${eras
        .map((era) => {
          const list = monuments.filter((m) => !m.wonder && eraOf(m) === era);
          return list.length ? `<h2>${ERA_LABELS[era]}</h2>${list.map(monumentItem).join('')}` : '';
        })
        .join('')}`,
      monuments.map((m) => ({ name: m.name })),
    ),
  );

  pages.push(
    hubPage(
      'personnages',
      empires
        .filter((e) => people[e.id]!.length)
        .map(
          (e) =>
            `<h2>${link({ kind: 'empire', empire: e.id }, e.name)}</h2>${people[e.id]!.map(
              (p) =>
                `<h3 id="${e.id}-${p.id}">${esc(p.name)}</h3><p class="seo-meta">${esc(p.title)} · ${years(p.born, p.died)}</p><p>${esc(p.bio)}</p><ul>${p.keyFacts.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>`,
            ).join('')}`,
        )
        .join(''),
      empires.flatMap((e) => people[e.id]!.map((p) => ({ name: p.name }))),
    ),
  );

  pages.push(
    hubPage(
      'inventions',
      empires
        .filter((e) => inventions[e.id]!.length)
        .map(
          (e) =>
            `<h2>${link({ kind: 'empire', empire: e.id }, e.name)}</h2>${inventions[e.id]!.map(
              (i) =>
                `<h3 id="${e.id}-${i.id}">${esc(i.name)}</h3><p class="seo-meta">${i.approx ? 'vers ' : ''}${formatYear(i.year)} · ${esc(i.place)}${i.inventor ? ` · ${esc(i.inventor)}` : ''}</p><p>${esc(i.description)}</p>${i.impact ? `<p>${esc(i.impact)}</p>` : ''}`,
            ).join('')}`,
        )
        .join(''),
      empires.flatMap((e) => inventions[e.id]!.map((i) => ({ name: i.name }))),
    ),
  );
}

for (const p of pages) write(p);

/* ---------- 404, sitemap, robots, llms.txt ---------- */

// Adresse inconnue : l'application quand même (anciens liens), mais jamais indexée.
fs.writeFileSync(path.join(DIST, '404.html'), template.replace('<head>', '<head>\n    <meta name="robots" content="noindex" />'));

fs.writeFileSync(
  path.join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages
    .map((p) => `  <url><loc>${abs(p.route)}</loc><lastmod>${TODAY}</lastmod></url>`)
    .join('\n')}\n</urlset>\n`,
);

fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}sitemap.xml\n`);

fs.writeFileSync(
  path.join(DIST, 'llms.txt'),
  [
    `# ${SITE_NAME}`,
    '',
    `> ${HOME_TEXT.description} Site gratuit, en français, sans inscription.`,
    '',
    'Carte interactive et animée de l’histoire des grands empires : frontières étape par étape, batailles, armées, personnages illustres, monuments, inventions et récits sourcés.',
    '',
    '## Empires',
    ...empires.map(
      (e) => `- [${e.name} (${years(e.start, e.end)})](${abs({ kind: 'empire', empire: e.id })}): ${pageDescription({ kind: 'empire', empire: e.id }, e)}`,
    ),
    '',
    '## Pages de synthèse',
    ...HUBS.map((h) => `- [${HUB_TEXT[h].heading}](${abs({ kind: 'hub', hub: h })}): ${HUB_TEXT[h].description}`),
    '',
    '## Optionnel',
    `- [Plan du site](${SITE}sitemap.xml): toutes les étapes de toutes les chronologies.`,
    '',
  ].join('\n'),
);

console.log(`prerender : ${pages.length} pages, sitemap, robots.txt, llms.txt et 404.html (site ${SITE}, préfixe ${BASE})`);
