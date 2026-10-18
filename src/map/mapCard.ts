// Bulle d'information ouverte par un clic sur la carte, posée au-dessus de toute l'interface
// (une Popup MapLibre vit dans la carte et passerait sous les panneaux). Une seule bulle à la fois.
import type { Map as MapLibreMap } from 'maplibre-gl';
import './mapCard.css';

let current: { el: HTMLDivElement; map: MapLibreMap; onClose?: () => void } | null = null;

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') closeMapCard();
}

/** Seuls les mouvements faits par l'utilisateur ferment la bulle (pas les vols de caméra automatiques). */
function onMoveStart(e: { originalEvent?: Event }) {
  if (e.originalEvent) closeMapCard();
}

export function closeMapCard(): void {
  if (!current) return;
  const { el, map, onClose } = current;
  current = null;
  el.remove();
  onClose?.();
  document.removeEventListener('keydown', onKey);
  map.off('movestart', onMoveStart);
}

/**
 * Ouvre la bulle près de (clientX, clientY), toujours entièrement à l'écran.
 * Se ferme avec ✕, Échap, ou dès que l'utilisateur déplace la carte. Le focus va sur `focus` s'il est fourni.
 */
export function openMapCard(
  map: MapLibreMap,
  clientX: number,
  clientY: number,
  label: string,
  content: Node[],
  focus?: HTMLElement,
  onClose?: () => void,
): HTMLDivElement {
  closeMapCard();
  const card = document.createElement('div');
  card.className = 'map-card';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', label);
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'map-card__close';
  close.setAttribute('aria-label', 'Fermer');
  close.textContent = '✕';
  close.addEventListener('click', closeMapCard);
  card.append(close, ...content);
  document.body.append(card);
  const w = card.offsetWidth;
  const h = card.offsetHeight;
  card.style.left = `${Math.min(window.innerWidth - w - 8, Math.max(8, clientX - w / 2))}px`;
  card.style.top = `${clientY - h - 14 >= 8 ? clientY - h - 14 : Math.min(window.innerHeight - h - 8, clientY + 14)}px`;
  current = { el: card, map, onClose };
  (focus ?? close).focus({ preventScroll: true });
  document.addEventListener('keydown', onKey);
  map.on('movestart', onMoveStart);
  return card;
}
