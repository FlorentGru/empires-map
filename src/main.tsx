import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'maplibre-gl/dist/maplibre-gl.css';
import './styles.css';
import { App } from './App';

// Ancienne démo : redirigée vers la galerie des figurines.
{
  const url = new URL(window.location.href);
  if (url.searchParams.get('figures') === 'demo') {
    url.searchParams.set('figures', 'gallery');
    window.history.replaceState(null, '', url);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
