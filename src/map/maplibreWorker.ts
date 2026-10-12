import { setWorkerUrl } from 'maplibre-gl';
// Le worker de maplibre-gl 6 est un module autonome : on le sert tel quel.
// Sans cela, Vite (pré-bundling des deps) casse la résolution relative via import.meta.url.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';

setWorkerUrl(workerUrl);
