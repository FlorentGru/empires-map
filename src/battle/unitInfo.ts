/**
 * Galerie « Unités de bataille » : montures, engins et formations du moteur (src/battle/), avec leur fiche
 * et la petite scène (un BattleScenario construit en code) qui les montre animées avec le vrai moteur.
 */
import type { Faction } from '../types';
import type { BattleAction, BattleBiome, BattleFormation, BattlePoint, BattleScenario, BattleUnitKind } from '../types-battle';
import { norm } from '../figures/svgUtils';
import type { ShipType } from './weapons';

/** Ce qui rattache une unité de la galerie aux unités des scénarios. */
export interface UnitMatch {
  kind?: BattleUnitKind;
  formation?: BattleFormation;
  /** Manœuvre : une phase où une unité fait cette action. */
  action?: BattleAction;
  /** Type de navire (celui du scénario, sinon celui du peuple ou de l'époque : `shipOf`). */
  ship?: ShipType;
  /** Bornes d'année de l'étape. */
  yearMin?: number;
  yearMax?: number;
}

/** Déroulement de la mini-scène : marche puis combat, ou marche, fausse fuite, retour. */
export interface SceneSpec {
  faction: Faction;
  kind: BattleUnitKind;
  formation: BattleFormation;
  /** Nombre de figurines (1 figurine = 100 hommes). */
  figures: number;
  biome: BattleBiome;
  /** Année, qui décide galères ou vaisseaux quand `ship` n'est pas donné. */
  year: number;
  /** Navire dessiné (unités `navires`). */
  ship?: ShipType;
  plan?: 'avance' | 'feinte';
  /** Action du combat (défaut du moteur : tir pour les unités à distance, sinon mêlée). */
  action?: BattleAction;
}

export interface UnitInfo {
  id: string;
  group: 'montures' | 'formations';
  label: string;
  era: string;
  text: string;
  match: UnitMatch;
  scene: SceneSpec;
}

/** Hommes représentés par une figurine dans les mini-scènes. */
export const SCENE_SCALE = 100;
const UNIT_ID = 'u';
const START: BattlePoint = [34, 30];
const MID: BattlePoint = [48, 30];

/** Scénario d'une mini-scène : une seule unité de l'armée 0 (qui regarde vers la droite). */
export function sceneScenario(s: SceneSpec): BattleScenario {
  const sea = s.kind === 'navires' || s.kind === 'brulots';
  const unit = { id: UNIT_ID, army: 0, kind: s.kind, troops: s.figures * SCENE_SCALE, at: START, formation: s.formation, ship: s.ship };
  const phases =
    s.plan === 'feinte'
      ? [
          { label: 'Approche', duration: 2.5, moves: { [UNIT_ID]: { to: MID, state: 'marche' as const } } },
          {
            label: 'Fausse fuite',
            duration: 3,
            moves: { [UNIT_ID]: { to: [START[0] - 4, 30] as BattlePoint, state: 'combat' as const, action: 'feinte' as const } },
          },
          { label: 'Retour', duration: 3, moves: { [UNIT_ID]: { to: [MID[0] + 4, 30] as BattlePoint, state: 'combat' as const, action: 'feu' as const } } },
        ]
      : [
          { label: 'Marche', duration: 3, moves: { [UNIT_ID]: { to: MID, state: 'marche' as const } } },
          { label: 'Combat', duration: 3.5, moves: { [UNIT_ID]: { to: [MID[0] + 3, 30] as BattlePoint, state: 'combat' as const, action: s.action } } },
        ];
  return { terrain: sea ? 'mer' : 'plaine', units: [unit], phases };
}

const mount = (id: string, label: string, era: string, text: string, match: UnitMatch, scene: SceneSpec): UnitInfo => ({
  id,
  group: 'montures',
  label,
  era,
  text,
  match,
  scene,
});
const formation = (id: string, label: string, era: string, text: string, match: UnitMatch, scene: SceneSpec): UnitInfo => ({
  id,
  group: 'formations',
  label,
  era,
  text,
  match,
  scene,
});

