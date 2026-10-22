import { devices, expect, test, type Page } from '@playwright/test';
import { collectErrors } from './helpers';

// Écran d'iPhone 13 (390 × 664, tactile), rendu par Chromium comme le reste des e2e (pas WebKit).
const { defaultBrowserType: _webkit, ...iPhone13 } = devices['iPhone 13'];
test.use(iPhone13);

/** Boutons et commandes visibles dans l'écran (hors fenêtres fermées et hors champ). */
function visibleControls(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('button, select, input, [role="button"]')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return (
          r.width > 0 &&
          r.height > 0 &&
          r.bottom > 0 &&
          r.right > 0 &&
          r.top < innerHeight &&
          r.left < innerWidth &&
          getComputedStyle(el).visibility !== 'hidden'
        );
      })
      .map((el) => el.getAttribute('aria-label') ?? el.textContent?.trim() ?? el.className),
  );
}

test('téléphone : carte plein écran, peu de boutons, pas de défilement horizontal', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/rome/cannes-216/');
  await expect(page.locator('.bottom-sheet')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
  const controls = await visibleControls(page);
  expect(controls.length, controls.join(' | ')).toBeLessThan(15);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  // Ni pastilles Quiz et sage, ni réglages d'affichage, ni bandeau de date par-dessus la carte.
  await expect(page.locator('.chat-fabs')).toBeHidden();
  await expect(page.locator('.step-date')).toHaveCount(0);
  await expect(page.locator('.view-controls__toggle')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('téléphone : le menu ☰ ouvre et ferme', async ({ page }) => {
  await page.goto('/rome/cannes-216/');
  const open = page.getByRole('button', { name: 'Menu' });
  await open.click();
  const menu = page.getByRole('dialog', { name: 'Menu' });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('button', { name: /Galerie/ })).toBeVisible();
  await expect(menu.getByRole('button', { name: /Mode Histoire/ })).toBeVisible();
  await expect(menu.getByRole('group', { name: 'Affichage de la carte' })).toBeVisible();
  await menu.getByRole('button', { name: 'Fermer le menu' }).click();
  await expect(menu).toBeHidden();
  // Échap ferme aussi (dialogue natif), et une entrée ouvre sa fenêtre en fermant le menu.
  await open.click();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await open.click();
  await menu.getByRole('button', { name: /À propos/ }).click();
  await expect(menu).toBeHidden();
  await expect(page.getByRole('dialog', { name: /propos/i })).toBeVisible();
});

test('téléphone : le tiroir change de cran (clic, clavier, glissé)', async ({ page }) => {
  await page.goto('/rome/cannes-216/');
  const sheet = page.locator('.bottom-sheet');
  const handle = page.locator('.bottom-sheet__handle');
  await expect(sheet).toHaveAttribute('data-snap', 'peek');
  // Replié : titre visible, résumé masqué.
  await expect(sheet.locator('.event-panel__title')).toBeVisible();
  await expect(sheet.locator('.event-panel__summary')).toBeHidden();
  const peekH = (await sheet.boundingBox())!.height;

  await handle.click();
  await expect(sheet).toHaveAttribute('data-snap', 'half');
  await expect(sheet.locator('.event-panel__summary')).toBeVisible();
  await handle.click();
  await expect(sheet).toHaveAttribute('data-snap', 'full');
  await expect.poll(async () => (await sheet.boundingBox())!.height).toBeGreaterThan(peekH * 2);
  // Plein : le récit défile à l'intérieur du tiroir.
  const body = sheet.locator('.event-panel__body');
  expect(await body.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);

  await handle.focus();
  await page.keyboard.press('ArrowDown');
  await expect(sheet).toHaveAttribute('data-snap', 'half');
  await page.keyboard.press('ArrowDown');
  await expect(sheet).toHaveAttribute('data-snap', 'peek');

  // Glissé vers le haut jusqu'en haut de l'écran : plein.
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, 80, { steps: 8 });
  await page.mouse.up();
  await expect(sheet).toHaveAttribute('data-snap', 'full');
});

test("téléphone : « Voir la bataille » atteignable, fenêtre dans l'écran", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/rome/cannes-216/');
  const open = page.getByTestId('battle-open');
  await expect(open).toBeInViewport();
  await open.click();
  const dialog = page.getByTestId('battle-dialog');
  await expect(dialog).toBeVisible();
  const box = (await dialog.boundingBox())!;
  const vp = page.viewportSize()!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(vp.height + 1);
  await expect(page.getByTestId('battle-canvas')).toBeInViewport();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  expect(errors).toEqual([]);
});
