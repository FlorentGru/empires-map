import { useEffect, useMemo, useRef, useState } from 'react';
import TROOPS from '../../data/battles/troops.json';
import { EMPIRES } from '../data/loadEmpire';
import { loadBattleScenario } from '../data/loadBattles';
import { prefersReducedMotion } from '../lib/motion';
import { formatYear } from '../lib/years';
import { durationOf, stateAt } from '../battle/engine';
import { clearSceneryCache, drawBattle } from '../battle/render';
import { loadSprites, type FactionSprites } from '../battle/sprites';
import { SCENE_SCALE, sceneScenario, unitsMatching, UNIT_BY_ID, type UnitInfo } from '../battle/unitInfo';
import { battlesUsing, type BattleRef, type BattleSource } from '../battle/unitUsage';
import type { BattleScenario, BattleTroopsFile } from '../types-battle';

/** Taille interne du canvas d'une mini-scène et zoom sur le centre du terrain (qui fait 100 x 60 unités). */
const CW = 360;
const CH = 216;
const ZOOM = 3;
/** Centre de la vue, en unités de terrain (la marche va de 34 à 51 : la scène reste dans le cadre). */
const VIEW: [number, number] = [44, 30];

const scenarios = new Map<string, BattleScenario>();
/** Un scénario par unité, partagé entre la carte et la fiche (le paysage est mis en cache par scénario). */
function scenarioOf(info: UnitInfo): BattleScenario {
  let s = scenarios.get(info.id);
  if (!s) scenarios.set(info.id, (s = sceneScenario(info.scene)));
  return s;
}

/**
 * Mini-scène : une unité jouée par le vrai moteur de bataille (marche puis combat, en boucle).
 * Animée seulement quand elle est visible à l'écran ; image fixe si l'utilisateur préfère moins de mouvement.
 */
function MiniScene({ info, className }: { info: UnitInfo; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sprites, setSprites] = useState<FactionSprites | null>(null);
  const [visible, setVisible] = useState(false);
  const scenario = useMemo(() => scenarioOf(info), [info]);
  const duration = useMemo(() => durationOf(scenario), [scenario]);
  const tRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    loadSprites(info.scene.faction).then(
      (s) => !cancelled && setSprites(s),
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [info]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver((entries) => setVisible(entries.some((e) => e.isIntersecting)));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !sprites || !visible) return;
    const { faction, biome, year } = info.scene;
    const W = CW * ZOOM;
    const H = CH * ZOOM;
    const paint = () => {
      ctx.setTransform(1, 0, 0, 1, CW / 2 - (VIEW[0] / 100) * W, CH / 2 - (VIEW[1] / 60) * H);
      drawBattle(ctx, W, H, scenario, stateAt(scenario, SCENE_SCALE, tRef.current, [faction]), [sprites], biome, year);
    };
    // Mouvement réduit : une image fixe, en plein combat.
    if (prefersReducedMotion()) {
      tRef.current = duration * 0.7;
      paint();
      // Les poses de combat sont rasterisées à la demande : on redessine une fois qu'elles sont prêtes.
      const again = window.setTimeout(paint, 250);
      return () => window.clearTimeout(again);
    }
    let raf = 0;
    let last: number | null = null;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (last !== null) tRef.current = (tRef.current + (now - last) / 1000) % duration;
      last = now;
      paint();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [sprites, visible, scenario, duration, info]);

  return <canvas ref={canvasRef} className={className ?? 'units__scene'} width={CW} height={CH} aria-hidden="true" />;
}

/* ---------- « Où la voir » ---------- */

let sourcesPromise: Promise<BattleSource[]> | null = null;

/** Batailles jouables (data/battles/troops.json) avec leur scénario historique quand il existe. */
function loadSources(): Promise<BattleSource[]> {
  sourcesPromise ??= Promise.all(
    Object.entries(TROOPS as BattleTroopsFile).map(async ([key, t]): Promise<BattleSource | null> => {
      const [empireId, stepId] = key.split('/') as [string, string];
      const step = EMPIRES.find((e) => e.id === empireId)?.steps.find((s) => s.id === stepId);
      if (!step) return null;
      const scenario = await loadBattleScenario(stepId, empireId);
      return { empireId, stepId, title: step.title, year: step.year, armies: step.armies, troops: t.troops, scenario };
    }),
  ).then((all) => all.filter((s): s is BattleSource => s !== null));
  sourcesPromise.catch(() => (sourcesPromise = null));
  return sourcesPromise;
}

