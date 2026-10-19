import { expect, test } from '@playwright/test';

// Réglages par défaut (relief et vue inclinée), pas ceux allégés de playwright.config.ts.
test.use({ storageState: { cookies: [], origins: [] } });

test('interface : réglages repliables et mémorisés, formulaire « Votre avis »', async ({ page }) => {
  await page.goto('/?empire=rome&step=zama-202');
  const toggle = page.getByRole('button', { name: /Affichage/ });
  const relief = page.getByRole('button', { name: /Relief 3D/ });
  if ((await toggle.getAttribute('aria-expanded')) === 'false') await toggle.click();
  await expect(relief).toBeVisible();
  await toggle.click();
  await expect(relief).toBeHidden();
  await page.reload();
  await expect(page.getByRole('button', { name: /Relief 3D/ })).toBeHidden(); // choix mémorisé

  await page.getByRole('button', { name: 'Votre avis' }).click();
  const dialog = page.getByRole('dialog', { name: 'Votre avis' });
  await expect(dialog).toContainText('rome · zama-202');
  await dialog.getByRole('button', { name: 'Fermer' }).click();
  await expect(dialog).toBeHidden();
});
