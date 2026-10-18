import { expect, test } from '@playwright/test';

test('le guide répond et déplace la carte', async ({ page }) => {
  await page.route('**/api/chat', (route) =>
    route.fulfill({
      json: {
        reponse: 'Austerlitz, **2 décembre 1805** : victoire de Napoléon.',
        actions: [{ type: 'navigate', empire: 'napoleon', step: 'austerlitz-1805' }],
        session_id: 's1',
        outils_appeles: ['chercher_etapes', 'naviguer_vers_etape'],
      },
    }),
  );
  await page.goto('/?empire=rome&step=zama-202');
  await page.getByRole('button', { name: /Demander au sage/ }).click();
  await page.getByLabel('Ta question au guide').fill('Montre-moi Austerlitz');
  await page.keyboard.press('Enter');
  await expect(page.locator('.chat-msg--bot')).toContainText('victoire de Napoléon');
  await expect(page.locator('.chat-tools')).toContainText('naviguer_vers_etape');
  await expect(page).toHaveURL(/empire=napoleon/);
  await expect(page).toHaveURL(/step=austerlitz-1805/);
  await expect(page.locator('.chat-msg--note')).toContainText('Carte déplacée');
});

test('guide indisponible : message clair', async ({ page }) => {
  await page.route('**/api/chat', (route) => route.fulfill({ status: 503, json: { detail: 'clé absente' } }));
  await page.goto('/?empire=rome&step=zama-202');
  await page.getByRole('button', { name: /Demander au sage/ }).click();
  await page.getByLabel('Ta question au guide').fill('Bonjour');
  await page.keyboard.press('Enter');
  await expect(page.locator('.chat-msg--error')).toContainText('npm run agent');
});
