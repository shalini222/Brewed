import React from 'react';
import { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext"; 
import { Bell } from "lucide-react";

export default function HeadlessNavbar({ currentPage, setPage }) {
  const { currentUser, isAdmin } = useAuth();
  const { count } = useCart(); 
  const [showMenu, setShowMenu] = useState(false);

  async function handleLogout() {
    await signOut(auth);
    setShowMenu(false);
    setPage("menu");
  }
  
  return (
    <>
      <style>{`
        /* --- Headless Overlay Architecture --- */
        .headless-header {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem 2rem;
          background: transparent;
          z-index: 100;
          box-sizing: border-box;
        }

        .brand-logo {
          font-family: 'Playfair Display', serif;
          font-size: 1.6rem;
          font-weight: 700;
          color: #FDFAF5;
          cursor: pointer;
          user-select: none;
          letter-spacing: -0.02em;
          transition: opacity 0.2s ease;
        }

        .brand-logo:hover {
          opacity: 0.9;
        }

        .nav-icons-group {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }

        .nav-icon-btn {
          background: transparent;
          border: none;
          color: #FDFAF5;
          cursor: pointer;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          transition: all 0.2s ease;
        }

        .nav-icon-btn:hover {
          color: #C4956A;
          background-color: rgba(253, 250, 245, 0.08);
        }

        .nav-icon-btn.active {
          color: #C4956A;
          background-color: rgba(253, 250, 245, 0.05);
        }

        .notification-dot {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #C4956A;
          border: 2px solid #3B1A08;
        }

        /* Fixed palette alignment mapping values */
        .nav-cart-badge {
          position: absolute;
          top: 2px;
          right: 2px;
          background-color: #C4956A; 
          color: #3B1A08;            
          font-family: 'Inter', sans-serif;
          font-size: 0.65rem;
          font-weight: 700;
          min-width: 16px;
          height: 16px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #3B1A08; 
        }

        /* Relative anchor prevents mobile overflow layouts */
        .account-menu-container {
          position: relative;
        }

        .profile-menu {
          position: absolute;
          top: 50px;
          right: 0;
          width: 240px;
          background: #FDFAF5;
          border-radius: 16px;
          box-shadow: 0 15px 40px rgba(59, 26, 8, 0.15);
          border: 1px solid rgba(59, 26, 8, 0.06);
          overflow: hidden;
          z-index: 999;
        }

        .profile-header {
          padding: 16px 18px;
          border-bottom: 1px solid rgba(59, 26, 8, 0.06);
          display: flex;
          flex-direction: column;
        }

        .profile-header strong {
          color: #3B1A08;
          font-size: 14px;
        }

        .profile-header small {
          margin-top: 4px;
          color: #7A726C;
          font-size: 12px;
          word-break: break-all;
        }

        .profile-menu button {
          width: 100%;
          background: none;
          border: none;
          padding: 12px 18px;
          text-align: left;
          cursor: pointer;
          font-size: 14px;
          color: #3B342F;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: background 0.15s ease;
        }

        .profile-menu button:hover {
          background: #F5EFE7;
          color: #3B1A08;
        }

        .profile-menu hr {
          border: none;
          border-top: 1px solid rgba(59, 26, 8, 0.06);
          margin: 4px 0;
        }

        @media (max-width: 768px) {
          .headless-header {
            padding: 1.25rem 1rem;
          }
          .nav-icons-group {
            gap: 0.5rem;
          }
        }
      `}</style>

      <header className="headless-header">
        <div className="brand-logo" onClick={() => setPage("menu")}>
          Brewed.
        </div>

        <div className="nav-icons-group">
          {/* Notification Button */}
          <button
            className={`nav-icon-btn ${currentPage === "notifications" ? "active" : ""}`}
            onClick={() => setPage("notifications")}
            title="Notifications"
          >
            <Bell size={20} strokeWidth={1.8} />
            <span className="notification-dot"></span>
          </button>

          {/* Location Map Pin Button */}
          <button
            className={`nav-icon-btn ${currentPage === "locator" ? "active" : ""}`}
            onClick={() => setPage("locator")}
            title="Café Locator"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </button>

          {/* Account Profile Button with Safe Container Wrapper */}
          <div className="account-menu-container">
            <button
              className={`nav-icon-btn ${currentPage === "login" || currentPage === "profile" ? "active" : ""}`}
              onClick={() => {
                if (currentUser) {
                  setShowMenu(!showMenu);
                } else {
                  setPage("login");
                }
              }}
              title="Account Options"
            >
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt="profile avatar"
                  style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              )}
            </button>
            
            {currentUser && showMenu && (
              <div className="profile-menu">
                <div className="profile-header">
                  <strong>👋 Hi, {currentUser.displayName || currentUser.email.split("@")[0]}</strong>
                  <small>{currentUser.email}</small>
                </div>

                <button onClick={() => { setShowMenu(false); setPage("profile"); }}>
                  <span>👤</span> Profile
                </button>

                <button onClick={() => { setShowMenu(false); setPage("orders"); }}>
                  <span>☕</span> My Orders
                </button>

                <button onClick={() => { setShowMenu(false); setPage("favorites"); }}>
                  <span>❤️</span> Favorites
                </button>

                <button onClick={() => { setShowMenu(false); setPage("reservation"); }}>
                  <span>🗓️</span> Reservation
                </button>

                <button onClick={() => { setShowMenu(false); setPage("rewards"); }}>
                  <span>⭐</span> Rewards
                </button>

                <button onClick={() => { setShowMenu(false); setPage("settings"); }}>
                  <span>⚙️</span> Settings
                </button>
                
                {isAdmin && (
                  <>
                    <hr />
                    <button onClick={() => { setShowMenu(false); setPage("admin"); }} style={{ fontWeight: "600", color: "#4F46E5" }}>
                      <span>🛠️</span> Admin Panel
                    </button>
                  </>
                )}

                <hr />    
                <button onClick={handleLogout} style={{ color: "#C62828" }}>
                  <span>🚪</span> Logout
                </button>
              </div>
            )}
          </div>

          {/* Cart Bag Button */}
          <button
            className={`nav-icon-btn ${currentPage === "cart" ? "active" : ""}`}
            onClick={() => setPage("cart")}
            title="View Cart"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
              <path d="M3 6h18M16 10a4 4 0 0 1-8 0"/>
            </svg>

            {count > 0 && (
              <span className="nav-cart-badge">
                {count}
              </span>
            )}
          </button>

        </div>
      </header>
    </>
  );
}
