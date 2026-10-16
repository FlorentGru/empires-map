import { useMemo, useState, type ReactNode } from 'react';
import { EMPIRES, getEmpire } from '../data/loadEmpire';
import { PROFILES } from '../data/loadProfiles';
import { lastStepAtOrBefore } from '../lib/contemporaries';
import { apogeeStepId, formatArea } from '../lib/apogee';
import { apogeePeriod, battleCount, density, factor, formatEstimate, formatNumber, maxAreaIn, mobilisation } from '../lib/compare';
import { formatYear } from '../lib/years';
import { WorldMap } from '../map/WorldMap';
import type { Empire } from '../types';
import type { Estimate, ProfilePeriod } from '../types-profile';
import './compare.css';

interface Props {
  a: string;
  b: string;
  onChange: (a: string, b: string) => void;
  onExit: () => void;
}

const dur = (e: Empire) => `${formatNumber(e.end - e.start)} ans`;
const short = (e: Empire) => e.name.split(',')[0]!;

/** Une carte et sa frise compacte (curseur d'étapes). */
function Pane({ empire, index, onIndex, onEmpire, other }: { empire: Empire; index: number; onIndex: (i: number) => void; onEmpire: (id: string) => void; other: string }) {
  const step = empire.steps[index];
  return (
    <section className="compare-pane" aria-label={`Carte : ${empire.name}`} style={{ '--c': empire.color } as React.CSSProperties}>
      <header className="compare-pane__head">
        <select value={empire.id} onChange={(e) => onEmpire(e.target.value)} aria-label="Empire comparé">
          {EMPIRES.filter((e) => e.id !== other).map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </header>
      <div className="compare-pane__map">
        <WorldMap key={empire.id} empire={empire} index={index} panelOpen={false} tilted={false} relief={false} figures={false} neighbors={false} contemporaries={false} monuments={false} routes={false} disasters={false} compact />
      </div>
      <div className="compare-pane__timeline">
        <input
          type="range"
          min={0}
          max={empire.steps.length - 1}
          value={index}
          onChange={(e) => onIndex(Number(e.target.value))}
          aria-label={`Étape de ${empire.name}`}
          aria-valuetext={step ? `${formatYear(step.year)} — ${step.title}` : undefined}
        />
        <p className="compare-pane__step">
          <strong>{step ? formatYear(step.year) : ''}</strong> {step?.title}
        </p>
      </div>
    </section>
  );
}

function Bar({ a, b, side }: { a?: number; b?: number; side: 'a' | 'b' }) {
  const v = side === 'a' ? a : b;
  const max = Math.max(a ?? 0, b ?? 0);
  if (!v || !max) return null;
  return <span className="compare-bar" style={{ width: `${Math.max(4, (v / max) * 100)}%` }} aria-hidden="true" />;
}

/** Ligne chiffrée : valeurs, barres proportionnelles, écart « ×3,2 », infobulle source/incertitude. */
function NumRow({ label, a, b, fmt, ea, eb }: { label: string; a?: number; b?: number; fmt: (n: number) => string; ea?: Estimate; eb?: Estimate }) {
  if (a === undefined && b === undefined) return null;
  const f = factor(a, b);
  const tip = (e?: Estimate) => (e ? `${e.note ? `${e.note} — ` : ''}Source : ${e.source.label} (${formatYear(e.year)})` : undefined);
  return (
    <tr>
      <th scope="row">{label}</th>
      {(['a', 'b'] as const).map((side) => {
        const v = side === 'a' ? a : b;
        const e = side === 'a' ? ea : eb;
        return (
          <td key={side} title={tip(e)}>
            {v === undefined ? <span className="compare-na">non documenté</span> : <>{e ? formatEstimate(e) : fmt(v)}</>}
            {f?.bigger === side && <span className="compare-factor">{f.ratio}</span>}
            <Bar a={a} b={b} side={side} />
          </td>
        );
      })}
    </tr>
  );
}

function TextRow({ label, a, b }: { label: string; a?: ReactNode; b?: ReactNode }) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td>{a ?? <span className="compare-na">—</span>}</td>
      <td>{b ?? <span className="compare-na">—</span>}</td>
    </tr>
  );
}

const list = (xs?: string[]) => (xs && xs.length ? xs.join(', ') : undefined);

function Section({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details className="compare-section" open={open}>
      <summary>{title}</summary>
      <table className="compare-table">
        <tbody>{children}</tbody>
      </table>
    </details>
  );
}

