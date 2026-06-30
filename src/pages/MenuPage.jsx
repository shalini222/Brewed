import { useState } from "react"; // Fixed: Added missing useState hook import
import { useCart } from "../context/CartContext";
import { menuItems, categories } from "../data/menu"; // Make sure your path matches your project layout

export default function MenuPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [added, setAdded] = useState({});
  const { addToCart } = useCart();

  const filtered = activeCategory === "All" ? menuItems : menuItems.filter((i) => i.category === activeCategory);

  const handleAdd = (item) => {
    addToCart(item);
    setAdded((prev) => ({ ...prev, [item.id]: true }));
    setTimeout(() => setAdded((prev) => ({ ...prev, [item.id]: false })), 1000);
  };

  return (
    <>
      <style>{`
        .menu-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 1.5rem;
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .menu-card {
          background: #fff;
          border-radius: 16px;
          border: 1px solid #E8E0D5;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(26,10,0,0.06);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .menu-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 20px rgba(26,10,0,0.1);
        }
        .filter-bar {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          padding: 1.25rem 2rem;
          background: #FDFAF5;
          border-bottom: 1px solid #E8E0D5;
          position: sticky;
          top: 64px;
          z-index: 50;
        }
        .hero-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(1.8rem, 5vw, 3.5rem);
          color: #FDFAF5;
          font-weight: 700;
          line-height: 1.2;
          margin-bottom: 1rem;
        }
        @media (max-width: 768px) {
          .menu-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
            padding: 1rem;
          }
          .filter-bar {
            padding: 1rem;
            gap: 0.4rem;
            top: 56px;
          }
        }
        @media (max-width: 400px) {
          .menu-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div style={styles.page}>

        {/* Hero */}
        <div style={styles.hero}>
          <div style={styles.heroInner}>
            <p style={styles.eyebrow}>Est. 2024 · Kolkata</p>
            <h1 className="hero-title">Where every cup<br />tells a story.</h1>
            <p style={styles.heroSub}>Specialty coffee, baked fresh daily, served with soul.</p>
          </div>
        </div>

        {/* Category Filter */}
        <div className="filter-bar">
          {categories.map((cat) => (
            <button
              key={cat}
              style={{
                ...styles.filterBtn,
                ...(activeCategory === cat ? styles.filterActive : {}),
              }}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="menu-grid">
          {filtered.map((item) => (
            <div key={item.id} className="menu-card">
              <div style={styles.cardEmoji}>{item.emoji}</div>
              <div style={styles.cardBody}>
                <div style={styles.cardTop}>
                  <span style={styles.cardCat}>{item.category}</span>
                  {/* Fixed: Replaced $ with ₹ and stripped decimals */}
                  <span style={styles.cardPrice}>₹{Math.round(item.price)}</span>
                </div>
                <h3 style={styles.cardName}>{item.name}</h3>
                <p style={styles.cardDesc}>{item.desc}</p>
              </div>
              <button
                style={{
                  ...styles.addBtn,
                  ...(added[item.id] ? styles.addedBtn : {}),
                }}
                onClick={() => handleAdd(item)}
              >
                {added[item.id] ? "✓ Added" : "+ Add"}
              </button>
            </div>
          ))}
        </div>

      </div>
    </>
  );
}

const styles = {
  page: { background: "#FDFAF5", minHeight: "100vh" },
  hero: {
    background: "linear-gradient(135deg, #1A0A00 0%, #3B1A08 60%, #5C2E0E 100%)",
    padding: "4rem 1.5rem 3rem",
    textAlign: "center",
  },
  heroInner: { maxWidth: "600px", margin: "0 auto" },
  eyebrow: {
    color: "#C4956A", fontFamily: "'Inter', sans-serif",
    fontSize: "0.78rem", letterSpacing: "0.15em",
    textTransform: "uppercase", marginBottom: "1rem",
  },
  heroSub: {
    color: "#C4956A", fontFamily: "'Inter', sans-serif",
    fontSize: "0.95rem", opacity: 0.9,
  },
  filterBtn: {
    padding: "0.4rem 1.1rem", borderRadius: "999px",
    border: "1.5px solid #C4956A", background: "transparent",
    color: "#3B1A08", fontFamily: "'Inter', sans-serif",
    fontSize: "0.83rem", cursor: "pointer", whiteSpace: "nowrap",
  },
  filterActive: { background: "#1A0A00", color: "#C4956A", borderColor: "#1A0A00" },
  cardEmoji: {
    fontSize: "2.8rem", textAlign: "center",
    padding: "1.25rem 1rem 0.5rem",
    background: "linear-gradient(180deg, #FDF6EE 0%, #fff 100%)",
  },
  cardBody: { padding: "0.85rem 1rem", flex: 1 },
  cardTop: {
    display: "flex", justifyContent: "space-between",
    alignItems: "center", marginBottom: "0.3rem",
  },
  cardCat: {
    fontSize: "0.68rem", color: "#C4956A",
    fontFamily: "'Inter', sans-serif",
    textTransform: "uppercase", letterSpacing: "0.1em",
  },
  cardPrice: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1rem", color: "#1A0A00", fontWeight: 700,
  },
  cardName: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.05rem", color: "#1A0A00", margin: "0 0 0.3rem",
  },
  cardDesc: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "0.78rem", color: "#7A6658", lineHeight: 1.5,
  },
  addBtn: {
    margin: "0 1rem 1rem",
    padding: "0.55rem", borderRadius: "10px",
    border: "none", background: "#1A0A00",
    color: "#C4956A", fontFamily: "'Inter', sans-serif",
    fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
  },
  addedBtn: { background: "#C4956A", color: "#1A0A00" },
};
