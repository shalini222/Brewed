import { useCart } from "../context/CartContext";

export default function Navbar({ setPage, currentPage }) {
  const { cart = [] } = useCart();
  
  const cartItemCount = cart.reduce((total, item) => total + (item.qty || 1), 0);

  return (
    <>
      <style>{`
        .nav-fixed-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          z-index: 1000;
          display: flex;
          justify-content: center;
          padding: 1.5rem 2rem 0 2rem;
          box-sizing: border-box;
        }

        .nav-architectural-bar {
          background: #1A0A00; /* Rich espresso brand tone */
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          max-width: 1200px;
          padding: 1rem 2.5rem;
          
          /* Sharp, crisp tailored outline representing an upscale storefront frame */
          border: 1px solid rgba(196, 149, 106, 0.2);
          border-bottom: 2px solid #C4956A; /* The golden bottom rim of the awning */
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
        }

        .nav-logo-text {
          font-family: 'Playfair Display', serif;
          font-size: 1.4rem;
          font-weight: 700;
          color: #FDFAF5;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          letter-spacing: -0.01em;
        }

        .nav-logo-text span {
          color: #C4956A;
        }

        .nav-links-cluster {
          display: flex;
          align-items: center;
        }

        /* 
          Architectural Canopy Stripes:
          Replaces the wavy scallops with ultra-thin vertical grid lines,
          giving a premium, tailored structural look to the buttons.
        */
        .nav-item-btn {
          background: none;
          border: none;
          border-left: 1px solid rgba(196, 149, 106, 0.15);
          font-family: 'Inter', sans-serif;
          font-size: 0.78rem;
          font-weight: 600;
          color: #C4956A; 
          cursor: pointer;
          padding: 0.5rem 1.75rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          transition: all 0.2s ease;
        }

        .nav-item-btn:hover, .nav-item-btn.active {
          color: #FDFAF5;
          background: rgba(196, 149, 106, 0.05);
        }

        /* Far right icon wrapper with a terminating border line */
        .nav-cart-trigger {
          background: none;
          border: none;
          border-left: 1px solid rgba(196, 149, 106, 0.15);
          color: #C4956A;
          cursor: pointer;
          padding: 0.5rem 0 0.5rem 1.5rem;
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
          margin-left: 0.4rem;
        }

        @media (max-width: 768px) {
          .nav-fixed-container {
            padding: 0;
          }
          .nav-architectural-bar {
            border-left: none;
            border-right: none;
            padding: 1rem 1.25rem;
          }
          .nav-item-btn {
            padding: 0.4rem 0.75rem;
            font-size: 0.72rem;
            letter-spacing: 0.05em;
          }
          .nav-cart-trigger {
            padding: 0.4rem 0 0.4rem 0.75rem;
          }
        }
      `}</style>

      <div className="nav-fixed-container">
        <header className="nav-architectural-bar">
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
      </div>
    </>
  );
}
