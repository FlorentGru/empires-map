import { expect, test } from '@playwright/test';

const mapReady = (page: import('@playwright/test').Page, layer: string) =>
  page.waitForFunction((l) => (window as any).__map?.getLayer(l), layer, { timeout: 60_000 });

test('monuments et inventions : un seul éventail par lieu, fiche au clic, réglage', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/?empire=napoleon&step=apogee-1811&e2e');
  await mapReady(page, 'inventions-icons');
  await mapReady(page, 'monuments-icons');
  await page.evaluate(() => (window as any).__map.jumpTo({ center: [2.35, 48.86], zoom: 5, pitch: 0 }));
  // Pile de Paris complète (monuments + inventions, calques chargés à la demande) : le plus gros badge dépasse 3.
  await expect.poll(async () => Math.max(0, ...(await page.locator('.monument-badge').allTextContents()).map(Number)), { timeout: 30_000 }).toBeGreaterThan(3);
  const [x, y] = await page.evaluate(() => {
    const m = (window as any).__map;
    const r = m.getContainer().getBoundingClientRect();
    const p = m.project([2.35, 48.86]);
    return [r.left + p.x, r.top + p.y];
  });
  await page.mouse.move(x - 40, y - 40);
  await page.mouse.move(x, y, { steps: 5 });
  const fan = page.locator('.monument-fan');
  await expect(fan).toHaveCount(1);
  await expect(fan.locator('[data-layer="monuments-icons"]').first()).toBeVisible();
  await fan.getByRole('button', { name: 'Code civil des Français' }).click();
  await expect(page.getByRole('dialog', { name: 'Code civil des Français' })).toContainText('révolutionnaire');

  // Réglage : masquer les inventions.
  const toggle = page.getByRole('button', { name: /Affichage/ });
  if ((await toggle.getAttribute('aria-expanded')) === 'false') await toggle.click();
  await page.getByRole('button', { name: /Inventions : oui/ }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__map.getLayoutProperty('inventions-icons', 'visibility'))).toBe('none');
});

test('catastrophes et routes : la peste noire à Kaffa en 1346, routes tracées', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/?empire=mongols&step=kaffa-1346&e2e');
  const plague = page
    .locator('.disaster-marker')
    .getByText(/Peste noire/)
    .locator('..');
  await plague.click({ timeout: 30_000 });
  await expect(page.getByRole('dialog', { name: /Peste noire/ })).toContainText('morts');
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

test('zones de guerre : masquées pour l’empire belligérant, sinon sur les terres et sous les territoires', async ({ page }) => {
  test.setTimeout(90_000);
  const warFeatures = (id: string) =>
    page.evaluate((war) => {
      const m = (window as any).__map;
      return m.getLayer('disasters-war-fill')
        ? m.queryRenderedFeatures({ layers: ['disasters-war-fill'] }).filter((f: any) => f.properties.id === war).length
        : 0;
    }, id);

  // Napoléon mène les guerres napoléoniennes : pas de zone (elle doublerait son territoire), mais la pastille reste.
  await page.goto('/napoleon/wagram-1809/?e2e');
  await mapReady(page, 'disasters-war-fill');
  await expect(page.locator('.disaster-marker', { hasText: 'Guerres napoléoniennes' })).toHaveCount(1, { timeout: 30_000 });
  await page.evaluate(() => (window as any).__map.jumpTo({ center: [12, 49], zoom: 3.5, pitch: 0 }));
  await page.waitForTimeout(500);
  expect(await warFeatures('guerres-napoleoniennes')).toBe(0);

  // Les Mongols en 1346 ne font pas la guerre de Cent Ans : zone rendue, calque sous les territoires et les voisins.
  await page.goto('/?empire=mongols&step=kaffa-1346&e2e');
  await mapReady(page, 'disasters-war-fill');
  await expect(page.locator('.disaster-marker', { hasText: 'Guerre de Cent Ans' })).toHaveCount(1, { timeout: 30_000 });
  await expect
    .poll(
      async () => {
        await page.evaluate(() => (window as any).__map.jumpTo({ center: [1, 47], zoom: 4.5, pitch: 0 }));
        return warFeatures('guerre-cent-ans');
      },
      { timeout: 30_000 },
    )
    .toBeGreaterThan(0);
  const order: string[] = await page.evaluate(() => (window as any).__map.getStyle().layers.map((l: any) => l.id));
  const at = (id: string) => order.indexOf(id);
  expect(at('disasters-war-fill')).toBeGreaterThan(at('hillshade'));
  expect(at('disasters-war-fill')).toBeLessThan(at('neighbors-border'));
  expect(at('disasters-war-line')).toBeLessThan(at('territory-a-fill'));
});

test('frise : infobulle au-dessus de tout, aperçu d’une catastrophe hors date qui reste après un glissement', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/?empire=rome&step=republique-509&e2e');
  await mapReady(page, 'disasters-spread');
  const bar = page.getByRole('button', { name: /Peste d'Athènes/ });
  await bar.hover();
  const tip = page.getByRole('tooltip');
  await expect(tip).toContainText('morts');
  expect(await tip.evaluate((el) => el.parentElement === document.body)).toBe(true);

  await bar.click();
  const card = page.getByRole('dialog', { name: /Peste d'Athènes/ });
  await expect(card).toContainText('Aperçu', { timeout: 30_000 });
  // Glissement manuel : la fiche se ferme, la pastille de l'aperçu reste.
  await page.mouse.move(420, 330);
  await page.mouse.down();
  await page.mouse.move(300, 360, { steps: 12 });
  await page.mouse.up();
  await expect(card).toHaveCount(0);
  await expect(page.locator('.disaster-marker', { hasText: "Peste d'Athènes" })).toHaveCount(1);
});

test('sept merveilles : icône dorée hors des piles et nom affiché dès le zoom monde', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/?empire=rome&step=tarente-272&e2e');
  await mapReady(page, 'monuments-icons');
  await page.evaluate(() => (window as any).__map.jumpTo({ center: [28.2, 36.4], zoom: 3, pitch: 0 }));
  const rendered = () =>
    page.evaluate(() =>
      (window as any).__map
        .queryRenderedFeatures({ layers: ['monuments-icons'] })
        .filter((f: any) => f.properties.wonder)
        .map((f: any) => f.properties.id),
    );
  await expect.poll(rendered, { timeout: 30_000 }).toContain('colosse-de-rhodes');
  expect(await page.evaluate(() => (window as any).__map.hasImage('monument-statue-wonder'))).toBe(true);
});
