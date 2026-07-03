import { useState } from "react";
import { CartProvider } from "./context/CartContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import MenuPage from "./pages/MenuPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import Login from "./pages/login";
import { AuthProvider } from "./context/AuthContext";

export default function App() {
  const [page, setPage] = useState("menu");

  return (
    <CartProvider>
      <AuthProvider>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap');
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          background: #FDFAF5;
        }
        button:hover {
          opacity: 0.88;
        }
      `}</style>

      <Navbar
        currentPage={page}
        setPage={setPage}
      />

      {page === "menu" && <MenuPage />}
      {page === "cart" && <CartPage setPage={setPage} />}
      {page === "checkout" && <CheckoutPage setPage={setPage} />}
      {page === "login" && <Login setPage={setPage} />}

      <Footer />
      </AuthProvider>
    </CartProvider>
  );
}
