import { focusEntity } from '../map/focusEntity';
import { memo, useEffect, useId, useState, type CSSProperties } from 'react';
import { loadTerritory } from '../data/loadEmpire';
import { EVENT_TYPES } from '../lib/eventTypes';
import { DIFF_COLORS } from '../map/diff';
import { variantFill, variantLine, variantVassal } from '../map/color';
import { characterSvg, soldierSvg } from '../map/sprites';
import type { Archetype, Empire, EventType, Faction, TerritoryProperties, TimelineStep } from '../types';

interface Props {
  empire: Empire;
  step: TimelineStep | undefined;
  countries2026?: boolean;
  neighbors?: boolean;
}

/** Figurines d'illustration de la légende, par empire (défaut : Rome). */
const EMPIRE_SPRITES: Record<string, { faction: Faction; archetype: Archetype }> = {
  napoleon: { faction: 'francais', archetype: 'empereur-napoleon' },
  china: { faction: 'chinois', archetype: 'empereur-chinois' },
};

/** Au-delà, la légende des entités est tronquée (périodes de division). */
const MAX_ENTITIES = 40;

const TYPES = Object.keys(EVENT_TYPES) as EventType[];

interface Entity {
  name: string;
  status: NonNullable<TerritoryProperties['status']>;
  /** Index de la feature (détermine la variation de teinte, comme sur la carte). */
  index: number;
}

const STATUS_LABEL = { core: '', vassal: ' (vassal)', allied: ' (allié)' } as const;

/** Entités du territoire de l'étape (nom, statut), dans l'ordre des features. */
function useEntities(empire: Empire, territory: string | undefined): Entity[] {
  const [names, setNames] = useState<Entity[]>([]);
  useEffect(() => {
    if (!territory) return;
    let cancelled = false;
    void loadTerritory(empire.id, territory).then((fc) => {
      if (cancelled) return;
      const list: Entity[] = [];
      fc.features.forEach((f, index) => {
        if (f.properties?.name) list.push({ name: f.properties.name, status: f.properties.status ?? 'core', index });
      });
      setNames(list);
    });
    return () => {
      cancelled = true;
    };
  }, [empire.id, territory]);
  return names;
}

function isMobile(): boolean {
  return typeof window !== 'undefined' && window.innerWidth < 768;
}

export const Legend = memo(function Legend({ empire, step, countries2026 = false, neighbors = true }: Props) {
  const [open, setOpen] = useState(() => !isMobile());
  const titleId = useId();
  const bodyId = useId();
  const found = useEntities(empire, step?.territory);
  const entities: Entity[] = found.length > 0 ? found : [{ name: empire.name, status: 'core', index: 0 }];
  const sprites = EMPIRE_SPRITES[empire.id] ?? { faction: 'romains' as Faction, archetype: 'senateur' as Archetype };

  return (
    <section className={`legend${open ? ' legend--open' : ''}`} aria-labelledby={titleId}>
      <button type="button" className="legend__toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={bodyId}>
        <span className="legend__qmark" aria-hidden="true">
          ?
        </span>
        <span id={titleId} className="legend__title">
          Légende
        </span>
        <span className="legend__chevron" aria-hidden="true">
          ▾
        </span>
      </button>

      <div id={bodyId} className="legend__body" hidden={!open}>
        <h3>Événements (frise)</h3>
        <ul className="legend__list legend__list--cols">
          {TYPES.map((t) => {
            const m = EVENT_TYPES[t];
            return (
              <li key={t}>
                <span className="legend__dot" style={{ '--c': m.color } as CSSProperties} aria-hidden="true" />
                <span aria-hidden="true">{m.icon}</span> {m.label}
              </li>
            );
          })}
        </ul>

        <h3>Carte</h3>
        <ul className="legend__list legend__list--entities">
          {entities.slice(0, MAX_ENTITIES).map((e) => (
            <li key={`${e.index}-${e.name}`}>
              <button
                type="button"
                className="legend__entity"
                onClick={() => step && focusEntity(step.territory, e.index)}
                title={`Zoomer sur ${e.name}`}
              >
              <span
                className="legend__swatch"
                style={{
                  background: e.status === 'allied' ? 'transparent' : e.status === 'vassal' ? variantVassal(empire.color, e.index) : variantFill(empire.color, e.index),
                  borderColor: variantLine(empire.color, e.index),
                  borderStyle: e.status === 'core' ? undefined : 'dashed',
                }}
                aria-hidden="true"
              />
              Territoire : {e.name}{STATUS_LABEL[e.status]}
              </button>
            </li>
          ))}
          {entities.length > MAX_ENTITIES && <li>… et {entities.length - MAX_ENTITIES} autres entités</li>}
        </ul>
        <ul className="legend__list">
          <li>
            <span className="legend__swatch legend__swatch--diff" style={{ '--c': DIFF_COLORS.gained } as CSSProperties} aria-hidden="true">
              +
            </span>
            Front qui avance : territoire gagné (vert)
          </li>
          <li>
            <span className="legend__swatch legend__swatch--diff" style={{ '--c': DIFF_COLORS.lost } as CSSProperties} aria-hidden="true">
              −
            </span>
            Front qui recule : territoire perdu (rouge)
          </li>
          <li>
            <span className="legend__marker" aria-hidden="true">
              ⚔
            </span>
            Lieu de la bataille ou de l'événement
          </li>
          <li>
            <span className="legend__dashes" aria-hidden="true" />{' '}
            <span className="legend__soldier" aria-hidden="true" dangerouslySetInnerHTML={{ __html: soldierSvg(sprites.faction, 0) }} />
            {' '}Armées en marche (étiquette : camp et peuple)
          </li>
          <li>
            <span className="legend__figure" aria-hidden="true" dangerouslySetInnerHTML={{ __html: characterSvg(sprites.archetype) }} />
            {' '}Personnage (nom et citation en bulle)
          </li>
          {countries2026 && (
            <li>
              <span className="legend__dashes legend__dashes--border" aria-hidden="true" />
              Frontières actuelles (2026)
            </li>
          )}
          {neighbors && (
            <li>
              <span className="legend__dashes legend__dashes--neighbor" aria-hidden="true" />
              Voisins de l'époque
            </li>
          )}
          <li>
            <span className="legend__city" aria-hidden="true" />
            Ville
          </li>
          <li>
            <span className="legend__city legend__city--capital" aria-hidden="true" />
            Capitale (en gras)
          </li>
        </ul>
      </div>
    </section>
  );
});
