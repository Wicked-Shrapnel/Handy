/**
 * ContextMenu
 *
 * Intercepts right-clicks anywhere in the main app window. When the user
 * has selected text at the time of the click, a small floating menu appears
 * offering a "Read Aloud" action powered by the TTS engine.
 *
 * Only the "Read Aloud" item is shown when text is selected (keeping the
 * menu focused). If no text is selected the default browser context menu is
 * allowed through.
 *
 * Rendered once inside App.tsx — no portals needed; the fixed-position
 * container is naturally above all other content.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTTSContext } from "@/contexts/TTSContext";

interface MenuState {
  visible: boolean;
  x: number;
  y: number;
  selectedText: string;
}

const CLOSED: MenuState = { visible: false, x: 0, y: 0, selectedText: "" };

const SpeakerIcon = () => (
  <svg
    width="13"
    height="13"
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

export function ContextMenu() {
  const [menu, setMenu] = useState<MenuState>(CLOSED);
  const menuRef = useRef<HTMLDivElement>(null);
  const { speak, state: ttsState } = useTTSContext();

  /* ── Close helpers ──────────────────────────────────────────────── */
  const close = useCallback(() => setMenu(CLOSED), []);

  /* ── Context-menu handler ───────────────────────────────────────── */
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const selectedText = window.getSelection()?.toString().trim() ?? "";

      if (!selectedText) {
        // Nothing selected — let the default browser menu appear.
        return;
      }

      e.preventDefault();

      // Calculate where to place the menu, keeping it inside the viewport.
      // MENU_H covers: button (~34px) + preview section (~26px) + padding (8px) = ~90px
      const MENU_W = 180;
      const MENU_H = 96;
      const x = Math.min(e.clientX, window.innerWidth - MENU_W - 8);
      const y = Math.min(e.clientY, window.innerHeight - MENU_H - 8);

      setMenu({ visible: true, x, y, selectedText });
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [close]);

  /* ── Handlers ───────────────────────────────────────────────────── */
  const handleReadAloud = () => {
    speak(menu.selectedText);
    close();
  };

  /* ── Render ─────────────────────────────────────────────────────── */
  if (!menu.visible) return null;

  const isAlreadySpeaking = ttsState.isSpeaking || ttsState.isPaused;

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Text options"
      style={{
        position: "fixed",
        left: menu.x,
        top: menu.y,
        zIndex: 99999,
        minWidth: "160px",
        background: "rgba(22, 22, 28, 0.97)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "10px",
        boxShadow:
          "0 4px 6px -1px rgba(0,0,0,0.4), 0 10px 24px -4px rgba(0,0,0,0.5)",
        overflow: "hidden",
        padding: "4px",
        fontFamily: "system-ui, -apple-system, sans-serif",
        animation: "ctxFadeIn 100ms ease-out",
      }}
    >
      <style>{`
        @keyframes ctxFadeIn {
          from { opacity: 0; transform: scale(0.95) translateY(-4px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>

      {/* "Read Aloud" item */}
      <button
        role="menuitem"
        onClick={handleReadAloud}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          width: "100%",
          padding: "7px 12px",
          border: "none",
          borderRadius: "7px",
          background: "transparent",
          color: "rgba(255,255,255,0.88)",
          fontSize: "13px",
          fontWeight: 500,
          cursor: "pointer",
          textAlign: "left",
          transition: "background 100ms",
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.background =
            "rgba(167,139,250,0.15)")
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.background = "transparent")
        }
      >
        <span style={{ color: "#a78bfa", display: "flex", alignItems: "center", flexShrink: 0 }}>
          <SpeakerIcon />
        </span>
        <span>{isAlreadySpeaking ? "Read Aloud (replace)" : "Read Aloud"}</span>
      </button>

      {/* Divider + preview of selected text (truncated) */}
      {menu.selectedText.length > 0 && (
        <div
          style={{
            margin: "3px 6px 3px",
            paddingTop: "5px",
            borderTop: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <p
            style={{
              margin: 0,
              padding: "0 6px 4px",
              fontSize: "11px",
              color: "rgba(255,255,255,0.28)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "160px",
            }}
          >
            "{menu.selectedText.slice(0, 40)}
            {menu.selectedText.length > 40 ? "…" : ""}"
          </p>
        </div>
      )}
    </div>
  );
}
