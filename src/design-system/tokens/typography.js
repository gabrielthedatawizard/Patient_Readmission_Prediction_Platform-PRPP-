export const typography = {
  fonts: {
    sans: '"Inter", "Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    mono: '"JetBrains Mono", "Fira Code", monospace',
  },
  sizes: {
    "5xl": { fontSize: "3rem", lineHeight: "1.1", letterSpacing: "-0.02em" },
    "4xl": { fontSize: "2.25rem", lineHeight: "1.15", letterSpacing: "-0.01em" },
    "3xl": { fontSize: "1.875rem", lineHeight: "1.2", letterSpacing: "-0.01em" },
    "2xl": { fontSize: "1.5rem", lineHeight: "1.3" },
    xl: { fontSize: "1.25rem", lineHeight: "1.4" },
    lg: { fontSize: "1.125rem", lineHeight: "1.5" },
    base: { fontSize: "1rem", lineHeight: "1.5" },
    sm: { fontSize: "0.875rem", lineHeight: "1.5" },
    xs: { fontSize: "0.75rem", lineHeight: "1.5" },
    "mono-sm": {
      fontSize: "0.875rem",
      fontFamily: "JetBrains Mono, Fira Code, monospace",
      letterSpacing: "0.01em",
    },
  },
  weights: {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
};

export default typography;
