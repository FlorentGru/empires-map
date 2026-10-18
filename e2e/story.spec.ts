import { expect, test } from '@playwright/test';
import { collectErrors } from './helpers';

test('mode Histoire : la phrase lue est surlignée', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?empire=rome&step=zama-202');
  const btn = page.locator('button.story-btn');
  await btn.click();
  await expect(btn).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.is-reading').first()).toBeVisible({ timeout: 20_000 });
  expect(errors).toEqual([]);
});
