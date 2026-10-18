import { useEffect, useRef, useState, type FormEvent } from 'react';
import { FEEDBACK_EMAIL } from '../config';
import { FEEDBACK_KINDS, feedbackBody, feedbackMailto, type FeedbackKind } from './feedback';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Ce que le visiteur regarde, joint au message. */
  empire: string;
  step?: string;
}

/**
 * « Votre avis » : formulaire qui ouvre la messagerie du visiteur avec un courriel pré-rempli (mailto).
 * Aucun serveur ni service tiers ; « Copier le message » sert de secours sans messagerie configurée.
 */
export function FeedbackDialog({ open, onClose, empire, step }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [kind, setKind] = useState<FeedbackKind>('idee');
  const [message, setMessage] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
    if (open) setCopied(false);
  }, [open]);

  const input = { kind, message, replyTo, context: { empire, step, url: typeof window !== 'undefined' ? window.location.href : undefined } };
  const ready = message.trim().length >= 5;

  function send(e: FormEvent) {
    e.preventDefault();
    if (!ready || !FEEDBACK_EMAIL) return;
    window.location.href = feedbackMailto(FEEDBACK_EMAIL, input);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${FEEDBACK_EMAIL ? `À : ${FEEDBACK_EMAIL}\n` : ''}${feedbackBody(input)}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <dialog
      ref={ref}
      className="about feedback"
      aria-labelledby="feedback-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // clic sur le fond
      }}
    >
      <form className="about__inner feedback__form" onSubmit={send}>
        <h2 id="feedback-title">Votre avis</h2>
        <p>Une idée d'évolution, une erreur, un empire à ajouter ? Écrivez-moi : chaque message est lu.</p>

        <fieldset className="feedback__kinds">
          <legend>Type de message</legend>
          {(Object.keys(FEEDBACK_KINDS) as FeedbackKind[]).map((k) => (
            <label key={k}>
              <input type="radio" name="feedback-kind" value={k} checked={kind === k} onChange={() => setKind(k)} />
              {FEEDBACK_KINDS[k]}
            </label>
          ))}
        </fieldset>

        <label className="feedback__field">
          Message
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            required
            minLength={5}
            placeholder="Votre suggestion ou ce que vous avez remarqué…"
          />
        </label>
        <label className="feedback__field">
          Votre e-mail <span className="feedback__hint">(facultatif, pour vous répondre)</span>
          <input type="email" value={replyTo} onChange={(e) => setReplyTo(e.target.value)} autoComplete="email" />
        </label>
        <p className="feedback__hint">
          L'empire et l'étape affichés ({empire}
          {step ? ` · ${step}` : ''}) sont joints au message.
        </p>

        {FEEDBACK_EMAIL ? (
          <div className="feedback__actions">
            <button type="submit" className="btn" disabled={!ready}>
              Envoyer par e-mail
            </button>
            <button type="button" className="btn btn--ghost" disabled={!ready} onClick={copy}>
              {copied ? 'Message copié ✓' : 'Copier le message'}
            </button>
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Fermer
            </button>
          </div>
        ) : (
          <div className="feedback__actions">
            <p className="feedback__soon" role="status">
              Adresse de contact bientôt disponible.
            </p>
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Fermer
            </button>
          </div>
        )}
      </form>
    </dialog>
  );
}
