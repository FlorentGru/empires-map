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

test('frise : la peste d’Athènes, hors de la date de l’étape, s’ouvre en aperçu', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/?empire=rome&step=republique-509');
  await page.getByRole('button', { name: /Peste d'Athènes/ }).click();
  const card = page.getByRole('dialog', { name: /Peste d'Athènes/ });
  await expect(card).toBeVisible({ timeout: 30_000 });
  await expect(card).toContainText('Aperçu');
  await expect(card).toContainText('morts');
});

test('galerie : onglet Catastrophes et guerres', async ({ page }) => {
  await page.goto('/?empire=rome&step=zama-202');
  await page.getByRole('button', { name: 'Galerie' }).click();
  await page.getByRole('button', { name: 'Catastrophes et guerres' }).click();
  await page.getByRole('button', { name: /^Peste noire/ }).click();
  await expect(page.getByRole('heading', { name: 'Peste noire' })).toBeVisible();
  await expect(page.locator('.gallery__appears button')).toHaveCount(1);
});

test('routes : les escales du commerce triangulaire existent aux Antilles', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/?empire=napoleon&step=brumaire-1799&e2e');
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const m = (window as any).__map;
          if (!m?.getLayer('trade-routes-stops')) return [];
          m.jumpTo({ center: [-68, 16], zoom: 4.5, pitch: 0 });
          return m.queryRenderedFeatures({ layers: ['trade-routes-stops'] }).map((f: any) => f.properties.name);
        }),
      { timeout: 60_000 },
    )
    .toEqual(expect.arrayContaining([expect.stringMatching(/^Bridgetown/), expect.stringMatching(/^Cap-Français/)]));
});