/**
 * Comparer deux empires : deux cartes côte à côte (dates alignées ou libres), puis un tableau par
 * rubrique (population, économie, armée, politique, société, culture, infrastructures, héritage) à
 * partir des profils data/empires/<id>/profile.json, chaque empire étant pris par défaut à son apogée.
 */
export function CompareView({ a, b, onChange, onExit }: Props) {
  const A = getEmpire(a)!;
  const B = getEmpire(b)!;
  const startIndex = (e: Empire) => Math.max(0, e.steps.findIndex((s) => s.id === apogeeStepId(e)));
  const [ia, setIa] = useState(() => startIndex(A));
  const [ib, setIb] = useState(() => startIndex(B));
  const [align, setAlign] = useState(false);
  const pa = PROFILES[A.id];
  const pb = PROFILES[B.id];
  const [periodA, setPeriodA] = useState<string | undefined>(() => (pa ? apogeePeriod(A, pa)?.id : undefined));
  const [periodB, setPeriodB] = useState<string | undefined>(() => (pb ? apogeePeriod(B, pb)?.id : undefined));
  const PA: ProfilePeriod | undefined = pa?.periods.find((p) => p.id === periodA) ?? pa?.periods[0];
  const PB: ProfilePeriod | undefined = pb?.periods.find((p) => p.id === periodB) ?? pb?.periods[0];

  // Dates alignées : l'autre carte prend sa dernière étape à cette date (ou sa première si l'empire n'existe pas encore).
  const follow = (from: Empire, to: Empire, i: number) => {
    const year = from.steps[i]?.year ?? 0;
    const s = lastStepAtOrBefore(to.steps, year);
    return s ? to.steps.indexOf(s) : 0;
  };
  const moveA = (i: number) => {
    setIa(i);
    if (align) setIb(follow(A, B, i));
  };
  const moveB = (i: number) => {
    setIb(i);
    if (align) setIa(follow(B, A, i));
  };

  const areaA = useMemo(() => (PA ? maxAreaIn(A, PA) : undefined), [A, PA]);
  const areaB = useMemo(() => (PB ? maxAreaIn(B, PB) : undefined), [B, PB]);
  const swap = () => onChange(B.id, A.id);

  return (
    <main className="compare" aria-labelledby="compare-title">
      <header className="compare__bar">
        <button type="button" className="btn btn--ghost" onClick={onExit}>
          ← Retour
        </button>
        <h1 id="compare-title">
          {short(A)} <span aria-hidden="true">⇄</span> {short(B)}
        </h1>
        <button type="button" className="btn btn--ghost" onClick={swap} title="Inverser les deux empires">
          Inverser
        </button>
        <label className="compare__align">
          <input type="checkbox" checked={align} onChange={(e) => setAlign(e.target.checked)} /> Aligner les dates
        </label>
      </header>

      <div className="compare__maps">
        <Pane empire={A} index={ia} onIndex={moveA} onEmpire={(id) => onChange(id, B.id)} other={B.id} />
        <Pane empire={B} index={ib} onIndex={moveB} onEmpire={(id) => onChange(A.id, id)} other={A.id} />
      </div>

      <section className="compare__sheet" aria-label="Comparaison détaillée">
        <table className="compare-table compare-table--head">
          <thead>
            <tr>
              <th scope="col">Période comparée</th>
              {([
                [A, pa, periodA, setPeriodA],
                [B, pb, periodB, setPeriodB],
              ] as const).map(([e, p, val, set]) => (
                <th key={e.id} scope="col" style={{ '--c': e.color } as React.CSSProperties}>
                  <span className="compare-swatch" aria-hidden="true" /> {short(e)}
                  {p ? (
                    <select value={val} onChange={(ev) => set(ev.target.value)} aria-label={`Période de ${e.name}`}>
                      {p.periods.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name} ({formatYear(x.start)} – {formatYear(x.end)})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <small className="compare-na"> profil à venir</small>
                  )}
                </th>
              ))}
            </tr>
          </thead>
        </table>

        <Section title="En bref" open>
          <TextRow label="Durée" a={`${dur(A)} (${formatYear(A.start)} – ${formatYear(A.end)})`} b={`${dur(B)} (${formatYear(B.start)} – ${formatYear(B.end)})`} />
          <NumRow label="Plus grande surface (période)" a={areaA} b={areaB} fmt={formatArea} />
          <TextRow label="Batailles racontées" a={battleCount(A)} b={battleCount(B)} />
        </Section>
        <Section title="Population" open>
          <NumRow label="Habitants" a={PA?.population.total.value} b={PB?.population.total.value} ea={PA?.population.total} eb={PB?.population.total} fmt={formatNumber} />
          <NumRow label="Densité (hab./km²)" a={density(PA?.population.total, areaA)} b={density(PB?.population.total, areaB)} fmt={(n) => n.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} />
          <TextRow
            label="Grandes villes"
            a={PA?.population.cities.map((c) => `${c.name} (${formatNumber(c.population.value)})`).join(', ')}
            b={PB?.population.cities.map((c) => `${c.name} (${formatNumber(c.population.value)})`).join(', ')}
          />
        </Section>
        <Section title="Économie">
          <NumRow label="Part de l'économie mondiale (%)" a={PA?.economy.worldGdpShare?.value} b={PB?.economy.worldGdpShare?.value} ea={PA?.economy.worldGdpShare} eb={PB?.economy.worldGdpShare} fmt={(n) => `${n} %`} />
          <TextRow label="Ressources" a={list(PA?.economy.resources)} b={list(PB?.economy.resources)} />
          <TextRow label="Monnaie" a={PA?.economy.currency} b={PB?.economy.currency} />
          <TextRow label="Fiscalité" a={PA?.economy.taxation} b={PB?.economy.taxation} />
          <TextRow label="Commerce" a={PA?.economy.trade} b={PB?.economy.trade} />
        </Section>
        <Section title="Armée">
          <NumRow label="Effectifs" a={PA?.army.size?.value} b={PB?.army.size?.value} ea={PA?.army.size} eb={PB?.army.size} fmt={formatNumber} />
          <NumRow label="Sous les armes (% de la population)" a={mobilisation(PA?.army.size, PA?.population.total)} b={mobilisation(PB?.army.size, PB?.population.total)} fmt={(n) => `${n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %`} />
          <TextRow label="Composition" a={PA?.army.composition} b={PB?.army.composition} />
          <TextRow label="Recrutement" a={PA?.army.recruitment} b={PB?.army.recruitment} />
          <TextRow label="Unités célèbres" a={list(PA?.army.famousUnits)} b={list(PB?.army.famousUnits)} />
          <TextRow label="Innovations" a={list(PA?.army.innovations)} b={list(PB?.army.innovations)} />
        </Section>
        <Section title="Politique et fonctionnement">
          <TextRow label="Régime" a={PA?.politics.regime} b={PB?.politics.regime} />
          <TextRow label="Chef de l'État" a={PA?.politics.head} b={PB?.politics.head} />
          <TextRow label="Succession" a={PA?.politics.succession} b={PB?.politics.succession} />
          <TextRow label="Institutions" a={PA?.politics.institutions} b={PB?.politics.institutions} />
          <TextRow label="Administration" a={PA?.politics.administration} b={PB?.politics.administration} />
          <NumRow label="Provinces" a={PA?.politics.provinces?.value} b={PB?.politics.provinces?.value} ea={PA?.politics.provinces} eb={PB?.politics.provinces} fmt={formatNumber} />
          <TextRow label="Droit" a={PA?.politics.law} b={PB?.politics.law} />
        </Section>
        <Section title="Société">
          <TextRow label="Religions" a={list(PA?.society.religions)} b={list(PB?.society.religions)} />
          <TextRow label="Langues" a={list(PA?.society.languages)} b={list(PB?.society.languages)} />
          <TextRow label="Structure sociale" a={PA?.society.structure} b={PB?.society.structure} />
          <TextRow label="Place des femmes" a={PA?.society.women} b={PB?.society.women} />
        </Section>
        <Section title="Culture, sciences et techniques">
          <TextRow label="Inventions" a={list(PA?.culture.inventions)} b={list(PB?.culture.inventions)} />
          <TextRow label="Œuvres" a={list(PA?.culture.works)} b={list(PB?.culture.works)} />
          <TextRow label="Savants et penseurs" a={list(PA?.culture.scholars)} b={list(PB?.culture.scholars)} />
        </Section>
        <Section title="Infrastructures">
          <NumRow label="Routes (km)" a={PA?.infrastructure.roads?.value} b={PB?.infrastructure.roads?.value} ea={PA?.infrastructure.roads} eb={PB?.infrastructure.roads} fmt={formatNumber} />
          <TextRow label="En résumé" a={PA?.infrastructure.summary} b={PB?.infrastructure.summary} />
        </Section>
        <Section title="Héritage">
          <TextRow label="Ce qui reste" a={PA?.legacy} b={PB?.legacy} />
        </Section>
        <p className="compare__note">Chiffres : estimations d'historiens, avec leur fourchette. Survolez une valeur pour sa source et son incertitude.</p>
      </section>
    </main>
  );
}
