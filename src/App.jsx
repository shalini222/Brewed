import { useState } from "react";

import { CartProvider } from "./context/CartContext";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { PreferencesProvider } from "./context/PreferencesContext";



import "./App.css";


import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import MenuPage from "./pages/MenuPage";
import ProductPage from "./pages/ProductPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import TrackingPage from "./pages/TrackingPage";
import Login from "./pages/login";
import ProfilePage from "./pages/ProfilePage";
import OrdersPage from "./pages/OrdersPage";
import LoyaltyPage from "./pages/LoyaltyPage";
import FavoritesPage from "./pages/FavoritesPage";
import NotificationsPage from "./pages/NotificationsPage";
import SettingsPage from "./pages/SettingsPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsPage from "./pages/TermsPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import DeleteAccountPage from "./pages/DeleteAccountPage";
import AdminPage from "./pages/AdminPage";
import ReservationPage from "./pages/ReservationPage";
import SettingsAdminPage from "./pages/SettingsAdminPage";
import AddressPage from "./pages/AddressPage";
import WalletPage from "./pages/WalletPage";
import DeliveryAdminPage from "./admin/DeliveryAdminPage";
import SupportPage from "./pages/SupportPage";

import RiderPage from "./rider/RiderPage";

export default function App() {
  const [page, setPage] = useState("menu");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);

  /*
   * ============================================================
   * NAVIGATION
   * ============================================================
   */

  const navigateTo = (
    nextPage,
    orderSnapshot = null
  ) => {
    if (orderSnapshot) {
      setActiveOrder(orderSnapshot);
    } else if (nextPage === "menu") {
      setActiveOrder(null);
    }

    setPage(nextPage);
  };

  /*
   * ============================================================
   * PAGES WITHOUT NAVBAR
   * ============================================================
   */

  const hideNavbarPages = [
    "login",
    "profile",
    "orders",
    "favorites",
    "cart",
    "checkout",
    "product",
    "loyalty",
    "notifications",
    "tracking",
    "settings",
    "privacy",
    "terms",
    "change-password",
    "deleteAccount",
    "admin",
    "support",
    "reservation",
    "settingsAdmin",
    "address",
    "wallet",
    "rider",
  ];

  /*
   * ============================================================
   * APPLICATION
   * ============================================================
   *
   * IMPORTANT PROVIDER ORDER:
   *
   * AuthProvider
   *      ↓
   * PreferencesProvider
   *      ↓
   * ThemeProvider
   *      ↓
   * CartProvider
   *      ↓
   * Entire application
   *
   * ThemeContext now consumes PreferencesContext, so
   * PreferencesProvider MUST be above ThemeProvider.
   */

  return (
    <AuthProvider>
      <PreferencesProvider>
        <ThemeProvider>
          <CartProvider>

            {/* ==================================================
                GLOBAL BREWED THEME
                ================================================== */}

            <style>{`
              @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap');

              /* =================================================
                 LIGHT THEME
                 ================================================= */

              :root {
                --bg: #fcfcfc;
                --surface: #ffffff;
                --surface-elevated: #ffffff;

                --text: #1a1a1a;
                --muted: #8a8a8a;

                --border: #eeeeee;

                --button-bg: #1a1a1a;
                --button-text: #ffffff;

                --accent: #C4956A;

                --danger: #B42318;
                --success: #218739;

                --shadow: rgba(0, 0, 0, 0.08);
                --overlay: rgba(0, 0, 0, 0.35);

                color-scheme: light;
              }

              /* =================================================
                 DARK THEME
                 
                 PreferencesContext controls:
                 
                 html.dark-mode
                 
                 ================================================= */

              html.dark-mode {
                --bg: #121212;
                --surface: #1e1e1e;
                --surface-elevated: #252525;

                --text: #f5f5f5;
                --muted: #b8b8b8;

                --border: #333333;

                --button-bg: #f5f5f5;
                --button-text: #121212;

                --accent: #D6A878;

                --danger: #ff8177;
                --success: #6fcf80;

                --shadow: rgba(0, 0, 0, 0.35);
                --overlay: rgba(0, 0, 0, 0.65);

                color-scheme: dark;
              }

              /* =================================================
                 GLOBAL RESET
                 ================================================= */

              *,
              *::before,
              *::after {
                box-sizing: border-box;
              }

              html,
              body,
              #root {
                margin: 0;
                padding: 0;
                width: 100%;
                min-height: 100%;
              }

              html {
                background: var(--bg);
                color: var(--text);

                transition:
                  background-color 0.3s ease,
                  color 0.3s ease;
              }

              body {
                background: var(--bg);
                color: var(--text);

                font-family: "Inter", sans-serif;

                transition:
                  background-color 0.3s ease,
                  color 0.3s ease;
              }

              #root {
                min-height: 100vh;

                background: var(--bg);
                color: var(--text);

                transition:
                  background-color 0.3s ease,
                  color 0.3s ease;
              }

              /* =================================================
                 GLOBAL FORM ELEMENTS
                 ================================================= */

              button,
              input,
              textarea,
              select {
                font: inherit;
              }

              button {
                color: inherit;
              }

              /* =================================================
                 LINKS
                 ================================================= */

              a {
                color: inherit;
              }

              /* =================================================
                 TEXT SELECTION
                 ================================================= */

              ::selection {
                background: var(--accent);
                color: #ffffff;
              }

              /* =================================================
                 SCROLLBAR
                 ================================================= */

              html {
                scrollbar-width: thin;
              }

              html:not(.dark-mode) {
                scrollbar-color:
                  #cfc6bc
                  #fcfcfc;
              }

              html.dark-mode {
                scrollbar-color:
                  #4a4039
                  #121212;
              }

              /* =================================================
                 GLOBAL REDUCED MOTION
                 ================================================= */

              html.reduce-motion *,
              html.reduce-motion *::before,
              html.reduce-motion *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
                scroll-behavior: auto !important;
              }

              /* =================================================
                 ACCESSIBILITY
                 ================================================= */

              :focus-visible {
                outline: 2px solid var(--accent);
                outline-offset: 3px;
              }

              /* =================================================
                 BUTTONS
                 ================================================= */

              button {
                -webkit-tap-highlight-color: transparent;
              }

              button:disabled {
                cursor: not-allowed;
              }

              /* =================================================
                 MOBILE
                 ================================================= */

              @media (max-width: 600px) {
                html,
                body {
                  min-width: 320px;
                }
              }
            `}</style>

            {/* ==================================================
                NAVBAR
                ================================================== */}

            {!hideNavbarPages.includes(page) && (
              <Navbar
                currentPage={page}
                setPage={navigateTo}
              />
            )}

            {/* ==================================================
                MENU
                ================================================== */}

            {page === "menu" && (
              <MenuPage
                setPage={navigateTo}
                setSelectedProduct={
                  setSelectedProduct
                }
              />
            )}

            {/* ==================================================
                PRODUCT
                ================================================== */}

            {page === "product" && (
              <ProductPage
                setPage={navigateTo}
                product={selectedProduct}
              />
            )}

            {/* ==================================================
                CART
                ================================================== */}

            {page === "cart" && (
              <CartPage
                setPage={navigateTo}
              />
            )}

            {/* ==================================================
                CHECKOUT
                ================================================== */}

            {page === "checkout" && (
              <CheckoutPage
                setPage={navigateTo}
                orderSnapshot={activeOrder}
              />
            )}

            {/* ==================================================
                TRACKING
                ================================================== */}

            {page === "tracking" && (
              <TrackingPage
                setPage={navigateTo}
                orderSnapshot={activeOrder}
                setSideOrderItem={
                  setActiveOrder
                }
              />
            )}

            {/* ==================================================
                LOGIN
                ================================================== */}

            {page === "login" && (
              <Login
                setPage={navigateTo}
              />
            )}

            {/* ==================================================
                PROFILE
                ================================================== */}

            {page === "profile" && (
              <ProfilePage
                setPage={navigateTo}
              />
            )}

            {/* ==================================================
                ORDERS
                ================================================== */}

            {page === "orders" && (
              <OrdersPage
                setPage={navigateTo}
                setSelectedProduct={
                  setSelectedProduct
                }
              />
            )}

            {/* ==================================================
                LOYALTY
                ================================================== */}

            {page === "loyalty" && (
              <LoyaltyPage
                setPage={navigateTo}
              />
            )}

            {/* ==================================================
                FAVORITES
                ================================================== */}

            {page === "favorites" && (
              <FavoritesPage
                setPage={navigateTo}
                setSelectedProduct={
                  setSelectedProduct
                }
              />
            )}

            {/* ==================================================
                NOTIFICATIONS
                ================================================== */}

            {page === "notifications" && (
              <NotificationsPage
                setPage={navigateTo}
              />
            )}

            {/* ==================================================
                SETTINGS
                ================================================== */}

            {page === "settings" && (
              <SettingsPage
                setPage={navigateTo}
              />
            )}

            {/* ==================================================
                RESERVATION
                ================================================== */}

            {page === "reservation" && (
              <ReservationPage
                setPage={navigateTo}
              />
            )}

            {/* ==================================================
                PRIVACY
                ================================================== */}

            {page === "privacy" && (
              <PrivacyPolicyPage
                setPage={navigateTo}
              />
            )}

            {/* ==================================================
                TERMS
                ================================================== */}

            {page === "terms" && (
              <TermsPage
                setPage={navigateTo}
              />
            )}

            {/* ==================================================
                CHANGE PASSWORD
                ================================================== */}

            {page === "change-password" && (
              <ChangePasswordPage
                setPage={navigateTo}
              />
            )}

            {/* ==================================================
                DELETE ACCOUNT
                ================================================== */}

            {page === "deleteAccount" && (
              <DeleteAccountPage
                setPage={navigateTo}
              />
            )}

            {/* ==================================================
                ADMIN
                ================================================== */}

            {page === "admin" && (
              <AdminPage
                setPage={navigateTo}
              />
            )}

            {/* ==================================================
                DELIVERY ADMIN
                ================================================== */}

            {page === "deliveryAdmin" && (
              <DeliveryAdminPage
                setPage={setPage}
              />
            )}

            {/* ==================================================
                ADMIN SETTINGS
                ================================================== */}

            {page === "settingsAdmin" && (
              <SettingsAdminPage
                setPage={navigateTo}
              />
            )}

            {/* ==================================================
                ADDRESS
                ================================================== */}

            {page === "address" && (
              <AddressPage
                setPage={setPage}
              />
            )}

            {/* ==================================================
                SUPPORT
                ================================================== */}

            {page === "support" && (
              <SupportPage
                setPage={setPage}
              />
            )}

            {/* ==================================================
                WALLET
                ================================================== */}

            {page === "wallet" && (
              <WalletPage
                setPage={setPage}
              />
            )}

            {/* ==================================================
                RIDER
                ================================================== */}

            {page === "rider" && (
              <RiderPage
                setPage={setPage}
              />
            )}

            {/* ==================================================
                FOOTER
                ================================================== */}

            <Footer />

          </CartProvider>
        </ThemeProvider>
      </PreferencesProvider>
    </AuthProvider>
  );
}
