/**
 * BREWED — THEME CONFIGURATION
 *
 * Design tokens used by the global design system.
 *
 * Components and pages should consume semantic tokens
 * rather than hard-coded colours wherever possible.
 */

export const theme = {
  defaultMode: "light",

  modes: {
    light: {
      colors: {
        background: "#FCFCFC",
        backgroundSoft: "#F7F4F0",

        surface: "#FFFFFF",
        surfaceSoft: "#F8F6F3",
        surfaceElevated: "#FFFFFF",

        text: "#1A1A1A",
        textSecondary: "#4F4F4F",
        muted: "#858585",
        mutedLight: "#B5B5B5",

        border: "#EAE7E3",
        borderSoft: "#F1EFEC",

        primary: "#1A1A1A",
        primaryText: "#FFFFFF",

        accent: "#C4956A",
        accentHover: "#AD7E55",
        accentSoft: "#F5ECE4",

        success: "#218739",
        successSoft: "#EDF8EF",

        warning: "#A86B00",
        warningSoft: "#FFF7E5",

        danger: "#B42318",
        dangerSoft: "#FFF0EE",

        info: "#3568A8",
        infoSoft: "#EEF4FB",

        overlay: "rgba(0, 0, 0, 0.42)",
      },

      shadows: {
        sm: "0 2px 10px rgba(0, 0, 0, 0.04)",
        md: "0 8px 24px rgba(0, 0, 0, 0.07)",
        lg: "0 18px 50px rgba(0, 0, 0, 0.12)",
      },
    },

    dark: {
      colors: {
        /*
         * Deliberately NOT pure black.
         *
         * The dark theme uses warm charcoal surfaces so Brewed
         * retains its premium cafe identity instead of looking
         * like a generic developer dark mode.
         */

        background: "#11100F",
        backgroundSoft: "#181614",

        surface: "#1D1A18",
        surfaceSoft: "#24201D",
        surfaceElevated: "#292420",

        text: "#F5F1EC",
        textSecondary: "#D3CCC5",
        muted: "#A69E96",
        mutedLight: "#7F7871",

        border: "#35302C",
        borderSoft: "#2A2623",

        primary: "#F5F1EC",
        primaryText: "#171513",

        accent: "#D6A878",
        accentHover: "#E2B98E",
        accentSoft: "#34291F",

        success: "#72C982",
        successSoft: "#1B3021",

        warning: "#E2B45D",
        warningSoft: "#332A18",

        danger: "#F17D73",
        dangerSoft: "#351C1A",

        info: "#82A9D6",
        infoSoft: "#1D2938",

        overlay: "rgba(0, 0, 0, 0.68)",
      },

      shadows: {
        sm: "0 3px 12px rgba(0, 0, 0, 0.22)",
        md: "0 10px 28px rgba(0, 0, 0, 0.32)",
        lg: "0 20px 55px rgba(0, 0, 0, 0.48)",
      },
    },
  },

  radius: {
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "20px",
    xxl: "24px",
    pill: "999px",
  },

  spacing: {
    pageX: "6%",
    pageXMobile: "5%",

    section: "48px",
    sectionMobile: "32px",

    card: "22px",
    cardMobile: "18px",
  },

  layout: {
    contentMaxWidth: "1100px",
    narrowMaxWidth: "720px",
    modalMaxWidth: "440px",
    sidebarMaxWidth: "380px",
  },

  motion: {
    fast: "0.15s",
    normal: "0.25s",
    slow: "0.3s",

    easing: "ease",
  },
};

export default theme;
