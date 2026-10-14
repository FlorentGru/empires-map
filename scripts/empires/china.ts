// Configuration « Chine » (-1250 → 1912) : 65 étapes, une Feature PAR ÉTAT (dynastie principale, royaumes
// chinois rivaux en période de division = `core`, protectorats/États soumis = `vassal`).
//
// Instantanés historical-basemaps disponibles pour l'Asie orientale (NAME utiles, vérifiés avec .cache) :
//   bc1000 Zhoa, Sinic · bc500/bc400 « Zhou states », Xiongnu, Gojoseon · bc323 Qin, Yue · bc200/bc100 Han Empire,
//   Nan-Yue, Min-Yue, Xiongnu · bc1…200 Han · 300 Jin, Han Zhao · 400 Jin, Sixteen Kingdoms · 500 Toba Wei, Jin Empire ·
//   600/700 Sui Empire, Göktürks, Tufan Empire · 800/900 Tang Empire, Tibetan Empire, Nan Chao, Uyghurs, Khitans ·
//   1000/1100/1200 Song Empire, Liao, Xixia, Tibet, Mongol Empire · 1279/1300/1400 Great Khanate · 1500/1530/1600
//   Ming Chinese Empire · 1650/1700 Manchu Empire · 1783/1800 Qing Empire · 1880/1900 Manchu Empire · 1914 Xinjiang,
//   Tibet, Mongolia.
// Ces instantanés représentent toute la Chine par UNE entité aux contours très généralisés (« Han », « Jin », « Toba
// Wei »…) : impossible d'y distinguer Wei/Shu/Wu, Song du Nord/du Sud, ni les dix royaumes. Choix : géométries
// composées par code à partir de
//   - la Chine actuelle (Natural Earth 1:50m, `China`) découpée par des blocs géographiques approximatifs
//     (overrides/china/_regions.geojson : Chine « propre » CP, ligne Qinling-Huai NORTH_BIG, bloc de Shu, Yue, Hexi,
//     Ordos, Xinjiang, Tibet…), qui garantissent des côtes et frontières modernes cohérentes d'une étape à l'autre ;
//   - les pays Natural Earth voisins (Mongolie, Corées, Vietnam, Taïwan, Hong Kong, Russie pour l'Amour).
// Les frontières intérieures sont approximatives (rectangles et lignes droites) : l'échelle est le siècle, pas la commune.
import type { Position } from 'geojson';
import type { Checkpoint, ComposedEntity, EmpireConfig, EmpireStep, GeoCtx, Poly, Status } from './types.ts';

const STEP_LIST: [string, number][] = [
  ['shang-anyang-1250', -1250],
  ['muye-1046', -1046],
  ['zhou-orientaux-770', -770],
  ['confucius-551', -551],
  ['partage-jin-403', -403],
  ['shang-yang-356', -356],
  ['changping-260', -260],
  ['unification-qin-221', -221],
  ['grande-muraille-214', -214],
  ['gaixia-202', -202],
  ['zhang-qian-138', -138],
  ['mobei-119', -119],
  ['wang-mang-9', 9],
  ['ban-chao-97', 97],
  ['turbans-jaunes-184', 184],
  ['chibi-208', 208],
  ['trois-royaumes-220', 220],
  ['jin-reunifies-280', 280],
  ['cinq-barbares-311', 311],
  ['feishui-383', 383],
  ['wei-nord-439', 439],
  ['xiaowen-494', 494],
  ['sui-reunifient-589', 589],
  ['grand-canal-605', 605],
  ['salsu-612', 612],
  ['tang-618', 618],
  ['taizong-630', 630],
  ['xuanzang-645', 645],
  ['wu-zetian-690', 690],
  ['talas-751', 751],
  ['an-lushan-755', 755],
  ['fin-tang-907', 907],
  ['cinq-dynasties-936', 936],
  ['song-960', 960],
  ['shanyuan-1005', 1005],
  ['xia-occidentaux-1038', 1038],
  ['wang-anshi-1069', 1069],
  ['jingkang-1127', 1127],
  ['shaoxing-1142', 1142],
  ['zhongdu-1215', 1215],
  ['xiangyang-1268', 1268],
  ['yuan-1271', 1271],
  ['marco-polo-1275', 1275],
  ['yamen-1279', 1279],
  ['mongols-japon-1281', 1281],
  ['ming-1368', 1368],
  ['zheng-he-1405', 1405],
  ['yongle-1421', 1421],
  ['tumu-1449', 1449],
  ['muraille-ming-1550', 1550],
  ['imjin-1592', 1592],
  ['sarhu-1619', 1619],
  ['shanhaiguan-1644', 1644],
  ['taiwan-1683', 1683],
  ['nertchinsk-1689', 1689],
  ['xinjiang-1759', 1759],
  ['macartney-1793', 1793],
  ['opium-1839', 1839],
  ['nankin-1842', 1842],
  ['taiping-1853', 1853],
  ['palais-ete-1860', 1860],
  ['cixi-1861', 1861],
  ['sino-japonaise-1895', 1895],
  ['boxers-1900', 1900],
  ['xinhai-1912', 1912],
];
const STEPS: EmpireStep[] = STEP_LIST.map(([id, year]) => ({ id, year, compose: true }));

