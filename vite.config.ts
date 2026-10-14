import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Le guide (agent Python, `npm run agent`) écoute sur le port 8000 : /api y est relayé.
const agentProxy = { '/api': 'http://localhost:8000' };

export default defineConfig({
  plugins: [react()],
  server: { proxy: agentProxy },
  preview: { proxy: agentProxy },
});
