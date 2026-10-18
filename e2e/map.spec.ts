import { expect, test } from '@playwright/test';
import { collectErrors } from './helpers';

test('carte : chargement sans erreur, étape suivante, glissement des frontières, apogée', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?empire=rome&step=zama-202');
  const title = page.locator('.event-panel__toggle-title');
  await expect(title).toContainText(/Zama/i);
  await expect(page.locator('.maplibregl-canvas')).toBeVisible();
  // Étape suivante : URL mise à jour, frontières qui glissent (SDF) plutôt qu'un simple fondu.
  const map = page.locator('.world-map');
  await expect(map).toHaveAttribute('data-transition', 'fondu');
  await page.getByRole('button', { name: 'Étape suivante' }).click();
  await expect(page).toHaveURL(/step=pydna-168/);
  await expect(map).toHaveAttribute('data-transition', 'sdf', { timeout: 30_000 });
  // Apogée marquée sur la frise, et un clic y mène.
  await page.getByRole('button', { name: /apogée de l'empire/ }).click();
  await expect(page).toHaveURL(/step=trajan-117/);
  await expect(page.locator('.timeline__apogee-badge')).toContainText(/M km²/);
  expect(errors).toEqual([]);
});
