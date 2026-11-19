import { expect, test } from '@playwright/test';
import { collectErrors } from './helpers';

test('accueil : la carte se charge derrière, Démarrer puis choix d’un empire', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  const landing = page.getByRole('dialog', { name: 'Atlas des Empires' });
  await expect(landing).toBeVisible();
  // La carte est déjà montée sous le voile.
  await expect(page.locator('.maplibregl-canvas')).toBeAttached();
  await landing.getByRole('button', { name: 'Démarrer' }).click();
  await landing.getByRole('button', { name: /napoléonien/i }).click();
  await expect(landing).toBeHidden();
  await expect(page).toHaveURL(/\/napoleon\//);
  expect(errors).toEqual([]);
});

test('accueil : « Tous les empires » s’ouvre sans empire présélectionné, le retour ramène à l’accueil', async ({ page }) => {
  await page.goto('/');
  const landing = page.getByRole('dialog', { name: 'Atlas des Empires' });
  await landing.getByRole('button', { name: 'Démarrer' }).click();
  await landing.getByRole('button', { name: 'Tous les empires sur une frise' }).click();
  await expect(page).toHaveURL(/\/empires\//);
  await expect(page.getByRole('heading', { name: 'Tous les empires' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: /^Résumé :/ })).toHaveCount(0);
  await page.getByRole('button', { name: '← Retour à l’accueil' }).click();
  // Démarrer déjà cliqué : retour directement sur la liste des empires.
  await expect(landing.getByRole('heading', { name: 'Choisissez un empire' })).toBeVisible();
  await expect(landing.getByRole('button', { name: 'Démarrer' })).toHaveCount(0);
});

test('accueil : un lien partagé arrive directement sur la carte', async ({ page }) => {
  await page.goto('/rome/cannes-216/');
  await expect(page.locator('.event-panel__toggle-title')).toContainText(/Cannes/i);
  await expect(page.locator('dialog.landing')).toHaveCount(0);
});
