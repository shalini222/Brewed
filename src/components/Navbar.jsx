import { useCart } from "../context/CartContext";

export default function Navbar({ setPage, currentPage }) {
  const { cart = [] } = useCart();
  
  const cartItemCount = cart.reduce((total, item) => total + (item.qty || 1), 0);

  return (
    <>
      <style>{`
        .nav-wrapper {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          z-index: 1000;
          display: flex;
          justify-content: center; /* Centers the roof canopy on the screen */
          padding: 0 1.5rem;
          box-sizing: border-box;
        }

        .nav-roof-canopy {
          background: #1A0A00; /* Your rich brand espresso brown */
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          max-width: 1100px;
          padding: 1rem 2.5rem 1.25rem 2.5rem;
          
          /* The Magic: Creates a subtle, elegant architectural canopy angle on the bottom edges */
          clip-path: polygon(0% 0%, 100% 0%, 98% 100%, 2% 100%);
          
          /* Adds a slim, glowing cafe lighting line right at the edge of the roof */
          border-bottom: 1.5px solid #C4956A; 
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
        }

        .nav-logo-text {
          font-family: 'Playfair Display', serif;
          font-size: 1.35rem;
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
          transition: color 0.2s ease;
          position: relative;
        }

        .nav-item-btn:hover, .nav-item-btn.active {
          color: #FDFAF5;
        }

        /* Minimal active indicator dot under the selected tab */
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
          .nav-wrapper {
            padding: 0;
          }
          .nav-roof-canopy {
            /* Flattens the canopy angles slightly on mobile frames for a cleaner fit */
            clip-path: polygon(0% 0%, 100% 0%, 99% 100%, 1% 100%);
            padding: 1rem 1.25rem;
          }
          .nav-links-cluster {
            gap: 1.25rem;
          }
          .nav-item-btn {
            font-size: 0.72rem;
            letter-spacing: 0.04em;
          }
          .nav-item-btn.active::after {
            display: none;
          }
        }
      `}</style>

      <div className="nav-wrapper">
        <header className="nav-roof-canopy">
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
