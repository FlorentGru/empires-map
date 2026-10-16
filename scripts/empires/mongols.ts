// Configuration « Empire mongol » (1206-1368) : 35 étapes, une Feature PAR ENTITÉ.
// Empire uni (`core`) jusqu'en 1259 (avec l'ulus de Djötchi, futur Horde d'or, distinct dès 1237) puis, après 1260,
// CHAQUE khanat en `core` (Yuan, Horde d'or, Ilkhanat, Djaghataï, Qaïdu), comme les royaumes rivaux de la Chine ;
// tributaires en `vassal` (Xia occidentaux, Qocho, Goryeo, principautés russes, Roum, Géorgie, Cilicie, Tibet…).
//
// Choix cartographique : COMPOSITION, pas de filtrage d'instantané. Les instantanés historical-basemaps proches
// (world_1200 : « Mongol Empire » = Mongolie de 1200 seulement ; world_1279/1300 : « Great Khanate », « Khanate of the
// Golden Horde », « Ilkhanate », « Chagatai Khanate » ; world_1400 : « Blue Horde », « White Horde »…) sont des blocs
// très généralisés et ne suivent pas l'expansion étape par étape (1206-1260). On compose donc à partir des pays
// Natural Earth 1:50m et de blocs nommés (overrides/mongols/_regions.geojson : régions chinoises reprises de
// overrides/china + rectangles pour les Rus', l'Anatolie, le Kazakhstan, l'Afghanistan…). Frontières approximatives,
// à l'échelle de la décennie, pas de la commune.
import type { Checkpoint, ComposedEntity, EmpireConfig, EmpireStep, GeoCtx, Poly, Status } from './types.ts';

const STEP_LIST: [string, number][] = [
  ['kurultai-1206', 1206], ['xixia-1209', 1209], ['yehuling-1211', 1211], ['zhongdu-1215', 1215],
  ['karakitai-1218', 1218], ['otrar-1219', 1219], ['samarcande-1220', 1220], ['indus-1221', 1221],
  ['kalka-1223', 1223], ['gengis-1227', 1227], ['ogodei-1229', 1229], ['kaifeng-1234', 1234],
  ['riazan-1237', 1237], ['kiev-1240', 1240], ['legnica-mohi-1241', 1241], ['retrait-1242', 1242],
  ['kosedag-1243', 1243], ['guyuk-1246', 1246], ['mongke-1251', 1251], ['alamut-1256', 1256],
  ['bagdad-1258', 1258], ['diaoyu-1259', 1259], ['aindjalout-1260', 1260], ['eclatement-1262', 1262],
  ['yuan-1271', 1271], ['xiangyang-1273', 1273], ['yamen-1279', 1279], ['japon-1281', 1281],
  ['bachdang-1288', 1288], ['ghazan-1295', 1295], ['paix-1304', 1304], ['ilkhanat-1335', 1335],
  ['kaffa-1346', 1346], ['turbans-rouges-1351', 1351], ['dadu-1368', 1368],
];
const STEPS: EmpireStep[] = STEP_LIST.map(([id, year]) => ({ id, year, compose: true }));

const cache = new WeakMap<GeoCtx, ReturnType<typeof makeBlocks>>();

function makeBlocks(c: GeoCtx) {
  const u = c.union;
  const memo = new Map<string, Poly | null>();
  const once = (k: string, f: () => Poly | null) => {
    if (!memo.has(k)) memo.set(k, f());
    return memo.get(k) ?? null;
  };
  const CN = () => once('CN', () => c.country('^China$'));
  const P = (name: string) => once(`P|${name}`, () => c.inter(CN(), c.region(name)));
  const K = (re: string, reg?: string) => once(`K|${re}|${reg ?? ''}`, () => c.country(re, reg));
  const cp = () => P('CP');
  const hexi = () => once('hexi', () => u(P('HEXI_E'), P('HEXI_W')));
  const northCn = () => once('northCn', () => c.inter(u(cp(), hexi()), c.region('NORTH_BIG')));
  const imAll = () => once('imAll', () => u(P('IM_NORTH'), P('XIONGNU_S')));
  const kz = () => K('^Kazakhstan$');
  const kzW = () => K('^Kazakhstan$', 'KZ_WEST');
  const kzSE = () => K('^Kazakhstan$', 'KZ_SE');
  const kzNE = () => once('kzNE', () => c.diff(kz(), kzW(), kzSE()));
  const ukr = () => K('^Ukraine$');
  const rusVlad = () => K('^Russia$', 'RU_VLADIMIR');
  const rusRiaz = () => K('^Russia$', 'RU_RIAZAN');
  const ukKiev = () => K('^Ukraine$', 'UA_KIEV');
  const ukGal = () => K('^Ukraine$', 'UA_GALICIA');
  const hordeBase = () =>
    once('hordeBase', () =>
      u(c.diff(ukr(), ukKiev(), ukGal()), K('^Russia$', 'RU_STEPPE'), K('^Russia$', 'RU_BULGAR'), K('^Russia$', 'RU_CRIMEA'), kzW()),
    );
  const afN = () => K('^Afghanistan$', 'AFG_N');
  const afW = () => K('^Afghanistan$', 'AFG_W');
  const afE = () => K('^Afghanistan$', 'AFG_E');
  const trRoum = () => once('trRoum', () => c.diff(K('^Turkey$', 'TR_ROUM'), K('^Turkey$', 'TR_CILICIA'), K('^Turkey$', 'TR_TREBIZOND')));
  return { u, P, K, CN, cp, hexi, northCn, imAll, kz, kzW, kzSE, kzNE, ukr, rusVlad, rusRiaz, ukKiev, ukGal, hordeBase, afN, afW, afE, trRoum };
}

