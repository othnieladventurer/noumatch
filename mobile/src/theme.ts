// NouMatch brand tokens.
// Palette is derived from the official wordmark: magenta/pink heart + plum, on warm off-white.
export const colors = {
  // Brand
  red: "#D41455", // primary brand
  redDark: "#A80D42",
  purple: "#852A91", // secondary brand
  pinkSoft: "#FCE4EC", // soft pink surface

  // Surfaces
  cream: "#FFF9F5", // app background
  creamDeep: "#FBEFE8",
  white: "#ffffff",

  // Text
  ink: "#101D3A", // dark navy
  inkSoft: "#475467",
  muted: "#667085",

  // Lines
  border: "#EAE4E1",
  placeholder: "#98A2B3",

  success: "#15803d",
};

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

export const type = {
  eyebrow: {
    fontSize: 10.5,
    fontWeight: "800" as const,
    letterSpacing: 0.9,
    textTransform: "uppercase" as const,
    color: colors.red,
  },
  kicker: {
    fontSize: 11,
    fontWeight: "700" as const,
    letterSpacing: 1.1,
    textTransform: "uppercase" as const,
    color: colors.red,
  },
  h1: {
    fontSize: 28,
    fontWeight: "800" as const,
    letterSpacing: -0.6,
    color: colors.ink,
    lineHeight: 33,
  },
  h2: {
    fontSize: 23,
    fontWeight: "800" as const,
    letterSpacing: -0.4,
    color: colors.ink,
  },
  lead: {
    fontSize: 15.5,
    color: colors.ink,
    lineHeight: 23,
  },
  body: {
    fontSize: 15,
    color: colors.muted,
    lineHeight: 23,
  },
  label: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.inkSoft,
  },
};
