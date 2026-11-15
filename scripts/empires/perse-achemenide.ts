// Configuration « Empire perse achéménide » (-550 à -330) : 20 étapes composées (scripts/empires/fromCarto.ts)
// d'après overrides/perse-achemenide/_carto.json : pays Natural Earth 1:50m (Iran, Irak, Turquie, Syrie, Égypte,
// Libye, Chypre, Afghanistan, Pakistan, Asie centrale, Grèce, Bulgarie…) découpés par des satrapies nommées
// (overrides/perse-achemenide/_regions.geojson). Une entité « Empire perse » (core) + vassaux nommés à part
// (Cyrénaïque, Macédoine). Frontières approximatives.
import { cartoEmpire } from './fromCarto.ts';

export const perseAchemenide = cartoEmpire('perse-achemenide');
