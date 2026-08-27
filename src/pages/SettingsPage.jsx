import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";

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
  RotateCcw,
  Check,
  Loader2,
  X,
} from "lucide-react";

const DEFAULT_SETTINGS = {
  notifications: true,
  darkMode: false,
  reduceMotion: false,
};

export default function SettingsPage({ setPage }) {
  const { currentUser } = useAuth();
  const { darkMode, setDarkMode } = useTheme();

  /* =========================
     STATE
  ========================= */

  const [notifications, setNotifications] = useState(
    DEFAULT_SETTINGS.notifications
  );

  const [reduceMotion, setReduceMotion] = useState(
    DEFAULT_SETTINGS.reduceMotion
  );

  const [savedNotifications, setSavedNotifications] = useState(
    DEFAULT_SETTINGS.notifications
  );

  const [savedDarkMode, setSavedDarkMode] = useState(
    DEFAULT_SETTINGS.darkMode
  );

  const [savedReduceMotion, setSavedReduceMotion] = useState(
    DEFAULT_SETTINGS.reduceMotion
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const toastTimerRef = useRef(null);

  /* =========================
     TOAST
  ========================= */

  const showToast = useCallback((message) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    setToast({
      show: true,
      message,
    });

    toastTimerRef.current = setTimeout(() => {
      setToast({
        show: false,
        message: "",
      });
    }, 2500);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  /* =========================
     LOAD SETTINGS
  ========================= */

  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      if (!currentUser) {
        if (mounted) {
          setLoading(false);
        }

        return;
      }

      try {
        setLoading(true);

        const userRef = doc(db, "users", currentUser.uid);
        const userSnapshot = await getDoc(userRef);

        if (!mounted) return;

        const userData = userSnapshot.exists()
          ? userSnapshot.data()
          : {};

        const storedSettings =
          userData?.settings &&
          typeof userData.settings === "object"
            ? userData.settings
            : {};

        const notificationValue =
          typeof storedSettings.notifications === "boolean"
            ? storedSettings.notifications
            : DEFAULT_SETTINGS.notifications;

        const darkModeValue =
          typeof storedSettings.darkMode === "boolean"
            ? storedSettings.darkMode
            : DEFAULT_SETTINGS.darkMode;

        const reduceMotionValue =
          typeof storedSettings.reduceMotion === "boolean"
            ? storedSettings.reduceMotion
            : DEFAULT_SETTINGS.reduceMotion;

        setNotifications(notificationValue);
        setDarkMode(darkModeValue);
        setReduceMotion(reduceMotionValue);

        setSavedNotifications(notificationValue);
        setSavedDarkMode(darkModeValue);
        setSavedReduceMotion(reduceMotionValue);
      } catch (error) {
        console.error(
          "SettingsPage: failed to load settings",
          error
        );

        if (!mounted) return;

        setNotifications(DEFAULT_SETTINGS.notifications);
        setDarkMode(DEFAULT_SETTINGS.darkMode);
        setReduceMotion(DEFAULT_SETTINGS.reduceMotion);

        setSavedNotifications(DEFAULT_SETTINGS.notifications);
        setSavedDarkMode(DEFAULT_SETTINGS.darkMode);
        setSavedReduceMotion(DEFAULT_SETTINGS.reduceMotion);

        showToast("Couldn't load your settings.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      mounted = false;
    };
  }, [currentUser, setDarkMode, showToast]);

  /* =========================
     REDUCED MOTION
  ========================= */

  useEffect(() => {
    const root = document.documentElement;

    if (reduceMotion) {
      root.classList.add("brew-reduce-motion");
    } else {
      root.classList.remove("brew-reduce-motion");
    }

    return () => {
      root.classList.remove("brew-reduce-motion");
    };
  }, [reduceMotion]);

  /* =========================
     MODAL KEYBOARD CONTROL
  ========================= */

  useEffect(() => {
    if (!confirmOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setConfirmOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [confirmOpen]);

  /* =========================
     CHANGE DETECTION
  ========================= */

  const hasChanges =
    notifications !== savedNotifications ||
    darkMode !== savedDarkMode ||
    reduceMotion !== savedReduceMotion;

  /* =========================
     RESET SETTINGS
  ========================= */

  const resetSettings = () => {
    setConfirmData({
      title: "Reset Settings",
      message:
        "Restore all preferences to Brewed's default settings? Your account, orders, rewards and other data will not be affected.",
      confirmLabel: "Reset Settings",
      danger: false,

      onConfirm: () => {
        setNotifications(DEFAULT_SETTINGS.notifications);
        setDarkMode(DEFAULT_SETTINGS.darkMode);
        setReduceMotion(DEFAULT_SETTINGS.reduceMotion);

        setConfirmOpen(false);

        showToast(
          "Defaults restored. Save Changes to apply them."
        );
      },
    });

    setConfirmOpen(true);
  };

  /* =========================
     CLEAR CACHE
  ========================= */

  const clearCache = () => {
    setConfirmData({
      title: "Clear Cache",
      message:
        "Remove temporary Brewed data stored on this device? Your account, orders, rewards and Firestore data will not be deleted.",
      confirmLabel: "Clear Cache",
      danger: true,

      onConfirm: () => {
        try {
          /*
           * Never use localStorage.clear() here.
           *
           * Only remove keys owned by Brewed.
           * Add future Brewed cache keys here as needed.
           */

          const brewedStoragePrefixes = [
            "brewed_cache",
            "brewed_menu_cache",
            "brewed_products_cache",
            "brewed_favorites_cache",
            "brewed_orders_cache",
            "brewed_image_cache",
          ];

          Object.keys(localStorage).forEach((key) => {
            if (
              brewedStoragePrefixes.some(
                (prefix) =>
                  key === prefix ||
                  key.startsWith(`${prefix}_`)
              )
            ) {
              localStorage.removeItem(key);
            }
          });

          Object.keys(sessionStorage).forEach((key) => {
            if (
              brewedStoragePrefixes.some(
                (prefix) =>
                  key === prefix ||
                  key.startsWith(`${prefix}_`)
              )
            ) {
              sessionStorage.removeItem(key);
            }
          });

          setConfirmOpen(false);

          showToast("Cache cleared successfully.");
        } catch (error) {
          console.error(
            "SettingsPage: failed to clear cache",
            error
          );

          setConfirmOpen(false);

          showToast("Couldn't clear the cache.");
        }
      },
    });

    setConfirmOpen(true);
  };

  /* =========================
     SAVE SETTINGS
  ========================= */

  const saveSettings = async () => {
    if (!currentUser || saving || !hasChanges) {
      return;
    }

    try {
      setSaving(true);

      const userRef = doc(db, "users", currentUser.uid);

      /*
       * Fetch the latest settings before writing.
       *
       * This prevents SettingsPage from accidentally replacing
       * future settings fields added elsewhere in the app.
       */

      const latestSnapshot = await getDoc(userRef);

      const latestData = latestSnapshot.exists()
        ? latestSnapshot.data()
        : {};

      const latestSettings =
        latestData?.settings &&
        typeof latestData.settings === "object"
          ? latestData.settings
          : {};

      const updatedSettings = {
        ...latestSettings,

        notifications,
        darkMode,
        reduceMotion,
      };

      /*
       * merge:true ensures that:
       *
       * 1. A missing users/{uid} document is created.
       * 2. Existing user fields remain untouched.
       * 3. Existing settings outside this page remain untouched.
       */

      await setDoc(
        userRef,
        {
          settings: updatedSettings,
        },
        {
          merge: true,
        }
      );

      setSavedNotifications(notifications);
      setSavedDarkMode(darkMode);
      setSavedReduceMotion(reduceMotion);

      showToast("Settings saved successfully.");
    } catch (error) {
      console.error(
        "SettingsPage: failed to save settings",
        error
      );

      showToast(
        "Couldn't save your settings. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================
     NAVIGATION
  ========================= */

  const handleBack = () => {
    if (saving) return;

    if (hasChanges) {
      setConfirmData({
        title: "Unsaved Changes",
        message:
          "You have unsaved changes. If you leave this page now, those changes will be lost.",
        confirmLabel: "Leave",
        danger: true,

        onConfirm: () => {
          setConfirmOpen(false);
          setPage("menu");
        },
      });

      setConfirmOpen(true);

      return;
    }

    setPage("menu");
  };

  /* =========================
     TOGGLES
  ========================= */

  const toggleNotifications = () => {
    if (loading || saving) return;

    setNotifications((current) => !current);
  };

  const toggleDarkMode = () => {
    if (loading || saving) return;

    setDarkMode((current) => !current);
  };

  const toggleReduceMotion = () => {
    if (loading || saving) return;

    setReduceMotion((current) => !current);
  };

  /* =========================
     LOADING
  ========================= */

  if (loading) {
    return (
      <>
        <style>{`
          .settings-loading-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg);
            color: var(--muted);
            font-family: "Inter", sans-serif;
          }

          .settings-loading {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: .9rem;
          }

          .settings-loading-spinner {
            animation: settingsLoadingSpin 1s linear infinite;
          }

          @keyframes settingsLoadingSpin {
            to {
              transform: rotate(360deg);
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .settings-loading-spinner {
              animation: none;
            }
          }
        `}</style>

        <div className="settings-loading-page">
          <div className="settings-loading">
            <Loader2
              size={24}
              className="settings-loading-spinner"
            />

            <span>Loading settings...</span>
          </div>
        </div>
      </>
    );
  }

  /* =========================
     PAGE
  ========================= */

  return (
    <>
      <style>{`
        /* =====================================================
           SETTINGS PAGE
        ===================================================== */

        .settings-page {
          min-height: 100vh;
          padding: 32px 18px 120px;
          background: var(--bg);
          color: var(--text);
          font-family: "Inter", sans-serif;
          transition:
            background .3s ease,
            color .3s ease;
        }

        .settings-container {
          width: 100%;
          max-width: 720px;
          margin: 0 auto;
          animation: settingsFadeUp .45s ease both;
        }

        /* =====================================================
           BACK BUTTON
        ===================================================== */

        .settings-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;

          margin: 0 0 22px;
          padding: 8px 4px;

          border: none;
          background: transparent;

          color: var(--text);

          font-family: "Inter", sans-serif;
          font-size: .92rem;
          font-weight: 600;

          cursor: pointer;

          transition:
            color .2s ease,
            transform .2s ease,
            opacity .2s ease;
        }

        .settings-back-btn:hover:not(:disabled) {
          color: var(--accent);
          transform: translateX(-2px);
        }

        .settings-back-btn:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        /* =====================================================
           HEADER
        ===================================================== */

        .settings-header {
          margin-bottom: 32px;
        }

        .settings-title {
          margin: 0 0 8px;

          color: var(--text);

          font-family: "Playfair Display", serif;
          font-size: 2.3rem;
          line-height: 1.15;
          letter-spacing: -.02em;
        }

        .settings-subtitle {
          max-width: 540px;
          margin: 0;

          color: var(--muted);

          font-size: .95rem;
          line-height: 1.65;
        }

        /* =====================================================
           CARDS
        ===================================================== */

        .settings-card {
          margin-bottom: 22px;
          padding: 22px;

          background: var(--surface);

          border: 1px solid var(--border);
          border-radius: 22px;

          transition:
            transform .25s ease,
            box-shadow .25s ease,
            background .3s ease,
            border-color .3s ease;
        }

        .settings-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, .08);
        }

        .settings-section-title {
          margin: 0 0 18px;

          color: var(--text);

          font-family: "Playfair Display", serif;
          font-size: 1.2rem;
          line-height: 1.3;
        }

        /* =====================================================
           SETTING ROW
        ===================================================== */

        .settings-row {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 16px;

          min-height: 66px;
          padding: 16px 0;

          border-bottom: 1px solid var(--border);
        }

        .settings-row:last-child {
          border-bottom: none;
        }

        .settings-row-left {
          display: flex;
          align-items: center;

          gap: 14px;

          flex: 1;
          min-width: 0;
        }

        .settings-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;

          flex: 0 0 40px;

          width: 40px;
          height: 40px;

          border-radius: 12px;

          background: rgba(196, 149, 106, .1);
        }

        .settings-icon {
          color: var(--accent);
          flex-shrink: 0;
        }

        .settings-copy {
          min-width: 0;
        }

        .settings-label {
          margin-bottom: 4px;

          color: var(--text);

          font-size: .96rem;
          font-weight: 600;
          line-height: 1.35;
        }

        .settings-description {
          color: var(--muted);

          font-size: .86rem;
          line-height: 1.5;
        }

        /* =====================================================
           SWITCH
        ===================================================== */

        .settings-switch {
          position: relative;

          flex: 0 0 auto;

          width: 50px;
          height: 28px;

          padding: 0;

          border: none;
          border-radius: 999px;

          background: #cfc6bc;

          cursor: pointer;

          transition:
            background .25s ease,
            opacity .2s ease;
        }

        .settings-switch-thumb {
          position: absolute;

          top: 3px;
          left: 3px;

          width: 22px;
          height: 22px;

          border-radius: 50%;

          background: #fff;

          box-shadow:
            0 2px 6px rgba(0, 0, 0, .2);

          transition:
            transform .25s ease;
        }

        .settings-switch.active {
          background: #c4956a;
        }

        .settings-switch.active
        .settings-switch-thumb {
          transform: translateX(22px);
        }

        .settings-switch:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        /* =====================================================
           LINK ROWS
        ===================================================== */

        .settings-link-row {
          display: flex;
          align-items: center;
          justify-content: space-between;

          width: 100%;
          min-height: 58px;

          gap: 12px;

          padding: 10px 0;

          border: none;
          border-bottom: 1px solid var(--border);

          background: transparent;

          color: var(--text);

          font-family: "Inter", sans-serif;
          text-align: left;

          cursor: pointer;

          transition:
            background .2s ease,
            color .2s ease,
            padding .2s ease;
        }

        .settings-link-row:last-child {
          border-bottom: none;
        }

        .settings-link-row:hover:not(:disabled) {
          padding-left: 8px;
          padding-right: 8px;

          border-radius: 12px;

          background: rgba(196, 149, 106, .07);
        }

        .settings-link-left {
          display: flex;
          align-items: center;

          gap: 13px;

          min-width: 0;
        }

        .settings-link-label {
          color: var(--text);

          font-size: .94rem;
          font-weight: 600;
        }

        .settings-link-right {
          flex-shrink: 0;

          color: var(--muted);

          transition:
            color .2s ease,
            transform .2s ease;
        }

        .settings-link-row:hover:not(:disabled)
        .settings-link-right {
          color: var(--accent);
          transform: translateX(3px);
        }

        .settings-link-row:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        .settings-danger .settings-icon {
          color: #b42318;
        }

        .settings-danger:hover:not(:disabled) {
          background: rgba(180, 35, 24, .06);
        }

        /* =====================================================
           ABOUT
        ===================================================== */

        .settings-about-row {
          min-height: 58px;
        }

        .settings-about-note {
          display: flex;
          align-items: center;

          gap: 8px;

          margin-top: 14px;

          color: var(--muted);

          font-size: .88rem;
          line-height: 1.5;
        }

        .settings-coffee {
          font-size: 1rem;
        }

        /* =====================================================
           BUTTONS
        ===================================================== */

        .settings-button-row {
          display: flex;

          gap: 14px;

          margin-top: 24px;
        }

        .settings-save-btn,
        .settings-reset-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;

          gap: 8px;

          flex: 1;

          min-height: 50px;

          min-width: 0;

          padding: 14px 18px;

          border-radius: 14px;

          font-family: "Inter", sans-serif;
          font-size: .94rem;
          font-weight: 600;

          cursor: pointer;

          transition:
            opacity .2s ease,
            transform .2s ease,
            border-color .2s ease,
            color .2s ease,
            background .2s ease;
        }

        .settings-save-btn {
          border: none;

          background: var(--button-bg);
          color: var(--button-text);
        }

        .settings-save-btn:hover:not(:disabled) {
          opacity: .86;
          transform: translateY(-1px);
        }

        .settings-save-btn:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        .settings-reset-btn {
          border: 1px solid var(--border);

          background: var(--surface);
          color: var(--text);
        }

        .settings-reset-btn:hover:not(:disabled) {
          border-color: var(--accent);
          color: var(--accent);
          transform: translateY(-1px);
        }

        .settings-reset-btn:disabled {
          opacity: .4;
          cursor: not-allowed;
        }

        .settings-unsaved {
          margin-top: 12px;

          color: var(--muted);

          font-size: .8rem;
          text-align: center;
        }

        .settings-auth-warning {
          margin-top: 12px;

          color: #b42318;

          font-size: .82rem;
          text-align: center;
        }

        /* =====================================================
           MODAL
        ===================================================== */

        .settings-modal-overlay {
          position: fixed;
          inset: 0;

          z-index: 9999;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: 20px;

          background: rgba(0, 0, 0, .42);

          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);

          animation: settingsOverlayIn .2s ease both;
        }

        .settings-modal {
          position: relative;

          width: 100%;
          max-width: 420px;

          padding: 28px;

          border: 1px solid var(--border);
          border-radius: 22px;

          background: var(--surface);
          color: var(--text);

          box-shadow:
            0 24px 70px rgba(0, 0, 0, .2);

          animation: settingsModalIn .25s ease both;
        }

        .settings-modal-close {
          position: absolute;

          top: 15px;
          right: 15px;

          display: flex;
          align-items: center;
          justify-content: center;

          width: 34px;
          height: 34px;

          padding: 0;

          border: none;
          border-radius: 50%;

          background: transparent;
          color: var(--muted);

          cursor: pointer;

          transition:
            background .2s ease,
            color .2s ease;
        }

        .settings-modal-close:hover {
          background: rgba(0, 0, 0, .06);
          color: var(--text);
        }

        .settings-modal-title {
          margin: 0 35px 10px 0;

          color: var(--text);

          font-family: "Playfair Display", serif;
          font-size: 1.5rem;
          line-height: 1.25;
        }

        .settings-modal-text {
          margin: 0 0 24px;

          color: var(--muted);

          line-height: 1.7;
        }

        .settings-modal-buttons {
          display: flex;

          gap: 12px;
        }

        .settings-modal-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;

          flex: 1;

          min-height: 48px;

          padding: 13px 16px;

          border: none;
          border-radius: 14px;

          font-family: "Inter", sans-serif;
          font-weight: 600;

          cursor: pointer;

          transition:
            opacity .2s ease,
            transform .2s ease;
        }

        .settings-modal-btn:hover {
          opacity: .86;
          transform: translateY(-1px);
        }

        .settings-cancel-btn {
          background: var(--border);
          color: var(--text);
        }

        .settings-confirm-btn {
          background: var(--button-bg);
          color: var(--button-text);
        }

        .settings-danger-confirm-btn {
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

          z-index: 10000;

          display: flex;
          align-items: center;

          gap: 9px;

          max-width: calc(100vw - 32px);

          padding: 13px 18px;

          border-radius: 14px;

          background: var(--button-bg);
          color: var(--button-text);

          box-shadow:
            0 12px 30px rgba(0, 0, 0, .18);

          font-family: "Inter", sans-serif;
          font-size: .88rem;
          line-height: 1.4;

          transform: translateX(-50%);

          animation: settingsToastIn .25s ease both;
        }

        /* =====================================================
           FOCUS
        ===================================================== */

        .settings-back-btn:focus-visible,
        .settings-link-row:focus-visible,
        .settings-switch:focus-visible,
        .settings-save-btn:focus-visible,
        .settings-reset-btn:focus-visible,
        .settings-modal-btn:focus-visible,
        .settings-modal-close:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 3px;
        }

        /* =====================================================
           ANIMATIONS
        ===================================================== */

        @keyframes settingsFadeUp {
          from {
            opacity: 0;
            transform: translateY(18px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes settingsOverlayIn {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

        @keyframes settingsModalIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(.98);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes settingsToastIn {
          from {
            opacity: 0;
            transform: translate(-50%, 18px);
          }

          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }

        /* =====================================================
           REDUCED MOTION
        ===================================================== */

        .brew-reduce-motion *,
        .brew-reduce-motion *::before,
        .brew-reduce-motion *::after {
          animation-duration: .01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: .01ms !important;
          scroll-behavior: auto !important;
        }

        /* =====================================================
           SYSTEM REDUCED MOTION
        ===================================================== */

        @media (prefers-reduced-motion: reduce) {
          .settings-page *,
          .settings-page *::before,
          .settings-page *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: .01ms !important;
            scroll-behavior: auto !important;
          }
        }

        /* =====================================================
           MOBILE
        ===================================================== */

        @media (max-width: 600px) {
          .settings-page {
            padding: 24px 14px 100px;
          }

          .settings-title {
            font-size: 2rem;
          }

          .settings-subtitle {
            font-size: .9rem;
          }

          .settings-card {
            padding: 18px;
            border-radius: 18px;
          }

          .settings-card:hover {
            transform: none;
            box-shadow: none;
          }

          .settings-section-title {
            font-size: 1.1rem;
          }

          .settings-row {
            min-height: 64px;
            padding: 14px 0;
          }

          .settings-row-left {
            gap: 11px;
          }

          .settings-icon-wrapper {
            flex-basis: 37px;
            width: 37px;
            height: 37px;
            border-radius: 11px;
          }

          .settings-label {
            font-size: .92rem;
          }

          .settings-description {
            font-size: .81rem;
          }

          .settings-switch {
            width: 48px;
            height: 27px;
          }

          .settings-switch-thumb {
            width: 21px;
            height: 21px;
          }

          .settings-switch.active
          .settings-switch-thumb {
            transform: translateX(21px);
          }

          .settings-button-row {
            flex-direction: column-reverse;
          }

          .settings-save-btn,
          .settings-reset-btn {
            width: 100%;
          }

          .settings-modal {
            padding: 24px 20px;
            border-radius: 20px;
          }

          .settings-modal-buttons {
            flex-direction: column-reverse;
          }

          .settings-toast {
            bottom: 20px;
            padding: 12px 16px;
          }
        }

        /* =====================================================
           TOUCH DEVICES
        ===================================================== */

        @media (hover: none) {
          .settings-card:hover {
            transform: none;
            box-shadow: none;
          }

          .settings-link-row:hover:not(:disabled) {
            padding-left: 0;
            padding-right: 0;
            background: transparent;
          }

          .settings-link-row:hover:not(:disabled)
          .settings-link-right {
            transform: none;
          }
        }
      `}</style>

      <div className="settings-page">
        <div className="settings-container">

          {/* =================================================
              HEADER
          ================================================= */}

          <button
            type="button"
            className="settings-back-btn"
            onClick={handleBack}
            disabled={saving}
            aria-label="Go back to menu"
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>

          <div className="settings-header">
            <h1 className="settings-title">
              Settings
            </h1>

            <p className="settings-subtitle">
              Personalize your Brewed experience.
            </p>
          </div>

          {/* =================================================
              PREFERENCES
          ================================================= */}

          <section className="settings-card">
            <h2 className="settings-section-title">
              Preferences
            </h2>

            {/* Notifications */}

            <div className="settings-row">
              <div className="settings-row-left">
                <div className="settings-icon-wrapper">
                  <Bell
                    size={20}
                    className="settings-icon"
                  />
                </div>

                <div className="settings-copy">
                  <div className="settings-label">
                    Push Notifications
                  </div>

                  <div className="settings-description">
                    Receive updates about orders and rewards.
                  </div>
                </div>
              </div>

              <button
                type="button"
                className={`settings-switch ${
                  notifications ? "active" : ""
                }`}
                onClick={toggleNotifications}
                disabled={saving}
                role="switch"
                aria-checked={notifications}
                aria-label="Toggle push notifications"
              >
                <span className="settings-switch-thumb" />
              </button>
            </div>

            {/* Dark Theme */}

            <div className="settings-row">
              <div className="settings-row-left">
                <div className="settings-icon-wrapper">
                  <Moon
                    size={20}
                    className="settings-icon"
                  />
                </div>

                <div className="settings-copy">
                  <div className="settings-label">
                    Dark Theme
                  </div>

                  <div className="settings-description">
                    Reduce eye strain at night.
                  </div>
                </div>
              </div>

              <button
                type="button"
                className={`settings-switch ${
                  darkMode ? "active" : ""
                }`}
                onClick={toggleDarkMode}
                disabled={saving}
                role="switch"
                aria-checked={darkMode}
                aria-label="Toggle dark theme"
              >
                <span className="settings-switch-thumb" />
              </button>
            </div>

            {/* Reduce Motion */}

            <div className="settings-row">
              <div className="settings-row-left">
                <div className="settings-icon-wrapper">
                  <Info
                    size={20}
                    className="settings-icon"
                  />
                </div>

                <div className="settings-copy">
                  <div className="settings-label">
                    Reduce Motion
                  </div>

                  <div className="settings-description">
                    Minimize interface animations.
                  </div>
                </div>
              </div>

              <button
                type="button"
                className={`settings-switch ${
                  reduceMotion ? "active" : ""
                }`}
                onClick={toggleReduceMotion}
                disabled={saving}
                role="switch"
                aria-checked={reduceMotion}
                aria-label="Toggle reduced motion"
              >
                <span className="settings-switch-thumb" />
              </button>
            </div>
          </section>

          {/* =================================================
              PRIVACY
          ================================================= */}

          <section className="settings-card">
            <h2 className="settings-section-title">
              Privacy
            </h2>

            <button
              type="button"
              className="settings-link-row"
              onClick={() => setPage("privacy")}
            >
              <span className="settings-link-left">
                <span className="settings-icon-wrapper">
                  <Shield
                    size={19}
                    className="settings-icon"
                  />
                </span>

                <span className="settings-link-label">
                  Privacy Policy
                </span>
              </span>

              <ChevronRight
                size={18}
                className="settings-link-right"
              />
            </button>

            <button
              type="button"
              className="settings-link-row"
              onClick={() => setPage("terms")}
            >
              <span className="settings-link-left">
                <span className="settings-icon-wrapper">
                  <FileText
                    size={19}
                    className="settings-icon"
                  />
                </span>

                <span className="settings-link-label">
                  Terms & Conditions
                </span>
              </span>

              <ChevronRight
                size={18}
                className="settings-link-right"
              />
            </button>

            <button
              type="button"
              className="settings-link-row"
              onClick={clearCache}
              disabled={saving}
            >
              <span className="settings-link-left">
                <span className="settings-icon-wrapper">
                  <Trash2
                    size={19}
                    className="settings-icon"
                  />
                </span>

                <span className="settings-link-label">
                  Clear Cache
                </span>
              </span>

              <ChevronRight
                size={18}
                className="settings-link-right"
              />
            </button>
          </section>

          {/* =================================================
              ACCOUNT
          ================================================= */}

          <section className="settings-card">
            <h2 className="settings-section-title">
              Account
            </h2>

            <button
              type="button"
              className="settings-link-row"
              onClick={() =>
                setPage("change-password")
              }
            >
              <span className="settings-link-left">
                <span className="settings-icon-wrapper">
                  <KeyRound
                    size={19}
                    className="settings-icon"
                  />
                </span>

                <span className="settings-link-label">
                  Change Password
                </span>
              </span>

              <ChevronRight
                size={18}
                className="settings-link-right"
              />
            </button>

            <button
              type="button"
              className="settings-link-row settings-danger"
              onClick={() =>
                setPage("deleteAccount")
              }
            >
              <span className="settings-link-left">
                <span className="settings-icon-wrapper">
                  <Trash2
                    size={19}
                    className="settings-icon"
                  />
                </span>

                <span className="settings-link-label">
                  Delete Account
                </span>
              </span>

              <ChevronRight
                size={18}
                className="settings-link-right"
              />
            </button>
          </section>

          {/* =================================================
              ABOUT
          ================================================= */}

          <section className="settings-card">
            <h2 className="settings-section-title">
              About
            </h2>

            <div className="settings-row settings-about-row">
              <div>
                <div className="settings-label">
                  Version
                </div>

                <div className="settings-description">
                  Brewed v1.0.0
                </div>
              </div>
            </div>

            <div className="settings-about-note">
              <span className="settings-coffee">
                ☕
              </span>

              <span>
                Made with love in Kolkata.
              </span>
            </div>
          </section>

          {/* =================================================
              ACTIONS
          ================================================= */}

          <div className="settings-button-row">
            <button
              type="button"
              className="settings-reset-btn"
              onClick={resetSettings}
              disabled={saving || !hasChanges}
            >
              <RotateCcw size={17} />

              <span>
                Reset to Defaults
              </span>
            </button>

            <button
              type="button"
              className="settings-save-btn"
              onClick={saveSettings}
              disabled={
                saving ||
                !hasChanges ||
                !currentUser
              }
            >
              {saving ? (
                <>
                  <Loader2
                    size={17}
                    className="settings-loading-spinner"
                  />

                  <span>
                    Saving...
                  </span>
                </>
              ) : (
                <>
                  <Check size={17} />

                  <span>
                    Save Changes
                  </span>
                </>
              )}
            </button>
          </div>

          {!currentUser && (
            <div className="settings-auth-warning">
              Please sign in to save your settings.
            </div>
          )}

          {hasChanges && !saving && (
            <div className="settings-unsaved">
              You have unsaved changes
            </div>
          )}
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
              event.target === event.currentTarget
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
          >
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
                className="settings-modal-btn settings-cancel-btn"
                onClick={() =>
                  setConfirmOpen(false)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className={`settings-modal-btn ${
                  confirmData.danger
                    ? "settings-danger-confirm-btn"
                    : "settings-confirm-btn"
                }`}
                onClick={
                  confirmData.onConfirm
                }
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
          <Check size={17} />

          <span>
            {toast.message}
          </span>
        </div>
      )}
    </>
  );
}
