// Configuration « Empire napoléonien » (1799-1815) : 18 étapes, une Feature PAR ENTITÉ
// (France / États satellites / alliés), avec `status` core | vassal | allied.
//
// historical-basemaps n'a pas d'instantané pour cette période dans .cache avant `npm run fetch:data` :
// world_1783, world_1800 et world_1815 sont téléchargés par scripts/fetch-basemaps.sh. Leurs NAME utiles :
//   1783 : Poland, Prussia            1800 : Lombardy, Venetia, Modena, Massa, Parma, Papal States, Tuscany, Lucca,
//   1815 : France, Bavaria, Württemberg, Baden, Hohenzollern, Grand Duchy of Hesse, Nassau, Wetzlar, Waldeck,
//          Lippe-Detmold, Schaumburg-Lippe, Anhalt, Prussia, Austrian Empire, Holstein, Schleswig, Hamburg, Lübeck,
//          Bremen, Cuxhaven, Kingdom of the Two Sicilies (1800), Russian Empire (1800).
//   (« France », « Kingdom of Sardinia » sont présents mais les instantanés sont trop lâches : Gênes, Naples,
//    Nice, Hambourg, Cassel tombent dans la mauvaise entité ou nulle part.)
// Il n'existe PAS de « French Empire », « Kingdom of Italy » ni « Confederation of the Rhine » dans la base.
// Choix : frontières modernes cohérentes entre elles (Natural Earth admin-0 : France, Belgique, Pays-Bas, Suisse,
// Italie, Allemagne, Espagne, Croatie, Slovénie…) découpées par des polygones nommés approximatifs
// (overrides/napoleon/_regions.geojson : rive gauche du Rhin, Savoie, Nice, Piémont, Ligurie, Westphalie,
// Illyrie, Duché de Varsovie…), et instantanés historiques pour les États italiens, allemands du Sud et la Pologne.
// Les overrides overrides/napoleon/<id>.geojson restent applicables en retouche finale.
import type { Position } from 'geojson';
import type { Checkpoint, ComposedEntity, EmpireConfig, EmpireStep, GeoCtx, Poly, Status } from './types.ts';

const IDS = [
  'brumaire-1799',
  'marengo-1800',
  'luneville-1801',
  'amiens-1802',
  'sacre-1804',
  'trafalgar-1805',
  'austerlitz-1805',
  'confederation-rhin-1806',
  'iena-1806',
  'tilsit-1807',
  'espagne-1808',
  'wagram-1809',
  'apogee-1811',
  'moscou-1812',
  'leipzig-1813',
  'abdication-1814',
  'waterloo-1815',
  'congres-vienne-1815',
] as const;
const YEARS = [1799, 1800, 1801, 1802, 1804, 1805, 1805, 1806, 1806, 1807, 1808, 1809, 1811, 1812, 1813, 1814, 1815, 1815];
const STEPS: EmpireStep[] = IDS.map((id, i) => ({ id, year: YEARS[i], compose: true }));

const S1783 = 'world_1783';
const S1800 = 'world_1800';
const S1815 = 'world_1815';

