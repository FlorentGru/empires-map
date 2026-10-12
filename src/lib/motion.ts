export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Interpolation 0→1 sur `duration` ms via requestAnimationFrame. Retourne une fonction d'annulation. */
export function tween(duration: number, onFrame: (t: number) => void, onDone?: () => void): () => void {
  if (duration <= 0 || prefersReducedMotion()) {
    onFrame(1);
    onDone?.();
    return () => {};
  }
  let raf = 0;
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    onFrame(t);
    if (t < 1) raf = requestAnimationFrame(step);
    else onDone?.();
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}
