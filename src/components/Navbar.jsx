     import { useCart } from "../context/CartContext";

export default function Navbar({ setPage, currentPage }) {
  const { cart = [] } = useCart();
  
  // Clean cart counter combining item quantities
  const cartItemCount = cart.reduce((total, item) => total + (item.qty || 1), 0);

  return (
    <>
      <style>{`
        .nav-header {
          background: #1A0A00; /* Back to your rich, beautiful dark espresso brown */
          border-bottom: 1px solid #3B1A08; /* Deep accent border line */
          position: sticky;
          top: 0;
          z-index: 1000;
          padding: 1.1rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .nav-logo-text {
          font-family: 'Playfair Display', serif;
          font-size: 1.35rem;
          font-weight: 700;
          color: #FDFAF5; /* Crisp, luxurious warm off-white for contrast */
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          letter-spacing: -0.01em;
        }

        .nav-logo-text span {
          color: #C4956A; /* Warm caramel accent dot */
        }

        /* Grouping links with comfortable, luxurious breathing room */
        .nav-links-cluster {
          display: flex;
          align-items: center;
          gap: 2.25rem;
        }

        /* Clean text-only links to completely eliminate icon clutter */
        .nav-item-btn {
          background: none;
          border: none;
          font-family: 'Inter', sans-serif;
          font-size: 0.8rem;
          font-weight: 600;
          color: #C4956A; /* Soft caramel default text state */
          cursor: pointer;
          padding: 0.2rem 0;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          transition: color 0.15s ease;
          position: relative;
        }

        .nav-item-btn:hover, .nav-item-btn.active {
          color: #FDFAF5; /* Lights up beautifully on hover / focus active states */
        }

        /* Minimal active indicator underline matching your cafe theme color */
        .nav-item-btn.active::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 0;
          width: 100%;
          height: 2px;
          background: #C4956A;
        }

        /* The lone micro icon layout button on the far right */
        .nav-cart-trigger {
          background: none;
          border: none;
          color: #C4956A;
          cursor: pointer;
          padding: 0.25rem;
          display: flex;
          align-items: center;
          transition: color 0.15s ease;
        }

        .nav-cart-trigger:hover, .nav-cart-trigger.active {
          color: #FDFAF5;
        }

        .nav-cart-num {
          font-family: 'Inter', sans-serif;
          font-size: 0.75rem;
          font-weight: 700;
          color: #C4956A;
          margin-left: 0.35rem;
        }

        /* Clean media query step down for mobile device viewports */
        @media (max-width: 768px) {
          .nav-header {
            padding: 1rem 1.25rem;
          }
          .nav-links-cluster {
            gap: 1.15rem;
          }
          .nav-item-btn {
            font-size: 0.75rem;
            letter-spacing: 0.05em;
          }
        }
      `}</style>

      <header className="nav-header">
        {/* Brand typographic signature */}
        <button className="nav-logo-text" onClick={() => setPage("menu")}>
          Brewed<span>.</span>
        </button>

        {/* Minimalist interactive dark text grouping */}
        <div className="nav-links-cluster">
          <button 
            className={`nav-item-btn ${currentPage === "menu" ? "active" : ""}`}
            onClick={() => setPage("menu")}
          >
            Menu
          </button>
          
          <button 
            className={`nav-item-btn ${currentPage === "locator" ? "active" : ""}`}
            onClick={() => setPage("locator")}
          >
            Cafés
          </button>

          <button 
            className={`nav-item-btn ${currentPage === "history" ? "active" : ""}`}
            onClick={() => setPage("history")}
          >
            Orders
          </button>

          <button 
            className={`nav-item-btn ${currentPage === "login" ? "active" : ""}`}
            onClick={() => setPage("login")}
          >
            Sign In
          </button>

          {/* Your single, lightweight functional vector icon */}
          <button 
            className={`nav-cart-trigger ${currentPage === "cart" ? "active" : ""}`}
            onClick={() => setPage("cart")}
            title="Open Cart"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
              <path d="M3 6h18M16 10a4 4 0 0 1-8 0"/>
            </svg>
            {cartItemCount > 0 && (
              <span className="nav-cart-num">{cartItemCount}</span>
            )}
          </button>
        </div>
      </header>
    </>
  );
}
               
