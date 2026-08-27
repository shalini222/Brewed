import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";

import { db } from "../firebase";
import { useAuth } from "./AuthContext";

const DEFAULT_PREFERENCES = {
  notifications: true,
  darkMode: false,
  reduceMotion: false,
};

const PreferencesContext = createContext(null);

export function PreferencesProvider({ children }) {
  const { currentUser } = useAuth();

  const [preferences, setPreferences] = useState(
    DEFAULT_PREFERENCES
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* =========================
     LOAD PREFERENCES
  ========================= */

  useEffect(() => {
    let mounted = true;

    const loadPreferences = async () => {
      if (!currentUser) {
        if (mounted) {
          setPreferences(DEFAULT_PREFERENCES);
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);

        const userRef = doc(
          db,
          "users",
          currentUser.uid
        );

        const snapshot = await getDoc(userRef);

        if (!mounted) return;

        if (!snapshot.exists()) {
          setPreferences(DEFAULT_PREFERENCES);
          return;
        }

        const settings =
          snapshot.data()?.settings || {};

        setPreferences({
          notifications:
            typeof settings.notifications === "boolean"
              ? settings.notifications
              : DEFAULT_PREFERENCES.notifications,

          darkMode:
            typeof settings.darkMode === "boolean"
              ? settings.darkMode
              : DEFAULT_PREFERENCES.darkMode,

          reduceMotion:
            typeof settings.reduceMotion === "boolean"
              ? settings.reduceMotion
              : DEFAULT_PREFERENCES.reduceMotion,
        });
      } catch (error) {
        console.error(
          "Failed to load preferences:",
          error
        );

        if (mounted) {
          setPreferences(DEFAULT_PREFERENCES);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadPreferences();

    return () => {
      mounted = false;
    };
  }, [currentUser]);

  /* =========================
     GLOBAL DARK MODE
  ========================= */

  useEffect(() => {
    const root = document.documentElement;

    root.classList.toggle(
      "dark-mode",
      preferences.darkMode
    );

    // Remove legacy ThemeContext class
    root.classList.remove("dark");
  }, [preferences.darkMode]);

  /* =========================
     GLOBAL REDUCED MOTION
  ========================= */

  useEffect(() => {
    const root = document.documentElement;

    root.classList.toggle(
      "reduce-motion",
      preferences.reduceMotion
    );

    return () => {
      root.classList.remove("reduce-motion");
    };
  }, [preferences.reduceMotion]);

  /* =========================
     UPDATE PREFERENCE
  ========================= */

  const updatePreference = useCallback(
    (key, value) => {
      setPreferences((current) => ({
        ...current,
        [key]: value,
      }));
    },
    []
  );

  /* =========================
     SAVE PREFERENCES
  ========================= */

  const savePreferences = useCallback(
    async (nextPreferences = preferences) => {
      if (!currentUser) {
        throw new Error(
          "You must be signed in to save preferences."
        );
      }

      try {
        setSaving(true);

        const userRef = doc(
          db,
          "users",
          currentUser.uid
        );

        await setDoc(
          userRef,
          {
            settings: {
              notifications:
                Boolean(nextPreferences.notifications),

              darkMode:
                Boolean(nextPreferences.darkMode),

              reduceMotion:
                Boolean(nextPreferences.reduceMotion),
            },
          },
          {
            merge: true,
          }
        );

        setPreferences({
          notifications:
            Boolean(nextPreferences.notifications),

          darkMode:
            Boolean(nextPreferences.darkMode),

          reduceMotion:
            Boolean(nextPreferences.reduceMotion),
        });
      } catch (error) {
        console.error(
          "Failed to save preferences:",
          error
        );

        throw error;
      } finally {
        setSaving(false);
      }
    },
    [currentUser, preferences]
  );

  /* =========================
     RESET
  ========================= */

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
  }, []);

  /* =========================
     CONTEXT VALUE
  ========================= */

  const value = useMemo(
    () => ({
      preferences,

      notifications:
        preferences.notifications,

      darkMode:
        preferences.darkMode,

      reduceMotion:
        preferences.reduceMotion,

      loading,
      saving,

      updatePreference,
      savePreferences,
      resetPreferences,
    }),
    [
      preferences,
      loading,
      saving,
      updatePreference,
      savePreferences,
      resetPreferences,
    ]
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

/* =========================
   HOOK
========================= */

export function usePreferences() {
  const context = useContext(
    PreferencesContext
  );

  if (!context) {
    throw new Error(
      "usePreferences must be used inside PreferencesProvider"
    );
  }

  return context;
}