export const BATTLE_UNITS: UnitInfo[] = [
  mount(
    'cavalerie',
    'Cavalerie',
    'Antiquité – XIXe siècle',
    "Cavaliers sur chevaux, arme de choc et de poursuite. Rapide, elle déborde les ailes, prend une ligne à revers et achève une armée qui plie. Elle est en revanche impuissante contre une infanterie bien serrée et hérissée de piques ou de baïonnettes, et son entretien coûte cher. Les Compagnons d'Alexandre à Gaugamèles, la cavalerie numide à Zama ou les cuirassiers français à Waterloo en sont des exemples.",
    { kind: 'cavalerie' },
    { faction: 'grecs-macedoniens', kind: 'cavalerie', formation: 'ligne', figures: 9, biome: 'prairie', year: -331 },
  ),
  mount(
    'archers-montes',
    'Archers montés',
    'Antiquité – XIIIe siècle',
    "Cavaliers de la steppe qui tirent à l'arc composite en plein galop, y compris en se repliant (le « tir parthe »). Ils harcèlent l'ennemi sans se laisser joindre, épuisent ses réserves de flèches et de patience, puis chargent quand il se disloque. Leur faiblesse : les munitions limitées et la fragilité au corps à corps. Scythes, Parthes, Huns, Turcs et surtout Mongols ont ainsi vaincu des armées bien plus lourdes.",
    { kind: 'archers-montes' },
    { faction: 'mongols', kind: 'archers-montes', formation: 'ligne', figures: 9, biome: 'steppe', year: 1260 },
  ),
  mount(
    'elephants',
    'Éléphants de guerre',
    'Antiquité',
    "Venus d'Inde, portant une tour d'archers et guidés par un cornac, ils servaient de chars d'assaut de l'Antiquité : ils effraient les chevaux, écrasent les rangs et impressionnent l'ennemi. Mais ils prennent peur sous les javelots, se retournent alors sur leurs propres lignes et finissent par être contournés. Alexandre en affronte à Gaugamèles puis à l'Hydaspe, et Scipion ouvre des couloirs dans ses rangs pour les laisser passer à Zama.",
    { kind: 'elephants' },
    { faction: 'indiens', kind: 'elephants', formation: 'ligne', figures: 3, biome: 'desert', year: -326 },
  ),
  mount(
    'chars',
    'Chars à faux',
    'Antiquité',
    "Chars attelés dont les roues et le timon portent des faux, lancés contre l'infanterie pour y ouvrir des brèches. Ils exigent un sol plat et dégagé, et deviennent inutiles dès que l'adversaire s'écarte, les harcèle de javelots ou profite d'un terrain boueux. À Gaugamèles, Darius III compte sur eux contre Alexandre, dont les troupes légères les neutralisent.",
    { kind: 'chars' },
    { faction: 'parthes-perses', kind: 'chars', formation: 'ligne', figures: 3, biome: 'desert', year: -331 },
  ),
  mount(
    'artillerie',
    'Artillerie',
    'XVe – XIXe siècle',
    "Canons tirant boulets à longue portée, puis mitraille (balles en grappe) à courte distance. Ils éclaircissent les formations denses avant l'assaut, mais sont lourds, lents à déplacer et vulnérables si l'infanterie ou la cavalerie ennemie les atteint. Napoléon concentre ses pièces en « grandes batteries » pour percer un point précis de la ligne, à Austerlitz comme à Waterloo.",
    { kind: 'artillerie' },
    { faction: 'francais', kind: 'artillerie', formation: 'ligne', figures: 3, biome: 'prairie', year: 1805 },
  ),
  mount(
    'galeres',
    'Galères',
    'Antiquité – XVIe siècle',
    "Navires longs et bas, mus par des rames, armés d'un éperon à la proue puis de canons dans l'axe. Elles manœuvrent sans vent, mais tiennent mal la haute mer. Le combat se joue à l'éperonnage et à l'abordage : des fantassins embarqués y donnent l'assaut sur le pont voisin. À Lépante (1571), des centaines de galères s'affrontent encore, avec les puissantes galéasses vénitiennes.",
    { kind: 'navires', ship: 'galere' },
    { faction: 'espagnols', kind: 'navires', formation: 'ligne', figures: 8, biome: 'mer', year: 1571, ship: 'galere' },
  ),
  mount(
    'vaisseaux',
    'Vaisseaux',
    'XVIIe – XIXe siècle',
    "Grands navires à voiles carrées, portant leurs canons sur plusieurs ponts. Ils combattent en ligne de file, bordée contre bordée, et tout dépend du vent, de la manœuvre et de la cadence de tir. Le vaisseau de ligne est l'arme maîtresse des marines européennes jusqu'à l'apparition de la vapeur, comme à Trafalgar (1805).",
    { kind: 'navires', ship: 'vaisseau' },
    { faction: 'britanniques', kind: 'navires', formation: 'ligne', figures: 8, biome: 'mer', year: 1805, ship: 'vaisseau' },
  ),
  mount(
    'galions',
    'Galions',
    'XVIe – XVIIe siècle',
    "Grands voiliers à trois mâts, hauts sur l'eau, avec un château arrière élevé et deux rangs de sabords pour les canons. Ils transportent à la fois canons, soldats et cargaison, et dominent l'Atlantique après la découverte du Nouveau Monde. Leur coque haute les rend peu maniables au près et très sensibles au vent. L'Invincible Armada de Philippe II, en 1588, aligne des dizaines de galions, mais les navires anglais, plus rapides et plus maniables, tirent de loin et la tempête achève de la disperser.",
    { kind: 'navires', ship: 'galion' },
    { faction: 'espagnols', kind: 'navires', formation: 'ligne', figures: 8, biome: 'mer', year: 1588, ship: 'galion' },
  ),
  mount(
    'jonques',
    'Jonques',
    'Antiquité – XVe siècle',
    "Navires d'Asie orientale à fond plat, dont la coque est divisée en compartiments étanches et dont les voiles sont renforcées de lattes de bambou, qui se manœuvrent facilement et permettent de remonter au vent. Les flottes chinoises, coréennes et japonaises les arment d'archers, de lanceurs de projectiles incendiaires et de combattants à l'abordage. Les expéditions mongoles contre le Japon, en 1274 et en 1281, reposent sur des flottes de jonques construites par des chantiers chinois et coréens.",
    { kind: 'navires', ship: 'jonque' },
    { faction: 'chinois', kind: 'navires', formation: 'ligne', figures: 8, biome: 'mer', year: 1281, ship: 'jonque' },
  ),
  mount(
    'barques',
    'Barques',
    'Antiquité – XIXe siècle',
    'Petites embarcations à rames, légères et rapides, qui embarquent une poignée de combattants. Faciles à construire, elles se glissent dans les fleuves, les marais et les estuaires où les grands navires ne passent pas. Les flottilles vietnamiennes les utilisent à Bach Dang, en 938 et en 1288, pour attirer la flotte ennemie au-dessus de pieux plantés dans le lit du fleuve, que la marée descendante découvre.',
    { kind: 'navires', ship: 'barque' },
    { faction: 'vietnamiens', kind: 'navires', formation: 'ligne', figures: 8, biome: 'mer', year: 1288, ship: 'barque' },
  ),
  mount(
    'brulots',
    'Brûlots',
    'Antiquité – XIXe siècle',
    "Navires chargés de paille, d'huile et de matières inflammables, lancés contre la flotte ennemie pour y mettre le feu. Efficaces contre des vaisseaux serrés les uns contre les autres, ils reposent sur la surprise et sur le vent. À Chibi (208), Huang Gai les mène sous une fausse reddition contre la flotte de Cao Cao, enchaînée coque à coque.",
    { kind: 'brulots' },
    { faction: 'chinois', kind: 'brulots', formation: 'ligne', figures: 5, biome: 'mer', year: 208 },
  ),

  formation(
    'ligne',
    'Ligne',
    'Antiquité – XIXe siècle',
    "Ordre large et peu profond (deux à quatre rangs) : tous les combattants, ou tous les fusils, servent en même temps. Elle maximise le feu et déborde l'ennemi, mais se rompt facilement si on la perce, et ne résiste pas à une charge de cavalerie sur ses flancs. C'est l'ordre normal des armées à fusil du XVIIIe siècle.",
    { formation: 'ligne' },
    { faction: 'autrichiens', kind: 'infanterie', formation: 'ligne', figures: 16, biome: 'prairie', year: 1805 },
  ),
  formation(
    'mince',
    'Ligne mince',
    'XVIIIe – XIXe siècle',
    "Ligne sur seulement deux rangs, celle de l'infanterie britannique de Wellington. Elle déploie un maximum de fusils sur un front long, et se tient à l'abri derrière une crête pour éviter l'artillerie. Sa minceur la rend fragile : il faut une troupe très disciplinée, et des carrés prêts à se former contre la cavalerie, comme à Waterloo.",
    { formation: 'mince' },
    { faction: 'britanniques', kind: 'infanterie', formation: 'mince', figures: 16, biome: 'prairie', year: 1815 },
  ),
  formation(
    'colonne',
    'Colonne',
    'XVIIIe – XIXe siècle',
    "Bloc étroit et profond, avec un front d'une ou deux compagnies. Elle se déplace vite et en bon ordre, et enfonce une ligne par sa masse et son élan ; son feu reste faible, car seuls les premiers rangs peuvent tirer. Les armées françaises la précédaient de tirailleurs et la menaient à l'assaut, à Austerlitz comme à Waterloo, où les lignes britanniques l'ont arrêtée.",
    { formation: 'colonne' },
    { faction: 'francais', kind: 'infanterie', formation: 'colonne', figures: 20, biome: 'prairie', year: 1805, action: 'baionnette' },
  ),
  formation(
    'carre',
    'Carré',
    'XVIe – XIXe siècle',
    "Carré creux, quatre faces hérissées de baïonnettes vers l'extérieur : l'infanterie s'y met pour résister à la cavalerie. Aucun cheval n'accepte de se jeter sur cette haie, mais le carré immobile devient une cible pour le canon et la mousqueterie. À Waterloo, les carrés britanniques résistent aux charges répétées des cuirassiers de Ney.",
    { formation: 'carre' },
    { faction: 'britanniques', kind: 'infanterie', formation: 'carre', figures: 28, biome: 'prairie', year: 1815 },
  ),
  formation(
    'coin',
    'Coin',
    'Antiquité – Moyen Âge',
    "Cavaliers disposés en V, la pointe en avant. Elle perce une ligne en un point, et les rangs derrière élargissent la brèche, tout en restant maniables au galop. Philippe II de Macédoine l'aurait popularisée pour ses cavaliers. Alexandre place ainsi les Compagnons à la pointe de ses charges, à Gaugamèles et à l'Hydaspe.",
    { formation: 'coin' },
    { faction: 'grecs-macedoniens', kind: 'cavalerie', formation: 'coin', figures: 12, biome: 'prairie', year: -331 },
  ),
  formation(
    'phalange',
    'Phalange',
    'VIIe s. – IIe s. av. J.-C.',
    "Bloc profond et serré de fantassins, qui avance en gardant l'alignement. Dans sa version macédonienne, les cinq premiers rangs baissent leurs sarisses (piques de cinq à six mètres), les suivants les tiennent levées. De face, rien ne l'arrête ; sur les flancs et sur terrain accidenté, elle devient vulnérable, et la légion romaine, plus souple, finira par la battre à Pydna (168).",
    { formation: 'phalange' },
    { faction: 'grecs-macedoniens', kind: 'infanterie', formation: 'phalange', figures: 40, biome: 'desert', year: -331 },
  ),
  formation(
    'tortue',
    'Tortue',
    'Antiquité romaine',
    "Les légionnaires se serrent, les boucliers de face et des côtés alignés, ceux des rangs intérieurs levés en toit au-dessus des têtes. Elle protège des flèches et des projectiles lancés du haut des remparts, et permet d'approcher d'un mur pour le saper ou de dresser une échelle. Elle avance lentement et ne combat guère : on l'adopte pour franchir une zone battue, pas pour livrer la bataille.",
    { formation: 'tortue' },
    { faction: 'romains', kind: 'infanterie', formation: 'tortue', figures: 24, biome: 'mediterranee', year: -50 },
  ),
  formation(
    'quinconce',
    'Quinconce',
    'IVe – IIe s. av. J.-C.',
    "Disposition en damier des manipules romains sur trois lignes : hastats, princes, puis triaires. Les intervalles permettent aux troupes fraîches de relever la ligne fatiguée, ou de laisser passer les vélites et les éléphants. À Zama, Scipion y aligne ses manipules en colonnes pour ouvrir des couloirs aux éléphants d'Hannibal.",
    { formation: 'quinconce' },
    { faction: 'romains', kind: 'infanterie', formation: 'quinconce', figures: 27, biome: 'mediterranee', year: -202 },
  ),
  formation(
    'tercio',
    'Tercio',
    'XVIe – XVIIe siècle',
    "Grand carré d'infanterie espagnole : au centre, les piquiers en bloc ; aux quatre coins, des manches d'arquebusiers puis de mousquetaires. Les piques arrêtent la cavalerie et les tireurs éclaircissent l'adversaire. Le tercio domine les champs de bataille d'Europe pendant plus d'un siècle, jusqu'à Rocroi (1643), où ses derniers carrés sont encerclés par l'artillerie et la cavalerie françaises.",
    { formation: 'tercio' },
    { faction: 'tercios', kind: 'infanterie', formation: 'tercio', figures: 36, biome: 'prairie', year: 1643 },
  ),
  formation(
    'croissant',
    'Croissant',
    'Antiquité',
    "Ligne bombée vers l'ennemi. À Cannes (216 av. J.-C.), Hannibal place ainsi son centre, avec ses Gaulois et ses Ibères, devant les ailes : le centre recule en cédant sous la poussée romaine, la ligne s'incurve dans l'autre sens et les Romains, entassés, sont pris des deux côtés. Un ordre qui n'a de sens que si les troupes tiennent leur repli.",
    { formation: 'croissant' },
    { faction: 'carthaginois', kind: 'infanterie', formation: 'croissant', figures: 20, biome: 'mediterranee', year: -216 },
  ),
  formation(
    'tirailleurs',
    'Tirailleurs',
    'Antiquité – XIXe siècle',
    "Ordre dispersé, chaque soldat espacé des autres. Ces troupes légères harcèlent, couvrent l'approche d'une colonne et masquent les mouvements de l'armée. Moins exposées au tir ennemi, elles sont incapables de résister à une charge et se replient derrière les lignes. Peltastes grecs, vélites romains, voltigeurs de Napoléon en font partie.",
    { formation: 'tirailleurs' },
    { faction: 'francais', kind: 'infanterie', formation: 'tirailleurs', figures: 10, biome: 'prairie', year: 1805 },
  ),
  formation(
    'feinte',
    'Fausse fuite',
    'Antiquité – XIIIe siècle',
    "Manœuvre plutôt que formation : une troupe, souvent de cavaliers de la steppe, tourne le dos et recule comme si elle était battue, pour attirer l'ennemi hors de sa position et rompre son ordre. Quand les poursuivants s'étirent, elle fait demi-tour, ou des troupes cachées tombent sur eux. Mongols et Mamelouks l'ont pratiquée, notamment à Aïn Djalout (1260).",
    { action: 'feinte' },
    { faction: 'mongols', kind: 'archers-montes', formation: 'ligne', figures: 9, biome: 'steppe', year: 1260, plan: 'feinte' },
  ),
];

export const UNIT_BY_ID = new Map(BATTLE_UNITS.map((u) => [u.id, u]));

/** Unités dont le nom, l'époque ou le texte contient la recherche. */
export function unitsMatching(query: string): UnitInfo[] {
  const q = norm(query.trim());
  return BATTLE_UNITS.filter((u) => !q || norm(`${u.label} ${u.era} ${u.text}`).includes(q));
}
