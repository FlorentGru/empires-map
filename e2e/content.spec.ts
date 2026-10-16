import { expect, test } from '@playwright/test';

test('galerie : personnages illustres, fiche et « Apparaît dans »', async ({ page }) => {
  await page.goto('/?empire=rome&step=zama-202');
  await page.getByRole('button', { name: 'Galerie' }).click();
  await page.getByRole('button', { name: 'Personnages illustres' }).click();
  await expect(page.getByRole('heading', { name: 'Personnages illustres' })).toBeVisible();
  await page.getByRole('button', { name: /Jules César/ }).click();
  await expect(page.getByRole('heading', { name: 'Jules César' })).toBeVisible();
  const steps = page.locator('.gallery__appears button');
  expect(await steps.count()).toBeGreaterThan(0);
  await steps.first().click();
  await expect(page).toHaveURL(/empire=rome&step=/);
});

test('monuments : visibles à la date, réglage et fiche au clic', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/?empire=rome&step=trajan-117&e2e');
  const visible = () =>
    page.evaluate(() => {
      const m = (window as any).__map;
      return m?.getLayer('monuments-icons') ? m.queryRenderedFeatures({ layers: ['monuments-icons'] }).map((f: any) => f.properties.id) : null;
    });
  await expect.poll(async () => (await visible())?.length ?? 0, { timeout: 60_000 }).toBeGreaterThan(0);
  const ids: string[] = (await visible()) ?? [];
  expect(ids).toContain('colisee');
  expect(ids).not.toContain('notre-dame-de-paris');

  // Clic sur le Colisée : fiche au-dessus de l'interface.
  const pt = await page.evaluate(() => {
    const m = (window as any).__map;
    const f = m.queryRenderedFeatures({ layers: ['monuments-icons'] }).find((x: any) => x.properties.id === 'colisee');
    const p = m.project(f.geometry.coordinates);
    return [p.x, p.y];
  });
  await page.mouse.click(pt[0], pt[1]);
  await expect(page.getByRole('dialog', { name: /Colisée/ })).toBeVisible();

  // Réglage : masquer les monuments.
  const toggle = page.getByRole('button', { name: /Affichage/ });
  if ((await toggle.getAttribute('aria-expanded')) === 'false') await toggle.click();
  await page.getByRole('button', { name: /Monuments : oui/ }).click();
  await expect.poll(async () => (await visible())?.length ?? 0).toBe(0);
});

test('monuments empilés : le survol les écarte en éventail', async ({ page }) => {
  test.setTimeout(90_000);
  // Paris en 1804 (étape sans armée, donc sans vol de caméra différé) : Notre-Dame, les Invalides et Versailles sont empilés.
  await page.goto('/?empire=napoleon&step=sacre-1804&e2e');
  await page.waitForFunction(() => (window as any).__map?.getLayer('monuments-icons'), null, { timeout: 60_000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => (window as any).__map.jumpTo({ center: [2.35, 48.85], zoom: 5, pitch: 0 }));
  await expect(page.locator('.monument-badge').first()).toBeVisible({ timeout: 20_000 });
  const pt = await page.evaluate(() => {
    const m = (window as any).__map;
    const p = m.project([2.35, 48.853]); // Notre-Dame
    return [p.x, p.y];
  });
  // Survol réel : la souris arrive de côté (l'entrée sur le calque déclenche l'éventail).
  await page.mouse.move(pt[0] - 40, pt[1] - 40);
  await page.mouse.move(pt[0], pt[1], { steps: 5 });
  const items = page.locator('.monument-fan__item');
  await expect(items.first()).toBeVisible();
  expect(await items.count()).toBeGreaterThanOrEqual(2);
  await page.getByRole('button', { name: /Invalides/ }).click();
  await expect(page.getByRole('dialog', { name: /Invalides/ })).toBeVisible();
});

test('catastrophes et routes : la peste noire à Kaffa en 1346, fiche au clic', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/?empire=mongols&step=kaffa-1346&e2e');
  const plague = page.getByRole('button', { name: /Épidémie : Peste noire/ });
  await expect(plague).toBeVisible({ timeout: 30_000 });
  await plague.click();
  await expect(page.getByRole('dialog', { name: /Peste noire/ })).toContainText('morts');
  // Des routes commerciales actives sont tracées.
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const m = (window as any).__map;
          m.jumpTo({ center: [60, 40], zoom: 2.5 });
          return m.getLayer('trade-routes-line') ? m.queryRenderedFeatures({ layers: ['trade-routes-line', 'trade-routes-sea'] }).length : 0;
        }),
      { timeout: 30_000 },
    )
    .toBeGreaterThan(0);
});
