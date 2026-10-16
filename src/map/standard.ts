// Étendard de régiment : hampe, drapeau à queue d'aronde à la couleur du camp, liseré et emblème dorés.
// Générique pour toutes les factions (teinté par FACTION_COLORS) ; viewBox 24×44, hampe à gauche.
const OUT = '#3b2a1a';

export function standardSvg(color: string): string {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 44" width="24" height="44">' +
    `<g stroke="${OUT}" stroke-width="1" stroke-linejoin="round" stroke-linecap="round">` +
    '<path d="M4 4V43" stroke="#8a5a2b" stroke-width="2.2"/>' +
    '<path d="M4 4V43" stroke="none"/>' +
    `<path d="M5 5H22L18.5 11L22 17H5Z" fill="${color}"/>` +
    '<path d="M6.6 6.6H19.4M6.6 15.4H19.4" fill="none" stroke="#e0b43a" stroke-width="0.9"/>' +
    '<circle cx="11.6" cy="11" r="2.6" fill="#e0b43a"/>' +
    `<circle cx="11.6" cy="11" r="1" fill="${color}" stroke="none"/>` +
    '<path d="M4 0.6L5.6 3.6H2.4Z" fill="#e0b43a"/>' +
    '</g></svg>'
  );
}
