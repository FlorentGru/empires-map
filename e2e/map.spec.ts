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

test('caméra libre : aucun empire n’enferme la carte (on peut aller voir ses contemporains)', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/?empire=saint-empire&e2e');
  await page.waitForFunction(() => (window as any).__map?.loaded(), null, { timeout: 60_000 });
  expect(await page.evaluate(() => (window as any).__map.getMaxBounds())).toBeNull();
  // Après le vol de caméra vers l'étape : on part vers Pékin, loin du Saint-Empire, et la carte y reste.
  await page.waitForFunction(() => !(window as any).__map.isMoving(), null, { timeout: 30_000 });
  const lng = await page.evaluate(() => {
    const m = (window as any).__map;
    m.jumpTo({ center: [116.4, 39.9], zoom: 4 });
    return m.getCenter().lng;
  });
  expect(lng).toBeGreaterThan(110);
});
