import { useState } from "react";

import { CartProvider } from "./context/CartContext";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

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
import RewardsPage from "./pages/RewardsPage";
import FavoritesPage from "./pages/FavoritesPage";
import NotificationsPage from "./pages/NotificationsPage";
import SettingsPage from "./pages/SettingsPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsPage from "./pages/TermsPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import DeleteAccountPage from "./pages/DeleteAccountPage";
import AdminPage from "./pages/AdminPage";
import CouponsAdminPage from "./pages/CouponsAdminPage";
import ReservationPage from "./pages/ReservationPage";
import CustomersAdminPage from "./pages/CustomersAdminPage";
import SettingsAdminPage from "./pages/SettingsAdminPage";
import MenuMigration from "./pages/MenuMigration";






export default function App() {
  const [page, setPage] = useState("menu");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null); 

  const navigateTo = (nextPage, orderSnapshot = null) => {
    if (orderSnapshot) {
      setActiveOrder(orderSnapshot);
    } else if (nextPage === "menu") {
      setActiveOrder(null);
    }
    setPage(nextPage);
  };

  const hideNavbarPages = [
    "login",
    "profile",
    "orders",
    "favorites",
    "cart",
    "checkout",
    "product",
    "rewards",
    "notifications",
    "tracking", 
    "settings",
    "privacy",
    "terms",
    "change-password",
    "deleteAccount",
    "admin",
    "couponsadmin",
    "customersadmin",
    "reservation",
    "settingsAdmin",
  ];

  return (
    <ThemeProvider>
      <CartProvider>
        <AuthProvider>
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap');
            :root {
              --bg:#fcfcfc;
              --surface:#ffffff;
              --text:#1a1a1a;
              --muted:#8a8a8a;
              --border:#eeeeee;
              --button-bg:#1a1a1a;
              --button-text:#ffffff;
              --accent:#C4956A;
            }

            html.dark {
              --bg:#121212;
              --surface:#1e1e1e;
              --text:#f5f5f5;
              --muted:#b8b8b8;
              --border:#333333;
              --button-bg:#f5f5f5;
              --button-text:#121212;
              --accent:#D6A878;
            }

            *{
              margin:0;
              padding:0;
              box-sizing:border-box;
            }

            html,body{
              background:var(--bg);
              color:var(--text);
            }

            button:hover{
              opacity:.88;
            }
          `}</style>

          {!hideNavbarPages.includes(page) && (
            <Navbar
              currentPage={page}
              setPage={navigateTo}
            />
          )}




          
          {page === "menu" && (
            <MenuPage
              setPage={navigateTo}
              setSelectedProduct={setSelectedProduct}
            />
          )}


          

          <MenuMigration/>

          {page === "product" && (
            <ProductPage
              setPage={navigateTo}
              product={selectedProduct}
            />
          )}

          {page === "cart" && (
            <CartPage setPage={navigateTo} />
          )}

          {page === "checkout" && (
            <CheckoutPage setPage={navigateTo} />
          )}

          {page === "tracking" && (
            <TrackingPage 
              setPage={navigateTo} 
              orderSnapshot={activeOrder}
              setSideOrderItem={setActiveOrder} 
            />
          )}

          {page === "login" && (
            <Login setPage={navigateTo} />
          )}

          {page === "profile" && (
            <ProfilePage setPage={navigateTo} />
          )}

          {page === "orders" && (
            <OrdersPage setPage={navigateTo} />
          )}

          {page === "rewards" && (
            <RewardsPage setPage={navigateTo} />
          )}

          {page === "favorites" && (
            <FavoritesPage setPage={navigateTo} />
          )}
          
          {page === "notifications" && (
            <NotificationsPage setPage={navigateTo} />
          )}

          {page === "settings" && (
            <SettingsPage setPage={navigateTo} />
          )}

          {page === "reservation" && (
            <ReservationPage setPage={navigateTo} />
          )}
          
          {page === "privacy" && (
            <PrivacyPolicyPage setPage={navigateTo} />
          )}

          {page === "terms" && (
            <TermsPage setPage={navigateTo} />
          )}

          {page === "change-password" && (
            <ChangePasswordPage setPage={navigateTo} />
          )}
      
          {page === "deleteAccount" && (
            <DeleteAccountPage setPage={navigateTo} />
          )}

          {page === "admin" && (
            <AdminPage setPage={navigateTo} />
          )}

          {page === "couponsadmin" && (
            <CouponsAdminPage setPage={navigateTo} />
          )}
          {page === "customersadmin" && (
            <CustomersAdminPage setPage={navigateTo} />
          )}

          {page === "settingsAdmin" && (
            <SettingsAdminPage setPage={navigateTo} />
          )}
          
          <Footer />
        </AuthProvider>
      </CartProvider>
    </ThemeProvider>
  );
}