function makeBlocks(c: GeoCtx) {
  const u = c.union;
  const memo = new Map<string, Poly | null>();
  const once = (k: string, f: () => Poly | null) => {
    if (!memo.has(k)) memo.set(k, f());
    return memo.get(k) ?? null;
  };
  const CN = () => once('CN', () => c.country('^China$'));
  /** Bloc nommé ∩ Chine actuelle. */
  const P = (name: string) => once(`P|${name}`, () => c.inter(CN(), c.region(name)));
  /** Bloc nommé ∩ pays étranger. */
  const F = (country: string, name: string) => once(`F|${country}|${name}`, () => c.inter(c.country(country), c.region(name)));
  const hk = () => once('hk', () => c.country('^Hong Kong'));
  const tw = () => once('tw', () => c.country('^Taiwan$'));
  const mn = () => once('mn', () => c.country('^Mongolia$'));
  const nk = () => once('nk', () => c.country('^North Korea$'));
  const sk = () => once('sk', () => c.country('^South Korea$'));
  const vnN = () => F('^Vietnam$', 'NVIETNAM');
  const lelang = () => F('^North Korea$', 'LELANG');
  const nkSud = () => F('^North Korea$', 'NK_SOUTH');
  const amur = () => once('amur', () => u(F('^Russia$', 'AMUR_OUTER'), F('^Russia$', 'PRIMORYE')));
  const cp = () => P('CP');
  const cpSansYunnan = () => once('cpSY', () => c.diff(cp(), P('YUNNAN')));
  const hexi = () => once('hexi', () => u(P('HEXI_E'), P('HEXI_W')));
  const north = (g: Poly | null) => c.inter(g, c.region('NORTH_BIG'));
  const south = (g: Poly | null) => c.diff(g, c.region('NORTH_BIG'));
  const shu = (g: Poly | null) => c.inter(g, c.region('SHU_BLOCK'));
  /** Chine actuelle sans le Tibet (région TIBET) : le « corps » de l'empire Qing. */
  const cnSansTibet = () => once('cnST', () => c.diff(CN(), c.region('TIBET')));
  const tibet = () => P('TIBET');
  return { u, c, P, F, hk, tw, mn, nk, sk, vnN, lelang, nkSud, amur, cp, cpSansYunnan, hexi, north, south, shu, cnSansTibet, tibet, CN };
}

const cache = new WeakMap<GeoCtx, ReturnType<typeof makeBlocks>>();

