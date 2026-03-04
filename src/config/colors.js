import { colors } from "../design-system/tokens/colors";

export const TRIP_COLORS = {
  primary: colors.brand.primary,
  risk: {
    low: {
      main: colors.risk.low.icon,
      bg: colors.risk.low.bg,
      border: colors.risk.low.border,
      text: colors.risk.low.text,
    },
    medium: {
      main: colors.risk.medium.icon,
      bg: colors.risk.medium.bg,
      border: colors.risk.medium.border,
      text: colors.risk.medium.text,
    },
    high: {
      main: colors.risk.high.icon,
      bg: colors.risk.high.bg,
      border: colors.risk.high.border,
      text: colors.risk.high.text,
    },
  },
  neutral: colors.neutral,
  accent: {
    gold: colors.brand.accent.gold,
    green: colors.brand.accent.green,
    blue: colors.brand.accent.blue,
  },
  semantic: {
    success: {
      main: colors.semantic.success,
      bg: colors.risk.low.bg,
      text: colors.risk.low.text,
    },
    warning: {
      main: colors.semantic.warning,
      bg: colors.risk.medium.bg,
      text: colors.risk.medium.text,
    },
    error: {
      main: colors.semantic.error,
      bg: colors.risk.high.bg,
      text: colors.risk.high.text,
    },
    info: {
      main: colors.semantic.info,
      bg: "#EFF6FF",
      text: "#1E3A8A",
    },
  },
};

export const getRiskColor = (tier) => {
  const tierKey = String(tier || "").toLowerCase();
  return TRIP_COLORS.risk[tierKey] || TRIP_COLORS.risk.low;
};

export const getRiskGradient = (tier) => {
  const risk = getRiskColor(tier);
  return `linear-gradient(135deg, ${risk.main} 0%, ${risk.text} 100%)`;
};

export default TRIP_COLORS;
