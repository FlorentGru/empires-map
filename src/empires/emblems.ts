/**
 * Emblèmes dessinés des empires du catalogue : SVG plats en chaînes (viewBox 0 0 64 64),
 * dans l'esprit des figurines (aplats, contour #3b2a1a). Un drapeau ou un étendard quand
 * l'empire en avait un ; sinon un symbole emblématique dans un médaillon rond.
 */

export interface Emblem {
  /** SVG complet (chaîne), viewBox="0 0 64 64", sans width/height, sans script ni style externe. */
  svg: string;
  /** Nom de l'emblème. */
  label: string;
  /** Ce que c'est, quand et par qui il est utilisé ; honnête sur le statut (symbole, reconstitution). */
  note: string;
}

const O = '#3b2a1a';
const GOLD = '#e0b43a';
const RED = '#a8281e';
const CREAM = '#f4efe0';
const BLUE = '#2f4a7c';
const BLACK = '#26211d';
const LN = `stroke="${O}" stroke-width="1.5" stroke-linejoin="round"`;

const wrap = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${body}</svg>`;

/** Drapeau rectangulaire ; `defs` et `body` sont dessinés par-dessus le fond, le contour en dernier. */
const flag = (fill: string, body: string, defs = '') =>
  wrap(
    `${defs}<rect x="5" y="14" width="54" height="36" rx="1.5" fill="${fill}"/>${body}<rect x="5" y="14" width="54" height="36" rx="1.5" fill="none" ${LN}/>`,
  );
const FLAG_CLIP = (id: string) => `<defs><clipPath id="${id}"><rect x="5" y="14" width="54" height="36"/></clipPath></defs>`;

/** Médaillon rond ; le corps est rogné au disque. */
const medal = (id: string, bg: string, body: string) =>
  wrap(
    `<defs><clipPath id="${id}"><circle cx="32" cy="32" r="29"/></clipPath></defs><circle cx="32" cy="32" r="29" fill="${bg}"/><g clip-path="url(#${id})">${body}</g><circle cx="32" cy="32" r="29" fill="none" stroke="${O}" stroke-width="2"/>`,
  );

/** Bannière sur hampe (étendards unis des califats). */
const banner = (fill: string) =>
  wrap(
    `<path d="M12 7V60" stroke="${O}" stroke-width="2.5" stroke-linecap="round"/><circle cx="12" cy="6" r="3.2" fill="${GOLD}" ${LN}/><path d="M14 11C24 7 34 15 56 11V41C34 45 24 37 14 41Z" fill="${fill}" ${LN}/>`,
  );

const pt = (cx: number, cy: number, r: number, a: number) => `${+(cx + r * Math.cos(a)).toFixed(1)} ${+(cy + r * Math.sin(a)).toFixed(1)}`;
const star = (cx: number, cy: number, R: number, r: number, n: number, rot = -Math.PI / 2) => {
  let d = '';
  for (let i = 0; i < 2 * n; i++) d += `${i ? 'L' : 'M'}${pt(cx, cy, i % 2 ? r : R, rot + (i * Math.PI) / n)}`;
  return `${d}Z`;
};
/** Trait doré avec fin liseré sombre dessous. */
const gline = (d: string, w: number, color = GOLD) =>
  `<path d="${d}" fill="none" stroke="${O}" stroke-width="${w + 2}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

/** Aigle bicéphale (moitié gauche reflétée à droite). */
const doubleEagle = (c: string, beak: string, acc: string, chest: string) => {
  const half = `<path d="M28 29C22 21 14 22 7 18C8 25 9 29 12 33C11 36 14 38 17 38C17 41 21 42 25 41L29 40Z" fill="${c}" ${LN}/><path d="M12 31L25 31M16 36L26 35" stroke="${acc}" stroke-width="1.2" fill="none"/><path d="M29 31C27 26 25 23 23 20L27 17C29 20 32 25 34 29Z" fill="${c}" ${LN}/><circle cx="24" cy="17" r="3.6" fill="${c}" ${LN}/><path d="M21 15.5L15 18.5L21.5 19.5Z" fill="${beak}" ${LN}/>`;
  return (
    `<path d="M26 29H38L37 42L40 51L32 46L24 51L27 42Z" fill="${c}" ${LN}/>` +
    `<path d="M28 12L29 7L32 10L35 7L36 12Z" fill="${GOLD}" ${LN}/>` +
    half +
    `<g transform="matrix(-1 0 0 1 64 0)">${half}</g>` +
    chest
  );
};

