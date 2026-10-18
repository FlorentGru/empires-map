import { expect, test } from '@playwright/test';

const quiz = {
  source: 'sage',
  quiz: {
    titre: 'Quiz : Rome',
    questions: [
      {
        question: 'En quelle année a lieu Zama ?',
        choix: ['202 av. J.-C.', '216 av. J.-C.', '146 av. J.-C.', '218 av. J.-C.'],
        bonne_reponse: 0,
        explication: 'Zama : 202 av. J.-C.',
        empire: 'rome',
        etape_id: 'zama-202',
      },
      {
        question: 'Qui commande à Cannes côté carthaginois ?',
        choix: ['Hannon', 'Hannibal', 'Hasdrubal', 'Magon'],
        bonne_reponse: 1,
        explication: 'Hannibal à Cannes (216).',
        empire: 'rome',
        etape_id: 'cannes-216',
      },
    ],
  },
};

test('quiz : bonne puis mauvaise réponse, score final', async ({ page }) => {
  await page.route('**/api/quiz', (route) => route.fulfill({ json: quiz }));
  await page.goto('/?empire=rome&step=zama-202');
  await page.getByRole('button', { name: /Quiz/ }).click();
  const dialog = page.getByRole('dialog', { name: /Quiz du sage/ });
  await dialog.getByRole('button', { name: 'Commencer' }).click();
  await expect(dialog.locator('.quiz__badge')).toHaveText('par le sage');
  await dialog.getByRole('button', { name: '202 av. J.-C.' }).click();
  await expect(dialog.locator('.quiz__choice--right')).toHaveText('202 av. J.-C.');
  await expect(dialog.locator('.quiz__verdict')).toContainText('Bonne réponse');
  await dialog.getByRole('button', { name: 'Question suivante' }).click();
  await dialog.getByRole('button', { name: 'Hannon' }).click();
  await expect(dialog.locator('.quiz__choice--wrong')).toHaveText('Hannon');
  await expect(dialog.locator('.quiz__verdict')).toContainText('Hannibal');
  await dialog.getByRole('button', { name: 'Voir mon score' }).click();
  await expect(dialog.locator('.quiz__score')).toHaveText('Score : 1 / 2');
  await expect(dialog.getByRole('button', { name: 'Rejouer' })).toBeVisible();
});

test('sans aucun serveur, le quiz hors ligne est généré dans le navigateur', async ({ page }) => {
  await page.route('**/api/quiz', (route) => route.abort());
  await page.route('**/api/quiz/hors-ligne**', (route) => route.abort());
  await page.goto('/?empire=rome&step=zama-202');
  await page.getByRole('button', { name: /Quiz/ }).click();
  const dialog = page.getByRole('dialog', { name: /Quiz du sage/ });
  await dialog.getByRole('button', { name: 'Commencer' }).click();
  await dialog.getByRole('button', { name: 'Quiz hors ligne' }).click();
  await expect(dialog).toContainText('hors ligne');
  await expect(
    dialog
      .getByRole('button')
      .filter({ hasNotText: /Fermer|Commencer|Rejouer|Quiz hors ligne/ })
      .first(),
  ).toBeVisible();
});
