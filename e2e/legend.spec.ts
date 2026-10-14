import { expect, test } from '@playwright/test';

test('légende : cliquer un territoire émet atlas:focus-entity', async ({ page }) => {
  await page.goto('/?empire=china&step=trois-royaumes-220');
  await page.evaluate(() => {
    (window as any).__focus = [];
    window.addEventListener('atlas:focus-entity', (e) => (window as any).__focus.push((e as CustomEvent).detail));
  });
  const toggle = page.locator('.legend__toggle');
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
  await page.locator('.legend__entity', { hasText: 'Shu-Han' }).click();
  const detail = await page.evaluate(() => (window as any).__focus[0]);
  expect(detail).toMatchObject({ index: 1 });
  expect(typeof detail.territory).toBe('string');
});