/** Tour-bulbe d'Angkor. */
const tower = (cx: number, base: number, w: number, h: number) => {
  const t = (f: number) => +(base - h * f).toFixed(1);
  return (
    `<path d="M${cx - w} ${base}V${t(0.45)}C${cx - w} ${t(0.7)} ${cx - 1.2} ${t(0.82)} ${cx} ${t(1)}C${cx + 1.2} ${t(0.82)} ${cx + w} ${t(0.7)} ${cx + w} ${t(0.45)}V${base}Z" fill="#5a3f2a" ${LN}/>` +
    `<path d="M${cx - w} ${t(0.3)}H${cx + w}M${cx - w * 0.8} ${t(0.55)}H${cx + w * 0.8}" stroke="${O}" stroke-width="1"/>`
  );
};

// Croix de Bourgogne : deux bâtons noueux en sautoir.
const burgundy = (() => {
  const dx = 0.832;
  const dy = 0.555;
  const stubs = (x0: number, y0: number, sx: number) => {
    let d = '';
    for (const t of [10, 24, 38, 52]) {
      const x = x0 + sx * dx * t;
      const y = y0 + dy * t;
      d += `M${(x - 0.555 * 3.6).toFixed(1)} ${(y + 0.832 * 3.6 * sx).toFixed(1)}L${(x + 0.555 * 3.6).toFixed(1)} ${(y - 0.832 * 3.6 * sx).toFixed(1)}`;
    }
    return d;
  };
  const bars = 'M5 14L59 50M59 14L5 50';
  const st = stubs(5, 14, 1) + stubs(59, 14, -1);
  return (
    `<path d="${bars}${st}" stroke="${O}" stroke-width="6.5" stroke-linecap="round" fill="none"/>` +
    `<path d="${bars}${st}" stroke="${RED}" stroke-width="4" stroke-linecap="round" fill="none"/>`
  );
})();

