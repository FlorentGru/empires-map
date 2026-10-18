import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { formatYear } from '../lib/years';
import catalogJson from '../../data/empires-catalog.json';
import type { Empire, EmpireCatalogEntry } from '../types';

interface Props {
  empires: Empire[];
  current: Empire;
  onSelect: (id: string) => void;
  /** Ouvre la vue « Le monde en l'an… ». */
  onOpenWorld?: () => void;
}

const CATALOG = catalogJson as EmpireCatalogEntry[];

/** Groupes par continent (ordre du fichier) ; disponibles d'abord, puis à venir. */
function groupCatalog(empires: Empire[]) {
  const byId = new Map(empires.map((e) => [e.id, e]));
  const groups = new Map<string, { available: Empire[]; soon: EmpireCatalogEntry[] }>();
  for (const c of CATALOG) {
    const g = groups.get(c.region) ?? { available: [], soon: [] };
    groups.set(c.region, g);
    const e = byId.get(c.id);
    if (e) g.available.push(e);
    else g.soon.push(c);
  }
  // Empires chargés mais absents du catalogue.
  const known = new Set(CATALOG.map((c) => c.id));
  const extra = empires.filter((e) => !known.has(e.id));
  if (extra.length) groups.set('Autres', { available: extra, soon: [] });
  return [...groups.entries()];
}

export function EmpirePicker({ empires, current, onSelect, onOpenWorld }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const groups = useMemo(() => groupCatalog(empires), [empires]);
  const baseId = useId();
  // Seul le continent de l'empire courant est déplié à l'ouverture.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const regionOfCurrent = useMemo(() => groups.find(([, g]) => g.available.some((e) => e.id === current.id))?.[0], [groups, current.id]);
  const toggleOpen = () => {
    if (!open) setExpanded(new Set(regionOfCurrent ? [regionOfCurrent] : []));
    setOpen((o) => !o);
  };
  const toggleRegion = (region: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (!next.delete(region)) next.add(region);
      return next;
    });

  // Fermeture sur clic extérieur ou Échap.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="empire-picker" ref={rootRef}>
      <button
        type="button"
        className="empire-picker__current"
        aria-expanded={open}
        aria-controls="empire-picker-list"
        aria-label={`Empire affiché : ${current.name}. Changer d'empire`}
        onClick={toggleOpen}
      >
        <span className="empire-picker__swatch" style={{ background: current.color }} aria-hidden="true" />
        <span>
          <span className="empire-picker__name">{current.name}</span>
          <span className="empire-picker__dates">
            {formatYear(current.start)} – {formatYear(current.end)}
          </span>
        </span>
        <span aria-hidden="true" className="empire-picker__chevron">
          ▾
        </span>
      </button>

      {open && (
        <ul id="empire-picker-list" className="empire-picker__list">
          {onOpenWorld && (
            <li>
              <button
                type="button"
                className="empire-card empire-card--world"
                onClick={() => {
                  setOpen(false);
                  onOpenWorld();
                }}
              >
                <span aria-hidden="true">🌍</span>
                <span className="empire-card__name">Le monde en l'an…</span>
              </button>
            </li>
          )}
          {groups.map(([region, g], gi) => {
            const isOpen = expanded.has(region);
            const total = g.available.length + g.soon.length;
            const panelId = `${baseId}-region-${gi}`;
            return (
              <li key={region} className={`empire-group${isOpen ? ' empire-group--open' : ''}`}>
                <button type="button" className="empire-group__toggle" aria-expanded={isOpen} aria-controls={panelId} onClick={() => toggleRegion(region)}>
                  <span className="empire-group__title">
                    {region} · {total} empire{total > 1 ? 's' : ''} ({g.available.length} disponible{g.available.length > 1 ? 's' : ''})
                  </span>
                  <span aria-hidden="true" className="empire-group__chevron">
                    ▾
                  </span>
                </button>
                <div id={panelId} className="empire-group__panel" role="group" aria-label={region}>
                  <ul className="empire-group__list">
                    {g.available.map((e) => (
                      <li key={e.id}>
                        <button
                          type="button"
                          className="empire-card"
                          aria-current={e.id === current.id ? 'true' : undefined}
                          onClick={() => {
                            onSelect(e.id);
                            setOpen(false);
                          }}
                        >
                          <span className="empire-picker__swatch" style={{ background: e.color }} aria-hidden="true" />
                          <span className="empire-card__name">{e.name}</span>
                          <span className="empire-card__dates">
                            {formatYear(e.start)} – {formatYear(e.end)}
                          </span>
                        </button>
                      </li>
                    ))}
                    {g.soon.map((c) => (
                      <li key={c.id}>
                        <div className="empire-card empire-card--disabled" aria-disabled="true">
                          <span className="empire-picker__swatch" aria-hidden="true" />
                          <span className="empire-card__name">{c.name}</span>
                          <span className="empire-card__dates">
                            {formatYear(c.start)} – {formatYear(c.end)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
