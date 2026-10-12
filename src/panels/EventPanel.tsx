import Markdown from 'react-markdown';
import { memo, useEffect, useRef, type ComponentProps, type CSSProperties } from 'react';
import { prefersReducedMotion } from '../lib/motion';
import type { StorySegment } from '../story/script';
import { eventMeta } from '../lib/eventTypes';
import { formatYear } from '../lib/years';
import type { BattleInfo, TimelineStep } from '../types';

interface Props {
  step: TimelineStep | undefined;
  open: boolean;
  onToggle: () => void;
  /** Mode Histoire actif : segments racontés et index du segment en cours (-1 = aucun). */
  story?: { segments: StorySegment[]; current: number; silent: boolean } | null;
}

const markdownComponents = {
  // `node` (AST) est retiré pour ne pas finir en attribut DOM.
  a: ({ node: _node, ...props }: ComponentProps<'a'> & { node?: unknown }) => (
    <a {...props} target="_blank" rel="noopener noreferrer" />
  ),
};

export const EventPanel = memo(function EventPanel({ step, open, onToggle, story }: Props) {
  const meta = step ? eventMeta(step.type) : null;
  const bodyRef = useRef<HTMLDivElement>(null);
  const segs = story?.segments ?? [];
  const current = story?.current ?? -1;
  const reading = (i: number) => (i === current ? ' is-reading' : '');
  const segText = current >= 0 ? segs[current]?.text : '';

  // Défilement doux vers la phrase lue (instantané si mouvement réduit).
  useEffect(() => {
    const body = bodyRef.current;
    if (!story || current < 0 || !body) return;
    const el = body.querySelector<HTMLElement>(`[data-seg="${current}"]`);
    if (!el) return;
    const b = body.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (r.top >= b.top + 40 && r.bottom <= b.bottom - 40) return;
    body.scrollTo({ top: body.scrollTop + (r.top - b.top) - b.height / 3, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, [current, story?.segments]); // eslint-disable-line react-hooks/exhaustive-deps

  const indexed = segs.map((s, i) => ({ s, i }));
  const ofKind = (k: StorySegment['kind']) => indexed.filter((x) => x.s.kind === k);
  const dateIdx = ofKind('date')[0]?.i ?? -1;
  const titleIdx = ofKind('title')[0]?.i ?? -1;
  const consIdx = ofKind('consequence')[0]?.i ?? -1;
  const detailParas = new Map<number, { s: StorySegment; i: number }[]>();
  for (const x of ofKind('details')) {
    const k = x.s.para ?? 0;
    detailParas.set(k, [...(detailParas.get(k) ?? []), x]);
  }
  return (
    <aside className={`event-panel${open ? '' : ' event-panel--collapsed'}`} aria-label="Détails de l'événement">
      <button
        type="button"
        className="event-panel__toggle"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls="event-panel-body"
        aria-label={open ? 'Replier le panneau' : 'Déplier le panneau'}
      >
        <span className="event-panel__toggle-title">{step?.title ?? 'Événement'}</span>
        <span aria-hidden="true" className="event-panel__chevron">
          ▾
        </span>
      </button>

      {story && (
        <p className="visually-hidden" aria-live="polite">{segText}</p>
      )}
      {step && meta && (
        <div id="event-panel-body" className="event-panel__body" hidden={!open} ref={bodyRef}>
          <article key={step.id} className="event-panel__content">
            <header>
              <div className="event-panel__meta">
                <time className={`event-panel__date${reading(dateIdx)}`} data-seg={dateIdx}>{formatYear(step.year)}</time>
                <span className="badge" style={{ '--badge-color': meta.color } as CSSProperties}>
                  <span aria-hidden="true">{meta.icon}</span> {meta.label}
                </span>
              </div>
              <h2 className={`event-panel__title${reading(titleIdx)}`} data-seg={titleIdx}>{step.title}</h2>
              <p className="event-panel__summary">
                {story
                  ? ofKind('summary').map(({ s, i }) => (
                      <span key={i} data-seg={i} className={`story-sentence${reading(i)}`}>{s.text} </span>
                    ))
                  : step.summary}
              </p>
            </header>

            {story && story.silent && (
              <p className="story-note" role="status">Voix française indisponible : lecture silencieuse</p>
            )}
            {story ? (
              <div className="prose story-text">
                {[...detailParas.entries()].map(([k, items]) => (
                  <p key={k}>
                    {items.map(({ s, i }) => (
                      <span key={i} data-seg={i} className={`story-sentence${reading(i)}`}>{s.text} </span>
                    ))}
                  </p>
                ))}
              </div>
            ) : (
              <div className="prose">
                <Details text={step.details} />
              </div>
            )}
            {story && ofKind('quote').length > 0 && (
              <section className="story-quotes">
                <h3>Paroles</h3>
                {ofKind('quote').map(({ s, i }) => (
                  <p key={i} data-seg={i} className={`story-sentence story-sentence--quote${reading(i)}`}>{s.text}</p>
                ))}
              </section>
            )}

            {step.battle && <BattleBlock battle={step.battle} />}

            {step.consequences.length > 0 && (
              <section>
                <h3>Conséquences</h3>
                <ul>
                  {step.consequences.map((c, ci) => (
                    <li key={c} data-seg={ci === 0 ? consIdx : undefined} className={ci === 0 ? `story-sentence${reading(consIdx)}` : undefined}>{c}</li>
                  ))}
                </ul>
              </section>
            )}

            {step.sources.length > 0 && (
              <section className="event-panel__sources">
                <h3>Sources</h3>
                <ul>
                  {step.sources.map((s) => (
                    <li key={s.label + (s.url ?? '')}>
                      {s.url ? (
                        <a href={s.url} target="_blank" rel="noopener noreferrer">
                          {s.label}
                        </a>
                      ) : (
                        s.label
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </article>
        </div>
      )}
    </aside>
  );
});

/** Le markdown (coûteux) ne se re-rend que si le texte change. */
const Details = memo(function Details({ text }: { text: string }) {
  return <Markdown components={markdownComponents}>{text}</Markdown>;
});

function BattleBlock({ battle }: { battle: BattleInfo }) {
  const rows: [string, string | undefined][] = [
    ['Belligérants', battle.belligerents.join(battle.belligerents.length === 2 ? ' contre ' : ', ')],
    ['Commandants', battle.commanders.join(', ')],
    ['Issue', battle.outcome],
    ['Forces', battle.forces],
    ['Pertes', battle.losses],
  ];
  return (
    <section className="battle">
      <h3>
        <span aria-hidden="true">⚔</span> Bataille
      </h3>
      <dl>
        {rows
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
      </dl>
    </section>
  );
}