export const EMBLEMS: Record<string, Emblem> = {
  britannique: {
    label: 'Union Jack',
    note: "Drapeau du Royaume-Uni, né de l'union des croix de saint Georges, saint André et saint Patrick (1801 dans sa forme actuelle). Il flotte sur l'Empire britannique ; version simplifiée ici.",
    svg: flag(
      '#2b3f7a',
      `<g clip-path="url(#ukc)"><path d="M5 14L59 50M59 14L5 50" stroke="${CREAM}" stroke-width="8"/><path d="M5 14L59 50M59 14L5 50" stroke="${RED}" stroke-width="3"/><path d="M32 14V50M5 32H59" stroke="${CREAM}" stroke-width="12"/><path d="M32 14V50M5 32H59" stroke="${RED}" stroke-width="7"/></g>`,
      FLAG_CLIP('ukc'),
    ),
  },
  russie: {
    label: 'Aigle bicéphale impérial',
    note: "Aigle noir à deux têtes sur fond d'or, étendard des tsars puis des empereurs de Russie (de Pierre le Grand à 1917). Sur sa poitrine, l'écu rouge de saint Georges (armes de Moscou). Les armoiries réelles sont bien plus chargées ; version simplifiée.",
    svg: flag(
      GOLD,
      `<g transform="translate(32 33) scale(.8) translate(-32 -32)">${doubleEagle(BLACK, RED, GOLD, `<path d="M26 28H38V37C38 41.5 32 44 32 44C32 44 26 41.5 26 37Z" fill="${RED}" ${LN}/><path d="M29 39.5L31 33.5L34.5 32.5L35 36.5M30.5 34.5L36 30" stroke="${CREAM}" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="33.3" cy="31.4" r="1.3" fill="${CREAM}"/>`)}</g>`,
    ),
  },
  espagne: {
    label: 'Croix de Bourgogne',
    note: "Croix rouge en bâtons noueux sur fond blanc, enseigne militaire des Habsbourg d'Espagne et des tercios (XVIe-XVIIIe siècles). Ce n'est pas un drapeau national moderne.",
    svg: flag(CREAM, `<g clip-path="url(#esc)">${burgundy}</g>`, FLAG_CLIP('esc')),
  },
  rome: {
    label: 'Vexillum, aquila et SPQR',
    note: "Étendard rouge à la mention SPQR (Senatus Populusque Romanus), surmonté de l'aigle d'or (aquila) des légions. Reconstitution stylisée : le vexillum de cavalerie et l'aquila étaient deux enseignes distinctes.",
    svg: wrap(
      `<path d="M32 4V61" stroke="${O}" stroke-width="2.6" stroke-linecap="round"/><circle cx="32" cy="4" r="2.6" fill="${GOLD}" ${LN}/><rect x="11" y="11" width="42" height="4" rx="2" fill="${GOLD}" ${LN}/><path d="M15 15H49V51L44 47L39 51L34 47L29 51L24 47L19 51L15 49Z" fill="${RED}" ${LN}/><path d="M32 19C30 19 30 22 30 24L26 22C22 21 20 22 18 20C19 25 22 28 27 28L29 31H35L37 28C42 28 45 25 46 20C44 22 42 21 38 22L34 24C34 22 34 19 32 19Z" fill="${GOLD}" ${LN} transform="translate(0 0)"/><text x="32" y="45" text-anchor="middle" font-family="serif" font-weight="bold" font-size="9.5" fill="${GOLD}">SPQR</text>`,
    ),
  },
  napoleon: {
    label: 'Aigle impérial',
    note: "Aigle d'or aux ailes relevées sur fond bleu, emblème de l'Empire français de Napoléon Ier (1804) et des aigles remises aux régiments. Interprétation simplifiée de l'aigle des drapeaux.",
    svg: medal(
      'nap',
      '#27407a',
      `<circle cx="32" cy="32" r="25" fill="none" stroke="${GOLD}" stroke-width="1"/><path d="M28 34C19 34 12 28 7 17C12 19 15 18 17 14C18 18 21 20 24 19C25 23 27 26 29 28Z" fill="${GOLD}" ${LN}/><path d="M36 34C45 34 52 28 57 17C52 19 49 18 47 14C46 18 43 20 40 19C39 23 37 26 35 28Z" fill="${GOLD}" ${LN}/><path d="M32 26C29 26 28 29 28 32L29 43H35L36 32C36 29 35 26 32 26Z" fill="${GOLD}" ${LN}/><path d="M29 43L27 50H37L35 43Z" fill="${GOLD}" ${LN}/><circle cx="32" cy="23" r="3.2" fill="${GOLD}" ${LN}/><path d="M34.5 22L39 24L34.5 25.5Z" fill="#c08a3e" ${LN}/><rect x="20" y="50" width="24" height="4" rx="2" fill="${RED}" ${LN}/>`,
    ),
  },
  carolingiens: {
    label: 'Monogramme de Charlemagne',
    note: "Le monogramme KAROLUS en croix servait de signature à Charlemagne (vers 800) ; il est reproduit ici sans les lettres. C'est un symbole, pas un drapeau : les Carolingiens n'en avaient pas.",
    svg: medal(
      'car',
      '#2b3f7a',
      `<rect x="12" y="29.5" width="40" height="5" fill="${GOLD}" ${LN}/><rect x="29.5" y="12" width="5" height="40" fill="${GOLD}" ${LN}/><rect x="10" y="26" width="4" height="12" fill="${GOLD}" ${LN}/><rect x="50" y="26" width="4" height="12" fill="${GOLD}" ${LN}/><rect x="26" y="10" width="12" height="4" fill="${GOLD}" ${LN}/><rect x="26" y="50" width="12" height="4" fill="${GOLD}" ${LN}/><circle cx="32" cy="32" r="7" fill="${GOLD}" ${LN}/><circle cx="32" cy="32" r="3.2" fill="#2b3f7a" ${LN}/><path d="M19 19L24 24M45 19L40 24M19 45L24 40M45 45L40 40" stroke="${GOLD}" stroke-width="2.5" stroke-linecap="round"/>`,
    ),
  },
  'saint-empire': {
    label: 'Aigle bicéphale impérial',
    note: "Aigle noir à deux têtes sur fond d'or, emblème des empereurs du Saint-Empire ; la version bicéphale s'impose à partir du XVe siècle (Sigismond), l'aigle simple étant plus ancien.",
    svg: flag(GOLD, `<g transform="translate(32 33) scale(.8) translate(-32 -32)">${doubleEagle(BLACK, RED, GOLD, '')}</g>`),
  },
  omeyyades: {
    label: 'Bannière blanche',
    note: 'Le blanc est la couleur attribuée aux Omeyyades (661-750), en contraste avec les bannières des Alides et des Abbassides. Aucune bannière précise ne nous est parvenue : reconstitution sobre.',
    svg: banner(CREAM),
  },
  'perse-achemenide': {
    label: "Faucon d'or de Cyrus",
    note: "Étendard royal achéménide : un aigle ou faucon d'or aux ailes déployées, décrit par Xénophon (Cyropédie) comme l'enseigne de Cyrus. Image reconstituée à partir de ce texte.",
    svg: medal(
      'per',
      '#2c3f6d',
      `<path d="M29 40L25 53L32 49L39 53L35 40Z" fill="${GOLD}" ${LN}/><path d="M28 27C21 22 13 22 6 25C9 27 11 29 14 30C13 32 16 34 18 34C19 36 22 36 25 35L28 34Z" fill="${GOLD}" ${LN}/><path d="M36 27C43 22 51 22 58 25C55 27 53 29 50 30C51 32 48 34 46 34C45 36 42 36 39 35L36 34Z" fill="${GOLD}" ${LN}/><path d="M32 22C29 22 28 25 28 28L29 41H35L36 28C36 25 35 22 32 22Z" fill="${GOLD}" ${LN}/><circle cx="32" cy="19" r="3.2" fill="${GOLD}" ${LN}/><path d="M30 18.5L25.5 20.5L30 22Z" fill="#c08a3e" ${LN}/><path d="M10 27L25 31M54 27L39 31M31 34V40M33 34V40" stroke="${O}" stroke-width="1"/>`,
    ),
  },
  abbassides: {
    label: 'Bannière noire',
    note: "Le noir est la couleur des Abbassides (750-1258), reprise de l'étendard de la révolution partie du Khorasan. Ni drapeau ni armoiries : une bannière unie, reconstituée.",
    svg: banner('#2a2623'),
  },
  ottomans: {
    label: 'Croissant et étoile',
    note: "Croissant et étoile blancs sur fond rouge : drapeau ottoman fixé au XIXe siècle (1844), même si le croissant est ancien dans l'empire. Les bannières antérieures variaient beaucoup.",
    svg: flag(
      '#b3261e',
      `<path d="M34 19A13 13 0 0 0 34 45A13.6 13.6 0 0 1 34 19Z" fill="${CREAM}" ${LN}/><path d="${star(46, 32, 6, 2.5, 5)}" fill="${CREAM}" ${LN}/>`,
    ),
  },
  alexandre: {
    label: 'Soleil de Vergina',
    note: "Étoile à seize rayons trouvée sur le coffret d'or de la tombe royale de Vergina (Macédoine, IVe siècle av. J.-C.), emblème de la dynastie argéade. C'est un symbole, pas un drapeau.",
    svg: medal(
      'ale',
      '#5b2a66',
      `<path d="${star(32, 32, 27, 12, 16)}" fill="${GOLD}" ${LN}/><circle cx="32" cy="32" r="9" fill="${CREAM}" ${LN}/><circle cx="32" cy="32" r="4.5" fill="${GOLD}" ${LN}/>`,
    ),
  },
  assyrie: {
    label: "Disque ailé d'Assur",
    note: 'Disque solaire ailé du dieu Assur, qui protège le roi sur les reliefs des palais assyriens (IXe-VIIe siècles av. J.-C.). Symbole religieux et royal, pas un drapeau.',
    svg: medal(
      'ass',
      '#dccb9f',
      `<path d="M24 31C18 25 11 25 4 29C7 32 6 34 8 36C8 39 11 40 13 40C14 43 18 43 21 42L25 38Z" fill="${BLUE}" ${LN}/><path d="M40 31C46 25 53 25 60 29C57 32 58 34 56 36C56 39 53 40 51 40C50 43 46 43 43 42L39 38Z" fill="${BLUE}" ${LN}/><path d="M7 31H22M9 35H22M12 39H23M57 31H42M55 35H42M52 39H41" stroke="${CREAM}" stroke-width="1.3"/><path d="M26 38L23 54L32 48L41 54L38 38Z" fill="${RED}" ${LN}/><circle cx="32" cy="31" r="9" fill="${GOLD}" ${LN}/><circle cx="32" cy="31" r="4.5" fill="${CREAM}" ${LN}/><path d="M32 22V40M23 31H41" stroke="${O}" stroke-width="1.2"/>`,
    ),
  },
  mongols: {
    label: 'Sülde, neuf queues blanches',
    note: "Le sülde est l'étendard sacré des Mongols : lance à trident ornée de queues de cheval. Neuf queues blanches pour la paix, noires pour la guerre ; attribué à Gengis Khan. Reconstitution stylisée.",
    svg: medal(
      'mon',
      '#4a7ab0',
      `<path d="M32 5V62" stroke="${O}" stroke-width="2.6"/>${[0, 1, 2, 3, 4, 5, 6, 7, 8]
        .map((i) => {
          const x = 14 + i * 4.5;
          const y = 50 + (i % 2) * 6 - Math.abs(i - 4) * 0.4;
          return `<path d="M30.5 21L${(x - 1.6).toFixed(1)} ${y.toFixed(1)}L${(x + 1.6).toFixed(1)} ${y.toFixed(1)}L33.5 21Z" fill="${CREAM}" stroke="${O}" stroke-width="1" stroke-linejoin="round"/>`;
        })
        .join(
          '',
        )}${gline('M23 8C23 15 27 17 32 17C37 17 41 15 41 8', 2.5)}<path d="M32 2L35 11H29Z" fill="${GOLD}" ${LN}/><circle cx="32" cy="19" r="3.4" fill="${GOLD}" ${LN}/>`,
    ),
  },
  china: {
    label: 'Dragon impérial (drapeau Qing)',
    note: "Dragon bleu chassant la perle rouge sur fond jaune : drapeau de la dynastie Qing, adopté à partir de 1862 (rectangulaire en 1889). Les dynasties antérieures n'avaient pas de drapeau fixe.",
    svg: flag(
      '#e3b83a',
      `<path d="M11 41C17 26 25 46 32 35C38 25 44 40 49 31" fill="none" stroke="${O}" stroke-width="7.5" stroke-linecap="round"/><path d="M11 41C17 26 25 46 32 35C38 25 44 40 49 31" fill="none" stroke="#2e5f9a" stroke-width="5" stroke-linecap="round"/><path d="M15 38L19 43M24 41L26 46M37 33L39 38M44 34L47 38" stroke="${O}" stroke-width="1.5" stroke-linecap="round"/><path d="M47 28L51 22L54 26L58 26L56 30L58 34L51 34L47 33Z" fill="#2e5f9a" ${LN}/><path d="M50 22L49 17M52 23L55 19" stroke="${O}" stroke-width="1.5" stroke-linecap="round"/><circle cx="53" cy="28" r="1.1" fill="${CREAM}"/><circle cx="31" cy="21" r="3.5" fill="${RED}" ${LN}/>`,
    ),
  },
  gokturks: {
    label: "Tête de loup d'or",
    note: "Les chroniques chinoises décrivent un étendard à tête de loup dorée chez les Göktürks (VIe-VIIIe siècles) ; le fond bleu rappelle le « Ciel bleu » (Köktengri). Reconstitution libre, aucun étendard n'est conservé.",
    svg: flag(
      '#3a6ea5',
      `<path d="M21 17L29 24H35L43 17L42 31C42 38 37 43 32 47C27 43 22 38 22 31Z" fill="${GOLD}" ${LN}/><path d="M25 29L29 31M39 29L35 31" stroke="${O}" stroke-width="1.8" stroke-linecap="round"/><path d="M29.5 41L32 47L34.5 41Z" fill="${O}"/><path d="M32 31V40M24 24L27 28M40 24L37 28" stroke="${O}" stroke-width="1.2" stroke-linecap="round"/>`,
    ),
  },
  moghols: {
    label: 'Soleil et lion',
    note: "Le lion devant le soleil levant (shir-o-khorshid) est un emblème persan repris sur les bannières (alam) moghols. Attribution plus tardive et incertaine : à lire comme un symbole, pas comme le drapeau de l'empire.",
    svg: flag(
      '#d98a2b',
      `<path d="${star(32, 31, 17, 12, 16)}" fill="#f2d675" stroke="${O}" stroke-width="1.2" stroke-linejoin="round"/><circle cx="32" cy="31" r="9" fill="#f2d675" stroke="${O}" stroke-width="1.2"/><path d="M19 34C19 30 24 29 30 29H40C44 29 46 31 46 34V37H19Z" fill="#7a3018" ${LN}/><path d="M22 37V44M27 37V44M38 37V44M43 37V44" stroke="${O}" stroke-width="3.2" stroke-linecap="round"/><path d="M22 37V44M27 37V44M38 37V44M43 37V44" stroke="#7a3018" stroke-width="1.6" stroke-linecap="round"/><path d="M46 32C51 30 52 25 50 22" fill="none" stroke="${O}" stroke-width="2.6" stroke-linecap="round"/><circle cx="50" cy="22" r="2" fill="#7a3018" ${LN}/><circle cx="19" cy="30" r="6.5" fill="#5a2210" ${LN}/><circle cx="18" cy="31" r="3.2" fill="#a85a2a" ${LN}/>`,
    ),
  },
  japon: {
    label: 'Hinomaru (disque solaire)',
    note: "Disque rouge sur fond blanc, pavillon national adopté en 1870 sous l'ère Meiji. Le soleil levant à seize rayons (Kyokujitsu-ki), enseigne de l'armée puis de la marine impériales, garde un sens très lourd en Corée et en Chine.",
    svg: flag(CREAM, `<circle cx="32" cy="32" r="10.5" fill="${RED}" stroke="${O}" stroke-width="1.5"/>`),
  },
  khmer: {
    label: 'Angkor Vat',
    note: "Silhouette du temple d'Angkor Vat, bâti par Suryavarman II au XIIe siècle, symbole du royaume khmer (il figure aujourd'hui sur le drapeau du Cambodge). C'est un monument, pas un drapeau d'époque.",
    svg: medal(
      'khm',
      '#e6a14a',
      `<circle cx="32" cy="28" r="15" fill="#f5dc8a"/>${tower(21, 46, 3.8, 20)}${tower(43, 46, 3.8, 20)}${tower(32, 46, 5, 28)}<rect x="10" y="40" width="44" height="6" fill="#5a3f2a" ${LN}/><rect x="6" y="46" width="52" height="5" fill="#6e4e34" ${LN}/><rect x="0" y="51" width="64" height="14" fill="#4d8a8c"/><path d="M12 56H22M34 58H46" stroke="${CREAM}" stroke-width="1.4" stroke-linecap="round"/>`,
    ),
  },
  fatimides: {
    label: 'Bannière verte',
    note: "Le vert est la couleur des Fatimides (909-1171) ; leurs étendards étaient aussi blancs, en opposition au noir abbasside. Reconstitution sobre d'une bannière unie, sans inscription.",
    svg: banner('#3f8a4a'),
  },
  songhai: {
    label: 'Tombeau des Askia',
    note: "Pyramide en banco hérissée de poutres (toron) du tombeau d'Askia Mohammed à Gao, vers 1500, classé à l'UNESCO. C'est un monument-symbole : aucun drapeau songhaï n'est connu.",
    svg: medal(
      'son',
      '#8fb3c9',
      `<rect x="0" y="50" width="64" height="14" fill="#d8bf8e"/><path d="M10 52L54 52L50 42L14 42Z" fill="#a9774c" ${LN}/><path d="M17 42L47 42L43 32L21 32Z" fill="#b8845a" ${LN}/><path d="M25 32L39 32L36 22L28 22Z" fill="#a9774c" ${LN}/><path d="M32 22V15" stroke="${O}" stroke-width="2"/><circle cx="32" cy="13.5" r="2.4" fill="${CREAM}" ${LN}/><path d="M12.5 47H8.5M51.5 47H55.5M19.5 37H15.5M44.5 37H48.5M26.5 27H23.5M37.5 27H40.5" stroke="${O}" stroke-width="1.8" stroke-linecap="round"/>`,
    ),
  },
  mali: {
    label: 'Mosquée de Djinguereber',
    note: "Mosquée en banco de Tombouctou, construite vers 1327 sous Mansa Moussa. Elle évoque l'architecture de l'empire du Mali ; ce n'est pas un drapeau, aucune bannière malienne médiévale n'étant connue.",
    svg: medal(
      'mal',
      '#d98a3a',
      `<circle cx="46" cy="18" r="8" fill="#f2d675"/><rect x="0" y="52" width="64" height="12" fill="#e2c288"/><path d="M8 52V40H56V52Z" fill="#b98a5c" ${LN}/><path d="M24 40L28 15H36L40 40Z" fill="#c4966a" ${LN}/><path d="M9 40L12 31H18L21 40Z" fill="#c4966a" ${LN}/><path d="M43 40L46 31H52L55 40Z" fill="#c4966a" ${LN}/><circle cx="32" cy="13" r="2.4" fill="${CREAM}" ${LN}/><circle cx="15" cy="29.5" r="1.8" fill="${CREAM}" ${LN}/><circle cx="49" cy="29.5" r="1.8" fill="${CREAM}" ${LN}/><path d="M27 52V46C27 43 37 43 37 46V52Z" fill="#4a2f1c" ${LN}/><path d="M26.5 22H24M26 29H23.5M25.5 36H23M37.5 22H40M38 29H40.5M38.5 36H41" stroke="${O}" stroke-width="1.8" stroke-linecap="round"/>`,
    ),
  },
  egypte: {
    label: "Œil d'Horus",
    note: "L'oudjat, œil du dieu Horus, symbole de protection et de santé omniprésent en Égypte pharaonique (amulettes, tombes). Ce n'est pas un drapeau.",
    svg: medal(
      'egy',
      '#24467a',
      `${gline('M10 23C20 12 40 12 54 22', 3.5)}<path d="M8 33C16 23 26 22 32 22C40 22 50 25 56 33C50 41 40 43 32 43C25 43 16 41 8 33Z" fill="${CREAM}" ${LN}/><circle cx="32" cy="32.5" r="8" fill="#1c1a2e" ${LN}/><circle cx="29.5" cy="30" r="2" fill="${CREAM}"/>${gline('M30 43V51C30 55 25 55 23 52', 3.2)}${gline('M44 41C48 49 56 49 56 43', 3.2)}`,
    ),
  },
  carthage: {
    label: 'Signe de Tanit',
    note: 'Disque, barre aux bras levés et corps trapézoïdal : le signe de Tanit, déesse punique, omniprésent sur les stèles de Carthage (Ve-IIe siècles av. J.-C.). Symbole religieux, pas un drapeau.',
    svg: medal(
      'car2',
      '#6a2a5a',
      `${gline('M13 23V30H51V23', 4.5)}<path d="M24 31H40L47 54H17Z" fill="${GOLD}" ${LN}/><rect x="30" y="20" width="4" height="12" fill="${GOLD}" ${LN}/><circle cx="32" cy="15" r="6" fill="${GOLD}" ${LN}/><path d="M13 23V30H51V23" fill="none" stroke="${GOLD}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>`,
    ),
  },
  aksoum: {
    label: 'Croix et croissant aksoumites',
    note: "Croissant surmonté d'une croix, motif des monnaies d'or et d'argent des rois d'Aksoum (IVe-VIIe siècles, dès Ézana). Un motif monétaire, pas un drapeau.",
    svg: medal(
      'aks',
      '#7a3a26',
      `<path d="M14 36A18 18 0 0 0 50 36A18 14 0 0 1 14 36Z" fill="${GOLD}" ${LN}/><rect x="29" y="10" width="6" height="36" rx="1" fill="${CREAM}" ${LN}/><rect x="19" y="19" width="26" height="6" rx="1" fill="${CREAM}" ${LN}/><circle cx="32" cy="22" r="2" fill="${RED}"/>`,
    ),
  },
  inca: {
    label: 'Soleil Inti',
    note: "Inti, le dieu-soleil et ancêtre des empereurs, représenté par un disque d'or à visage et rayons alternés (temple du Coricancha). Symbole religieux ; le damier wiphala est un emblème plus récent.",
    svg: medal(
      'inc',
      '#8a2a22',
      `<path d="${star(32, 32, 28, 15, 16)}" fill="${GOLD}" ${LN}/><circle cx="32" cy="32" r="13" fill="#e8c35a" ${LN}/><ellipse cx="27.5" cy="29" rx="2" ry="1.3" fill="${O}"/><ellipse cx="36.5" cy="29" rx="2" ry="1.3" fill="${O}"/><path d="M32 29V35M28 38C30 40 34 40 36 38" fill="none" stroke="${O}" stroke-width="1.5" stroke-linecap="round"/>`,
    ),
  },
  azteques: {
    label: 'Aigle sur le nopal',
    note: 'Selon la légende de fondation, les Mexicas bâtissent Tenochtitlan là où un aigle se pose sur un nopal (figuier de Barbarie) dans le lac. Symbole fondateur, repris dans le Codex Mendoza, pas un drapeau.',
    svg: medal(
      'azt',
      '#7fb3b8',
      `<rect x="0" y="52" width="64" height="12" fill="#3a7a8a"/><path d="M12 56C12 48 20 46 30 47C38 47 42 50 44 56Z" fill="#8a7a6a" ${LN}/><ellipse cx="26" cy="38" rx="6" ry="8.5" fill="#5a8a4a" ${LN}/><ellipse cx="20" cy="27" rx="5" ry="7.5" transform="rotate(-22 20 27)" fill="#5a8a4a" ${LN}/><ellipse cx="33" cy="26" rx="5" ry="7.5" transform="rotate(20 33 26)" fill="#5a8a4a" ${LN}/><circle cx="16" cy="19" r="2.4" fill="${RED}" ${LN}/><circle cx="37" cy="17.5" r="2.4" fill="${RED}" ${LN}/><circle cx="26" cy="31" r="2.2" fill="${RED}" ${LN}/><path d="M38 31C38 24 46 19 52 22C56 24 56 30 52 34L46 38L40 38Z" fill="#7a4a28" ${LN}/><path d="M52 34L60 44L52 42L48 38Z" fill="#5a3418" ${LN}/><path d="M42 26C47 24 51 27 50 32C46 33 43 31 42 26Z" fill="#a5753f" ${LN}/><circle cx="45" cy="17" r="4.5" fill="${CREAM}" ${LN}/><path d="M42 15.5L36 18.5L42 20Z" fill="${GOLD}" ${LN}/><circle cx="44" cy="16" r="1" fill="${O}"/>`,
    ),
  },
  maya: {
    label: 'Pyramide à degrés',
    note: "Temple-pyramide à degrés, forme emblématique des cités mayas (Tikal, Chichén Itzá), surmonté d'un temple à crête. Un monument-symbole : les cités mayas n'avaient pas de drapeau commun.",
    svg: medal(
      'may',
      '#6aa0a8',
      `<rect x="0" y="52" width="64" height="12" fill="#4a7a4a"/><rect x="9" y="46" width="46" height="7" fill="#cdbf9b" ${LN}/><rect x="13" y="40" width="38" height="6" fill="#cdbf9b" ${LN}/><rect x="17" y="34" width="30" height="6" fill="#cdbf9b" ${LN}/><rect x="21" y="28" width="22" height="6" fill="#cdbf9b" ${LN}/><rect x="24" y="19" width="16" height="9" fill="#d8cca8" ${LN}/><rect x="27" y="10" width="10" height="9" fill="#cdbf9b" ${LN}/><path d="M28.5 53L30.5 28H33.5L35.5 53Z" fill="#9c8e6b" stroke="${O}" stroke-width="1"/><path d="M29 47H35M29.5 41H34.5M30 35H34" stroke="${O}" stroke-width="1"/><rect x="29.5" y="21.5" width="5" height="6.5" fill="#4a2f1c"/>`,
    ),
  },
  tonga: {
    label: 'Trilithon Haʻamonga ʻa Maui',
    note: "Portique de deux piliers de corail et d'un linteau, érigé vers 1200 sous le Tuʻi Tonga Tuʻitātui, sans doute lié aux solstices. Un monument-symbole : pas de drapeau de ce type.",
    svg: medal(
      'ton',
      '#7fb3c8',
      `<circle cx="32" cy="38" r="9" fill="${GOLD}"/><rect x="0" y="50" width="64" height="14" fill="#6a9a58"/><rect x="0" y="45" width="64" height="5" fill="#3a7a9a"/><rect x="15" y="21" width="9" height="31" rx="2" fill="#a29c90" ${LN}/><rect x="40" y="21" width="9" height="31" rx="2" fill="#a29c90" ${LN}/><rect x="10" y="14" width="44" height="9" rx="2.5" fill="#b3ad9f" ${LN}/>`,
    ),
  },
};
