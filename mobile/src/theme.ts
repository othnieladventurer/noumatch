import * as SecureStore from "expo-secure-store";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

// NouMatch brand tokens.
// The light palette is the product's original look. Every screen builds its base
// stylesheet from it, and the theme layer remaps those surfaces for dark mode.
const lightColors = {
  // Brand
  red: "#D41455",
  redText: "#D41455",
  redDark: "#A80D42",
  purple: "#852A91",
  pinkSoft: "#FCE4EC",

  // Surfaces
  cream: "#FFF9F5",
  creamDeep: "#FBEFE8",
  white: "#ffffff",
  canvas: "#f5f7fb",
  surfaceMuted: "#f8f9fa",
  dangerSoft: "#fdecec",
  successSoft: "#f0fdf4",
  warningSoft: "#fff7e6",
  blueSoft: "#f5fbff",
  lavenderSoft: "#faf7ff",

  // Text
  ink: "#101D3A",
  inkSoft: "#475467",
  muted: "#667085",
  link: "#0d6efd",

  // Lines
  border: "#EAE4E1",
  placeholder: "#98A2B3",

  success: "#15803d",
};

export type Palette = typeof lightColors;
export type ThemeMode = "light" | "dark";

const darkColors: Palette = {
  red: "#D63160",
  redText: "#FF8FAE",
  redDark: "#FF8FAE",
  purple: "#C084FC",
  pinkSoft: "#2C1B24",

  cream: "#0F1117",
  creamDeep: "#1B1E27",
  white: "#1A1D26",
  canvas: "#0D0F15",
  surfaceMuted: "#20242F",
  dangerSoft: "#321F28",
  successSoft: "#1A2B22",
  warningSoft: "#2E2718",
  blueSoft: "#1A2432",
  lavenderSoft: "#231D30",

  ink: "#F4F6FB",
  inkSoft: "#D3D9E4",
  muted: "#A2ABBA",
  link: "#7CB4FF",

  border: "#2B303C",
  placeholder: "#7C8798",

  success: "#4ADE80",
};

/** Static light palette kept for base stylesheet definitions. */
export const colors = lightColors;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 44,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
};

const baseType = {
  eyebrow: {
    fontSize: 10.5,
    fontWeight: "800" as const,
    letterSpacing: 0.9,
    textTransform: "uppercase" as const,
    color: lightColors.red,
  },
  kicker: {
    fontSize: 10.5,
    fontWeight: "700" as const,
    letterSpacing: 1.1,
    textTransform: "uppercase" as const,
    color: lightColors.red,
  },
  h1: {
    fontSize: 24,
    fontWeight: "800" as const,
    letterSpacing: -0.6,
    color: lightColors.ink,
    lineHeight: 29,
  },
  h2: {
    fontSize: 19,
    fontWeight: "800" as const,
    letterSpacing: -0.4,
    color: lightColors.ink,
  },
  lead: {
    fontSize: 14,
    color: lightColors.ink,
    lineHeight: 20,
  },
  body: {
    fontSize: 13.5,
    color: lightColors.muted,
    lineHeight: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: lightColors.inkSoft,
  },
};

/** Original light typography object, kept for non-themed callers. */
export const type = baseType;

type ThemeContextValue = {
  mode: ThemeMode;
  isDark: boolean;
  colors: Palette;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  mode: "light",
  isDark: false,
  colors: lightColors,
  setMode: () => undefined,
});

const THEME_KEY = "noumatch.theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("light");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(THEME_KEY);
        if (!cancelled && (stored === "light" || stored === "dark")) {
          setModeState(stored);
        }
      } catch {
        // Preference storage is optional; the light theme remains the fallback.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    void SecureStore.setItemAsync(THEME_KEY, next).catch(() => undefined);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      isDark: mode === "dark",
      colors: mode === "dark" ? darkColors : lightColors,
      setMode,
    }),
    [mode, setMode],
  );

  return React.createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

/** Theme-aware version of the shared typography tokens. */
export function useTypography() {
  const { colors: c } = useTheme();
  return useMemo(
    () => ({
      eyebrow: { ...baseType.eyebrow, color: c.redText },
      kicker: { ...baseType.kicker, color: c.redText },
      h1: { ...baseType.h1, color: c.ink },
      h2: { ...baseType.h2, color: c.ink },
      lead: { ...baseType.lead, color: c.ink },
      body: { ...baseType.body, color: c.muted },
      label: { ...baseType.label, color: c.inkSoft },
    }),
    [c],
  );
}

const DARK_TEXT: Record<string, string> = {
  "#1a1a2e": "ink",
  "#101d3a": "ink",
  "#212529": "ink",
  "#201b1d": "ink",
  "#31272b": "ink",
  "#2d2d2d": "ink",
  "#111": "ink",
  "#4a4a4a": "inkSoft",
  "#475467": "inkSoft",
  "#3f3a44": "inkSoft",
  "#6b7280": "inkSoft",
  "#6c757d": "muted",
  "#667085": "muted",
  "#8a8f98": "muted",
  "#9aa1ac": "muted",
  "#999": "muted",
  "#8e8e93": "muted",
  "#9ca3af": "muted",
  "#adb5bd": "placeholder",
  "#b9b2ae": "placeholder",
  "#ced4da": "placeholder",
  "#dc3545": "redText",
  "#dc2626": "redText",
  "#d63354": "redText",
  "#ff4d6d": "redText",
  "#ff2d55": "redText",
  "#d41455": "redText",
  "#ff3355": "redText",
  "#a80d42": "redDark",
  "#842029": "redDark",
  "#721c24": "redDark",
  "#852a91": "purple",
  "#22c55e": "success",
  "#4ade80": "success",
  "#15803d": "success",
  "#155724": "success",
  "#0f5132": "success",
  "#0d6efd": "link",
  "#8a5a00": "#E8B45C",
};

