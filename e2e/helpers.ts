import type { Page } from '@playwright/test';

/** Collecte les erreurs de page, hors réseau (tuiles de relief AWS, etc. si hors ligne). */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/Failed to load resource|net::ERR|AJAXError|Failed to fetch|NetworkError|amazonaws|WebGL|GPU stall|swiftshader/i.test(t)) return;
    errors.push(`console: ${t}`);
  });
  return errors;
}
