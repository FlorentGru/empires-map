import { expect, test } from '@playwright/test';
import { collectErrors } from './helpers';

test('SEO : pages statiques lisibles sans JavaScript, puis la carte au même endroit', async ({ browser, page, request }) => {
  test.setTimeout(150_000);
  // Ce que lit un robot : le HTML brut, sans exécuter de JavaScript.
  const res = await request.get('/rome/cannes-216/');
  expect(res.status()).toBe(200);
  const html = await res.text();
  expect(html).toContain('<title>Cannes, le désastre (216 av. J.-C.)');
  expect(html).toMatch(/<link rel="canonical" href="https:\/\/[^"]+\/rome\/cannes-216\/"/);
  expect(html).toMatch(/<meta property="og:image" content="https:\/\/[^"]+\.png"/);
  const ld = JSON.parse(/<script type="application\/ld\+json">(.*?)<\/script>/s.exec(html)![1]!);
  expect(ld['@graph'].map((x: { '@type': string }) => x['@type'])).toEqual(['Article', 'BreadcrumbList']);
  expect(html).toContain('<h1>Cannes, le désastre</h1>');
  expect(html).toContain('Fabius Maximus');
  expect(html).toMatch(/href="\/rome\/[a-z0-9-]+\/"/); // liens vers les étapes voisines
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect((sitemap.match(/<url>/g) ?? []).length).toBeGreaterThan(200);
  for (const file of ['/robots.txt', '/llms.txt', '/chine/', '/personnages/']) expect((await request.get(file)).ok(), file).toBe(true);

  // Sans JavaScript : l'article est visible, l'écran de chargement reste masqué.
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const flat = await noJs.newPage();
  await flat.goto('/rome/cannes-216/');
  await expect(flat.getByRole('heading', { level: 1, name: 'Cannes, le désastre' })).toBeVisible();
  await expect(flat.locator('.seo-splash')).toBeHidden();
  await noJs.close();

  // JavaScript actif mais l'application pas encore chargée (bundle bloqué) : écran de chargement, article masqué.
  const loading = await browser.newPage();
  await loading.route('**/assets/**/*.js', (r) => r.abort());
  await loading.goto('/rome/cannes-216/');
  await expect(loading.locator('.seo-splash')).toBeVisible();
  await expect(loading.locator('.seo-page h1')).toHaveText('Cannes, le désastre'); // toujours dans le HTML
  expect(await loading.locator('.seo-page').boundingBox()).toMatchObject({ width: 1, height: 1 }); // masqué visuellement
  await loading.close();

  // Ce que voit un visiteur : la carte s'ouvre sur l'étape, et l'adresse et le titre suivent la navigation.
  const errors = collectErrors(page);
  await page.goto('/rome/cannes-216/');
  await expect(page.locator('.seo-page')).toHaveCount(0, { timeout: 60_000 });
  await expect(page).toHaveURL(/\/rome\/cannes-216\/$/);
  await expect(page).toHaveTitle(/Cannes, le désastre/);
  await expect(page.getByText('Cannes, le désastre').filter({ visible: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Étape suivante' }).click();
  await expect(page).toHaveURL(/\/rome\/[a-z0-9-]+\/$/);
  await expect(page).not.toHaveURL(/cannes-216/);
  await expect(page).not.toHaveTitle(/Cannes/);

  // Page de synthèse : la galerie, sur l'onglet des monuments.
  await page.goto('/monuments/');
  await expect(page.locator('dialog.gallery')).toHaveAttribute('open', '');
  await expect(page.getByRole('heading', { name: 'Monuments', exact: true })).toBeVisible();
  await expect(page).toHaveTitle(/monuments/i);
  expect(errors).toEqual([]);
});