const DARK_BACKGROUND: Record<string, keyof Palette | string> = {
  "#ffffff": "white",
  "#fff": "white",
  "#fffdfc": "white",
  "#fff9f5": "cream",
  "#fbefe8": "creamDeep",
  "#f5f7fb": "canvas",
  "#faf8f4": "canvas",
  "#f8f9fa": "surfaceMuted",
  "#fafafa": "surfaceMuted",
  "#e9ecef": "surfaceMuted",
  "#f8f5f0": "surfaceMuted",
  "#fff0f3": "dangerSoft",
  "#fff5f7": "dangerSoft",
  "#fff6f8": "dangerSoft",
  "#fff7f9": "dangerSoft",
  "#ffe9ee": "dangerSoft",
  "#fdecec": "dangerSoft",
  "#f8d7da": "dangerSoft",
  "#fce4ec": "dangerSoft",
  "#d9d2ce": "surfaceMuted",
  "#dc3545": "red",
  "#d63354": "red",
  "#ff4d6d": "red",
  "#ff2d55": "red",
  "#d41455": "red",
  "#ff3355": "red",
  "#22c55e": "#1E7A45",
  "#f0fdf4": "successSoft",
  "#d4edda": "successSoft",
  "#d1e7dd": "successSoft",
  "#f0f7f1": "successSoft",
  "#fff7e6": "warningSoft",
  "#f5fbff": "blueSoft",
  "#faf7ff": "lavenderSoft",
  "rgba(255,255,255,0.92)": "rgba(14,16,23,0.84)",
  "rgba(255,255,255,0.94)": "rgba(14,16,23,0.84)",
  "rgba(255,255,255,0.88)": "rgba(14,16,23,0.82)",
};

const DARK_BORDER: Record<string, keyof Palette | string> = {
  "#eae4e1": "border",
  "#e8e5df": "border",
  "#f0eee8": "border",
  "#f0f0f0": "border",
  "#efefef": "border",
  "#dee2e6": "border",
  "#e9ecef": "border",
  "#eef0f3": "border",
  "#f2ece8": "border",
  "#ede7e3": "border",
  "#e5e7eb": "border",
  "#ced4da": "border",
  "#2d2d2d": "border",
  "#6c757d": "border",
  "#fff": "border",
  "#ffffff": "border",
  "#ff4d6d": "red",
  "#dc3545": "red",
  "#ff2d55": "red",
  "#ffd8df": "#4A2A35",
  "#ffd0da": "#4A2A35",
  "#ffe0e8": "#4A2A35",
  "#ffc4d0": "#4A2A35",
  "#ffccd5": "#4A2A35",
  "#f7caca": "#5A2C36",
  "#f0cfd7": "#4A2A35",
  "#d7ecff": "#283D54",
  "#efe2ff": "#3A2C4C",
  "#eadcf4": "#3A2C4C",
  "#bbf7d0": "#2B513A",
  "#cfe6d5": "#2B513A",
  "#f5dfae": "#5A4826",
  "#f5c2c7": "#5A2C36",
};

function resolveDarkColor(property: string, value: string, c: Palette): string {
  const key = value.toLowerCase();
  if (property === "shadowColor" || property === "textShadowColor") return value;

  if (property === "color" || property === "tintColor" || property === "textDecorationColor") {
    const token = DARK_TEXT[key];
    if (!token) return value;
    return token.startsWith("#") ? token : c[token as keyof Palette];
  }

  if (property === "backgroundColor") {
    const token = DARK_BACKGROUND[key];
    if (!token) return value;
    return token.startsWith("#") || token.startsWith("rgba") ? token : c[token as keyof Palette];
  }

  if (property.startsWith("border") && property.endsWith("Color")) {
    const token = DARK_BORDER[key];
    if (!token) return value;
    return token.startsWith("#") ? token : c[token as keyof Palette];
  }

  return value;
}

/**
 * Rebuilds a light stylesheet against the active palette. This keeps every screen
 * consistent without duplicating hundreds of style rules for dark mode.
 */
export function useThemedStyles<T extends Record<string, object>>(sheet: T): T {
  const { mode, colors: c } = useTheme();

  return useMemo(() => {
    if (mode !== "dark") return sheet;

    const next: Record<string, unknown> = {};
    for (const [name, style] of Object.entries(sheet)) {
      if (!style || typeof style !== "object") {
        next[name] = style;
        continue;
      }
      const mapped: Record<string, unknown> = { ...(style as Record<string, unknown>) };
      for (const [property, value] of Object.entries(style as Record<string, unknown>)) {
        if (typeof value === "string") {
          mapped[property] = resolveDarkColor(property, value, c);
        }
      }
      next[name] = mapped;
    }
    return next as T;
  }, [sheet, mode, c]);
}
