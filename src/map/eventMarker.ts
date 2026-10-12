import { Marker, type Map as MapLibreMap } from 'maplibre-gl';
import { eventMeta } from '../lib/eventTypes';
import type { TimelineStep } from '../types';

/** Marqueur HTML pulsé sur le lieu de l'événement (pas de glyphs distants). */
export class EventMarker {
  private marker: Marker | null = null;
  private el: HTMLDivElement;

  constructor(private map: MapLibreMap) {
    this.el = document.createElement('div');
    this.el.className = 'event-marker';
    this.el.innerHTML = '<span class="event-marker__pulse"></span><span class="event-marker__icon" aria-hidden="true"></span>';
  }

  show(step: TimelineStep) {
    if (!step.location) {
      this.marker?.remove();
      this.marker = null;
      return;
    }
    const meta = eventMeta(step.type);
    this.el.style.setProperty('--marker-color', meta.color);
    this.el.querySelector('.event-marker__icon')!.textContent = meta.icon;
    this.el.setAttribute('role', 'img');
    this.el.setAttribute('aria-label', `${meta.label} : ${step.title}`);
    // Relancer l'animation d'apparition.
    this.el.classList.remove('event-marker--enter');
    void this.el.offsetWidth;
    this.el.classList.add('event-marker--enter');
    if (!this.marker) this.marker = new Marker({ element: this.el }).setLngLat(step.location).addTo(this.map);
    else this.marker.setLngLat(step.location);
  }

  destroy() {
    this.marker?.remove();
  }
}
