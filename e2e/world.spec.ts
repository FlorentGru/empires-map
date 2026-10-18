import { expect, test } from '@playwright/test';

test('le monde en 1279 : le panneau liste la Chine et l’Empire mongol', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/?world=1&year=1279&e2e');
  const panel = page.getByRole('complementary', { name: /En l'an 1279/ });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('Empire mongol');
  await expect(panel.getByRole('button', { name: /Voir dans cet empire/ }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Retour à l'empire/ })).toBeVisible();
});

test('changer d’année met à jour l’URL', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/?world=1&year=1279&e2e');
  await expect(page.getByRole('slider', { name: 'Année' })).toBeVisible();
  await page.getByRole('button', { name: /Étape précédente/ }).click();
  await expect(page).toHaveURL(/year=(?!1279)-?\d+/);
  const before = page.url();
  await page.getByRole('button', { name: /Étape suivante/ }).click();
  await expect.poll(() => page.url()).not.toBe(before);
  await page.getByRole('slider', { name: 'Année' }).fill('0');
  await expect(page).toHaveURL(/year=-3000/);
});

test('« Voir dans cet empire » mène à l’empire', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/?world=1&year=1279&e2e');
  await page
    .getByRole('complementary', { name: /En l'an 1279/ })
    .getByRole('button', { name: /Voir dans cet empire/ })
    .first()
    .click();
  await expect(page).toHaveURL(/empire=/);
  await expect(page).not.toHaveURL(/world=1/);
});

test('depuis le sélecteur d’empire : « Le monde en l’an… »', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/?empire=china&step=yamen-1279');
  await page.getByRole('button', { name: /Changer d'empire/ }).click();
  await page.getByRole('button', { name: /Le monde en l'an/ }).click();
  await expect(page).toHaveURL(/world=1&year=1279/);
  await page.getByRole('button', { name: /Retour à l'empire/ }).click();
  await expect(page).toHaveURL(/empire=china/);
});

test('la carte affiche les territoires des empires présents', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/?world=1&year=1279&e2e');
  await page.waitForFunction(
    () => {
      const m = (window as any).__map;
      return m && m.getLayer('world-china-fill') && m.querySourceFeatures('world-china').length > 0 && m.querySourceFeatures('world-mongols').length > 0;
    },
    undefined,
    { timeout: 40_000 },
  );
});
