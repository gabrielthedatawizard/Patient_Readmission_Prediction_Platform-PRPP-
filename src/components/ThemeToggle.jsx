import React from "react";
import { Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "../context/ThemeContext";
import { useI18n } from "../context/I18nProvider";

const ThemeToggle = ({ className = "" }) => {
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const nextThemeLabel =
    theme === "dark" ? t("switchToLightTheme") : t("switchToDarkTheme");

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={theme === "dark"}
      aria-label={nextThemeLabel}
      title={nextThemeLabel}
      className={[
        "relative inline-flex h-10 w-20 items-center rounded-2xl border border-slate-200",
        "bg-slate-50/50 p-1 transition-all duration-500",
        "dark:border-teal-500/20 dark:bg-slate-900/50 backdrop-blur-md",
        className,
      ].join(" ")}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={[
          "absolute z-10 flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-xl shadow-slate-200 dark:shadow-none",
          theme === "dark" ? "translate-x-10" : "translate-x-0",
        ].join(" ")}
      >
        {theme === "dark" ? (
          <Moon className="h-4 w-4 text-teal-600" />
        ) : (
          <Sun className="h-4 w-4 text-amber-500" />
        )}
      </motion.span>
      <span className="flex w-full items-center justify-between px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
        <span>L</span>
        <span>D</span>
      </span>
    </button>
  );
};

export default ThemeToggle;
