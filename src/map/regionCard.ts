// Fiche d'une région cliquée (entité nommée du territoire) : statut, période sur la frise, explication
// rédigée (data/empires/<id>/regions.json) et villes de l'Atlas qu'elle contient à cette date.
import type { Map as MapLibreMap } from 'maplibre-gl';
import { loadStepReligions } from '../data/loadReligions';
import { regionInfo } from '../data/loadRegions';
import { religionLine } from '../lib/religions';
import { pointInGeometry } from '../lib/contemporaries';
import { formatYear } from '../lib/years';
import type { City } from '../types';
import { isVisible, nameAt } from './cityLayer';
import { closeMapCard, openMapCard } from './mapCard';
import type { RegionFeature } from './territoryLayers';

const STATUS: Record<string, string> = { core: "Cœur de l'empire", vassal: 'État vassal', allied: 'Allié' };
const MAX_CITIES = 6;
let open = false;

/** Ferme la fiche de région si c'est elle qui est ouverte (changement d'étape), sans toucher aux autres bulles. */
export function closeRegionCard(): void {
  if (open) closeMapCard();
}

/** Villes visibles à l'année et situées dans la région, les plus importantes d'abord. */
export function citiesIn(f: RegionFeature, cities: readonly City[], year: number): string[] {
  return cities
    .filter((c) => isVisible(c, year) && pointInGeometry(c.coords, f.geometry))
    .sort((a, b) => a.rank - b.rank)
    .map((c) => nameAt(c, year));
}

export function openRegionCard(
  map: MapLibreMap,
  f: RegionFeature,
  x: number,
  y: number,
  empireId: string,
  year: number,
  cities: readonly City[],
  stepId?: string,
): void {
  const p = f.properties;
  const info = regionInfo(empireId, p.name);
  const el = (cls: string, text: string) => {
    const n = document.createElement('p');
    n.className = cls;
    n.textContent = text;
    return n;
  };
  const span = info
    ? info.years[0] === info.years[1]
      ? ` · ${formatYear(info.years[0])}`
      : ` · ${formatYear(info.years[0])} – ${formatYear(info.years[1])}`
    : '';
  const parts: Node[] = [el('map-card__title', p.name), el('map-card__meta', `${STATUS[p.status ?? 'core']}${span}`)];
  if (info) parts.push(el('map-card__text', info.summary));
  const names = citiesIn(f, cities, year);
  if (names.length) {
    const more = names.length > MAX_CITIES ? ` et ${names.length - MAX_CITIES} autres` : '';
    parts.push(el('map-card__text map-card__cities', `Villes : ${names.slice(0, MAX_CITIES).join(', ')}${more}.`));
  }
  // Religion de l'entité à cette étape : ligne ajoutée dès que les données (chargées à la demande) sont là.
  const religion = el('map-card__text map-card__religion', '');
  religion.hidden = true;
  parts.push(religion);
  const card = openMapCard(map, x, y, p.name, parts, undefined, () => (open = false));
  open = true;
  if (!stepId) return;
  void loadStepReligions(empireId, stepId).then((sr) => {
    const e = sr?.entities[p.name];
    if (!e || !card.isConnected) return;
    const before = card.offsetHeight;
    religion.textContent = religionLine(e);
    religion.hidden = false;
    // Carte posée au-dessus du point cliqué : elle grandit vers le haut pour ne pas le recouvrir.
    if (card.getBoundingClientRect().bottom <= y) card.style.top = `${card.offsetTop - (card.offsetHeight - before)}px`;
  });
}
