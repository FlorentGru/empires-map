import type { EmpireProfile } from '../types-profile';

/** Profils comparatifs : data/empires/<id>/profile.json (facultatif par empire). */
const modules = import.meta.glob<EmpireProfile>('../../data/empires/*/profile.json', { eager: true, import: 'default' });

export const PROFILES: Record<string, EmpireProfile> = Object.fromEntries(
  Object.entries(modules).map(([file, p]) => [file.split('/').at(-2)!, p]),
);
