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
  Check,
  ChevronDown,
  Heart,
  Search,
  Sparkles,
  X,
} from "lucide-react";

export default function MenuPage({ setPage, setSelectedProduct }) {
  const { addToCart } = useCart();
  const { currentUser } = useAuth();

  const [activeCategory, setActiveCategory] = useState("All");
  const [sortBy, setSortBy] = useState("default");
  const [searchQuery, setSearchQuery] = useState("");
  const [added, setAdded] = useState({});
  const [favorites, setFavorites] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [reviewStats, setReviewStats] = useState({});
  const [bestSellerIds, setBestSellerIds] = useState([]);
  const [toasts, setToasts] = useState([]);

  const filters = [
    "All",
    "Bestselling",
    "Featured",
    "Coffee",
    "Non-Coffee",
    "Food",
  ];

  /* ============================================================
     TOAST
  ============================================================ */

  const showToast = (message, type = "success") => {
    const id = `${Date.now()}-${Math.random()}`;

    setToasts((prev) => [...prev, { id, message, type }]);

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  };

  /* ============================================================
     FETCH MENU
  ============================================================ */

  useEffect(() => {
    let mounted = true;

    const fetchMenu = async () => {
      try {
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
              (Number(b.salesCount) || 0) -
              (Number(a.salesCount) || 0)
          )
          .slice(0, 5);

        setBestSellerIds(
          topSelling.map((item) => item.firestoreId)
        );

        setMenuItems(items);
      } catch (error) {
        console.error("Error fetching menu:", error);

        if (mounted) {
          showToast(
            "We couldn't load the menu. Please try again.",
            "error"
          );
        }
      }
    };

    if (db) {
      fetchMenu();
    }

    return () => {
      mounted = false;
    };
  }, []);

  /* ============================================================
     FAVORITES
  ============================================================ */

  useEffect(() => {
    let mounted = true;

    const loadFavorites = async () => {
      if (!currentUser) {
        setFavorites([]);
        return;
      }

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

  /* ============================================================
     REVIEW STATS
  ============================================================ */

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
          stats[review.productId].rating +=
            Number(review.rating) || 0;
        });

        Object.keys(stats).forEach((id) => {
          const total = stats[id].total;

          stats[id].rating =
            total > 0
              ? Number(
                  (stats[id].rating / total).toFixed(1)
                )
              : 0;
        });

        if (mounted) {
          setReviewStats(stats);
        }
      } catch (error) {
        console.error(
          "Error fetching review statistics:",
          error
        );
      }
    };

    fetchReviewStats();

    return () => {
      mounted = false;
    };
  }, []);

  /* ============================================================
     LIVE MENU DATA
  ============================================================ */

  const menuWithLiveMetadata = useMemo(() => {
    return menuItems.map((item) => {
      const liveReview = reviewStats[item.id];

      return {
        ...item,
        isBestSeller: bestSellerIds.includes(
          item.firestoreId
        ),
        rating: liveReview
          ? Number(liveReview.rating)
          : 0,
        reviews: liveReview
          ? liveReview.total
          : 0,
      };
    });
  }, [
    menuItems,
    reviewStats,
    bestSellerIds,
  ]);

  /* ============================================================
     FILTER + SORT
  ============================================================ */

  const filteredItems = useMemo(() => {
    const cleanSearch = searchQuery
      .toLowerCase()
      .trim();

    const filtered = menuWithLiveMetadata.filter(
      (item) => {
        const matchesSearch =
          !cleanSearch ||
          item.name
            ?.toLowerCase()
            .includes(cleanSearch) ||
          item.desc
            ?.toLowerCase()
            .includes(cleanSearch);

        if (!matchesSearch) return false;

        if (activeCategory === "All") {
          return true;
        }

        if (activeCategory === "Featured") {
          return item.isFeatured === true;
        }

        if (activeCategory === "Bestselling") {
          return bestSellerIds.includes(
            item.firestoreId
          );
        }

        return item.category === activeCategory;
      }
    );

    return [...filtered].sort((a, b) => {
      if (activeCategory === "Bestselling") {
        return (
          (Number(b.salesCount) || 0) -
          (Number(a.salesCount) || 0)
        );
      }

      if (sortBy === "price-low") {
        return (
          (Number(a.price) || 0) -
          (Number(b.price) || 0)
        );
      }

      if (sortBy === "price-high") {
        return (
          (Number(b.price) || 0) -
          (Number(a.price) || 0)
        );
      }

      if (sortBy === "popularity") {
        return (
          (Number(b.rating) || 0) -
          (Number(a.rating) || 0)
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
    searchQuery,
    activeCategory,
    sortBy,
    bestSellerIds,
  ]);

  /* ============================================================
     FEATURED / HERO ITEMS
  ============================================================ */

  const heroItems = useMemo(() => {
    const featured = menuWithLiveMetadata.filter(
      (item) => item.isFeatured
    );

    if (featured.length) {
      return featured.slice(0, 3);
    }

    return [...menuWithLiveMetadata]
      .sort(
        (a, b) =>
          (Number(b.salesCount) || 0) -
          (Number(a.salesCount) || 0)
      )
      .slice(0, 3);
  }, [menuWithLiveMetadata]);

  /* ============================================================
     ADD TO CART
  ============================================================ */

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

    showToast(`${item.name} added to your cart.`);

    setAdded((prev) => ({
      ...prev,
      [item.id]: true,
    }));

    window.setTimeout(() => {
      setAdded((prev) => ({
        ...prev,
        [item.id]: false,
      }));
    }, 1200);
  };

  /* ============================================================
     FAVORITE
  ============================================================ */

  const toggleFavorite = async (event, item) => {
    event.stopPropagation();

    if (!currentUser) {
      showToast(
        "Please log in to save favorites.",
        "error"
      );
      setPage("login");
      return;
    }

    const favoriteRef = doc(
      db,
      "users",
      currentUser.uid,
      "favorites",
      String(item.id)
    );

    try {
      if (favorites.includes(item.id)) {
        await deleteDoc(favoriteRef);

        setFavorites((prev) =>
          prev.filter((id) => id !== item.id)
        );

        showToast(
          `${item.name} removed from favorites.`
        );
      } else {
        await setDoc(favoriteRef, {
          ...item,
          savedAt: Date.now(),
        });

        setFavorites((prev) => [
          ...prev,
          item.id,
        ]);

        showToast(
          `${item.name} saved to favorites.`
        );
      }
    } catch (error) {
      console.error(
        "Error updating favorite:",
        error
      );

      showToast(
        "Something went wrong. Please try again.",
        "error"
      );
    }
  };

  /* ============================================================
     PRODUCT NAVIGATION
  ============================================================ */

  const openProduct = (item) => {
    setSelectedProduct(item);
    setPage("product");
  };

  return (
    <>
      <style>{`
        /* ========================================================
           BREWED — EDITORIAL LUXURY CAFE MENU
        ======================================================== */

        :root {
          --brew-espresso: #1b0c05;
          --brew-dark: #281209;
          --brew-brown: #4a2817;
          --brew-caramel: #b98352;
          --brew-brass: #c99a6b;
          --brew-cream: #f8f3ec;
          --brew-paper: #fdfbf7;
          --brew-muted: #806f63;
          --brew-line: rgba(27, 12, 5, 0.12);
        }

        .brew-menu {
          min-height: 100vh;
          overflow-x: hidden;
          background: var(--brew-paper);
          color: var(--brew-espresso);
        }

        /* ========================================================
           TOAST
        ======================================================== */

        .brew-toast-wrap {
          position: fixed;
          left: 50%;
          bottom: 26px;
          transform: translateX(-50%);
          z-index: 9999;
          width: min(calc(100% - 30px), 390px);
          display: flex;
          flex-direction: column;
          gap: 8px;
          pointer-events: none;
        }

        .brew-toast {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 13px 16px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(27,12,5,.96);
          color: #fffaf4;
          border-radius: 4px;
          box-shadow: 0 18px 50px rgba(27,12,5,.25);
          backdrop-filter: blur(16px);
          font-family: Inter, sans-serif;
          font-size: 12px;
          animation: brewToast .35s ease both;
        }

        .brew-toast.error .brew-toast-icon {
          background: #a84c43;
        }

        .brew-toast-icon {
          width: 24px;
          height: 24px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border-radius: 50%;
          background: var(--brew-brass);
          color: var(--brew-espresso);
        }

        @keyframes brewToast {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* ========================================================
           HERO
        ======================================================== */

        .brew-hero {
          position: relative;
          min-height: 620px;
          display: flex;
          align-items: flex-end;
          overflow: hidden;
          background:
            linear-gradient(
              180deg,
              rgba(20,7,2,.05) 0%,
              rgba(20,7,2,.18) 40%,
              rgba(20,7,2,.88) 100%
            ),
            linear-gradient(
              120deg,
              #2a1408,
              #4b2917 50%,
              #1b0b04
            );
        }

        .brew-hero::before {
          content: "";
          position: absolute;
          inset: 0;
          opacity: .10;
          pointer-events: none;
          background-image:
            radial-gradient(
              rgba(255,255,255,.7) .5px,
              transparent .5px
            );
          background-size: 5px 5px;
          mix-blend-mode: soft-light;
        }

        .brew-hero-image {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: .72;
          filter: saturate(.78) contrast(1.04);
          transform: scale(1.015);
        }

        .brew-hero-placeholder {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(
              circle at 72% 25%,
              rgba(201,154,107,.35),
              transparent 24%
            ),
            radial-gradient(
              circle at 25% 65%,
              rgba(111,61,30,.45),
              transparent 35%
            ),
            linear-gradient(
              120deg,
              #1b0c05,
              #5b321c,
              #211007
            );
        }

        .brew-hero-content {
          position: relative;
          z-index: 2;
          width: min(calc(100% - 44px), 1180px);
          margin: 0 auto;
          padding: 80px 0 76px;
          color: white;
        }

        .brew-hero-kicker {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 23px;
          color: #e0b98f;
          font-family: Inter, sans-serif;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .27em;
          text-transform: uppercase;
        }

        .brew-hero-kicker::before {
          content: "";
          width: 30px;
          height: 1px;
          background: #d0a071;
        }

        .brew-hero-title {
          max-width: 760px;
          margin: 0;
          font-family:
            "Playfair Display",
            Georgia,
            serif;
          font-size: clamp(58px, 9vw, 112px);
          font-weight: 400;
          line-height: .86;
          letter-spacing: -.055em;
        }

        .brew-hero-title em {
          color: #e1bc94;
          font-weight: 400;
        }

        .brew-hero-copy {
          max-width: 420px;
          margin: 30px 0 0;
          color: rgba(255,250,244,.72);
          font-family: Inter, sans-serif;
          font-size: 13px;
          line-height: 1.75;
        }

        .brew-hero-bottom {
          display: flex;
          align-items: center;
          gap: 25px;
          margin-top: 38px;
        }

        .brew-scroll-note {
          display: flex;
          align-items: center;
          gap: 10px;
          color: rgba(255,255,255,.55);
          font-family: Inter, sans-serif;
          font-size: 9px;
          letter-spacing: .16em;
          text-transform: uppercase;
        }

        .brew-scroll-line {
          width: 45px;
          height: 1px;
          background: rgba(255,255,255,.38);
        }

        .brew-hero-mark {
          position: absolute;
          right: 4%;
          top: 18%;
          z-index: 1;
          width: 150px;
          height: 150px;
          border: 1px solid rgba(255,255,255,.18);
          border-radius: 50%;
          display: grid;
          place-items: center;
          color: rgba(255,255,255,.5);
          font-family: "Playfair Display", Georgia, serif;
          font-size: 11px;
          letter-spacing: .12em;
          transform: rotate(-13deg);
        }

        .brew-hero-mark::after {
          content: "B";
          position: absolute;
          font-size: 50px;
          opacity: .15;
        }

        /* ========================================================
           MENU INTRO
        ======================================================== */

        .brew-intro {
          width: min(calc(100% - 44px), 1180px);
          margin: 0 auto;
          padding: 82px 0 42px;
        }

        .brew-intro-grid {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 60px;
          align-items: end;
        }

        .brew-section-kicker {
          margin: 0 0 14px;
          color: var(--brew-caramel);
          font-family: Inter, sans-serif;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .25em;
          text-transform: uppercase;
        }

        .brew-section-title {
          margin: 0;
          font-family:
            "Playfair Display",
            Georgia,
            serif;
          font-size: clamp(39px, 5vw, 62px);
          font-weight: 400;
          line-height: .98;
          letter-spacing: -.04em;
        }

        .brew-intro-copy {
          max-width: 520px;
          margin-left: auto;
          color: var(--brew-muted);
          font-family: Inter, sans-serif;
          font-size: 12px;
          line-height: 1.8;
        }

        /* ========================================================
           CONTROLS
        ======================================================== */

        .brew-controls {
          position: sticky;
          top: 0;
          z-index: 80;
          border-top: 1px solid var(--brew-line);
          border-bottom: 1px solid var(--brew-line);
          background: rgba(253,251,247,.93);
          backdrop-filter: blur(18px);
        }

        .brew-controls-inner {
          width: min(calc(100% - 44px), 1180px);
          margin: 0 auto;
          min-height: 67px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 25px;
        }

        .brew-categories {
          display: flex;
          align-items: center;
          gap: 24px;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .brew-categories::-webkit-scrollbar {
          display: none;
        }

        .brew-category {
          position: relative;
          flex: 0 0 auto;
          padding: 24px 0 21px;
          border: none;
          background: transparent;
          color: #857267;
          cursor: pointer;
          font-family: Inter, sans-serif;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .13em;
          text-transform: uppercase;
          transition: color .2s ease;
        }

        .brew-category::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          bottom: 13px;
          height: 1px;
          background: var(--brew-espresso);
          transform: scaleX(0);
          transform-origin: center;
          transition: transform .25s ease;
        }

        .brew-category:hover,
        .brew-category.active {
          color: var(--brew-espresso);
        }

        .brew-category.active::after {
          transform: scaleX(1);
        }

        .brew-tools {
          display: flex;
          align-items: center;
          gap: 17px;
          flex-shrink: 0;
        }

        .brew-search {
          position: relative;
          width: 150px;
        }

        .brew-search-input {
          width: 100%;
          height: 35px;
          box-sizing: border-box;
          padding: 0 30px 0 30px;
          border: none;
          border-bottom: 1px solid rgba(27,12,5,.18);
          outline: none;
          background: transparent;
          color: var(--brew-espresso);
          font-family: Inter, sans-serif;
          font-size: 10px;
        }

        .brew-search-input:focus {
          border-bottom-color: var(--brew-espresso);
        }

        .brew-search-input::placeholder {
          color: #a6968a;
        }

        .brew-search-icon {
          position: absolute;
          left: 2px;
          top: 50%;
          transform: translateY(-50%);
          color: #79685c;
          pointer-events: none;
        }

        .brew-search-clear {
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          padding: 4px;
          border: none;
          background: transparent;
          color: #79685c;
          cursor: pointer;
        }

        .brew-sort {
          position: relative;
        }

        .brew-sort-select {
          appearance: none;
          min-width: 125px;
          padding: 0 22px 0 0;
          border: none;
          outline: none;
          background: transparent;
          color: #4d3b30;
          cursor: pointer;
          font-family: Inter, sans-serif;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .brew-sort-icon {
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
        }

        /* ========================================================
           FEATURED EDITORIAL STRIP
        ======================================================== */

        .brew-featured {
          width: min(calc(100% - 44px), 1180px);
          margin: 0 auto;
          padding: 58px 0 30px;
        }

        .brew-featured-header {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 22px;
        }

        .brew-featured-title {
          margin: 0;
          font-family: "Playfair Display", Georgia, serif;
          font-size: 29px;
          font-weight: 400;
          letter-spacing: -.025em;
        }

        .brew-featured-note {
          color: #9b8a7e;
          font-family: Inter, sans-serif;
          font-size: 9px;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .brew-featured-grid {
          display: grid;
          grid-template-columns: 1.4fr 1fr 1fr;
          gap: 12px;
        }

        .brew-featured-card {
          position: relative;
          height: 390px;
          overflow: hidden;
          background: #eee3d7;
          cursor: pointer;
        }

        .brew-featured-card:nth-child(2) {
          height: 330px;
          margin-top: 60px;
        }

        .brew-featured-card:nth-child(3) {
          height: 390px;
        }

        .brew-featured-card img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          transition: transform .8s cubic-bezier(.16,1,.3,1);
        }

        .brew-featured-card:hover img {
          transform: scale(1.045);
        }

        .brew-featured-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: flex-end;
          padding: 22px;
          background:
            linear-gradient(
              to top,
              rgba(20,8,3,.7),
              transparent 55%
            );
        }

        .brew-featured-info {
          color: white;
        }

        .brew-featured-tag {
          display: block;
          margin-bottom: 8px;
          color: #e0b68a;
          font-family: Inter, sans-serif;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: .18em;
          text-transform: uppercase;
        }

        .brew-featured-name {
          margin: 0;
          font-family: "Playfair Display", Georgia, serif;
          font-size: 25px;
          font-weight: 400;
        }

        .brew-featured-price {
          margin-top: 6px;
          color: rgba(255,255,255,.7);
          font-family: Inter, sans-serif;
          font-size: 10px;
        }

        /* ========================================================
           PRODUCT GRID
        ======================================================== */

        .brew-products {
          width: min(calc(100% - 44px), 1180px);
          margin: 0 auto;
          padding: 54px 0 100px;
        }

        .brew-products-heading {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: 30px;
        }

        .brew-products-heading h2 {
          margin: 0;
          font-family: "Playfair Display", Georgia, serif;
          font-size: 32px;
          font-weight: 400;
          letter-spacing: -.025em;
        }

        .brew-count {
          color: #a08d80;
          font-family: Inter, sans-serif;
          font-size: 9px;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .brew-product-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0,1fr));
          column-gap: 25px;
          row-gap: 60px;
        }

        /* ========================================================
           PRODUCT
        ======================================================== */

        .brew-product {
          position: relative;
          cursor: pointer;
          min-width: 0;
        }

        .brew-product-image {
          position: relative;
          aspect-ratio: 4 / 4.8;
          overflow: hidden;
          background: #f1e7dc;
        }

        .brew-product-image img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          transition:
            transform .7s cubic-bezier(.16,1,.3,1),
            filter .5s ease;
        }

        .brew-product:hover .brew-product-image img {
          transform: scale(1.035);
          filter: saturate(1.03);
        }

        .brew-product-placeholder {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          font-size: 55px;
          background:
            radial-gradient(
              circle,
              #fffaf3 0%,
              #edddcd 100%
            );
        }

        .brew-product-label {
          position: absolute;
          left: 13px;
          top: 13px;
          padding: 7px 9px;
          background: rgba(253,251,247,.93);
          color: #4b2b18;
          font-family: Inter, sans-serif;
          font-size: 7px;
          font-weight: 800;
          letter-spacing: .16em;
          text-transform: uppercase;
          backdrop-filter: blur(8px);
        }

        .brew-product-label.best {
          background: var(--brew-espresso);
          color: #fffaf3;
        }

        .brew-product-label.out {
          top: auto;
          bottom: 13px;
          background: rgba(153,50,42,.92);
          color: white;
        }

        .brew-favorite {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(27,12,5,.08);
          border-radius: 50%;
          background: rgba(253,251,247,.9);
          color: #594437;
          cursor: pointer;
          backdrop-filter: blur(8px);
          transition:
            transform .2s ease,
            background .2s ease,
            color .2s ease;
        }

        .brew-favorite:hover {
          transform: scale(1.06);
          background: var(--brew-espresso);
          color: white;
        }

        .brew-favorite.saved {
          background: var(--brew-espresso);
          color: var(--brew-brass);
        }

        .brew-product-info {
          padding-top: 16px;
        }

        .brew-product-top {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 15px;
        }

        .brew-product-name {
          margin: 0;
          color: var(--brew-espresso);
          font-family:
            "Playfair Display",
            Georgia,
            serif;
          font-size: 21px;
          font-weight: 500;
          line-height: 1.1;
          letter-spacing: -.02em;
        }

        .brew-product-price {
          flex-shrink: 0;
          color: #4f3729;
          font-family: Inter, sans-serif;
          font-size: 11px;
          font-weight: 700;
        }

        .brew-product-rating {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-top: 8px;
          font-family: Inter, sans-serif;
          font-size: 9px;
        }

        .brew-star {
          color: var(--brew-caramel);
        }

        .brew-rating-number {
          color: #4c382c;
          font-weight: 700;
        }

        .brew-rating-count {
          color: #a49489;
        }

        .brew-product-description {
          max-width: 95%;
          margin: 9px 0 0;
          color: #88766a;
          font-family: Inter, sans-serif;
          font-size: 10px;
          line-height: 1.65;
        }

        .brew-add {
          margin-top: 14px;
          padding: 0;
          border: none;
          border-bottom: 1px solid rgba(27,12,5,.28);
          background: transparent;
          color: var(--brew-espresso);
          cursor: pointer;
          font-family: Inter, sans-serif;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: .17em;
          text-transform: uppercase;
          transition:
            border-color .2s ease,
            color .2s ease;
        }

        .brew-add:hover:not(:disabled) {
          border-color: var(--brew-caramel);
          color: var(--brew-caramel);
        }

        .brew-add.added {
          color: #9a6a3f;
          border-color: #9a6a3f;
        }

        .brew-add:disabled {
          color: #a69a91;
          border-color: #cfc5bd;
          cursor: not-allowed;
        }

        /* ========================================================
           EMPTY
        ======================================================== */

        .brew-empty {
          grid-column: 1 / -1;
          padding: 100px 20px;
          text-align: center;
          border-top: 1px solid var(--brew-line);
          border-bottom: 1px solid var(--brew-line);
        }

        .brew-empty-symbol {
          margin-bottom: 18px;
          color: var(--brew-caramel);
        }

        .brew-empty-title {
          margin: 0;
          font-family: "Playfair Display", Georgia, serif;
          font-size: 31px;
          font-weight: 400;
        }

        .brew-empty-copy {
          margin: 10px auto 0;
          max-width: 340px;
          color: #8b786c;
          font-family: Inter, sans-serif;
          font-size: 11px;
          line-height: 1.7;
        }

        .brew-clear {
          margin-top: 20px;
          padding: 10px 16px;
          border: 1px solid var(--brew-line);
          background: transparent;
          color: var(--brew-espresso);
          cursor: pointer;
          font-family: Inter, sans-serif;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: .15em;
          text-transform: uppercase;
        }

        /* ========================================================
           MOBILE
        ======================================================== */

        @media (max-width: 900px) {
          .brew-featured-grid {
            grid-template-columns: 1fr 1fr;
          }

          .brew-featured-card:first-child {
            grid-column: 1 / -1;
            height: 430px;
          }

          .brew-featured-card:nth-child(2),
          .brew-featured-card:nth-child(3) {
            height: 300px;
            margin-top: 0;
          }

          .brew-product-grid {
            grid-template-columns: repeat(2, minmax(0,1fr));
          }

          .brew-controls-inner {
            align-items: flex-start;
            flex-direction: column;
            gap: 0;
          }

          .brew-categories {
            width: 100%;
          }

          .brew-tools {
            display: none;
          }
        }

        @media (max-width: 600px) {
          .brew-hero {
            min-height: 540px;
          }

          .brew-hero-content {
            width: calc(100% - 30px);
            padding-bottom: 58px;
          }

          .brew-hero-title {
            font-size: 58px;
          }

          .brew-hero-mark {
            right: -35px;
            top: 18%;
            opacity: .6;
          }

          .brew-intro,
          .brew-featured,
          .brew-products {
            width: calc(100% - 30px);
          }

          .brew-intro {
            padding-top: 60px;
          }

          .brew-intro-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }

          .brew-intro-copy {
            margin-left: 0;
          }

          .brew-controls-inner {
            width: calc(100% - 30px);
          }

          .brew-category {
            padding-top: 18px;
            padding-bottom: 17px;
          }

          .brew-category::after {
            bottom: 8px;
          }

          .brew-featured {
            padding-top: 44px;
          }

          .brew-featured-grid {
            grid-template-columns: 1fr;
          }

          .brew-featured-card:first-child,
          .brew-featured-card:nth-child(2),
          .brew-featured-card:nth-child(3) {
            height: 360px;
          }

          .brew-product-grid {
            grid-template-columns: 1fr;
            row-gap: 48px;
          }

          .brew-product-image {
            aspect-ratio: 4 / 4.5;
          }

          .brew-products {
            padding-bottom: 70px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .brew-product-image img,
          .brew-featured-card img,
          .brew-favorite,
          .brew-toast {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      {/* ==========================================================
          TOASTS
      ========================================================== */}

      <div
        className="brew-toast-wrap"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`brew-toast ${
              toast.type === "error" ? "error" : ""
            }`}
          >
            <span className="brew-toast-icon">
              {toast.type === "error" ? (
                <X size={13} />
              ) : (
                <Check size={13} />
              )}
            </span>

            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      <main className="brew-menu">

        {/* ========================================================
            HERO
        ======================================================== */}

        <section className="brew-hero">
          {heroItems[0]?.img ||
          heroItems[0]?.image ? (
            <img
              className="brew-hero-image"
              src={
                heroItems[0].img ||
                heroItems[0].image
              }
              alt=""
              aria-hidden="true"
            />
          ) : (
            <div
              className="brew-hero-placeholder"
              aria-hidden="true"
            />
          )}

          <div className="brew-hero-mark">
            EST. 2024
          </div>

          <div className="brew-hero-content">
            <div className="brew-hero-kicker">
              Brewed · Kolkata
            </div>

            <h1 className="brew-hero-title">
              Made for
              <br />
              <em>slow moments.</em>
            </h1>

            <p className="brew-hero-copy">
              Specialty coffee, comforting plates and
              little indulgences — thoughtfully made
              and served fresh.
            </p>

            <div className="brew-hero-bottom">
              <div className="brew-scroll-note">
                <span className="brew-scroll-line" />
                Explore the menu
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            INTRO
        ======================================================== */}

        <section className="brew-intro">
          <div className="brew-intro-grid">
            <div>
              <p className="brew-section-kicker">
                The Brewed menu
              </p>

              <h2 className="brew-section-title">
                Something
                <br />
                for every mood.
              </h2>
            </div>

            <p className="brew-intro-copy">
              From your first coffee of the morning to
              an afternoon spent lingering a little
              longer — discover our selection of
              carefully crafted drinks and food.
            </p>
          </div>
        </section>

        {/* ========================================================
            FILTERS
        ======================================================== */}

        <section className="brew-controls">
          <div className="brew-controls-inner">
            <nav
              className="brew-categories"
              aria-label="Menu categories"
            >
              {filters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={`brew-category ${
                    activeCategory === filter
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    setActiveCategory(filter)
                  }
                >
                  {filter}
                </button>
              ))}
            </nav>

            <div className="brew-tools">
              <div className="brew-search">
                <Search
                  className="brew-search-icon"
                  size={14}
                  strokeWidth={1.6}
                />

                <input
                  type="search"
                  className="brew-search-input"
                  placeholder="Search menu"
                  value={searchQuery}
                  onChange={(event) =>
                    setSearchQuery(
                      event.target.value
                    )
                  }
                  aria-label="Search menu"
                />

                {searchQuery && (
                  <button
                    type="button"
                    className="brew-search-clear"
                    onClick={() =>
                      setSearchQuery("")
                    }
                    aria-label="Clear search"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="brew-sort">
                <select
                  className="brew-sort-select"
                  value={sortBy}
                  onChange={(event) =>
                    setSortBy(event.target.value)
                  }
                  aria-label="Sort menu"
                >
                  <option value="default">
                    Featured
                  </option>
                  <option value="price-low">
                    Price: Low to High
                  </option>
                  <option value="price-high">
                    Price: High to Low
                  </option>
                  <option value="popularity">
                    Highest Rated
                  </option>
                </select>

                <ChevronDown
                  className="brew-sort-icon"
                  size={12}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            FEATURED EDITORIAL SECTION
        ======================================================== */}

        {!searchQuery &&
          activeCategory === "All" &&
          heroItems.length > 0 && (
            <section className="brew-featured">
              <div className="brew-featured-header">
                <div>
                  <p className="brew-section-kicker">
                    A little special
                  </p>

                  <h2 className="brew-featured-title">
                    House favourites
                  </h2>
                </div>

                <span className="brew-featured-note">
                  Handpicked by Brewed
                </span>
              </div>

              <div className="brew-featured-grid">
                {heroItems.map((item) => (
                  <div
                    key={item.id}
                    className="brew-featured-card"
                    onClick={() =>
                      openProduct(item)
                    }
                  >
                    {item.img ||
                    item.image ? (
                      <img
                        src={
                          item.img ||
                          item.image
                        }
                        alt={item.name}
                        loading="lazy"
                      />
                    ) : (
                      <div className="brew-product-placeholder">
                        {item.emoji || "☕"}
                      </div>
                    )}

                    <div className="brew-featured-overlay">
                      <div className="brew-featured-info">
                        <span className="brew-featured-tag">
                          {item.isBestSeller
                            ? "Bestseller"
                            : "Brewed favourite"}
                        </span>

                        <h3 className="brew-featured-name">
                          {item.name}
                        </h3>

                        <div className="brew-featured-price">
                          ₹
                          {Math.round(
                            Number(item.price) ||
                              0
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        {/* ========================================================
            PRODUCTS
        ======================================================== */}

        <section className="brew-products">
          <div className="brew-products-heading">
            <h2>
              {activeCategory === "All"
                ? "The menu"
                : activeCategory}
            </h2>

            <span className="brew-count">
              {filteredItems.length}{" "}
              {filteredItems.length === 1
                ? "item"
                : "items"}
            </span>
          </div>

          <div className="brew-product-grid">
            {filteredItems.length === 0 ? (
              <div className="brew-empty">
                <div className="brew-empty-symbol">
                  <Search
                    size={25}
                    strokeWidth={1.2}
                  />
                </div>

                <h3 className="brew-empty-title">
                  Nothing here yet.
                </h3>

                <p className="brew-empty-copy">
                  Try another search or explore
                  another part of our menu.
                </p>

                <button
                  type="button"
                  className="brew-clear"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveCategory("All");
                  }}
                >
                  View everything
                </button>
              </div>
            ) : (
              filteredItems.map((item) => {
                const isFavorite =
                  favorites.includes(item.id);

                const isAdded =
                  Boolean(added[item.id]);

                const unavailable =
                  item.available === false;

                return (
                  <article
                    key={item.id}
                    className="brew-product"
                    onClick={() =>
                      openProduct(item)
                    }
                  >
                    <div className="brew-product-image">
                      {item.img ||
                      item.image ? (
                        <img
                          src={
                            item.img ||
                            item.image
                          }
                          alt={
                            item.name ||
                            "Menu item"
                          }
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="brew-product-placeholder">
                          {item.emoji || "☕"}
                        </div>
                      )}

                      {item.isFeatured && (
                        <div className="brew-product-label">
                          <Sparkles
                            size={8}
                          />
                          Featured
                        </div>
                      )}

                      {!item.isFeatured &&
                        item.isBestSeller && (
                          <div className="brew-product-label best">
                            Bestseller
                          </div>
                        )}

                      {unavailable && (
                        <div className="brew-product-label out">
                          Out of stock
                        </div>
                      )}

                      <button
                        type="button"
                        className={`brew-favorite ${
                          isFavorite
                            ? "saved"
                            : ""
                        }`}
                        onClick={(event) =>
                          toggleFavorite(
                            event,
                            item
                          )
                        }
                        aria-label={
                          isFavorite
                            ? `Remove ${item.name} from favorites`
                            : `Save ${item.name} to favorites`
                        }
                        aria-pressed={
                          isFavorite
                        }
                      >
                        <Heart
                          size={16}
                          strokeWidth={1.6}
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
                            Number(
                              item.price
                            ) || 0
                          )}
                        </span>
                      </div>

                      <div className="brew-product-rating">
                        <span className="brew-star">
                          ★
                        </span>

                        <span className="brew-rating-number">
                          {item.rating > 0
                            ? Number(
                                item.rating
                              ).toFixed(1)
                            : "New"}
                        </span>

                        {item.reviews >
                          0 && (
                          <span className="brew-rating-count">
                            · {item.reviews}{" "}
                            reviews
                          </span>
                        )}
                      </div>

                      {item.desc && (
                        <p className="brew-product-description">
                          {item.desc}
                        </p>
                      )}

                      <button
                        type="button"
                        className={`brew-add ${
                          isAdded
                            ? "added"
                            : ""
                        }`}
                        disabled={
                          unavailable
                        }
                        onClick={(event) => {
                          event.stopPropagation();

                          if (
                            !unavailable
                          ) {
                            handleAdd(item);
                          }
                        }}
                      >
                        {unavailable
                          ? "Unavailable"
                          : isAdded
                          ? "Added"
                          : "Add to order"}
                      </button>
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
