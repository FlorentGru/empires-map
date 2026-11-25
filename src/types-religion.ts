/**
 * Religions dominantes (issue #81). Données à la main dans data/religions/, polygones au build
 * (scripts/build-religions.ts → public/data/religions/), calque chargé à la demande (src/map/religionLayers.ts).
 */
export type Religion =
  | 'christianisme'
  | 'catholicisme'
  | 'orthodoxie'
  | 'protestantisme'
  | 'christianismes-orientaux'
  | 'islam'
  | 'islam-sunnite'
  | 'islam-chiite'
  | 'judaisme'
  | 'zoroastrisme'
  | 'hindouisme'
  | 'bouddhisme'
  | 'sikhisme'
  | 'religions-chinoises'
  | 'shinto'
  | 'polytheisme'
  | 'traditionnelles'
  | 'sans-religion';

/** Libellé français, couleur (lisible sur le parchemin et en mode sombre), et ce que la catégorie recouvre. */
export const RELIGIONS: Record<Religion, { label: string; color: string; scope: string }> = {
  christianisme: { label: 'Christianisme', color: '#5b6fb5', scope: 'chrétienté indivise, avant le schisme de 1054, ou sans précision' },
  catholicisme: { label: 'Catholicisme', color: '#3f5fbf', scope: 'Église latine, de Rome' },
  orthodoxie: { label: 'Orthodoxie', color: '#7b4fb0', scope: 'Églises grecque, slaves, géorgienne' },
  protestantisme: { label: 'Protestantisme', color: '#2f8fb8', scope: 'luthériens, calvinistes, anglicans' },
  'christianismes-orientaux': {
    label: 'Christianismes orientaux',
    color: '#9b6fc6',
    scope: 'coptes, arméniens, syriaques, Église de l’Orient (nestoriens), Éthiopie',
  },
  islam: { label: 'Islam', color: '#2e9b57', scope: 'islam des premiers siècles, ou sans précision' },
  'islam-sunnite': { label: 'Islam sunnite', color: '#1f8a4c', scope: 'majorité sunnite' },
  'islam-chiite': { label: 'Islam chiite', color: '#5fb86a', scope: 'duodécimains, ismaéliens (Fatimides), zaydites' },
  judaisme: { label: 'Judaïsme', color: '#6fa8dc', scope: 'royaumes juifs, Khazars' },
  zoroastrisme: { label: 'Zoroastrisme', color: '#d9a23a', scope: 'religion d’État perse (Achéménides, Parthes, Sassanides)' },
  hindouisme: { label: 'Hindouisme', color: '#e07b2e', scope: 'religion védique et brahmanique comprise' },
  bouddhisme: { label: 'Bouddhisme', color: '#e8c33a', scope: 'theravada, mahayana, vajrayana (Tibet, Mongols après 1577)' },
  sikhisme: { label: 'Sikhisme', color: '#f2a65a', scope: 'Empire sikh' },
  'religions-chinoises': { label: 'Religions chinoises', color: '#c8463d', scope: 'confucianisme, taoïsme et bouddhisme mêlés, culte des ancêtres' },
  shinto: { label: 'Shintō et bouddhisme', color: '#d9667a', scope: 'Japon : shintō et bouddhisme associés' },
  polytheisme: {
    label: 'Polythéismes',
    color: '#a0703c',
    scope: 'religions de l’Antiquité (grecque, romaine, égyptienne, mésopotamienne, celte, germanique) et des Amériques (Aztèques, Incas)',
  },
  traditionnelles: {
    label: 'Religions traditionnelles',
    color: '#7d8a3a',
    scope: 'animisme, chamanisme, tengrisme des steppes, religions africaines et océaniennes',
  },
  'sans-religion': {
    label: 'Sans religion majoritaire',
    color: '#8f8f8f',
    scope: 'athéisme d’État ou majorité sans religion (URSS, Chine actuelle, Tchéquie)',
  },
};

export const RELIGION_IDS = Object.keys(RELIGIONS) as Religion[];

/** Religion valable à partir de `from` (année, négative av. J.-C.) jusqu'à la période suivante. */
export interface ReligionPeriod {
  from: number;
  religion: Religion;
  /** Minorités importantes, s'il y en a (2 au plus). */
  minorities?: Religion[];
  /** Une phrase courte, seulement pour une transition ou une nuance (« christianisation progressive après 380 »). */
  note?: string;
}

/**
 * data/religions/territories.json : empireId → nom exact de l'entité (propriété `name` des territoires) → périodes triées.
 * data/religions/historical.json : NAME anglais d'un polygone historical-basemaps → périodes triées.
 */
export type ReligionTable = Record<string, ReligionPeriod[]>;
export type TerritoryReligions = Record<string, ReligionTable>;

/** data/religions/countries.json : code ADM0_A3 de Natural Earth → religion majoritaire aujourd'hui (Pew Research Center). */
export type CountryReligions = Record<string, { religion: Religion; minorities?: Religion[] }>;

/** Religion en vigueur une année donnée (dernière période dont `from` ≤ year), ou null. */
export function religionAt(periods: readonly ReligionPeriod[] | undefined, year: number): ReligionPeriod | null {
  let out: ReligionPeriod | null = null;
  for (const p of periods ?? []) if (p.from <= year) out = p;
  return out;
}
