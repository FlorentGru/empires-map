/** Réglages d'affichage mémorisés (localStorage, tolérant à son absence). */

export function readBool(key: string, fallback: boolean): boolean {
  try {
    const v = window.localStorage.getItem(key);
    return v === null ? fallback : v === '1';
  } catch {
    return fallback;
  }
}

export function writeBool(key: string, value: boolean): void {
  try {
    window.localStorage.setItem(key, value ? '1' : '0');
  } catch {
    /* stockage indisponible : le réglage vaut pour la session seulement */
  }
}
