import React from "react";
import { Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "../context/ThemeContext";

const ThemeToggle = ({ className = "" }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={theme === "dark"}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      title={theme === "dark" ? "Use light theme" : "Use dark theme"}
      className={[
        "relative inline-flex h-9 w-16 items-center rounded-full border border-white/30",
        "bg-slate-200/80 p-1 shadow-inner transition-colors duration-300",
        "dark:border-teal-400/20 dark:bg-slate-800/90",
        className,
      ].join(" ")}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 650, damping: 35 }}
        className={[
          "absolute flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md",
          theme === "dark" ? "translate-x-7" : "translate-x-0",
        ].join(" ")}
      >
        {theme === "dark" ? (
          <Moon className="h-4 w-4 text-teal-600" />
        ) : (
          <Sun className="h-4 w-4 text-amber-500" />
        )}
      </motion.span>
      <span className="flex w-full items-center justify-between px-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">
        <span>L</span>
        <span>D</span>
      </span>
    </button>
  );
};

export default ThemeToggle;
