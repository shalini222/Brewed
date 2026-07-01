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
          padding: 0 1.5rem;
          box-sizing: border-box;
        }

        .nav-boutique-awning {
          background: #1A0A00; /* Rich espresso base */
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          max-width: 1150px;
          padding: 1.25rem 3rem 1.1rem 3rem;
          position: relative;
          
          /* Premium depth configuration */
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
          border-radius: 0 0 4px 4px;
        }

        /* 
          Premium SVG Scallop Edge: 
          Uses an encoded vector wave instead of harsh CSS circles for a luxury drapery flow
        */
        .nav-boutique-awning::after {
          content: '';
          position: absolute;
          bottom: -11px;
          left: 0;
          width: 100%;
          height: 12px;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 12' preserveAspectRatio='none'%3E%3Cpath d='M0,0v4.2c12.5,4.7,25.8,4.7,37.5,0c12.5-4.7,25.8-4.7,37.5,0c12.5,4.7,25.8,4.7,37.5,0c12.5-4.7,25.8-4.7,37.5,0c12.5,4.7,25.8,4.7,37.5,0c12.5-4.7,25.8-4.7,37.5,0c12.5,4.7,25.8,4.7,37.5,0c12.5-4.7,25.8-4.7,37.5,0c12.5,4.7,25.8,4.7,37.5,0c12.5-4.7,25.8-4.7,37.5,0c12.5,4.7,25.8,4.7,37.5,0c12.5-4.7,25.8-4.7,37.5,0c12.5,4.7,25.8,4.7,37.5,0c12.5-4.7,25.8-4.7,37.5,0c12.5,4.7,25.8,4.7,37.5,0c12.5-4.7,25.8-4.7,37.5,0c12.5,4.7,25.8,4.7,37.5,0c12.5-4.7,25.8-4.7,37.5,0c12.5,4.7,25.8,4.7,37.5,0c12.5-4.7,25.8-4.7,37.5,0c12.5,4.7,25.8,4.7,37.5,0c12.5-4.7,25.8-4.7,37.5,0c12.5,4.7,25.8,4.7,37.5,0c12.5-4.7,25.8-4.7,37.5,0c12.5,4.7,25.8,4.7,37.5,0c12.5-4.7,25.8-4.7,37.5,0c12.5,4.7,25.8,4.7,37.5,0c12.5-4.7,25.8-4.7,37.5,0c12.5,4.7,25.8,4.7,37.5,0c12.5-4.7,25.8-4.7,37.5,0V0H0z' fill='%231A0A00'/%3E%3C/svg%3E");
          background-size: 100% 12px;
          background-repeat: no-repeat;
        }

        .nav-logo-text {
          font-family: 'Playfair Display', serif;
          font-size: 1.45rem;
          font-weight: 700;
          color: #FDFAF5;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          letter-spacing: -0.01em;
          z-index: 2;
        }

        .nav-logo-text span {
          color: #C4956A;
        }

        .nav-links-cluster {
          display: flex;
          align-items: center;
          gap: 2.75rem;
          z-index: 2;
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
          transition: color 0.15s ease;
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

        @media (max-width: 768px) {
          .nav-fixed-container {
            padding: 0;
          }
          .nav-boutique-awning {
            border-radius: 0;
            padding: 1.1rem 1.5rem 1rem 1.5rem;
          }
          .nav-links-cluster {
            gap: 1.35rem;
          }
          .nav-item-btn {
            font-size: 0.75rem;
            letter-spacing: 0.05em;
          }
          .nav-item-btn.active::after {
            display: none;
          }
        }
      `}</style>

      <div className="nav-fixed-container">
        <header className="nav-boutique-awning">
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
