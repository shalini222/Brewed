import { useState } from "react";
import { CartProvider } from "./context/CartContext";
import { AuthProvider } from "./context/AuthContext";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import MenuPage from "./pages/MenuPage";
import ProductPage from "./pages/ProductPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import TrackingPage from "./pages/TrackingPage"; // Added Tracking Import
import Login from "./pages/login";
import ProfilePage from "./pages/ProfilePage";
import OrdersPage from "./pages/OrdersPage";
import RewardsPage from "./pages/RewardsPage";
import FavoritesPage from "./pages/FavoritesPage";
import NotificationsPage from "./pages/NotificationsPage";

export default function App() {
  const [page, setPage] = useState("menu");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null); // Holds the payload for tracking locks

  // Unified routing handler to catch tracking data from Checkout
  const navigateTo = (nextPage, orderSnapshot = null) => {
    if (orderSnapshot) {
      setActiveOrder(orderSnapshot);
    }
    setPage(nextPage);
  };

  const hideNavbarPages = [
    "login",
    "profile",
    "orders",
    "favorites",
    "rewards",
    "notifications",
    "tracking", // Hidden navbar from tracking to maximize clarity
  ];

  return (
    <CartProvider>
      <AuthProvider>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap');

          *{
            margin:0;
            padding:0;
            box-sizing:border-box;
          }

          body{
            background:#FDFAF5;
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

        {/* Realtime Protected Tracking Stage */}
        {page === "tracking" && (
          <TrackingPage 
            setPage={navigateTo} 
            orderSnapshot={activeOrder} 
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

        <Footer />
      </AuthProvider>
    </CartProvider>
  );
}
