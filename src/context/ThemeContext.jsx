import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const ThemeContext = createContext(null);

const THEME_STORAGE_KEY = "theme";

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) === "dark";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;

    // Keep ONE global class name everywhere.
    root.classList.toggle("dark", darkMode);

    // Keep the browser UI/theme controls in sync.
    root.style.colorScheme = darkMode ? "dark" : "light";

    try {
      localStorage.setItem(
        THEME_STORAGE_KEY,
        darkMode ? "dark" : "light"
      );
    } catch {
      // Ignore storage failures.
    }
  }, [darkMode]);

  const toggleDarkMode = useCallback(() => {
    setDarkMode((current) => !current);
  }, []);

  const value = {
    darkMode,
    setDarkMode,
    toggleDarkMode,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme must be used inside a ThemeProvider"
    );
  }

  return context;
};
