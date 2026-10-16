import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import Markdown from 'react-markdown';
import { Character } from '../figures/characters';
import './chat.css';

/** Ce que l'utilisateur regarde, envoyé au guide avec chaque question. */
export interface ChatContext {
  empire: string;
  step?: string;
  titre?: string;
}

interface Action {
  type: 'navigate';
  empire: string;
  step: string;
}

interface Msg {
  role: 'user' | 'bot' | 'error' | 'note';
  text: string;
  tools?: string[];
}

const SERVER_DOWN = "Le guide n'est pas lancé : ouvre un terminal et lance `npm run agent` (voir agent/README.md).";

interface Props {
  context: ChatContext | null;
  /** Navigation existante de l'app (même fonction que la galerie). */
  goToStep: (empire: string, step: string) => void;
}

export function ChatPanel({ context, goToStep }: Props) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const sessionId = useRef<string | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [msgs, busy]);

  const close = () => {
    setOpen(false);
    setTimeout(() => fabRef.current?.focus(), 0);
  };

  async function send(e: FormEvent) {
    e.preventDefault();
    const message = input.trim();
    if (!message || busy) return;
    setInput('');
    setBusy(true);
    setMsgs((m) => [...m, { role: 'user', text: message }]);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, session_id: sessionId.current, contexte: context }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { reponse: string; actions: Action[]; session_id: string; outils_appeles: string[] };
      sessionId.current = data.session_id;
      const added: Msg[] = [{ role: 'bot', text: data.reponse || '(pas de réponse)', tools: data.outils_appeles }];
      for (const a of data.actions ?? []) {
        if (a.type === 'navigate') {
          goToStep(a.empire, a.step);
          added.push({ role: 'note', text: `📍 Carte déplacée sur ${a.empire} / ${a.step}` });
        }
      }
      setMsgs((m) => [...m, ...added]);
    } catch {
      setMsgs((m) => [...m, { role: 'error', text: SERVER_DOWN }]);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button ref={fabRef} type="button" className="chat-fab" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <span className="chat-fab__sage" aria-hidden="true"><Character archetype="sage" width={38} height={51} /></span>
        Demander au sage
      </button>
    );
  }
  return (
    <section className="chat-panel" role="dialog" aria-label="Guide de l'Atlas" onKeyDown={(e) => e.key === 'Escape' && close()}>
      <div className="chat-panel__head">
        <span className="chat-panel__title">
          <Character archetype="sage" width={24} height={32} />
          Le sage de l'Atlas
        </span>
        <button type="button" className="chat-panel__close" onClick={close} aria-label="Fermer le guide">✕</button>
      </div>
      <div className="chat-log" ref={logRef} aria-live="polite">
        {msgs.length === 0 && <p className="chat-msg chat-msg--note">Pose une question sur l'histoire, ou demande « montre-moi Cannes ».</p>}
        {msgs.map((m, i) => {
          const msg = (
            <div key={i} className={`chat-msg chat-msg--${m.role === 'user' ? 'user' : m.role === 'bot' ? 'bot' : m.role === 'error' ? 'bot chat-msg--error' : 'note'}`}>
              {m.role === 'bot' || m.role === 'error' ? <Markdown>{m.text}</Markdown> : m.text}
              {m.tools && m.tools.length > 0 && <div className="chat-tools">Outils : {m.tools.join(', ')}</div>}
            </div>
          );
          // Les réponses du guide sont précédées du portrait du sage.
          return m.role === 'bot' ? (
            <div key={i} className="chat-row">
              <span className="chat-avatar" aria-hidden="true"><Character archetype="sage" width={22} height={29} /></span>
              {msg}
            </div>
          ) : msg;
        })}
        {busy && (
          <div className="chat-thinking" role="status">
            <span className="chat-avatar chat-avatar--thinking" aria-hidden="true"><Character archetype="sage" width={22} height={29} /></span>
            le sage réfléchit…
          </div>
        )}
      </div>
      <form className="chat-form" onSubmit={send}>
        <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ta question…" aria-label="Ta question au guide" disabled={busy} />
        <button type="submit" disabled={busy || !input.trim()}>Envoyer</button>
      </form>
    </section>
  );
}
