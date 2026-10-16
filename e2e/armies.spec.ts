import { expect, test } from '@playwright/test';
import { collectErrors } from './helpers';

test('bataille : des régiments fournis, un étendard par armée, sans erreur', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?empire=rome&step=cannes-216');
  const regiments = page.locator('.army-marker');
  await expect(regiments).toHaveCount(2);
  for (const r of await regiments.all()) {
    expect(await r.locator('.army-soldier').count()).toBeGreaterThanOrEqual(10);
    await expect(r.locator('.army-standard')).toHaveCount(1);
  }
  await expect(page.locator('.clash-marker')).toHaveCount(1);
  expect(errors).toEqual([]);
});
