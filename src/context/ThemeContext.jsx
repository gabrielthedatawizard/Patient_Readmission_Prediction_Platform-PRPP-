import React, { createContext, useContext, useEffect, useMemo } from "react";

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark");
    root.style.colorScheme = "light";

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("trip-theme", "light");
      } catch (error) {
        // Ignore persistence failures when storage is unavailable.
      }
    }
  }, []);

  const value = useMemo(
    () => ({
      theme: "light",
      setTheme: () => {},
      toggleTheme: () => {},
    }),
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
