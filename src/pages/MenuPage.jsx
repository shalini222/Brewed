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

  /* ------------------------------------------------------------
     TOASTS
  ------------------------------------------------------------ */

  const showToast = (message, type = "success") => {
    const id = `${Date.now()}-${Math.random()}`;

    setToasts((prev) => [...prev, { id, message, type }]);

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  };

  /* ------------------------------------------------------------
     FETCH MENU
  ------------------------------------------------------------ */

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
            (a, b) => (Number(b.salesCount) || 0) - (Number(a.salesCount) || 0)
          )
          .slice(0, 5);

        setBestSellerIds(topSelling.map((item) => item.firestoreId));
        setMenuItems(items);
      } catch (error) {
        console.error("Error fetching menu:", error);

        if (mounted) {
          showToast("Unable to load the menu right now.", "error");
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

  /* ------------------------------------------------------------
     LOAD FAVORITES
  ------------------------------------------------------------ */

  useEffect(() => {
    let mounted = true;

    const loadFavorites = async () => {
      if (!currentUser) {
        setFavorites([]);
        return;
      }

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

  /* ------------------------------------------------------------
     FETCH REVIEW STATS
  ------------------------------------------------------------ */

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
          stats[productId].rating += Number(review.rating) || 0;
        });

        Object.keys(stats).forEach((id) => {
          const total = stats[id].total;

          stats[id].rating =
            total > 0
              ? Number((stats[id].rating / total).toFixed(1))
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

  /* ------------------------------------------------------------
     LIVE MENU METADATA
  ------------------------------------------------------------ */

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

  /* ------------------------------------------------------------
     FILTER + SORT
  ------------------------------------------------------------ */

  const sortedAndFiltered = useMemo(() => {
    const cleanSearch = searchQuery.toLowerCase().trim();

    const filtered = menuWithLiveMetadata.filter((item) => {
      const matchesSearch =
        !cleanSearch ||
        item.name?.toLowerCase().includes(cleanSearch) ||
        item.desc?.toLowerCase().includes(cleanSearch);

      if (!matchesSearch) return false;

      if (activeCategory === "All") return true;

      if (activeCategory === "Featured") {
        return item.isFeatured === true;
      }

      if (activeCategory === "Bestselling") {
        return bestSellerIds.includes(item.firestoreId);
      }

      return item.category === activeCategory;
    });

    return [...filtered].sort((a, b) => {
      if (activeCategory === "Bestselling") {
        return (
          (Number(b.salesCount) || 0) - (Number(a.salesCount) || 0)
        );
      }

      if (sortBy === "price-low") {
        return (Number(a.price) || 0) - (Number(b.price) || 0);
      }

      if (sortBy === "price-high") {
        return (Number(b.price) || 0) - (Number(a.price) || 0);
      }

      if (sortBy === "popularity") {
        return (Number(b.rating) || 0) - (Number(a.rating) || 0);
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
    bestSellerIds,
  ]);

  /* ------------------------------------------------------------
     ADD TO CART
  ------------------------------------------------------------ */

  const handleAdd = (item) => {
    if (!currentUser) {
      showToast("Please log in to add items to your cart.", "error");
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

  /* ------------------------------------------------------------
     FAVORITES
  ------------------------------------------------------------ */

  const toggleFavorite = async (event, item) => {
    event.stopPropagation();

    if (!currentUser) {
      showToast("Please log in to save favorites.", "error");
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

        showToast(`${item.name} removed from favorites.`);
      } else {
        await setDoc(favoriteRef, {
          ...item,
          savedAt: Date.now(),
        });

        setFavorites((prev) => [...prev, item.id]);

        showToast(`${item.name} saved to favorites.`);
      }
    } catch (error) {
      console.error("Error updating favorite:", error);
      showToast("Something went wrong. Please try again.", "error");
    }
  };

  /* ------------------------------------------------------------
     OPEN PRODUCT
  ------------------------------------------------------------ */

  const openProduct = (item) => {
    setSelectedProduct(item);
    setPage("product");
  };

  /* ------------------------------------------------------------
     RENDER
  ------------------------------------------------------------ */

  return (
    <>
      <style>{`
        /* =========================================================
           BREWED MENU — PREMIUM CAFE DESIGN
        ========================================================= */

        .brewed-menu-page {
          min-height: 100vh;
          background: #fbf8f3;
          color: #1a0a00;
          overflow-x: hidden;
        }

        /* ---------------------------------------------------------
           TOASTS
        --------------------------------------------------------- */

        .brewed-toast-container {
          position: fixed;
          left: 50%;
          bottom: 24px;
          transform: translateX(-50%);
          width: min(calc(100% - 32px), 390px);
          display: flex;
          flex-direction: column;
          gap: 9px;
          z-index: 9999;
          pointer-events: none;
        }

        .brewed-toast {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 13px 16px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 14px;
          background: rgba(26,10,0,.96);
          color: #fffaf3;
          box-shadow: 0 18px 45px rgba(26,10,0,.22);
          backdrop-filter: blur(14px);
          font-family: Inter, sans-serif;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: .01em;
          animation: brewedToastIn .35s cubic-bezier(.16,1,.3,1);
        }

        .brewed-toast-icon {
          width: 25px;
          height: 25px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          flex: 0 0 25px;
          background: #c4956a;
          color: #1a0a00;
        }

        .brewed-toast.error .brewed-toast-icon {
          background: #c95c52;
          color: #fff;
        }

        @keyframes brewedToastIn {
          from {
            opacity: 0;
            transform: translateY(14px) scale(.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* ---------------------------------------------------------
           HERO
        --------------------------------------------------------- */

        .brewed-menu-hero {
          position: relative;
          min-height: 455px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background:
            radial-gradient(
              circle at 78% 30%,
              rgba(196,149,106,.17),
              transparent 30%
            ),
            radial-gradient(
              circle at 18% 85%,
              rgba(92,46,14,.32),
              transparent 34%
            ),
            linear-gradient(
              135deg,
              #140702 0%,
              #211007 45%,
              #351806 100%
            );
        }

        .brewed-menu-hero::before {
          content: "";
          position: absolute;
          inset: 0;
          opacity: .12;
          background-image:
            radial-gradient(rgba(255,255,255,.8) .5px, transparent .5px);
          background-size: 6px 6px;
          pointer-events: none;
        }

        .brewed-menu-hero::after {
          content: "";
          position: absolute;
          width: 520px;
          height: 520px;
          right: -220px;
          top: -230px;
          border: 1px solid rgba(196,149,106,.2);
          border-radius: 50%;
          box-shadow:
            0 0 0 35px rgba(196,149,106,.025),
            0 0 0 70px rgba(196,149,106,.02);
        }

        .brewed-hero-content {
          position: relative;
          z-index: 2;
          width: min(100% - 40px, 760px);
          padding: 80px 0;
          text-align: center;
        }

        .brewed-hero-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin: 0 0 22px;
          color: #c4956a;
          font-family: Inter, sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .22em;
          text-transform: uppercase;
        }

        .brewed-hero-eyebrow::before,
        .brewed-hero-eyebrow::after {
          content: "";
          width: 24px;
          height: 1px;
          background: rgba(196,149,106,.55);
        }

        .brewed-hero-title {
          margin: 0;
          color: #fffaf3;
          font-family: "Playfair Display", Georgia, serif;
          font-size: clamp(46px, 8vw, 76px);
          font-weight: 500;
          line-height: .98;
          letter-spacing: -.045em;
        }

        .brewed-hero-title em {
          color: #d4ad84;
          font-weight: 400;
        }

        .brewed-hero-subtitle {
          max-width: 480px;
          margin: 25px auto 0;
          color: rgba(255,250,243,.65);
          font-family: Inter, sans-serif;
          font-size: 14px;
          line-height: 1.75;
          letter-spacing: .01em;
        }

        .brewed-hero-rule {
          width: 46px;
          height: 1px;
          margin: 30px auto 0;
          background: #c4956a;
        }

        /* ---------------------------------------------------------
           FILTER AREA
        --------------------------------------------------------- */

        .brewed-controls {
          position: sticky;
          top: 0;
          z-index: 80;
          border-bottom: 1px solid rgba(26,10,0,.075);
          background: rgba(251,248,243,.94);
          backdrop-filter: blur(18px);
        }

        .brewed-controls-inner {
          width: min(100% - 40px, 1240px);
          margin: 0 auto;
          padding: 17px 0;
        }

        .brewed-control-top {
          display: grid;
          grid-template-columns: minmax(0,1fr) minmax(220px,320px) auto;
          align-items: center;
          gap: 18px;
        }

        .brewed-categories {
          display: flex;
          align-items: center;
          gap: 7px;
          overflow-x: auto;
          scrollbar-width: none;
          min-width: 0;
        }

        .brewed-categories::-webkit-scrollbar {
          display: none;
        }

        .brewed-filter {
          flex: 0 0 auto;
          border: 1px solid transparent;
          background: transparent;
          color: #755f51;
          padding: 9px 13px;
          border-radius: 999px;
          cursor: pointer;
          font-family: Inter, sans-serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .01em;
          transition:
            color .2s ease,
            background .2s ease,
            border-color .2s ease,
            transform .2s ease;
        }

        .brewed-filter:hover {
          color: #1a0a00;
          background: rgba(196,149,106,.08);
        }

        .brewed-filter.active {
          color: #fffaf3;
          background: #1a0a00;
          border-color: #1a0a00;
        }

        .brewed-search {
          position: relative;
          display: flex;
          align-items: center;
        }

        .brewed-search-icon {
          position: absolute;
          left: 13px;
          color: #927e70;
          pointer-events: none;
        }

        .brewed-search-input {
          width: 100%;
          height: 39px;
          padding: 0 38px 0 38px;
          border: 1px solid rgba(26,10,0,.11);
          border-radius: 999px;
          outline: none;
          background: #fffdf9;
          color: #1a0a00;
          font-family: Inter, sans-serif;
          font-size: 11px;
          transition:
            border-color .2s ease,
            box-shadow .2s ease,
            background .2s ease;
        }

        .brewed-search-input::placeholder {
          color: #a49488;
        }

        .brewed-search-input:focus {
          border-color: rgba(26,10,0,.35);
          background: #fff;
          box-shadow: 0 0 0 3px rgba(196,149,106,.10);
        }

        .brewed-search-clear {
          position: absolute;
          right: 8px;
          width: 27px;
          height: 27px;
          display: grid;
          place-items: center;
          border: none;
          border-radius: 50%;
          background: transparent;
          color: #806e62;
          cursor: pointer;
        }

        .brewed-search-clear:hover {
          background: rgba(26,10,0,.06);
        }

        .brewed-sort {
          position: relative;
          min-width: 155px;
        }

        .brewed-sort-select {
          appearance: none;
          width: 100%;
          height: 39px;
          padding: 0 34px 0 14px;
          border: 1px solid rgba(26,10,0,.11);
          border-radius: 999px;
          outline: none;
          background: #fffdf9;
          color: #3b271c;
          cursor: pointer;
          font-family: Inter, sans-serif;
          font-size: 11px;
          font-weight: 600;
        }

        .brewed-sort-icon {
          position: absolute;
          right: 13px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          color: #5e493c;
        }

        .brewed-results-count {
          margin-top: 11px;
          color: #a18d80;
          font-family: Inter, sans-serif;
          font-size: 10px;
          letter-spacing: .03em;
        }

        /* ---------------------------------------------------------
           GRID
        --------------------------------------------------------- */

        .brewed-menu-grid {
          width: min(100% - 40px, 1240px);
          margin: 0 auto;
          padding: 42px 0 80px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 24px;
        }

        /* ---------------------------------------------------------
           PRODUCT CARD
        --------------------------------------------------------- */

        .brewed-product-card {
          position: relative;
          display: flex;
          flex-direction: column;
          min-width: 0;
          overflow: hidden;
          border: 1px solid rgba(26,10,0,.075);
          border-radius: 20px;
          background: #fffdf9;
          cursor: pointer;
          transition:
            transform .35s cubic-bezier(.16,1,.3,1),
            box-shadow .35s ease,
            border-color .35s ease;
        }

        .brewed-product-card:hover {
          transform: translateY(-6px);
          border-color: rgba(196,149,106,.24);
          box-shadow: 0 22px 55px rgba(26,10,0,.10);
        }

        .brewed-product-media {
          position: relative;
          height: 255px;
          overflow: hidden;
          background:
            radial-gradient(
              circle at 50% 40%,
              #fffdf8 0%,
              #f7eee4 100%
            );
        }

        .brewed-product-media img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          transition: transform .6s cubic-bezier(.16,1,.3,1);
        }

        .brewed-product-card:hover .brewed-product-media img {
          transform: scale(1.045);
        }

        .brewed-emoji-placeholder {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          color: #6a4630;
          font-size: 56px;
          background:
            radial-gradient(
              circle at 50% 42%,
              #fffdf9 0%,
              #f6e8da 100%
            );
        }

        .brewed-image-overlay {
          position: absolute;
          inset: auto 0 0;
          height: 70px;
          background: linear-gradient(
            to top,
            rgba(26,10,0,.13),
            transparent
          );
          pointer-events: none;
        }

        .brewed-badge {
          position: absolute;
          top: 14px;
          left: 14px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          min-height: 27px;
          padding: 0 10px;
          border: 1px solid rgba(196,149,106,.3);
          border-radius: 999px;
          background: rgba(255,250,243,.92);
          color: #4d2b18;
          backdrop-filter: blur(10px);
          font-family: Inter, sans-serif;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .09em;
          text-transform: uppercase;
          z-index: 3;
        }

        .brewed-badge.best {
          background: #1a0a00;
          border-color: #1a0a00;
          color: #fdf8ef;
        }

        .brewed-badge.out {
          top: 49px;
          background: rgba(156,45,36,.94);
          border-color: transparent;
          color: white;
        }

        .brewed-favorite {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(26,10,0,.08);
          border-radius: 50%;
          background: rgba(255,253,249,.9);
          color: #6d5546;
          backdrop-filter: blur(10px);
          cursor: pointer;
          z-index: 4;
          transition:
            transform .2s ease,
            background .2s ease,
            color .2s ease;
        }

        .brewed-favorite:hover {
          transform: scale(1.07);
          background: #1a0a00;
          color: #fffaf3;
        }

        .brewed-favorite.saved {
          background: #1a0a00;
          color: #c4956a;
        }

        /* ---------------------------------------------------------
           CARD BODY
        --------------------------------------------------------- */

        .brewed-card-body {
          display: flex;
          flex: 1;
          flex-direction: column;
          padding: 19px 19px 0;
        }

        .brewed-card-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
        }

        .brewed-card-name {
          margin: 0;
          color: #1a0a00;
          font-family: "Playfair Display", Georgia, serif;
          font-size: 20px;
          font-weight: 600;
          line-height: 1.15;
          letter-spacing: -.025em;
        }

        .brewed-card-price {
          flex: 0 0 auto;
          color: #4a2a18;
          font-family: "Playfair Display", Georgia, serif;
          font-size: 16px;
          font-weight: 700;
        }

        .brewed-rating {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 10px;
          font-family: Inter, sans-serif;
          font-size: 10px;
        }

        .brewed-rating-star {
          color: #b87d45;
        }

        .brewed-rating-score {
          color: #39271d;
          font-weight: 700;
        }

        .brewed-rating-count {
          color: #a08e82;
        }

        .brewed-card-desc {
          display: -webkit-box;
          overflow: hidden;
          margin: 11px 0 0;
          color: #806e61;
          font-family: Inter, sans-serif;
          font-size: 11px;
          line-height: 1.65;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .brewed-add-button {
          width: calc(100% - 38px);
          min-height: 43px;
          margin: 19px;
          border: 1px solid #1a0a00;
          border-radius: 11px;
          background: #1a0a00;
          color: #fffaf3;
          cursor: pointer;
          font-family: Inter, sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .03em;
          transition:
            background .2s ease,
            color .2s ease,
            transform .2s ease,
            box-shadow .2s ease;
        }

        .brewed-add-button:hover:not(:disabled) {
          background: #3b1a08;
          box-shadow: 0 8px 20px rgba(26,10,0,.13);
        }

        .brewed-add-button:active:not(:disabled) {
          transform: scale(.985);
        }

        .brewed-add-button.added {
          border-color: #c4956a;
          background: #c4956a;
          color: #1a0a00;
        }

        .brewed-add-button:disabled {
          border-color: #d7ccc3;
          background: #e4ddd7;
          color: #87766a;
          cursor: not-allowed;
        }

        /* ---------------------------------------------------------
           EMPTY STATE
        --------------------------------------------------------- */

        .brewed-empty {
          grid-column: 1 / -1;
          display: flex;
          min-height: 300px;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          text-align: center;
        }

        .brewed-empty-icon {
          width: 54px;
          height: 54px;
          display: grid;
          place-items: center;
          margin-bottom: 17px;
          border: 1px solid rgba(196,149,106,.3);
          border-radius: 50%;
          color: #8b6850;
          background: #f8eee4;
        }

        .brewed-empty-title {
          margin: 0;
          color: #29160c;
          font-family: "Playfair Display", Georgia, serif;
          font-size: 24px;
          font-weight: 500;
        }

        .brewed-empty-text {
          margin: 8px 0 0;
          color: #927e70;
          font-family: Inter, sans-serif;
          font-size: 11px;
        }

        .brewed-clear-search {
          margin-top: 18px;
          padding: 9px 15px;
          border: 1px solid rgba(26,10,0,.14);
          border-radius: 999px;
          background: transparent;
          color: #3b1a08;
          cursor: pointer;
          font-family: Inter, sans-serif;
          font-size: 10px;
          font-weight: 700;
        }

        /* ---------------------------------------------------------
           RESPONSIVE
        --------------------------------------------------------- */

        @media (max-width: 1050px) {
          .brewed-control-top {
            grid-template-columns: 1fr minmax(210px,280px);
          }

          .brewed-sort {
            display: none;
          }

          .brewed-menu-grid {
            grid-template-columns: repeat(2, minmax(0,1fr));
          }
        }

        @media (max-width: 700px) {
          .brewed-menu-hero {
            min-height: 390px;
          }

          .brewed-hero-content {
            padding: 65px 0;
          }

          .brewed-hero-title {
            font-size: clamp(43px, 14vw, 62px);
          }

          .brewed-hero-subtitle {
            font-size: 13px;
          }

          .brewed-controls-inner {
            width: min(100% - 28px, 1240px);
          }

          .brewed-control-top {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }

          .brewed-categories {
            order: 1;
          }

          .brewed-search {
            order: 2;
          }

          .brewed-menu-grid {
            width: min(100% - 28px, 1240px);
            grid-template-columns: 1fr;
            gap: 18px;
            padding-top: 28px;
          }

          .brewed-product-media {
            height: 265px;
          }
        }

        @media (max-width: 420px) {
          .brewed-menu-hero {
            min-height: 360px;
          }

          .brewed-hero-content {
            width: calc(100% - 30px);
          }

          .brewed-hero-title {
            font-size: 43px;
          }

          .brewed-product-media {
            height: 245px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .brewed-product-card,
          .brewed-product-media img,
          .brewed-toast,
          .brewed-add-button,
          .brewed-favorite {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      {/* =========================================================
          TOASTS
      ========================================================= */}

      <div className="brewed-toast-container" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`brewed-toast ${toast.type === "error" ? "error" : ""}`}
          >
            <span className="brewed-toast-icon">
              {toast.type === "error" ? (
                <X size={14} strokeWidth={2.5} />
              ) : (
                <Check size={14} strokeWidth={2.5} />
              )}
            </span>

            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      <main className="brewed-menu-page">
        {/* =======================================================
            HERO
        ======================================================= */}

        <section className="brewed-menu-hero">
          <div className="brewed-hero-content">
            <p className="brewed-hero-eyebrow">
              Est. 2024 · Kolkata
            </p>

            <h1 className="brewed-hero-title">
              Good coffee.
              <br />
              <em>Good moments.</em>
            </h1>

            <p className="brewed-hero-subtitle">
              Specialty coffee, thoughtful food and little things
              made beautifully — served fresh, every day.
            </p>

            <div className="brewed-hero-rule" />
          </div>
        </section>

        {/* =======================================================
            CONTROLS
        ======================================================= */}

        <section className="brewed-controls">
          <div className="brewed-controls-inner">
            <div className="brewed-control-top">
              <div className="brewed-categories">
                {filters.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={`brewed-filter ${
                      activeCategory === category ? "active" : ""
                    }`}
                    onClick={() => setActiveCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>

              <div className="brewed-search">
                <Search
                  className="brewed-search-icon"
                  size={15}
                  strokeWidth={1.8}
                />

                <input
                  type="search"
                  className="brewed-search-input"
                  placeholder="Search the menu..."
                  value={searchQuery}
                  onChange={(event) =>
                    setSearchQuery(event.target.value)
                  }
                  aria-label="Search menu"
                />

                {searchQuery && (
                  <button
                    type="button"
                    className="brewed-search-clear"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="brewed-sort">
                <select
                  className="brewed-sort-select"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  aria-label="Sort menu"
                >
                  <option value="default">Sort: Featured</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="popularity">
                    Highest Rated
                  </option>
                </select>

                <ChevronDown
                  className="brewed-sort-icon"
                  size={14}
                />
              </div>
            </div>

            <div className="brewed-results-count">
              {sortedAndFiltered.length}{" "}
              {sortedAndFiltered.length === 1 ? "item" : "items"}
              {activeCategory !== "All" &&
                ` · ${activeCategory}`}
            </div>
          </div>
        </section>

        {/* =======================================================
            PRODUCT GRID
        ======================================================= */}

        <section className="brewed-menu-grid">
          {sortedAndFiltered.length === 0 ? (
            <div className="brewed-empty">
              <div className="brewed-empty-icon">
                <Search size={20} strokeWidth={1.5} />
              </div>

              <h2 className="brewed-empty-title">
                Nothing found
              </h2>

              <p className="brewed-empty-text">
                Try another search or explore a different category.
              </p>

              {(searchQuery || activeCategory !== "All") && (
                <button
                  type="button"
                  className="brewed-clear-search"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveCategory("All");
                  }}
                >
                  View the full menu
                </button>
              )}
            </div>
          ) : (
            sortedAndFiltered.map((item) => {
              const isFavorite = favorites.includes(item.id);
              const isAdded = Boolean(added[item.id]);
              const isUnavailable = item.available === false;

              return (
                <article
                  key={item.id}
                  className="brewed-product-card"
                  onClick={() => openProduct(item)}
                >
                  {/* Image */}
                  <div className="brewed-product-media">
                    {item.img || item.image ? (
                      <img
                        src={item.img || item.image}
                        alt={item.name || "Menu item"}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="brewed-emoji-placeholder">
                        {item.emoji || "☕"}
                      </div>
                    )}

                    <div className="brewed-image-overlay" />

                    {/* Featured */}
                    {item.isFeatured && (
                      <div className="brewed-badge">
                        <Sparkles size={10} />
                        Featured
                      </div>
                    )}

                    {/* Bestseller */}
                    {!item.isFeatured && item.isBestSeller && (
                      <div className="brewed-badge best">
                        Bestseller
                      </div>
                    )}

                    {/* Out of stock */}
                    {isUnavailable && (
                      <div className="brewed-badge out">
                        Out of Stock
                      </div>
                    )}

                    {/* Favorite */}
                    <button
                      type="button"
                      className={`brewed-favorite ${
                        isFavorite ? "saved" : ""
                      }`}
                      onClick={(event) =>
                        toggleFavorite(event, item)
                      }
                      aria-label={
                        isFavorite
                          ? `Remove ${item.name} from favorites`
                          : `Save ${item.name} to favorites`
                      }
                      aria-pressed={isFavorite}
                    >
                      <Heart
                        size={17}
                        strokeWidth={1.8}
                        fill={isFavorite ? "currentColor" : "none"}
                      />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="brewed-card-body">
                    <div className="brewed-card-heading">
                      <h2 className="brewed-card-name">
                        {item.name}
                      </h2>

                      <span className="brewed-card-price">
                        ₹{Math.round(Number(item.price) || 0)}
                      </span>
                    </div>

                    <div className="brewed-rating">
                      <span className="brewed-rating-star">
                        ★
                      </span>

                      <span className="brewed-rating-score">
                        {item.rating > 0
                          ? Number(item.rating).toFixed(1)
                          : "New"}
                      </span>

                      {item.reviews > 0 && (
                        <span className="brewed-rating-count">
                          ({item.reviews})
                        </span>
                      )}
                    </div>

                    {item.desc && (
                      <p className="brewed-card-desc">
                        {item.desc}
                      </p>
                    )}
                  </div>

                  {/* Add */}
                  <button
                    type="button"
                    disabled={isUnavailable}
                    className={`brewed-add-button ${
                      isAdded ? "added" : ""
                    }`}
                    onClick={(event) => {
                      event.stopPropagation();

                      if (!isUnavailable) {
                        handleAdd(item);
                      }
                    }}
                  >
                    {isUnavailable
                      ? "Currently unavailable"
                      : isAdded
                      ? "✓ Added to cart"
                      : "Add to cart"}
                  </button>
                </article>
              );
            })
          )}
        </section>
      </main>
    </>
  );
}
