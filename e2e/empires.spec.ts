import { expect, test } from '@playwright/test';
import { collectErrors } from './helpers';

test('tous les empires : frise, résumé au clic, empire à venir, puis exploration sur la carte', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?empire=rome&step=zama-202');
  await page.getByRole('button', { name: 'Empires', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tous les empires' })).toBeVisible();
  await expect(page).toHaveURL(/empires=1/);
  // Résumé d'un empire disponible.
  await page.getByRole('button', { name: /^Saint-Empire romain germanique, / }).click();
  const summary = page.getByRole('complementary', { name: /Résumé : Saint-Empire/ });
  await expect(summary).toContainText('Apogée');
  await expect(summary).toContainText('Moments clés');
  // Un empire à venir : résumé court.
  await page
    .getByRole('button', { name: /bientôt disponible/ })
    .first()
    .click();
  await expect(page.getByRole('complementary', { name: /Résumé/ })).toContainText('Bientôt disponible');
  // Retour au Saint-Empire, puis « Explorer sur la carte ».
  await page.getByRole('button', { name: /^Saint-Empire romain germanique, / }).click();
  await page.getByRole('button', { name: /Explorer sur la carte/ }).click();
  await expect(page).toHaveURL(/empire=saint-empire&step=otton-962/);
  await expect(page).not.toHaveURL(/empires=1/);
  expect(errors).toEqual([]);
});