/** Blocs géographiques réutilisés d'une étape à l'autre (mémoïsés par contexte). */
function makeBlocks(c: GeoCtx) {
  const u = c.union;
  const country = (m: string, region = 'EUROPE') => c.country(m, region);
  const memo = new Map<string, Poly | null>();
  const once = (k: string, f: () => Poly | null) => {
    if (!memo.has(k)) memo.set(k, f());
    return memo.get(k) ?? null;
  };
  const inReg = (m: string, reg: string) => c.country(m, reg);

  const france = () => once('france', () => country('^France$'));
  const savoie = () => once('savoie', () => inReg('^France$', 'SAVOIE'));
  const nice = () => once('nice', () => inReg('^France$', 'NICE'));
  const savoieEst = () => once('savoieEst', () => c.inter(savoie(), c.region('SAVOIE_EST')));
  const netherlands = () => once('nl', () => country('^Netherlands$'));
  const germany = () => once('de', () => country('^Germany$'));
  const italy = () => once('it', () => country('^Italy$'));
  const switzerland = () => once('ch', () => country('^Switzerland$'));
  const spain = () => once('es', () => country('^Spain$'));

  /** France de 1790 : la France moderne sans Savoie ni Nice (Avignon, Montbéliard, Mulhouse y figurent : limite). */
  const france1790 = () => once('f1790', () => c.diff(france(), c.region('SAVOIE'), c.region('NICE')));
  /** France de mai 1814 : 1792 + Chambéry/Annecy, Sarrelouis et Landau ; sans Nice, Savoie orientale. */
  const france1814 = () =>
    once('f1814', () =>
      u(
        c.diff(france(), c.region('NICE'), savoieEst()),
        inReg('^Germany$', 'SARRELOUIS'),
        inReg('^Germany$', 'LANDAU'),
      ),
    );
  const belgique = () =>
    once('belgique', () =>
      u(
        country('^Belgium$'),
        country('^Luxembourg$'),
        inReg('^Netherlands$', 'ZEEUWS_VLAANDEREN'),
        inReg('^Netherlands$', 'LIMBOURG_SUD'),
      ),
    );
  const rhin = () => once('rhin', () => inReg('^Germany$', 'RIVE_GAUCHE_RHIN'));
  const geneve = () => once('geneve', () => u(inReg('^Switzerland$', 'GENEVE'), inReg('^Switzerland$', 'MONT_TERRIBLE')));
  const valais = () => once('valais', () => inReg('^Switzerland$', 'VALAIS'));
  const piemont = () => once('piemont', () => inReg('^Italy$', 'PIEMONT'));
  const ligurie = () => once('ligurie', () => inReg('^Italy$', 'LIGURIE'));
  const elbe = () => once('elbe', () => c.island([10.28, 42.78]));
  const sicile = () => once('sicile', () => c.island([14.0, 37.5]));
  const parme = () => once('parme', () => c.snap(S1800, '^Parma$'));
  const toscane = () => once('toscane', () => coastFill(c.snap(S1800, '^(Tuscany|Pontremoli|Fivizzano)$')));
  const papal = () => once('papal', () => c.snap(S1800, '^Papal States$'));
  const marches = () => once('marches', () => c.inter(papal(), c.region('MARCHES')));
  const romagne = () => once('romagne', () => c.inter(papal(), c.region('ROMAGNE_N')));
  const lazioOmbrie = () => once('lazio', () => coastFill(c.diff(papal(), c.region('MARCHES'), c.region('ROMAGNE_N'))));
  const lombardie = () => once('lombardie', () => c.snap(S1800, '^Lombardy$'));
  const modene = () => once('modene', () => c.snap(S1800, '^Modena$'));
  const venetie = () => once('venetie', () => c.diff(c.snap(S1800, '^Venetia$'), c.region('ISONZO_EST')));
  const naplesRaw = () => once('naplesRaw', () => c.diff(c.snap(S1800, '^Kingdom of the Two Sicilies$'), sicile()));
  /** Union de tous les États italiens des instantanés : zone « déjà couverte » pour le rattrapage de côte. */
  const italieSnap = () =>
    once('italieSnap', () =>
      u(
        c.snap(S1800, '^(Kingdom of the Two Sicilies|Papal States|Tuscany|Lucca|Parma|Modena|Massa|Lombardy|Venetia|Pontremoli|Fivizzano)$'),
      ),
    );
  /** Les côtes des instantanés sont généralisées (Naples, Ancône, Trieste manquent) : on rattrape ≤ 10 km de terre italienne. */
  const coastFill = (g: Poly | null): Poly | null => {
    if (!g) return null;
    const grown = c.grow(g, 10, italieSnap());
    return u(g, c.inter(grown, italy()));
  };
  const naples = () => once('naples', () => coastFill(naplesRaw()));
  const lucques = () => once('lucques', () => u(c.snap(S1800, '^(Lucca|Massa)$'), inReg('^Italy$', 'PIOMBINO')));
  const dalmatie = (avecRaguse: boolean) =>
    once(`dalmatie${avecRaguse}`, () => {
      const d = inReg('^Croatia$', 'DALMATIE');
      return avecRaguse ? d : c.diff(d, c.region('RAGUSE'));
    });
  const trentin = () => once('trentin', () => inReg('^Italy$', 'TRENTIN'));
  const tyrolN = () => once('tyrolN', () => inReg('^Austria$', 'TYROL_N'));
  const salzbourg = () => once('salzbourg', () => inReg('^Austria$', 'SALZBOURG'));
  const illyrie = () =>
    once('illyrie', () =>
      u(
        inReg('^Slovenia$', 'ILLYRIE_CARNIOLE'),
        inReg('^Croatia$', 'ILLYRIE_CROATIE'),
        inReg('^Austria$', 'ILLYRIE_CARINTHIE'),
        inReg('^Italy$', 'ISONZO_EST'),
        inReg('^Montenegro$', 'BOUCHES_CATTARO'),
        c.inter(c.snap(S1800, '^Venetia$'), c.region('ISONZO_EST')),
      ),
    );
  const nord = () =>
    once('nord', () => {
      const base = c.diff(c.inter(germany(), c.region('NORD_ALLEMAGNE')), c.region('HOLSTEIN_SCHLESWIG'));
      return u(base, c.snap(S1815, '^(Hamburg|Lübeck|Bremen|Cuxhaven)$'));
    });
  const petitsEtats = () => once('petitsEtats', () => c.snap(S1815, '^(Waldeck|Lippe-Detmold|Schaumburg-Lippe|Anhalt)$'));
  const westphalie = (avecHanovre: boolean) =>
    once(`westphalie${avecHanovre}`, () => {
      const ring = c.diff(c.inter(germany(), c.region('WESTPHALIE')), petitsEtats());
      return avecHanovre ? u(ring, c.diff(c.inter(germany(), c.region('HANOVRE')), petitsEtats())) : ring;
    });
  const cdrSud = () =>
    once('cdrSud', () =>
      u(
        c.snap(S1815, '^(Bavaria|Württemberg|Baden|Hohenzollern|Grand Duchy of Hesse|Nassau|Wetzlar)$'),
        inReg('^Germany$', 'BERG'),
      ),
    );
  const cdrEst = () => once('cdrEst', () => u(inReg('^Germany$', 'CDR_EST'), petitsEtats()));
  const bavePlus = () =>
    once('bavePlus', () => u(c.snap(S1815, '^Bavaria$'), tyrolN(), trentin()));
  const duche1807 = () =>
    once('duche1807', () =>
      u(
        c.inter(c.snap(S1783, '^Poland$'), c.region('DUCHE_1807')),
        c.inter(c.snap(S1783, '^Prussia$'), c.region('NETZE')),
      ),
    );
  const duche1809 = () => once('duche1809', () => u(duche1807(), c.inter(c.snap(S1783, '^Poland$'), c.region('GALICIE_OUEST'))));
  const dantzig = () => once('dantzig', () => inReg('^Poland$', 'DANTZIG'));
  const catalogne = () => once('catalogne', () => c.inter(spain(), c.region('CATALOGNE')));

  return {
    u, c, coastFill, country, france, france1790, france1814, belgique, rhin, geneve, valais, savoie, nice, piemont, ligurie, elbe, parme,
    toscane, papal, marches, romagne, lazioOmbrie, lombardie, modene, venetie, naples, lucques, dalmatie, trentin, tyrolN,
    salzbourg, illyrie, nord, westphalie, cdrSud, cdrEst, bavePlus, duche1807, duche1809, dantzig, catalogne, netherlands,
    germany, italy, switzerland, spain,
  };
}

