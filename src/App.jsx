import { useState } from "react";
import { CartProvider } from "./context/CartContext";
import { AuthProvider } from "./context/AuthContext";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import MenuPage from "./pages/MenuPage";
import ProductPage from "./pages/ProductPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import Login from "./pages/login";
import ProfilePage from "./pages/ProfilePage";
import OrdersPage from "./pages/OrdersPage";
import RewardsPage from "./pages/RewardsPage";
import FavoritesPage from "./pages/FavoritesPage";
import NotificationsPage from "./pages/NotificationsPage";

export default function App() {
  const [page, setPage] = useState("menu");
  const [selectedProduct, setSelectedProduct] = useState(null);

  const hideNavbarPages = [
    "login",
    "profile",
    "orders",
    "favorites",
    "rewards",
    "notifications",
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
            setPage={setPage}
          />
        )}

        {page === "menu" && (
          <MenuPage
            setPage={setPage}
            setSelectedProduct={setSelectedProduct}
          />
        )}

        {page === "product" && (
          <ProductPage
            setPage={setPage}
            product={selectedProduct}
          />
        )}

        {page === "cart" && (
          <CartPage setPage={setPage} />
        )}

        {page === "checkout" && (
          <CheckoutPage setPage={setPage} />
        )}

        {page === "login" && (
          <Login setPage={setPage} />
        )}

        {page === "profile" && (
          <ProfilePage setPage={setPage} />
        )}

        {page === "orders" && (
          <OrdersPage setPage={setPage} />
        )}

        {page === "rewards" && (
          <RewardsPage setPage={setPage} />
        )}

        {page === "favorites" && (
          <FavoritesPage setPage={setPage} />
        )}

        {page === "notifications" && (
          <NotificationsPage setPage={setPage} />
        )}

        <Footer />
      </AuthProvider>
    </CartProvider>
  );
}
