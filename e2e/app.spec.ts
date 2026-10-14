import { expect, test } from '@playwright/test';
import { collectErrors } from './helpers';

test('la page se charge sur une étape, sans erreur console', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?empire=rome&step=zama-202');
  await expect(page.locator('.event-panel__toggle-title')).toContainText(/Zama/i);
  await expect(page.locator('.maplibregl-canvas')).toBeVisible();
  await page.waitForLoadState('networkidle').catch(() => {});
  expect(errors).toEqual([]);
});

test('« suivant » change d’étape et l’URL', async ({ page }) => {
  await page.goto('/?empire=rome&step=zama-202');
  const title = page.locator('.event-panel__toggle-title');
  await expect(title).toContainText(/Zama/i);
  const before = await title.textContent();
  await page.getByRole('button', { name: 'Étape suivante' }).click();
  await expect(page).toHaveURL(/step=pydna-168/);
  await expect(title).not.toHaveText(before ?? '');
});

test('le sélecteur d’empire bascule sur la Chine', async ({ page }) => {
  await page.goto('/?empire=rome&step=zama-202');
  await page.locator('.empire-picker__current').click();
  await page.locator('.empire-group__toggle', { hasText: 'Asie' }).click();
  await page.locator('.empire-card', { hasText: /Chine/ }).first().click();
  await expect(page).toHaveURL(/empire=china/);
});

test('mode Histoire : la phrase lue est surlignée', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?empire=rome&step=zama-202');
  const btn = page.locator('button.story-btn');
  await btn.click();
  await expect(btn).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.is-reading').first()).toBeVisible({ timeout: 20_000 });
  expect(errors).toEqual([]);
});