const cache = new WeakMap<GeoCtx, ReturnType<typeof makeBlocks>>();

function compose(step: EmpireStep, ctx: GeoCtx): ComposedEntity[] {
  let B = cache.get(ctx);
  if (!B) {
    B = makeBlocks(ctx);
    cache.set(ctx, B);
  }
  const c = ctx;
  const u = c.union;
  const i = IDS.indexOf(step.id as (typeof IDS)[number]);
  const ge = (id: (typeof IDS)[number]) => i >= IDS.indexOf(id);
  const lt = (id: (typeof IDS)[number]) => i < IDS.indexOf(id);
  const out: ComposedEntity[] = [];
  const add = (name: string, status: Status, geom: Poly | null, sourceYear?: number) => out.push({ name, status, geom, sourceYear });

  // ---------- France (core) ----------
  const republique = lt('sacre-1804');
  const frName = republique ? 'République française' : 'Empire français';
  if (ge('abdication-1814')) {
    // Traités de Paris : plus aucun État satellite.
    if (step.id === 'abdication-1814') {
      add('France (frontières de 1792)', 'core', B.france1814());
      add("Île d'Elbe (principauté de Napoléon)", 'core', B.elbe());
    } else if (step.id === 'waterloo-1815') add('France (frontières de 1814)', 'core', B.france1814());
    else add('France (frontières de 1790)', 'core', B.france1790());
    return out;
  }
  const nordFr = ge('apogee-1811');
  const core = u(
    B.france1790(),
    B.savoie(),
    B.nice(),
    B.belgique(),
    B.rhin(),
    B.geneve(),
    ge('amiens-1802') ? B.piemont() : null,
    ge('amiens-1802') ? B.elbe() : null,
    ge('amiens-1802') ? B.parme() : null,
    ge('trafalgar-1805') ? B.ligurie() : null,
    ge('espagne-1808') ? B.toscane() : null,
    ge('espagne-1808') ? c.country('^Germany$', 'WESEL') : null,
    ge('espagne-1808') ? c.country('^Netherlands$', 'FLESSINGUE') : null,
    ge('wagram-1809') ? B.lazioOmbrie() : null,
    ge('wagram-1809') ? B.illyrie() : null,
    ge('apogee-1811') ? B.valais() : null,
    nordFr ? B.netherlands() : null,
    nordFr ? B.nord() : null,
    ge('moscou-1812') ? B.catalogne() : null,
  );
  add(frName, 'core', core);

  // ---------- États satellites (vassal) ----------
  // Ordre = priorité : un territoire n'est attribué qu'à la première entité qui le contient.
  if (ge('marengo-1800') && lt('amiens-1802')) add('Piémont (administration française)', 'vassal', B.piemont());
  if (lt('trafalgar-1805')) add('République ligurienne', 'vassal', B.ligurie());

  // Italie du Nord
  const emilie = u(B.modene(), B.romagne());
  const lombardMantoue = ge('luneville-1801') ? B.lombardie() : c.diff(B.lombardie(), c.region('MANTOUE'));
  if (ge('marengo-1800')) {
    const base = ge('luneville-1801') ? u(lombardMantoue, emilie) : lombardMantoue;
    const name = lt('amiens-1802') ? 'République cisalpine' : lt('trafalgar-1805') ? 'République italienne' : "Royaume d'Italie";
    const geom = u(
      base,
      ge('austerlitz-1805') ? B.venetie() : null,
      ge('austerlitz-1805') && lt('wagram-1809') ? B.dalmatie(ge('espagne-1808')) : null,
      ge('espagne-1808') ? B.marches() : null,
      ge('apogee-1811') ? B.trentin() : null,
    );
    add(name, 'vassal', B.coastFill(geom));
  }
  if (ge('luneville-1801') && lt('espagne-1808')) {
    add("Royaume d'Étrurie", 'vassal', ge('amiens-1802') ? B.toscane() : u(B.toscane(), B.parme()));
  }
  if (ge('trafalgar-1805')) add('Principauté de Lucques et Piombino', 'vassal', B.lucques());
  if (ge('confederation-rhin-1806')) add('Royaume de Naples', 'vassal', B.naples());

  // Pays-Bas
  const nl = c.diff(B.netherlands(), c.region('ZEEUWS_VLAANDEREN'), c.region('LIMBOURG_SUD'));
  if (!nordFr) {
    const name = lt('confederation-rhin-1806') ? 'République batave' : 'Royaume de Hollande';
    add(name, 'vassal', u(nl, ge('tilsit-1807') ? c.country('^Germany$', 'FRISE_ORIENTALE') : null));
  }

  // Suisse
  const ch = c.diff(B.switzerland(), c.region('GENEVE'), c.region('MONT_TERRIBLE'));
  const chSansValais = c.diff(ch, c.region('VALAIS'));
  if (lt('amiens-1802')) add('République helvétique', 'vassal', ch);
  else if (lt('sacre-1804')) {
    add('République helvétique', 'vassal', chSansValais);
    add('République du Valais', 'vassal', B.valais());
  } else if (lt('apogee-1811')) {
    add('Confédération suisse', 'vassal', chSansValais);
    add('République du Valais', 'vassal', B.valais());
  } else add('Confédération suisse', 'vassal', chSansValais);
  // (note : de sacre-1804 à wagram-1809 le Valais reste une république indépendante, sous influence française)

  // Allemagne
  if (ge('confederation-rhin-1806')) {
    let cdr = u(B.cdrSud(), B.bavePlus(), c.country('^Germany$', 'FRANCFORT'));
    if (ge('tilsit-1807')) cdr = u(cdr, B.cdrEst());
    if (ge('espagne-1808')) cdr = u(cdr, c.country('^Germany$', 'MECKLEMBOURG'), c.country('^Germany$', 'OLDENBOURG'));
    if (ge('wagram-1809')) cdr = u(cdr, B.salzbourg());
    if (ge('leipzig-1813')) {
      // Octobre 1813 : la Bavière passe à l'ennemi.
      cdr = c.diff(cdr, c.snap(S1815, '^Bavaria$'), B.tyrolN(), B.trentin(), B.salzbourg());
    }
    // Berg, Hesse-Darmstadt, Nassau… (rive droite) ; la rive gauche est déjà française (priorité).
    if (ge('tilsit-1807')) add('Royaume de Westphalie', 'vassal', B.westphalie(ge('apogee-1811')));
    add('Confédération du Rhin', 'vassal', cdr);
  }

  // Pologne
  if (ge('tilsit-1807')) {
    add('Duché de Varsovie', 'vassal', ge('wagram-1809') ? B.duche1809() : B.duche1807());
    add('Ville libre de Dantzig', 'vassal', B.dantzig());
  }

  // Espagne (Joseph)
  if (ge('espagne-1808')) add('Espagne (Joseph)', 'vassal', B.spain());

  // ---------- Alliés (allied) ----------
  // Espagne alliée (neutre jusqu'en 1805) : mentionnée dans les notes de 1804, Trafalgar et Austerlitz.
  if (step.id === 'sacre-1804' || step.id === 'trafalgar-1805' || step.id === 'austerlitz-1805') add('Espagne', 'allied', B.spain());
  if (step.id === 'austerlitz-1805') {
    add('Bavière', 'allied', B.bavePlus());
    add('Wurtemberg', 'allied', c.snap(S1815, '^(Württemberg|Hohenzollern)$'));
    add('Bade', 'allied', c.snap(S1815, '^Baden$'));
  }
  if (step.id === 'tilsit-1807') {
    add('Russie', 'allied', u(c.inter(c.snap(S1800, '^Russian Empire$'), c.region('RUSSIE_EUROPE')), c.inter(c.snap(S1783, '^Prussia$'), c.region('BIALYSTOK'))));
  }
  if (step.id === 'apogee-1811' || step.id === 'moscou-1812') {
    const danemark = u(
      c.country('^Denmark$', 'EUROPE'),
      c.country('^Germany$', 'HOLSTEIN_SCHLESWIG'),
      step.id === 'apogee-1811' ? c.country('^Norway$', 'EUROPE') : null,
    );
    add('Danemark-Norvège', 'allied', danemark);
    const autriche = c.inter(c.snap(S1815, '^Austrian Empire$'), c.region('EUROPE'));
    add('Autriche', 'allied', autriche);
    const prusse = c.diff(
      u(c.inter(c.snap(S1815, '^Prussia$'), c.region('PRUSSE_EST')), c.country('^Germany$', 'PRUSSE_ORIENTALE')),
      c.region('POMERANIE_SUEDOISE'),
    );
    add('Prusse', 'allied', prusse);
  }
  return out;
}

