import Markdown from 'react-markdown';
import type { ComponentProps, CSSProperties } from 'react';
import { eventMeta } from '../lib/eventTypes';
import { formatYear } from '../lib/years';
import type { BattleInfo, TimelineStep } from '../types';

interface Props {
  step: TimelineStep | undefined;
  open: boolean;
  onToggle: () => void;
}

const markdownComponents = {
  // `node` (AST) est retiré pour ne pas finir en attribut DOM.
  a: ({ node: _node, ...props }: ComponentProps<'a'> & { node?: unknown }) => (
    <a {...props} target="_blank" rel="noopener noreferrer" />
  ),
};

export function EventPanel({ step, open, onToggle }: Props) {
  const meta = step ? eventMeta(step.type) : null;
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

      {step && meta && (
        <div id="event-panel-body" className="event-panel__body" hidden={!open}>
          <article key={step.id} className="event-panel__content">
            <header>
              <div className="event-panel__meta">
                <time className="event-panel__date">{formatYear(step.year)}</time>
                <span className="badge" style={{ '--badge-color': meta.color } as CSSProperties}>
                  <span aria-hidden="true">{meta.icon}</span> {meta.label}
                </span>
              </div>
              <h2 className="event-panel__title">{step.title}</h2>
              <p className="event-panel__summary">{step.summary}</p>
            </header>

            <div className="prose">
              <Markdown components={markdownComponents}>{step.details}</Markdown>
            </div>

            {step.battle && <BattleBlock battle={step.battle} />}

            {step.consequences.length > 0 && (
              <section>
                <h3>Conséquences</h3>
                <ul>
                  {step.consequences.map((c) => (
                    <li key={c}>{c}</li>
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
}

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
