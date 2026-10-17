import { expect, test } from '@playwright/test';

const mapReady = (page: import('@playwright/test').Page, layer: string) =>
  page.waitForFunction((l) => (window as any).__map?.getLayer(l), layer, { timeout: 60_000 });

test('aperçu de catastrophe : reste affiché après la fermeture de la fiche par un glissement de la carte', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/?empire=rome&step=republique-509&e2e');
  await mapReady(page, 'disasters-spread');
  await page.getByRole('button', { name: /Peste d'Athènes/ }).click();
  await expect(page.getByRole('dialog', { name: /Peste d'Athènes/ })).toBeVisible({ timeout: 30_000 });
  // Glissement manuel sur une zone libre de la carte : la fiche se ferme, la pastille reste.
  await page.mouse.move(420, 330);
  await page.mouse.down();
  await page.mouse.move(300, 360, { steps: 12 });
  await page.mouse.up();
  await expect(page.getByRole('dialog', { name: /Peste d'Athènes/ })).toHaveCount(0);
  await page.waitForTimeout(1500);
  await expect(page.locator('.disaster-marker', { hasText: "Peste d'Athènes" })).toHaveCount(1);
});

test('infobulle de la frise : dans <body>, au-dessus des boutons Quiz et Sage', async ({ page }) => {
  await page.goto('/?empire=china');
  await page.getByRole('button', { name: /Invention : Papier, / }).hover();
  const tip = page.getByRole('tooltip');
  await expect(tip).toContainText('Papier');
  expect(await tip.evaluate((el) => el.parentElement === document.body)).toBe(true);
});

test('inventions et monuments empilés : un seul éventail au survol (Paris, Napoléon 1811)', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/?empire=napoleon&step=apogee-1811&e2e');
  await mapReady(page, 'inventions-icons');
  await page.evaluate(() => (window as any).__map.jumpTo({ center: [2.35, 48.86], zoom: 5 }));
  await expect(page.locator('.monument-badge').first()).toBeVisible({ timeout: 30_000 });
  const [x, y] = await page.evaluate(() => {
    const m = (window as any).__map;
    const r = m.getContainer().getBoundingClientRect();
    const p = m.project([2.35, 48.86]);
    return [r.left + p.x, r.top + p.y];
  });
  await page.mouse.move(x, y);
  // Une seule pile pour Paris : inventions et monuments réunis.
  const fan = page.locator('.monument-fan');
  await expect(fan).toHaveCount(1);
  await expect(fan.locator('[data-layer="monuments-icons"]').first()).toBeVisible();
  await expect(fan.getByRole('button', { name: 'Code civil des Français' })).toBeVisible();
  await fan.getByRole('button', { name: 'Code civil des Français' }).click();
  await expect(page.getByRole('dialog', { name: 'Code civil des Français' })).toBeVisible();
});

test('capitales : voisins de l’époque et empires contemporains', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/?empire=rome&step=dacie-271&e2e');
  await mapReady(page, 'neighbors-capital');
  // Capitale d'un voisin dans les données de l'étape (ex. Ctésiphon pour les Perses sassanides).
  await page.waitForFunction(async () => ((await (window as any).__map.getSource('neighbors').getData()).features as any[]).some((f) => f.properties.kind === 'capital'), null, { timeout: 30_000 });
  // Capitale d'un empire contemporain (Chine) marquée dans le calque des villes.
  const foreign = await page.evaluate(async () => ((await (window as any).__map.getSource('cities').getData()).features as any[]).filter((f) => f.properties.foreign).map((f) => f.properties.label));
  expect(foreign.length).toBeGreaterThan(0);
});