const P = (name: string, pt: Position, where: Checkpoint['where'], from?: string, to?: string): Checkpoint => ({ name, pt, where, from, to });
const CHECKS: Checkpoint[] = [
  P('Paris', [2.3522, 48.8566], 'core'),
  P('Bruxelles', [4.3517, 50.8503], 'core', 'brumaire-1799', 'leipzig-1813'),
  P('Bruxelles (1814-15)', [4.3517, 50.8503], 'not-core', 'abdication-1814'),
  P('Cologne', [6.9603, 50.9375], 'core', 'brumaire-1799', 'leipzig-1813'),
  P('Cologne (1814-15)', [6.9603, 50.9375], 'not-core', 'abdication-1814'),
  P('Turin', [7.6869, 45.0703], 'core', 'amiens-1802', 'leipzig-1813'),
  P('Gênes', [8.9463, 44.4056], 'core', 'trafalgar-1805', 'leipzig-1813'),
  P('Florence', [11.2558, 43.7696], 'core', 'espagne-1808', 'leipzig-1813'),
  P('Rome', [12.4964, 41.9028], 'core', 'wagram-1809', 'leipzig-1813'),
  P('Amsterdam', [4.9041, 52.3676], 'core', 'apogee-1811', 'leipzig-1813'),
  P('Hambourg', [9.9937, 53.5511], 'core', 'apogee-1811', 'leipzig-1813'),
  P('Ljubljana', [14.5058, 46.0569], 'core', 'wagram-1809', 'leipzig-1813'),
  P('Barcelone', [2.1734, 41.3851], 'core', 'moscou-1812', 'leipzig-1813'),
  P('Milan', [9.19, 45.4642], 'vassal', 'marengo-1800', 'leipzig-1813'),
  P('Naples', [14.2681, 40.8518], 'vassal', 'confederation-rhin-1806', 'leipzig-1813'),
  P('Varsovie', [21.0122, 52.2297], 'vassal', 'tilsit-1807', 'leipzig-1813'),
  P('Kassel', [9.4797, 51.3127], 'vassal', 'tilsit-1807', 'leipzig-1813'),
  P('Madrid', [-3.7038, 40.4168], 'vassal', 'espagne-1808', 'leipzig-1813'),
  P('La Haye', [4.3007, 52.0705], 'vassal', 'brumaire-1799', 'wagram-1809'),
  P('Berne', [7.4474, 46.948], 'vassal', 'brumaire-1799', 'leipzig-1813'),
  P('Munich', [11.582, 48.1351], 'vassal', 'confederation-rhin-1806', 'wagram-1809'),
];

export const napoleon: EmpireConfig = {
  id: 'napoleon',
  steps: STEPS,
  defaultEntity: 'Empire français',
  compose,
  checkpoints: CHECKS,
};
