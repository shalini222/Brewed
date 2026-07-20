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
  query,
  where
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { Heart, Search, X } from "lucide-react";

export default function MenuPage({ setPage, setSelectedProduct }) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortBy, setSortBy] = useState("default"); 
  const [searchQuery, setSearchQuery] = useState(""); 
  const [added, setAdded] = useState({});
  const [favorites, setFavorites] = useState([]);
  const [menuItems, setMenuItems] = useState([]); 
  const [reviewStats, setReviewStats] = useState({});
  const [bestSellerIds, setBestSellerIds] = useState([]);
  const [toasts, setToasts] = useState([]); 
  const { addToCart } = useCart();
  const { currentUser } = useAuth(); 
  
  const filters = ["All", "Bestselling", "Featured", "Coffee", "Non-Coffee", "Food"];

  const showToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "menu"));
        const items = querySnapshot.docs.map((doc) => ({
  id: doc.id,
  firestoreId: doc.id, // optional if you still use it elsewhere
  ...doc.data(),
}));

const topSelling = [...items]
  .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0))
  .slice(0, 5);

setBestSellerIds(
  topSelling.map((item) => item.firestoreId)
);


        setMenuItems(items);
      } catch (error) {
        console.error("Error fetching menu: ", error);
      }
    };
    if (db) fetchMenu();
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

 useEffect(() => {

  const fetchReviewStats = async()=>{

    const snapshot = await getDocs(collection(db,"reviews"));

    const stats = {};

    snapshot.docs.forEach(doc=>{

      const review = doc.data();

      if(!stats[review.productId]){
        stats[review.productId] = {
          total:0,
          rating:0
        };
      }


      stats[review.productId].total += 1;
      stats[review.productId].rating += review.rating;

    });


    Object.keys(stats).forEach(id=>{
      stats[id].rating =
        (stats[id].rating / stats[id].total).toFixed(1);
    });


    setReviewStats(stats);

  };


  fetchReviewStats();

},[]);

  

  

  const menuWithLiveMetadata = menuItems.map(item => {
  const liveReview = reviewStats[item.id];

  return {
    ...item,

    isBestSeller: bestSellerIds.includes(item.firestoreId),

    rating: liveReview
      ? Number(liveReview.rating)
      : 0,

    reviews: liveReview
      ? liveReview.total
      : 0,
  };
});
 
  const filteredBySearchAndCategory = menuWithLiveMetadata.filter((item) => {
    const cleanSearch = searchQuery.toLowerCase().trim();
    const matchesSearch = !cleanSearch || 
      item.name?.toLowerCase().includes(cleanSearch) || 
      item.desc?.toLowerCase().includes(cleanSearch);

    if (!matchesSearch) return false;
    if (activeCategory === "All") return true;
    if (activeCategory === "Featured") return item.isFeatured === true;
    if (activeCategory === "Bestselling") {
  return bestSellerIds.includes(item.firestoreId);
    }
    
    return item.category === activeCategory;
  });

  // --- COMPREHENSIVE MULTI-MODE SORT SYSTEM ---
  const sortedAndFiltered = filteredBySearchAndCategory.sort((a, b) => {
    if (activeCategory === "Bestselling") {
      return b.salesCount - a.salesCount;
    }
    if (sortBy === "price-low") return a.price - b.price;
    if (sortBy === "price-high") return b.price - a.price;
    if (sortBy === "popularity") return b.rating - a.rating; // Sort by Rating Score High -> Low
    
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
    showToast(`Added ${item.name} to cart!`);
    setAdded((prev) => ({ ...prev, [item.id]: true }));
    setTimeout(() => setAdded((prev) => ({ ...prev, [item.id]: false })), 1000);
  };

  return (
    <>
      <style>{`
        /* --- Fix: Bottom-Middle Floating Toast Framework --- */
        .toast-container {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 10px;
          pointer-events: none;
          align-items: center;
          width: 90%;
          max-width: 400px;
        }
        .toast-card {
          pointer-events: auto;
          width: 100%;
          background: #1A0A00;
          color: #FDFAF5;
          padding: 14px 20px;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(26,10,0,0.2);
          font-family: 'Inter', sans-serif;
          font-size: 0.86rem;
          font-weight: 500;
          border-left: 4px solid #C4956A;
          text-align: center;
          animation: slideUpFade 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .toast-card.error { border-left-color: #B3261E; }
        @keyframes slideUpFade {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        /* --- Fully Responsive Flexible Top Control Dashboard --- */
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

        /* Categories on Left */
        .categories-scroll-wrapper { 
          overflow-x: auto; 
          scrollbar-width: none; 
          flex: 1 1 35%;
        }
        .categories-scroll-wrapper::-webkit-scrollbar { display: none; }
        .categories-wrapper { display: flex; gap: 0.65rem; white-space: nowrap; }
        
        /* Centered Adaptive Search System */
        .search-input-container {
          position: relative;
          display: flex;
          align-items: center;
          flex: 1 1 40%;
          max-width: 500px;
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

        /* Sort Actions on Right */
        .sort-select-wrapper { position: relative; flex: 0 1 auto; min-width: 170px; }
        .sort-select {
          appearance: none; width: 100%; font-family: 'Inter', sans-serif; font-size: 0.82rem;
          font-weight: 500; color: #1A0A00; background-color: #FDFAF5;
          border: 1px solid rgba(196, 149, 106, 0.3); padding: 0.55rem 2.2rem 0.55rem 1.25rem;
          border-radius: 999px; cursor: pointer; outline: none;
        }
        .sort-custom-arrow { position: absolute; right: 1.1rem; top: 50%; transform: translateY(-50%); color: #1A0A00; pointer-events: none; display: flex; }

        /* General Base Styles */
        .filter-pill-btn {
          padding: 0.5rem 1.25rem; border-radius: 999px;
          border: 1px solid rgba(196, 149, 106, 0.25); background: transparent;
          color: #3B1A08; font-family: 'Inter', sans-serif; font-size: 0.82rem;
          font-weight: 500; cursor: pointer; transition: all 0.25s ease;
        }
        .filter-pill-btn.active { background: #1A0A00; color: #FDFAF5; border-color: #1A0A00; }
        .menu-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 2rem; padding: 3rem 2rem; max-width: 1200px; margin: 0 auto; }
        .menu-card { background: #fff; border-radius: 16px; border: 1px solid rgba(196, 149, 106, 0.12); display: flex; flex-direction: column; overflow: hidden; position: relative; transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease; }
        .menu-card:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(26,10,0,0.06); }
        .hero-title { font-family: 'Playfair Display', serif; font-size: clamp(2rem, 6vw, 3.5rem); color: #FDFAF5; font-weight: 700; margin-bottom: 1rem; }
        .rating-badge { display: flex; align-items: center; gap: 0.3rem; margin-bottom: 0.5rem; font-family: 'Inter', sans-serif; font-size: 0.78rem; }
        .rating-star { color: #C4956A; }
        .rating-score { color: #1A0A00; font-weight: 600; }
        .rating-count { color: #A39081; }

        /* Media Viewport Breakpoints Engine */
        @media (max-width: 960px) {
          .filter-bar { flex-direction: column; align-items: stretch; padding: 1rem; gap: 0.75rem; }
          .categories-scroll-wrapper, .search-input-container, .sort-select-wrapper { flex: none; width: 100%; max-width: 100%; }
          .sort-select-wrapper { display: flex; justify-content: flex-end; }
          .sort-select { max-width: 240px; }
          .menu-grid { grid-template-columns: repeat(2, 1fr); gap: 1.25rem; padding: 1.5rem 1rem; }
        }
        @media (max-width: 520px) {
          .menu-grid { grid-template-columns: 1fr; gap: 1.5rem; }
          .sort-select { max-width: 100%; }
        }
      `}</style>

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

        {/* --- Responsive Control Dashboard Center --- */}
        <div className="filter-bar">
          {/* LEFT: Tags & Categories */}
          <div className="categories-scroll-wrapper">
            <div className="categories-wrapper">
              {filters.map((cat) => (
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

          {/* MIDDLE: Search */}
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

          {/* RIGHT: Advanced Sort Actions */}
          <div className="sort-select-wrapper">
            <select 
              className="sort-select" 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="default">Sort by: Default</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="popularity">Popular by Ratings</option>
            </select>
            <span className="sort-custom-arrow">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </span>
          </div>
        </div>

        {/* --- Card Grid --- */}
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

              <div style={{ position: "absolute", top: 16, right: 16, zIndex: 4 }}>
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
                      showToast(`Removed ${item.name} from favorites`);
                    } else {
                      await setDoc(favRef, { ...item, savedAt: Date.now() });
                      setFavorites(prev => [...prev, item.id]);
                      showToast(`Saved ${item.name} to favorites!`);
                    }
                  }}
                />
              </div>

              {/* Fix: Renders EMOJI layered cleanly directly over IMG asset */}
              <div style={styles.cardVisualMediaContainer}>
                {(item.img || item.image) && (
                  <img
                    src={item.img || item.image}
                    alt={item.name}
                    style={{ width: "100%", height: "220px", objectFit: "cover", display: "block", position: "absolute", top: 0, left: 0, zIndex: 1 }}
                  />
                )}
                <span style={{ 
                  zIndex: 2, 
                  position: "relative",
                  backgroundColor: (item.img || item.image) ? "rgba(255, 255, 255, 0.85)" : "transparent",
                  padding: (item.img || item.image) ? "6px 12px" : "0px",
                  borderRadius: "999px",
                  backdropFilter: (item.img || item.image) ? "blur(4px)" : "none",
                  boxShadow: (item.img || item.image) ? "0 4px 12px rgba(0,0,0,0.1)" : "none",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  {item.emoji || "☕"}
                </span>
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
  cardVisualMediaContainer: { position: "relative", height: "220px", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "2.5rem", background: "linear-gradient(180deg, #FDF6EE 0%, #fff 100%)", borderTopLeftRadius: "16px", borderTopRightRadius: "16px", overflow: "hidden" },
  cardBody: { padding: "1.25rem", flex: 1, display: "flex", flexDirection: "column" },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", marginBottom: "0.4rem" },
  cardPrice: { fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", color: "#1A0A00", fontWeight: 700, whiteSpace: "nowrap" },
  cardName: { fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", color: "#1A0A00", margin: "0", fontWeight: 700, lineHeight: 1.2 },
  cardDesc: { fontFamily: "'Inter', sans-serif", fontSize: "0.82rem", color: "#7A6658", lineHeight: 1.5, marginTop: "auto", paddingTop: "0.75rem" },
  addBtn: { margin: "0 1.25rem 1.25rem", padding: "0.65rem", borderRadius: "12px", border: "none", background: "#1A0A00", color: "#FDFAF5", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.88rem", transition: "all 0.2s ease" },
  addedBtn: { background: "#C4956A", color: "#1A0A00" },
};
