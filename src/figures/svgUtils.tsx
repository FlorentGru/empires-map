/** Redimensionne un SVG de figurine (décoratif : le nom est porté par le bouton). */
export function scaled(svg: string, scale: number): string {
  return svg
    .replace(/width="(\d+)" height="(\d+)"/, (_m, w: string, h: string) => `width="${Number(w) * scale}" height="${Number(h) * scale}"`)
    .replace(/ role="img" aria-label="[^"]*"/, ' aria-hidden="true"');
}

export const Svg = ({ html, className }: { html: string; className?: string }) => (
  <span className={className} aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />
);

export const norm = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
