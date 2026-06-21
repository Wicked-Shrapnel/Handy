/**
 * TTSReader
 *
 * A persistent, floating panel that appears at the bottom of the settings
 * window while text-to-speech is active. Words are highlighted in real-time
 * as they are spoken.
 *
 * Rendered by App.tsx as a portal; only visible when `state.isSpeaking`.
 */

import React, { useEffect, useRef } from "react";
import { useTTSContext } from "@/contexts/TTSContext";

/** Icons as inline SVG to avoid any asset-loading issues. */
const PauseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </svg>
);

const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const StopIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
);

const SpeakerIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
);

export function TTSReader() {
  const { state, stop, pause, resume } = useTTSContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // Scroll the active word into view.
  useEffect(() => {
    const el = wordRefs.current[state.currentWordIndex];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
  }, [state.currentWordIndex]);

  // Resize the word refs array whenever the word list changes.
  useEffect(() => {
    wordRefs.current = wordRefs.current.slice(0, state.words.length);
  }, [state.words]);

  if (!state.isSpeaking && !state.isPaused) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9998,
        padding: "0 16px 16px",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          pointerEvents: "auto",
          background: "rgba(10, 10, 14, 0.97)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderRadius: "16px",
          border: "1px solid rgba(255,255,255,0.09)",
          boxShadow:
            "0 -4px 6px -1px rgba(0,0,0,0.4), 0 20px 40px -12px rgba(0,0,0,0.6)",
          overflow: "hidden",
        }}
      >
        {/* Header bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 14px 8px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <span style={{ color: "#a78bfa", display: "flex", alignItems: "center" }}>
            <SpeakerIcon />
          </span>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.35)",
              fontFamily: "system-ui, sans-serif",
              flex: 1,
            }}
          >
            Reading aloud
          </span>

          {/* Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              onClick={state.isPaused ? resume : pause}
              title={state.isPaused ? "Resume" : "Pause"}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                border: "none",
                background: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.7)",
                cursor: "pointer",
                transition: "background 150ms",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(255,255,255,0.14)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(255,255,255,0.08)")
              }
            >
              {state.isPaused ? <PlayIcon /> : <PauseIcon />}
            </button>

            <button
              onClick={stop}
              title="Stop"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                border: "none",
                background: "rgba(239,68,68,0.12)",
                color: "rgba(239,68,68,0.7)",
                cursor: "pointer",
                transition: "background 150ms",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(239,68,68,0.22)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(239,68,68,0.12)")
              }
            >
              <StopIcon />
            </button>
          </div>
        </div>

        {/* Word display */}
        <div
          ref={containerRef}
          style={{
            padding: "12px 14px 14px",
            maxHeight: "110px",
            overflowY: "auto",
            lineHeight: 1.85,
            fontSize: "14px",
            fontFamily: "system-ui, -apple-system, sans-serif",
            // Custom scrollbar — webkit
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(255,255,255,0.12) transparent",
          }}
        >
          {state.words.map((w, i) => {
            const isActive = i === state.currentWordIndex;
            const isSpoken = i < state.currentWordIndex;

            return (
              <React.Fragment key={i}>
                <span
                  ref={(el) => {
                    wordRefs.current[i] = el;
                  }}
                  style={{
                    display: "inline",
                    color: isActive
                      ? "#000"
                      : isSpoken
                      ? "rgba(255,255,255,0.28)"
                      : "rgba(255,255,255,0.82)",
                    background: isActive ? "#fde68a" : "transparent",
                    borderRadius: isActive ? "4px" : "0",
                    padding: isActive ? "1px 3px" : "1px 0",
                    fontWeight: isActive ? 600 : 400,
                    transition: "all 80ms ease-out",
                    boxDecorationBreak: "clone",
                    WebkitBoxDecorationBreak: "clone",
                  }}
                >
                  {w.word}
                </span>
                {i < state.words.length - 1 ? " " : ""}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
