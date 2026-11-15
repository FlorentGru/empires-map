// Configuration « Empire moghol » (1526-1857) : 19 étapes composées (scripts/empires/fromCarto.ts)
// d'après overrides/moghols/_carto.json : pays Natural Earth 1:50m (Inde, Pakistan, Afghanistan, Bangladesh)
// découpés par les provinces (subahs) nommées de overrides/moghols/_regions.geojson (Pendjab, Delhi-Doab, Agra,
// Awadh, Bihar, Bengale, Malwa, Gujarat, Marwar, Mewar, Gondwana, Berar, Bijapur, Golconde, Carnatic, Kaboul…).
// Une entité « Empire moghol » (core, qui fond après 1739), l'empire des Sur en 1540 (période de division), et les
// États qui reconnaissent le padishah (vassal : Kaboul de Mirza Hakim, Mewar, tributaires de Bijapur et de Golconde,
// puis Awadh, Bengale, Nizam, Arcot, Rajputs). Frontières approximatives.
import { cartoEmpire } from './fromCarto.ts';

export const moghols = cartoEmpire('moghols');
