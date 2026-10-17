// Chargement d'icônes SVG dans MapLibre (raster ×2 pour la netteté), une seule fois par style.
import type { Map as MapLibreMap } from 'maplibre-gl';

export async function addSvgImages(map: MapLibreMap, images: [id: string, svg: string, size: number, height?: number][]): Promise<void> {
  await Promise.all(
    images.map(
      ([id, svg, size, height = size]) =>
        new Promise<void>((resolve) => {
          if (map.hasImage(id)) return resolve();
          const img = new Image(size * 2, height * 2);
          img.onload = () => {
            if (!map.hasImage(id)) map.addImage(id, img, { pixelRatio: 2 });
            resolve();
          };
          img.onerror = () => resolve();
          img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        }),
    ),
  );
}
