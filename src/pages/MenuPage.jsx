import { useEffect, useMemo, useState } from "react";
import { useCart } from "../context/CartContext";
import { db } from "../firebase";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import {
  Heart,
  Search,
  X,
  ChevronDown,
  Plus,
  Check,
  Star,
  Sparkles,
} from "lucide-react";

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
  const [loading, setLoading] = useState(true);

  const { addToCart } = useCart();
  const { currentUser } = useAuth();

  const filters = [
    "All",
    "Bestselling",
    "Featured",
    "Coffee",
    "Non-Coffee",
    "Food",
  ];

  /* =========================================================
     TOAST
  ========================================================= */

  const showToast = (message, type = "success") => {
    const id = `${Date.now()}-${Math.random()}`;

    setToasts((prev) => [...prev, { id, message, type }]);

    window.setTimeout(() => {
      setToasts((prev) =>
        prev.filter((toast) => toast.id !== id)
      );
    }, 2800);
  };

  /* =========================================================
     FETCH MENU
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    const fetchMenu = async () => {
      try {
        setLoading(true);

        const snapshot = await getDocs(collection(db, "menu"));

        if (!mounted) return;

        const items = snapshot.docs.map((menuDoc) => ({
          id: menuDoc.id,
          firestoreId: menuDoc.id,
          ...menuDoc.data(),
        }));

        const topSelling = [...items]
          .sort(
            (a, b) =>
              Number(b.salesCount || 0) -
              Number(a.salesCount || 0)
          )
          .slice(0, 5);

        setBestSellerIds(
          topSelling.map((item) => item.firestoreId)
        );

        setMenuItems(items);
      } catch (error) {
        console.error("Error fetching menu:", error);
        showToast("Couldn't load the menu.", "error");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (db) {
      fetchMenu();
    }

    return () => {
      mounted = false;
    };
  }, []);

  /* =========================================================
     LOAD FAVORITES
  ========================================================= */

  useEffect(() => {
    if (!currentUser) {
      setFavorites([]);
      return;
    }

    let mounted = true;

    const loadFavorites = async () => {
      try {
        const snapshot = await getDocs(
          collection(
            db,
            "users",
            currentUser.uid,
            "favorites"
          )
        );

        if (!mounted) return;

        setFavorites(
          snapshot.docs.map((favoriteDoc) => favoriteDoc.id)
        );
      } catch (error) {
        console.error("Error loading favorites:", error);
      }
    };

    loadFavorites();

    return () => {
      mounted = false;
    };
  }, [currentUser]);

  /* =========================================================
     REVIEWS
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    const fetchReviewStats = async () => {
      try {
        const snapshot = await getDocs(
          collection(db, "reviews")
        );

        const stats = {};

        snapshot.docs.forEach((reviewDoc) => {
          const review = reviewDoc.data();

          if (!review.productId) return;

          if (!stats[review.productId]) {
            stats[review.productId] = {
              total: 0,
              rating: 0,
            };
          }

          stats[review.productId].total += 1;
          stats[review.productId].rating += Number(
            review.rating || 0
          );
        });

        Object.keys(stats).forEach((id) => {
          if (stats[id].total > 0) {
            stats[id].rating = Number(
              (
                stats[id].rating / stats[id].total
              ).toFixed(1)
            );
          }
        });

        if (mounted) {
          setReviewStats(stats);
        }
      } catch (error) {
        console.error("Error fetching review stats:", error);
      }
    };

    fetchReviewStats();

    return () => {
      mounted = false;
    };
  }, []);

  /* =========================================================
     LIVE METADATA
  ========================================================= */

  const menuWithLiveMetadata = useMemo(() => {
    return menuItems.map((item) => {
      const review = reviewStats[item.id];

      return {
        ...item,
        isBestSeller: bestSellerIds.includes(item.firestoreId),
        rating: review ? Number(review.rating) : 0,
        reviews: review ? review.total : 0,
      };
    });
  }, [menuItems, reviewStats, bestSellerIds]);

  /* =========================================================
     FILTER + SORT
  ========================================================= */

  const filteredItems = useMemo(() => {
    const search = searchQuery.toLowerCase().trim();

    const filtered = menuWithLiveMetadata.filter((item) => {
      const matchesSearch =
        !search ||
        item.name?.toLowerCase().includes(search) ||
        item.desc?.toLowerCase().includes(search) ||
        item.category?.toLowerCase().includes(search);

      if (!matchesSearch) return false;

      if (activeCategory === "All") return true;

      if (activeCategory === "Featured") {
        return item.isFeatured === true;
      }

      if (activeCategory === "Bestselling") {
        return item.isBestSeller;
      }

      return item.category === activeCategory;
    });

    return [...filtered].sort((a, b) => {
      if (activeCategory === "Bestselling") {
        return (
          Number(b.salesCount || 0) -
          Number(a.salesCount || 0)
        );
      }

      if (sortBy === "price-low") {
        return (
          Number(a.price || 0) -
          Number(b.price || 0)
        );
      }

      if (sortBy === "price-high") {
        return (
          Number(b.price || 0) -
          Number(a.price || 0)
        );
      }

      if (sortBy === "popularity") {
        return (
          Number(b.rating || 0) -
          Number(a.rating || 0)
        );
      }

      if (a.isFeatured !== b.isFeatured) {
        return a.isFeatured ? -1 : 1;
      }

      return (a.name || "").localeCompare(
        b.name || ""
      );
    });
  }, [
    menuWithLiveMetadata,
    activeCategory,
    searchQuery,
    sortBy,
  ]);

  /* =========================================================
     PRODUCT ACTIONS
  ========================================================= */

  const openProduct = (item) => {
    setSelectedProduct(item);
    setPage("product");
  };

  const handleAdd = (item) => {
    if (!currentUser) {
      showToast(
        "Please log in to add items to your cart.",
        "error"
      );
      setPage("login");
      return;
    }

    addToCart(item);

    setAdded((prev) => ({
      ...prev,
      [item.id]: true,
    }));

    showToast(`${item.name} added to your cart.`);

    window.setTimeout(() => {
      setAdded((prev) => ({
        ...prev,
        [item.id]: false,
      }));
    }, 1200);
  };

  const toggleFavorite = async (item, event) => {
    event.stopPropagation();

    if (!currentUser) {
      showToast(
        "Please log in to save favourites.",
        "error"
      );
      setPage("login");
      return;
    }

    try {
      const favoriteRef = doc(
        db,
        "users",
        currentUser.uid,
        "favorites",
        String(item.id)
      );

      if (favorites.includes(item.id)) {
        await deleteDoc(favoriteRef);

        setFavorites((prev) =>
          prev.filter((id) => id !== item.id)
        );

        showToast(`${item.name} removed from favourites.`);
      } else {
        await setDoc(favoriteRef, {
          ...item,
          savedAt: Date.now(),
        });

        setFavorites((prev) => [...prev, item.id]);

        showToast(`${item.name} saved to favourites ♡`);
      }
    } catch (error) {
      console.error("Favorite error:", error);
      showToast(
        "Couldn't update favourites.",
        "error"
      );
    }
  };

  /* =========================================================
     FEATURED
  ========================================================= */

  const featuredProduct = useMemo(
    () =>
      menuWithLiveMetadata.find(
        (item) =>
          item.isFeatured &&
          item.available !== false
      ),
    [menuWithLiveMetadata]
  );

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Nunito:wght@500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,500;1,400&display=swap');

        :root {
          --brew-bg: #fffaf5;
          --brew-card: #ffffff;
          --brew-cream: #f8eee5;
          --brew-pink: #f7dfe0;
          --brew-pink-dark: #c77f82;
          --brew-brown: #3d281f;
          --brew-brown-soft: #6f5549;
          --brew-muted: #99867b;
          --brew-green: #dce8d8;
          --brew-green-dark: #61735c;
          --brew-yellow: #f5e7b8;
          --brew-line: #eee3da;
          --brew-shadow: 0 8px 28px rgba(76, 48, 33, 0.07);
        }

        * {
          box-sizing: border-box;
        }

        .brew-page {
          min-height: 100vh;
          background: var(--brew-bg);
          color: var(--brew-brown);
          font-family: 'DM Sans', sans-serif;
          overflow-x: hidden;
        }

        /* =====================================================
           HERO
        ===================================================== */

        .brew-hero {
          position: relative;
          padding: 22px 18px 35px;
        }

        .brew-hero-inner {
          position: relative;
          width: min(1180px, 100%);
          min-height: 390px;
          margin: auto;
          padding: 48px 48px;
          overflow: hidden;
          border-radius: 30px;
          background:
            radial-gradient(
              circle at 88% 20%,
              rgba(255,255,255,.8) 0 8%,
              transparent 9%
            ),
            linear-gradient(
              120deg,
              #f7e8dd 0%,
              #f9ddd9 50%,
              #f4e9da 100%
            );
        }

        .brew-hero-inner::before {
          content: "♡";
          position: absolute;
          right: 13%;
          top: 10%;
          color: rgba(190,119,120,.18);
          font-family: 'Playfair Display', serif;
          font-size: 110px;
          transform: rotate(-12deg);
        }

        .brew-hero-inner::after {
          content: "✦";
          position: absolute;
          right: 7%;
          bottom: 13%;
          color: rgba(190,119,120,.2);
          font-size: 30px;
        }

        .brew-hero-copy {
          position: relative;
          z-index: 2;
          max-width: 540px;
        }

        .brew-mini-label {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 12px;
          border-radius: 999px;
          background: rgba(255,255,255,.72);
          color: var(--brew-pink-dark);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .12em;
          text-transform: uppercase;
        }

        .brew-hero-title {
          margin: 20px 0 13px;
          font-family: 'Nunito', sans-serif;
          font-size: clamp(2.5rem, 6vw, 4.8rem);
          font-weight: 800;
          line-height: .98;
          letter-spacing: -.055em;
        }

        .brew-hero-title span {
          display: block;
          color: var(--brew-pink-dark);
          font-family: 'Playfair Display', serif;
          font-style: italic;
          font-weight: 400;
        }

        .brew-hero-subtitle {
          max-width: 390px;
          margin: 0;
          color: var(--brew-brown-soft);
          font-size: 13px;
          line-height: 1.7;
        }

        .brew-hero-sticker {
          position: absolute;
          right: 9%;
          bottom: 35px;
          z-index: 3;
          width: 90px;
          height: 90px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 15px;
          border-radius: 50%;
          background: var(--brew-brown);
          color: #fffaf5;
          font-family: 'Nunito', sans-serif;
          font-size: 10px;
          font-weight: 800;
          line-height: 1.25;
          text-align: center;
          transform: rotate(8deg);
          box-shadow: 0 10px 25px rgba(61,40,31,.16);
        }

        /* =====================================================
           SEARCH
        ===================================================== */

        .brew-search-section {
          width: min(1050px, calc(100% - 36px));
          margin: -2px auto 0;
          position: relative;
          z-index: 10;
        }

        .brew-search-box {
          position: relative;
          display: flex;
          align-items: center;
          height: 58px;
          padding: 0 18px;
          border: 1px solid var(--brew-line);
          border-radius: 18px;
          background: white;
          box-shadow: 0 9px 28px rgba(71,43,28,.08);
        }

        .brew-search-box > svg {
          flex: 0 0 auto;
          color: #b19d91;
        }

        .brew-search-box input {
          flex: 1;
          min-width: 0;
          height: 100%;
          padding: 0 12px;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--brew-brown);
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
        }

        .brew-search-box input::placeholder {
          color: #b7a69c;
        }

        .brew-clear {
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 50%;
          background: #f5eee9;
          color: #8e7b70;
          cursor: pointer;
        }

        /* =====================================================
           CATEGORY BAR
        ===================================================== */

        .brew-category-section {
          width: min(1180px, calc(100% - 36px));
          margin: 28px auto 0;
        }

        .brew-category-scroll {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          padding: 3px 2px 8px;
          scrollbar-width: none;
        }

        .brew-category-scroll::-webkit-scrollbar {
          display: none;
        }

        .brew-category {
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 16px;
          border: 1px solid var(--brew-line);
          border-radius: 999px;
          background: white;
          color: var(--brew-brown-soft);
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 600;
          transition: .2s ease;
        }

        .brew-category:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(61,40,31,.06);
        }

        .brew-category.active {
          border-color: var(--brew-brown);
          background: var(--brew-brown);
          color: white;
          box-shadow: 0 5px 15px rgba(61,40,31,.13);
        }

        /* =====================================================
           SECTION HEADER
        ===================================================== */

        .brew-section {
          width: min(1180px, calc(100% - 36px));
          margin: 45px auto 0;
        }

        .brew-section-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 20px;
        }

        .brew-section-heading-left {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .brew-section-heading h2 {
          margin: 0;
          font-family: 'Nunito', sans-serif;
          font-size: 23px;
          font-weight: 800;
          letter-spacing: -.025em;
        }

        .brew-section-heading p {
          margin: 5px 0 0;
          color: var(--brew-muted);
          font-size: 11px;
        }

        .brew-sort {
          position: relative;
        }

        .brew-sort select {
          appearance: none;
          padding: 9px 29px 9px 12px;
          border: 1px solid var(--brew-line);
          border-radius: 10px;
          outline: none;
          background: white;
          color: var(--brew-brown-soft);
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 10px;
        }

        .brew-sort svg {
          position: absolute;
          right: 9px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          color: #9f8d82;
        }

        /* =====================================================
           FEATURED STRIP
        ===================================================== */

        .brew-feature {
          display: grid;
          grid-template-columns: 1.1fr .9fr;
          overflow: hidden;
          min-height: 300px;
          margin-bottom: 42px;
          border: 1px solid var(--brew-line);
          border-radius: 24px;
          background: #fff;
          box-shadow: var(--brew-shadow);
        }

        .brew-feature-image {
          min-height: 300px;
          overflow: hidden;
          background: var(--brew-cream);
        }

        .brew-feature-image img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          transition: transform .5s ease;
        }

        .brew-feature:hover .brew-feature-image img {
          transform: scale(1.035);
        }

        .brew-feature-copy {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 38px;
          background:
            radial-gradient(
              circle at 90% 10%,
              #fff1e9 0 10%,
              transparent 11%
            ),
            #fff;
        }

        .brew-feature-tag {
          align-self: flex-start;
          padding: 6px 9px;
          border-radius: 999px;
          background: var(--brew-pink);
          color: #9e6063;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: .12em;
          text-transform: uppercase;
        }

        .brew-feature-copy h3 {
          margin: 15px 0 5px;
          font-family: 'Nunito', sans-serif;
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -.035em;
        }

        .brew-feature-copy p {
          max-width: 320px;
          margin: 0;
          color: var(--brew-muted);
          font-size: 11px;
          line-height: 1.65;
        }

        .brew-feature-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-top: 24px;
        }

        .brew-feature-price {
          font-family: 'Nunito', sans-serif;
          font-size: 18px;
          font-weight: 800;
        }

        .brew-feature-add {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 15px;
          border: 0;
          border-radius: 12px;
          background: var(--brew-brown);
          color: white;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 10px;
          font-weight: 700;
        }

        /* =====================================================
           PRODUCT GRID
        ===================================================== */

        .brew-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 18px;
          padding-bottom: 70px;
        }

        .brew-card {
          position: relative;
          min-width: 0;
          overflow: hidden;
          border: 1px solid var(--brew-line);
          border-radius: 20px;
          background: var(--brew-card);
          box-shadow: 0 4px 18px rgba(71,43,28,.045);
          cursor: pointer;
          transition:
            transform .25s ease,
            box-shadow .25s ease;
        }

        .brew-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 13px 30px rgba(71,43,28,.1);
        }

        .brew-image {
          position: relative;
          aspect-ratio: 1 / .92;
          overflow: hidden;
          background: var(--brew-cream);
        }

        .brew-image img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          transition: transform .45s ease;
        }

        .brew-card:hover .brew-image img {
          transform: scale(1.045);
        }

        .brew-image-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            radial-gradient(
              circle at center,
              #fff9f4 0,
              #f2e3d8 75%
            );
          font-size: 55px;
        }

        .brew-favorite {
          position: absolute;
          right: 10px;
          top: 10px;
          z-index: 5;
          width: 35px;
          height: 35px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 50%;
          background: rgba(255,255,255,.92);
          color: var(--brew-brown);
          cursor: pointer;
          box-shadow: 0 3px 10px rgba(61,40,31,.08);
          transition: .2s ease;
        }

        .brew-favorite:hover {
          transform: scale(1.08);
        }

        .brew-badge {
          position: absolute;
          left: 10px;
          top: 10px;
          z-index: 5;
          padding: 6px 8px;
          border-radius: 8px;
          background: var(--brew-yellow);
          color: #76613a;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: .06em;
          text-transform: uppercase;
        }

        .brew-badge.featured {
          background: var(--brew-pink);
          color: #965b60;
        }

        .brew-badge.out {
          top: auto;
          bottom: 10px;
          background: #8f4c47;
          color: white;
        }

        .brew-card-body {
          padding: 14px 14px 15px;
        }

        .brew-card-title-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }

        .brew-card-title {
          min-width: 0;
          margin: 0;
          color: var(--brew-brown);
          font-family: 'Nunito', sans-serif;
          font-size: 15px;
          font-weight: 800;
          line-height: 1.2;
        }

        .brew-price {
          flex: 0 0 auto;
          color: var(--brew-brown);
          font-family: 'Nunito', sans-serif;
          font-size: 14px;
          font-weight: 800;
        }

        .brew-description {
          display: -webkit-box;
          margin: 7px 0 11px;
          overflow: hidden;
          color: var(--brew-muted);
          font-size: 10px;
          line-height: 1.55;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .brew-card-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .brew-rating {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: var(--brew-muted);
          font-size: 9px;
          font-weight: 600;
        }

        .brew-rating-star {
          color: #d29b3f;
        }

        .brew-add {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          min-width: 62px;
          height: 32px;
          padding: 0 11px;
          border: 1px solid #e6d8cf;
          border-radius: 10px;
          background: #fffaf7;
          color: var(--brew-brown);
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .04em;
          transition: .2s ease;
        }

        .brew-add:hover {
          border-color: var(--brew-brown);
          background: var(--brew-brown);
          color: white;
        }

        .brew-add.added {
          border-color: #d6e2d1;
          background: var(--brew-green);
          color: var(--brew-green-dark);
        }

        .brew-add:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        /* =====================================================
           EMPTY / LOADING
        ===================================================== */

        .brew-loading {
          grid-column: 1 / -1;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
        }

        .brew-skeleton {
          height: 330px;
          overflow: hidden;
          border-radius: 20px;
          background: linear-gradient(
            100deg,
            #f3e9e1 30%,
            #fbf5ef 45%,
            #f3e9e1 60%
          );
          background-size: 200% 100%;
          animation: brewShimmer 1.4s infinite;
        }

        @keyframes brewShimmer {
          from { background-position: 200% 0; }
          to { background-position: -200% 0; }
        }

        .brew-empty {
          grid-column: 1 / -1;
          padding: 70px 20px;
          border: 1px dashed #e6d9d0;
          border-radius: 20px;
          background: white;
          text-align: center;
        }

        .brew-empty-icon {
          margin-bottom: 10px;
          color: #c99b9b;
        }

        .brew-empty h3 {
          margin: 0 0 7px;
          font-family: 'Nunito', sans-serif;
          font-size: 20px;
        }

        .brew-empty p {
          margin: 0 0 20px;
          color: var(--brew-muted);
          font-size: 11px;
        }

        .brew-reset {
          padding: 9px 15px;
          border: 0;
          border-radius: 10px;
          background: var(--brew-brown);
          color: white;
          cursor: pointer;
          font-size: 10px;
          font-weight: 700;
        }

        /* =====================================================
           TOASTS
        ===================================================== */

        .brew-toast-container {
          position: fixed;
          z-index: 9999;
          left: 50%;
          bottom: 20px;
          width: min(390px, calc(100% - 30px));
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          gap: 8px;
          pointer-events: none;
        }

        .brew-toast {
          padding: 13px 17px;
          border: 1px solid rgba(61,40,31,.08);
          border-radius: 14px;
          background: #3d281f;
          color: #fffaf5;
          box-shadow: 0 10px 35px rgba(61,40,31,.18);
          font-size: 11px;
          font-weight: 600;
          text-align: center;
          animation: brewToast .3s ease;
        }

        .brew-toast.error {
          background: #7d403d;
        }

        @keyframes brewToast {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* =====================================================
           TABLET
        ===================================================== */

        @media (max-width: 1000px) {
          .brew-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .brew-loading {
            grid-template-columns: repeat(3, 1fr);
          }

          .brew-feature {
            grid-template-columns: 1fr 1fr;
          }
        }

        /* =====================================================
           MOBILE
        ===================================================== */

        @media (max-width: 700px) {
          .brew-hero {
            padding: 12px 12px 28px;
          }

          .brew-hero-inner {
            min-height: 430px;
            padding: 35px 24px;
            border-radius: 25px;
          }

          .brew-hero-title {
            max-width: 320px;
            font-size: 42px;
          }

          .brew-hero-subtitle {
            max-width: 285px;
            font-size: 12px;
          }

          .brew-hero-sticker {
            right: 20px;
            bottom: 20px;
            width: 72px;
            height: 72px;
            font-size: 8px;
          }

          .brew-search-section {
            width: calc(100% - 24px);
          }

          .brew-search-box {
            height: 53px;
            border-radius: 16px;
          }

          .brew-category-section,
          .brew-section {
            width: calc(100% - 24px);
          }

          .brew-category-section {
            margin-top: 20px;
          }

          .brew-category {
            padding: 9px 13px;
            font-size: 10px;
          }

          .brew-section {
            margin-top: 33px;
          }

          .brew-section-heading h2 {
            font-size: 20px;
          }

          .brew-sort select {
            max-width: 105px;
          }

          .brew-feature {
            grid-template-columns: 1fr;
            border-radius: 20px;
          }

          .brew-feature-image {
            min-height: 220px;
            max-height: 270px;
          }

          .brew-feature-copy {
            padding: 25px;
          }

          .brew-feature-copy h3 {
            font-size: 24px;
          }

          .brew-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }

          .brew-card {
            border-radius: 17px;
          }

          .brew-image {
            aspect-ratio: .88;
          }

          .brew-card-body {
            padding: 11px;
          }

          .brew-card-title {
            font-size: 13px;
          }

          .brew-price {
            font-size: 12px;
          }

          .brew-description {
            font-size: 9px;
            margin-top: 6px;
          }

          .brew-add {
            min-width: 55px;
            height: 29px;
            padding: 0 8px;
            font-size: 8px;
          }

          .brew-favorite {
            width: 31px;
            height: 31px;
          }

          .brew-loading {
            grid-template-columns: repeat(2, 1fr);
          }

          .brew-skeleton {
            height: 280px;
          }
        }

        @media (max-width: 390px) {
          .brew-grid {
            grid-template-columns: 1fr;
          }

          .brew-image {
            aspect-ratio: 1.05;
          }

          .brew-description {
            display: -webkit-box;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: .01ms !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>

      {/* =====================================================
          TOASTS
      ===================================================== */}

      <div className="brew-toast-container" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`brew-toast ${toast.type}`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      <main className="brew-page">
        {/* ===================================================
            HERO
        =================================================== */}

        <section className="brew-hero">
          <div className="brew-hero-inner">
            <div className="brew-hero-copy">
              <span className="brew-mini-label">
                <Sparkles size={11} />
                Brewed Café
              </span>

              <h1 className="brew-hero-title">
                Your little
                <span>coffee break.</span>
              </h1>

              <p className="brew-hero-subtitle">
                Cozy drinks, comfort food and little treats —
                made fresh for your everyday moments.
              </p>
            </div>

            <div className="brew-hero-sticker">
              made with
              <br />
              ♡ & coffee
            </div>
          </div>
        </section>

        {/* ===================================================
            SEARCH
        =================================================== */}

        <section className="brew-search-section">
          <div className="brew-search-box">
            <Search size={18} />

            <input
              type="search"
              placeholder="Search for coffee, food or something sweet..."
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(event.target.value)
              }
              aria-label="Search menu"
            />

            {searchQuery && (
              <button
                type="button"
                className="brew-clear"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </section>

        {/* ===================================================
            CATEGORIES
        =================================================== */}

        <section className="brew-category-section">
          <div className="brew-category-scroll">
            {filters.map((category) => (
              <button
                key={category}
                type="button"
                className={`brew-category ${
                  activeCategory === category
                    ? "active"
                    : ""
                }`}
                onClick={() => setActiveCategory(category)}
              >
                {category === "All" && "♡ "}
                {category === "Bestselling" && "★ "}
                {category === "Featured" && "✦ "}
                {category}
              </button>
            ))}
          </div>
        </section>

        {/* ===================================================
            FEATURED
        =================================================== */}

        {!searchQuery.trim() &&
          activeCategory === "All" &&
          featuredProduct && (
            <section className="brew-section">
              <div className="brew-section-heading">
                <div>
                  <div className="brew-section-heading-left">
                    <h2>Something special</h2>
                    <Sparkles
                      size={15}
                      color="#c77f82"
                    />
                  </div>

                  <p>
                    A little favourite from the Brewed menu.
                  </p>
                </div>
              </div>

              <article
                className="brew-feature"
                onClick={() =>
                  openProduct(featuredProduct)
                }
              >
                <div className="brew-feature-image">
                  {featuredProduct.img ||
                  featuredProduct.image ? (
                    <img
                      src={
                        featuredProduct.img ||
                        featuredProduct.image
                      }
                      alt={featuredProduct.name}
                    />
                  ) : (
                    <div className="brew-image-fallback">
                      {featuredProduct.emoji || "☕"}
                    </div>
                  )}
                </div>

                <div className="brew-feature-copy">
                  <span className="brew-feature-tag">
                    ✦ Brewed favourite
                  </span>

                  <h3>{featuredProduct.name}</h3>

                  <p>
                    {featuredProduct.desc ||
                      "A little something lovely, freshly made just for you."}
                  </p>

                  <div className="brew-feature-bottom">
                    <span className="brew-feature-price">
                      ₹
                      {Math.round(
                        Number(
                          featuredProduct.price || 0
                        )
                      )}
                    </span>

                    <button
                      type="button"
                      className="brew-feature-add"
                      disabled={
                        featuredProduct.available === false
                      }
                      onClick={(event) => {
                        event.stopPropagation();

                        if (
                          featuredProduct.available !==
                          false
                        ) {
                          handleAdd(featuredProduct);
                        }
                      }}
                    >
                      {added[featuredProduct.id] ? (
                        <>
                          <Check size={13} />
                          Added
                        </>
                      ) : (
                        <>
                          <Plus size={13} />
                          Add
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </article>
            </section>
          )}

        {/* ===================================================
            MENU
        =================================================== */}

        <section className="brew-section">
          <div className="brew-section-heading">
            <div>
              <div className="brew-section-heading-left">
                <h2>
                  {activeCategory === "All"
                    ? "What are you craving?"
                    : activeCategory}
                </h2>
              </div>

              <p>
                {filteredItems.length}{" "}
                {filteredItems.length === 1
                  ? "item"
                  : "items"}{" "}
                to choose from ♡
              </p>
            </div>

            <div className="brew-sort">
              <select
                value={sortBy}
                onChange={(event) =>
                  setSortBy(event.target.value)
                }
                aria-label="Sort menu"
              >
                <option value="default">Recommended</option>
                <option value="price-low">
                  Price: Low
                </option>
                <option value="price-high">
                  Price: High
                </option>
                <option value="popularity">
                  Highest Rated
                </option>
              </select>

              <ChevronDown size={12} />
            </div>
          </div>

          <div className="brew-grid">
            {loading ? (
              <div className="brew-loading">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    className="brew-skeleton"
                    key={i}
                  />
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="brew-empty">
                <div className="brew-empty-icon">
                  <Sparkles size={27} />
                </div>

                <h3>Hmm... nothing here ♡</h3>

                <p>
                  Try searching for something else or browse
                  the whole menu.
                </p>

                <button
                  type="button"
                  className="brew-reset"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveCategory("All");
                  }}
                >
                  Browse everything
                </button>
              </div>
            ) : (
              filteredItems.map((item) => {
                const image =
                  item.img || item.image || null;

                const isFavorite = favorites.includes(
                  item.id
                );

                return (
                  <article
                    key={item.id}
                    className="brew-card"
                    onClick={() => openProduct(item)}
                  >
                    <div className="brew-image">
                      {image ? (
                        <img
                          src={image}
                          alt={item.name}
                          loading="lazy"
                        />
                      ) : (
                        <div className="brew-image-fallback">
                          {item.emoji || "☕"}
                        </div>
                      )}

                      {item.isFeatured && (
                        <span className="brew-badge featured">
                          ✦ Featured
                        </span>
                      )}

                      {!item.isFeatured &&
                        item.isBestSeller && (
                          <span className="brew-badge">
                            ★ Bestseller
                          </span>
                        )}

                      {item.available === false && (
                        <span className="brew-badge out">
                          Out of stock
                        </span>
                      )}

                      <button
                        type="button"
                        className="brew-favorite"
                        aria-label={
                          isFavorite
                            ? `Remove ${item.name} from favourites`
                            : `Save ${item.name} to favourites`
                        }
                        onClick={(event) =>
                          toggleFavorite(item, event)
                        }
                      >
                        <Heart
                          size={16}
                          strokeWidth={1.8}
                          fill={
                            isFavorite
                              ? "currentColor"
                              : "none"
                          }
                        />
                      </button>
                    </div>

                    <div className="brew-card-body">
                      <div className="brew-card-title-row">
                        <h3 className="brew-card-title">
                          {item.name}
                        </h3>

                        <span className="brew-price">
                          ₹
                          {Math.round(
                            Number(item.price || 0)
                          )}
                        </span>
                      </div>

                      {item.desc && (
                        <p className="brew-description">
                          {item.desc}
                        </p>
                      )}

                      <div className="brew-card-bottom">
                        <div className="brew-rating">
                          {item.rating > 0 ? (
                            <>
                              <Star
                                size={11}
                                className="brew-rating-star"
                                fill="currentColor"
                              />

                              <span>
                                {item.rating}
                              </span>

                              {item.reviews > 0 && (
                                <span>
                                  ({item.reviews})
                                </span>
                              )}
                            </>
                          ) : (
                            <span>New ♡</span>
                          )}
                        </div>

                        <button
                          type="button"
                          className={`brew-add ${
                            added[item.id]
                              ? "added"
                              : ""
                          }`}
                          disabled={
                            item.available === false
                          }
                          onClick={(event) => {
                            event.stopPropagation();

                            if (
                              item.available !== false
                            ) {
                              handleAdd(item);
                            }
                          }}
                        >
                          {item.available === false ? (
                            "Unavailable"
                          ) : added[item.id] ? (
                            <>
                              <Check size={12} />
                              Added
                            </>
                          ) : (
                            <>
                              <Plus size={12} />
                              Add
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </main>
    </>
  );
}
