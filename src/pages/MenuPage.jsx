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
     TOASTS
  ========================================================= */

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

  /* =========================================================
     FETCH MENU
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    const fetchMenu = async () => {
      try {
        setLoading(true);

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
        showToast("Unable to load the menu.", "error");
      } finally {
        if (mounted) {
          setLoading(false);
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

  /* =========================================================
     REVIEW STATISTICS
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
                stats[id].rating /
                stats[id].total
              ).toFixed(1)
            );
          }
        });

        if (mounted) {
          setReviewStats(stats);
        }
      } catch (error) {
        console.error(
          "Error fetching review stats:",
          error
        );
      }
    };

    fetchReviewStats();

    return () => {
      mounted = false;
    };
  }, []);

  /* =========================================================
     LIVE MENU METADATA
  ========================================================= */

  const menuWithLiveMetadata = useMemo(() => {
    return menuItems.map((item) => {
      const review = reviewStats[item.id];

      return {
        ...item,

        isBestSeller: bestSellerIds.includes(
          item.firestoreId
        ),

        rating: review
          ? Number(review.rating)
          : 0,

        reviews: review
          ? review.total
          : 0,
      };
    });
  }, [
    menuItems,
    reviewStats,
    bestSellerIds,
  ]);

  /* =========================================================
     FILTERING + SORTING
  ========================================================= */

  const filteredItems = useMemo(() => {
    const search = searchQuery
      .toLowerCase()
      .trim();

    const filtered = menuWithLiveMetadata.filter(
      (item) => {
        const matchesSearch =
          !search ||
          item.name
            ?.toLowerCase()
            .includes(search) ||
          item.desc
            ?.toLowerCase()
            .includes(search) ||
          item.category
            ?.toLowerCase()
            .includes(search);

        if (!matchesSearch) {
          return false;
        }

        if (activeCategory === "All") {
          return true;
        }

        if (activeCategory === "Featured") {
          return item.isFeatured === true;
        }

        if (activeCategory === "Bestselling") {
          return item.isBestSeller;
        }

        return item.category === activeCategory;
      }
    );

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
     FEATURED PRODUCT
  ========================================================= */

  const featuredProduct = useMemo(() => {
    return menuWithLiveMetadata.find(
      (item) =>
        item.isFeatured &&
        item.available !== false
    );
  }, [menuWithLiveMetadata]);

  /* =========================================================
     PRODUCT
  ========================================================= */

  const openProduct = (item) => {
    setSelectedProduct(item);
    setPage("product");
  };

  /* =========================================================
     ADD TO CART
  ========================================================= */

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

    showToast(
      `${item.name} added to your cart.`
    );

    window.setTimeout(() => {
      setAdded((prev) => ({
        ...prev,
        [item.id]: false,
      }));
    }, 1100);
  };

  /* =========================================================
     FAVORITES
  ========================================================= */

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
          prev.filter(
            (id) => id !== item.id
          )
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
          `${item.name} saved to favourites ♡`
        );
      }
    } catch (error) {
      console.error(
        "Favorite update error:",
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
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,500;1,400&display=swap');

        :root {
          --brew-bg: #fcfaf7;
          --brew-surface: #ffffff;
          --brew-cream: #f4ede5;
          --brew-espresso: #30231d;
          --brew-mocha: #756257;
          --brew-muted: #9c8d84;
          --brew-line: #eee7e1;
          --brew-pink: #e8cecb;
          --brew-pink-dark: #a76f6c;
          --brew-sage: #d7dfd1;
          --brew-sage-dark: #63715f;
          --brew-gold: #bd914e;
        }

        .brew-menu {
          min-height: 100vh;
          background: var(--brew-bg);
          color: var(--brew-espresso);
          font-family: "DM Sans", sans-serif;
        }

        /* HEADER */

        .menu-header {
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
          padding: 28px 0 18px;
        }

        .menu-header-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 26px;
        }

        .brand-lockup {
          display: flex;
          align-items: baseline;
          gap: 7px;
        }

        .brand-name {
          font-family: "Manrope", sans-serif;
          font-size: 25px;
          font-weight: 800;
          letter-spacing: -.06em;
        }

        .brand-mark {
          color: var(--brew-pink-dark);
          font-family: "Playfair Display", serif;
          font-size: 15px;
          font-style: italic;
        }

        .header-note {
          color: var(--brew-muted);
          font-size: 10px;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        /* INTRO */

        .menu-intro {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 30px;
          margin-bottom: 23px;
        }

        .intro-copy {
          max-width: 600px;
        }

        .intro-kicker {
          margin: 0 0 9px;
          color: var(--brew-pink-dark);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .16em;
          text-transform: uppercase;
        }

        .intro-title {
          margin: 0;
          font-family: "Manrope", sans-serif;
          font-size: clamp(2rem, 4vw, 3.2rem);
          font-weight: 800;
          line-height: 1;
          letter-spacing: -.065em;
        }

        .intro-title em {
          font-family: "Playfair Display", serif;
          font-weight: 400;
          letter-spacing: -.035em;
        }

        .intro-subtitle {
          max-width: 430px;
          margin: 11px 0 0;
          color: var(--brew-muted);
          font-size: 12px;
          line-height: 1.65;
        }

        /* SEARCH */

        .search-wrap {
          position: relative;
          width: min(450px, 100%);
        }

        .search-box {
          display: flex;
          align-items: center;
          height: 48px;
          padding: 0 15px;
          border: 1px solid var(--brew-line);
          border-radius: 14px;
          background: var(--brew-surface);
          box-shadow: 0 5px 20px rgba(57,39,28,.035);
          transition: border-color .2s ease,
                      box-shadow .2s ease;
        }

        .search-box:focus-within {
          border-color: #d9c8bf;
          box-shadow: 0 6px 24px rgba(57,39,28,.065);
        }

        .search-box svg {
          flex: 0 0 auto;
          color: #a89990;
        }

        .search-box input {
          flex: 1;
          width: 100%;
          height: 100%;
          padding: 0 10px;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--brew-espresso);
          font-family: "DM Sans", sans-serif;
          font-size: 12px;
        }

        .search-box input::placeholder {
          color: #b4a69e;
        }

        .clear-search {
          width: 25px;
          height: 25px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 50%;
          background: #f4efeb;
          color: #8e7c72;
          cursor: pointer;
        }

        /* CATEGORIES */

        .category-row {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-x: auto;
          padding: 2px 0 7px;
          scrollbar-width: none;
        }

        .category-row::-webkit-scrollbar {
          display: none;
        }

        .category {
          flex: 0 0 auto;
          height: 34px;
          padding: 0 15px;
          border: 1px solid var(--brew-line);
          border-radius: 999px;
          background: transparent;
          color: var(--brew-mocha);
          cursor: pointer;
          font-family: "DM Sans", sans-serif;
          font-size: 10px;
          font-weight: 600;
          transition: all .2s ease;
        }

        .category:hover {
          background: #f7f2ed;
        }

        .category.active {
          border-color: var(--brew-espresso);
          background: var(--brew-espresso);
          color: white;
        }

        /* FEATURED EDITORIAL */

        .featured-wrap {
          width: min(1180px, calc(100% - 40px));
          margin: 30px auto 0;
        }

        .featured-card {
          position: relative;
          display: grid;
          grid-template-columns: 1.3fr .7fr;
          min-height: 255px;
          overflow: hidden;
          border-radius: 24px;
          background: #eee2d8;
          cursor: pointer;
        }

        .featured-image {
          position: relative;
          overflow: hidden;
        }

        .featured-image img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          transition: transform .5s ease;
        }

        .featured-card:hover .featured-image img {
          transform: scale(1.04);
        }

        .featured-image::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            transparent 55%,
            rgba(0,0,0,.08)
          );
          pointer-events: none;
        }

        .featured-content {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 32px;
          background: #f2e7dc;
        }

        .featured-label {
          color: var(--brew-pink-dark);
          font-size: 8px;
          font-weight: 800;
          letter-spacing: .15em;
          text-transform: uppercase;
        }

        .featured-content h2 {
          margin: 12px 0 7px;
          font-family: "Manrope", sans-serif;
          font-size: 25px;
          font-weight: 800;
          letter-spacing: -.045em;
          line-height: 1.05;
        }

        .featured-content p {
          max-width: 290px;
          margin: 0;
          color: var(--brew-mocha);
          font-size: 10px;
          line-height: 1.65;
        }

        .featured-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 21px;
        }

        .featured-price {
          font-family: "Manrope", sans-serif;
          font-size: 17px;
          font-weight: 800;
        }

        .featured-add {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 9px 13px;
          border: 0;
          border-radius: 10px;
          background: var(--brew-espresso);
          color: white;
          cursor: pointer;
          font-family: "DM Sans", sans-serif;
          font-size: 9px;
          font-weight: 700;
        }

        /* MENU SECTION */

        .menu-content {
          width: min(1180px, calc(100% - 40px));
          margin: 40px auto 0;
          padding-bottom: 70px;
        }

        .menu-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 18px;
        }

        .heading-left {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .heading-left h2 {
          margin: 0;
          font-family: "Manrope", sans-serif;
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -.035em;
        }

        .heading-left span {
          color: var(--brew-muted);
          font-size: 10px;
        }

        .sort {
          position: relative;
        }

        .sort select {
          appearance: none;
          height: 32px;
          padding: 0 28px 0 11px;
          border: 1px solid var(--brew-line);
          border-radius: 9px;
          outline: 0;
          background: white;
          color: var(--brew-mocha);
          cursor: pointer;
          font-family: "DM Sans", sans-serif;
          font-size: 9px;
        }

        .sort svg {
          position: absolute;
          top: 50%;
          right: 8px;
          transform: translateY(-50%);
          pointer-events: none;
          color: #9d8c83;
        }

        /* GRID */

        .menu-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0,1fr));
          gap: 18px;
        }

        .menu-card {
          min-width: 0;
          overflow: hidden;
          border-radius: 20px;
          background: white;
          box-shadow:
            0 3px 18px rgba(58,39,28,.045);
          cursor: pointer;
          transition:
            transform .25s ease,
            box-shadow .25s ease;
        }

        .menu-card:hover {
          transform: translateY(-4px);
          box-shadow:
            0 13px 30px rgba(58,39,28,.085);
        }

        .card-image {
          position: relative;
          aspect-ratio: 1 / .91;
          overflow: hidden;
          background: var(--brew-cream);
        }

        .card-image img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          transition: transform .45s ease;
        }

        .menu-card:hover .card-image img {
          transform: scale(1.045);
        }

        .image-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            radial-gradient(
              circle at center,
              #fffaf6,
              #eee0d5
            );
          font-size: 48px;
        }

        /* FAVORITE */

        .favorite {
          position: absolute;
          top: 11px;
          right: 11px;
          z-index: 4;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 50%;
          background: rgba(255,255,255,.94);
          color: var(--brew-espresso);
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(48,35,29,.08);
          transition: transform .2s ease;
        }

        .favorite:hover {
          transform: scale(1.08);
        }

        /* BADGES */

        .badge {
          position: absolute;
          left: 11px;
          top: 11px;
          z-index: 3;
          padding: 5px 8px;
          border-radius: 7px;
          background: rgba(255,255,255,.94);
          color: var(--brew-mocha);
          font-size: 7px;
          font-weight: 800;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .badge.featured {
          background: #ead1ce;
          color: #8c5d59;
        }

        .badge.out {
          top: auto;
          bottom: 11px;
          background: #7b4d48;
          color: white;
        }

        /* CARD BODY */

        .card-body {
          padding: 13px 13px 14px;
        }

        .card-title-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }

        .card-name {
          margin: 0;
          color: var(--brew-espresso);
          font-family: "Manrope", sans-serif;
          font-size: 13px;
          font-weight: 800;
          line-height: 1.25;
          letter-spacing: -.02em;
        }

        .card-price {
          flex: 0 0 auto;
          color: var(--brew-espresso);
          font-family: "Manrope", sans-serif;
          font-size: 12px;
          font-weight: 800;
        }

        .card-desc {
          display: -webkit-box;
          min-height: 30px;
          margin: 6px 0 11px;
          overflow: hidden;
          color: var(--brew-muted);
          font-size: 9px;
          line-height: 1.6;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .rating {
          display: flex;
          align-items: center;
          gap: 4px;
          color: var(--brew-muted);
          font-size: 8px;
          font-weight: 600;
        }

        .rating svg {
          color: var(--brew-gold);
        }

        .add-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          height: 29px;
          min-width: 58px;
          padding: 0 9px;
          border: 1px solid #e5dad2;
          border-radius: 9px;
          background: #fffdfa;
          color: var(--brew-espresso);
          cursor: pointer;
          font-family: "DM Sans", sans-serif;
          font-size: 8px;
          font-weight: 800;
          transition: all .2s ease;
        }

        .add-button:hover {
          border-color: var(--brew-espresso);
          background: var(--brew-espresso);
          color: white;
        }

        .add-button.added {
          border-color: var(--brew-sage);
          background: var(--brew-sage);
          color: var(--brew-sage-dark);
        }

        .add-button:disabled {
          cursor: not-allowed;
          opacity: .5;
        }

        /* LOADING */

        .loading-grid {
          display: grid;
          grid-template-columns: repeat(4,1fr);
          gap: 18px;
          grid-column: 1/-1;
        }

        .skeleton {
          height: 330px;
          border-radius: 20px;
          background:
            linear-gradient(
              100deg,
              #f1e9e3 30%,
              #faf6f2 45%,
              #f1e9e3 60%
            );
          background-size: 200% 100%;
          animation: shimmer 1.3s infinite;
        }

        @keyframes shimmer {
          from { background-position: 200% 0; }
          to { background-position: -200% 0; }
        }

        /* EMPTY */

        .empty {
          grid-column: 1/-1;
          padding: 70px 20px;
          border: 1px dashed #e5dad2;
          border-radius: 20px;
          background: white;
          text-align: center;
        }

        .empty h3 {
          margin: 12px 0 6px;
          font-family: "Manrope", sans-serif;
          font-size: 18px;
        }

        .empty p {
          margin: 0 0 18px;
          color: var(--brew-muted);
          font-size: 10px;
        }

        .empty button {
          padding: 9px 14px;
          border: 0;
          border-radius: 9px;
          background: var(--brew-espresso);
          color: white;
          cursor: pointer;
          font-size: 9px;
          font-weight: 700;
        }

        /* TOAST */

        .toast-container {
          position: fixed;
          left: 50%;
          bottom: 22px;
          z-index: 9999;
          width: min(380px, calc(100% - 30px));
          display: flex;
          flex-direction: column;
          gap: 8px;
          transform: translateX(-50%);
          pointer-events: none;
        }

        .toast {
          padding: 12px 16px;
          border-radius: 12px;
          background: var(--brew-espresso);
          color: white;
          box-shadow: 0 12px 35px rgba(48,35,29,.2);
          font-size: 10px;
          font-weight: 600;
          text-align: center;
          animation: toastIn .25s ease;
        }

        .toast.error {
          background: #794b47;
        }

        @keyframes toastIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* TABLET */

        @media (max-width: 1000px) {
          .menu-grid {
            grid-template-columns: repeat(3,1fr);
          }

          .loading-grid {
            grid-template-columns: repeat(3,1fr);
          }

          .menu-intro {
            flex-direction: column;
            align-items: stretch;
          }

          .search-wrap {
            width: 100%;
          }
        }

        /* MOBILE */

        @media (max-width: 680px) {
          .menu-header,
          .featured-wrap,
          .menu-content {
            width: calc(100% - 24px);
          }

          .menu-header {
            padding-top: 20px;
          }

          .header-note {
            display: none;
          }

          .menu-header-top {
            margin-bottom: 22px;
          }

          .brand-name {
            font-size: 23px;
          }

          .intro-title {
            font-size: 34px;
          }

          .intro-subtitle {
            max-width: 340px;
            font-size: 11px;
          }

          .featured-wrap {
            margin-top: 25px;
          }

          .featured-card {
            grid-template-columns: 1fr;
            border-radius: 20px;
          }

          .featured-image {
            height: 220px;
          }

          .featured-content {
            padding: 23px;
          }

          .featured-content h2 {
            font-size: 22px;
          }

          .menu-content {
            margin-top: 32px;
          }

          .menu-heading {
            align-items: center;
          }

          .heading-left h2 {
            font-size: 18px;
          }

          .heading-left span {
            display: none;
          }

          .menu-grid {
            grid-template-columns: repeat(2,minmax(0,1fr));
            gap: 11px;
          }

          .loading-grid {
            grid-template-columns: repeat(2,1fr);
            gap: 11px;
          }

          .skeleton {
            height: 275px;
            border-radius: 16px;
          }

          .menu-card {
            border-radius: 16px;
          }

          .card-image {
            aspect-ratio: .9;
          }

          .card-body {
            padding: 10px;
          }

          .card-name {
            font-size: 11px;
          }

          .card-price {
            font-size: 11px;
          }

          .card-desc {
            min-height: 28px;
            margin: 5px 0 9px;
            font-size: 8px;
          }

          .rating {
            font-size: 7px;
          }

          .add-button {
            height: 27px;
            min-width: 53px;
            font-size: 7px;
          }

          .favorite {
            width: 29px;
            height: 29px;
            top: 8px;
            right: 8px;
          }

          .badge {
            top: 8px;
            left: 8px;
            padding: 4px 6px;
            font-size: 6px;
          }

          .badge.out {
            bottom: 8px;
          }
        }

        @media (max-width: 370px) {
          .menu-grid {
            grid-template-columns: 1fr;
          }

          .card-image {
            aspect-ratio: 1.05;
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

      <div
        className="toast-container"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast ${toast.type}`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      <main className="brew-menu">

        {/* ===================================================
            HEADER
        =================================================== */}

        <header className="menu-header">

          <div className="menu-header-top">
            <div className="brand-lockup">
              <span className="brand-name">
                brewed
              </span>

              <span className="brand-mark">
                coffee & little things
              </span>
            </div>

            <span className="header-note">
              Est. 2024 · Kolkata
            </span>
          </div>

          <div className="menu-intro">

            <div className="intro-copy">
              <p className="intro-kicker">
                made for your everyday
              </p>

              <h1 className="intro-title">
                What are you in the mood <em>for?</em>
              </h1>

              <p className="intro-subtitle">
                Slow mornings, study breaks, late-night
                cravings — find something lovely to sip
                or snack on.
              </p>
            </div>

            <div className="search-wrap">
              <div className="search-box">

                <Search size={17} />

                <input
                  type="search"
                  placeholder="Search coffee, food & more..."
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
                    className="clear-search"
                    onClick={() =>
                      setSearchQuery("")
                    }
                    aria-label="Clear search"
                  >
                    <X size={13} />
                  </button>
                )}

              </div>
            </div>

          </div>

          <nav
            className="category-row"
            aria-label="Menu categories"
          >
            {filters.map((category) => (
              <button
                key={category}
                type="button"
                className={`category ${
                  activeCategory === category
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setActiveCategory(category)
                }
              >
                {category}
              </button>
            ))}
          </nav>

        </header>

        {/* ===================================================
            FEATURED
        =================================================== */}

        {!loading &&
          !searchQuery.trim() &&
          activeCategory === "All" &&
          featuredProduct && (
            <section className="featured-wrap">

              <article
                className="featured-card"
                onClick={() =>
                  openProduct(featuredProduct)
                }
              >

                <div className="featured-image">
                  {featuredProduct.img ||
                  featuredProduct.image ? (
                    <img
                      src={
                        featuredProduct.img ||
                        featuredProduct.image
                      }
                      alt={featuredProduct.name}
                      loading="eager"
                    />
                  ) : (
                    <div className="image-fallback">
                      {featuredProduct.emoji ||
                        "☕"}
                    </div>
                  )}
                </div>

                <div className="featured-content">

                  <span className="featured-label">
                    ✦ currently loving
                  </span>

                  <h2>
                    {featuredProduct.name}
                  </h2>

                  <p>
                    {featuredProduct.desc ||
                      "Something freshly made and worth slowing down for."}
                  </p>

                  <div className="featured-bottom">

                    <span className="featured-price">
                      ₹
                      {Math.round(
                        Number(
                          featuredProduct.price ||
                            0
                        )
                      )}
                    </span>

                    <button
                      type="button"
                      className="featured-add"
                      disabled={
                        featuredProduct.available ===
                        false
                      }
                      onClick={(event) => {
                        event.stopPropagation();

                        if (
                          featuredProduct.available !==
                          false
                        ) {
                          handleAdd(
                            featuredProduct
                          );
                        }
                      }}
                    >
                      {added[
                        featuredProduct.id
                      ] ? (
                        <>
                          <Check size={12} />
                          Added
                        </>
                      ) : (
                        <>
                          <Plus size={12} />
                          Add to order
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

        <section className="menu-content">

          <div className="menu-heading">

            <div className="heading-left">
              <h2>
                {activeCategory === "All"
                  ? "The menu"
                  : activeCategory}
              </h2>

              {!loading && (
                <span>
                  {filteredItems.length}{" "}
                  {filteredItems.length === 1
                    ? "item"
                    : "items"}
                </span>
              )}
            </div>

            <div className="sort">

              <select
                value={sortBy}
                onChange={(event) =>
                  setSortBy(
                    event.target.value
                  )
                }
                aria-label="Sort menu"
              >
                <option value="default">
                  Recommended
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

              <ChevronDown size={11} />

            </div>

          </div>

          <div className="menu-grid">

            {loading ? (
              <div className="loading-grid">
                {Array.from({
                  length: 8,
                }).map((_, index) => (
                  <div
                    key={index}
                    className="skeleton"
                  />
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="empty">

                <Search
                  size={26}
                  color="#b78e88"
                />

                <h3>
                  Nothing caught your eye
                </h3>

                <p>
                  Try another search or browse
                  everything on the menu.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveCategory("All");
                  }}
                >
                  View all
                </button>

              </div>
            ) : (
              filteredItems.map((item) => {

                const image =
                  item.img ||
                  item.image ||
                  null;

                const isFavorite =
                  favorites.includes(
                    item.id
                  );

                return (
                  <article
                    key={item.id}
                    className="menu-card"
                    onClick={() =>
                      openProduct(item)
                    }
                  >

                    <div className="card-image">

                      {image ? (
                        <img
                          src={image}
                          alt={item.name}
                          loading="lazy"
                        />
                      ) : (
                        <div className="image-fallback">
                          {item.emoji ||
                            "☕"}
                        </div>
                      )}

                      {/* BADGE */}

                      {item.isFeatured ? (
                        <span className="badge featured">
                          ✦ Featured
                        </span>
                      ) : item.isBestSeller ? (
                        <span className="badge">
                          ★ Bestseller
                        </span>
                      ) : null}

                      {item.available ===
                        false && (
                        <span className="badge out">
                          Out of stock
                        </span>
                      )}

                      {/* FAVORITE */}

                      <button
                        type="button"
                        className="favorite"
                        aria-label={
                          isFavorite
                            ? `Remove ${item.name} from favourites`
                            : `Save ${item.name} to favourites`
                        }
                        onClick={(event) =>
                          toggleFavorite(
                            item,
                            event
                          )
                        }
                      >
                        <Heart
                          size={15}
                          strokeWidth={1.8}
                          fill={
                            isFavorite
                              ? "currentColor"
                              : "none"
                          }
                        />
                      </button>

                    </div>

                    {/* BODY */}

                    <div className="card-body">

                      <div className="card-title-row">

                        <h3 className="card-name">
                          {item.name}
                        </h3>

                        <span className="card-price">
                          ₹
                          {Math.round(
                            Number(
                              item.price || 0
                            )
                          )}
                        </span>

                      </div>

                      <p className="card-desc">
                        {item.desc ||
                          "Freshly made at Brewed."}
                      </p>

                      <div className="card-footer">

                        <div className="rating">

                          {item.rating > 0 ? (
                            <>
                              <Star
                                size={10}
                                fill="currentColor"
                              />

                              <span>
                                {item.rating}
                              </span>

                              {item.reviews >
                                0 && (
                                <span>
                                  ·{" "}
                                  {
                                    item.reviews
                                  }
                                </span>
                              )}
                            </>
                          ) : (
                            <span>
                              New on the menu
                            </span>
                          )}

                        </div>

                        <button
                          type="button"
                          className={`add-button ${
                            added[item.id]
                              ? "added"
                              : ""
                          }`}
                          disabled={
                            item.available ===
                            false
                          }
                          onClick={(event) => {
                            event.stopPropagation();

                            if (
                              item.available !==
                              false
                            ) {
                              handleAdd(item);
                            }
                          }}
                        >

                          {item.available ===
                          false ? (
                            "Unavailable"
                          ) : added[item.id] ? (
                            <>
                              <Check size={11} />
                              Added
                            </>
                          ) : (
                            <>
                              <Plus size={11} />
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