const inY = (y: number, a: number, b = 9999) => y >= a && y <= b;

function compose(step: EmpireStep, c: GeoCtx): ComposedEntity[] {
  let B = cache.get(c);
  if (!B) {
    B = makeBlocks(c);
    cache.set(c, B);
  }
  const { u, P, K, CN, cp, hexi, northCn, imAll, kz, kzW, kzSE, kzNE, rusVlad, rusRiaz, ukKiev, ukGal, hordeBase, afN, afW, afE, trRoum } = B;
  const d = c.diff;
  const y = step.year;
  const out: ComposedEntity[] = [];
  const add = (name: string, status: Status, geom: Poly | null) => {
    if (!geom) throw new Error(`mongols.ts : géométrie vide « ${name} » à l'étape ${step.id}`);
    out.push({ name, status, geom });
  };
  const prior = () => out.map((e) => e.geom);
  const core = (name: string, g: Poly | null) => add(name, 'core', d(g, ...prior()));
  const vassal = (name: string, g: Poly | null) => add(name, 'vassal', d(g, ...prior()));

  const mn = () => K('^Mongolia$');
  const goryeo = () => u(K('^North Korea$'), K('^South Korea$'));
  const hk = () => K('^Hong Kong');
  const sichuan = () => c.inter(cp(), c.region('SHU_BLOCK'));
  const tibet = () => P('TIBET_PLATEAU');
  const ilkhanBase = () => u(K('^Iran$'), K('^Iraq$'), K('^Azerbaijan$'), K('^Armenia$'), K('^Turkmenistan$'), afW());

  /* ---------- vassaux et tributaires (prioritaires sur les entités core) ---------- */
  if (inY(y, 1209, 1226)) vassal('Xia occidentaux (Tangoutes)', P('XIA_BLOCK'));
  if (inY(y, 1209, 1229)) vassal('Ouïghours de Qocho', P('TURFAN'));
  if (inY(y, 1211, 1220)) vassal('Karlouks d’Almaliq', u(c.inter(CN(), c.region('ALMALIQ')), K('^Kazakhstan$', 'ALMALIQ')));
  if (inY(y, 1215, 1229)) vassal('Xia orientaux (Puxian Wannu)', P('MANCHURIA'));
  if (inY(y, 1219, 1351)) vassal('Goryeo (Corée)', goryeo());
  if (inY(y, 1251, 1351)) vassal('Tibet', tibet());
  if ([1258, 1259, 1273, 1279, 1281].includes(y)) vassal('Dai Viet (tributaire)', K('^Vietnam$'));
  if (y === 1288) vassal('Haute-Birmanie (tributaire)', K('^Myanmar$', 'MYANMAR_N'));
  if (y === 1237) vassal('Principautés russes (Riazan)', rusRiaz());
  if (y >= 1240) {
    const rus = u(rusVlad(), rusRiaz(), ukKiev(), y >= 1246 ? ukGal() : null);
    vassal('Principautés russes (tributaires)', rus);
  }
  if ([1262, 1271, 1304, 1335, 1346].includes(y)) vassal('Novgorod (tributaire)', K('^Russia$', 'RU_NOVGOROD'));
  if (inY(y, 1240, 1304)) vassal('Géorgie', K('^Georgia$'));
  if (inY(y, 1243, 1271)) {
    if ([1243, 1246, 1251, 1256, 1258, 1259, 1260, 1262, 1271].includes(y)) vassal('Empire de Trébizonde', K('^Turkey$', 'TR_TREBIZOND'));
  }
  if (inY(y, 1243, 1288)) vassal('Seldjoukides de Roum', trRoum());
  if (inY(y, 1295, 1304)) vassal('Anatolie (Roum et émirats turcs)', trRoum());
  if (inY(y, 1246, 1304)) vassal('Petite-Arménie (Cilicie)', K('^Turkey$', 'TR_CILICIA'));
  if (inY(y, 1243, 1259)) vassal('Mossoul', K('^Iraq$', 'IQ_MOSUL'));

  /* ---------- empire uni : 1206-1259 ---------- */
  if (y < 1260) {
    const parts: (Poly | null)[] = [mn(), K('^Russia$', 'RU_TRANSBAIKAL'), P('IM_CENTRAL')];
    if (y >= 1209) parts.push(K('^Russia$', 'RU_SAYAN'));
    if (y >= 1211) parts.push(imAll());
    if (y >= 1215) parts.push(P('HEBEI'), P('SHANXI_N'));
    if (y >= 1218) parts.push(kzSE(), K('^Kyrgyzstan$'), P('TARIM'));
    if (y >= 1220) parts.push(K('^Uzbekistan$'), K('^Tajikistan$'));
    if (y >= 1221) parts.push(K('^Turkmenistan$'), K('^Iran$', 'IR_KHORASAN'), afN());
    if (y >= 1227) parts.push(kz(), P('XIA_BLOCK'), hexi(), P('DZUNGARIA'), P('SHANDONG_N'), P('ORDOS'));
    if (y >= 1229) parts.push(c.diff(P('SHANXI'), c.region('ZHONGYUAN')));
    if (y >= 1234) parts.push(northCn(), P('MANCHURIA'), K('^Iran$'), K('^Azerbaijan$'));
    if (y >= 1237) parts.push(K('^Armenia$'));
    if (y >= 1243) parts.push(K('^Turkey$', 'TR_EAST'));
    if (y >= 1256) parts.push(P('YUNNAN'));
    if (y >= 1258) parts.push(K('^Iraq$'));
    if (y >= 1259) parts.push(c.inter(CN(), c.region('SICHUAN_N')));
    let g = u(...parts);
    if (y >= 1237) {
      // ulus de Djötchi : Horde d'or naissante, distincte de l'empire dès l'invasion de la Rus'.
      const horde = u(hordeBase(), y >= 1242 ? K('^Moldova$') : null, y >= 1242 ? K('^Romania$', 'RO_EAST') : null);
      g = d(g, horde);
      core('Empire mongol', g);
      core('Horde d’or', horde);
    } else {
      core('Empire mongol', g);
    }
    return out;
  }

  /* ---------- khanats : 1260-1368 ---------- */
  // Yuan
  let yuan: Poly | null;
  if (y <= 1262) {
    yuan = u(northCn(), P('MANCHURIA'), imAll(), P('YUNNAN'), c.inter(CN(), c.region('SICHUAN_N')));
    core('Mongolie d’Ariq Böke', mn());
  } else if (y === 1271) {
    yuan = u(mn(), northCn(), P('MANCHURIA'), imAll(), sichuan());
  } else if (y === 1273) {
    yuan = u(mn(), northCn(), P('MANCHURIA'), imAll(), sichuan(), c.inter(cp(), c.region('HUBEI_N')));
  } else if (y <= 1346) {
    yuan = u(mn(), imAll(), cp(), hexi(), hk(), P('MANCHURIA'), y >= 1304 ? P('DZUNGARIA_E') : null);
  } else if (y === 1351) {
    yuan = u(mn(), imAll(), P('MANCHURIA'), d(northCn(), c.region('HUAI')), sichuan());
  } else {
    yuan = u(mn(), imAll(), P('MANCHURIA'), P('YUNNAN'));
  }
  core(y === 1368 ? 'Yuan du Nord' : 'Empire Yuan', yuan);

  // Horde d'or
  const horde = u(
    hordeBase(),
    K('^Moldova$'),
    K('^Romania$', 'RO_EAST'),
    y >= 1335 ? c.inter(u(K('^Uzbekistan$'), K('^Turkmenistan$')), c.region('KHW_N')) : null,
    y === 1346 || y === 1351 ? K('^Azerbaijan$', 'AZ_N') : null,
  );
  core('Horde d’or', horde);

  // Ilkhanat (1260-1335)
  if (y <= 1335) core('Ilkhanat', u(ilkhanBase(), y < 1335 ? K('^Turkey$', 'TR_EAST') : null));

  // Djaghataï
  if (y <= 1335) {
    const fer = u(K('^Uzbekistan$'), K('^Tajikistan$'), K('^Kyrgyzstan$'), kzSE(), afE());
    let ch: Poly | null;
    if (y < 1304) ch = u(fer, P('TARIM'));
    else if (y === 1304) ch = u(fer, kzNE(), P('TARIM'), d(P('DZUNGARIA'), P('DZUNGARIA_E')));
    else ch = u(fer, kzNE(), P('TARIM'), P('TURFAN'), P('DZUNGARIA'));
    core('Khanat de Djaghataï', ch);
  } else {
    core('Khanat de Djaghataï (Transoxiane)', u(K('^Uzbekistan$'), K('^Tajikistan$'), afE(), afN()));
    core('Mogholistan', u(K('^Kyrgyzstan$'), kzSE(), kzNE(), P('TARIM'), P('TURFAN'), P('DZUNGARIA')));
  }

  // Khanat de Qaïdu (apanage ögödeïde, 1260-1301)
  if (y <= 1295) core('Khanat de Qaïdu (Ögödeïdes)', u(P('DZUNGARIA'), kzNE()));

  return out;
}

