import { useState, useEffect } from "react"; 
import { useCart } from "../context/CartContext";
import { db } from "../firebase"; // Ensure your firebase connection is exported here
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  getDocs as getFavoriteDocs,
} from "firebase/firestore";


import { useAuth } from "../context/AuthContext";
import { Heart } from "lucide-react";





export default function MenuPage({ setPage, setSelectedProduct }) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortBy, setSortBy] = useState("featured"); 
  const [added, setAdded] = useState({});
  const [favorites, setFavorites] = useState([]);
  const [menuItems, setMenuItems] = useState([]); // Cloud-sourced data
  const { addToCart } = useCart();
  const { currentUser } = useAuth(); 
  
  const categories = ["All", "Coffee", "Non-Coffee", "Food"];

  // Fetch data from Firestore
    useEffect(() => {
    const fetchMenu = async () => {
      try {
        console.log("Attempting to fetch from Firestore...");
        const querySnapshot = await getDocs(collection(db, "menu"));
        
        const items = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        console.log("Data fetched successfully:", items);
        setMenuItems(items);
      } catch (error) {
        console.error("FATAL ERROR FETCHING MENU: ", error);
        alert("Check the console for the error!");
      }
    };
    
    if (db) {
      fetchMenu();
    } else {
      console.error("Firebase 'db' is not initialized!");
    }
  }, []);

  useEffect(() => {
  if (!currentUser) return;

  const loadFavorites = async () => {
    const snapshot = await getFavoriteDocs(
      collection(db, "users", currentUser.uid, "favorites")
    );

    const ids = snapshot.docs.map((doc) => doc.id);
    setFavorites(ids);
  };

  loadFavorites();
}, [currentUser]);

  const itemRatingsMap = {
    1: { rating: "4.5", reviews: 142 },
    2: { rating: "4.8", reviews: 320 },
    3: { rating: "4.6", reviews: 88 },
    4: { rating: "4.7", reviews: 215 },
    5: { rating: "4.9", reviews: 412 },
    6: { rating: "4.4", reviews: 67 },
    7: { rating: "4.8", reviews: 523 },
    8: { rating: "4.6", reviews: 198 },
    9: { rating: "4.5", reviews: 154 },
    10: { rating: "4.3", reviews: 92 },
    11: { rating: "4.4", reviews: 110 },
    12: { rating: "4.7", reviews: 280 },
    13: { rating: "4.9", reviews: 345 },
    14: { rating: "4.2", reviews: 54 },
    15: { rating: "4.7", reviews: 267 },
    16: { rating: "4.8", reviews: 189 },
    17: { rating: "4.6", reviews: 76 },
    18: { rating: "4.9", reviews: 231 },
    19: { rating: "4.5", reviews: 143 },
    20: { rating: "4.4", reviews: 98 },
    21: { rating: "4.6", reviews: 165 },
    22: { rating: "4.3", reviews: 42 },
    23: { rating: "4.7", reviews: 178 },
    24: { rating: "4.8", reviews: 294 },
    25: { rating: "4.5", reviews: 83 },
    26: { rating: "4.6", reviews: 201 }
  };

  

  
  const menuWithRatings = menuItems.map(item => {
    const data = itemRatingsMap[item.id] || { rating: "4.5", reviews: 50 };
    return { ...item, rating: data.rating, reviews: data.reviews };
  });
 
  const filtered = activeCategory === "All" 
    ? [...menuWithRatings] 
    : menuWithRatings.filter((i) => i.category === activeCategory);

  const sortedAndFiltered = filtered.sort((a, b) => {
    if (sortBy === "price-low") return a.price - b.price;
    if (sortBy === "price-high") return b.price - a.price;
    return a.name.localeCompare(b.name);
  });

  const handleAdd = (item) => {
  // 1. GATEKEEPER: Check if logged in
  if (!currentUser) {
    alert("Please log in to add items to your cart.");
    setPage("login"); // Redirect them
    return; // Stop the action
  }

  // 2. PROCEED: If logged in, perform the original logic
  addToCart(item);
  setAdded((prev) => ({ ...prev, [item.id]: true }));
  setTimeout(() => setAdded((prev) => ({ ...prev, [item.id]: false })), 1000);
};

  return (
    <>
      <style>{`
        /* --- Premium Control Bar Layout --- */
        .filter-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1.5rem;
          padding: 1.25rem 2rem;
          background: #FDFAF5;
          border-bottom: 1px solid rgba(196, 149, 106, 0.15);
          position: sticky;
          top: 0;
          z-index: 50;
          max-width: 1200px;
          margin: 0 auto;
          box-sizing: border-box;
        }

        .categories-scroll-wrapper {
          overflow-x: auto;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
          flex-grow: 1;
        }

        .categories-scroll-wrapper::-webkit-scrollbar {
          display: none;
        }

        .categories-wrapper {
          display: flex;
          gap: 0.65rem;
          white-space: nowrap;
        }

        .filter-pill-btn {
          padding: 0.5rem 1.25rem;
          border-radius: 999px;
          border: 1px solid rgba(196, 149, 106, 0.25);
          background: transparent;
          color: #3B1A08;
          font-family: 'Inter', sans-serif;
          font-size: 0.82rem;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .filter-pill-btn:hover {
          color: #C4956A;
          border-color: #C4956A;
        }

        .filter-pill-btn.active {
          background: #1A0A00;
          color: #FDFAF5;
          border-color: #1A0A00;
        }

        /* --- Re-Engineered Premium Sort Dropdown --- */
        .sort-select-wrapper {
          position: relative;
          flex-shrink: 0;
        }

        .sort-select {
          appearance: none;
          -webkit-appearance: none;
          font-family: 'Inter', sans-serif;
          font-size: 0.82rem;
          font-weight: 500;
          color: #1A0A00;
          background-color: #FDFAF5;
          border: 1px solid rgba(196, 149, 106, 0.3);
          padding: 0.55rem 2.2rem 0.55rem 1.25rem;
          border-radius: 999px;
          cursor: pointer;
          outline: none;
          transition: all 0.2s ease;
          min-width: 160px;
        }

        .sort-select:hover, .sort-select:focus {
          border-color: #1A0A00;
          background-color: #FFFFFF;
        }

        .sort-custom-arrow {
          position: absolute;
          right: 1.1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #1A0A00;
          pointer-events: none;
          display: flex;
          align-items: center;
          transition: transform 0.2s ease;
        }

        .sort-select-wrapper:hover .sort-custom-arrow {
          transform: translateY(-50%) rotate(180deg);
        }

        /* --- Grid Structure Styles --- */
        .menu-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 2rem;
          padding: 3rem 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .menu-card {
          background: #fff;
          border-radius: 16px;
          border: 1px solid rgba(196, 149, 106, 0.12);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(26,10,0,0.02);
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease;
        }

        .menu-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 30px rgba(26,10,0,0.06);
        }

        .hero-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(2rem, 6vw, 3.5rem);
          color: #FDFAF5;
          font-weight: 700;
          line-height: 1.15;
          margin-bottom: 1rem;
          letter-spacing: -0.01em;
        }

        .rating-badge {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          margin-bottom: 0.5rem;
          font-family: 'Inter', sans-serif;
          font-size: 0.78rem;
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

        /* --- Mobile Responsive Layout Overhauls --- */
        @media (max-width: 768px) {
          .filter-bar {
            flex-direction: column;
            align-items: stretch;
            padding: 1rem;
            gap: 0.85rem;
          }

          .categories-scroll-wrapper {
            width: 100%;
          }

          /* Keeps the sorting action beautifully compact and floated to the right edge */
          .sort-select-wrapper {
            align-self: flex-end; 
            margin-top: 0.25rem;
          }

          .sort-select {
            font-size: 0.78rem;
            padding: 0.45rem 1.8rem 0.45rem 1rem;
            background-color: #FFFFFF;
            border-color: rgba(196, 149, 106, 0.2);
            min-width: auto;
          }
          
          .sort-custom-arrow {
            right: 0.75rem;
          }

          .menu-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1.25rem;
            padding: 1.5rem 1rem;
          }
        }

        @media (max-width: 520px) {
          .menu-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
        }
      `}</style>

      <div style={styles.page}>
        {/* Editorial Brand Hero */}
        <div style={styles.hero}>
          <div style={styles.heroInner}>
            <p style={styles.eyebrow}>Est. 2024 · Kolkata</p>
            <h1 className="hero-title">Where every cup<br />tells a story.</h1>
            <p style={styles.heroSub}>Specialty coffee, baked fresh daily, served with soul.</p>
          </div>
        </div>

        {/* Filters Wrapper */}
        <div className="filter-bar">
          <div className="categories-scroll-wrapper">
            <div className="categories-wrapper">
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={`filter-pill-btn ${activeCategory === cat ? "active" : ""}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="sort-select-wrapper">
            <select 
              className="sort-select" 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="featured">Sort by: Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
            <span className="sort-custom-arrow">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </span>
          </div>
        </div>

        {/* Clean Menu Card Grid */}

          <div className="menu-grid">
  {sortedAndFiltered.map((item) => (
    <div
      key={item.id}
      className="menu-card"
      style={{
        cursor: "pointer",
        position: "relative",
      }}
      onClick={() => {
        setSelectedProduct(item);
        setPage("product");
      }}
    >
      {/* Favourite Heart */}
      <div
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          zIndex: 2,
        }}
      >
        <Heart
          size={22}
          strokeWidth={2}
          color="#C4956A"
          fill={favorites.includes(item.id) ? "#C4956A" : "none"}
          style={{
            cursor: "pointer",
            transition: "all .25s ease",
          }}
          onClick={async (e) => {
            e.stopPropagation();

            if (!currentUser) {
              setPage("login");
              return;
            }

            const favRef = doc(
              db,
              "users",
              currentUser.uid,
              "favorites",
              String(item.id)
            );

            if (favorites.includes(item.id)) {
              await deleteDoc(favRef);

              setFavorites(prev => prev.filter(id => id !== item.id));
            } else {
              await setDoc(favRef, {
                ...item,
                savedAt: Date.now(),
              });

              setFavorites(prev => [...prev, item.id]);
            }
          }}
        />
      </div>
          

      <div style={styles.cardEmoji}>
        {item.image ? (
    <img
      src={item.image}
      alt={item.name}
      style={{
        width: "110px",
        height: "110px",
        objectFit: "cover",
        borderRadius: "16px",
      }}
    />
  ) : (
    item.emoji
  )}
        </div>

      <div style={styles.cardBody}>
        <div style={styles.cardTop}>
          <div style={{ flex: 1 }}>
            <h3 style={styles.cardName}>{item.name}</h3>
          </div>

          <span style={styles.cardPrice}>
            ₹{Math.round(item.price)}
          </span>
        </div>

        <div className="rating-badge">
          <span className="rating-star">★</span>
          <span className="rating-score">{item.rating}</span>
          <span className="rating-count">
            ({item.reviews})
          </span>
        </div>

        <p style={styles.cardDesc}>
          {item.desc}
        </p>
      </div>

      <button
  style={{
    ...styles.addBtn,
    ...(added[item.id] ? styles.addedBtn : {}),
  }}
  onClick={(e) => {
    e.stopPropagation();
    
    // THE GATEKEEPER LOGIC
    if (!currentUser) {
      setPage("login"); // Redirects to login
      return;
    }

    // NORMAL ACTION
    handleAdd(item);
  }}
>
  {/* ALWAYS SHOW NORMAL TEXT */}
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
    padding: "5rem 1.5rem 4rem",
    textAlign: "center",
  },
  heroInner: { maxWidth: "600px", margin: "0 auto" },
  eyebrow: {
    color: "#C4956A", fontFamily: "'Inter', sans-serif",
    fontSize: "0.78rem", letterSpacing: "0.15em",
    textTransform: "uppercase", marginBottom: "1.25rem",
  },
  heroSub: {
    color: "rgba(253, 250, 245, 0.75)", fontFamily: "'Inter', sans-serif",
    fontSize: "0.95rem", lineHeight: 1.6
  },
  cardEmoji: {
    fontSize: "2.8rem", textAlign: "center",
    padding: "1.75rem 1rem 0.75rem",
    background: "linear-gradient(180deg, #FDF6EE 0%, #fff 100%)",
  },
  cardBody: { padding: "1.25rem", flex: 1, display: "flex", flexDirection: "column" },
  cardTop: {
    display: "flex", justifyContent: "space-between",
    alignItems: "flex-start", gap: "1rem", marginBottom: "0.4rem",
  },
  cardPrice: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.1rem", color: "#1A0A00", fontWeight: 700,
    whiteSpace: "nowrap"
  },
  cardName: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.2rem", color: "#1A0A00", margin: "0",
    fontWeight: 700, lineHeight: 1.2
  },
  cardDesc: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "0.82rem", color: "#7A6658", lineHeight: 1.5,
    marginTop: "auto", paddingTop: "0.75rem"
  },
  addBtn: {
    margin: "0 1.25rem 1.25rem",
    padding: "0.65rem", borderRadius: "12px",
    border: "none", background: "#1A0A00",
    color: "#FDFAF5", fontFamily: "'Inter', sans-serif",
    fontWeight: 600, fontSize: "0.88rem", cursor: "pointer",
    transition: "all 0.2s ease"
  },
  addedBtn: { background: "#C4956A", color: "#1A0A00" },
};

