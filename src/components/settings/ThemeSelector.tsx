/**
 * ThemeSelector
 *
 * A row of preset neutral swatches + a "Custom" swatch that opens the
 * native OS colour picker (via a hidden <input type="color">).
 *
 * Preset swatches: Neutral · Slate · Blue · Teal · Stone
 * Custom swatch:   rainbow conic-gradient → click → OS colour wheel
 */

import React, { useRef } from "react";
import { Check, Pipette } from "lucide-react";
import { SettingContainer } from "../ui/SettingContainer";
import { THEMES, useTheme } from "@/hooks/useTheme";

interface ThemeSelectorProps {
  grouped?: boolean;
}

/** Conic-gradient rainbow used as the "pick any colour" preview. */
const RAINBOW_BG =
  "conic-gradient(" +
  "hsl(0 70% 68%),hsl(30 70% 68%),hsl(60 70% 68%),hsl(90 70% 68%)," +
  "hsl(120 70% 68%),hsl(150 70% 68%),hsl(180 70% 68%),hsl(210 70% 68%)," +
  "hsl(240 70% 68%),hsl(270 70% 68%),hsl(300 70% 68%),hsl(330 70% 68%)," +
  "hsl(0 70% 68%))";

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  grouped = false,
}) => {
  const { theme, setTheme, isDark, customColor, setCustomColor } = useTheme();
  const colorInputRef = useRef<HTMLInputElement>(null);

  const handleCustomSwatchClick = () => {
    // Switch to custom mode first so the ring appears immediately
    if (theme !== "custom") setTheme("custom");
    colorInputRef.current?.click();
  };

  const handleColorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomColor(e.target.value, isDark);
  };

  return (
    <SettingContainer
      title="Theme color"
      description="Choose an accent color used throughout the interface"
      grouped={grouped}
      layout="stacked"
      descriptionMode="tooltip"
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          paddingTop: "6px",
          paddingBottom: "4px",
        }}
      >
        {THEMES.map((palette) => {
          const isSelected = theme === palette.id;
          const isCustom   = !!palette.isCustom;

          // Determine the swatch background
          const swatchBg = isCustom
            ? theme === "custom"
              ? customColor // show the picked color
              : RAINBOW_BG  // show rainbow until a color is picked
            : isDark
              ? palette.swatchDark
              : palette.swatch;

          // For the ring color: use customColor if custom+selected, else the swatch hex
          const ringColor = isCustom && isSelected ? customColor : swatchBg;

          return (
            <button
              key={palette.id}
              onClick={isCustom ? handleCustomSwatchClick : () => setTheme(palette.id)}
              title={isCustom ? "Pick a custom colour" : palette.name}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "5px",
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
              }}
            >
              {/* Swatch circle */}
              <span
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  background: swatchBg,
                  boxShadow: isSelected
                    ? `0 0 0 2.5px white, 0 0 0 4.5px ${ringColor}`
                    : "0 1px 3px rgba(0,0,0,0.18)",
                  transform: isSelected ? "scale(1.08)" : "scale(1)",
                  transition:
                    "box-shadow 150ms ease, transform 150ms ease, filter 150ms ease",
                  overflow: "hidden",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLSpanElement).style.transform = "scale(1.12)";
                    (e.currentTarget as HTMLSpanElement).style.filter    = "brightness(1.08)";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLSpanElement).style.transform =
                    isSelected ? "scale(1.08)" : "scale(1)";
                  (e.currentTarget as HTMLSpanElement).style.filter = "";
                }}
              >
                {/* Preset: checkmark when selected */}
                {!isCustom && isSelected && (
                  <Check
                    size={13}
                    strokeWidth={3}
                    style={{
                      color: "white",
                      filter: "drop-shadow(0 1px 1.5px rgba(0,0,0,0.35))",
                      flexShrink: 0,
                    }}
                  />
                )}

                {/* Custom: pipette icon always visible */}
                {isCustom && (
                  <Pipette
                    size={13}
                    strokeWidth={2.5}
                    style={{
                      color: "white",
                      filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.55))",
                      flexShrink: 0,
                    }}
                  />
                )}
              </span>

              {/* Label */}
              <span
                style={{
                  fontSize: "10px",
                  lineHeight: 1,
                  fontWeight: isSelected ? 600 : 400,
                  color: isSelected && !isCustom
                    ? (isDark ? palette.swatchDark : palette.swatch)
                    : isSelected && isCustom
                      ? customColor
                      : undefined,
                  opacity: isSelected ? 1 : 0.6,
                  transition: "color 150ms ease, opacity 150ms ease",
                  userSelect: "none",
                }}
              >
                {palette.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Hidden native colour picker — triggered programmatically */}
      <input
        ref={colorInputRef}
        type="color"
        value={customColor}
        onChange={handleColorInputChange}
        style={{
          position: "absolute",
          width: 0,
          height: 0,
          opacity: 0,
          pointerEvents: "none",
        }}
        tabIndex={-1}
        aria-hidden="true"
      />
    </SettingContainer>
  );
};
