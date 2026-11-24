/** Fiche d'une grande ville (data/city-info.json : CityInfo[]), onglet « Villes » de la galerie et page /villes/. */
export interface CityInfo {
  /** Exactement l'`id` de la ville dans data/cities.json (nom, coordonnées, capitale de… y restent). */
  id: string;
  /** 2 ou 3 phrases (40 à 90 mots) : ce qu'est la ville, son rôle dans les empires de l'Atlas, ce qu'elle devient. */
  summary: string;
  /** 2 à 4 repères courts, chacun commençant par son année : « 330 : Constantin en fait sa capitale ». */
  facts: string[];
  /** Population à son apogée, en clair et datée : « environ 1 million d'habitants vers l'an 100 ». Absent si inconnu. */
  population?: string;
  /** Page Wikipédia en français, vérifiée (https://fr.wikipedia.org/wiki/…). */
  wikipedia: string;
}
