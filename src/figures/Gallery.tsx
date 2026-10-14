import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { EMPIRES } from '../data/loadEmpire';
import { formatYear } from '../lib/years';
import { prefersReducedMotion } from '../lib/motion';
import { FACTIONS, ARCHETYPES, type Archetype, type Faction } from '../types';
import { characterSvg, FACTION_COLORS, soldierSvg } from './registry';
import { ARCHETYPE_INFO, FACTION_INFO, type FigureInfo } from './descriptions';

interface Props {
  onClose: () => void;
  /** Ferme la galerie et affiche l'étape voulue. */
  onNavigate: (empireId: string, stepId: string) => void;
}

type Kind = 'faction' | 'archetype';
type Filter = 'all' | 'soldiers' | 'characters';

interface Item {
  uid: string;
  kind: Kind;
  faction?: Faction;
  archetype?: Archetype;
  info: FigureInfo;
  color: string;
}

const NAPO: Faction[] = ['francais', 'britanniques', 'autrichiens', 'prussiens', 'russes', 'espagnols', 'portugais', 'polonais'];
const ASIA: Faction[] = ['chinois', 'xiongnu', 'mongols', 'jurchens', 'mandchous', 'japonais', 'coreens', 'tibetains', 'vietnamiens', 'turcs-gokturks', 'khitans', 'ouighours'];

const factionItem = (f: Faction): Item => ({ uid: `f:${f}`, kind: 'faction', faction: f, info: FACTION_INFO[f], color: FACTION_COLORS[f] });
const archetypeItem = (a: Archetype): Item => ({ uid: `a:${a}`, kind: 'archetype', archetype: a, info: ARCHETYPE_INFO[a], color: '#8a7350' });

const SECTIONS: { id: string; title: string; items: Item[] }[] = [
  { id: 'antique', title: 'Antiquité et Moyen Âge', items: FACTIONS.filter((f) => !NAPO.includes(f) && !ASIA.includes(f)).map(factionItem) },
  { id: 'napoleon', title: 'Époque napoléonienne', items: NAPO.map(factionItem) },
  { id: 'asie', title: 'Asie orientale', items: ASIA.map(factionItem) },
  { id: 'persos', title: 'Personnages', items: ARCHETYPES.map(archetypeItem) },
];

const norm = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Redimensionne un SVG de figurine (décoratif : le nom est porté par le bouton). */
function scaled(svg: string, scale: number): string {
  return svg
    .replace(/width="(\d+)" height="(\d+)"/, (_m, w: string, h: string) => `width="${Number(w) * scale}" height="${Number(h) * scale}"`)
    .replace(/ role="img" aria-label="[^"]*"/, ' aria-hidden="true"');
}

const Svg = ({ html, className }: { html: string; className?: string }) => (
  <span className={className} aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />
);

/** Soldat qui marche (alternance des deux frames) tant que `active`. */
function Figure({ item, scale, active }: { item: Item; scale: number; active: boolean }) {
  const [frame, setFrame] = useState<0 | 1>(0);
  useEffect(() => {
    if (!active || item.kind !== 'faction' || prefersReducedMotion()) {
      setFrame(0);
      return;
    }
    const t = window.setInterval(() => setFrame((f) => (f === 0 ? 1 : 0)), 260);
    return () => window.clearInterval(t);
  }, [active, item.kind]);
  const svg = item.kind === 'faction' ? soldierSvg(item.faction!, frame) : characterSvg(item.archetype!);
  return <Svg html={scaled(svg, scale)} className="gallery__fig" />;
}

/* ---------- « Apparaît dans » : calculé depuis le registre d'empires ---------- */

interface Appearance {
  empireId: string;
  empireName: string;
  stepId: string;
  title: string;
  year: number;
  /** Personnages (archétype) : nom du personnage dans l'étape. */
  who?: string;
}

function appearances(item: Item): Appearance[] {
  const out: Appearance[] = [];
  for (const e of EMPIRES) {
    for (const s of e.steps) {
      const base = { empireId: e.id, empireName: e.name, stepId: s.id, title: s.title, year: s.year };
      if (item.kind === 'faction') {
        const hit = s.armies?.some((a) => a.faction === item.faction) || s.figures?.some((f) => f.faction === item.faction);
        if (hit) out.push(base);
      } else {
        const names = s.figures?.filter((f) => f.archetype === item.archetype).map((f) => f.name);
        if (names?.length) out.push({ ...base, who: names.join(', ') });
      }
    }
  }
  return out;
}

