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
  ChevronDown,
  Heart,
  Search,
  X,
  ArrowUpRight,
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

  /* -------------------------------------------------------
     TOASTS
  ------------------------------------------------------- */

  const showToast = (message, type = "success") => {
    const id = `${Date.now()}-${Math.random()}`;

    setToasts((prev) => [...prev, { id, message, type }]);

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 2800);
  };

  /* -------------------------------------------------------
     FETCH MENU
  ------------------------------------------------------- */

  useEffect(() => {
    let mounted = true;

    const fetchMenu = async () => {
      try {
        const snapshot = await getDocs(collection(db, "menu"));

        if (!mounted) return;

        const items = snapshot.docs.map((itemDoc) => ({
          id: itemDoc.id,
          firestoreId: itemDoc.id,
          ...itemDoc.data(),
        }));

        const topSelling = [...items]
          .sort(
            (a, b) =>
              Number(b.salesCount || 0) - Number(a.salesCount || 0)
          )
          .slice(0, 5);

        setBestSellerIds(topSelling.map((item) => item.firestoreId));
        setMenuItems(items);
      } catch (error) {
        console.error("Error fetching menu:", error);
        showToast("Unable to load the menu.", "error");
      }
    };

    if (db) {
      fetchMenu();
    }

    return () => {
      mounted = false;
    };
  }, []);

  /* -------------------------------------------------------
     LOAD FAVORITES
  ------------------------------------------------------- */

  useEffect(() => {
    if (!currentUser) {
      setFavorites([]);
      return;
    }

    let mounted = true;

    const loadFavorites = async () => {
      try {
        const snapshot = await getDocs(
          collection(db, "users", currentUser.uid, "favorites")
        );

        if (!mounted) return;

        setFavorites(snapshot.docs.map((favoriteDoc) => favoriteDoc.id));
      } catch (error) {
        console.error("Error loading favorites:", error);
      }
    };

    loadFavorites();

    return () => {
      mounted = false;
    };
  }, [currentUser]);

  /* -------------------------------------------------------
     REVIEW STATS
  ------------------------------------------------------- */

  useEffect(() => {
    let mounted = true;

    const fetchReviewStats = async () => {
      try {
        const snapshot = await getDocs(collection(db, "reviews"));

        const stats = {};

        snapshot.docs.forEach((reviewDoc) => {
          const review = reviewDoc.data();
          const productId = review.productId;

          if (!productId) return;

          if (!stats[productId]) {
            stats[productId] = {
              total: 0,
              rating: 0,
            };
          }

          stats[productId].total += 1;
          stats[productId].rating += Number(review.rating || 0);
        });

        Object.keys(stats).forEach((id) => {
          stats[id].rating =
            stats[id].total > 0
              ? Number(
                  (stats[id].rating / stats[id].total).toFixed(1)
                )
              : 0;
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

  /* -------------------------------------------------------
     LIVE PRODUCT METADATA
  ------------------------------------------------------- */

  const menuWithLiveMetadata = useMemo(() => {
    return menuItems.map((item) => {
      const liveReview = reviewStats[item.id];

      return {
        ...item,
        isBestSeller: bestSellerIds.includes(item.firestoreId),
        rating: liveReview ? Number(liveReview.rating) : 0,
        reviews: liveReview ? liveReview.total : 0,
      };
    });
  }, [menuItems, reviewStats, bestSellerIds]);

  /* -------------------------------------------------------
     FILTER + SORT
  ------------------------------------------------------- */

  const sortedAndFiltered = useMemo(() => {
    const cleanSearch = searchQuery.toLowerCase().trim();

    const filtered = menuWithLiveMetadata.filter((item) => {
      const matchesSearch =
        !cleanSearch ||
        item.name?.toLowerCase().includes(cleanSearch) ||
        item.desc?.toLowerCase().includes(cleanSearch) ||
        item.category?.toLowerCase().includes(cleanSearch);

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
        return Number(a.price || 0) - Number(b.price || 0);
      }

      if (sortBy === "price-high") {
        return Number(b.price || 0) - Number(a.price || 0);
      }

      if (sortBy === "popularity") {
        return Number(b.rating || 0) - Number(a.rating || 0);
      }

      if (a.isFeatured !== b.isFeatured) {
        return a.isFeatured ? -1 : 1;
      }

      return (a.name || "").localeCompare(b.name || "");
    });
  }, [
    menuWithLiveMetadata,
    searchQuery,
    activeCategory,
    sortBy,
  ]);

  /* -------------------------------------------------------
     ACTIONS
  ------------------------------------------------------- */

  const openProduct = (item) => {
    setSelectedProduct(item);
    setPage("product");
  };

  const handleAdd = (item) => {
    if (!currentUser) {
      showToast("Log in to add items to your order.", "error");
      setPage("login");
      return;
    }

    addToCart(item);

    showToast(`${item.name} added to your order.`);

    setAdded((prev) => ({
      ...prev,
      [item.id]: true,
    }));

    window.setTimeout(() => {
      setAdded((prev) => ({
        ...prev,
        [item.id]: false,
      }));
    }, 1100);
  };

  const toggleFavorite = async (item, event) => {
    event.stopPropagation();

    if (!currentUser) {
      showToast("Log in to save your favourites.", "error");
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

        showToast(`${item.name} saved to favourites.`);
      }
    } catch (error) {
      console.error("Favorite update failed:", error);
      showToast("Couldn't update favourites.", "error");
    }
  };

  /* -------------------------------------------------------
     FEATURED PRODUCT
  ------------------------------------------------------- */

  const featuredProduct =
    menuWithLiveMetadata.find(
      (item) => item.isFeatured && item.available !== false
    ) || menuWithLiveMetadata[0];

  const regularProducts = sortedAndFiltered;

  /* -------------------------------------------------------
     RENDER
  ------------------------------------------------------- */

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap');

        :root {
          --brew-ink: #24150f;
          --brew-brown: #43281b;
          --brew-muted: #897365;
          --brew-caramel: #b9895e;
          --brew-cream: #f7f2ea;
          --brew-paper: #fbf8f3;
          --brew-line: rgba(36, 21, 15, 0.11);
          --brew-white: #fffdf9;
        }

        * {
          box-sizing: border-box;
        }

        .brew-menu {
          min-height: 100vh;
          background: var(--brew-paper);
          color: var(--brew-ink);
          font-family: 'DM Sans', sans-serif;
          overflow-x: hidden;
        }

        /* -----------------------------------------------
           HERO
        ----------------------------------------------- */

        .brew-hero {
          position: relative;
          min-height: min(720px, 82vh);
          display: flex;
          align-items: flex-end;
          overflow: hidden;
          background: #2b1910;
        }

        .brew-hero-image {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          opacity: 0.72;
          transform: scale(1.01);
        }

        .brew-hero::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(
              180deg,
              rgba(22, 11, 6, 0.05) 15%,
              rgba(22, 11, 6, 0.18) 42%,
              rgba(22, 11, 6, 0.86) 100%
            );
        }

        .brew-hero-content {
          position: relative;
          z-index: 2;
          width: min(1200px, calc(100% - 48px));
          margin: 0 auto;
          padding: 90px 0 72px;
        }

        .brew-hero-kicker {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 22px;
          color: #e7c7a7;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
        }

        .brew-hero-kicker::before {
          content: "";
          width: 34px;
          height: 1px;
          background: #d7ad84;
        }

        .brew-hero-title {
          max-width: 800px;
          margin: 0;
          color: #fffaf3;
          font-family: 'Playfair Display', serif;
          font-size: clamp(3.8rem, 9vw, 7.8rem);
          font-weight: 400;
          line-height: 0.88;
          letter-spacing: -0.055em;
        }

        .brew-hero-title em {
          font-weight: 400;
        }

        .brew-hero-bottom {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 40px;
          margin-top: 36px;
        }

        .brew-hero-description {
          max-width: 390px;
          margin: 0;
          color: rgba(255, 250, 243, 0.76);
          font-size: 14px;
          line-height: 1.7;
        }

        .brew-hero-note {
          color: rgba(255, 250, 243, 0.58);
          font-size: 10px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        /* -----------------------------------------------
           MENU INTRO
        ----------------------------------------------- */

        .brew-menu-shell {
          width: min(1200px, calc(100% - 48px));
          margin: 0 auto;
        }

        .brew-intro {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 80px;
          padding: 105px 0 65px;
          align-items: end;
        }

        .brew-section-kicker {
          margin: 0 0 16px;
          color: var(--brew-caramel);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }

        .brew-section-title {
          margin: 0;
          font-family: 'Playfair Display', serif;
          font-size: clamp(2.5rem, 5vw, 4.4rem);
          font-weight: 400;
          line-height: 0.98;
          letter-spacing: -0.04em;
        }

        .brew-intro-copy {
          max-width: 390px;
          justify-self: end;
          color: var(--brew-muted);
          font-size: 13px;
          line-height: 1.8;
        }

        .brew-intro-copy p {
          margin: 0;
        }

        /* -----------------------------------------------
           CATEGORY NAV
        ----------------------------------------------- */

        .brew-controls {
          position: sticky;
          top: 0;
          z-index: 40;
          background: rgba(251, 248, 243, 0.94);
          backdrop-filter: blur(18px);
          border-top: 1px solid var(--brew-line);
          border-bottom: 1px solid var(--brew-line);
        }

        .brew-controls-inner {
          width: min(1200px, calc(100% - 48px));
          margin: 0 auto;
          min-height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 25px;
        }

        .brew-categories {
          display: flex;
          align-items: center;
          gap: 28px;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .brew-categories::-webkit-scrollbar {
          display: none;
        }

        .brew-category {
          position: relative;
          flex: 0 0 auto;
          padding: 26px 0 23px;
          border: 0;
          background: transparent;
          color: #8e7c70;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          transition: color 180ms ease;
        }

        .brew-category::after {
          content: "";
          position: absolute;
          left: 0;
          right: 100%;
          bottom: -1px;
          height: 1px;
          background: var(--brew-ink);
          transition: right 220ms ease;
        }

        .brew-category:hover,
        .brew-category.active {
          color: var(--brew-ink);
        }

        .brew-category.active::after {
          right: 0;
        }

        .brew-tools {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 0 0 auto;
        }

        .brew-search {
          position: relative;
          width: 210px;
        }

        .brew-search input {
          width: 100%;
          height: 38px;
          padding: 0 34px 0 14px;
          border: 1px solid var(--brew-line);
          border-radius: 0;
          outline: none;
          background: transparent;
          color: var(--brew-ink);
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          transition: border-color 180ms ease;
        }

        .brew-search input:focus {
          border-color: rgba(36, 21, 15, 0.45);
        }

        .brew-search svg {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #9c8a7c;
        }

        .brew-search-clear {
          position: absolute;
          right: 7px;
          top: 50%;
          transform: translateY(-50%);
          width: 25px;
          height: 25px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 0;
          background: transparent;
          color: #8e7c70;
          cursor: pointer;
        }

        .brew-sort {
          position: relative;
        }

        .brew-sort select {
          height: 38px;
          padding: 0 30px 0 12px;
          border: 1px solid var(--brew-line);
          border-radius: 0;
          outline: none;
          appearance: none;
          background: transparent;
          color: var(--brew-ink);
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
        }

        .brew-sort svg {
          position: absolute;
          right: 9px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
        }

        /* -----------------------------------------------
           FEATURED EDITORIAL
        ----------------------------------------------- */

        .brew-feature {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          min-height: 520px;
          margin: 70px 0 110px;
          background: var(--brew-cream);
        }

        .brew-feature-image {
          position: relative;
          overflow: hidden;
          cursor: pointer;
        }

        .brew-feature-image img {
          width: 100%;
          height: 100%;
          min-height: 520px;
          display: block;
          object-fit: cover;
          transition: transform 700ms cubic-bezier(.16,1,.3,1);
        }

        .brew-feature-image:hover img {
          transform: scale(1.035);
        }

        .brew-feature-badge {
          position: absolute;
          top: 22px;
          left: 22px;
          padding: 9px 12px;
          background: rgba(255, 253, 249, 0.9);
          color: var(--brew-ink);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .brew-feature-content {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 65px;
        }

        .brew-feature-kicker {
          margin-bottom: 20px;
          color: var(--brew-caramel);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }

        .brew-feature-name {
          margin: 0;
          font-family: 'Playfair Display', serif;
          font-size: clamp(2.5rem, 4vw, 4.2rem);
          font-weight: 400;
          line-height: 0.98;
          letter-spacing: -0.045em;
          cursor: pointer;
        }

        .brew-feature-description {
          max-width: 330px;
          margin: 25px 0 30px;
          color: var(--brew-muted);
          font-size: 13px;
          line-height: 1.8;
        }

        .brew-feature-meta {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 34px;
        }

        .brew-feature-price {
          font-family: 'Playfair Display', serif;
          font-size: 23px;
        }

        .brew-feature-rating {
          color: var(--brew-muted);
          font-size: 11px;
        }

        .brew-feature-action {
          align-self: flex-start;
          display: inline-flex;
          align-items: center;
          gap: 13px;
          padding: 13px 0;
          border: 0;
          border-bottom: 1px solid var(--brew-ink);
          background: transparent;
          color: var(--brew-ink);
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        /* -----------------------------------------------
           GRID
        ----------------------------------------------- */

        .brew-grid-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 35px;
        }

        .brew-grid-heading {
          margin: 0;
          font-family: 'Playfair Display', serif;
          font-size: 34px;
          font-weight: 400;
          letter-spacing: -0.035em;
        }

        .brew-grid-count {
          color: #9a897d;
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .brew-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          column-gap: 25px;
          row-gap: 80px;
          padding-bottom: 120px;
        }

        .brew-product {
          position: relative;
          cursor: pointer;
        }

        .brew-product-image-wrap {
          position: relative;
          overflow: hidden;
          aspect-ratio: 0.82;
          background: #eee5db;
        }

        .brew-product-image-wrap::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(0,0,0,0.03),
            transparent 35%,
            rgba(0,0,0,0.05)
          );
          pointer-events: none;
        }

        .brew-product-image {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          transition: transform 650ms cubic-bezier(.16,1,.3,1);
        }

        .brew-product:hover .brew-product-image {
          transform: scale(1.045);
        }

        .brew-product-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            radial-gradient(circle at 50% 35%, #fff9f1 0%, #eee1d3 70%);
          font-size: 56px;
        }

        .brew-product-heart {
          position: absolute;
          top: 14px;
          right: 14px;
          z-index: 5;
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 50%;
          background: rgba(255, 253, 249, 0.92);
          color: var(--brew-ink);
          cursor: pointer;
          transition: transform 180ms ease, background 180ms ease;
        }

        .brew-product-heart:hover {
          transform: scale(1.08);
          background: #fff;
        }

        .brew-product-label {
          position: absolute;
          z-index: 4;
          top: 15px;
          left: 15px;
          padding: 7px 10px;
          background: var(--brew-ink);
          color: #fffaf3;
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        .brew-product-label.featured {
          background: #d7b08d;
          color: var(--brew-ink);
        }

        .brew-product-label.out {
          top: auto;
          bottom: 15px;
          left: 15px;
          background: #7d241d;
        }

        .brew-product-info {
          padding: 19px 2px 0;
        }

        .brew-product-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
        }

        .brew-product-name {
          margin: 0;
          font-family: 'Playfair Display', serif;
          font-size: 23px;
          font-weight: 500;
          line-height: 1.05;
          letter-spacing: -0.025em;
        }

        .brew-product-price {
          padding-top: 3px;
          color: var(--brew-brown);
          font-family: 'Playfair Display', serif;
          font-size: 16px;
          white-space: nowrap;
        }

        .brew-product-description {
          max-width: 380px;
          margin: 9px 0 13px;
          color: var(--brew-muted);
          font-size: 11px;
          line-height: 1.65;
        }

        .brew-product-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
        }

        .brew-rating {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #8c7767;
          font-size: 10px;
        }

        .brew-rating-star {
          color: var(--brew-caramel);
        }

        .brew-add {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 0;
          border: 0;
          border-bottom: 1px solid rgba(36, 21, 15, 0.3);
          background: transparent;
          color: var(--brew-ink);
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          transition: border-color 180ms ease, color 180ms ease;
        }

        .brew-add:hover {
          border-color: var(--brew-ink);
        }

        .brew-add.added {
          color: #8b684b;
          border-color: #8b684b;
        }

        .brew-add:disabled {
          cursor: not-allowed;
          color: #9c8e85;
          border-color: rgba(36,21,15,0.1);
        }

        /* -----------------------------------------------
           EMPTY
        ----------------------------------------------- */

        .brew-empty {
          grid-column: 1 / -1;
          padding: 100px 20px;
          text-align: center;
          border-top: 1px solid var(--brew-line);
        }

        .brew-empty-title {
          margin: 0 0 10px;
          font-family: 'Playfair Display', serif;
          font-size: 34px;
          font-weight: 400;
        }

        .brew-empty-copy {
          margin: 0 0 25px;
          color: var(--brew-muted);
          font-size: 12px;
        }

        .brew-empty-button {
          padding: 11px 20px;
          border: 1px solid var(--brew-ink);
          background: transparent;
          color: var(--brew-ink);
          cursor: pointer;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        /* -----------------------------------------------
           TOAST
        ----------------------------------------------- */

        .brew-toast-container {
          position: fixed;
          z-index: 9999;
          left: 50%;
          bottom: 24px;
          width: min(390px, calc(100% - 32px));
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          gap: 8px;
          pointer-events: none;
        }

        .brew-toast {
          padding: 15px 18px;
          background: #28160e;
          color: #fffaf3;
          box-shadow: 0 15px 45px rgba(36,21,15,0.2);
          font-size: 11px;
          text-align: center;
          animation: brewToastIn 350ms cubic-bezier(.16,1,.3,1);
        }

        .brew-toast.error {
          border-left: 2px solid #c35d52;
        }

        .brew-toast.success {
          border-left: 2px solid #c49a70;
        }

        @keyframes brewToastIn {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* -----------------------------------------------
           TABLET
        ----------------------------------------------- */

        @media (max-width: 900px) {
          .brew-hero {
            min-height: 620px;
          }

          .brew-intro {
            grid-template-columns: 1fr;
            gap: 25px;
            padding: 75px 0 50px;
          }

          .brew-intro-copy {
            justify-self: start;
          }

          .brew-controls-inner {
            display: block;
            padding: 0;
          }

          .brew-categories {
            padding-right: 5px;
          }

          .brew-tools {
            display: none;
          }

          .brew-feature {
            grid-template-columns: 1fr;
            margin: 50px 0 85px;
          }

          .brew-feature-image img {
            min-height: 420px;
          }

          .brew-feature-content {
            padding: 45px;
          }

          .brew-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            row-gap: 55px;
          }
        }

        /* -----------------------------------------------
           MOBILE
        ----------------------------------------------- */

        @media (max-width: 600px) {
          .brew-menu-shell,
          .brew-controls-inner,
          .brew-hero-content {
            width: calc(100% - 30px);
          }

          .brew-hero {
            min-height: 610px;
          }

          .brew-hero-content {
            padding-bottom: 45px;
          }

          .brew-hero-title {
            font-size: clamp(3.5rem, 17vw, 5.2rem);
          }

          .brew-hero-description {
            max-width: 290px;
            font-size: 12px;
          }

          .brew-hero-note {
            display: none;
          }

          .brew-intro {
            padding: 70px 0 42px;
          }

          .brew-section-title {
            font-size: 42px;
          }

          .brew-category {
            padding: 20px 0 18px;
          }

          .brew-feature {
            margin: 38px 0 75px;
          }

          .brew-feature-image img {
            min-height: 360px;
          }

          .brew-feature-content {
            padding: 36px 27px 42px;
          }

          .brew-feature-name {
            font-size: 43px;
          }

          .brew-grid-header {
            margin-bottom: 25px;
          }

          .brew-grid-heading {
            font-size: 29px;
          }

          .brew-grid {
            grid-template-columns: 1fr 1fr;
            column-gap: 13px;
            row-gap: 43px;
            padding-bottom: 75px;
          }

          .brew-product-image-wrap {
            aspect-ratio: 0.78;
          }

          .brew-product-heart {
            width: 32px;
            height: 32px;
            top: 9px;
            right: 9px;
          }

          .brew-product-heart svg {
            width: 16px;
            height: 16px;
          }

          .brew-product-label {
            top: 9px;
            left: 9px;
            padding: 6px 7px;
            font-size: 7px;
          }

          .brew-product-label.out {
            bottom: 9px;
            left: 9px;
          }

          .brew-product-info {
            padding-top: 13px;
          }

          .brew-product-top {
            display: block;
          }

          .brew-product-name {
            font-size: 18px;
          }

          .brew-product-price {
            display: block;
            margin-top: 6px;
            font-size: 14px;
          }

          .brew-product-description {
            display: none;
          }

          .brew-product-bottom {
            margin-top: 12px;
          }

          .brew-rating {
            font-size: 9px;
          }

          .brew-add {
            font-size: 8px;
          }
        }

        @media (max-width: 390px) {
          .brew-grid {
            grid-template-columns: 1fr;
          }

          .brew-product-image-wrap {
            aspect-ratio: 1 / 0.92;
          }

          .brew-product-description {
            display: block;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .brew-product-image,
          .brew-feature-image img,
          .brew-add,
          .brew-category,
          .brew-product-heart {
            transition: none !important;
          }

          .brew-toast {
            animation: none;
          }
        }
      `}</style>

      {/* TOASTS */}
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

      <main className="brew-menu">
        {/* =====================================================
            HERO
        ===================================================== */}

        <section className="brew-hero">
          {featuredProduct?.img || featuredProduct?.image ? (
            <img
              className="brew-hero-image"
              src={featuredProduct.img || featuredProduct.image}
              alt=""
              aria-hidden="true"
            />
          ) : null}

          <div className="brew-hero-content">
            <div className="brew-hero-kicker">
              Brewed · Est. 2024 · Kolkata
            </div>

            <h1 className="brew-hero-title">
              Good coffee.
              <br />
              <em>Good company.</em>
            </h1>

            <div className="brew-hero-bottom">
              <p className="brew-hero-description">
                Specialty coffee, slow mornings and things worth
                staying for. Explore our menu, made fresh every day.
              </p>

              <span className="brew-hero-note">
                Coffee · Food · Moments
              </span>
            </div>
          </div>
        </section>

        {/* =====================================================
            INTRO
        ===================================================== */}

        <section className="brew-menu-shell brew-intro">
          <div>
            <p className="brew-section-kicker">
              The Brewed Menu
            </p>

            <h2 className="brew-section-title">
              Made with intention.
              <br />
              Served with warmth.
            </h2>
          </div>

          <div className="brew-intro-copy">
            <p>
              From carefully brewed coffee to comforting plates and
              little indulgences, every item on our menu is chosen
              to make your time here a little better.
            </p>
          </div>
        </section>

        {/* =====================================================
            CONTROLS
        ===================================================== */}

        <div className="brew-controls">
          <div className="brew-controls-inner">
            <nav
              className="brew-categories"
              aria-label="Menu categories"
            >
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
                  {category}
                </button>
              ))}
            </nav>

            <div className="brew-tools">
              <div className="brew-search">
                <Search size={14} />

                <input
                  type="search"
                  aria-label="Search menu"
                  placeholder="Search menu"
                  value={searchQuery}
                  onChange={(event) =>
                    setSearchQuery(event.target.value)
                  }
                />

                {searchQuery && (
                  <button
                    type="button"
                    className="brew-search-clear"
                    aria-label="Clear search"
                    onClick={() => setSearchQuery("")}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="brew-sort">
                <select
                  aria-label="Sort menu"
                  value={sortBy}
                  onChange={(event) =>
                    setSortBy(event.target.value)
                  }
                >
                  <option value="default">Curated</option>
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

                <ChevronDown size={13} />
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================
            FEATURED EDITORIAL
        ===================================================== */}

        {activeCategory === "All" &&
          !searchQuery.trim() &&
          featuredProduct && (
            <section className="brew-menu-shell">
              <article className="brew-feature">
                <div
                  className="brew-feature-image"
                  onClick={() =>
                    openProduct(featuredProduct)
                  }
                >
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
                    <div className="brew-product-fallback">
                      {featuredProduct.emoji || "☕"}
                    </div>
                  )}

                  <span className="brew-feature-badge">
                    Our pick
                  </span>
                </div>

                <div className="brew-feature-content">
                  <div className="brew-feature-kicker">
                    Featured today
                  </div>

                  <h2
                    className="brew-feature-name"
                    onClick={() =>
                      openProduct(featuredProduct)
                    }
                  >
                    {featuredProduct.name}
                  </h2>

                  <p className="brew-feature-description">
                    {featuredProduct.desc ||
                      "Something special, made fresh and served just the way we like it."}
                  </p>

                  <div className="brew-feature-meta">
                    <span className="brew-feature-price">
                      ₹
                      {Math.round(
                        Number(featuredProduct.price || 0)
                      )}
                    </span>

                    {featuredProduct.rating > 0 && (
                      <span className="brew-feature-rating">
                        ★ {featuredProduct.rating}
                        {featuredProduct.reviews
                          ? ` · ${featuredProduct.reviews} reviews`
                          : ""}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="brew-feature-action"
                    onClick={() =>
                      handleAdd(featuredProduct)
                    }
                    disabled={
                      featuredProduct.available === false
                    }
                  >
                    {featuredProduct.available === false
                      ? "Currently unavailable"
                      : added[featuredProduct.id]
                      ? "Added to your order"
                      : "Add to order"}

                    <ArrowUpRight size={14} />
                  </button>
                </div>
              </article>
            </section>
          )}

        {/* =====================================================
            PRODUCT GRID
        ===================================================== */}

        <section className="brew-menu-shell">
          <div className="brew-grid-header">
            <h2 className="brew-grid-heading">
              {activeCategory === "All"
                ? "The menu"
                : activeCategory}
            </h2>

            <span className="brew-grid-count">
              {regularProducts.length}{" "}
              {regularProducts.length === 1
                ? "item"
                : "items"}
            </span>
          </div>

          <div className="brew-grid">
            {regularProducts.length === 0 ? (
              <div className="brew-empty">
                <h3 className="brew-empty-title">
                  Nothing here yet.
                </h3>

                <p className="brew-empty-copy">
                  Try another search or browse the full menu.
                </p>

                <button
                  type="button"
                  className="brew-empty-button"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveCategory("All");
                  }}
                >
                  View everything
                </button>
              </div>
            ) : (
              regularProducts.map((item) => {
                const isFavorite = favorites.includes(
                  item.id
                );

                const image =
                  item.img || item.image || null;

                return (
                  <article
                    key={item.id}
                    className="brew-product"
                    onClick={() => openProduct(item)}
                  >
                    <div className="brew-product-image-wrap">
                      {image ? (
                        <img
                          className="brew-product-image"
                          src={image}
                          alt={item.name}
                          loading="lazy"
                        />
                      ) : (
                        <div className="brew-product-fallback">
                          {item.emoji || "☕"}
                        </div>
                      )}

                      {item.isFeatured && (
                        <span className="brew-product-label featured">
                          Featured
                        </span>
                      )}

                      {!item.isFeatured &&
                        item.isBestSeller && (
                          <span className="brew-product-label">
                            Best seller
                          </span>
                        )}

                      {item.available === false && (
                        <span className="brew-product-label out">
                          Out of stock
                        </span>
                      )}

                      <button
                        type="button"
                        className="brew-product-heart"
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
                          size={17}
                          strokeWidth={1.7}
                          fill={
                            isFavorite
                              ? "currentColor"
                              : "none"
                          }
                        />
                      </button>
                    </div>

                    <div className="brew-product-info">
                      <div className="brew-product-top">
                        <h3 className="brew-product-name">
                          {item.name}
                        </h3>

                        <span className="brew-product-price">
                          ₹
                          {Math.round(
                            Number(item.price || 0)
                          )}
                        </span>
                      </div>

                      {item.desc && (
                        <p className="brew-product-description">
                          {item.desc}
                        </p>
                      )}

                      <div className="brew-product-bottom">
                        <div className="brew-rating">
                          {item.rating > 0 ? (
                            <>
                              <span className="brew-rating-star">
                                ★
                              </span>

                              <span>
                                {item.rating}
                                {item.reviews
                                  ? ` (${item.reviews})`
                                  : ""}
                              </span>
                            </>
                          ) : (
                            <span>New</span>
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
                          {item.available === false
                            ? "Unavailable"
                            : added[item.id]
                            ? "Added ✓"
                            : "Add"}
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
