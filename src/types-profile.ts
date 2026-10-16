/** Profil comparatif d'un empire, période par période (données : data/empires/<id>/profile.json). */

/** Source d'un chiffre ou d'une affirmation (Wikipédia FR de préférence). */
export interface Source {
  /** Titre lisible de la source. */
  label: string;
  /** Adresse https de la source. */
  url: string;
}

/** Valeur chiffrée honnête : une valeur centrale, une fourchette si l'incertitude est réelle, une année de référence. */
export interface Estimate {
  /** Valeur centrale retenue. */
  value: number;
  /** Borne basse plausible (≤ value). */
  low?: number;
  /** Borne haute plausible (≥ value). */
  high?: number;
  /** Année de référence du chiffre (entier, négatif avant J.-C.). */
  year: number;
  /** Unité si elle n'est pas évidente (ex. « circuits (dao) »). */
  unit?: string;
  /** Précision ou mise en garde (ex. « estimation reconstruite »). */
  note?: string;
  source: Source;
}

/** Profil d'un empire sur une période de sa frise. */
export interface ProfilePeriod {
  /** Identique à l'id d'une période de timeline.json (champ periods) si elle existe, sinon kebab-case. */
  id: string;
  name: string;
  start: number;
  end: number;
  /** Population totale (en habitants) et 2 à 5 grandes villes. */
  population: { total: Estimate; cities: { name: string; population: Estimate }[] };
  economy: {
    /** Part du PIB mondial, en % (estimations de type Maddison, reconstruites). */
    worldGdpShare?: Estimate;
    resources: string[];
    currency: string;
    taxation: string;
    trade: string;
  };
  army: {
    /** Effectif, en soldats. */
    size?: Estimate;
    composition: string;
    recruitment: string;
    famousUnits: string[];
    innovations: string[];
  };
  politics: {
    regime: string;
    head: string;
    succession: string;
    institutions: string;
    administration: string;
    /** Nombre de provinces (ou équivalent, précisé dans unit). */
    provinces?: Estimate;
    law: string;
  };
  society: { religions: string[]; languages: string[]; structure: string; women: string };
  culture: { inventions: string[]; works: string[]; scholars: string[] };
  infrastructure: {
    /** Longueur du réseau routier, en km. */
    roads?: Estimate;
    summary: string;
  };
  legacy: string;
}

export interface EmpireProfile {
  /** Identifiant de l'empire (nom du dossier data/empires/<id>). */
  empire: string;
  periods: ProfilePeriod[];
}
