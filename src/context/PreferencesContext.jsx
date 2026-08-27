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

/*
 * ============================================================
 * DEFAULTS
 * ============================================================
 */

const DEFAULT_PREFERENCES = {
  notifications: true,
  darkMode: false,
  reduceMotion: false,
};

/*
 * ============================================================
 * CONTEXT
 * ============================================================
 */

const PreferencesContext = createContext(null);

/*
 * ============================================================
 * PROVIDER
 * ============================================================
 */

export function PreferencesProvider({ children }) {
  const { currentUser } = useAuth();

  const [preferences, setPreferences] = useState(
    DEFAULT_PREFERENCES
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /*
   * ==========================================================
   * LOAD PREFERENCES
   * ==========================================================
   */

  useEffect(() => {
    let mounted = true;

    const loadPreferences = async () => {
      /*
       * No authenticated user.
       */

      if (!currentUser) {
        if (mounted) {
          setPreferences({
            ...DEFAULT_PREFERENCES,
          });

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

        /*
         * User document doesn't exist.
         */

        if (!snapshot.exists()) {
          setPreferences({
            ...DEFAULT_PREFERENCES,
          });

          return;
        }

        const data = snapshot.data();

        const settings =
          data?.settings &&
          typeof data.settings === "object"
            ? data.settings
            : {};

        /*
         * Normalize settings so malformed Firestore
         * values can never break the application.
         */

        const normalizedPreferences = {
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
        };

        setPreferences(
          normalizedPreferences
        );
      } catch (error) {
        console.error(
          "Failed to load user preferences:",
          error
        );

        /*
         * Fail safely to defaults.
         */

        if (mounted) {
          setPreferences({
            ...DEFAULT_PREFERENCES,
          });
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

  /*
   * ==========================================================
   * GLOBAL DARK MODE
   * ==========================================================
   *
   * These classes live on <html>, not SettingsPage.
   *
   * That means the preference is available to the entire
   * application.
   */

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const root =
      document.documentElement;

    root.classList.toggle(
      "dark-mode",
      Boolean(preferences.darkMode)
    );

    /*
     * Useful for CSS selectors and accessibility.
     */

    root.setAttribute(
      "data-theme",
      preferences.darkMode
        ? "dark"
        : "light"
    );

    root.style.colorScheme =
      preferences.darkMode
        ? "dark"
        : "light";
  }, [preferences.darkMode]);

  /*
   * ==========================================================
   * GLOBAL REDUCED MOTION
   * ==========================================================
   */

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const root =
      document.documentElement;

    root.classList.toggle(
      "reduce-motion",
      Boolean(preferences.reduceMotion)
    );

    root.setAttribute(
      "data-reduce-motion",
      preferences.reduceMotion
        ? "true"
        : "false"
    );
  }, [preferences.reduceMotion]);

  /*
   * ==========================================================
   * GLOBAL NOTIFICATION PREFERENCE
   * ==========================================================
   *
   * This doesn't automatically create browser push
   * notifications. It establishes the application's
   * single source of truth for whether notifications
   * are enabled.
   */

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.documentElement.setAttribute(
      "data-notifications",
      preferences.notifications
        ? "enabled"
        : "disabled"
    );
  }, [preferences.notifications]);

  /*
   * ==========================================================
   * UPDATE PREFERENCE
   * ==========================================================
   */

  const updatePreference = useCallback(
    (key, value) => {
      /*
       * Only allow known preference keys.
       */

      const allowedKeys = [
        "notifications",
        "darkMode",
        "reduceMotion",
      ];

      if (!allowedKeys.includes(key)) {
        console.warn(
          `Unknown preference key: ${key}`
        );

        return;
      }

      /*
       * Only boolean values are allowed.
       */

      if (typeof value !== "boolean") {
        console.warn(
          `Preference "${key}" must be boolean.`
        );

        return;
      }

      setPreferences((current) => ({
        ...current,
        [key]: value,
      }));
    },
    []
  );

  /*
   * ==========================================================
   * SAVE PREFERENCES
   * ==========================================================
   */

  const savePreferences = useCallback(
    async (nextPreferences) => {
      if (!currentUser) {
        throw new Error(
          "You must be signed in to save preferences."
        );
      }

      /*
       * If nothing was supplied, use current state.
       */

      const values =
        nextPreferences || preferences;

      const normalizedPreferences = {
        notifications:
          Boolean(values.notifications),

        darkMode:
          Boolean(values.darkMode),

        reduceMotion:
          Boolean(values.reduceMotion),
      };

      try {
        setSaving(true);

        const userRef = doc(
          db,
          "users",
          currentUser.uid
        );

        /*
         * merge:true prevents settings from overwriting
         * unrelated fields on the user document.
         */

        await setDoc(
          userRef,
          {
            settings:
              normalizedPreferences,
          },
          {
            merge: true,
          }
        );

        /*
         * Keep local state synchronized with the
         * successfully persisted values.
         */

        setPreferences(
          normalizedPreferences
        );

        return normalizedPreferences;
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

  /*
   * ==========================================================
   * RESET
   * ==========================================================
   *
   * This resets the current application state.
   *
   * It does NOT automatically write to Firestore.
   * The Settings page can then decide whether the user
   * wants to save the reset.
   */

  const resetPreferences = useCallback(() => {
    setPreferences({
      ...DEFAULT_PREFERENCES,
    });
  }, []);

  /*
   * ==========================================================
   * CONTEXT VALUE
   * ==========================================================
   */

  const value = useMemo(
    () => ({
      /*
       * Full object
       */

      preferences,

      /*
       * Convenient individual values
       */

      notifications:
        preferences.notifications,

      darkMode:
        preferences.darkMode,

      reduceMotion:
        preferences.reduceMotion,

      /*
       * Status
       */

      loading,
      saving,

      /*
       * Actions
       */

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

  /*
   * ==========================================================
   * PROVIDER
   * ==========================================================
   */

  return (
    <PreferencesContext.Provider
      value={value}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

/*
 * ============================================================
 * HOOK
 * ============================================================
 */

export function usePreferences() {
  const context =
    useContext(PreferencesContext);

  if (!context) {
    throw new Error(
      "usePreferences must be used inside PreferencesProvider"
    );
  }

  return context;
}
