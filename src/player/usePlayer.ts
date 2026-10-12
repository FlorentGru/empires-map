import { useEffect, useMemo, useReducer } from 'react';

export const SPEEDS = [0.5, 1, 2] as const;
export type Speed = (typeof SPEEDS)[number];

/** Durée d'une étape à vitesse 1 (ms). */
export const BASE_STEP_MS = 6000;

interface PlayerState {
  index: number;
  playing: boolean;
  speed: Speed;
  loop: boolean;
}

type PlayerAction =
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'toggle' }
  | { type: 'next'; auto?: boolean }
  | { type: 'prev' }
  | { type: 'goTo'; index: number }
  | { type: 'setSpeed'; speed: Speed }
  | { type: 'setLoop'; loop: boolean };

function makeReducer(count: number) {
  const clamp = (i: number) => Math.max(0, Math.min(count - 1, i));
  return (state: PlayerState, action: PlayerAction): PlayerState => {
    const last = count - 1;
    switch (action.type) {
      case 'play':
        // Relancer depuis le début si on est à la fin.
        return { ...state, playing: true, index: state.index >= last && !state.loop ? 0 : state.index };
      case 'pause':
        return { ...state, playing: false };
      case 'toggle':
        return state.playing
          ? { ...state, playing: false }
          : { ...state, playing: true, index: state.index >= last && !state.loop ? 0 : state.index };
      case 'next':
        if (state.index < last) return { ...state, index: state.index + 1 };
        if (state.loop) return { ...state, index: 0 };
        return action.auto ? { ...state, playing: false } : state;
      case 'prev':
        if (state.index > 0) return { ...state, index: state.index - 1 };
        return state.loop ? { ...state, index: last } : state;
      case 'goTo':
        return { ...state, index: clamp(action.index) };
      case 'setSpeed':
        return { ...state, speed: action.speed };
      case 'setLoop':
        return { ...state, loop: action.loop };
    }
  };
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

export function usePlayer(stepCount: number, initialIndex = 0) {
  const reducer = useMemo(() => makeReducer(Math.max(1, stepCount)), [stepCount]);
  const [state, dispatch] = useReducer(reducer, {
    index: Math.max(0, Math.min(stepCount - 1, initialIndex)),
    playing: false,
    speed: 1,
    loop: false,
  });

  // Avance automatique.
  useEffect(() => {
    if (!state.playing) return;
    const id = window.setTimeout(() => dispatch({ type: 'next', auto: true }), BASE_STEP_MS / state.speed);
    return () => window.clearTimeout(id);
  }, [state.playing, state.index, state.speed]);

  // Raccourcis clavier : Espace, ←, →.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || isEditable(e.target)) return;
      if (document.querySelector('dialog[open]')) return;
      if (e.key === ' ' || e.code === 'Space') {
        // Sur un bouton focalisé, Espace l'active déjà : on ne double pas l'action.
        if (e.target instanceof HTMLButtonElement) return;
        e.preventDefault();
        dispatch({ type: 'toggle' });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        dispatch({ type: 'next' });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        dispatch({ type: 'prev' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // `dispatch` est stable : les actions le sont aussi.
  const actions = useMemo(
    () => ({
      play: () => dispatch({ type: 'play' }),
      pause: () => dispatch({ type: 'pause' }),
      toggle: () => dispatch({ type: 'toggle' }),
      next: () => dispatch({ type: 'next' }),
      prev: () => dispatch({ type: 'prev' }),
      goTo: (index: number) => dispatch({ type: 'goTo', index }),
      setSpeed: (speed: Speed) => dispatch({ type: 'setSpeed', speed }),
      setLoop: (loop: boolean) => dispatch({ type: 'setLoop', loop }),
    }),
    [],
  );

  return { ...state, ...actions };
}

export type Player = ReturnType<typeof usePlayer>;
