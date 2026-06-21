/**
 * TerminalSettings
 *
 * Single toggle: "Auto-format for terminal"
 *
 * When on (default), Handy detects whether the focused window is a terminal
 * emulator and automatically strips capitalisation and trailing punctuation
 * from transcribed text before injecting it — whether via the live
 * direct-mode injection or the final Whisper paste.
 *
 * The setting persists to localStorage and is synced to Rust via the
 * setTerminalFormatting command so it takes effect immediately.
 */

import React, { useEffect, useState } from "react";
import { commands } from "@/bindings";
import { ToggleSwitch } from "../ui/ToggleSwitch";

const STORAGE_KEY = "handy-terminal-formatting";

function readEnabled(): boolean {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v !== "false"; // default true
  } catch {
    return true;
  }
}

interface TerminalSettingsProps {
  grouped?: boolean;
}

export const TerminalSettings: React.FC<TerminalSettingsProps> = ({
  grouped = false,
}) => {
  const [enabled, setEnabledState] = useState(readEnabled);

  // Sync initial value to Rust on mount.
  useEffect(() => {
    commands.setTerminalFormatting(enabled).catch(console.warn);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setEnabled = (val: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(val));
    } catch { /* ignored */ }
    commands.setTerminalFormatting(val).catch(console.warn);
    setEnabledState(val);
  };

  return (
    <ToggleSwitch
      checked={enabled}
      onChange={setEnabled}
      label="Auto-format for terminal"
      description={
        "When you dictate into a terminal window, Handy automatically " +
        "lowercases the text and strips trailing punctuation (periods, " +
        "question marks, exclamation marks) that Whisper adds to speech " +
        "but that break shell commands. A >_ badge appears in the recording " +
        "pill when terminal mode is active. Disable this if you dictate " +
        "prose into a terminal-based editor like Vim or Emacs."
      }
      descriptionMode="tooltip"
      grouped={grouped}
    />
  );
};
