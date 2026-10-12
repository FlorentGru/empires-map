import { useEffect, useRef, useState } from 'react';
import { RATES, type StoryControls } from './useStory';

/** Bouton « Mode Histoire » + petit popover de réglages (voix, vitesse). */
export function StoryButton({ story }: { story: StoryControls }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="story-ctl" ref={ref}>
      <button
        type="button"
        className="btn story-btn"
        aria-pressed={story.enabled}
        onClick={story.toggle}
        title="Raconter chaque étape à voix haute et enchaîner les étapes"
      >
        <span aria-hidden="true">🎙</span> <span className="story-btn__label">Mode Histoire</span>
      </button>
      <button
        type="button"
        className="icon-btn story-settings-btn"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Réglages de la narration"
        title="Voix et vitesse de narration"
        onClick={() => setOpen((o) => !o)}
      >
        ⚙
      </button>
      {open && (
        <div className="story-popover" role="dialog" aria-label="Réglages de la narration">
          {story.silent ? (
            <p className="story-popover__warn">Voix française indisponible : lecture silencieuse</p>
          ) : (
            <label className="story-popover__row">
              <span>Voix</span>
              <select value={story.voiceURI ?? ''} onChange={(e) => story.setVoice(e.target.value)}>
                {story.voices.map((v) => (
                  <option key={v.uri} value={v.uri}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="story-popover__row">
            <span>Vitesse</span>
            <select value={story.rate} onChange={(e) => story.setRate(Number(e.target.value))} disabled={story.silent}>
              {RATES.map((r) => (
                <option key={r} value={r}>
                  {r === 0.8 ? 'Lente' : r === 0.95 ? 'Normale' : 'Rapide'} ({String(r).replace('.', ',')}×)
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}