const P = (name: string, pt: [number, number], where: Checkpoint['where'], from?: string, to?: string): Checkpoint => ({ name, pt, where, from, to });
const CHECKS: Checkpoint[] = [
  P('Karakorum', [102.84, 47.2], 'core', 'samarcande-1220', 'turbans-rouges-1351'),
  P('Zhongdu / Pékin', [116.4, 39.9], 'core', 'zhongdu-1215', 'turbans-rouges-1351'),
  P('Pékin hors 1368', [116.4, 39.9], 'not-core', 'dadu-1368'),
  P('Pékin hors 1206-1211', [116.4, 39.9], 'not-core', 'kurultai-1206', 'yehuling-1211'),
  P('Kaifeng', [114.31, 34.8], 'core', 'kaifeng-1234', 'turbans-rouges-1351'),
  P('Kaifeng hors 1229', [114.31, 34.8], 'not-core', 'kurultai-1206', 'ogodei-1229'),
  P('Hangzhou (Song)', [120.16, 30.27], 'not-core', 'kurultai-1206', 'xiangyang-1273'),
  P('Hangzhou (Yuan)', [120.16, 30.27], 'core', 'yamen-1279', 'ilkhanat-1335'),
  P('Hangzhou hors 1351', [120.16, 30.27], 'not-core', 'turbans-rouges-1351'),
  P('Samarcande', [66.97, 39.65], 'core', 'samarcande-1220', 'turbans-rouges-1351'),
  P('Samarcande hors avant 1220', [66.97, 39.65], 'not-core', 'kurultai-1206', 'otrar-1219'),
  P('Boukhara', [64.42, 39.77], 'core', 'samarcande-1220', 'turbans-rouges-1351'),
  P('Bagdad', [44.37, 33.31], 'core', 'bagdad-1258', 'ilkhanat-1335'),
  P('Bagdad hors avant 1258', [44.37, 33.31], 'not-core', 'kurultai-1206', 'alamut-1256'),
  P('Tabriz', [46.29, 38.08], 'core', 'kaifeng-1234', 'ilkhanat-1335'),
  P('Kiev', [30.52, 50.45], 'vassal', 'kiev-1240', 'dadu-1368'),
  P('Moscou', [37.62, 55.75], 'vassal', 'kiev-1240', 'dadu-1368'),
  P('Sarai', [46.1, 48.4], 'core', 'eclatement-1262', 'dadu-1368'),
  P('Le Caire', [31.24, 30.04], 'not-core'),
  P('Damas', [36.3, 33.5], 'not-core'),
  P('Delhi', [77.21, 28.61], 'not-core'),
  P('Kyoto', [135.77, 35.01], 'not-core'),
  P('Hanoï', [105.85, 21.03], 'not-core'),
  P('Séoul', [126.98, 37.57], 'vassal', 'otrar-1219', 'turbans-rouges-1351'),
  P('Kaesong', [126.55, 37.97], 'vassal', 'otrar-1219', 'turbans-rouges-1351'),
  P('Séoul hors 1368', [126.98, 37.57], 'not-core', 'dadu-1368'),
  P('Lhassa', [91.11, 29.65], 'vassal', 'mongke-1251', 'turbans-rouges-1351'),
  P('Lhassa hors 1368', [91.11, 29.65], 'not-core', 'dadu-1368'),
  P('Konya', [32.48, 37.87], 'vassal', 'kosedag-1243', 'paix-1304'),
  P('Konya hors avant 1243', [32.48, 37.87], 'not-core', 'kurultai-1206', 'retrait-1242'),
];

export const mongols: EmpireConfig = {
  id: 'mongols',
  steps: STEPS,
  defaultEntity: 'Empire mongol',
  compose,
  checkpoints: CHECKS,
};
