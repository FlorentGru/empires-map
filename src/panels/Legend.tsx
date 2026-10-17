import { focusEntity } from '../map/focusEntity';
import { GOTO_EVENT, type GotoDetail } from '../map/contemporaryLayers';
import { monumentIconSvg } from '../map/monumentIcons';
import { memo, useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';
import { loadContemporaries, loadTerritory } from '../data/loadEmpire';
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
  contemporaries?: boolean;
  monuments?: boolean;
  routes?: boolean;
  disasters?: boolean;
}

/** Figurines d'illustration de la légende, par empire (défaut : Rome). */
const EMPIRE_SPRITES: Record<string, { faction: Faction; archetype: Archetype }> = {
  napoleon: { faction: 'francais', archetype: 'empereur-napoleon' },
  china: { faction: 'chinois', archetype: 'empereur-chinois' },
  mongols: { faction: 'mongols', archetype: 'khan' },
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

/** Empires contemporains présents à l'étape (couleur + nom), dans l'ordre d'apparition. */
function useContemporaryEmpires(empireId: string, stepId: string | undefined, on: boolean) {
  const [list, setList] = useState<{ id: string; name: string; color: string; stepId: string }[]>([]);
  useEffect(() => {
    if (!on || !stepId) {
      setList([]);
      return;
    }
    let stale = false;
    void loadContemporaries(empireId, stepId).then((fc) => {
      if (stale) return;
      const seen = new Map<string, { id: string; name: string; color: string; stepId: string }>();
      for (const f of fc.features) if (!seen.has(f.properties.empire)) seen.set(f.properties.empire, { id: f.properties.empire, name: f.properties.empireName, color: f.properties.color, stepId: f.properties.stepId });
      setList([...seen.values()]);
    });
    return () => {
      stale = true;
    };
  }, [empireId, stepId, on]);
  return list;
}

/** Rubrique titrée de la légende. */
function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="legend__group">
      <h3>{title}</h3>
      <ul className="legend__rows">{children}</ul>
    </div>
  );
}

/** Ligne : icône dans une colonne alignée, libellé et précision en petit. */
function Row({ icon, label, hint }: { icon: ReactNode; label: string; hint?: string }) {
  return (
    <li>
      <span className="legend__icon">{icon}</span>
      <span className="legend__label">
        {label}
        {hint && <small>{hint}</small>}
      </span>
    </li>
  );
}

