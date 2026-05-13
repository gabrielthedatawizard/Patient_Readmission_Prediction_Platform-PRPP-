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
      className={`
        relative inline-flex h-9 w-18 items-center rounded-full border border-slate-200
        bg-white/50 p-1 transition-all duration-500
        dark:border-white/10 dark:bg-slate-950/40 backdrop-blur-md
        ${className}
      `}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={`
          absolute z-10 flex h-7 w-7 items-center justify-center rounded-full 
          bg-white shadow-trip dark:bg-teal-500 dark:shadow-[0_0_12px_rgba(20,184,166,0.4)]
          ${theme === "dark" ? "translate-x-9" : "translate-x-0"}
        `}
      >
        {theme === "dark" ? (
          <Moon className="h-3.5 w-3.5 text-white" />
        ) : (
          <Sun className="h-3.5 w-3.5 text-amber-500" />
        )}
      </motion.span>
      <div className="flex w-full items-center justify-between px-2.5 text-[8px] font-black tracking-widest text-slate-400 dark:text-slate-600">
        <span className={theme === "light" ? "opacity-0" : "opacity-100"}>LIGHT</span>
        <span className={theme === "dark" ? "opacity-0" : "opacity-100"}>DARK</span>
      </div>
    </button>
  );
};

export default ThemeToggle;
