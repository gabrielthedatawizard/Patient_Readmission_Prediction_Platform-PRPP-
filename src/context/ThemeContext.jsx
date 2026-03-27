import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "trip-theme";
const ThemeContext = createContext(null);

function getInitialTheme() {
  return "light";
}

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark");
    root.style.colorScheme = "light";

    try {
      window.localStorage.setItem(STORAGE_KEY, "light");
    } catch (error) {
      // Ignore persistence failures
    }
  }, [theme]);

  const toggleTheme = () => setTheme("light");
  const setLightTheme = () => setTheme("light");

  const value = useMemo(
    () => ({ theme: "light", setTheme: setLightTheme, toggleTheme }),
    [],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};
