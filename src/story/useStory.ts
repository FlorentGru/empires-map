import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { readString, writeString } from '../lib/settings';
import type { Player } from '../player/usePlayer';
import type { TimelineStep } from '../types';
import { Narrator } from './narrator';
import { buildScript, type StorySegment } from './script';

export const RATES = [0.8, 0.95, 1.1] as const;
/** Pause entre la fin de la narration et l'étape suivante (ms). */
export const GAP_MS = 1500;
/** Durée minimale d'une étape pour laisser jouer les animations de carte (ms). */
export const MIN_STEP_MS = 5000;

export interface StoryControls {
  enabled: boolean;
  toggle: () => void;
  /** Aucune voix française : lecture silencieuse. */
  silent: boolean;
  voices: { uri: string; name: string }[];
  voiceURI: string | null;
  setVoice: (uri: string) => void;
  rate: number;
  setRate: (rate: number) => void;
}

/** Pilote la narration d'une étape et l'enchaînement des étapes via le lecteur. */
export function useStory(player: Player, step: TimelineStep | undefined, onEnable: () => void) {
  const { story: enabled, playing, index } = player;
  const narrator = useMemo(() => new Narrator(), []);
  const segments = useMemo<StorySegment[]>(() => (step ? buildScript(step) : []), [step]);
  const [current, setCurrent] = useState(-1);
  const [voiceTick, setVoiceTick] = useState(0);
  const [voiceURI, setVoiceURI] = useState<string | null>(() => readString('atlas.story.voice', null));
  const [rate, setRateState] = useState(() => {
    const r = Number(readString('atlas.story.rate', '0.95'));
    return RATES.includes(r as (typeof RATES)[number]) ? r : 0.95;
  });

  // Refs lues par les callbacks asynchrones.
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;
  const advanceRef = useRef(player.advance);
  advanceRef.current = player.advance;
  const started = useRef(false);
  const ended = useRef(false);
  const startedAt = useRef(0);
  const gapTimer = useRef<number | null>(null);

  useEffect(() => narrator.subscribe(() => setVoiceTick((t) => t + 1)), [narrator]);
  useEffect(() => {
    narrator.attach();
    return () => narrator.dispose();
  }, [narrator]);
  useEffect(() => {
    narrator.setVoiceURI(voiceURI);
    narrator.setRate(rate);
  }, [narrator, voiceURI, rate]);

  const clearGap = () => {
    if (gapTimer.current !== null) window.clearTimeout(gapTimer.current);
    gapTimer.current = null;
  };
  const scheduleAdvance = useCallback(() => {
    clearGap();
    const wait = Math.max(GAP_MS, MIN_STEP_MS - (performance.now() - startedAt.current));
    gapTimer.current = window.setTimeout(() => {
      gapTimer.current = null;
      advanceRef.current();
    }, wait);
  }, []);

  const begin = useCallback(() => {
    started.current = true;
    ended.current = false;
    startedAt.current = performance.now();
    narrator.speak(segmentsRef.current, {
      onSegment: setCurrent,
      onEnd: () => {
        ended.current = true;
        if (playingRef.current) scheduleAdvance();
      },
    });
  }, [narrator, scheduleAdvance]);

  // Nouvelle étape (ou mode activé/désactivé) : on repart de zéro.
  useEffect(() => {
    narrator.cancel();
    clearGap();
    started.current = false;
    ended.current = false;
    setCurrent(-1);
    if (enabled && playingRef.current) begin();
    return () => {
      narrator.cancel();
      clearGap();
    };
  }, [enabled, index, narrator, begin]);

  // Lecture / pause = reprise / pause de la narration.
  useEffect(() => {
    if (!enabled) return;
    if (playing) {
      if (!started.current) begin();
      else if (ended.current) scheduleAdvance();
      else narrator.resume();
    } else {
      clearGap();
      narrator.pause();
    }
  }, [playing, enabled, narrator, begin, scheduleAdvance]);

  const rawVoices = useMemo(
    () => narrator.getVoices().map((v) => ({ uri: v.voiceURI, name: v.name })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [narrator, voiceTick],
  );
  const silent = useMemo(
    () => !narrator.hasVoice(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [narrator, voiceTick],
  );

  const { setStory, play } = player;
  const toggle = useCallback(() => {
    if (enabled) {
      setStory(false);
    } else {
      onEnable();
      setStory(true);
      play();
    }
  }, [enabled, setStory, play, onEnable]);

  const controls = useMemo<StoryControls>(
    () => ({
      enabled,
      toggle,
      silent,
      voices: rawVoices,
      voiceURI: voiceURI ?? rawVoices[0]?.uri ?? null,
      setVoice: (uri) => {
        setVoiceURI(uri);
        writeString('atlas.story.voice', uri);
      },
      rate,
      setRate: (r) => {
        setRateState(r);
        writeString('atlas.story.rate', String(r));
      },
    }),
    [enabled, toggle, silent, rawVoices, voiceURI, rate],
  );

  return { controls, segments, current: enabled ? current : -1 };
}
