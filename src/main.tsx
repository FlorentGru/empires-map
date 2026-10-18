import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'maplibre-gl/dist/maplibre-gl.css';
import './styles.css';
import { App } from './App';
import { loadEmpire, resolveEmpireId } from './data/loadEmpire';
import { readUrlState } from './player/urlState';

// Ancienne démo : redirigée vers la galerie des figurines.
{
  const url = new URL(window.location.href);
  if (url.searchParams.get('figures') === 'demo') {
    url.searchParams.set('figures', 'gallery');
    window.history.replaceState(null, '', url);
  }
}

// Seule la timeline de l'empire affiché est chargée avant le premier rendu (les autres à la demande).
void loadEmpire(resolveEmpireId(readUrlState().empire)).then(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  ),
);
