import { expect, test } from '@playwright/test';
import { collectErrors } from './helpers';

test('galerie : figurines, personnages, monuments, catastrophes, inventions et « Voir sur la carte »', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?empire=rome&step=zama-202');
  await page.getByRole('button', { name: 'Galerie', exact: true }).click();
  const dialog = page.locator('dialog.gallery');
  await expect(dialog).toHaveAttribute('open', '');
  await expect.poll(() => dialog.locator('.gallery__card').count()).toBeGreaterThanOrEqual(50);
  await dialog.locator('.gallery__card').first().click();
  await expect(dialog.locator('.gallery__detail')).toBeVisible();

  // Monuments : bandeau des sept merveilles, badge sur leur fiche.
  await page.getByRole('button', { name: 'Monuments', exact: true }).click();
  await expect(dialog.locator('.monuments__wonders .gallery__card')).toHaveCount(7);
  await dialog
    .locator('.monuments__wonders')
    .getByRole('button', { name: /^Colosse de Rhodes/ })
    .click();
  await expect(dialog.locator('.gallery__detail .wonder-badge')).toBeVisible();
  await page.getByRole('button', { name: /Retour aux monuments/ }).click();

  // Chaque onglet de contenu : une fiche s'ouvre.
  const tabs: [string, RegExp, string][] = [
    ['Personnages illustres', /Jules César/, 'Jules César'],
    ['Monuments', /^Colisée/, 'Colisée'],
    ['Catastrophes et guerres', /^Peste noire/, 'Peste noire'],
    ['Inventions', /^Béton/, ''],
  ];
  for (const [tab, card, heading] of tabs) {
    await page.getByRole('button', { name: tab, exact: true }).click();
    await page.getByRole('button', { name: card }).first().click();
    if (heading) await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }
  // « Voir sur la carte » depuis une fiche.
  await page.locator('.gallery__appears button').first().click();
  await expect(page).toHaveURL(/empire=rome&step=/);
  expect(errors).toEqual([]);
});
