import { useCart } from "../context/CartContext";

export default function Navbar({ setPage, currentPage }) {
  const { cart = [] } = useCart();
  
  // Calculate clean total items in the cart
  const cartItemCount = cart.reduce((total, item) => total + (item.qty || 1), 0);

  return (
    <>
      <style>{`
        .nav-container {
          background: #FDFAF5; /* Soft, premium off-white canvas */
          border-bottom: 1px solid #E8E0D5; /* Subtle earthy line border */
          position: sticky;
          top: 0;
          z-index: 1000;
          padding: 1rem 2.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .nav-brand {
          font-family: 'Playfair Display', serif;
          font-size: 1.4rem;
          font-weight: 700;
          color: #1A0A00;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          letter-spacing: -0.02em;
        }

        .nav-brand span {
          color: #C4956A;
        }

        .nav-links-group {
          display: flex;
          align-items: center;
          gap: 2rem;
        }

        /* Sleek minimalist text navigation buttons */
        .nav-text-link {
          background: none;
          border: none;
          font-family: 'Inter', sans-serif;
          font-size: 0.85rem;
          font-weight: 500;
          color: #7A6658; /* Muted taupe color */
          cursor: pointer;
          padding: 0.25rem 0;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          transition: color 0.2s ease;
          position: relative;
        }

        .nav-text-link:hover, .nav-text-link.active {
          color: #1A0A00; /* Dark contrast accent on hover/active state */
        }

        /* Subtle underline effect for the active page view */
        .nav-text-link.active::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 0;
          width: 100%;
          height: 1.5px;
          background: #C4956A;
        }

        .nav-utility-group {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          border-left: 1px solid #E8E0D5;
          padding-left: 1.5rem;
        }

        /* Pure minimalist outline icons */
        .nav-utility-btn {
          background: none;
          border: none;
          color: #7A6658;
          cursor: pointer;
          padding: 0.4rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s ease;
          position: relative;
        }

        .nav-utility-btn:hover {
          color: #1A0A00;
        }

        /* Clean modern floating text cart badge */
        .nav-cart-count {
          font-family: 'Inter', sans-serif;
          font-size: 0.75rem;
          font-weight: 600;
          color: #C4956A;
          margin-left: 0.25rem;
        }

        @media (max-width: 768px) {
          .nav-container {
            padding: 1rem 1.5rem;
          }
          .nav-links-group {
            gap: 1.25rem;
          }
          .nav-utility-group {
            padding-left: 1rem;
            gap: 1rem;
          }
          .hide-mobile {
            display: none;
          }
        }
      `}</style>

      <nav className="nav-container">
        {/* Simple typography branding */}
        <button className="nav-brand" onClick={() => setPage("menu")}>
          Brewed<span>.</span>
        </button>

        {/* Navigation & Utility actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
          <div className="nav-links-group">
            <button 
              className={`nav-text-link ${currentPage === "menu" ? "active" : ""}`}
              onClick={() => setPage("menu")}
            >
              Menu
            </button>
            <button 
              className={`nav-text-link ${currentPage === "locator" ? "active" : ""}`}
              onClick={() => setPage("locator")}
            >
              Find Us
            </button>
          </div>

          <div className="nav-utility-group">
            {/* 1. Order History Button */}
            <button 
              className="nav-utility-btn" 
              onClick={() => setPage("history")}
              title="Order History"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 8v4l3 3"/>
                <circle cx="12" cy="12" r="9"/>
              </svg>
            </button>

            {/* 2. Login / Account Button */}
            <button 
              className="nav-utility-btn" 
              onClick={() => setPage("login")}
              title="Account"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </button>

            {/* 3. Shopping Cart Button */}
            <button 
              className="nav-utility-btn" 
              onClick={() => setPage("cart")}
              title="Cart"
              style={{ paddingRight: 0 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
                <path d="M3 6h18M16 10a4 4 0 0 1-8 0"/>
              </svg>
              {cartItemCount > 0 && (
                <span className="nav-cart-count">{cartItemCount}</span>
              )}
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
