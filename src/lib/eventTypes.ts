import type { EventType } from '../types';

interface EventTypeMeta {
  label: string;
  icon: string;
  color: string;
}

export const EVENT_TYPES: Record<EventType, EventTypeMeta> = {
  bataille: { label: 'Bataille', icon: '⚔', color: '#a63a2b' },
  traité: { label: 'Traité', icon: '📜', color: '#3e6e8e' },
  politique: { label: 'Politique', icon: '🏛', color: '#6b5a8e' },
  réforme: { label: 'Réforme', icon: '🏛', color: '#4f7a4a' },
  fondation: { label: 'Fondation', icon: '⚑', color: '#b5862f' },
  chute: { label: 'Chute', icon: '💀', color: '#3b3330' },
};

export function eventMeta(type: EventType): EventTypeMeta {
  return EVENT_TYPES[type] ?? { label: type, icon: '•', color: '#6b5b4b' };
}
