import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { empireIndex } from './build/empireIndex';

// Le guide (agent Python, `npm run agent`) écoute sur le port 8000 : /api y est relayé.
const agentProxy = { '/api': 'http://localhost:8000' };

export default defineConfig({
  plugins: [react(), empireIndex()],
  server: { proxy: agentProxy },
  build: {
    rollupOptions: {
      // MapLibre (≈ 250 Ko compressés) dans son propre fichier : gardé en cache par le navigateur d'une version à l'autre.
      output: { manualChunks: (id) => (id.includes('node_modules/maplibre-gl') ? 'maplibre' : undefined) },
    },
  },
  preview: { proxy: agentProxy },
});
