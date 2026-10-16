import { describe, expect, it } from 'vitest';
import { feedbackBody, feedbackMailto, feedbackSubject } from '../../src/feedback/feedback';

const f = { kind: 'idee' as const, message: 'Ajouter les Incas avec la conquête espagnole du Pérou', replyTo: 'a@b.fr', context: { empire: 'rome', step: 'cannes-216', url: 'http://x/?empire=rome' } };

describe('courriel de feedback', () => {
  it("préfixe l'objet et le tronque après 8 mots", () => {
    expect(feedbackSubject(f)).toBe('[Atlas des Empires] Idée d’évolution : Ajouter les Incas avec la conquête espagnole du…');
    expect(feedbackSubject({ kind: 'bug', message: 'Carte vide' })).toBe('[Atlas des Empires] Erreur ou bug : Carte vide');
  });

  it('joint le type, la réponse et le contexte de la page', () => {
    const body = feedbackBody(f);
    expect(body.startsWith(f.message)).toBe(true);
    expect(body).toContain('Répondre à : a@b.fr');
    expect(body).toContain('Empire : rome · étape cannes-216');
    expect(body).toContain('Page : http://x/?empire=rome');
  });

  it('encode le lien mailto', () => {
    const url = feedbackMailto('contact@exemple.fr', f);
    expect(url.startsWith('mailto:contact@exemple.fr?subject=%5BAtlas')).toBe(true);
    expect(decodeURIComponent(url.split('&body=')[1]!)).toBe(feedbackBody(f));
  });
});
