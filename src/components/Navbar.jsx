import { useCart } from "../context/CartContext";

export default function Navbar({ setPage, currentPage }) {
  const { cart = [] } = useCart();
  
  const cartItemCount = cart.reduce((total, item) => total + (item.qty || 1), 0);

  return (
    <>
      <style>{`
        .nav-header {
          /* Completely headless - blends seamlessly into the hero gradient */
          background: transparent; 
          border-bottom: none; 
          
          /* Absolute positioning overlays it on top of your existing hero section */
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          box-sizing: border-box;
          z-index: 1000;
          
          /* Generous spacing to let the text breathe */
          padding: 1.5rem 2.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .nav-logo-text {
          font-family: 'Playfair Display', serif;
          font-size: 1.4rem;
          font-weight: 700;
          color: #FDFAF5; /* Keeping your crisp warm cream */
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          letter-spacing: -0.01em;
        }

        .nav-logo-text span {
          color: #C4956A; /* Keeping your warm caramel accent dot */
        }

        .nav-links-cluster {
          display: flex;
          align-items: center;
          gap: 2.5rem;
        }

        .nav-item-btn {
          background: none;
          border: none;
          font-family: 'Inter', sans-serif;
          font-size: 0.8rem;
          font-weight: 600;
          color: #C4956A; 
          cursor: pointer;
          padding: 0.2rem 0;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          transition: opacity 0.2s ease, color 0.2s ease;
          position: relative;
        }

        /* Sleek hover state: text glows white cleanly instead of using a heavy bar */
        .nav-item-btn:hover, .nav-item-btn.active {
          color: #FDFAF5;
        }

        /* A highly minimalist tiny dot indicator instead of a loud underline */
        .nav-item-btn.active::after {
          content: '';
          position: absolute;
          bottom: -6px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #C4956A;
        }

        .nav-cart-trigger {
          background: none;
          border: none;
          color: #C4956A;
          cursor: pointer;
          padding: 0.25rem;
          display: flex;
          align-items: center;
          transition: color 0.2s ease;
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

        @media (max-width: 768px) {
          .nav-header {
            padding: 1.25rem 1.5rem;
          }
          .nav-links-cluster {
            gap: 1.35rem;
          }
          .nav-item-btn {
            font-size: 0.75rem;
            letter-spacing: 0.06em;
          }
          /* Remove the active dot on mobile layout to save space */
          .nav-item-btn.active::after {
            display: none;
          }
        }
      `}</style>

      <header className="nav-header">
        <button className="nav-logo-text" onClick={() => setPage("menu")}>
          Brewed<span>.</span>
        </button>

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
