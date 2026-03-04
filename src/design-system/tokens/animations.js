export const animations = {
  duration: {
    instant: "100ms",
    fast: "200ms",
    normal: "300ms",
    slow: "500ms",
    slower: "700ms",
  },
  easing: {
    easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
    easeOut: "cubic-bezier(0.0, 0, 0.2, 1)",
    easeIn: "cubic-bezier(0.4, 0, 1, 1)",
    sharp: "cubic-bezier(0.4, 0, 0.6, 1)",
  },
  presets: {
    fadeIn: {
      from: { opacity: 0 },
      to: { opacity: 1 },
      duration: "300ms",
      easing: "cubic-bezier(0.4, 0, 0.2, 1)",
    },
    slideInRight: {
      from: { transform: "translateX(20px)", opacity: 0 },
      to: { transform: "translateX(0)", opacity: 1 },
      duration: "300ms",
      easing: "cubic-bezier(0.4, 0, 0.2, 1)",
    },
    scaleIn: {
      from: { transform: "scale(0.95)", opacity: 0 },
      to: { transform: "scale(1)", opacity: 1 },
      duration: "200ms",
      easing: "cubic-bezier(0.4, 0, 0.2, 1)",
    },
  },
};

export default animations;