function compose(step: EmpireStep, ctx: GeoCtx): ComposedEntity[] {
  let B = cache.get(ctx);
  if (!B) {
    B = makeBlocks(ctx);
    cache.set(ctx, B);
  }
  const { u, c, P, F, hk, tw, mn, nk, sk, vnN, lelang, nkSud, amur, cp, cpSansYunnan, hexi, north, south, shu, cnSansTibet, tibet, CN } = B;
  const d = c.diff;
  const out: ComposedEntity[] = [];
  const add = (name: string, status: Status, geom: Poly | null) => out.push({ name, status, geom });
  const core = (name: string, geom: Poly | null) => add(name, 'core', geom);
  const vassal = (name: string, geom: Poly | null) => add(name, 'vassal', geom);
  const R = (name: string) => c.region(name);

  /** Chine des Han (Chine propre + couloir du Hexi + Nord-Vietnam + Hong Kong). */
  const hanBase = () => u(cp(), hexi(), vnN(), hk());
  const wei = () => u(cp(), P('HEXI_E'));
  const wuSouth = () => south(u(cp(), vnN(), hk()));

  switch (step.id) {
    // ---------- Antiquité ----------
    case 'shang-anyang-1250':
      core('Domaine royal des Shang', P('SHANG_CORE'));
      vassal('Zhou (vassaux puis rivaux)', P('GUANZHONG'));
      vassal('Seigneurs vassaux des Shang', P('SHANG_RING'));
      break;
    case 'muye-1046':
      core('Domaine royal des Zhou', u(P('GUANZHONG'), P('ZHOU_ROYAL')));
      vassal('Fief de Jin', P('SHANXI'));
      vassal('Fiefs de Qi et de Lu', P('SHANDONG'));
      vassal('Fief de Yan', P('YAN'));
      vassal('Fiefs de Wei et de Song', P('ZHONGYUAN'));
      break;
    case 'zhou-orientaux-770':
      core('Domaine royal des Zhou (Luoyang)', P('LUOYANG'));
      core('Qin', P('GUANZHONG'));
      core('Jin', P('SHANXI'));
      core('Qi', P('SHANDONG_N'));
      core('Lu et Song', P('LU_SONG'));
      core('Zheng et Wei', P('ZHONGYUAN'));
      core('Yan', P('YAN'));
      core('Chu', P('MIDDLE_YANGZI'));
      core('Wu et Yue', P('JIANGNAN'));
      break;
    case 'confucius-551':
      core('Domaine royal des Zhou (Luoyang)', P('LUOYANG'));
      core('Qin', P('GUANZHONG'));
      core('Jin', P('SHANXI'));
      core('Qi', P('SHANDONG_N'));
      core('Lu', P('SHANDONG_S'));
      core('Song, Zheng et Wei', P('ZHONGYUAN'));
      core('Yan', P('YAN'));
      core('Chu', P('MIDDLE_YANGZI'));
      core('Wu', P('WU_N'));
      core('Yue', P('JIANGNAN'));
      break;
    case 'partage-jin-403':
    case 'shang-yang-356':
    case 'changping-260': {
      const i260 = step.id === 'changping-260';
      const qin = i260
        ? u(P('GUANZHONG'), P('SICHUAN'), P('SHANXI_S'), c.inter(CN(), R('LUOYANG')), c.inter(CN(), c.region('JINGZHOU')))
        : P('GUANZHONG');
      if (!i260) core('Zhou (roi symbolique)', P('LUOYANG'));
      core('Qin', qin);
      core('Han', P('HAN_ST'));
      core('Wei', P('WEI_ST'));
      core('Zhao', u(P('ZHAO'), P('HEBEI_S')));
      core('Qi', P('SHANDONG'));
      core('Yan', P('YAN'));
      core('Chu', i260 ? d(P('CHU_BIG'), c.region('JINGZHOU')) : P('CHU_BIG'));
      break;
    }
    case 'unification-qin-221':
      core('Empire Qin', d(cp(), c.region('SOUTH_YUE'), c.region('ORDOS_N')));
      break;
    case 'grande-muraille-214':
      core('Empire Qin', u(cpSansYunnan(), vnN(), hk()));
      break;
    case 'gaixia-202':
      core('Empire Han (commanderies)', d(cp(), c.region('SOUTH_YUE'), c.region('ORDOS_N'), c.region('EAST_VASSAL')));
      vassal('Royaumes vassaux des Han', d(c.inter(cp(), R('EAST_VASSAL')), c.region('SOUTH_YUE')));
      break;
    case 'zhang-qian-138':
      core('Empire Han', d(cp(), c.region('SOUTH_YUE'), c.region('ORDOS_N')));
      vassal('Nanyue (vassal)', u(P('LINGNAN'), vnN(), hk()));
      break;
    case 'mobei-119':
      core('Empire Han', u(hanBase(), lelang()));
      break;
    case 'wang-mang-9':
      core('Empire Xin (Wang Mang)', u(hanBase(), lelang()));
      break;
    case 'ban-chao-97':
      core('Han orientaux', d(hanBase(), c.region('XIONGNU_S')));
      vassal('Xiongnu du Sud (vassaux)', c.inter(CN(), R('XIONGNU_S')));
      vassal("Protectorat des Régions d'Occident", u(P('TARIM'), P('TURFAN')));
      break;
    case 'turbans-jaunes-184':
      core('Han orientaux', d(u(cp(), hexi(), vnN(), hk()), c.region('HEBEI')));
      vassal('Turbans jaunes (Hebei, en révolte)', P('HEBEI'));
      break;
    case 'chibi-208':
      core('Cao Cao (futur Wei)', north(wei()));
      core('Liu Bei (futur Shu)', c.inter(cp(), R('JINGZHOU')));
      core('Sun Quan (futur Wu)', d(wuSouth(), c.region('SHU_BLOCK')));
      break;
    case 'trois-royaumes-220':
      core('Wei', north(wei()));
      core('Shu-Han', shu(cp()));
      core('Wu', wuSouth());
      break;
    case 'jin-reunifies-280':
      core('Jin occidentaux', hanBase());
      break;
    case 'cinq-barbares-311':
      core('Han-Zhao (Xiongnu)', c.inter(north(cp()), u(R('GUANZHONG'), R('SHANXI'), R('ZHONGYUAN'))));
      core('Zhao postérieur', u(P('HEBEI'), P('SHANDONG')));
      core('Dai (Tuoba)', P('DAI'));
      core('Yan (Murong)', P('YAN_MURONG'));
      core('Liang antérieur', hexi());
      core('Cheng-Han', shu(cp()));
      core('Jin orientaux', south(u(cp(), vnN(), hk())));
      break;
    case 'feishui-383':
      core('Dai (Tuoba)', P('DAI'));
      core('Qin antérieur', u(north(u(cp(), hexi())), c.inter(cp(), R('SICHUAN'))));
      vassal('Bassin du Tarim (Qin antérieur)', P('TARIM'));
      core('Jin orientaux', south(u(cp(), vnN(), hk())));
      break;
    case 'wei-nord-439':
      core('Wei du Nord', north(u(cp(), hexi())));
      core('Liu Song (Song du Sud)', south(u(cp(), vnN(), hk())));
      break;
    case 'xiaowen-494':
      core('Wei du Nord', north(u(cp(), hexi())));
      core('Qi du Sud', south(u(cp(), vnN(), hk())));
      break;
    // ---------- Sui et Tang ----------
    case 'sui-reunifient-589':
      core('Empire Sui', u(cpSansYunnan(), hexi(), vnN(), hk()));
      break;
    case 'grand-canal-605':
    case 'salsu-612':
      core('Empire Sui', u(cpSansYunnan(), hexi(), vnN(), hk(), P('QINGHAI_E')));
      vassal('Turcs orientaux (tributaires)', u(mn(), P('IM_NORTH')));
      break;
    case 'tang-618':
      core('Tang', u(P('SHAANXI_CORE'), c.inter(cp(), R('SICHUAN')), P('SHANXI_S')));
      core('Zheng (Wang Shichong)', P('ZHONGYUAN'));
      core('Xia (Dou Jiande)', u(P('HEBEI'), P('SHANDONG')));
      core('Liang (Liang Shidu)', u(P('ORDOS'), P('NINGXIA')));
      core('Qin occidental', u(P('GANSU_E'), P('HEXI_E')));
      core('Chu (Yangzi)', u(P('MIDDLE_YANGZI'), P('JIANGNAN')));
      break;
    case 'taizong-630':
      core('Tang', u(cpSansYunnan(), hexi(), hk()));
      vassal("Turcs orientaux (protectorat d'Anyang)", u(mn(), P('IM_NORTH')));
      vassal('Tuyuhun (vassal)', P('QINGHAI'));
      vassal("Protectorat d'Annan", vnN());
      break;
    case 'xuanzang-645':
      core('Tang', u(cpSansYunnan(), hexi(), hk(), P('TURFAN')));
      vassal('Turcs orientaux (soumis)', u(mn(), P('IM_NORTH')));
      vassal("Protectorat d'Anxi", P('TARIM'));
      vassal('Tuyuhun (vassal)', P('QINGHAI'));
      vassal("Protectorat d'Annan", vnN());
      vassal('Silla (vassal des Tang)', sk());
      break;
    case 'wu-zetian-690':
      core('Zhou (Wu Zetian)', u(cpSansYunnan(), hexi(), hk(), P('TURFAN')));
      vassal("Protectorat d'Anxi", P('TARIM'));
      vassal("Protectorat d'Annan", vnN());
      break;
    case 'talas-751':
      core('Tang', u(cpSansYunnan(), hexi(), hk(), P('TURFAN')));
      vassal("Protectorat d'Anxi", P('TARIM'));
      vassal('Protectorat de Beiting', P('DZUNGARIA'));
      vassal("Protectorat d'Annan", vnN());
      vassal('Nanzhao (vassal)', P('YUNNAN'));
      vassal('Silla (vassal)', u(sk(), nkSud()));
      break;
    case 'an-lushan-755': {
      const tang = u(cpSansYunnan(), hexi(), hk());
      const yanZone = u(P('HEBEI'), P('ZHONGYUAN_N'), P('LIAODONG'));
      core('Tang', d(tang, yanZone));
      core('Yan (An Lushan)', c.inter(cp(), yanZone));
      break;
    }
    // ---------- Cinq Dynasties, Song, Liao, Jin ----------
    case 'fin-tang-907':
      core('Liang postérieurs', u(P('ZHONGYUAN'), P('SHANDONG'), P('HEBEI_S'), P('SHAANXI_E')));
      core('Jin (Li Keyong)', P('SHANXI'));
      core('Qi (Fengxiang)', P('GUANZHONG_W'));
      core('Shu antérieur', P('SICHUAN'));
      core('Jingnan', P('JINGNAN'));
      core('Chu (Ma)', P('MA_CHU'));
      core('Wuyue', P('WUYUE'));
      core('Wu (Yangzhou)', P('WU_YANG'));
      core('Min', P('FUJIAN'));
      core('Nanhan (Canton)', u(P('LINGNAN'), hk()));
      break;
    case 'cinq-dynasties-936':
      core('Tanguts', u(P('ORDOS'), P('NINGXIA')));
      core('Jin postérieurs', d(north(u(P('ZHONGYUAN'), P('SHANDONG'), P('GUANZHONG'), P('SHANXI'), P('HEBEI'))), c.region('HEBEI_N16')));
      core('Liao (Khitans)', u(c.inter(CN(), R('HEBEI_N16')), P('LIAODONG'), P('MANCHURIA'), P('IM_EAST')));
      core('Wuyue', P('WUYUE'));
      core('Tang du Sud', P('TANG_SUD'));
      core('Shu postérieur', P('SICHUAN'));
      core('Jingnan', P('JINGNAN'));
      core('Chu (Ma)', P('MA_CHU'));
      core('Min', P('FUJIAN'));
      core('Han du Sud (Canton)', u(P('LINGNAN'), hk()));
      break;
    case 'song-960':
      core('Tanguts', u(P('ORDOS'), P('NINGXIA')));
      core('Song', d(north(u(P('ZHONGYUAN'), P('SHANDONG'), P('GUANZHONG'), P('HEBEI_S'), P('SHANXI_S'))), c.region('HEBEI_N16')));
      core('Han du Nord', P('SHANXI'));
      core('Liao (Khitans)', u(c.inter(CN(), R('HEBEI_N16')), P('LIAODONG'), P('MANCHURIA'), P('IM_EAST')));
      core('Wuyue', P('WUYUE'));
      core('Tang du Sud', u(P('TANG_SUD'), P('FUJIAN')));
      core('Shu postérieur', P('SICHUAN'));
      core('Jingnan', P('JINGNAN'));
      core('Chu (Zhou Xing)', P('MA_CHU'));
      core('Han du Sud (Canton)', u(P('LINGNAN'), hk()));
      break;
    case 'shanyuan-1005':
      core('Song du Nord', d(u(cpSansYunnan(), hk()), c.region('HEBEI_N16'), c.region('ORDOS'), c.region('NINGXIA')));
      core('Liao (Khitans)', u(c.inter(CN(), R('HEBEI_N16')), P('LIAODONG'), P('MANCHURIA'), P('IM_EAST')));
      core('Tanguts (futurs Xia occidentaux)', u(P('ORDOS'), P('NINGXIA')));
      break;
    case 'xia-occidentaux-1038':
    case 'wang-anshi-1069':
      core('Song du Nord', d(u(cpSansYunnan(), hk()), c.region('HEBEI_N16'), c.region('XIA_BLOCK')));
      core('Liao (Khitans)', u(c.inter(CN(), R('HEBEI_N16')), P('LIAODONG'), P('MANCHURIA'), P('IM_EAST')));
      core('Xia occidentaux (Tanguts)', P('XIA_BLOCK'));
      break;
    case 'jingkang-1127':
    case 'shaoxing-1142': {
      core('Xia occidentaux (Tanguts)', P('XIA_BLOCK'));
      core('Jin (Jurchens)', d(u(north(cp()), P('MANCHURIA'), P('IM_EAST')), c.region('XIA_BLOCK')));
      core('Song du Sud', d(south(u(cp(), hk())), c.region('YUNNAN')));
      break;
    }
    case 'zhongdu-1215': {
      vassal('Xia occidentaux (vassaux des Mongols)', P('XIA_BLOCK'));
      core('Empire mongol', u(mn(), P('INNER_MONGOLIA'), c.inter(cp(), R('HEBEI')), c.inter(cp(), R('SHANXI')), P('MANCHURIA'), P('LIAODONG')));
      core('Jin', north(cp()));
      core('Song du Sud', d(south(u(cp(), hk())), c.region('YUNNAN')));
      break;
    }
    // ---------- Yuan ----------
    case 'xiangyang-1268':
    case 'yuan-1271':
    case 'marco-polo-1275': {
      const sichuanMongol = step.id === 'marco-polo-1275' ? c.inter(cp(), R('SHU_BLOCK')) : u(P('YUNNAN'), c.inter(cp(), R('SICHUAN_N')));
      core('Empire mongol (Yuan)', u(mn(), P('INNER_MONGOLIA'), north(u(cp(), hexi())), P('MANCHURIA'), sichuanMongol));
      core('Song du Sud', d(south(u(cp(), hk())), c.region('YUNNAN')));
      vassal('Tibet (vassal)', P('TIBET_PLATEAU'));
      vassal('Corée (Goryeo, vassale)', u(nk(), sk()));
      break;
    }
    case 'yamen-1279':
    case 'mongols-japon-1281':
      core('Empire Yuan', u(mn(), P('INNER_MONGOLIA'), cp(), hexi(), hk(), P('MANCHURIA')));
      vassal('Tibet (vassal)', P('TIBET_PLATEAU'));
      vassal('Corée (Goryeo, vassale)', u(nk(), sk()));
      break;
    // ---------- Ming ----------
    case 'ming-1368':
      core('Empire Ming', u(cpSansYunnan(), hk(), P('GANSU_MING')));
      vassal('Tibet (nominalement vassal)', P('TIBET_PLATEAU'));
      break;
    case 'zheng-he-1405':
      core('Empire Ming', u(cp(), hk(), P('GANSU_MING'), vnN()));
      vassal('Tibet (vassal)', P('TIBET_PLATEAU'));
      break;
    case 'yongle-1421':
      core('Empire Ming', u(cp(), hk(), P('GANSU_MING'), vnN()));
      vassal('Jurchens de Mandchourie (protectorat)', P('MANCHURIA'));
      vassal('Tibet (influence ming)', P('TIBET_PLATEAU'));
      break;
    case 'tumu-1449':
    case 'muraille-ming-1550':
    case 'imjin-1592':
      core('Empire Ming', u(cp(), hk(), P('GANSU_MING')));
      break;
    case 'sarhu-1619':
      core('Empire Ming', d(u(cp(), hk(), P('GANSU_MING')), c.region('JIN_1619')));
      core('Jin postérieurs (Nurhaci)', P('JIN_1619'));
      break;
    // ---------- Qing ----------
    case 'shanhaiguan-1644': {
      core('Qing (Mandchous)', u(P('MANCHURIA'), P('LIAODONG'), c.inter(cp(), R('HEBEI')), c.inter(cp(), R('SHANDONG'))));
      core('Shun (Li Zicheng)', c.inter(cp(), u(R('GUANZHONG'), R('SHANXI'), R('ZHONGYUAN'))));
      core('Xi (Zhang Xianzhong)', c.inter(cp(), R('SICHUAN')));
      core('Ming du Sud', u(cp(), hk(), P('GANSU_MING')));
      vassal('Mongols du Sud (soumis ou alliés)', P('INNER_MONGOLIA'));
      vassal('Joseon (Corée, vassal des Qing)', u(nk(), sk()));
      break;
    }
    case 'taiwan-1683':
      core('Empire Qing', u(cp(), hk(), tw(), P('GANSU_MING'), P('MANCHURIA'), P('INNER_MONGOLIA')));
      break;
    case 'nertchinsk-1689':
      core('Empire Qing', u(cp(), hk(), tw(), P('GANSU_MING'), P('MANCHURIA'), P('INNER_MONGOLIA'), amur()));
      break;
    case 'xinjiang-1759':
      core('Empire Qing', u(cnSansTibet(), hk(), tw(), mn(), amur()));
      vassal('Tibet (vassal)', tibet());
      vassal('Joseon (Corée, vassal)', u(nk(), sk()));
      break;
    case 'macartney-1793':
    case 'opium-1839':
      core('Empire Qing', u(cnSansTibet(), hk(), tw(), mn(), amur()));
      vassal('Tibet (protégé)', tibet());
      break;
    case 'nankin-1842':
      core('Empire Qing', u(cnSansTibet(), tw(), mn(), amur()));
      vassal('Tibet (protégé)', tibet());
      break;
    case 'taiping-1853':
      core('Royaume céleste des Taiping', P('TAIPING'));
      core('Empire Qing', u(cnSansTibet(), tw(), mn(), amur()));
      vassal('Tibet (protégé)', tibet());
      break;
    case 'palais-ete-1860':
      core('Royaume céleste des Taiping', P('TAIPING'));
      core('Empire Qing', u(cnSansTibet(), tw(), mn()));
      vassal('Tibet (protégé)', tibet());
      break;
    case 'cixi-1861':
      core('Royaume céleste des Taiping', P('TAIPING'));
      core('Empire Qing', d(u(cnSansTibet(), tw(), mn()), c.region('TARIM')));
      vassal('Tibet (protégé)', tibet());
      break;
    case 'sino-japonaise-1895':
      core('Empire Qing', u(cnSansTibet(), mn()));
      vassal('Tibet (protégé)', tibet());
      break;
    case 'boxers-1900': {
      const baux = [R('QINGDAO'), R('WEIHAIWEI'), R('PORT_ARTHUR'), R('GUANGZHOUWAN')];
      core('Empire Qing', d(cnSansTibet(), ...baux));
      vassal('Mongolie (nominalement qing)', mn());
      vassal('Tibet (nominalement qing)', tibet());
      break;
    }
    case 'xinhai-1912':
      core('République de Chine', d(cnSansTibet(), c.region('QINGDAO'), c.region('PORT_ARTHUR'), c.region('WEIHAIWEI'), c.region('GUANGZHOUWAN')));
      break;
    default:
      throw new Error(`china.ts : étape non gérée ${step.id}`);
  }
  return out;
}

