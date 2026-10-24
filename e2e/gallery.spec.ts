import { expect, test } from '@playwright/test';
import { collectErrors } from './helpers';

test('galerie : figurines, personnages, monuments, catastrophes, inventions et « Voir sur la carte »', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?empire=rome&step=zama-202');
  await page.getByRole('button', { name: 'Galerie', exact: true }).click();
  const dialog = page.locator('dialog.gallery');
  await expect(dialog).toHaveAttribute('open', '');
  await expect.poll(() => dialog.locator('.gallery__card').count()).toBeGreaterThanOrEqual(50);
  await dialog.locator('.gallery__card').first().click();
  await expect(dialog.locator('.gallery__detail')).toBeVisible();

  // Monuments : bandeau des sept merveilles, badge sur leur fiche.
  await page.getByRole('button', { name: 'Monuments', exact: true }).click();
  await expect(dialog.locator('.monuments__wonders .gallery__card')).toHaveCount(7);
  await dialog
    .locator('.monuments__wonders')
    .getByRole('button', { name: /^Colosse de Rhodes/ })
    .click();
  await expect(dialog.locator('.gallery__detail .wonder-badge')).toBeVisible();
  await page.getByRole('button', { name: /Retour aux monuments/ }).click();

  // Chaque onglet de contenu : une fiche s'ouvre.
  const tabs: [string, RegExp, string][] = [
    ['Personnages illustres', /Jules César/, 'Jules César'],
    ['Monuments', /^Colisée/, 'Colisée'],
    ['Catastrophes et guerres', /^Peste noire/, 'Peste noire'],
    ['Inventions', /^Béton/, ''],
  ];
  for (const [tab, card, heading] of tabs) {
    await page.getByRole('button', { name: tab, exact: true }).click();
    await page.getByRole('button', { name: card }).first().click();
    if (heading) await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }
  // « Voir sur la carte » depuis une fiche.
  await page.locator('.gallery__appears button').first().click();
  await expect(page).toHaveURL(/\/rome\/[a-z0-9-]+\//);
  expect(errors).toEqual([]);
});

test('galerie : unités de bataille (mini-scènes du moteur, fiche, « Où la voir »)', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?empire=alexandre&step=gaugameles-331');
  await page.getByRole('button', { name: 'Galerie', exact: true }).click();
  const dialog = page.locator('dialog.gallery');
  await page.getByRole('button', { name: 'Unités de bataille', exact: true }).click();
  await expect(dialog.getByRole('region', { name: 'Montures et engins' }).locator('.gallery__card')).toHaveCount(11);
  await expect(dialog.getByRole('region', { name: 'Formations' }).locator('.gallery__card')).toHaveCount(12);

  // Une mini-scène est rendue par le moteur : le canvas n'est pas uniforme.
  const canvas = dialog.locator('[data-uid="u:phalange"] canvas');
  await canvas.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      canvas.evaluate((c: HTMLCanvasElement) => {
        const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
        const seen = new Set<number>();
        for (let i = 0; i < d.length; i += 4 * 97) seen.add((d[i]! << 16) | (d[i + 1]! << 8) | d[i + 2]!);
        return seen.size;
      }),
    )
    .toBeGreaterThan(8);

  // Fiche : la phalange est jouée à Gaugamèles.
  await dialog.locator('[data-uid="u:phalange"]').click();
  await expect(dialog.getByRole('heading', { name: 'Phalange' })).toBeVisible();
  await dialog.locator('.gallery__appears button', { hasText: 'Gaugamèles' }).click();
  await expect(page).toHaveURL(/\/alexandre\/gaugameles-331\//);
  expect(errors).toEqual([]);
});

test('galerie : bouton « Tous » des inventions et des personnages illustres', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Galerie', exact: true }).click();
  const dialog = page.locator('dialog.gallery');
  for (const tab of ['Inventions', 'Personnages illustres']) {
    await page.getByRole('button', { name: tab, exact: true }).click();
    await dialog.getByRole('group', { name: "Choisir l'empire" }).getByRole('button', { name: 'Tous', exact: true }).click();
    await expect.poll(() => dialog.locator('h3.gallery__group').count()).toBeGreaterThanOrEqual(3);
  }
  // Recherche sur tous les empires, fiche de l'empire de l'élément choisi.
  await dialog.getByRole('searchbox').fill('Charlemagne');
  await dialog.locator('.gallery__card', { hasText: 'Charlemagne' }).first().click();
  await expect(dialog.getByRole('heading', { name: /Charlemagne/ }).first()).toBeVisible();
  expect(errors).toEqual([]);
});
