import { expect, test } from '@playwright/test';

test('inventions : marqueur de frise, fiche sur la carte et panneau de l’étape', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/?empire=china&step=turbans-jaunes-184&e2e');
  await page.waitForFunction(() => (window as any).__map?.getLayer('inventions-icons'), null, { timeout: 60_000 });
  // Le papier (105) est déjà apparu : marqueur de frise → fiche.
  await page.getByRole('button', { name: /Invention : Papier, / }).click();
  const card = page.getByRole('dialog', { name: /Papier/ });
  await expect(card).toBeVisible({ timeout: 30_000 });
  await expect(card).toContainText('révolutionnaire');
});

test('galerie : onglet Inventions et « Voir sur la carte »', async ({ page }) => {
  await page.goto('/?empire=napoleon&step=brumaire-1799');
  await page.getByRole('button', { name: 'Galerie' }).click();
  await page.getByRole('button', { name: 'Inventions', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Inventions révolutionnaires' })).toBeVisible();
  await page.getByRole('button', { name: /^Code civil/ }).click();
  await expect(page.getByRole('heading', { name: 'Code civil des Français' })).toBeVisible();
  await page.locator('.gallery__appears button').first().click();
  await expect(page).toHaveURL(/empire=napoleon&step=/);
});

test('Empire espagnol : disponible dans le sélecteur, étape affichée sans erreur', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?empire=rome&step=zama-202');
  await page.locator('.empire-picker__current').click();
  // Groupe qui contient réellement la carte (indépendant du nom de la région), déplié avant le clic.
  const group = page.locator('.empire-group', { has: page.locator('.empire-card', { hasText: /Empire espagnol/ }) }).first();
  const toggle = group.locator('.empire-group__toggle');
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await group
    .locator('.empire-card', { hasText: /Empire espagnol/ })
    .first()
    .click();
  await expect(page).toHaveURL(/empire=espagne/);
  await expect(page.locator('.timeline__title')).toHaveText(/Grenade/);
  expect(errors).toEqual([]);
});
