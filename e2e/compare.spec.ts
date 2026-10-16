import { expect, test } from '@playwright/test';

test('comparer : deux cartes, le tableau par rubrique et l’alignement des dates', async ({ page }) => {
  await page.goto('/?empire=rome&step=zama-202');
  await page.getByRole('button', { name: /Comparer/ }).click();
  await expect(page).toHaveURL(/compare=rome,/);
  await expect(page.locator('.compare-pane')).toHaveCount(2);
  await expect(page.locator('.compare-pane .world-map')).toHaveCount(2);
  await expect(page.getByRole('row', { name: /Habitants/ })).toBeVisible();

  // Rome face à la Chine, puis dates alignées : la Chine suit l'année de Rome.
  await page.getByRole('combobox', { name: 'Empire comparé' }).nth(1).selectOption('china');
  await expect(page).toHaveURL(/compare=rome,china/);
  await page.getByLabel('Aligner les dates').check();
  const rome = page.getByRole('slider', { name: /Étape de Rome/ });
  await rome.fill('0');
  await expect(page.locator('.compare-pane__step').nth(1)).toContainText(/av\. J\.-C\./);

  await page.getByRole('button', { name: '← Retour' }).click();
  await expect(page).not.toHaveURL(/compare=/);
});
