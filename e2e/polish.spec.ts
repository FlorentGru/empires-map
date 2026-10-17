import { expect, test } from '@playwright/test';

test('galerie : onglet Monuments, fiche et « Voir sur la carte »', async ({ page }) => {
  await page.goto('/?empire=rome&step=zama-202');
  await page.getByRole('button', { name: 'Galerie' }).click();
  await page.getByRole('button', { name: 'Monuments', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Monuments', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^Colisée/ }).click();
  await expect(page.getByRole('heading', { name: 'Colisée' })).toBeVisible();
  const steps = page.locator('.gallery__appears button');
  expect(await steps.count()).toBeGreaterThan(0);
  await steps.first().click();
  await expect(page).toHaveURL(/empire=rome&step=/);
});

test('frise : une barre de catastrophe affiche son infobulle', async ({ page }) => {
  await page.goto('/?empire=mongols&step=kurultai-1206');
  const bar = page.locator('.timeline__disaster').first();
  await bar.hover();
  const tip = page.getByRole('tooltip');
  await expect(tip).toBeVisible();
  await expect(tip).toContainText('morts');
});

test('le monde en l’an X : grande année au centre, mise à jour à l’étape suivante', async ({ page }) => {
  await page.goto('/?world=1&year=1279');
  const big = page.locator('.world-year__value');
  await expect(big).toHaveText('1279');
  await page.getByRole('button', { name: /Étape suivante/ }).click();
  await expect(big).not.toHaveText('1279');
});

test('monuments : le badge de pile suit la carte pendant un glissement', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/?empire=napoleon&step=sacre-1804&e2e');
  await page.waitForFunction(() => (window as any).__map?.getLayer('monuments-icons'), null, { timeout: 60_000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => (window as any).__map.jumpTo({ center: [2.35, 48.85], zoom: 5, pitch: 0 }));
  const badge = page.locator('.monument-badge').first();
  await expect(badge).toBeVisible({ timeout: 20_000 });
  // Glisser la carte sans relâcher : le badge doit rester collé à Notre-Dame.
  await page.mouse.move(700, 500);
  await page.mouse.down();
  await page.mouse.move(600, 430, { steps: 8 });
  const gap = await page.evaluate(() => {
    const m = (window as any).__map;
    const p = m.project([2.3497, 48.8531]);
    const b = document.querySelector('.monument-badge')!.getBoundingClientRect();
    const c = m.getContainer().getBoundingClientRect();
    return Math.hypot(b.left - c.left - (p.x + 9), b.top - c.top - (p.y - 15));
  });
  await page.mouse.up();
  expect(gap).toBeLessThan(40); // même pile : le badge suit (une pile ancrée sur un monument voisin reste à quelques px)
});
