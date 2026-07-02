import React from 'react';

export default function HeadlessNavbar({ currentPage, setPage, cartItemCount = 0 }) {
  return (
    <>
      <style>{`
        /* --- Clean Transparent/Headless Header Layout --- */
        .headless-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 2rem;
          background: transparent; /* No blocky solid background panels */
          border: none;             /* Completely eliminates distracting panel seams */
          max-width: 1200px;
          margin: 0 auto;
          box-sizing: border-box;
        }

        .brand-logo {
          font-family: 'Playfair Display', serif;
          font-size: 1.5rem;
          font-weight: 700;
          color: #1A0A00;
          cursor: pointer;
          user-select: none;
          letter-spacing: -0.02em;
        }

        .nav-icons-group {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }

        .nav-icon-btn {
          background: transparent;
          border: none;
          color: #3B1A08;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .nav-icon-btn:hover {
          color: #C4956A;
          background-color: rgba(196, 149, 106, 0.08);
        }

        .nav-icon-btn.active {
          color: #C4956A;
          background-color: rgba(26, 10, 0, 0.04);
        }

        .nav-bag-btn {
          padding-right: 0.2rem;
        }

        .nav-cart-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          background-color: #1A0A00;
          color: #FDFAF5;
          font-family: 'Inter', sans-serif;
          font-size: 0.7rem;
          font-weight: 600;
          min-width: 16px;
          height: 16px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          border: 1.5px solid #FDFAF5;
        }

        @media (max-width: 768px) {
          .headless-header {
            padding: 1rem;
          }
          .nav-icons-group {
            gap: 0.85rem;
          }
        }
      `}</style>

      <header className="headless-header">
        {/* Brand identity anchor aligned to the left */}
        <div className="brand-logo" onClick={() => setPage("menu")}>
          Brewed.
        </div>

        {/* Headless interactive controls grouped cleanly to the right */}
        <div className="nav-icons-group">
          
          {/* Location Pin */}
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

          {/* Profile / Account Access - Direct link to your login view */}
          <button 
            className={`nav-icon-btn ${currentPage === "login" ? "active" : ""}`}
            onClick={() => setPage("login")}
            title="Account Login"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </button>

          {/* Shopping Bag */}
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
              <span className="nav-cart-badge">{cartItemCount}</span>
            )}
          </button>

        </div>
      </header>
    </>
  );
}
