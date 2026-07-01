import { useState } from "react"; 
import { useCart } from "../context/CartContext";
import { menuItems, categories } from "../data/menu"; 

export default function MenuPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortBy, setSortBy] = useState("featured"); 
  const [added, setAdded] = useState({});
  const { addToCart } = useCart();

  // Mapping specific, realistic ratings and reviews to match each unique item ID
  const itemRatingsMap = {
    1: { rating: "4.5", reviews: 142 }, // Espresso
    2: { rating: "4.8", reviews: 320 }, // Cappuccino
    3: { rating: "4.6", reviews: 88 },  // Flat White
    4: { rating: "4.7", reviews: 215 }, // Cold Brew
    5: { rating: "4.9", reviews: 412 }, // Caramel Latte
    6: { rating: "4.4", reviews: 67 },  // Matcha Latte
    7: { rating: "4.8", reviews: 523 }, // Chai Tea
    8: { rating: "4.6", reviews: 198 }, // Croissant
    9: { rating: "4.5", reviews: 154 }, // Avocado Toast
    10: { rating: "4.3", reviews: 92 }, // Blueberry Muffin
    11: { rating: "4.4", reviews: 110 }, // Iced Americano
    12: { rating: "4.7", reviews: 280 }, // Vanilla Frappé
    13: { rating: "4.9", reviews: 345 }, // Classic Hot Chocolate
    14: { rating: "4.2", reviews: 54 },  // Hibiscus Iced Tea
    15: { rating: "4.7", reviews: 267 }, // Paneer Tikka Sandwich
    16: { rating: "4.8", reviews: 189 }, // Fudge Brownie
    17: { rating: "4.6", reviews: 76 },  // Vietnamese Shakerato
    18: { rating: "4.9", reviews: 231 }, // Lotus Biscoff Latte
    19: { rating: "4.5", reviews: 143 }, // Mocha Mocha
    20: { rating: "4.4", reviews: 98 },  // Thai Bubble Tea
    21: { rating: "4.6", reviews: 165 }, // Mint Mojito Cooler
    22: { rating: "4.3", reviews: 42 },  // Turmeric Ginger Latte
    23: { rating: "4.7", reviews: 178 }, // Nutella Pancakes
    24: { rating: "4.8", reviews: 294 }, // Chicken Keema Samosas
    25: { rating: "4.5", reviews: 83 },  // Hummus & Pita Platter
    26: { rating: "4.6", reviews: 201 }  // Truffle Fries
  };

  // Attach the realistic dynamic ratings to your data array
  const menuWithRatings = menuItems.map(item => {
    const data = itemRatingsMap[item.id] || { rating: "4.5", reviews: 50 }; // fallback just in case
    return { ...item, rating: data.rating, reviews: data.reviews };
  });

  // 1. Filter by category
  const filtered = activeCategory === "All" 
    ? [...menuWithRatings] 
    : menuWithRatings.filter((i) => i.category === activeCategory);

  // 2. Sort the filtered list
  const sortedAndFiltered = filtered.sort((a, b) => {
    if (sortBy === "price-low") {
      return a.price - b.price;
    }
    if (sortBy === "price-high") {
      return b.price - a.price;
    }
    return a.name.localeCompare(b.name);
  });

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
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem 2rem;
          background: #FDFAF5;
          border-bottom: 1px solid #E8E0D5;
          position: sticky;
          top: 64px;
          z-index: 50;
        }
        .categories-wrapper {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .sort-select {
          padding: 0.4rem 1.5rem 0.4rem 0.75rem;
          border-radius: 8px;
          border: 1.5px solid #C4956A;
          background-color: #fff;
          color: #3B1A08;
          font-family: 'Inter', sans-serif;
          font-size: 0.83rem;
          cursor: pointer;
          outline: none;
          appearance: none;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'><path stroke='%233B1A08' stroke-width='1.5' d='m1 1 4 4 4-4'/></svg>");
          background-repeat: no-repeat;
          background-position: right 0.6rem center;
        }
        .hero-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(1.8rem, 5vw, 3.5rem);
          color: #FDFAF5;
          font-weight: 700;
          line-height: 1.2;
          margin-bottom: 1rem;
        }
        .rating-badge {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          margin-bottom: 0.4rem;
          font-family: 'Inter', sans-serif;
          font-size: 0.75rem;
        }
        .rating-star {
          color: #C4956A;
          font-size: 0.85rem;
        }
        .rating-score {
          color: #1A0A00;
          font-weight: 600;
        }
        .rating-count {
          color: #A39081;
        }
        @media (max-width: 768px) {
          .menu-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
            padding: 1rem;
          }
          .filter-bar {
            flex-direction: column;
            align-items: stretch;
            padding: 1rem;
            gap: 0.75rem;
            top: 56px;
          }
          .sort-select {
            width: 100%;
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

        {/* Filters Wrapper */}
        <div className="filter-bar">
          <div className="categories-wrapper">
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

          <div>
            <select 
              className="sort-select" 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="featured">Sort by: Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Grid */}
        <div className="menu-grid">
          {sortedAndFiltered.map((item) => (
            <div key={item.id} className="menu-card">
              <div style={styles.cardEmoji}>{item.emoji}</div>
              <div style={styles.cardBody}>
                <div style={styles.cardTop}>
                  <span style={styles.cardCat}>{item.category}</span>
                  <span style={styles.cardPrice}>₹{Math.round(item.price)}</span>
                </div>
                
                <h3 style={styles.cardName}>{item.name}</h3>

                {/* Elegant Minimalist Rating Row */}
                <div className="rating-badge">
                  <span className="rating-star">★</span>
                  <span className="rating-score">{item.rating}</span>
                  <span className="rating-count">({item.reviews})</span>
                </div>

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
  cardBody: { padding: "0.85rem 1rem", flex: 1, display: "flex", flexDirection: "column" },
  cardTop: {
    display: "flex", justifyContent: "space-between",
    alignItems: "center", marginBottom: "0.2rem",
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
    fontSize: "1.05rem", color: "#1A0A00", margin: "0 0 0.2rem",
  },
  cardDesc: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "0.78rem", color: "#7A6658", lineHeight: 1.5,
    marginTop: "auto", paddingTop: "0.4rem"
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
