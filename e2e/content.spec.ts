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
