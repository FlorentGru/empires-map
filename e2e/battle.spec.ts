import { expect, test } from '@playwright/test';
import { collectErrors } from './helpers';

/** Le canvas contient-il des pixels de plusieurs couleurs (et pas un aplat) ? */
async function canvasHasContent(page: import('@playwright/test').Page) {
  return page.getByTestId('battle-canvas').evaluate((c: HTMLCanvasElement) => {
    const ctx = c.getContext('2d')!;
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    const seen = new Set<number>();
    for (let i = 0; i < data.length; i += 4 * 97) seen.add((data[i]! << 16) | (data[i + 1]! << 8) | data[i + 2]!);
    return seen.size > 8;
  });
}

test('Cannes : scénario historique, pause, Échap', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/rome/cannes-216/');
  const open = page.getByRole('button', { name: /Voir la bataille/ });
  await open.click();
  await expect(page.getByTestId('battle-dialog')).toBeVisible();
  await expect(page.getByTestId('battle-kind')).toHaveText('Scénario historique');
  await page.waitForTimeout(1000);
  expect(await canvasHasContent(page)).toBe(true);
  const play = page.getByTestId('battle-play');
  await play.click();
  await expect(play).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('battle-dialog')).toBeHidden();
  await expect(open).toBeFocused();
  expect(errors).toEqual([]);
});

test('Issos : simulation schématique', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/alexandre/issos-333/');
  await page.getByRole('button', { name: /Voir la bataille/ }).click();
  await expect(page.getByTestId('battle-dialog')).toBeVisible();
  await expect(page.getByTestId('battle-kind')).toHaveText('Simulation schématique');
  await page.waitForTimeout(1000);
  expect(await canvasHasContent(page)).toBe(true);
  await page.getByRole('button', { name: 'Fermer la bataille' }).click();
  await expect(page.getByTestId('battle-dialog')).toBeHidden();
  expect(errors).toEqual([]);
});

test('la lecture de la frise se met en pause pendant la bataille', async ({ page }) => {
  await page.goto('/rome/cannes-216/');
  await page.getByRole('button', { name: 'Lecture', exact: true }).click();
  await page.getByRole('button', { name: /Voir la bataille/ }).click();
  await expect(page.getByTestId('battle-dialog')).toBeVisible();
  // Plus longtemps qu'une étape en lecture automatique : ni l'étape ni la bataille ne doivent changer.
  await page.waitForTimeout(9000);
  await expect(page.locator('#battle-title')).toHaveText('Cannes, le désastre');
  expect(page.url()).toContain('/rome/cannes-216/');
  await page.keyboard.press('Escape');
  // La frise était en lecture avant la bataille : elle reprend seule.
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
});

test('sans lecture en cours, la frise reste arrêtée à la fermeture', async ({ page }) => {
  await page.goto('/rome/cannes-216/');
  await page.getByRole('button', { name: /Voir la bataille/ }).click();
  await expect(page.getByTestId('battle-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Lecture', exact: true })).toBeVisible();
});
