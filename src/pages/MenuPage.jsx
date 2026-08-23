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

export default function MenuPage({
  setPage,
  setSelectedProduct,
}) {
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
     TOASTS
  ============================================================ */

  const showToast = (message, type = "success") => {
    const id = `${Date.now()}-${Math.random()}`;

    setToasts((prev) => [
      ...prev,
      {
        id,
        message,
        type,
      },
    ]);

    window.setTimeout(() => {
      setToasts((prev) =>
        prev.filter((toast) => toast.id !== id)
      );
    }, 2800);
  };

  /* ============================================================
     FETCH MENU
  ============================================================ */

  useEffect(() => {
    let mounted = true;

    const fetchMenu = async () => {
      try {
        const snapshot = await getDocs(
          collection(db, "menu")
        );

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
            "Unable to load the menu right now.",
            "error"
          );
        }
      }
    };

    fetchMenu();

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
          snapshot.docs.map(
            (favoriteDoc) => favoriteDoc.id
          )
        );
      } catch (error) {
        console.error(
          "Error loading favorites:",
          error
        );
      }
    };

    loadFavorites();

    return () => {
      mounted = false;
    };
  }, [currentUser]);

  /* ============================================================
     REVIEWS
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
                  (
                    stats[id].rating / total
                  ).toFixed(1)
                )
              : 0;
        });

        if (mounted) {
          setReviewStats(stats);
        }
      } catch (error) {
        console.error(
          "Error fetching reviews:",
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
     LIVE MENU METADATA
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
     FEATURED PRODUCTS
  ============================================================ */

  const featuredItems = useMemo(() => {
    const featured =
      menuWithLiveMetadata.filter(
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
     FILTER + SORT
  ============================================================ */

  const visibleItems = useMemo(() => {
    const search = searchQuery
      .toLowerCase()
      .trim();

    const filtered =
      menuWithLiveMetadata.filter((item) => {
        const matchesSearch =
          !search ||
          item.name
            ?.toLowerCase()
            .includes(search) ||
          item.desc
            ?.toLowerCase()
            .includes(search);

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
      });

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
     ACTIONS
  ============================================================ */

  const openProduct = (item) => {
    setSelectedProduct(item);
    setPage("product");
  };

  const handleAdd = (item) => {
    if (!currentUser) {
      showToast(
        "Log in to add something delicious.",
        "error"
      );

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
    }, 1200);
  };

  const toggleFavorite = async (event, item) => {
    event.stopPropagation();

    if (!currentUser) {
      showToast(
        "Log in to save your favourites.",
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
          `${item.name} removed from favourites.`
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
          `${item.name} saved to favourites.`
        );
      }
    } catch (error) {
      console.error(
        "Error updating favourite:",
        error
      );

      showToast(
        "Couldn't update favourites.",
        "error"
      );
    }
  };

  return (
    <>
      <style>{`

        /* =========================================================
           BREWED MENU
           Warm / Organic / Instagram Café
        ========================================================= */

        .brew-menu-page {
          --espresso: #24130b;
          --coffee: #402315;
          --mocha: #68422b;
          --caramel: #b9855a;
          --latte: #dfc5aa;
          --cream: #faf6ef;
          --ivory: #fffdf9;
          --sand: #f1e7db;
          --muted: #8d7969;
          --line: rgba(36,19,11,.09);

          min-height: 100vh;
          background: var(--cream);
          color: var(--espresso);
          overflow-x: hidden;
        }

        * {
          box-sizing: border-box;
        }

        /* =========================================================
           TOAST
        ========================================================= */

        .brew-toasts {
          position: fixed;
          z-index: 9999;
          left: 50%;
          bottom: 24px;
          transform: translateX(-50%);
          width: min(calc(100% - 28px), 390px);
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
          border-radius: 18px;
          background: rgba(36,19,11,.96);
          color: #fffaf3;
          box-shadow: 0 15px 45px rgba(36,19,11,.2);
          backdrop-filter: blur(18px);
          font-family: Inter, sans-serif;
          font-size: 12px;
          animation: toastIn .35s ease both;
        }

        .brew-toast.error {
          border-left: 3px solid #b44d42;
        }

        .brew-toast-check {
          width: 23px;
          height: 23px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border-radius: 50%;
          background: var(--caramel);
          color: var(--espresso);
        }

        @keyframes toastIn {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* =========================================================
           HERO
        ========================================================= */

        .brew-menu-hero {
          position: relative;
          min-height: 600px;
          overflow: hidden;
          display: flex;
          align-items: flex-end;
          background:
            radial-gradient(
              circle at 75% 20%,
              #795033 0,
              transparent 30%
            ),
            linear-gradient(
              135deg,
              #211109,
              #51321e 60%,
              #251108
            );
        }

        .brew-menu-hero-photo {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: .74;
          filter: saturate(.82) contrast(.96);
        }

        .brew-menu-hero::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(
              180deg,
              rgba(25,12,6,.05) 20%,
              rgba(25,12,6,.22) 48%,
              rgba(25,12,6,.88) 100%
            );
        }

        .brew-hero-content {
          position: relative;
          z-index: 2;
          width: min(calc(100% - 40px), 1180px);
          margin: auto;
          padding: 70px 0 72px;
          color: white;
        }

        .brew-hero-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 13px;
          border: 1px solid rgba(255,255,255,.22);
          border-radius: 999px;
          background: rgba(255,255,255,.09);
          backdrop-filter: blur(12px);
          color: #f0d2b2;
          font-family: Inter, sans-serif;
          font-size: 8px;
          font-weight: 700;
          letter-spacing: .2em;
          text-transform: uppercase;
        }

        .brew-hero-heading {
          max-width: 700px;
          margin: 22px 0 0;
          font-family:
            "Playfair Display",
            Georgia,
            serif;
          font-size: clamp(55px, 9vw, 105px);
          font-weight: 500;
          line-height: .86;
          letter-spacing: -.055em;
        }

        .brew-hero-heading em {
          color: #e6c29e;
          font-weight: 400;
        }

        .brew-hero-subtitle {
          max-width: 390px;
          margin: 24px 0 0;
          color: rgba(255,249,241,.74);
          font-family: Inter, sans-serif;
          font-size: 12px;
          line-height: 1.75;
        }

        .brew-hero-meta {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-top: 30px;
          color: rgba(255,255,255,.65);
          font-family: Inter, sans-serif;
          font-size: 8px;
          font-weight: 700;
          letter-spacing: .16em;
          text-transform: uppercase;
        }

        .brew-hero-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--caramel);
        }

        /* Decorative stamp */

        .brew-stamp {
          position: absolute;
          z-index: 2;
          right: 7%;
          top: 16%;
          width: 125px;
          height: 125px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255,255,255,.24);
          border-radius: 50%;
          color: rgba(255,255,255,.58);
          transform: rotate(12deg);
          font-family: "Playfair Display", serif;
          font-size: 10px;
          letter-spacing: .1em;
        }

        .brew-stamp::before {
          content: "BREWED";
          position: absolute;
          transform: translateY(-31px);
          font-family: Inter, sans-serif;
          font-size: 7px;
          font-weight: 700;
          letter-spacing: .22em;
        }

        .brew-stamp::after {
          content: "✦";
          font-size: 24px;
          opacity: .6;
        }

        /* =========================================================
           INTRO
        ========================================================= */

        .brew-menu-intro {
          width: min(calc(100% - 40px), 1120px);
          margin: auto;
          padding: 72px 0 45px;
        }

        .brew-intro-layout {
          display: grid;
          grid-template-columns: 1fr 1.25fr;
          gap: 80px;
          align-items: end;
        }

        .brew-mini-label {
          margin: 0 0 12px;
          color: var(--caramel);
          font-family: Inter, sans-serif;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: .24em;
          text-transform: uppercase;
        }

        .brew-intro-title {
          margin: 0;
          font-family:
            "Playfair Display",
            Georgia,
            serif;
          font-size: clamp(39px, 5vw, 58px);
          font-weight: 500;
          line-height: .98;
          letter-spacing: -.045em;
        }

        .brew-intro-title em {
          color: var(--mocha);
          font-weight: 400;
        }

        .brew-intro-text {
          max-width: 450px;
          margin: 0 0 3px auto;
          color: var(--muted);
          font-family: Inter, sans-serif;
          font-size: 11px;
          line-height: 1.85;
        }

        /* =========================================================
           FILTER BAR
        ========================================================= */

        .brew-menu-controls {
          position: sticky;
          top: 0;
          z-index: 90;
          border-top: 1px solid var(--line);
          border-bottom: 1px solid var(--line);
          background: rgba(250,246,239,.91);
          backdrop-filter: blur(18px);
        }

        .brew-controls-inner {
          width: min(calc(100% - 40px), 1120px);
          min-height: 68px;
          margin: auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 22px;
        }

        .brew-categories {
          display: flex;
          align-items: center;
          gap: 7px;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .brew-categories::-webkit-scrollbar {
          display: none;
        }

        .brew-category {
          flex: 0 0 auto;
          padding: 9px 14px;
          border: 1px solid transparent;
          border-radius: 999px;
          background: transparent;
          color: #8a7667;
          cursor: pointer;
          font-family: Inter, sans-serif;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .04em;
          transition:
            background .25s ease,
            color .25s ease,
            border .25s ease,
            transform .2s ease;
        }

        .brew-category:hover {
          transform: translateY(-1px);
          color: var(--espresso);
        }

        .brew-category.active {
          border-color: rgba(36,19,11,.1);
          background: var(--espresso);
          color: #fffaf3;
          box-shadow: 0 5px 16px rgba(36,19,11,.12);
        }

        .brew-controls-right {
          display: flex;
          align-items: center;
          gap: 15px;
          flex-shrink: 0;
        }

        .brew-search {
          position: relative;
          width: 155px;
        }

        .brew-search input {
          width: 100%;
          height: 34px;
          padding: 0 27px;
          border: none;
          border-bottom: 1px solid rgba(36,19,11,.16);
          outline: none;
          background: transparent;
          color: var(--espresso);
          font-family: Inter, sans-serif;
          font-size: 10px;
        }

        .brew-search input:focus {
          border-bottom-color: var(--espresso);
        }

        .brew-search input::placeholder {
          color: #a49488;
        }

        .brew-search-icon {
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          color: #927f70;
          pointer-events: none;
        }

        .brew-search-clear {
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          padding: 3px;
          border: none;
          background: transparent;
          color: #927f70;
          cursor: pointer;
        }

        .brew-sort {
          position: relative;
        }

        .brew-sort select {
          appearance: none;
          min-width: 118px;
          padding: 8px 18px 8px 0;
          border: none;
          outline: none;
          background: transparent;
          color: var(--coffee);
          cursor: pointer;
          font-family: Inter, sans-serif;
          font-size: 9px;
          font-weight: 700;
        }

        .brew-sort svg {
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
        }

        /* =========================================================
           FEATURED
        ========================================================= */

        .brew-featured {
          width: min(calc(100% - 40px), 1120px);
          margin: auto;
          padding: 58px 0 25px;
        }

        .brew-featured-heading {
          display: flex;
          align-items: end;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .brew-featured-title {
          margin: 0;
          font-family:
            "Playfair Display",
            Georgia,
            serif;
          font-size: 31px;
          font-weight: 500;
          letter-spacing: -.03em;
        }

        .brew-featured-caption {
          color: #9c8878;
          font-family: Inter, sans-serif;
          font-size: 8px;
          font-weight: 700;
          letter-spacing: .14em;
          text-transform: uppercase;
        }

        .brew-featured-grid {
          display: grid;
          grid-template-columns: 1.45fr .9fr .9fr;
          gap: 14px;
          align-items: start;
        }

        .brew-featured-item {
          position: relative;
          height: 375px;
          overflow: hidden;
          border-radius: 24px;
          background: var(--sand);
          cursor: pointer;
          box-shadow: 0 10px 35px rgba(71,42,24,.07);
        }

        .brew-featured-item:nth-child(2) {
          height: 315px;
          margin-top: 55px;
        }

        .brew-featured-item:nth-child(3) {
          height: 345px;
          margin-top: 18px;
        }

        .brew-featured-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition:
            transform .8s cubic-bezier(.16,1,.3,1);
        }

        .brew-featured-item:hover img {
          transform: scale(1.055);
        }

        .brew-featured-fade {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: flex-end;
          padding: 22px;
          background:
            linear-gradient(
              180deg,
              transparent 42%,
              rgba(30,14,7,.76) 100%
            );
        }

        .brew-featured-info {
          color: white;
        }

        .brew-featured-tag {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          margin-bottom: 7px;
          color: #e8c49d;
          font-family: Inter, sans-serif;
          font-size: 7px;
          font-weight: 800;
          letter-spacing: .17em;
          text-transform: uppercase;
        }

        .brew-featured-name {
          margin: 0;
          font-family:
            "Playfair Display",
            Georgia,
            serif;
          font-size: 24px;
          font-weight: 500;
        }

        .brew-featured-price {
          margin-top: 5px;
          color: rgba(255,255,255,.7);
          font-family: Inter, sans-serif;
          font-size: 10px;
        }

        /* =========================================================
           PRODUCTS
        ========================================================= */

        .brew-products {
          width: min(calc(100% - 40px), 1120px);
          margin: auto;
          padding: 60px 0 100px;
        }

        .brew-products-header {
          display: flex;
          justify-content: space-between;
          align-items: end;
          margin-bottom: 25px;
        }

        .brew-products-title {
          margin: 0;
          font-family:
            "Playfair Display",
            Georgia,
            serif;
          font-size: 35px;
          font-weight: 500;
          letter-spacing: -.035em;
        }

        .brew-products-count {
          color: #a18d7d;
          font-family: Inter, sans-serif;
          font-size: 8px;
          font-weight: 700;
          letter-spacing: .13em;
          text-transform: uppercase;
        }

        .brew-product-grid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 46px 24px;
        }

        /* =========================================================
           PRODUCT CARD
        ========================================================= */

        .brew-product-card {
          min-width: 0;
          cursor: pointer;
        }

        .brew-product-photo {
          position: relative;
          aspect-ratio: .9;
          overflow: hidden;
          border-radius: 22px;
          background: var(--sand);
        }

        .brew-product-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition:
            transform .65s cubic-bezier(.16,1,.3,1);
        }

        .brew-product-card:hover
        .brew-product-photo img {
          transform: scale(1.045);
        }

        .brew-placeholder {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          background:
            radial-gradient(
              circle at 50% 35%,
              #fffaf3,
              #eadaca
            );
          font-size: 52px;
        }

        .brew-badge {
          position: absolute;
          left: 13px;
          top: 13px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 7px 10px;
          border-radius: 999px;
          background: rgba(255,252,247,.91);
          color: var(--coffee);
          box-shadow: 0 5px 20px rgba(36,19,11,.08);
          backdrop-filter: blur(10px);
          font-family: Inter, sans-serif;
          font-size: 7px;
          font-weight: 800;
          letter-spacing: .1em;
          text-transform: uppercase;
        }

        .brew-badge.best {
          background: var(--espresso);
          color: #f5d8b8;
        }

        .brew-badge.out {
          top: auto;
          bottom: 13px;
          background: rgba(133,57,49,.93);
          color: white;
        }

        .brew-heart {
          position: absolute;
          right: 13px;
          top: 13px;
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(36,19,11,.08);
          border-radius: 50%;
          background: rgba(255,252,247,.91);
          color: var(--coffee);
          cursor: pointer;
          box-shadow: 0 5px 20px rgba(36,19,11,.08);
          backdrop-filter: blur(10px);
          transition:
            transform .2s ease,
            background .2s ease;
        }

        .brew-heart:hover {
          transform: scale(1.08);
        }

        .brew-heart.active {
          background: var(--espresso);
          color: #e3b887;
        }

        .brew-product-info {
          padding: 15px 3px 0;
        }

        .brew-product-title-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
        }

        .brew-product-name {
          margin: 0;
          color: var(--espresso);
          font-family:
            "Playfair Display",
            Georgia,
            serif;
          font-size: 21px;
          font-weight: 500;
          line-height: 1.1;
        }

        .brew-product-price {
          flex-shrink: 0;
          color: var(--coffee);
          font-family: Inter, sans-serif;
          font-size: 11px;
          font-weight: 800;
        }

        .brew-rating {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-top: 8px;
          font-family: Inter, sans-serif;
          font-size: 9px;
        }

        .brew-rating-star {
          color: var(--caramel);
        }

        .brew-rating-value {
          color: var(--coffee);
          font-weight: 800;
        }

        .brew-rating-count {
          color: #a28e80;
        }

        .brew-product-description {
          max-width: 94%;
          margin: 8px 0 0;
          color: #907c6d;
          font-family: Inter, sans-serif;
          font-size: 10px;
          line-height: 1.65;
        }

        .brew-add-button {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin-top: 12px;
          padding: 8px 0;
          border: none;
          border-bottom: 1px solid rgba(36,19,11,.24);
          background: transparent;
          color: var(--espresso);
          cursor: pointer;
          font-family: Inter, sans-serif;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: .13em;
          text-transform: uppercase;
          transition:
            color .2s ease,
            border-color .2s ease;
        }

        .brew-add-button:hover:not(:disabled) {
          color: var(--caramel);
          border-color: var(--caramel);
        }

        .brew-add-button.added {
          color: #8d684a;
          border-color: #8d684a;
        }

        .brew-add-button:disabled {
          color: #a99c91;
          border-color: #d2c8bf;
          cursor: not-allowed;
        }

        /* =========================================================
           EMPTY STATE
        ========================================================= */

        .brew-empty {
          grid-column: 1 / -1;
          padding: 85px 20px;
          text-align: center;
          border-radius: 25px;
          background: #f4ece2;
        }

        .brew-empty-icon {
          width: 50px;
          height: 50px;
          margin: 0 auto 17px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #e7d4c0;
          color: var(--coffee);
        }

        .brew-empty h3 {
          margin: 0;
          font-family:
            "Playfair Display",
            Georgia,
            serif;
          font-size: 29px;
          font-weight: 500;
        }

        .brew-empty p {
          max-width: 310px;
          margin: 9px auto 18px;
          color: var(--muted);
          font-family: Inter, sans-serif;
          font-size: 10px;
          line-height: 1.7;
        }

        .brew-empty button {
          padding: 10px 16px;
          border: none;
          border-radius: 999px;
          background: var(--espresso);
          color: white;
          cursor: pointer;
          font-family: Inter, sans-serif;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: .1em;
          text-transform: uppercase;
        }

        /* =========================================================
           MOBILE
        ========================================================= */

        @media (max-width: 900px) {
          .brew-featured-grid {
            grid-template-columns: 1.2fr 1fr;
          }

          .brew-featured-item:first-child {
            grid-column: 1 / -1;
            height: 390px;
          }

          .brew-featured-item:nth-child(2),
          .brew-featured-item:nth-child(3) {
            height: 290px;
            margin-top: 0;
          }

          .brew-product-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .brew-intro-layout {
            gap: 35px;
          }
        }

        @media (max-width: 650px) {
          .brew-menu-hero {
            min-height: 570px;
          }

          .brew-hero-content {
            width: calc(100% - 30px);
            padding-bottom: 58px;
          }

          .brew-hero-heading {
            font-size: 59px;
          }

          .brew-stamp {
            width: 95px;
            height: 95px;
            right: -15px;
            top: 13%;
          }

          .brew-menu-intro,
          .brew-featured,
          .brew-products {
            width: calc(100% - 30px);
          }

          .brew-menu-intro {
            padding: 60px 0 38px;
          }

          .brew-intro-layout {
            grid-template-columns: 1fr;
            gap: 23px;
          }

          .brew-intro-text {
            margin: 0;
          }

          .brew-controls-inner {
            width: calc(100% - 30px);
            min-height: 60px;
          }

          .brew-controls-right {
            display: none;
          }

          .brew-categories {
            width: 100%;
          }

          .brew-category {
            padding: 8px 12px;
            font-size: 8px;
          }

          .brew-featured {
            padding-top: 40px;
          }

          .brew-featured-heading {
            align-items: flex-start;
            flex-direction: column;
            gap: 5px;
          }

          .brew-featured-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .brew-featured-item:first-child,
          .brew-featured-item:nth-child(2),
          .brew-featured-item:nth-child(3) {
            height: 330px;
          }

          .brew-products {
            padding-top: 50px;
            padding-bottom: 75px;
          }

          .brew-product-grid {
            grid-template-columns: 1fr 1fr;
            gap: 38px 12px;
          }

          .brew-product-photo {
            aspect-ratio: .86;
            border-radius: 17px;
          }

          .brew-product-info {
            padding-top: 12px;
          }

          .brew-product-name {
            font-size: 17px;
          }

          .brew-product-price {
            font-size: 9px;
          }

          .brew-product-description {
            font-size: 9px;
          }

          .brew-heart {
            width: 33px;
            height: 33px;
            right: 9px;
            top: 9px;
          }

          .brew-badge {
            left: 9px;
            top: 9px;
            padding: 6px 8px;
            font-size: 6px;
          }
        }

        @media (max-width: 390px) {
          .brew-product-grid {
            gap: 32px 10px;
          }

          .brew-product-name {
            font-size: 16px;
          }

          .brew-hero-heading {
            font-size: 53px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .brew-product-card img,
          .brew-featured-item img,
          .brew-heart,
          .brew-toast {
            transition: none !important;
            animation: none !important;
          }
        }

      `}</style>

      {/* ==========================================================
          TOASTS
      ========================================================== */}

      <div
        className="brew-toasts"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`brew-toast ${
              toast.type === "error"
                ? "error"
                : ""
            }`}
          >
            <span className="brew-toast-check">
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

      <main className="brew-menu-page">

        {/* ========================================================
            HERO
        ======================================================== */}

        <section className="brew-menu-hero">
          {featuredItems[0]?.img ||
          featuredItems[0]?.image ? (
            <img
              className="brew-menu-hero-photo"
              src={
                featuredItems[0].img ||
                featuredItems[0].image
              }
              alt=""
              aria-hidden="true"
            />
          ) : null}

          <div className="brew-stamp">
            EST. 2024
          </div>

          <div className="brew-hero-content">
            <div className="brew-hero-pill">
              <Sparkles size={10} />
              Specialty coffee · Kolkata
            </div>

            <h1 className="brew-hero-heading">
              Good coffee.
              <br />
              <em>Good mood.</em>
            </h1>

            <p className="brew-hero-subtitle">
              Coffee worth slowing down for, little
              plates worth staying for, and moments
              made a little warmer.
            </p>

            <div className="brew-hero-meta">
              <span>Freshly brewed</span>

              <span className="brew-hero-dot" />

              <span>Made with love</span>

              <span className="brew-hero-dot" />

              <span>Every day</span>
            </div>
          </div>
        </section>

        {/* ========================================================
            INTRO
        ======================================================== */}

        <section className="brew-menu-intro">
          <div className="brew-intro-layout">
            <div>
              <p className="brew-mini-label">
                Welcome to Brewed
              </p>

              <h2 className="brew-intro-title">
                Pick your
                <br />
                <em>kind of happy.</em>
              </h2>
            </div>

            <p className="brew-intro-text">
              Whether you're craving a silky latte,
              something iced and refreshing, or a
              comforting bite on the side, there's
              something waiting for you here.
            </p>
          </div>
        </section>

        {/* ========================================================
            CATEGORIES
        ======================================================== */}

        <section className="brew-menu-controls">
          <div className="brew-controls-inner">
            <div
              className="brew-categories"
              role="tablist"
              aria-label="Menu categories"
            >
              {filters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  role="tab"
                  aria-selected={
                    activeCategory === filter
                  }
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
            </div>

            <div className="brew-controls-right">
              <div className="brew-search">
                <Search
                  size={14}
                  className="brew-search-icon"
                />

                <input
                  type="search"
                  placeholder="Search..."
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
                    Low to high
                  </option>

                  <option value="price-high">
                    High to low
                  </option>

                  <option value="popularity">
                    Highest rated
                  </option>
                </select>

                <ChevronDown size={12} />
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            HOUSE FAVOURITES
        ======================================================== */}

        {!searchQuery &&
          activeCategory === "All" &&
          featuredItems.length > 0 && (
            <section className="brew-featured">
              <div className="brew-featured-heading">
                <div>
                  <p className="brew-mini-label">
                    From our counter
                  </p>

                  <h2 className="brew-featured-title">
                    House favourites
                  </h2>
                </div>

                <span className="brew-featured-caption">
                  The ones everyone loves
                </span>
              </div>

              <div className="brew-featured-grid">
                {featuredItems.map((item) => (
                  <article
                    key={item.id}
                    className="brew-featured-item"
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
                      <div className="brew-placeholder">
                        {item.emoji || "☕"}
                      </div>
                    )}

                    <div className="brew-featured-fade">
                      <div className="brew-featured-info">
                        <span className="brew-featured-tag">
                          <Sparkles size={9} />

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
                            Number(
                              item.price
                            ) || 0
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

        {/* ========================================================
            MENU
        ======================================================== */}

        <section className="brew-products">
          <div className="brew-products-header">
            <h2 className="brew-products-title">
              {activeCategory === "All"
                ? "The menu"
                : activeCategory}
            </h2>

            <span className="brew-products-count">
              {visibleItems.length}{" "}
              {visibleItems.length === 1
                ? "item"
                : "items"}
            </span>
          </div>

          <div className="brew-product-grid">
            {visibleItems.length === 0 ? (
              <div className="brew-empty">
                <div className="brew-empty-icon">
                  <Search
                    size={19}
                    strokeWidth={1.5}
                  />
                </div>

                <h3>
                  Nothing found.
                </h3>

                <p>
                  We couldn't find anything matching
                  your search. Try another craving.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveCategory("All");
                  }}
                >
                  Show everything
                </button>
              </div>
            ) : (
              visibleItems.map((item) => {
                const isFavorite =
                  favorites.includes(item.id);

                const isAdded =
                  Boolean(added[item.id]);

                const unavailable =
                  item.available === false;

                return (
                  <article
                    key={item.id}
                    className="brew-product-card"
                    onClick={() =>
                      openProduct(item)
                    }
                  >
                    <div className="brew-product-photo">
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
                        <div className="brew-placeholder">
                          {item.emoji || "☕"}
                        </div>
                      )}

                      {item.isFeatured && (
                        <span className="brew-badge">
                          <Sparkles size={8} />
                          Featured
                        </span>
                      )}

                      {!item.isFeatured &&
                        item.isBestSeller && (
                          <span className="brew-badge best">
                            Bestseller
                          </span>
                        )}

                      {unavailable && (
                        <span className="brew-badge out">
                          Out of stock
                        </span>
                      )}

                      <button
                        type="button"
                        className={`brew-heart ${
                          isFavorite
                            ? "active"
                            : ""
                        }`}
                        aria-label={
                          isFavorite
                            ? `Remove ${item.name} from favourites`
                            : `Save ${item.name} to favourites`
                        }
                        aria-pressed={
                          isFavorite
                        }
                        onClick={(event) =>
                          toggleFavorite(
                            event,
                            item
                          )
                        }
                      >
                        <Heart
                          size={16}
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
                      <div className="brew-product-title-row">
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

                      <div className="brew-rating">
                        <span className="brew-rating-star">
                          ★
                        </span>

                        <span className="brew-rating-value">
                          {item.rating > 0
                            ? Number(
                                item.rating
                              ).toFixed(1)
                            : "New"}
                        </span>

                        {item.reviews > 0 && (
                          <span className="brew-rating-count">
                            · {item.reviews}
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
                        className={`brew-add-button ${
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
                        {unavailable ? (
                          "Unavailable"
                        ) : isAdded ? (
                          <>
                            <Check size={11} />
                            Added
                          </>
                        ) : (
                          "+ Add to order"
                        )}
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
