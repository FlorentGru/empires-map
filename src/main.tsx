import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'maplibre-gl/dist/maplibre-gl.css';
import './styles.css';
import { App } from './App';

const root = createRoot(document.getElementById('root')!);
if (new URLSearchParams(location.search).get('figures') === 'demo') {
  void import('./figures/FiguresDemo').then(({ FiguresDemo }) =>
    root.render(
      <StrictMode>
        <FiguresDemo />
      </StrictMode>,
    ),
  );
} else {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
