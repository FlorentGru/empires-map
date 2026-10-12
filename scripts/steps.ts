// Étapes de la frise « Empire romain » et paramètres de construction des territoires.
// Un fichier public/data/empires/rome/territories/<id>.geojson est produit par étape.
//
// Par défaut, build-territories.ts choisit automatiquement l'instantané
// historical-basemaps le plus proche de `year` et y extrait les entités romaines.
// Les champs optionnels permettent d'affiner :
//   - snapshot : impose un instantané (ex. "world_bc200")
//   - base     : part du résultat d'une étape précédente au lieu d'un instantané
//                (utile pour les étapes reconstruites par overrides cumulatifs)
//   - entities : correspondance NAME (historical-basemaps) → nom français de la Feature ;
//                plusieurs NAME peuvent pointer vers le même nom (fusion)
// Les corrections géographiques vont dans overrides/rome/<id>.geojson.

export interface RomeStep {
  id: string;
  year: number;
  snapshot?: string;
  base?: string;
  entities?: Record<string, string>;
}

const REPUBLIQUE = { Rome: 'République romaine', 'Roman Republic': 'République romaine' };
const TETRARCHIE_FUSION = {
  'Rome (Diocletianus)': 'Empire romain',
  'Rome (Galerius)': 'Empire romain',
  'Rome (Maximian)': 'Empire romain',
  'Rome (Constantinus)': 'Empire romain',
};

export const ROME_STEPS: RomeStep[] = [
  { id: 'republique-509', year: -509, entities: REPUBLIQUE },
  { id: 'ligue-latine-338', year: -338, entities: REPUBLIQUE },
  { id: 'tarente-272', year: -272, entities: REPUBLIQUE },
  { id: 'sicile-241', year: -241, base: 'tarente-272' },
  { id: 'hannibal-218', year: -218, base: 'sicile-241' },
  { id: 'cannes-216', year: -216, base: 'hannibal-218' },
  { id: 'zama-202', year: -202, entities: REPUBLIQUE },
  { id: 'pydna-168', year: -168, entities: REPUBLIQUE },
  { id: 'carthage-146', year: -146, base: 'pydna-168' },
  { id: 'pergame-133', year: -133, base: 'carthage-146' },
  { id: 'pompee-63', year: -63, entities: REPUBLIQUE },
  { id: 'alesia-52', year: -52, base: 'pompee-63' },
  { id: 'actium-31', year: -31, base: 'alesia-52' },
  { id: 'auguste-27', year: -27, base: 'actium-31' },
  { id: 'teutobourg-9', year: 9, entities: { 'Roman Empire': 'Empire romain' } },
  { id: 'bretagne-43', year: 43, base: 'teutobourg-9' },
  { id: 'trajan-117', year: 117, entities: { 'Roman Empire': 'Empire romain' } },
  { id: 'dacie-271', year: 271, entities: TETRARCHIE_FUSION },
  {
    id: 'tetrarchie-285',
    year: 285,
    entities: {
      'Rome (Diocletianus)': 'Empire romain — part de Dioclétien',
      'Rome (Galerius)': 'Empire romain — part de Galère',
      'Rome (Maximian)': 'Empire romain — part de Maximien',
      'Rome (Constantinus)': 'Empire romain — part de Constance Chlore',
    },
  },
  { id: 'constantinople-330', year: 330, entities: TETRARCHIE_FUSION },
  {
    id: 'partage-395',
    year: 395,
    entities: {
      'Western Roman Empire': "Empire romain d'Occident",
      'Eastern Roman Empire': "Empire romain d'Orient",
    },
  },
  {
    id: 'sac-rome-410',
    year: 410,
    entities: {
      'Western Roman Empire': "Empire romain d'Occident",
      'Eastern Roman Empire': "Empire romain d'Orient",
    },
  },
  // En 500, historical-basemaps garde un « Western Roman Empire » résiduel (Bretagne) :
  // on ne retient que l'Orient.
  { id: 'chute-occident-476', year: 476, entities: { 'Eastern Roman Empire': "Empire romain d'Orient" } },
  { id: 'justinien-554', year: 554, snapshot: 'world_600', entities: { 'Eastern Roman Empire': 'Empire byzantin' } },
  { id: 'yarmouk-636', year: 636, snapshot: 'world_600', entities: { 'Eastern Roman Empire': 'Empire byzantin' } },
  { id: 'manzikert-1071', year: 1071, entities: { 'Byzantine Empire': 'Empire byzantin', Armenia: 'Empire byzantin' } },
  { id: 'croisade-1204', year: 1204, entities: { 'Byzantine Empire': 'Empire byzantin' } },
  {
    id: 'reprise-1261',
    year: 1261,
    entities: { 'Byzantine Empire': 'Empire byzantin' },
  },
  { id: 'chute-1453', year: 1453, entities: { 'Byzantine Empire': 'Empire byzantin' } },
];
