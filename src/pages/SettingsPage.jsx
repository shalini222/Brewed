import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "../context/AuthContext";
import {
  usePreferences,
} from "../context/PreferencesContext";

import {
  ArrowLeft,
  Bell,
  Moon,
  Shield,
  FileText,
  Trash2,
  KeyRound,
  Info,
  ChevronRight,
  Check,
  Loader2,
  X,
  AlertTriangle,
} from "lucide-react";

export default function SettingsPage({ setPage }) {
  const { currentUser } = useAuth();

  const {
    notifications,
    darkMode,
    reduceMotion,
    loading: preferencesLoading,
    saving,
    updatePreference,
    savePreferences,
    resetPreferences,
  } = usePreferences();

  /*
   * =========================================================
   * SAVED SNAPSHOT
   * =========================================================
   *
   * The PreferencesContext contains the current/draft values.
   * We keep a local snapshot only to determine whether the
   * user has unsaved changes.
   */

  const [savedPreferences, setSavedPreferences] = useState({
    notifications: true,
    darkMode: false,
    reduceMotion: false,
  });

  /*
   * =========================================================
   * UI STATE
   * =========================================================
   */

  const [confirmOpen, setConfirmOpen] = useState(false);

  const [confirmData, setConfirmData] = useState({
    title: "",
    message: "",
    confirmLabel: "Confirm",
    danger: false,
    onConfirm: null,
  });

  const [toast, setToast] = useState({
    show: false,
    message: "",
  });

  const [leaving, setLeaving] = useState(false);

  /*
   * =========================================================
   * INITIALIZE SAVED SNAPSHOT
   * =========================================================
   */

  useEffect(() => {
    if (preferencesLoading) return;

    setSavedPreferences({
      notifications,
      darkMode,
      reduceMotion,
    });
  }, [preferencesLoading]);

  /*
   * =========================================================
   * UNSAVED CHANGES
   * =========================================================
   */

  const hasChanges = useMemo(() => {
    return (
      notifications !==
        savedPreferences.notifications ||
      darkMode !==
        savedPreferences.darkMode ||
      reduceMotion !==
        savedPreferences.reduceMotion
    );
  }, [
    notifications,
    darkMode,
    reduceMotion,
    savedPreferences,
  ]);

  /*
   * =========================================================
   * TOAST
   * =========================================================
   */

  const showToast = useCallback((message) => {
    setToast({
      show: true,
      message,
    });

    window.clearTimeout(
      window.__brewedSettingsToastTimer
    );

    window.__brewedSettingsToastTimer =
      window.setTimeout(() => {
        setToast({
          show: false,
          message: "",
        });
      }, 2500);
  }, []);

  /*
   * =========================================================
   * CLEANUP TOAST TIMER
   * =========================================================
   */

  useEffect(() => {
    return () => {
      window.clearTimeout(
        window.__brewedSettingsToastTimer
      );
    };
  }, []);

  /*
   * =========================================================
   * SAVE SETTINGS
   * =========================================================
   */

  const handleSave = async () => {
    if (!currentUser || !hasChanges || saving) {
      return;
    }

    try {
      await savePreferences({
        notifications,
        darkMode,
        reduceMotion,
      });

      setSavedPreferences({
        notifications,
        darkMode,
        reduceMotion,
      });

      showToast("Settings saved successfully.");
    } catch (error) {
      console.error(
        "Failed to save settings:",
        error
      );

      showToast(
        "Couldn't save settings. Please try again."
      );
    }
  };

  /*
   * =========================================================
   * RESET SETTINGS
   * =========================================================
   */

  const handleReset = () => {
    if (!hasChanges) {
      showToast("Settings are already at their defaults.");
      return;
    }

    setConfirmData({
      title: "Reset Settings",
      message:
        "Restore all preferences to their default values? Your changes will need to be saved before they become permanent.",
      confirmLabel: "Reset Settings",
      danger: false,
      onConfirm: () => {
        resetPreferences();

        setConfirmOpen(false);

        showToast(
          "Settings reset to their default values."
        );
      },
    });

    setConfirmOpen(true);
  };

  /*
   * =========================================================
   * CLEAR CACHE
   * =========================================================
   *
   * IMPORTANT:
   * We deliberately do NOT use localStorage.clear()
   * because other application data may live there.
   */

  const handleClearCache = () => {
    setConfirmData({
      title: "Clear Cache",
      message:
        "This removes temporary cached data stored on this device. Your account, orders, rewards and other permanent data will not be deleted.",
      confirmLabel: "Clear Cache",
      danger: false,
      onConfirm: () => {
        try {
          /*
           * Remove only known temporary Brewed cache keys.
           *
           * Add future temporary cache keys here rather than
           * clearing the entire localStorage.
           */

          const temporaryKeys = [
            "brewed_cache",
            "brewed_temp",
            "brewed_menu_cache",
            "brewed_search_cache",
          ];

          temporaryKeys.forEach((key) => {
            try {
              localStorage.removeItem(key);
            } catch (error) {
              console.warn(
                `Unable to remove localStorage key: ${key}`,
                error
              );
            }
          });

          /*
           * Session storage is temporary by nature, but we
           * still avoid clearing everything indiscriminately.
           */

          const temporarySessionKeys = [
            "brewed_session_cache",
            "brewed_temp",
          ];

          temporarySessionKeys.forEach((key) => {
            try {
              sessionStorage.removeItem(key);
            } catch (error) {
              console.warn(
                `Unable to remove sessionStorage key: ${key}`,
                error
              );
            }
          });

          /*
           * Clear browser Cache Storage where supported.
           */

          if (
            typeof window !== "undefined" &&
            "caches" in window
          ) {
            window.caches
              .keys()
              .then((cacheNames) =>
                Promise.all(
                  cacheNames
                    .filter((name) =>
                      name
                        .toLowerCase()
                        .includes("brewed")
                    )
                    .map((name) =>
                      window.caches.delete(name)
                    )
                )
              )
              .catch((error) => {
                console.warn(
                  "Unable to clear browser cache:",
                  error
                );
              });
          }

          setConfirmOpen(false);

          showToast("Cache cleared successfully.");
        } catch (error) {
          console.error(
            "Failed to clear cache:",
            error
          );

          setConfirmOpen(false);

          showToast(
            "Couldn't clear cache. Please try again."
          );
        }
      },
    });

    setConfirmOpen(true);
  };

  /*
   * =========================================================
   * SAFE NAVIGATION
   * =========================================================
   */

  const navigateBack = () => {
    if (saving || leaving) return;

    if (!hasChanges) {
      setPage("menu");
      return;
    }

    setConfirmData({
      title: "Unsaved Changes",
      message:
        "You have unsaved changes. If you leave now, those changes will be lost.",
      confirmLabel: "Leave",
      danger: true,
      onConfirm: () => {
        setLeaving(true);
        setConfirmOpen(false);
        setPage("menu");
      },
    });

    setConfirmOpen(true);
  };

  /*
   * =========================================================
   * GENERIC PAGE NAVIGATION
   * =========================================================
   */

  const navigateTo = (page) => {
    if (saving || leaving) return;

    if (!hasChanges) {
      setPage(page);
      return;
    }

    setConfirmData({
      title: "Unsaved Changes",
      message:
        "You have unsaved changes. If you leave this page, those changes will be lost.",
      confirmLabel: "Leave",
      danger: true,
      onConfirm: () => {
        setLeaving(true);
        setConfirmOpen(false);
        setPage(page);
      },
    });

    setConfirmOpen(true);
  };

  /*
   * =========================================================
   * LOADING STATE
   * =========================================================
   */

  if (preferencesLoading) {
    return (
      <>
        <style>{`
          .settings-loading-page {
            min-height: 100vh;
            background: var(--bg);
            color: var(--text);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            font-family: "Inter", sans-serif;
          }

          .settings-loading {
            display: flex;
            align-items: center;
            gap: 10px;
            color: var(--muted);
            font-size: 0.95rem;
          }

          .settings-loading svg {
            animation: settingsSpin 0.9s linear infinite;
          }

          @keyframes settingsSpin {
            to {
              transform: rotate(360deg);
            }
          }

          html.reduce-motion .settings-loading svg {
            animation: none !important;
          }
        `}</style>

        <div className="settings-loading-page">
          <div
            className="settings-loading"
            role="status"
            aria-live="polite"
          >
            <Loader2 size={18} />
            Loading settings...
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        /* =====================================================
           PAGE
        ===================================================== */

        .settings-page {
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          padding: 32px 18px 120px;
          font-family: "Inter", sans-serif;
          transition:
            background 0.3s ease,
            color 0.3s ease;
        }

        .settings-container {
          width: 100%;
          max-width: 720px;
          margin: 0 auto;
          animation: settingsFadeUp 0.45s ease;
        }

        /* =====================================================
           BACK
        ===================================================== */

        .settings-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 0;
          margin: 0 0 22px;
          border: 0;
          background: transparent;
          color: var(--text);
          font-family: "Inter", sans-serif;
          font-size: 0.92rem;
          font-weight: 600;
          cursor: pointer;
          transition:
            color 0.2s ease,
            opacity 0.2s ease;
        }

        .settings-back-btn:hover {
          color: var(--accent);
        }

        .settings-back-btn:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 4px;
          border-radius: 6px;
        }

        .settings-back-btn:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        /* =====================================================
           HEADER
        ===================================================== */

        .settings-title {
          margin: 0 0 8px;
          color: var(--text);
          font-family: "Playfair Display", serif;
          font-size: clamp(2rem, 6vw, 2.45rem);
          line-height: 1.1;
          letter-spacing: -0.02em;
        }

        .settings-subtitle {
          margin: 0 0 32px;
          color: var(--muted);
          font-size: 0.95rem;
          line-height: 1.65;
        }

        /* =====================================================
           CARDS
        ===================================================== */

        .settings-card {
          margin-bottom: 20px;
          padding: 22px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 22px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.025);
          transition:
            transform 0.25s ease,
            box-shadow 0.25s ease,
            background 0.3s ease,
            border-color 0.3s ease;
        }

        .settings-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.07);
        }

        .settings-section-title {
          margin: 0 0 16px;
          color: var(--text);
          font-family: "Playfair Display", serif;
          font-size: 1.22rem;
          line-height: 1.3;
        }

        /* =====================================================
           SETTING ROWS
        ===================================================== */

        .settings-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          min-height: 70px;
          padding: 16px 0;
          border-bottom: 1px solid var(--border);
        }

        .settings-row:last-child {
          border-bottom: 0;
          padding-bottom: 2px;
        }

        .settings-row:first-of-type {
          padding-top: 6px;
        }

        .settings-left {
          display: flex;
          align-items: center;
          gap: 15px;
          min-width: 0;
          flex: 1;
        }

        .settings-icon {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
          color: var(--accent);
        }

        .settings-copy {
          min-width: 0;
        }

        .settings-label {
          margin: 0 0 4px;
          color: var(--text);
          font-size: 0.96rem;
          font-weight: 650;
          line-height: 1.35;
        }

        .settings-description {
          margin: 0;
          color: var(--muted);
          font-size: 0.84rem;
          line-height: 1.5;
        }

        /* =====================================================
           ACCESSIBLE SWITCH
        ===================================================== */

        .settings-switch {
          position: relative;
          width: 50px;
          height: 28px;
          flex: 0 0 50px;
          padding: 0;
          border: 0;
          border-radius: 999px;
          background: #cfc6bc;
          cursor: pointer;
          transition:
            background 0.25s ease,
            box-shadow 0.25s ease;
        }

        .settings-switch:hover {
          box-shadow: 0 0 0 4px rgba(196, 149, 106, 0.1);
        }

        .settings-switch:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 3px;
        }

        .settings-switch.active {
          background: #c4956a;
        }

        .settings-switch-thumb {
          position: absolute;
          top: 3px;
          left: 3px;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
          transition: left 0.25s ease;
        }

        .settings-switch.active
          .settings-switch-thumb {
          left: 25px;
        }

        /* =====================================================
           LINK ROWS
        ===================================================== */

        .settings-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          width: 100%;
          min-height: 58px;
          padding: 14px 0;
          border: 0;
          border-bottom: 1px solid var(--border);
          background: transparent;
          color: var(--text);
          text-align: left;
          font-family: "Inter", sans-serif;
          font-size: 0.94rem;
          font-weight: 600;
          cursor: pointer;
          transition:
            color 0.2s ease,
            background 0.2s ease;
        }

        .settings-link:last-child {
          border-bottom: 0;
          padding-bottom: 2px;
        }

        .settings-link:hover {
          color: var(--accent);
        }

        .settings-link:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 3px;
          border-radius: 8px;
        }

        .settings-link-left {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }

        .settings-link-chevron {
          flex-shrink: 0;
          color: var(--muted);
          transition:
            color 0.2s ease,
            transform 0.2s ease;
        }

        .settings-link:hover
          .settings-link-chevron {
          color: var(--accent);
          transform: translateX(3px);
        }

        .settings-danger {
          color: #b42318;
        }

        .settings-danger .settings-icon {
          color: #b42318;
        }

        .settings-danger:hover {
          color: #b42318;
        }

        /* =====================================================
           ABOUT
        ===================================================== */

        .settings-version-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 8px 0 14px;
        }

        .settings-version-label {
          color: var(--text);
          font-size: 0.94rem;
          font-weight: 600;
        }

        .settings-version-value {
          color: var(--muted);
          font-size: 0.88rem;
        }

        .settings-about-note {
          margin: 8px 0 0;
          padding-top: 15px;
          border-top: 1px solid var(--border);
          color: var(--muted);
          font-size: 0.86rem;
          line-height: 1.5;
        }

        /* =====================================================
           ACTION BUTTONS
        ===================================================== */

        .settings-actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }

        .settings-action-btn {
          min-height: 52px;
          flex: 1;
          padding: 14px 18px;
          border-radius: 14px;
          font-family: "Inter", sans-serif;
          font-size: 0.94rem;
          font-weight: 650;
          cursor: pointer;
          transition:
            transform 0.2s ease,
            opacity 0.2s ease,
            border-color 0.2s ease,
            background 0.2s ease;
        }

        .settings-action-btn:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .settings-action-btn:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 3px;
        }

        .settings-action-btn:disabled {
          cursor: not-allowed;
          opacity: 0.45;
          transform: none;
        }

        .settings-reset-btn {
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
        }

        .settings-reset-btn:hover:not(:disabled) {
          border-color: var(--accent);
          color: var(--accent);
        }

        .settings-save-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 0;
          background: var(--button-bg);
          color: var(--button-text);
        }

        .settings-save-btn:hover:not(:disabled) {
          opacity: 0.88;
        }

        .settings-save-spinner {
          animation: settingsSpin 0.8s linear infinite;
        }

        /* =====================================================
           MODAL
        ===================================================== */

        .settings-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
        }

        .settings-modal {
          width: 100%;
          max-width: 430px;
          padding: 26px;
          border: 1px solid var(--border);
          border-radius: 22px;
          background: var(--surface);
          color: var(--text);
          box-shadow: 0 25px 70px rgba(0, 0, 0, 0.2);
          animation: settingsFadeUp 0.22s ease;
        }

        .settings-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
        }

        .settings-modal-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          margin-bottom: 15px;
          border-radius: 12px;
          background: rgba(196, 149, 106, 0.12);
          color: var(--accent);
        }

        .settings-modal-icon.danger {
          background: rgba(180, 35, 24, 0.1);
          color: #b42318;
        }

        .settings-modal-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          padding: 0;
          border: 0;
          border-radius: 9px;
          background: transparent;
          color: var(--muted);
          cursor: pointer;
        }

        .settings-modal-close:hover {
          background: var(--border);
          color: var(--text);
        }

        .settings-modal-close:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }

        .settings-modal-title {
          margin: 0 0 10px;
          color: var(--text);
          font-family: "Playfair Display", serif;
          font-size: 1.45rem;
          line-height: 1.2;
        }

        .settings-modal-text {
          margin: 0 0 24px;
          color: var(--muted);
          font-size: 0.9rem;
          line-height: 1.7;
        }

        .settings-modal-buttons {
          display: flex;
          gap: 10px;
        }

        .settings-modal-btn {
          flex: 1;
          min-height: 46px;
          padding: 12px 14px;
          border: 0;
          border-radius: 13px;
          font-family: "Inter", sans-serif;
          font-size: 0.9rem;
          font-weight: 650;
          cursor: pointer;
        }

        .settings-modal-btn:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 3px;
        }

        .settings-modal-cancel {
          background: var(--border);
          color: var(--text);
        }

        .settings-modal-confirm {
          background: var(--button-bg);
          color: var(--button-text);
        }

        .settings-modal-confirm.danger {
          background: #b42318;
          color: #fff;
        }

        /* =====================================================
           TOAST
        ===================================================== */

        .settings-toast {
          position: fixed;
          left: 50%;
          bottom: 28px;
          z-index: 11000;
          max-width: calc(100vw - 32px);
          padding: 13px 19px;
          border: 1px solid var(--border);
          border-radius: 14px;
          background: var(--button-bg);
          color: var(--button-text);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.18);
          font-family: "Inter", sans-serif;
          font-size: 0.9rem;
          line-height: 1.4;
          text-align: center;
          transform: translateX(-50%);
          animation: settingsToastIn 0.25s ease;
        }

        /* =====================================================
           ANIMATIONS
        ===================================================== */

        @keyframes settingsFadeUp {
          from {
            opacity: 0;
            transform: translateY(14px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes settingsToastIn {
          from {
            opacity: 0;
            transform: translate(-50%, 14px);
          }

          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }

        @keyframes settingsSpin {
          to {
            transform: rotate(360deg);
          }
        }

        /* =====================================================
           REDUCED MOTION
        ===================================================== */

        html.reduce-motion
          .settings-page *,
        html.reduce-motion
          .settings-page *::before,
        html.reduce-motion
          .settings-page *::after,
        html.reduce-motion
          .settings-modal-overlay *,
        html.reduce-motion
          .settings-modal-overlay *::before,
        html.reduce-motion
          .settings-modal-overlay *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }

        /* =====================================================
           MOBILE
        ===================================================== */

        @media (max-width: 600px) {
          .settings-page {
            padding: 24px 14px 100px;
          }

          .settings-container {
            max-width: 100%;
          }

          .settings-card {
            padding: 18px;
            border-radius: 19px;
            margin-bottom: 16px;
          }

          .settings-title {
            font-size: 2rem;
          }

          .settings-subtitle {
            margin-bottom: 25px;
            font-size: 0.9rem;
          }

          .settings-section-title {
            font-size: 1.1rem;
          }

          .settings-row {
            gap: 12px;
            padding: 15px 0;
          }

          .settings-left {
            gap: 12px;
          }

          .settings-label {
            font-size: 0.92rem;
          }

          .settings-description {
            font-size: 0.8rem;
          }

          .settings-switch {
            width: 48px;
            flex-basis: 48px;
          }

          .settings-switch.active
            .settings-switch-thumb {
            left: 23px;
          }

          .settings-actions {
            flex-direction: column-reverse;
            gap: 10px;
          }

          .settings-action-btn {
            width: 100%;
          }

          .settings-modal {
            padding: 22px;
            border-radius: 19px;
          }

          .settings-modal-buttons {
            flex-direction: column-reverse;
          }

          .settings-modal-btn {
            width: 100%;
          }

          .settings-toast {
            bottom: 18px;
          }
        }

        @media (max-width: 360px) {
          .settings-page {
            padding-left: 12px;
            padding-right: 12px;
          }

          .settings-card {
            padding: 16px;
          }

          .settings-row {
            gap: 8px;
          }

          .settings-description {
            font-size: 0.77rem;
          }
        }

        /* =====================================================
           DARK MODE SURFACE SAFETY
        ===================================================== */

        html.dark-mode .settings-card,
        html.dark-mode .settings-modal {
          box-shadow:
            0 12px 35px rgba(0, 0, 0, 0.22);
        }

        html.dark-mode
          .settings-switch:not(.active) {
          background: #51483f;
        }

        /* =====================================================
           ACCESSIBILITY
        ===================================================== */

        @media (prefers-reduced-motion: reduce) {
          .settings-page *,
          .settings-page *::before,
          .settings-page *::after,
          .settings-modal-overlay *,
          .settings-modal-overlay *::before,
          .settings-modal-overlay *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>

      <div className="settings-page">
        <div className="settings-container">

          {/* =================================================
              BACK
          ================================================= */}

          <button
            type="button"
            className="settings-back-btn"
            onClick={navigateBack}
            disabled={saving || leaving}
            aria-label="Go back to menu"
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>

          {/* =================================================
              HEADER
          ================================================= */}

          <h1 className="settings-title">
            Settings
          </h1>

          <p className="settings-subtitle">
            Personalize your Brewed experience.
          </p>

          {/* =================================================
              PREFERENCES
          ================================================= */}

          <section
            className="settings-card"
            aria-labelledby="preferences-title"
          >
            <h2
              id="preferences-title"
              className="settings-section-title"
            >
              Preferences
            </h2>

            {/* Notifications */}

            <div className="settings-row">
              <div className="settings-left">
                <Bell
                  className="settings-icon"
                  aria-hidden="true"
                />

                <div className="settings-copy">
                  <p className="settings-label">
                    Push Notifications
                  </p>

                  <p className="settings-description">
                    Receive updates about orders and
                    rewards.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className={`settings-switch ${
                  notifications
                    ? "active"
                    : ""
                }`}
                role="switch"
                aria-checked={notifications}
                aria-label={`Push notifications ${
                  notifications
                    ? "enabled"
                    : "disabled"
                }`}
                onClick={() =>
                  updatePreference(
                    "notifications",
                    !notifications
                  )
                }
                disabled={saving}
              >
                <span className="settings-switch-thumb" />
              </button>
            </div>

            {/* Dark Mode */}

            <div className="settings-row">
              <div className="settings-left">
                <Moon
                  className="settings-icon"
                  aria-hidden="true"
                />

                <div className="settings-copy">
                  <p className="settings-label">
                    Dark Theme
                  </p>

                  <p className="settings-description">
                    Use a darker appearance throughout
                    Brewed.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className={`settings-switch ${
                  darkMode
                    ? "active"
                    : ""
                }`}
                role="switch"
                aria-checked={darkMode}
                aria-label={`Dark theme ${
                  darkMode
                    ? "enabled"
                    : "disabled"
                }`}
                onClick={() =>
                  updatePreference(
                    "darkMode",
                    !darkMode
                  )
                }
                disabled={saving}
              >
                <span className="settings-switch-thumb" />
              </button>
            </div>

            {/* Reduce Motion */}

            <div className="settings-row">
              <div className="settings-left">
                <Info
                  className="settings-icon"
                  aria-hidden="true"
                />

                <div className="settings-copy">
                  <p className="settings-label">
                    Reduce Motion
                  </p>

                  <p className="settings-description">
                    Minimize animations and transitions
                    throughout Brewed.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className={`settings-switch ${
                  reduceMotion
                    ? "active"
                    : ""
                }`}
                role="switch"
                aria-checked={reduceMotion}
                aria-label={`Reduce motion ${
                  reduceMotion
                    ? "enabled"
                    : "disabled"
                }`}
                onClick={() =>
                  updatePreference(
                    "reduceMotion",
                    !reduceMotion
                  )
                }
                disabled={saving}
              >
                <span className="settings-switch-thumb" />
              </button>
            </div>
          </section>

          {/* =================================================
              PRIVACY
          ================================================= */}

          <section
            className="settings-card"
            aria-labelledby="privacy-title"
          >
            <h2
              id="privacy-title"
              className="settings-section-title"
            >
              Privacy
            </h2>

            <button
              type="button"
              className="settings-link"
              onClick={() =>
                navigateTo("privacy")
              }
              disabled={saving || leaving}
            >
              <span className="settings-link-left">
                <Shield
                  size={19}
                  className="settings-icon"
                  aria-hidden="true"
                />

                <span>
                  Privacy Policy
                </span>
              </span>

              <ChevronRight
                size={18}
                className="settings-link-chevron"
                aria-hidden="true"
              />
            </button>

            <button
              type="button"
              className="settings-link"
              onClick={() =>
                navigateTo("terms")
              }
              disabled={saving || leaving}
            >
              <span className="settings-link-left">
                <FileText
                  size={19}
                  className="settings-icon"
                  aria-hidden="true"
                />

                <span>
                  Terms &amp; Conditions
                </span>
              </span>

              <ChevronRight
                size={18}
                className="settings-link-chevron"
                aria-hidden="true"
              />
            </button>

            <button
              type="button"
              className="settings-link"
              onClick={handleClearCache}
              disabled={saving || leaving}
            >
              <span className="settings-link-left">
                <Trash2
                  size={19}
                  className="settings-icon"
                  aria-hidden="true"
                />

                <span>
                  Clear Cache
                </span>
              </span>

              <ChevronRight
                size={18}
                className="settings-link-chevron"
                aria-hidden="true"
              />
            </button>
          </section>

          {/* =================================================
              ACCOUNT
          ================================================= */}

          <section
            className="settings-card"
            aria-labelledby="account-title"
          >
            <h2
              id="account-title"
              className="settings-section-title"
            >
              Account
            </h2>

            <button
              type="button"
              className="settings-link"
              onClick={() =>
                navigateTo("change-password")
              }
              disabled={saving || leaving}
            >
              <span className="settings-link-left">
                <KeyRound
                  size={19}
                  className="settings-icon"
                  aria-hidden="true"
                />

                <span>
                  Change Password
                </span>
              </span>

              <ChevronRight
                size={18}
                className="settings-link-chevron"
                aria-hidden="true"
              />
            </button>

            <button
              type="button"
              className="settings-link settings-danger"
              onClick={() =>
                navigateTo("deleteAccount")
              }
              disabled={saving || leaving}
            >
              <span className="settings-link-left">
                <Trash2
                  size={19}
                  className="settings-icon"
                  aria-hidden="true"
                />

                <span>
                  Delete Account
                </span>
              </span>

              <ChevronRight
                size={18}
                className="settings-link-chevron"
                aria-hidden="true"
              />
            </button>
          </section>

          {/* =================================================
              ABOUT
          ================================================= */}

          <section
            className="settings-card"
            aria-labelledby="about-title"
          >
            <h2
              id="about-title"
              className="settings-section-title"
            >
              About
            </h2>

            <div className="settings-version-row">
              <span className="settings-version-label">
                Version
              </span>

              <span className="settings-version-value">
                Brewed v1.0.0
              </span>
            </div>

            <p className="settings-about-note">
              ☕ Made with love in Kolkata.
            </p>
          </section>

          {/* =================================================
              SAVE / RESET
          ================================================= */}

          <div className="settings-actions">

            <button
              type="button"
              className="settings-action-btn settings-reset-btn"
              onClick={handleReset}
              disabled={
                !hasChanges ||
                saving ||
                leaving
              }
            >
              Reset to Defaults
            </button>

            <button
              type="button"
              className="settings-action-btn settings-save-btn"
              onClick={handleSave}
              disabled={
                !hasChanges ||
                saving ||
                leaving
              }
            >
              {saving ? (
                <>
                  <Loader2
                    size={17}
                    className="settings-save-spinner"
                    aria-hidden="true"
                  />

                  Saving...
                </>
              ) : (
                <>
                  <Check
                    size={17}
                    aria-hidden="true"
                  />

                  Save Changes
                </>
              )}
            </button>

          </div>
        </div>
      </div>

      {/* =====================================================
          CONFIRMATION MODAL
      ===================================================== */}

      {confirmOpen && (
        <div
          className="settings-modal-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setConfirmOpen(false);
            }
          }}
        >
          <div
            className="settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-modal-title"
            aria-describedby="settings-modal-description"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="settings-modal-header">
              <div
                className={`settings-modal-icon ${
                  confirmData.danger
                    ? "danger"
                    : ""
                }`}
              >
                {confirmData.danger ? (
                  <AlertTriangle
                    size={21}
                    aria-hidden="true"
                  />
                ) : (
                  <Info
                    size={21}
                    aria-hidden="true"
                  />
                )}
              </div>

              <button
                type="button"
                className="settings-modal-close"
                onClick={() =>
                  setConfirmOpen(false)
                }
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <h2
              id="settings-modal-title"
              className="settings-modal-title"
            >
              {confirmData.title}
            </h2>

            <p
              id="settings-modal-description"
              className="settings-modal-text"
            >
              {confirmData.message}
            </p>

            <div className="settings-modal-buttons">

              <button
                type="button"
                className="settings-modal-btn settings-modal-cancel"
                onClick={() =>
                  setConfirmOpen(false)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className={`settings-modal-btn settings-modal-confirm ${
                  confirmData.danger
                    ? "danger"
                    : ""
                }`}
                onClick={() => {
                  if (
                    typeof confirmData.onConfirm ===
                    "function"
                  ) {
                    confirmData.onConfirm();
                  }
                }}
              >
                {confirmData.confirmLabel}
              </button>

            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          TOAST
      ===================================================== */}

      {toast.show && (
        <div
          className="settings-toast"
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      )}
    </>
  );
}
