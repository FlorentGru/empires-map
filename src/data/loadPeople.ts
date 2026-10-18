import type { Person } from '../types';

/** Fiches des personnages illustres : data/empires/<id>/people.json (facultatif par empire). */
const modules = import.meta.glob<Person[]>('../../data/empires/*/people.json', { eager: true, import: 'default' });

export const PEOPLE: Record<string, Person[]> = Object.fromEntries(
  Object.entries(modules).map(([file, list]) => [file.split('/').at(-2)!, Array.isArray(list) ? list : []]),
);

export function findPerson(empireId: string, id: string): Person | undefined {
  return PEOPLE[empireId]?.find((p) => p.id === id);
}

export { OPEN_PERSON_EVENT, type OpenPersonDetail } from './personEvent';
