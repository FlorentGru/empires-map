import { expect, test } from '@playwright/test';

test('réglages repliables : Galerie et Votre avis restent visibles', async ({ page }) => {
  await page.goto('/?empire=rome&step=zama-202');
  const toggle = page.getByRole('button', { name: /Affichage/ });
  const relief = page.getByRole('button', { name: /Relief 3D/ });
  if ((await toggle.getAttribute('aria-expanded')) === 'false') await toggle.click();
  await expect(relief).toBeVisible();
  await toggle.click();
  await expect(relief).toBeHidden();
  await expect(page.getByRole('button', { name: 'Galerie' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Votre avis' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: /Relief 3D/ })).toBeHidden(); // choix mémorisé
});

test('Votre avis : le formulaire s’ouvre avec le contexte de la page', async ({ page }) => {
  await page.goto('/?empire=rome&step=zama-202');
  await page.getByRole('button', { name: 'Votre avis' }).click();
  const dialog = page.getByRole('dialog', { name: 'Votre avis' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('rome · zama-202');
  await dialog.getByRole('button', { name: 'Fermer' }).click();
  await expect(dialog).toBeHidden();
});

test('empire contemporain : la légende mène à cet empire', async ({ page }) => {
  await page.goto('/?empire=china&step=yamen-1279');
  const go = page.locator('.legend').getByRole('button', { name: /Empire mongol/ });
  await expect(go).toBeVisible({ timeout: 15000 });
  await go.click();
  await expect(page).toHaveURL(/empire=mongols/);
});

test('empire contemporain : clic sur la carte puis « Voir cet empire »', async ({ page }) => {
  test.setTimeout(90_000); // rendu WebGL logiciel lent quand les tests tournent en parallèle
  await page.goto('/?empire=china&step=yamen-1279&e2e');
  await page.waitForFunction(() => {
    const m = (window as any).__map;
    return m && m.getLayer('contemporaries-fill-core') && m.queryRenderedFeatures({ layers: ['contemporaries-fill-core'] }).length > 0;
  }, null, { timeout: 60_000 });
  await page.waitForTimeout(2500); // fin du vol de caméra
  // Vue large sur l'Asie centrale, où s'étendent les khanats mongols.
  await page.evaluate(() => (window as any).__map.jumpTo({ center: [75, 45], zoom: 3 }));
  await page.waitForTimeout(1500);
  const pt = await page.evaluate(() => {
    const m = (window as any).__map;
    // Un point du khanat visible à l'écran, non couvert par un panneau.
    for (let y = 10; y < innerHeight; y += 12) for (let x = 10; x < innerWidth; x += 12) {
      if (!document.elementFromPoint(x, y)?.classList.contains('maplibregl-canvas')) continue;
      const h = m.queryRenderedFeatures([x, y]);
      if (h[0]?.layer.id.startsWith('contemporaries-fill') && h[0].properties.empire === 'mongols') return [x, y];
    }
    return null;
  });
  expect(pt).not.toBeNull();
  await page.mouse.click(pt![0], pt![1]);
  await page.getByRole('button', { name: /Voir cet empire/ }).click();
  await expect(page).toHaveURL(/empire=mongols/);
});
