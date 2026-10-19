import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  // Le CI rend le WebGL en logiciel sur 2 cœurs : 3 à 5 fois plus lent qu'en local.
  timeout: process.env.CI ? 150_000 : 60_000,
  expect: { timeout: 15_000 },
  // Un seul navigateur à la fois (WebGL logiciel), mais répartition des shards test par test (pas fichier par fichier).
  fullyParallel: true,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    viewport: { width: 1280, height: 800 },
    // Carte à plat et sans relief 3D : le relief (tuiles AWS + ombrage en WebGL logiciel) ralentissait chaque test.
    // Seul e2e/ui.spec.ts, qui teste ces réglages, repart des valeurs par défaut.
    storageState: {
      cookies: [],
      origins: [
        {
          origin: 'http://localhost:4173',
          localStorage: [
            { name: 'atlas.relief', value: '0' },
            { name: 'atlas.tilted', value: '0' },
          ],
        },
      ],
    },
    launchOptions: {
      // WebGL logiciel : pas de GPU sur le CI ni en headless.
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } }],
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
