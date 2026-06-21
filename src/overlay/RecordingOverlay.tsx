import { listen } from "@tauri-apps/api/event";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CancelIcon,
  MicrophoneIcon,
  TranscriptionIcon,
} from "../components/icons";
import { commands } from "@/bindings";
import i18n, { syncLanguageFromSettings } from "@/i18n";
import { getLanguageDirection } from "@/lib/utils/rtl";
import "./RecordingOverlay.css";

type OverlayState = "recording" | "transcribing" | "processing";

const RecordingOverlay: React.FC = () => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [state, setState] = useState<OverlayState>("recording");
  const [levels, setLevels] = useState<number[]>(Array(9).fill(0));
  const smoothedRef = useRef<number[]>(Array(9).fill(0));
  const direction = getLanguageDirection(i18n.language);

  useEffect(() => {
    const setup = async () => {
      const unlistenShow = await listen("show-overlay", async (event) => {
        await syncLanguageFromSettings();
        setState(event.payload as OverlayState);
        setIsVisible(true);
      });

      const unlistenHide = await listen("hide-overlay", () => {
        setIsVisible(false);
      });

      const unlistenLevel = await listen<number[]>("mic-level", (event) => {
        const smoothed = smoothedRef.current.map((previous, index) => {
          const target = event.payload[index] ?? 0;
          return previous * 0.7 + target * 0.3;
        });
        smoothedRef.current = smoothed;
        setLevels(smoothed);
      });

      return () => {
        unlistenShow();
        unlistenHide();
        unlistenLevel();
      };
    };

    const cleanup = setup();
    return () => {
      cleanup.then((fn) => fn());
    };
  }, []);

  return (
    <div dir={direction} className="overlay-wrapper">
      <div className={`recording-overlay ${isVisible ? "fade-in" : ""}`}>
        <div className="overlay-left">
          {state === "recording" ? <MicrophoneIcon /> : <TranscriptionIcon />}
        </div>

        <div className="overlay-middle">
          {state === "recording" && (
            <div className="bars-container">
              {levels.map((value, index) => (
                <div
                  key={index}
                  className="bar"
                  style={{
                    height: `${Math.min(20, 4 + Math.pow(value, 0.7) * 16)}px`,
                    opacity: Math.max(0.2, value * 1.7),
                  }}
                />
              ))}
            </div>
          )}
          {state === "transcribing" && (
            <div className="transcribing-text">{t("overlay.transcribing")}</div>
          )}
          {state === "processing" && (
            <div className="transcribing-text">{t("overlay.processing")}</div>
          )}
        </div>

        <div className="overlay-right">
          {state === "recording" && (
            <button
              type="button"
              className="cancel-button"
              onClick={() => commands.cancelOperation()}
              title={t("common.cancel")}
            >
              <CancelIcon />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecordingOverlay;
