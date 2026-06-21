/**
 * useTTS — Text-to-Speech hook with word-level highlighting.
 *
 * Uses the browser's SpeechSynthesis API (available in all Tauri-supported
 * webviews: WebView2 on Windows, WKWebView on macOS, WebKitGTK on Linux).
 *
 * Features:
 *  - speak(text, voiceURI?): begins reading aloud with optional voice override
 *  - pause() / resume() / stop(): playback controls
 *  - state.currentWordIndex: tracks which word is currently being spoken
 *  - state.words: array of parsed words (with char-level positions)
 */

import { useCallback, useEffect, useRef, useState } from "react";

export interface TTSWord {
  word: string;
  /** Start character index in the original text. */
  startChar: number;
  /** End character index (exclusive). */
  endChar: number;
}

export interface TTSState {
  isSpeaking: boolean;
  isPaused: boolean;
  /** The text currently being spoken. */
  text: string;
  /** Words parsed from `text`. */
  words: TTSWord[];
  /** Index into `words` for the currently spoken word (-1 = not speaking). */
  currentWordIndex: number;
  /** Whether speechSynthesis is available in this environment. */
  isSupported: boolean;
}

export interface UseTTSReturn {
  /**
   * Speak `text` using the given voice URI.
   * Pass `null` to use the system default voice.
   */
  speak: (text: string, voiceURI?: string | null) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  state: TTSState;
}

/** Parse a string into word tokens with character offsets. */
function parseWords(text: string): TTSWord[] {
  const words: TTSWord[] = [];
  const rx = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(text)) !== null) {
    words.push({ word: m[0], startChar: m.index, endChar: m.index + m[0].length });
  }
  return words;
}

const INITIAL_STATE: TTSState = {
  isSpeaking: false,
  isPaused: false,
  text: "",
  words: [],
  currentWordIndex: -1,
  isSupported: typeof window !== "undefined" && "speechSynthesis" in window,
};

export function useTTS(): UseTTSReturn {
  const [state, setState] = useState<TTSState>(INITIAL_STATE);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    utteranceRef.current = null;
    setState((prev) => ({
      ...prev,
      isSpeaking: false,
      isPaused: false,
      currentWordIndex: -1,
      text: "",
      words: [],
    }));
  }, []);

  const pause = useCallback(() => {
    if (window.speechSynthesis?.speaking && !window.speechSynthesis?.paused) {
      window.speechSynthesis.pause();
      setState((prev) => ({ ...prev, isPaused: true }));
    }
  }, []);

  const resume = useCallback(() => {
    if (window.speechSynthesis?.paused) {
      window.speechSynthesis.resume();
      setState((prev) => ({ ...prev, isPaused: false }));
    }
  }, []);

  const speak = useCallback((rawText: string, voiceURI?: string | null) => {
    if (!("speechSynthesis" in window)) return;

    // Cancel any in-flight utterance.
    window.speechSynthesis.cancel();
    utteranceRef.current = null;

    const text = rawText.trim();
    if (!text) return;

    const words = parseWords(text);
    const utterance = new SpeechSynthesisUtterance(text);

    // Apply a specific voice if one was requested.
    if (voiceURI) {
      const allVoices = window.speechSynthesis.getVoices();
      const matched = allVoices.find((v) => v.voiceURI === voiceURI);
      if (matched) {
        utterance.voice = matched;
        // Lock the language to that voice so the engine doesn't override it.
        utterance.lang = matched.lang;
      }
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onboundary = (event: SpeechSynthesisEvent) => {
      if (event.name !== "word") return;
      const ci = event.charIndex;
      const idx = words.findIndex(
        (w) => ci >= w.startChar && ci < w.endChar,
      );
      if (idx !== -1) {
        setState((prev) => ({ ...prev, currentWordIndex: idx }));
      }
    };

    utterance.onstart = () => {
      setState({
        isSpeaking: true,
        isPaused: false,
        text,
        words,
        currentWordIndex: 0,
        isSupported: true,
      });
    };

    utterance.onend = () => {
      utteranceRef.current = null;
      setState((prev) => ({
        ...prev,
        isSpeaking: false,
        isPaused: false,
        currentWordIndex: -1,
      }));
    };

    utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
      if (event.error !== "interrupted" && event.error !== "canceled") {
        console.warn("[TTS] utterance error:", event.error);
      }
      utteranceRef.current = null;
      setState((prev) => ({
        ...prev,
        isSpeaking: false,
        isPaused: false,
        currentWordIndex: -1,
      }));
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  return { speak, stop, pause, resume, state };
}
