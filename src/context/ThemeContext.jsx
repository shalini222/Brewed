import React, {
  createContext,
  useContext,
} from "react";

import { usePreferences } from "./PreferencesContext";

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const {
    darkMode,
    updatePreference,
  } = usePreferences();

  const setDarkMode = (value) => {
    /*
     * Support both:
     *
     * setDarkMode(true)
     *
     * setDarkMode(false)
     *
     * and functional updates:
     *
     * setDarkMode(prev => !prev)
     */

    if (typeof value === "function") {
      updatePreference(
        "darkMode",
        value(darkMode)
      );
      return;
    }

    updatePreference(
      "darkMode",
      Boolean(value)
    );
  };

  return (
    <ThemeContext.Provider
      value={{
        darkMode,
        setDarkMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(
    ThemeContext
  );

  if (!context) {
    throw new Error(
      "useTheme must be used inside ThemeProvider"
    );
  }

  return context;
};
