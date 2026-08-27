import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "../context/AuthContext";
import { usePreferences } from "../context/PreferencesContext";

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
  }, [
    preferencesLoading,
    notifications,
    darkMode,
    reduceMotion,
  ]);

  /*
   * =========================================================
   * UNSAVED CHANGES
   * =========================================================
   */

  const hasChanges = useMemo(() => {
    return (
      notifications !== savedPreferences.notifications ||
      darkMode !== savedPreferences.darkMode ||
      reduceMotion !== savedPreferences.reduceMotion
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
   * CLEANUP
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
   * SAVE
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
   * RESET
   * =========================================================
   */

  const handleReset = () => {
    if (!hasChanges) {
      showToast(
        "Settings are already at their defaults."
      );
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
   */

  const handleClearCache = () => {
    setConfirmData({
      title: "Clear Cache",
      message:
        "This removes temporary cached data stored on this device. Your account, orders, rewards and other permanent data will not be deleted.",
      confirmLabel: "Clear Cache",
      danger: false,
      onConfirm: async () => {
        try {
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

          if (
            typeof window !== "undefined" &&
            "caches" in window
          ) {
            try {
              const cacheNames =
                await window.caches.keys();

              await Promise.all(
                cacheNames
                  .filter((name) =>
                    name
                      .toLowerCase()
                      .includes("brewed")
                  )
                  .map((name) =>
                    window.caches.delete(name)
                  )
              );
            } catch (error) {
              console.warn(
                "Unable to clear browser cache:",
                error
              );
            }
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

  const performNavigation = useCallback(
    (page) => {
      setLeaving(true);
      setConfirmOpen(false);
      setPage(page);
    },
    [setPage]
  );

  const requestNavigation = useCallback(
    (page) => {
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
        onConfirm: () => performNavigation(page),
      });

      setConfirmOpen(true);
    },
    [
      saving,
      leaving,
      hasChanges,
      setPage,
      performNavigation,
    ]
  );

  /*
   * =========================================================
   * LOADING
   * =========================================================
   */

  if (preferencesLoading) {
    return (
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
    );
  }

  return (
    <>
      <main className="settings-page">
        <div className="settings-container">

          {/* BACK */}

          <button
            type="button"
            className="settings-back-btn"
            onClick={() =>
              requestNavigation("menu")
            }
            disabled={saving || leaving}
            aria-label="Go back to menu"
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>

          {/* HEADER */}

          <header className="settings-header">
            <h1 className="settings-title">
              Settings
            </h1>

            <p className="settings-subtitle">
              Personalize your Brewed experience.
            </p>
          </header>

          {/* PREFERENCES */}

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
                  notifications ? "active" : ""
                }`}
                role="switch"
                aria-checked={notifications}
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

            {/* Dark Theme */}

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
                  darkMode ? "active" : ""
                }`}
                role="switch"
                aria-checked={darkMode}
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
                  reduceMotion ? "active" : ""
                }`}
                role="switch"
                aria-checked={reduceMotion}
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

          {/* PRIVACY */}

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
                requestNavigation("privacy")
              }
              disabled={saving || leaving}
            >
              <span className="settings-link-left">
                <Shield
                  size={19}
                  className="settings-icon"
                  aria-hidden="true"
                />

                <span>Privacy Policy</span>
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
                requestNavigation("terms")
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

                <span>Clear Cache</span>
              </span>

              <ChevronRight
                size={18}
                className="settings-link-chevron"
                aria-hidden="true"
              />
            </button>
          </section>

          {/* ACCOUNT */}

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
                requestNavigation(
                  "change-password"
                )
              }
              disabled={saving || leaving}
            >
              <span className="settings-link-left">
                <KeyRound
                  size={19}
                  className="settings-icon"
                  aria-hidden="true"
                />

                <span>Change Password</span>
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
                requestNavigation(
                  "deleteAccount"
                )
              }
              disabled={saving || leaving}
            >
              <span className="settings-link-left">
                <Trash2
                  size={19}
                  className="settings-icon"
                  aria-hidden="true"
                />

                <span>Delete Account</span>
              </span>

              <ChevronRight
                size={18}
                className="settings-link-chevron"
                aria-hidden="true"
              />
            </button>
          </section>

          {/* ABOUT */}

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

          {/* ACTIONS */}

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
      </main>

      {/* CONFIRMATION MODAL */}

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

      {/* TOAST */}

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
