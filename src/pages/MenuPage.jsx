import { useState, useEffect } from "react"; 
import { useCart } from "../context/CartContext";
import { db } from "../firebase"; 
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  getDocs as getFavoriteDocs,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { Heart, Search, X } from "lucide-react";

export default function MenuPage({ setPage, setSelectedProduct }) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortBy, setSortBy] = useState("default"); // Internal structural sort baseline
  const [searchQuery, setSearchQuery] = useState(""); 
  const [added, setAdded] = useState({});
  const [favorites, setFavorites] = useState([]);
  const [menuItems, setMenuItems] = useState([]); 
  const [toasts, setToasts] = useState([]); 
  const { addToCart } = useCart();
  const { currentUser } = useAuth(); 
  
  // --- UPDATED FILTERS LINEUP ---
  // "Bestselling" and "Featured" are now treated as top-level active filters!
  const filters = ["All", "Bestselling", "Featured", "Coffee", "Non-Coffee", "Food"];

  // Global Dynamic Toast Notification Dispatcher
  const showToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

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
      }
    };
    
    if (db) {
      fetchMenu();
    } else {
      console.error("Firebase 'db' is not initialized!");
    }
  }, []);

  // Sync Favorites
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

  // Original fallback data system for ratings
  const itemRatingsMap = {
    1: { rating: "4.5", reviews: 142 }, 2: { rating: "4.8", reviews: 320 },
    3: { rating: "4.6", reviews: 88 },  4: { rating: "4.7", reviews: 215 },
    5: { rating: "4.9", reviews: 412 }, 6: { rating: "4.4", reviews: 67 },
    7: { rating: "4.8", reviews: 523 }, 8: { rating: "4.6", reviews: 198 }
  };

  // --- 1. DYNAMIC DATA MAPPING (NO DATA LOSS) ---
  const menuWithLiveMetadata = menuItems.map(item => {
    const localRatingData = itemRatingsMap[item.id] || { rating: "4.5", reviews: 50 };
    return {
      ...item,
      rating: item.rating || localRatingData.rating,
      reviews: item.reviews || localRatingData.reviews,
      isFeatured: item.isFeatured ?? false, 
      salesCount: item.salesCount ?? 0, 
    };
  });
 
  // --- 2. DYNAMIC SEARCH & FILTER PILL LOGIC ---
  const filteredBySearchAndCategory = menuWithLiveMetadata.filter((item) => {
    // Check Search bar matching
    const cleanSearch = searchQuery.toLowerCase().trim();
    const matchesSearch = !cleanSearch || 
      item.name?.toLowerCase().includes(cleanSearch) || 
      item.desc?.toLowerCase().includes(cleanSearch);

    if (!matchesSearch) return false;

    // Check Filter Pill condition matching
    if (activeCategory === "All") return true;
    if (activeCategory === "Featured") return item.isFeatured === true;
    if (activeCategory === "Bestselling") return item.salesCount > 0; // Show any items with sales history
    
    // Default matching fallback for "Coffee", "Non-Coffee", "Food" categories
    return item.category === activeCategory;
  });

  // --- 3. DYNAMIC SORTING GRID LOGIC ---
  const sortedAndFiltered = filteredBySearchAndCategory.sort((a, b) => {
    // If the user clicks the "Bestselling" pill, automatically order by highest sales count first
    if (activeCategory === "Bestselling") {
      return b.salesCount - a.salesCount;
    }

    if (sortBy === "price-low") return a.price - b.price;
    if (sortBy === "price-high") return b.price - a.price;
    
    // Default sorting layout baseline (Puts featured items up top first)
    if (a.isFeatured !== b.isFeatured) {
      return a.isFeatured ? -1 : 1; 
    }
    return a.name.localeCompare(b.name);
  });

  const handleAdd = (item) => {
    if (!currentUser) {
      showToast("Please log in to add items to your cart", "error");
      setPage("login"); 
      return; 
    }

    addToCart(item);
    // TOAST FIRES HERE: Item Added to Cart Action
    showToast(`Added ${item.name} to cart!`);
    setAdded((prev) => ({ ...prev, [item.id]: true }));
    setTimeout(() => setAdded((prev) => ({ ...prev, [item.id]: false })), 1000);
  };

  return (
    <>
      <style>{`
        /* --- Toast Engine Layout Styles --- */
        .toast-container {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 10px;
          pointer-events: none;
        }
        .toast-card {
          pointer-events: auto;
          min-width: 280px;
          background: #1A0A00;
          color: #FDFAF5;
          padding: 14px 20px;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(26,10,0,0.15);
          font-family: 'Inter', sans-serif;
          font-size: 0.86rem;
          font-weight: 500;
          border-left: 4px solid #C4956A;
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .toast-card.error { border-left-color: #B3261E; }
        @keyframes slideIn {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        /* --- Premium Responsive Control Dashboard Layout --- */
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

        .search-input-container {
          position: relative;
          display: flex;
          align-items: center;
          min-width: 250px;
        }
        .search-icon-left { position: absolute; left: 14px; color: #A39081; }
        .search-clear-btn {
          position: absolute; right: 14px; background: transparent;
          border: none; color: #A39081; cursor: pointer; display: flex;
        }
        .search-field {
          width: 100%; padding: 0.55rem 2.2rem 0.55rem 2.5rem;
          border-radius: 999px; border: 1px solid rgba(196, 149, 106, 0.3);
          font-family: 'Inter', sans-serif; font-size: 0.82rem; outline: none;
          transition: border-color 0.2s;
        }
        .search-field:focus { border-color: #1A0A00; }

        .categories-scroll-wrapper { overflow-x: auto; scrollbar-width: none; flex-grow: 1; }
        .categories-scroll-wrapper::-webkit-scrollbar { display: none; }
        .categories-wrapper { display: flex; gap: 0.65rem; white-space: nowrap; }
        
        .filter-pill-btn {
          padding: 0.5rem 1.25rem; border-radius: 999px;
          border: 1px solid rgba(196, 149, 106, 0.25); background: transparent;
          color: #3B1A08; font-family: 'Inter', sans-serif; font-size: 0.82rem;
          font-weight: 500; cursor: pointer; transition: all 0.25s ease;
        }
        .filter-pill-btn.active { background: #1A0A00; color: #FDFAF5; border-color: #1A0A00; }
        
        .sort-select-wrapper { position: relative; flex-shrink: 0; }
        .sort-select {
          appearance: none; font-family: 'Inter', sans-serif; font-size: 0.82rem;
          font-weight: 500; color: #1A0A00; background-color: #FDFAF5;
          border: 1px solid rgba(196, 149, 106, 0.3); padding: 0.55rem 2.2rem 0.55rem 1.25rem;
          border-radius: 999px; cursor: pointer; outline: none; min-width: 160px;
        }
        .sort-custom-arrow { position: absolute; right: 1.1rem; top: 50%; transform: translateY(-50%); color: #1A0A00; pointer-events: none; display: flex; }

        .menu-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 2rem; padding: 3rem 2rem; max-width: 1200px; margin: 0 auto; }
        .menu-card { background: #fff; border-radius: 16px; border: 1px solid rgba(196, 149, 106, 0.12); display: flex; flex-direction: column; overflow: hidden; position: relative; transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease; }
        .menu-card:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(26,10,0,0.06); }
        .hero-title { font-family: 'Playfair Display', serif; font-size: clamp(2rem, 6vw, 3.5rem); color: #FDFAF5; font-weight: 700; margin-bottom: 1rem; }
        .rating-badge { display: flex; align-items: center; gap: 0.3rem; margin-bottom: 0.5rem; font-family: 'Inter', sans-serif; font-size: 0.78rem; }
        .rating-star { color: #C4956A; }
        .rating-score { color: #1A0A00; font-weight: 600; }
        .rating-count { color: #A39081; }

        @media (max-width: 900px) {
          .filter-bar { flex-direction: column; align-items: stretch; padding: 1rem; gap: 0.85rem; }
          .search-input-container { width: 100%; order: -1; }
          .sort-select-wrapper { align-self: flex-end; }
          .menu-grid { grid-template-columns: repeat(2, 1fr); gap: 1.25rem; padding: 1.5rem 1rem; }
        }
        @media (max-width: 520px) {
          .menu-grid { grid-template-columns: 1fr; gap: 1.5rem; }
        }
      `}</style>

      {/* Real-time Shared Toast Stack Mounting Root */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast-card ${t.type}`}>{t.message}</div>
        ))}
      </div>

      <div style={styles.page}>
        <div style={styles.hero}>
          <div style={styles.heroInner}>
            <p style={styles.eyebrow}>Est. 2024 · Kolkata</p>
            <h1 className="hero-title">Where every cup<br />tells a story.</h1>
            <p style={styles.heroSub}>Specialty coffee, baked fresh daily, served with soul.</p>
          </div>
        </div>

        {/* --- Unified Header Control Center --- */}
        <div className="filter-bar">
          
          <div className="search-input-container">
            <Search className="search-icon-left" size={16} />
            <input
              type="text"
              className="search-field"
              placeholder="Search dishes, drinks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="search-clear-btn" onClick={() => setSearchQuery("")}>
                <X size={16} />
              </button>
            )}
          </div>

          <div className="categories-scroll-wrapper">
            <div className="categories-wrapper">
              {filters.map((cat) => (
                <button
                  key={cat}
                  className={`filter-pill-btn ${activeCategory === cat ? "active" : ""}`}
                  onClick={() => {
                    setActiveCategory(cat);
                    // NO TOAST DISPATCHED HERE - keeping category switches silent!
                  }}
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
              onChange={(e) => {
                setSortBy(e.target.value);
                // NO TOAST DISPATCHED HERE - keeping sort select adjustments silent!
              }}
            >
              <option value="default">Sort by: Default</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
            <span className="sort-custom-arrow">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </span>
          </div>
        </div>

        {/* --- Clean Menu Card Grid Rendering Space --- */}
        <div className="menu-grid">
          {sortedAndFiltered.map((item) => (
            <div
              key={item.id}
              className="menu-card"
              onClick={() => {
                setSelectedProduct(item);
                setPage("product");
              }}
            >
              {item.isFeatured && (
                <div
                  style={{
                    position: "absolute",
                    top: 12,
                    left: 12,
                    background: "#C4956A",
                    color: "#1A0A00",
                    padding: "4px 10px",
                    borderRadius: "999px",
                    fontSize: 10,
                    fontWeight: 700,
                    zIndex: 3,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em"
                  }}
                >
                  ★ Featured
                </div>
              )}

              {/* Favourite Heart Controller */}
              <div style={{ position: "absolute", top: 16, right: 16, zIndex: 2 }}>
                <Heart
                  size={22}
                  strokeWidth={2}
                  color="#C4956A"
                  fill={favorites.includes(item.id) ? "#C4956A" : "none"}
                  style={{ transition: "all .25s ease" }}
                  onClick={async (e) => {
                    e.stopPropagation();

                    if (!currentUser) {
                      showToast("Please log in to save favorites", "error");
                      setPage("login");
                      return;
                    }

                    const favRef = doc(db, "users", currentUser.uid, "favorites", String(item.id));

                    if (favorites.includes(item.id)) {
                      await deleteDoc(favRef);
                      setFavorites(prev => prev.filter(id => id !== item.id));
                      // TOAST FIRES HERE: Item Removed from Favorites Action
                      showToast(`Removed ${item.name} from favorites`);
                    } else {
                      await setDoc(favRef, { ...item, savedAt: Date.now() });
                      setFavorites(prev => [...prev, item.id]);
                      // TOAST FIRES HERE: Item Added to Favorites Action
                      showToast(`Saved ${item.name} to favorites!`);
                    }
                  }}
                />
              </div>

              <div style={styles.cardEmoji}>
                {(item.img || item.image) ? (
                  <img
                    src={item.img || item.image}
                    alt={item.name}
                    style={{ width: "100%", height: "220px", objectFit: "cover", display: "block", borderTopLeftRadius: "16px", borderTopRightRadius: "16px" }}
                  />
                ) : (
                  <div style={styles.cardEmoji}>{item.emoji || "☕"}</div>
                )}
              </div>

              {item.available === false && (
                <div style={{ position: "absolute", top: 12, left: item.isFeatured ? 95 : 12, background: "#B3261E", color: "#fff", padding: "6px 12px", borderRadius: "999px", fontSize: 11, fontWeight: 600, zIndex: 3 }}>
                  Out of Stock
                </div>
              )}

              <div style={styles.cardBody}>
                <div style={styles.cardTop}>
                  <div style={{ flex: 1 }}>
                    <h3 style={styles.cardName}>{item.name}</h3>
                  </div>
                  <span style={styles.cardPrice}>₹{Math.round(item.price)}</span>
                </div>

                <div className="rating-badge">
                  <span className="rating-star">★</span>
                  <span className="rating-score">{item.rating}</span>
                  <span className="rating-count">({item.reviews})</span>
                </div>

                <p style={styles.cardDesc}>{item.desc}</p>
              </div>

              <button
                disabled={item.available === false}
                style={{
                  ...styles.addBtn,
                  ...(added[item.id] ? styles.addedBtn : {}),
                  opacity: item.available === false ? 0.5 : 1,
                  cursor: item.available === false ? "not-allowed" : "pointer",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (item.available !== false) handleAdd(item);
                }}
              >
                {item.available === false ? "Out of Stock" : added[item.id] ? "✓ Added" : "+ Add"}
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
  hero: { background: "linear-gradient(135deg, #1A0A00 0%, #3B1A08 60%, #5C2E0E 100%)", padding: "5rem 1.5rem 4rem", textAlign: "center" },
  heroInner: { maxWidth: "600px", margin: "0 auto" },
  eyebrow: { color: "#C4956A", fontFamily: "'Inter', sans-serif", fontSize: "0.78rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "1.25rem" },
  heroSub: { color: "rgba(253, 250, 245, 0.75)", fontFamily: "'Inter', sans-serif", fontSize: "0.95rem", lineHeight: 1.6 },
  cardEmoji: { fontSize: "2.8rem", textAlign: "center", padding: "0rem", background: "linear-gradient(180deg, #FDF6EE 0%, #fff 100%)" },
  cardBody: { padding: "1.25rem", flex: 1, display: "flex", flexDirection: "column" },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", marginBottom: "0.4rem" },
  cardPrice: { fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", color: "#1A0A00", fontWeight: 700, whiteSpace: "nowrap" },
  cardName: { fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", color: "#1A0A00", margin: "0", fontWeight: 700, lineHeight: 1.2 },
  cardDesc: { fontFamily: "'Inter', sans-serif", fontSize: "0.82rem", color: "#7A6658", lineHeight: 1.5, marginTop: "auto", paddingTop: "0.75rem" },
  addBtn: { margin: "0 1.25rem 1.25rem", padding: "0.65rem", borderRadius: "12px", border: "none", background: "#1A0A00", color: "#FDFAF5", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.88rem", transition: "all 0.2s ease" },
  addedBtn: { background: "#C4956A", color: "#1A0A00" },
};
