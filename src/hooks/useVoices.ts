/**
 * useVoices
 *
 * Enumerates available speech synthesis voices from the OS/browser.
 * `speechSynthesis.getVoices()` often returns an empty list on first call;
 * this hook subscribes to `voiceschanged` and refreshes automatically.
 *
 * Returns an empty array when speechSynthesis is unavailable (e.g. Linux
 * builds with a WebKitGTK that lacks the API).
 */

import { useEffect, useState } from "react";

export interface VoiceOption {
  /** Unique identifier used to select the voice. */
  voiceURI: string;
  /** Human-readable name (e.g. "Samantha", "Google US English"). */
  name: string;
  /** BCP-47 language tag (e.g. "en-US", "fr-FR"). */
  lang: string;
  /** True if this is the browser/OS default voice. */
  isDefault: boolean;
  /** True for on-device (offline) voices; false for network voices. */
  isLocal: boolean;
}

export function useVoices(): VoiceOption[] {
  const [voices, setVoices] = useState<VoiceOption[]>([]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;

    const toOption = (v: SpeechSynthesisVoice): VoiceOption => ({
      voiceURI: v.voiceURI,
      name: v.name,
      lang: v.lang,
      isDefault: v.default,
      isLocal: v.localService,
    });

    const update = () => {
      const raw = window.speechSynthesis.getVoices();
      if (raw.length > 0) {
        setVoices(raw.map(toOption));
      }
    };

    update(); // may return [] on first call in some browsers

    window.speechSynthesis.addEventListener("voiceschanged", update);
    // Polite retry for browsers that don't fire the event reliably.
    const timer = setTimeout(update, 500);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", update);
      clearTimeout(timer);
    };
  }, []);

  return voices;
}
