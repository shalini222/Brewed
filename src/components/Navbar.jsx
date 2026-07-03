import React from 'react';
import { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";

async function handleLogout() {
  await signOut(auth);
  setShowMenu(false);
  setPage("menu");
}

export default function HeadlessNavbar({ currentPage, setPage, cartItemCount = 0 }) {

const { currentUser } = useAuth();

const [showMenu, setShowMenu] = useState(false);
  
  return (
    <>
      <style>{`
        /* --- True Headless Overlay Architecture --- */
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
          padding: 0.5rem;
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

        .nav-bag-btn {
          padding-right: 0.2rem;
        }

        .nav-cart-badge {
          position: absolute;
          top: -1px;
          right: -1px;
          background-color: #C4956A;
          color: #1A0A00;
          font-family: 'Inter', sans-serif;
          font-size: 0.68rem;
          font-weight: 700;
          min-width: 15px;
          height: 15px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 3px;
          border: 1px solid #3B1A08;
        }

        @media (max-width: 768px) {
          .headless-header {
            padding: 1.25rem 1rem;
          }

          .nav-icons-group {
            gap: 0.85rem;
          }
        }
        .profile-menu{
  position:absolute;
  top:55px;
  right:0;
  width:250px;
  background:#FDFAF5;
  border-radius:16px;
  box-shadow:0 15px 40px rgba(0,0,0,.18);
  overflow:hidden;
  z-index:999;
}

.profile-header{
  padding:18px;
  border-bottom:1px solid #eee;
  display:flex;
  flex-direction:column;
}

.profile-header small{
  margin-top:5px;
  color:#777;
}

.profile-menu button{
  width:100%;
  background:none;
  border:none;
  padding:15px 18px;
  text-align:left;
  cursor:pointer;
  font-size:15px;
}

.profile-menu button:hover{
  background:#F5EFE7;
}
      `}</style>

      <header className="headless-header">
        <div className="brand-logo" onClick={() => setPage("menu")}>
          Brewed.
        </div>

        <div className="nav-icons-group">

          {/* Location */}
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

          {/* Login */}
          <button
  className={`nav-icon-btn ${currentPage === "login" ? "active" : ""}`}
  onClick={() => {
    if (currentUser) {
      setShowMenu(!showMenu);
    } else {
      setPage("login");
    }
  }}
  title="Account"
>
  {currentUser?.photoURL ? (
    <img
      src={currentUser.photoURL}
      alt="profile"
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        objectFit: "cover",
      }}
    />
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )}
</button>
          {currentUser && showMenu && (
  <div className="profile-menu">

    <div className="profile-header">
      <strong>
        👋 Hi, {currentUser.displayName || currentUser.email.split("@")[0]}
      </strong>

      <small>{currentUser.email}</small>
    </div>

    <button
  onClick={() => {
    setShowMenu(false);
    setPage("profile");
  }}
>
  👤 Profile
</button>

    <button
  onClick={() => {
    setShowMenu(false);
    setPage("orders");
  }}
>
  ☕ My Orders
</button>

    <button onClick={() => setPage("favorites")}>
      ❤️ Favorites
    </button>

    
<button
  onClick={() => {
    setShowMenu(false);
    setPage("rewards");
  }}
>
  ⭐ Rewards
</button>
    <hr />

    <button onClick={handleLogout}>
      🚪 Logout
    </button>

  </div>
)}

          {/* Cart */}
          <button
            className={`nav-icon-btn nav-bag-btn ${currentPage === "cart" ? "active" : ""}`}
            onClick={() => setPage("cart")}
            title="View Cart"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
              <path d="M3 6h18M16 10a4 4 0 0 1-8 0"/>
            </svg>

            {cartItemCount > 0 && (
              <span className="nav-cart-badge">
                {cartItemCount}
              </span>
            )}
          </button>

        </div>
      </header>
    </>
  );
}
