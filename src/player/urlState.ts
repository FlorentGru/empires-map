/** Lecture / écriture de ?empire=<id>&step=<id> (replaceState, sans historique). */

export function readUrlState(): { empire: string | null; step: string | null } {
  const params = new URLSearchParams(window.location.search);
  return { empire: params.get('empire'), step: params.get('step') };
}

export function writeUrlState(empire: string, step: string | undefined): void {
  const url = new URL(window.location.href);
  url.searchParams.set('empire', empire);
  if (step) url.searchParams.set('step', step);
  else url.searchParams.delete('step');
  if (url.href !== window.location.href) window.history.replaceState(null, '', url);
}
