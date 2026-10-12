// Contrat des configurations par empire (scripts/empires/<id>.ts).
import type { Feature, MultiPolygon, Polygon, Position } from 'geojson';

export type Poly = Feature<Polygon | MultiPolygon>;
export type Status = 'core' | 'vassal' | 'allied';

export interface EmpireStep {
  /** Identifiant d'étape : doit exister dans data/empires/<empire>/timeline.json (même année). */
  id: string;
  year: number;
  /** Impose un instantané (ex. "world_bc200") au lieu du plus proche de `year`. */
  snapshot?: string;
  /** Part du résultat d'une étape précédente au lieu d'un instantané (overrides cumulatifs). */
  base?: string;
  /** Filtre d'entités : NAME (historical-basemaps) → nom français de la Feature ; plusieurs NAME → même nom (fusion). */
  entities?: Record<string, string>;
  /** Étape composée par code (voir EmpireConfig.compose) au lieu d'un instantané. */
  compose?: boolean;
}

/** Entité produite par EmpireConfig.compose (géométrie non découpée sur les terres). */
export interface ComposedEntity {
  name: string;
  status?: Status;
  geom: Poly | null;
  /** Défaut : année de l'étape. */
  sourceYear?: number;
}

/** Outils géométriques fournis à `compose`. Toutes les sources sont mémoïsées. */
export interface GeoCtx {
  /** Union des entités d'un instantané historical-basemaps dont NAME correspond à la regex. */
  snap(snapshot: string, match: string): Poly | null;
  /** Union des pays Natural Earth 1:50m (ADMIN ou NAME) correspondant à la regex, éventuellement découpés par une région. */
  country(match: string, region?: string): Poly | null;
  /** Polygone nommé de overrides/<empire>/_regions.geojson. */
  region(name: string): Poly;
  /** Masse terrestre Natural Earth contenant le point (île entière). */
  island(pt: Position): Poly;
  union(...list: (Poly | null)[]): Poly | null;
  inter(a: Poly | null, b: Poly | null): Poly | null;
  diff(a: Poly | null, ...b: (Poly | null)[]): Poly | null;
  /** Dilate `g` de `km` kilomètres puis retire `avoid` (rattrape les côtes généralisées des instantanés). */
  grow(g: Poly | null, km: number, ...avoid: (Poly | null)[]): Poly | null;
}

/** Point de contrôle : `where` = statut attendu de l'entité qui contient le point. */
export interface Checkpoint {
  name: string;
  pt: Position;
  where: 'core' | 'vassal' | 'allied' | 'any' | 'not-core';
  /** Plage d'étapes (ids inclus) ; absent = toutes. */
  from?: string;
  to?: string;
}

export interface EmpireConfig {
  id: string;
  steps: EmpireStep[];
  /** Entité par défaut des overrides sans `entity` quand l'étape n'en a aucune. */
  defaultEntity: string;
  /** Rustine de trait de côte : si une entité contient `point`, on ajoute sans découpe les polygones de overrides/<id>/<file>. */
  coastFix?: { point: Position; file: string };
  /** Construit les entités des étapes `compose: true`, par ordre de priorité (une entité ne chevauche pas les précédentes). */
  compose?(step: EmpireStep, ctx: GeoCtx): ComposedEntity[];
  checkpoints?: Checkpoint[];
}
