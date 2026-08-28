import React, { useState } from "react";
import { signOut } from "firebase/auth";
import { Bell, MapPin, User, ShoppingBag } from "lucide-react";

import { auth } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";

export default function Navbar({ currentPage, setPage }) {
  const { currentUser, isAdmin } = useAuth();
  const { count } = useCart();

  const [showMenu, setShowMenu] = useState(false);

  const navigate = (page) => {
    setShowMenu(false);
    setPage(page);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setShowMenu(false);
      setPage("menu");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const isActive = (page) => currentPage === page;

  return (
    <header className="navbar">
      {/* Brand */}
      <button
        type="button"
        className="navbar-brand"
        onClick={() => navigate("menu")}
        aria-label="Go to Brewed menu"
      >
        Brewed.
      </button>

      {/* Navigation Actions */}
      <nav className="navbar-actions" aria-label="Main navigation">
        {/* Notifications */}
        <button
          type="button"
          className={`navbar-icon-btn ${
            isActive("notifications") ? "active" : ""
          }`}
          onClick={() => navigate("notifications")}
          title="Notifications"
          aria-label="Notifications"
          aria-current={isActive("notifications") ? "page" : undefined}
        >
          <Bell size={20} strokeWidth={1.8} />
          <span
            className="navbar-notification-dot"
            aria-hidden="true"
          />
        </button>

        {/* Café Locator */}
        <button
          type="button"
          className={`navbar-icon-btn ${
            isActive("locator") ? "active" : ""
          }`}
          onClick={() => navigate("locator")}
          title="Café Locator"
          aria-label="Café Locator"
          aria-current={isActive("locator") ? "page" : undefined}
        >
          <MapPin size={20} strokeWidth={1.8} />
        </button>

        {/* Account */}
        <div className="navbar-account">
          <button
            type="button"
            className={`navbar-icon-btn ${
              isActive("login") || isActive("profile") ? "active" : ""
            }`}
            onClick={() => {
              if (currentUser) {
                setShowMenu((previous) => !previous);
              } else {
                navigate("login");
              }
            }}
            title="Account Options"
            aria-label="Account Options"
            aria-expanded={currentUser ? showMenu : undefined}
            aria-haspopup={currentUser ? "menu" : undefined}
          >
            {currentUser?.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt=""
                className="navbar-avatar"
              />
            ) : (
              <User size={20} strokeWidth={1.8} />
            )}
          </button>

          {/* Account Menu */}
          {currentUser && showMenu && (
            <div className="navbar-profile-menu" role="menu">
              <div className="navbar-profile-header">
                <strong>
                  👋 Hi,{" "}
                  {currentUser.displayName ||
                    currentUser.email?.split("@")[0] ||
                    "there"}
                </strong>

                <small>{currentUser.email}</small>
              </div>

              <button
                type="button"
                className="navbar-menu-item"
                onClick={() => navigate("profile")}
                role="menuitem"
              >
                <span aria-hidden="true">👤</span>
                <span>Profile</span>
              </button>

              <button
                type="button"
                className="navbar-menu-item"
                onClick={() => navigate("orders")}
                role="menuitem"
              >
                <span aria-hidden="true">☕</span>
                <span>My Orders</span>
              </button>

              <button
                type="button"
                className="navbar-menu-item"
                onClick={() => navigate("favorites")}
                role="menuitem"
              >
                <span aria-hidden="true">❤️</span>
                <span>Favorites</span>
              </button>

              <button
                type="button"
                className="navbar-menu-item"
                onClick={() => navigate("loyalty")}
                role="menuitem"
              >
                <span aria-hidden="true">⭐</span>
                <span>Loyalty Program</span>
              </button>

              <button
                type="button"
                className="navbar-menu-item"
                onClick={() => navigate("wallet")}
                role="menuitem"
              >
                <span aria-hidden="true">👛</span>
                <span>Wallet</span>
              </button>

              <button
                type="button"
                className="navbar-menu-item"
                onClick={() => navigate("address")}
                role="menuitem"
              >
                <span aria-hidden="true">🏠</span>
                <span>My Addresses</span>
              </button>

              <button
                type="button"
                className="navbar-menu-item"
                onClick={() => navigate("support")}
                role="menuitem"
              >
                <span aria-hidden="true">📞</span>
                <span>Support</span>
              </button>

              <button
                type="button"
                className="navbar-menu-item"
                onClick={() => navigate("settings")}
                role="menuitem"
              >
                <span aria-hidden="true">⚙️</span>
                <span>Settings</span>
              </button>

              {/* Admin */}
              {isAdmin && (
                <>
                  <div className="navbar-menu-divider" />

                  <button
                    type="button"
                    className="navbar-menu-item navbar-admin-link"
                    onClick={() => navigate("admin")}
                    role="menuitem"
                  >
                    <span aria-hidden="true">🛠️</span>
                    <span>Admin Panel</span>
                  </button>
                </>
              )}

              {/* Logout */}
              <div className="navbar-menu-divider" />

              <button
                type="button"
                className="navbar-menu-item navbar-logout-link"
                onClick={handleLogout}
                role="menuitem"
              >
                <span aria-hidden="true">🚪</span>
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>

        {/* Cart */}
        <button
          type="button"
          className={`navbar-icon-btn ${
            isActive("cart") ? "active" : ""
          }`}
          onClick={() => navigate("cart")}
          title="View Cart"
          aria-label={`View cart${count > 0 ? `, ${count} items` : ""}`}
          aria-current={isActive("cart") ? "page" : undefined}
        >
          <ShoppingBag size={20} strokeWidth={1.8} />

          {count > 0 && (
            <span className="navbar-cart-badge" aria-label={`${count} items`}>
              {count > 99 ? "99+" : count}
            </span>
          )}
        </button>
      </nav>
    </header>
  );
}
