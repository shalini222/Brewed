import { useCart } from "../context/CartContext";

export default function Navbar({ setPage, currentPage }) {
  const { cart = [] } = useCart();
  
  // Calculate total item count inside the cart dynamically
  const cartItemCount = cart.reduce((total, item) => total + (item.qty || 1), 0);

  return (
    <>
      <style>{`
        .nav-header {
          /* Headless layout - floats invisibly over the hero section gradient */
          background: transparent;
          border: none;
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          box-sizing: border-box;
          z-index: 1000;
          
          /* Balanced breathing room spacing matching your layout frames */
          padding: 1.75rem 2.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .nav-logo-text {
          font-family: 'Playfair Display', serif;
          font-size: 1.45rem;
          font-weight: 700;
          color: #FDFAF5; /* Premium crisp warm off-white */
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          letter-spacing: -0.01em;
        }

        .nav-logo-text span {
          color: #C4956A; /* Accent dot matching your brand identity */
        }

        /* Minimalist icon tray alignment on the right side */
        .nav-icons-group {
          display: flex;
          align-items: center;
          gap: 1.75rem;
        }

        /* Pure wireframe icon buttons with zero background clutter */
        .nav-icon-btn {
          background: none;
          border: none;
          color: #FDFAF5; /* Body cream white icons */
          cursor: pointer;
          padding: 0.35rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), filter 0.2s ease;
          position: relative;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));
        }

        /* Premium hover interaction: clean bright white text illumination */
        .nav-icon-btn:hover, .nav-icon-btn.active {
          color: #FFFFFF;
          transform: translateY(-1px);
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
        }
        
        .nav-icon-btn:active {
          transform: scale(0.93);
        }

        /* Floating count badge anchored precisely to the top-right corner of the bag */
        .nav-cart-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          background: #C4956A; /* Caramel badge background color */
          color: #FDFAF5; /* FIXED: Now matches your exact body white cream text */
          font-family: 'Inter', sans-serif;
          font-size: 0.68rem;
          font-weight: 700;
          min-width: 15px;
          height: 15px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 2px;
          box-sizing: border-box;
          border: 1px solid #1A0A00; /* Subtle background ring separation line */
        }

        @media (max-width: 768px) {
          .nav-header {
            padding: 1.25rem 1.5rem;
          }
          .nav-icons-group {
            gap: 1.25rem;
          }
        }
      `}</style>

      <header className="nav-header">
        {/* Main Typographic Branding */}
        <button className="nav-logo-text" onClick={() => setPage("menu")}>
          Brewed<span>.</span>
        </button>

        {/* Minimalist icon tray links layout */}
        <div className="nav-icons-group">
          
          {/* 1. Location Pin Button */}
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

          {/* 2. Profile / Login Button */}
          <button 
            className={`nav-icon-btn ${currentPage === "login" ? "active" : ""}`}
            onClick={() => setPage("login")}
            title="Account"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </button>

          {/* 3. Shopping Bag Button with Corrected Top-Right Counter */}
          <button 
            className={`nav-icon-btn ${currentPage === "cart" ? "active" : ""}`}
            onClick={() => setPage("cart")}
            title="View Cart"
            style={{ paddingRight: "0.2rem" }}
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