function Detail({ item, onBack, onNavigate }: { item: Item; onBack: () => void; onNavigate: Props['onNavigate'] }) {
  const backRef = useRef<HTMLButtonElement>(null);
  useEffect(() => backRef.current?.focus(), []);
  const list = useMemo(() => appearances(item), [item]);
  return (
    <section className="gallery__detail" aria-labelledby="gallery-detail-title">
      <button ref={backRef} type="button" className="btn btn--ghost gallery__back" onClick={onBack}>
        ← Retour à la galerie
      </button>
      <div className="gallery__detail-main">
        <div className="gallery__detail-figs" style={{ borderColor: item.color }}>
          {item.kind === 'faction' ? (
            <>
              <figure>
                <Svg html={scaled(soldierSvg(item.faction!, 0), 5)} />
                <figcaption>Marche 1</figcaption>
              </figure>
              <figure>
                <Svg html={scaled(soldierSvg(item.faction!, 1), 5)} />
                <figcaption>Marche 2</figcaption>
              </figure>
              <figure>
                <Svg html={scaled(soldierSvg(item.faction!, 0, 'vaincu'), 5)} />
                <figcaption>Vaincu</figcaption>
              </figure>
            </>
          ) : (
            <figure>
              <Svg html={scaled(characterSvg(item.archetype!), 5)} />
            </figure>
          )}
        </div>
        <div className="gallery__detail-text">
          <h2 id="gallery-detail-title">{item.info.label}</h2>
          <p className="gallery__era">{item.info.era}</p>
          <p>{item.info.text}</p>
        </div>
      </div>
      <h3>Apparaît dans</h3>
      {list.length === 0 ? (
        <p className="gallery__none">Pas encore représenté dans une étape.</p>
      ) : (
        <ul className="gallery__appears">
          {list.map((a) => (
            <li key={`${a.empireId}/${a.stepId}`}>
              <button type="button" onClick={() => onNavigate(a.empireId, a.stepId)}>
                <span className="gallery__appears-empire">{a.empireName}</span>
                <span className="gallery__appears-title">
                  {a.title}
                  {a.who ? ` — ${a.who}` : ''}
                </span>
                <span className="gallery__appears-year">{formatYear(a.year)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Card({ item, onOpen }: { item: Item; onOpen: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      className="gallery__card"
      data-card
      data-uid={item.uid}
      style={{ borderBottomColor: item.color }}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      onClick={onOpen}
    >
      <Figure item={item} scale={2.5} active={hover} />
      <span className="gallery__name">{item.info.label}</span>
    </button>
  );
}

export function Gallery({ onClose, onNavigate }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Item | null>(null);
  const selectedRef = useRef<Item | null>(null);
  selectedRef.current = selected;
  const lastUid = useRef<string | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => d?.close();
  }, []);

  const q = norm(query.trim());
  const sections = useMemo(
    () =>
      SECTIONS.map((s) => ({
        ...s,
        items: s.items.filter((it) => {
          if (filter === 'soldiers' && it.kind !== 'faction') return false;
          if (filter === 'characters' && it.kind !== 'archetype') return false;
          return !q || norm(`${it.info.label} ${it.info.era}`).includes(q);
        }),
      })).filter((s) => s.items.length > 0),
    [filter, q],
  );
  const count = sections.reduce((n, s) => n + s.items.length, 0);

  const back = () => {
    setSelected(null);
    // Rend le focus à la carte ouverte.
    requestAnimationFrame(() => bodyRef.current?.querySelector<HTMLElement>(`[data-uid="${lastUid.current}"]`)?.focus());
  };

  /** Flèches : déplacement dans la grille (gauche/droite = suivant, haut/bas = ligne voisine). */
  const onGridKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    if (!keys.includes(e.key)) return;
    const cards = [...e.currentTarget.querySelectorAll<HTMLElement>('[data-card]')];
    const i = cards.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    e.preventDefault();
    const cur = cards[i].getBoundingClientRect();
    let target: HTMLElement | undefined;
    if (e.key === 'ArrowRight') target = cards[i + 1];
    else if (e.key === 'ArrowLeft') target = cards[i - 1];
    else if (e.key === 'Home') target = cards[0];
    else if (e.key === 'End') target = cards[cards.length - 1];
    else {
      const down = e.key === 'ArrowDown';
      const rows = cards
        .map((c) => ({ c, r: c.getBoundingClientRect() }))
        .filter(({ r }) => (down ? r.top > cur.top + 8 : r.top < cur.top - 8));
      if (rows.length) {
        const rowTop = down ? Math.min(...rows.map(({ r }) => r.top)) : Math.max(...rows.map(({ r }) => r.top));
        target = rows.filter(({ r }) => Math.abs(r.top - rowTop) < 8).sort((a, b) => Math.abs(a.r.left - cur.left) - Math.abs(b.r.left - cur.left))[0]?.c;
      }
    }
    target?.focus();
    target?.scrollIntoView({ block: 'nearest' });
  };

  return (
    <dialog
      ref={ref}
      className="gallery"
      aria-labelledby="gallery-title"
      onClose={onClose}
      onCancel={(e) => {
        // Échap : d'abord le détail, ensuite la galerie.
        if (selectedRef.current) {
          e.preventDefault();
          back();
        }
      }}
    >
      <header className="gallery__head">
        <h1 id="gallery-title">Galerie des figurines</h1>
        <div className="gallery__tools">
          <div className="gallery__filters" role="group" aria-label="Filtrer par type">
            {(
              [
                ['all', 'Tous'],
                ['soldiers', 'Soldats'],
                ['characters', 'Personnages'],
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" className="btn btn--ghost" aria-pressed={filter === id} onClick={() => setFilter(id)}>
                {label}
              </button>
            ))}
          </div>
          <input
            type="search"
            className="gallery__search"
            placeholder="Rechercher…"
            aria-label="Rechercher une figurine"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="button" className="btn btn--ghost" onClick={() => ref.current?.close()}>
            Fermer
          </button>
        </div>
      </header>

      <div className="gallery__body" ref={bodyRef} onKeyDown={onGridKey}>
        {selected ? (
          <Detail item={selected} onBack={back} onNavigate={onNavigate} />
        ) : (
          <>
            <p className="visually-hidden" aria-live="polite">
              {count} figurine{count > 1 ? 's' : ''}
            </p>
            {sections.map((s) => (
              <section key={s.id} aria-labelledby={`gal-${s.id}`}>
                <h2 id={`gal-${s.id}`} className="gallery__section">
                  {s.title}
                </h2>
                <div className="gallery__grid">
                  {s.items.map((it) => (
                    <Card
                      key={it.uid}
                      item={it}
                      onOpen={() => {
                        lastUid.current = it.uid;
                        setSelected(it);
                      }}
                    />
                  ))}
                </div>
              </section>
            ))}
            {count === 0 && <p className="gallery__none">Aucune figurine ne correspond à « {query} ».</p>}
          </>
        )}
      </div>
    </dialog>
  );
}
