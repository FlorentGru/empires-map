import { expect, test } from '@playwright/test';

const sourceData = (layer: string) => `(async () => ((await window.__map.getSource('${layer}').getData()).features))()`;

test('époque : capitales des voisins et des empires contemporains, la légende mène à l’empire contemporain', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/?empire=china&step=yamen-1279&e2e');
  await page.waitForFunction(() => (window as any).__map?.getLayer('neighbors-capital'), null, { timeout: 60_000 });
  // Capitale d'un voisin (data/capitals.json) et capitale d'un autre empire de l'Atlas (khanats mongols).
  await expect.poll(async () => (await page.evaluate(sourceData('neighbors'))).filter((f: any) => f.properties.kind === 'capital').length).toBeGreaterThan(0);
  await expect.poll(async () => (await page.evaluate(sourceData('cities'))).filter((f: any) => f.properties.foreign).length).toBeGreaterThan(0);

  const go = page.locator('.legend').getByRole('button', { name: /Empire mongol/ });
  await go.click();
  await expect(page).toHaveURL(/\/mongols\//);
});
