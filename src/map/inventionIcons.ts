// Icônes d'inventions par catégorie (SVG 28×28) : pastille claire cerclée de bleu-vert (≠ monuments, cerclés de brun).
import type { InventionCategory } from '../types-invention';

const INK = '#1f4f57';
const TEAL = '#2f7a84';
const GOLD = '#c99a2e';
const PAPER = '#f4ead3';

const shape: Record<InventionCategory, string> = {
  // Engrenage
  technique: `<circle cx="14" cy="14" r="5.2" fill="${PAPER}" stroke="${INK}" stroke-width="1.4"/><circle cx="14" cy="14" r="1.8" fill="${INK}"/><path d="M14 6.5V9M14 19V21.5M6.5 14H9M19 14H21.5M8.7 8.7L10.4 10.4M17.6 17.6L19.3 19.3M8.7 19.3L10.4 17.6M17.6 10.4L19.3 8.7" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`,
  // Fiole
  science: `<path d="M12 7H16M12.6 7V12L8.5 19.5Q8 21 9.6 21H18.4Q20 21 19.5 19.5L15.4 12V7" fill="${PAPER}" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/><path d="M10 18.5H18L16.6 15.5H11.4Z" fill="${TEAL}"/><circle cx="14" cy="17.5" r="0.8" fill="${PAPER}"/>`,
  // Épée
  militaire: `<path d="M19.5 6.5L21.5 8.5L12 18L10 16Z" fill="#d6dadc" stroke="${INK}" stroke-width="1.1"/><path d="M8.5 15.5L12.5 19.5M9.5 20.5L7.5 18.5" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/><path d="M9 17.5L10.5 19" stroke="${GOLD}" stroke-width="2.2"/>`,
  // Épi
  agriculture: `<path d="M14 21.5V9" stroke="${INK}" stroke-width="1.3"/><path d="M14 9Q11 8 11 5.5Q14 6 14 9ZM14 9Q17 8 17 5.5Q14 6 14 9ZM14 12.5Q10.5 11.5 10.5 9Q14 9.5 14 12.5ZM14 12.5Q17.5 11.5 17.5 9Q14 9.5 14 12.5ZM14 16Q10.5 15 10.5 12.5Q14 13 14 16ZM14 16Q17.5 15 17.5 12.5Q14 13 14 16Z" fill="${GOLD}" stroke="${INK}" stroke-width="0.7"/>`,
  // Plume
  ecriture: `<path d="M20.5 6.5Q12 8 9.5 18L11 19Q14.5 12 20.5 6.5Z" fill="${PAPER}" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/><path d="M9.5 18L8 21.5" stroke="${INK}" stroke-width="1.3" stroke-linecap="round"/><path d="M12.5 13.5L16 11" stroke="${INK}" stroke-width="0.7"/>`,
  // Sceau
  administration: `<path d="M8 8H18Q20 8 20 10V20H10Q8 20 8 18Z" fill="${PAPER}" stroke="${INK}" stroke-width="1.1"/><path d="M10.5 11H17.5M10.5 13.5H17.5M10.5 16H14" stroke="${INK}" stroke-width="0.8"/><circle cx="17.5" cy="18" r="2.6" fill="#a8281e" stroke="${INK}" stroke-width="0.8"/>`,
  // Croix médicale
  medecine: `<path d="M11.5 7.5H16.5V11.5H20.5V16.5H16.5V20.5H11.5V16.5H7.5V11.5H11.5Z" fill="#a8281e" stroke="${INK}" stroke-width="1"/>`,
  // Boussole
  navigation: `<circle cx="14" cy="14" r="7" fill="${PAPER}" stroke="${INK}" stroke-width="1.2"/><path d="M14 8.2L16 14L14 19.8L12 14Z" fill="${TEAL}" stroke="${INK}" stroke-width="0.7"/><path d="M14 8.2L16 14H12Z" fill="#a8281e"/><circle cx="14" cy="14" r="1" fill="${INK}"/>`,
  // Pièce
  monnaie: `<circle cx="14" cy="14" r="6.8" fill="${GOLD}" stroke="${INK}" stroke-width="1.2"/><circle cx="14" cy="14" r="4.8" fill="none" stroke="${INK}" stroke-width="0.7"/><path d="M14 10.5V17.5M12.2 12Q14 10.8 15.8 12M12.2 16Q14 17.2 15.8 16" fill="none" stroke="${INK}" stroke-width="0.9"/>`,
  // Balance
  droit: `<path d="M14 7.5V20.5M10 20.5H18M8 10H20" stroke="${INK}" stroke-width="1.3" stroke-linecap="round"/><path d="M8 10L5.8 15H10.2ZM20 10L17.8 15H22.2Z" fill="${PAPER}" stroke="${INK}" stroke-width="0.9" stroke-linejoin="round"/>`,
  // Arche
  architecture: `<path d="M7 21V12Q7 6.5 14 6.5Q21 6.5 21 12V21H17.5V13Q17.5 10 14 10Q10.5 10 10.5 13V21Z" fill="${PAPER}" stroke="${INK}" stroke-width="1.1"/><path d="M14 6.5V10" stroke="${INK}" stroke-width="0.8"/>`,
};

export function inventionIconSvg(category: InventionCategory): string {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="56" height="56">' +
    `<circle cx="14" cy="14" r="12.5" fill="#eef5f2" stroke="${TEAL}" stroke-width="1.8"/>${shape[category]}</svg>`
  );
}

export const CATEGORY_LABELS: Record<InventionCategory, string> = {
  technique: 'Technique', science: 'Science', militaire: 'Militaire', agriculture: 'Agriculture', ecriture: 'Écriture et savoir',
  administration: 'Administration', medecine: 'Médecine', navigation: 'Navigation', monnaie: 'Monnaie et finance', droit: 'Droit', architecture: 'Architecture',
};
