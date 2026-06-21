/**
 * TTSContext
 *
 * Provides a single TTS instance to the entire main app, plus:
 *  - availableVoices: list of all system TTS voices
 *  - selectedVoiceURI: the voice the user has picked for playback
 *  - setSelectedVoiceURI: update the selection
 *
 * speak(text) automatically uses the currently selected voice.
 * speakRaw(text, voiceURI?) bypasses the selection for one-off calls.
 *
 * Wrap the root of the main app (App.tsx) with <TTSProvider>.
 */

import React, { createContext, ReactNode, useCallback, useContext, useState } from "react";
import { useTTS, TTSState, UseTTSReturn } from "@/hooks/useTTS";
import { useVoices, VoiceOption } from "@/hooks/useVoices";

export interface TTSContextValue {
  /** Speak using the currently selected voice (or system default if none). */
  speak: (text: string) => void;
  /** Speak with an explicit voice URI override (used internally). */
  speakRaw: (text: string, voiceURI?: string | null) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  state: TTSState;
  availableVoices: VoiceOption[];
  selectedVoiceURI: string | null;
  setSelectedVoiceURI: (uri: string | null) => void;
}

const TTSContext = createContext<TTSContextValue | null>(null);

export function TTSProvider({ children }: { children: ReactNode }) {
  const tts = useTTS();
  const voices = useVoices();
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string | null>(null);

  /** speak() wraps tts.speak() and injects the selected voice automatically. */
  const speak = useCallback(
    (text: string) => {
      tts.speak(text, selectedVoiceURI);
    },
    // tts.speak is a stable useCallback ref; tts itself is a new object
    // each render, so we target the function directly to avoid churning.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tts.speak, selectedVoiceURI],
  );

  const value: TTSContextValue = {
    speak,
    speakRaw: tts.speak,
    stop: tts.stop,
    pause: tts.pause,
    resume: tts.resume,
    state: tts.state,
    availableVoices: voices,
    selectedVoiceURI,
    setSelectedVoiceURI,
  };

  return <TTSContext.Provider value={value}>{children}</TTSContext.Provider>;
}

export function useTTSContext(): TTSContextValue {
  const ctx = useContext(TTSContext);
  if (!ctx) {
    throw new Error("useTTSContext must be used within <TTSProvider>");
  }
  return ctx;
}
