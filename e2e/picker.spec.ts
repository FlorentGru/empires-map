import { expect, test } from '@playwright/test';
import { collectErrors } from './helpers';

test('sélecteur d’empire : passage à l’Empire espagnol, sans erreur', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?empire=rome&step=zama-202');
  await page.locator('.empire-picker__current').click();
  // Groupe qui contient la carte (le sélecteur déplie déjà la région de l'empire affiché).
  const group = page.locator('.empire-group', { has: page.locator('.empire-card', { hasText: /Empire espagnol/ }) }).first();
  const toggle = group.locator('.empire-group__toggle');
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
  await group
    .locator('.empire-card', { hasText: /Empire espagnol/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/espagne\//);
  await expect(page.locator('.timeline__title')).toHaveText(/Grenade/);
  expect(errors).toEqual([]);
});
