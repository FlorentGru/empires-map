/** Nombre entier (0 à 999 999) en lettres, orthographe française traditionnelle. */

const UNITS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize'];
const TENS = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];

function below100(n: number): string {
  if (n <= 16) return UNITS[n];
  if (n < 20) return `dix-${UNITS[n - 10]}`;
  if (n < 70 || (n >= 80 && n < 90) || n >= 90) {
    if (n >= 90) return `quatre-vingt-${below100(n - 80)}`;
    if (n >= 80) return n === 80 ? 'quatre-vingts' : `quatre-vingt-${UNITS[n - 80]}`;
    const t = Math.floor(n / 10);
    const u = n % 10;
    if (u === 0) return TENS[t];
    return u === 1 ? `${TENS[t]} et un` : `${TENS[t]}-${UNITS[u]}`;
  }
  // 70-79
  return n === 71 ? 'soixante et onze' : `soixante-${below100(n - 60)}`;
}

function below1000(n: number, final: boolean): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  let out = '';
  if (h === 1) out = 'cent';
  else if (h > 1) out = `${UNITS[h]} cent${r === 0 && final ? 's' : ''}`;
  if (r === 0) return out;
  const rest = below100(r);
  return out ? `${out} ${rest}` : rest;
}

export function numberToFrench(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n === 0) return 'zéro';
  if (n >= 1_000_000) return String(n);
  const th = Math.floor(n / 1000);
  const r = n % 1000;
  let out = '';
  if (th === 1) out = 'mille';
  else if (th > 1) out = `${below1000(th, false)} mille`;
  if (r === 0) return out;
  const rest = below1000(r, true);
  return out ? `${out} ${rest}` : rest;
}