function UnitDetail({ info, onBack, onNavigate }: { info: UnitInfo; onBack: () => void; onNavigate: (empireId: string, stepId: string) => void }) {
  const backRef = useRef<HTMLButtonElement>(null);
  useEffect(() => backRef.current?.focus(), []);
  const [list, setList] = useState<BattleRef[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadSources().then(
      (sources) => !cancelled && setList(battlesUsing(info, sources)),
      () => !cancelled && setList([]),
    );
    return () => {
      cancelled = true;
    };
  }, [info]);
  return (
    <section className="gallery__detail" aria-labelledby="unit-title">
      <button ref={backRef} type="button" className="btn btn--ghost gallery__back" onClick={onBack}>
        ← Retour aux unités de bataille
      </button>
      <div className="gallery__detail-main">
        <div className="gallery__detail-figs units__big">
          <MiniScene info={info} className="units__scene units__scene--big" />
        </div>
        <div className="gallery__detail-text">
          <h2 id="unit-title">{info.label}</h2>
          <p className="gallery__era">{info.era}</p>
          <p>{info.text}</p>
        </div>
      </div>
      <h3>Où la voir</h3>
      {list === null ? (
        <p className="gallery__none">Recherche des batailles…</p>
      ) : list.length === 0 ? (
        <p className="gallery__none">Pas encore dans une bataille jouable.</p>
      ) : (
        <ul className="gallery__appears">
          {list.map((b) => (
            <li key={`${b.empireId}/${b.stepId}`}>
              <button type="button" onClick={() => onNavigate(b.empireId, b.stepId)}>
                <span className="gallery__appears-empire">{EMPIRES.find((e) => e.id === b.empireId)?.name.split(',')[0]}</span>
                <span className="gallery__appears-title">
                  {b.title}
                  {b.historic ? '' : ' (simulation schématique)'}
                </span>
                <span className="gallery__appears-year">{formatYear(b.year)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function UnitCard({ info, onOpen }: { info: UnitInfo; onOpen: () => void }) {
  return (
    <button type="button" className="gallery__card people__card units__card" data-card data-uid={`u:${info.id}`} onClick={onOpen}>
      <MiniScene info={info} />
      <span className="gallery__name">{info.label}</span>
      <span className="people__span">{info.era}</span>
    </button>
  );
}

const GROUPS: { id: UnitInfo['group']; title: string }[] = [
  { id: 'montures', title: 'Montures et engins' },
  { id: 'formations', title: 'Formations' },
];

/**
 * Unités de bataille : montures, engins et formations du moteur, chacune avec sa mini-scène animée et sa fiche.
 * La sélection est tenue par la galerie (l'onglet « Tous » affiche aussi ces cartes).
 */
export function BattleUnitsView({
  query,
  selected,
  onSelect,
  onNavigate,
}: {
  query: string;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onNavigate: (empireId: string, stepId: string) => void;
}) {
  // Les paysages mis en mémoire pour les animations sont rendus à la fermeture de l'onglet.
  useEffect(() => clearSceneryCache, []);
  const items = unitsMatching(query);
  const open = selected ? UNIT_BY_ID.get(selected) : undefined;
  if (open) {
    return (
      <UnitDetail
        info={open}
        onBack={() => {
          onSelect(null);
          requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-uid="u:${open.id}"]`)?.focus());
        }}
        onNavigate={onNavigate}
      />
    );
  }
  return (
    <>
      {GROUPS.map((g) => {
        const list = items.filter((u) => u.group === g.id);
        if (list.length === 0) return null;
        return (
          <section key={g.id} aria-labelledby={`units-${g.id}`}>
            <h2 id={`units-${g.id}`} className="gallery__section">
              {g.title}
            </h2>
            <div className="gallery__grid units__grid">
              {list.map((u) => (
                <UnitCard key={u.id} info={u} onOpen={() => onSelect(u.id)} />
              ))}
            </div>
          </section>
        );
      })}
      {items.length === 0 && <p className="gallery__none">Aucune unité de bataille ne correspond.</p>}
    </>
  );
}
