/** Événement : ouvrir la galerie sur la fiche d'un personnage (lien « Sa fiche » des cartes de personnage). */
export const OPEN_PERSON_EVENT = 'atlas:open-person';
export interface OpenPersonDetail {
  empire: string;
  id: string;
}