export const Legend = memo(function Legend({ empire, step, countries2026 = false, neighbors = true, contemporaries = true, monuments = true, routes = true, disasters = true }: Props) {
  const others = useContemporaryEmpires(empire.id, step?.id, contemporaries);
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
        <Group title="Frise">
          <li className="legend__cols">
            {TYPES.map((t) => {
              const m = EVENT_TYPES[t];
              return (
                <span key={t} className="legend__mini">
                  <span className="legend__dot" style={{ '--c': m.color } as CSSProperties} aria-hidden="true" />
                  {m.icon} {m.label}
                </span>
              );
            })}
          </li>
          {disasters && <Row icon={<span className="legend__bar" aria-hidden="true" />} label="Catastrophes et guerres" hint="barres fines au-dessus de la frise" />}
        </Group>

        <Group title="Territoires">
          <li className="legend__scroll">
            <ul className="legend__rows">
              {entities.slice(0, MAX_ENTITIES).map((e) => (
                <li key={`${e.index}-${e.name}`}>
                  <button type="button" className="legend__entity" onClick={() => step && focusEntity(step.territory, e.index)} title={`Zoomer sur ${e.name}`}>
                    <span className="legend__icon">
                      <span
                        className="legend__swatch"
                        style={{
                          background: e.status === 'allied' ? 'transparent' : e.status === 'vassal' ? variantVassal(empire.color, e.index) : variantFill(empire.color, e.index),
                          borderColor: variantLine(empire.color, e.index),
                          borderStyle: e.status === 'core' ? undefined : 'dashed',
                        }}
                        aria-hidden="true"
                      />
                    </span>
                    <span className="legend__label">
                      {e.name}
                      {STATUS_LABEL[e.status] && <small>{STATUS_LABEL[e.status].replace(/[()]/g, '').trim()}</small>}
                    </span>
                  </button>
                </li>
              ))}
              {entities.length > MAX_ENTITIES && <li className="legend__more">… et {entities.length - MAX_ENTITIES} autres entités</li>}
            </ul>
          </li>
          <Row icon={<span className="legend__swatch legend__swatch--diff" style={{ '--c': DIFF_COLORS.gained } as CSSProperties} aria-hidden="true">+</span>} label="Territoire gagné" hint="front qui avance" />
          <Row icon={<span className="legend__swatch legend__swatch--diff" style={{ '--c': DIFF_COLORS.lost } as CSSProperties} aria-hidden="true">−</span>} label="Territoire perdu" hint="front qui recule" />
          {others.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                className="legend__entity"
                title={`Aller à « ${o.name} » à cette époque`}
                onClick={() => window.dispatchEvent(new CustomEvent<GotoDetail>(GOTO_EVENT, { detail: { empire: o.id, step: o.stepId } }))}
              >
                <span className="legend__icon">
                  <span className="legend__swatch legend__swatch--contemporary" style={{ background: `${o.color}38`, borderColor: o.color }} aria-hidden="true" />
                </span>
                <span className="legend__label">
                  {o.name} →<small>empire contemporain</small>
                </span>
              </button>
            </li>
          ))}
        </Group>

        <Group title="Armées et personnages">
          <Row icon={<span className="legend__marker" aria-hidden="true">⚔</span>} label="Lieu de la bataille" hint="ou de l'événement" />
          <Row icon={<span className="legend__soldier" aria-hidden="true" dangerouslySetInnerHTML={{ __html: soldierSvg(sprites.faction, 0) }} />} label="Armée en marche" hint="camp, peuple et lieu de départ" />
          <Row icon={<span className="legend__figure" aria-hidden="true" dangerouslySetInnerHTML={{ __html: characterSvg(sprites.archetype) }} />} label="Personnage" hint="citation en bulle, « Sa fiche »" />
        </Group>

        {(monuments || routes || disasters) && (
          <Group title="Le monde de l'époque">
            {monuments && <Row icon={<span className="legend__monument" aria-hidden="true" dangerouslySetInnerHTML={{ __html: monumentIconSvg('temple') }} />} label="Monument" hint="cliquer ; les piles s'écartent au survol" />}
            {routes && <Row icon={<span className="legend__route" aria-hidden="true" />} label="Route terrestre" hint="🐫 caravanes" />}
            {routes && <Row icon={<span className="legend__route legend__route--sea" aria-hidden="true" />} label="Route maritime" hint="⛵ navires" />}
            {disasters && <Row icon={<span className="legend__plague" aria-hidden="true" />} label="Épidémie" hint="diffusion, vague récente en vif" />}
            {disasters && <Row icon={<span className="legend__war" aria-hidden="true" />} label="Guerre meurtrière" hint="zone des combats et bilan" />}
            {disasters && <Row icon={<span className="legend__glyphs" aria-hidden="true">☣🌋</span>} label="Catastrophe" hint="épidémie, éruption, séisme, famine…" />}
          </Group>
        )}

        <Group title="Repères">
          <Row icon={<span className="legend__city" aria-hidden="true" />} label="Ville" />
          <Row icon={<span className="legend__city legend__city--capital" aria-hidden="true" />} label="Capitale" hint="nom en gras" />
          {neighbors && <Row icon={<span className="legend__dashes legend__dashes--neighbor" aria-hidden="true" />} label="Voisins de l'époque" />}
          {countries2026 && <Row icon={<span className="legend__dashes legend__dashes--border" aria-hidden="true" />} label="Frontières de 2026" />}
        </Group>
      </div>
    </section>
  );
});
