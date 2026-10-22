import { characterSvg, useSprites } from '../map/sprites';

/** Avatar du sage : l'espace est réservé tout de suite, le dessin apparaît dès que les sprites sont chargés. */
export function Sage({ width, height }: { width: number; height: number }) {
  useSprites();
  const svg = characterSvg('sage').replace('width="36" height="48"', `width="${width}" height="${height}"`);
  return <span style={{ display: 'inline-block', width, height, lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: svg }} />;
}
