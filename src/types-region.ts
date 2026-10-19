/** Une région (entité nommée d'un territoire) expliquée : data/empires/<id>/regions.json. */
export interface RegionInfo {
  /** Exactement le `name` des Features de territoire concernées. */
  name: string;
  /** 2 ou 3 phrases (25 à 80 mots) : ce qu'est la zone, son lien avec l'empire, ce qu'elle devient. */
  summary: string;
  /** Année de la première et de la dernière étape où la région apparaît (scripts/list-regions.ts). */
  years: [number, number];
}