const P = (name: string, pt: Position, where: Checkpoint['where'], from?: string, to?: string): Checkpoint => ({ name, pt, where, from, to });
const CHECKS: Checkpoint[] = [
  P('Anyang', [114.35, 36.1], 'core', 'shang-anyang-1250', 'shang-anyang-1250'),
  P("Xi'an / Chang'an (Qin-Han)", [108.94, 34.27], 'core', 'unification-qin-221', 'turbans-jaunes-184'),
  P("Chang'an (Sui-Tang)", [108.94, 34.27], 'core', 'sui-reunifient-589', 'an-lushan-755'),
  P('Luoyang (Zhou)', [112.45, 34.62], 'core', 'zhou-orientaux-770', 'partage-jin-403'),
  P('Luoyang (Han orientaux)', [112.45, 34.62], 'core', 'ban-chao-97', 'turbans-jaunes-184'),
  P('Luoyang (Wei du Nord)', [112.45, 34.62], 'core', 'xiaowen-494', 'xiaowen-494'),
  P('Kaifeng', [114.31, 34.8], 'core', 'fin-tang-907', 'zhongdu-1215'),
  P('Hangzhou (Song du Sud)', [120.16, 30.27], 'core', 'jingkang-1127', 'marco-polo-1275'),
  P('Pékin (Liao à Qing)', [116.4, 39.9], 'core', 'cinq-dynasties-936', 'xinhai-1912'),
  P('Nankin (Sud)', [118.78, 32.06], 'core', 'chibi-208', 'xiaowen-494'),
  P('Nankin (Ming)', [118.78, 32.06], 'core', 'ming-1368', 'shanhaiguan-1644'),
  P('Chengdu (Shu-Han)', [104.07, 30.67], 'core', 'trois-royaumes-220', 'trois-royaumes-220'),
  P('Canton (Qin)', [113.26, 23.13], 'core', 'grande-muraille-214', 'grande-muraille-214'),
  P('Canton hors Qin 221', [113.26, 23.13], 'not-core', 'unification-qin-221', 'unification-qin-221'),
  P('Canton (Nanyue)', [113.26, 23.13], 'vassal', 'zhang-qian-138', 'zhang-qian-138'),
  P('Canton (Han)', [113.26, 23.13], 'core', 'mobei-119', 'turbans-jaunes-184'),
  P('Dunhuang (Han)', [94.66, 40.14], 'core', 'mobei-119', 'turbans-jaunes-184'),
  P('Dunhuang (Tang)', [94.66, 40.14], 'core', 'taizong-630', 'talas-751'),
  P('Kashgar (Han 97)', [75.99, 39.47], 'vassal', 'ban-chao-97', 'ban-chao-97'),
  P('Kashgar (Tang 751)', [75.99, 39.47], 'vassal', 'talas-751', 'talas-751'),
  P('Kashgar (Qing 1759)', [75.99, 39.47], 'core', 'xinjiang-1759', 'macartney-1793'),
  P('Lhassa (Yuan)', [91.11, 29.65], 'vassal', 'xiangyang-1268', 'mongols-japon-1281'),
  P('Lhassa (Qing 1759)', [91.11, 29.65], 'vassal', 'xinjiang-1759', 'boxers-1900'),
  P('Lhassa hors République', [91.11, 29.65], 'not-core', 'xinhai-1912'),
  P('Pyongyang (Lelang)', [125.75, 39.02], 'core', 'mobei-119', 'wang-mang-9'),
  P('Séoul (Silla vassal)', [126.98, 37.57], 'vassal', 'xuanzang-645', 'xuanzang-645'),
  P('Hanoï (Han)', [105.85, 21.03], 'core', 'mobei-119', 'turbans-jaunes-184'),
  P("Hanoï (Annan 751)", [105.85, 21.03], 'vassal', 'talas-751', 'talas-751'),
  P('Taipei (Qing)', [121.56, 25.04], 'core', 'taiwan-1683', 'cixi-1861'),
  P('Taipei (hors Qing 1895+)', [121.56, 25.04], 'not-core', 'sino-japonaise-1895'),
  P('Hong Kong (avant 1842)', [114.17, 22.35], 'core', 'opium-1839', 'opium-1839'),
  P('Hong Kong (hors Qing)', [114.17, 22.35], 'not-core', 'nankin-1842'),
];

export const china: EmpireConfig = {
  id: 'china',
  steps: STEPS,
  defaultEntity: 'Chine',
  compose,
  checkpoints: CHECKS,
};
