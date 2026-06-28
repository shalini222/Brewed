import { useCart } from "../context/CartContext";

export default function Navbar({ page, setPage }) {
  const { count } = useCart();

  return (
    <>
      <style>{`
        .nav-logo-text {
          font-family: 'Playfair Display', serif;
          color: #C4956A;
          font-weight: 700;
          font-size: 1.4rem;
          letter-spacing: 0.02em;
        }
        .nav-link {
          background: none;
          border: none;
          cursor: pointer;
          color: #F5F0E8;
          font-family: 'Inter', sans-serif;
          font-size: 0.95rem;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          transition: background 0.2s;
        }
        .nav-link:hover {
          background: #2C1205;
          opacity: 1 !important;
        }
        .nav-link.active {
          background: #3B1A08;
          color: #C4956A;
        }
        @media (max-width: 768px) {
          .nav-logo-text {
            font-size: 1.1rem;
          }
          .nav-link {
            font-size: 0.85rem;
            padding: 0.4rem 0.75rem;
          }
        }
      `}</style>

      <nav style={styles.nav}>
        <div style={styles.logo} onClick={() => setPage("menu")}>
          <span style={{ fontSize: "1.4rem" }}>☕</span>
          <span className="nav-logo-text">Brewed</span>
        </div>

        <div style={styles.links}>
          <button
            className={`nav-link ${page === "menu" ? "active" : ""}`}
            onClick={() => setPage("menu")}
          >
            Menu
          </button>
          <button
            className={`nav-link ${page === "cart" ? "active" : ""}`}
            onClick={() => setPage("cart")}
          >
            Cart
            {count > 0 && <span style={styles.badge}>{count}</span>}
          </button>
        </div>
      </nav>
    </>
  );
}

const styles = {
  nav: {
    position: "sticky", top: 0, zIndex: 100,
    background: "#1A0A00",
    borderBottom: "1px solid #3B1A08",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0 1.5rem", height: "64px",
  },
  logo: {
    display: "flex", alignItems: "center", gap: "0.5rem",
    cursor: "pointer",
  },
  links: { display: "flex", gap: "0.25rem" },
  badge: {
    background: "#C4956A", color: "#1A0A00", borderRadius: "50%",
    width: "20px", height: "20px", fontSize: "0.72rem",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    fontWeight: 700,
  },
};