// Construction du courriel d'avis (fonction pure, testée) : objet préfixé, corps avec le contexte de la page.
export const FEEDBACK_KINDS = {
  idee: 'Idée d’évolution',
  bug: 'Erreur ou bug',
  histoire: 'Contenu historique',
  autre: 'Autre',
} as const;
export type FeedbackKind = keyof typeof FEEDBACK_KINDS;

export interface FeedbackInput {
  kind: FeedbackKind;
  message: string;
  replyTo?: string;
  /** Ce que le visiteur regardait (empire, étape, URL). */
  context?: { empire?: string; step?: string; url?: string };
}

export function feedbackSubject(f: FeedbackInput): string {
  const first = f.message.trim().split(/\s+/).slice(0, 8).join(' ');
  return `[Atlas des Empires] ${FEEDBACK_KINDS[f.kind]}${first ? ` : ${first}${f.message.trim().split(/\s+/).length > 8 ? '…' : ''}` : ''}`;
}

export function feedbackBody(f: FeedbackInput): string {
  const lines = [f.message.trim(), '', '—'];
  lines.push(`Type : ${FEEDBACK_KINDS[f.kind]}`);
  if (f.replyTo?.trim()) lines.push(`Répondre à : ${f.replyTo.trim()}`);
  if (f.context?.empire) lines.push(`Empire : ${f.context.empire}${f.context.step ? ` · étape ${f.context.step}` : ''}`);
  if (f.context?.url) lines.push(`Page : ${f.context.url}`);
  return lines.join('\n');
}

export function feedbackMailto(to: string, f: FeedbackInput): string {
  return `mailto:${to}?subject=${encodeURIComponent(feedbackSubject(f))}&body=${encodeURIComponent(feedbackBody(f))}`;
}
