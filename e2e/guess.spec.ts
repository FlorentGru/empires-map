import { expect, test } from '@playwright/test';

test('Devine la suite : une question avant l’étape suivante, verdict, puis la carte avance', async ({ page }) => {
  await page.goto('/?empire=rome&step=zama-202');
  await page.getByRole('button', { name: /Devine la suite/ }).click();
  await expect(page).toHaveURL(/guess=1/);
  await page.getByRole('button', { name: 'Étape suivante' }).click();
  // La question d'abord : l'étape ne change pas encore.
  const card = page.getByRole('dialog', { name: 'Devine la suite' });
  await expect(card).toBeVisible();
  await expect(page).toHaveURL(/\/zama-202\//);
  await card.locator('.guess-card__choice').first().click();
  await expect(card.locator('.guess-card__verdict')).toBeVisible();
  await expect(card).toContainText('Score : ');
  await card.getByRole('button', { name: /Voir la suite/ }).click();
  await expect(page).toHaveURL(/\/pydna-168\//);
  await expect(card).toBeHidden();
});
