import { useState } from "react";
import { useCart } from "../context/CartContext";

export default function Navbar() {
  const { cart } = useCart();
  
  // Calculate total items currently inside the shopping cart
  const cartItemCount = cart ? cart.reduce((total, item) => total + (item.quantity || 1), 0) : 0;

  return (
    <>
      <style>{`
        .navbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #1A0A00; /* Deep rich espresso background */
          padding: 0.75rem 2rem;
          position: sticky;
          top: 0;
          z-index: 100;
          border-bottom: 1px solid #3B1A08;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }
        
        .nav-logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-family: 'Playfair Display', serif;
          font-size: 1.35rem;
          font-weight: 700;
          color: #FDFAF5;
          text-decoration: none;
          cursor: pointer;
          letter-spacing: 0.05em;
        }

        .nav-logo span {
          color: #C4956A; /* Warm caramel accent */
        }

        .nav-actions {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }

        /* Sleek Minimalist Icon Buttons */
        .nav-icon-btn {
          background: transparent;
          border: none;
          color: #C4956A;
          cursor: pointer;
          padding: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.2s ease;
          position: relative;
          text-decoration: none;
        }

        .nav-icon-btn:hover {
          color: #FDFAF5;
          background: rgba(196, 149, 106, 0.12);
          transform: translateY(-1px);
        }

        /* Dynamic Cart Badge */
        .cart-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          background: #C4956A;
          color: #1A0A00;
          font-family: 'Inter', sans-serif;
          font-size: 0.68rem;
          font-weight: 700;
          min-width: 16px;
          height: 16px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          border: 1.5px solid #1A0A00;
        }

        /* Tooltip style on hover for clarity */
        .nav-icon-btn::after {
          content: attr(data-tooltip);
          position: absolute;
          bottom: -32px;
          left: 50%;
          transform: translateX(-50%) scale(0.85);
          background: #3B1A08;
          color: #FDFAF5;
          font-family: 'Inter', sans-serif;
          font-size: 0.7rem;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: all 0.15s ease;
          border: 1px solid #5C2E0E;
        }

        .nav-icon-btn:hover::after {
          opacity: 1;
          transform: translateX(-50%) scale(1);
        }

        @media (max-width: 768px) {
          .navbar {
            padding: 0.75rem 1rem;
          }
          .nav-actions {
            gap: 0.75rem;
          }
        }
      `}</style>

      <nav className="navbar">
        {/* Logo brand configuration */}
        <a href="#" className="nav-logo">
          ☕ Brewed<span>.</span>
        </a>

        {/* Action icons row */}
        <div className="nav-actions">
          
          {/* 1. Menu Icon */}
          <button className="nav-icon-btn" data-tooltip="View Menu">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12h18M3 6h18M3 18h18"/>
            </svg>
          </button>

          {/* 2. Store Locator Icon */}
          <button className="nav-icon-btn" data-tooltip="Find a Café">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </button>

          {/* 3. Order History Icon */}
          <button className="nav-icon-btn" data-tooltip="Order History">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 8v4l3 3"/>
              <circle cx="12" cy="12" r="9"/>
            </svg>
          </button>

          {/* 4. Login / Profile Icon */}
          <button className="nav-icon-btn" data-tooltip="Account">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </button>

          {/* 5. Cart Icon with Dynamic Count Badge */}
          <button className="nav-icon-btn" data-tooltip="Shopping Cart">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
              <path d="M3 6h18M16 10a4 4 0 0 1-8 0"/>
            </svg>
            {cartItemCount > 0 && (
              <div className="cart-badge">{cartItemCount}</div>
            )}
          </button>

        </div>
      </nav>
    </>
  );
}
