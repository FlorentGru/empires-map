import { expect, test } from '@playwright/test';

test('le monde en l’an X : panneau, territoires, changement d’année et retour à un empire', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/?world=1&year=1279&e2e');
  const panel = page.getByRole('complementary', { name: /En l'an 1279/ });
  await expect(panel).toContainText('Empire mongol');
  await expect(page.locator('.world-year__value')).toHaveText('1279');
  await page.waitForFunction(
    () => {
      const m = (window as any).__map;
      return m?.getLayer('world-china-fill') && m.querySourceFeatures('world-china').length > 0 && m.querySourceFeatures('world-mongols').length > 0;
    },
    undefined,
    { timeout: 40_000 },
  );
  await page.getByRole('button', { name: /Étape suivante/ }).click();
  await expect(page).toHaveURL(/year=(?!1279)-?\d+/);
  await page
    .getByRole('complementary', { name: /En l'an/ })
    .getByRole('button', { name: /Voir dans cet empire/ })
    .first()
    .click();
  await expect(page).toHaveURL(/empire=/);
  await expect(page).not.toHaveURL(/world=1/);
});
