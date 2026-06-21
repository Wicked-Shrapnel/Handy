/**
 * useTheme
 *
 * Manages the user's chosen color theme.
 *
 * Preset themes: Neutral · Slate · Blue · Teal · Stone
 * Custom theme:  user picks any hex via <input type="color">;
 *                stroke and bg-ui are automatically derived via HSL math.
 *
 * Persistence:
 *   "handy-theme"               → ThemeId string
 *   "handy-theme-custom-light"  → JSON { primary, stroke, bgUi } for light mode
 *   "handy-theme-custom-dark"   → JSON { primary, stroke, bgUi } for dark mode
 *   "handy-theme-custom-raw"    → raw hex the user picked (shown in color input)
 *
 * Storing the derived colors separately means the anti-FOUC inline script in
 * index.html can apply them before React loads without needing to redo HSL math.
 */

import { useCallback, useEffect, useState } from "react";

/* ── Theme catalogue ────────────────────────────────────────────── */

export type ThemeId = "neutral" | "slate" | "blue" | "teal" | "stone" | "custom";

export interface ThemePalette {
  id: ThemeId;
  name: string;
  /** Hex shown in the swatch circle in light mode. "rainbow" = special CSS gradient. */
  swatch: string;
  /** Hex shown in the swatch circle in dark mode. */
  swatchDark: string;
  isCustom?: true;
}

export const THEMES: ThemePalette[] = [
  { id: "neutral", name: "Neutral", swatch: "#a1a1aa", swatchDark: "#a1a1aa" },
  { id: "slate",   name: "Slate",   swatch: "#94a3b8", swatchDark: "#94a3b8" },
  { id: "blue",    name: "Blue",    swatch: "#93c5fd", swatchDark: "#60a5fa" },
  { id: "teal",    name: "Teal",    swatch: "#5eead4", swatchDark: "#2dd4bf" },
  { id: "stone",   name: "Stone",   swatch: "#a8a29e", swatchDark: "#a8a29e" },
  {
    id: "custom",
    name: "Custom",
    swatch: "rainbow",
    swatchDark: "rainbow",
    isCustom: true,
  },
];

const VALID_IDS = THEMES.map((t) => t.id);

/* ── Storage keys ───────────────────────────────────────────────── */

const THEME_KEY        = "handy-theme";
const CUSTOM_RAW_KEY   = "handy-theme-custom-raw";
const CUSTOM_LIGHT_KEY = "handy-theme-custom-light";
const CUSTOM_DARK_KEY  = "handy-theme-custom-dark";
const DEFAULT_THEME: ThemeId = "neutral";

interface DerivedColors { primary: string; stroke: string; bgUi: string }

function readStorage<T>(key: string): T | null {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch { return null; }
}
function writeStorage(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignored */ }
}

/* ── HSL colour utilities ───────────────────────────────────────── */

function hexToHSL(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l   = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if      (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else                h = ((r - g) / d + 4) / 6;
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h: number, s: number, l: number): string {
  const ll = l / 100, ss = s / 100;
  const a = ss * Math.min(ll, 1 - ll);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = ll - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Derive stroke and bg-ui accent colors from a primary hex, tuned for
 * legibility on light or dark backgrounds.
 *
 * Achromatic inputs (s < 8%) are treated as true greys — saturation is
 * never boosted, so they don't get an unexpected hue.
 */
export function deriveThemeColors(primaryHex: string, isDark: boolean): DerivedColors {
  const [h, s, l] = hexToHSL(primaryHex);
  const isGrey = s < 8; // treat as achromatic

  if (isDark) {
    const stroke = hslToHex(h, isGrey ? 0 : clamp(s - 10, 20, 90), clamp(l + 32, 55, 88));
    const bgUi   = hslToHex(h, isGrey ? 0 : clamp(s + 5,  30, 100), clamp(l - 12, 15, 60));
    return { primary: primaryHex, stroke, bgUi };
  } else {
    const stroke = hslToHex(h, isGrey ? 0 : clamp(s + 15, 30, 100), clamp(l - 38, 8, 45));
    const bgUi   = hslToHex(h, isGrey ? 0 : clamp(s + 10, 30, 100), clamp(l - 8,  15, 65));
    return { primary: primaryHex, stroke, bgUi };
  }
}

/* ── DOM application ────────────────────────────────────────────── */

function applyPreset(id: ThemeId) {
  const root = document.documentElement;
  // Remove any leftover inline custom vars
  root.style.removeProperty("--color-logo-primary");
  root.style.removeProperty("--color-logo-stroke");
  root.style.removeProperty("--color-background-ui");
  root.setAttribute("data-theme", id);
}

function applyCustomColors(colors: DerivedColors) {
  const root = document.documentElement;
  root.setAttribute("data-theme", "custom");
  root.style.setProperty("--color-logo-primary",  colors.primary);
  root.style.setProperty("--color-logo-stroke",   colors.stroke);
  root.style.setProperty("--color-background-ui", colors.bgUi);
}

/* ── Hook ───────────────────────────────────────────────────────── */

function readStoredTheme(): ThemeId {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v && VALID_IDS.includes(v as ThemeId)) return v as ThemeId;
  } catch { /* ignored */ }
  return DEFAULT_THEME;
}

function readRawCustom(): string {
  try { return localStorage.getItem(CUSTOM_RAW_KEY) ?? "#6366f1"; }
  catch { return "#6366f1"; }
}

export function useTheme() {
  const [theme,       setThemeState]  = useState<ThemeId>(readStoredTheme);
  const [customColor, setCustomState] = useState<string>(readRawCustom);
  const [isDark, setIsDark] = useState(
    () => typeof window !== "undefined" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  // Track dark-mode changes
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // On mount — apply whatever is persisted (index.html already did a rough
  // version but this one derives the full custom palette if needed)
  useEffect(() => {
    const t = readStoredTheme();
    if (t === "custom") {
      const stored = readStorage<DerivedColors>(
        isDark ? CUSTOM_DARK_KEY : CUSTOM_LIGHT_KEY,
      );
      if (stored) applyCustomColors(stored);
      else        applyPreset("neutral"); // fallback if no custom color saved yet
    } else {
      applyPreset(t);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-apply custom palette when dark mode toggles
  useEffect(() => {
    if (theme !== "custom") return;
    const stored = readStorage<DerivedColors>(
      isDark ? CUSTOM_DARK_KEY : CUSTOM_LIGHT_KEY,
    );
    if (stored) applyCustomColors(stored);
  }, [isDark, theme]);

  /** Switch to a preset theme. */
  const setTheme = useCallback((id: ThemeId) => {
    try { localStorage.setItem(THEME_KEY, id); } catch { /* ignored */ }
    applyPreset(id);
    setThemeState(id);
  }, []);

  /**
   * Update the custom color. Derives stroke + bg-ui for both light and
   * dark mode, persists all variants, then applies the correct one now.
   */
  const setCustomColor = useCallback((hex: string, dark: boolean) => {
    const light = deriveThemeColors(hex, false);
    const dark_  = deriveThemeColors(hex, true);
    writeStorage(CUSTOM_LIGHT_KEY, light);
    writeStorage(CUSTOM_DARK_KEY,  dark_);
    try { localStorage.setItem(CUSTOM_RAW_KEY, hex); } catch { /* ignored */ }
    try { localStorage.setItem(THEME_KEY, "custom"); } catch { /* ignored */ }
    applyCustomColors(dark ? dark_ : light);
    setCustomState(hex);
    setThemeState("custom");
  }, []);

  return { theme, setTheme, isDark, customColor, setCustomColor };
}
