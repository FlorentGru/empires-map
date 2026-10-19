import { expect, test } from '@playwright/test';
import { collectErrors } from './helpers';

const hovered = `(async () => ((await window.__map.getSource('territory-hover').getData()).features.length))()`;
/** Position écran (page) d'un point [lon, lat] de la carte. */
const screenOf = (lonLat: [number, number]) =>
  `(() => { const m = window.__map; const p = m.project(${JSON.stringify(lonLat)}); const r = m.getCanvas().getBoundingClientRect(); return [r.left + p.x, r.top + p.y]; })()`;

test('régions : à l’arrêt, survol = surbrillance, clic = fiche d’explication', async ({ page }) => {
  test.setTimeout(150_000);
  const errors = collectErrors(page);
  await page.goto('/?empire=rome&step=tetrarchie-285&e2e');
  await page.waitForFunction(() => (window as any).__map?.getSource('territory-hover'), null, { timeout: 60_000 });
  // Pas de map.loaded() : sur le CI, des tuiles chargent encore longtemps. On attend la fin du vol de caméra,
  // puis on survole Trèves (part de Constance Chlore) en recalculant sa position à chaque essai.
  await page.waitForFunction(() => !(window as any).__map.isMoving(), null, { timeout: 60_000 });
  let [x, y] = [0, 0];
  await expect
    .poll(
      async () => {
        [x, y] = (await page.evaluate(screenOf([6.64, 49.75]))) as [number, number];
        await page.mouse.move(x - 2, y);
        await page.mouse.move(x, y);
        return page.evaluate(hovered);
      },
      { timeout: 60_000 },
    )
    .toBe(1);
  await page.mouse.click(x, y);
  const card = page.locator('.map-card');
  await expect(card).toContainText('Constance Chlore');
  await expect(card).toContainText('Augusta Treverorum');
  await expect(card).toContainText("Cœur de l'empire");

  // En lecture, plus de survol ni de fiche.
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Lecture', exact: true }).click();
  await page.mouse.move(x + 3, y + 3);
  await expect.poll(() => page.evaluate(hovered)).toBe(0);
  expect(errors).toEqual([]);
});
