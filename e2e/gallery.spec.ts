import { expect, test } from '@playwright/test';
import { collectErrors } from './helpers';

test('galerie : ouverture, détail, fermeture', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?empire=rome&step=zama-202');
  await page.getByRole('button', { name: 'Galerie', exact: true }).click();
  const dialog = page.locator('dialog.gallery');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('open', '');
  await expect.poll(() => dialog.locator('.gallery__card').count()).toBeGreaterThanOrEqual(50);

  await dialog.locator('.gallery__card').first().click();
  await expect(dialog.locator('.gallery__detail')).toBeVisible();

  await dialog.getByRole('button', { name: 'Fermer' }).click();
  await expect(dialog).toHaveCount(0);
  expect(errors).toEqual([]);
});
