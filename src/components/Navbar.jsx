import { useState } from "react"; // 1. Import useState to manage temporary login state
import { useCart } from "../context/CartContext";

export default function Navbar({ setPage, currentPage }) {
  const { cart = [] } = useCart();
  
  // 2. Create a local temporary state. False = Logged Out, True = Logged In
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  const cartItemCount = cart.reduce((total, item) => total + (item.qty || 1), 0);

  // 3. A temporary function to handle clicking the profile icon
  const handleProfileClick = () => {
    if (!isLoggedIn) {
      // Simulate logging in instantly
      setIsLoggedIn(true);
      alert("Mock Login: You are now logged in! (Icon updated)");
    } else {
      // Simulate logging out instantly
      setIsLoggedIn(false);
      alert("Mock Logout: You are now logged out!");
    }
  };

  return (
    <>
      <style>{`
        .nav-header {
          background: transparent;
          border: none;
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          box-sizing: border-box;
          z-index: 1000;
          padding: 1.75rem 2.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
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
        }

        .nav-logo-text span {
          color: #C4956A;
        }

        .nav-icons-group {
          display: flex;
          align-items: center;
          gap: 1.75rem;
        }

        .nav-icon-btn {
          background: none;
          border: none;
          color: #FDFAF5;
          cursor: pointer;
          padding: 0.35rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), filter 0.2s ease;
          position: relative;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));
        }

        .nav-icon-btn:hover, .nav-icon-btn.active {
          color: #FFFFFF;
          transform: translateY(-1px);
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
        }

        /* Golden dot indicator to cleanly display authentication state */
        .nav-icon-btn.logged-in::after {
          content: '';
          position: absolute;
          bottom: -4px;
          width: 4px;
          height: 4px;
          background: #C4956A;
          border-radius: 50%;
        }
        
        .nav-icon-btn:active {
          transform: scale(0.93);
        }

        .nav-cart-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          background: #1A0A00;
          color: #FDFAF5;
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
          border: 1px solid #FDFAF5;
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
        <button className="nav-logo-text" onClick={() => setPage("menu")}>
          Brewed<span>.</span>
        </button>

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

          {/* Profile Button - Now dynamically changing icons on click */}
          <button 
            className={`nav-icon-btn ${isLoggedIn ? "logged-in" : ""}`}
            onClick={handleProfileClick}
            title={isLoggedIn ? "Click to Mock Logout" : "Click to Mock Login"}
          >
            {isLoggedIn ? (
              /* LOGGED IN STYLE: Replaces standard user outline with a badge layout */
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M5 21v-2a4 4 0 0 1 4-4h2.5" />
                <circle cx="10" cy="7" r="4" />
                <path d="m16 11 2 2 4-4" stroke="#C4956A" /> 
              </svg>
            ) : (
              /* LOGGED OUT STYLE: Minimal clean outline placeholder */
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            )}
          </button>

          {/* Shopping Bag */}
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
