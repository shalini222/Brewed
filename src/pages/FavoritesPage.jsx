import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { db } from "../firebase";

import {
  collection,
  getDocs,
  doc,
  deleteDoc,
} from "firebase/firestore";

import {
  Heart,
  ArrowLeft,
  ArrowUpRight,
  Coffee,
} from "lucide-react";

export default function FavoritesPage({
  setPage,
  setSelectedProduct,
}) {
  const { currentUser } = useAuth();
  const { addToCart } = useCart();

  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  /* =========================================================
     LOAD FAVORITES
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    const loadFavorites = async () => {
      if (!currentUser) {
        if (mounted) {
          setFavorites([]);
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);

        const snapshot = await getDocs(
          collection(
            db,
            "users",
            currentUser.uid,
            "favorites"
          )
        );

        const items = snapshot.docs.map((favoriteDoc) => ({
          id: favoriteDoc.id,
          ...favoriteDoc.data(),
        }));

        if (mounted) {
          setFavorites(items);
        }
      } catch (error) {
        console.error(
          "Error loading favorites:",
          error
        );

        if (mounted) {
          setFavorites([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadFavorites();

    return () => {
      mounted = false;
    };
  }, [currentUser]);

  /* =========================================================
     OPEN PRODUCT
  ========================================================= */

  const openProduct = (item) => {
    if (!item) return;

    if (typeof setSelectedProduct === "function") {
      setSelectedProduct(item);
    }

    setPage("product");
  };

  /* =========================================================
     ADD TO CART
  ========================================================= */

  const handleAddToCart = (item, event) => {
    event.stopPropagation();

    if (!item) return;

    addToCart({
      ...item,
      qty: 1,
    });

    setPage("cart");
  };

  /* =========================================================
     REMOVE FAVORITE
  ========================================================= */

  const removeFavorite = async (itemId, event) => {
    event.stopPropagation();

    if (!currentUser || !itemId) return;

    const previousFavorites = [...favorites];

    setFavorites((prev) =>
      prev.filter(
        (favorite) => favorite.id !== itemId
      )
    );

    try {
      await deleteDoc(
        doc(
          db,
          "users",
          currentUser.uid,
          "favorites",
          String(itemId)
        )
      );
    } catch (error) {
      console.error(
        "Error removing favorite:",
        error
      );

      setFavorites(previousFavorites);
    }
  };

  /* =========================================================
     KEYBOARD CARD NAVIGATION
  ========================================================= */

  const handleCardKeyDown = (event, item) => {
    if (
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      openProduct(item);
    }
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <>
        <style>{`

          @import url(
            'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Playfair+Display:wght@400;500&display=swap'
          );

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            background: #f7f4ee;
          }

          .favorites-loading {
            min-height: 100vh;

            display: flex;
            align-items: center;
            justify-content: center;

            background: #f7f4ee;

            font-family:
              "DM Sans",
              sans-serif;
          }

          .loading-content {
            display: flex;
            flex-direction: column;
            align-items: center;

            gap: 13px;
          }

          .loading-icon {
            width: 46px;
            height: 46px;

            display: flex;
            align-items: center;
            justify-content: center;

            border:
              1px solid
              #ddd2c7;

            border-radius: 50%;

            color: #8d6b52;

            animation:
              favoritesPulse
              1.5s
              ease-in-out
              infinite;
          }

          .loading-label {
            color: #918279;

            font-size: 11px;
            font-weight: 600;

            letter-spacing: .14em;

            text-transform: uppercase;
          }

          @keyframes favoritesPulse {

            0%,
            100% {
              opacity: .5;
            }

            50% {
              opacity: 1;
            }

          }

        `}</style>

        <div className="favorites-loading">

          <div className="loading-content">

            <div className="loading-icon">

              <Coffee
                size={18}
                strokeWidth={1.5}
              />

            </div>

            <span className="loading-label">
              Loading
            </span>

          </div>

        </div>
      </>
    );
  }

  return (
    <>
      <style>{`

        @import url(
          'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@400;500&display=swap'
        );

        /* =====================================================
           RESET
        ===================================================== */

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;

          background: #f7f4ee;
        }

        button {
          font-family: inherit;
        }

        /* =====================================================
           PAGE
        ===================================================== */

        .favorites-page {
          min-height: 100vh;

          /*
            Much less empty space at the top.
          */

          padding:
            48px
            28px
            90px;

          background: #f7f4ee;

          color: #302720;

          font-family:
            "DM Sans",
            sans-serif;
        }

        .favorites-container {
          width: 100%;
          max-width: 1160px;

          margin: 0 auto;
        }

        /* =====================================================
           HEADER
        ===================================================== */

        .favorites-header {
          margin-bottom: 48px;
        }

        .favorites-nav {
          margin-bottom: 28px;
        }

        .back-button {
          display: inline-flex;

          align-items: center;

          gap: 8px;

          padding: 0;

          border: 0;

          background: transparent;

          color: #7c6e65;

          font-size: 14px;

          font-weight: 500;

          letter-spacing: .01em;

          cursor: pointer;

          transition:
            color .25s ease,
            transform .25s ease;
        }

        .back-button:hover {
          color: #4f3b2d;

          transform:
            translateX(-3px);
        }

        .back-button:focus-visible {
          outline:
            2px solid
            rgba(145, 104, 74, .5);

          outline-offset: 5px;

          border-radius: 4px;
        }

        /* =====================================================
           HEADING
        ===================================================== */

        .favorites-title {
          margin: 0;

          color: #30251e;

          font-family:
            "Playfair Display",
            serif;

          font-size:
            clamp(
              50px,
              6vw,
              72px
            );

          font-weight: 400;

          line-height: .98;

          letter-spacing: -.045em;
        }

        .favorites-subtitle {
          max-width: 520px;

          margin:
            19px
            0
            0;

          color: #82736a;

          font-size: 16px;

          line-height: 1.7;

          letter-spacing: .002em;
        }

        /* =====================================================
           GRID
        ===================================================== */

        .favorites-grid {
          display: grid;

          grid-template-columns:
            repeat(
              3,
              minmax(0, 1fr)
            );

          gap: 27px;
        }

        /* =====================================================
           CARD
        ===================================================== */

        .favorite-card {
          position: relative;

          overflow: hidden;

          background: #fffdf9;

          border:
            1px solid
            rgba(71, 52, 39, .09);

          border-radius: 17px;

          box-shadow:
            0 8px 26px
            rgba(54, 40, 30, .045);

          cursor: pointer;

          transition:
            transform .45s
              cubic-bezier(.22, 1, .36, 1),
            box-shadow .45s ease,
            border-color .35s ease;
        }

        .favorite-card:hover {
          transform:
            translateY(-7px);

          border-color:
            rgba(125, 89, 61, .18);

          box-shadow:
            0 25px 52px
            rgba(52, 39, 30, .09);
        }

        .favorite-card:focus-visible {
          outline:
            2px solid
            rgba(145, 104, 74, .5);

          outline-offset: 4px;
        }

        /* =====================================================
           IMAGE
        ===================================================== */

        .favorite-image-wrapper {
          position: relative;

          height: 270px;

          overflow: hidden;

          background: #eee6dc;
        }

        .favorite-image {
          display: block;

          width: 100%;
          height: 100%;

          object-fit: cover;

          transition:
            transform .8s
            cubic-bezier(.22, 1, .36, 1);
        }

        .favorite-card:hover
        .favorite-image {
          transform:
            scale(1.045);
        }

        .image-shade {
          position: absolute;

          left: 0;
          right: 0;
          bottom: 0;

          height: 90px;

          background:
            linear-gradient(
              to top,
              rgba(30, 23, 18, .14),
              transparent
            );

          pointer-events: none;
        }

        .emoji-fallback {
          width: 100%;
          height: 100%;

          align-items: center;
          justify-content: center;

          background:
            radial-gradient(
              circle,
              #faf0e6,
              #eadbcb
            );

          font-size: 78px;
        }

        /* =====================================================
           HEART
        ===================================================== */

        .favorite-heart {
          position: absolute;

          top: 16px;
          right: 16px;

          z-index: 5;

          width: 42px;
          height: 42px;

          display: flex;

          align-items: center;
          justify-content: center;

          padding: 0;

          border:
            1px solid
            rgba(255,255,255,.58);

          border-radius: 50%;

          background:
            rgba(255,255,255,.88);

          backdrop-filter:
            blur(12px);

          -webkit-backdrop-filter:
            blur(12px);

          color: #98694d;

          box-shadow:
            0 5px 16px
            rgba(33, 23, 16, .09);

          cursor: pointer;

          transition:
            transform .25s ease,
            background .25s ease;
        }

        .favorite-heart:hover {
          transform:
            scale(1.08);

          background: #fff;
        }

        .favorite-heart:active {
          transform:
            scale(.94);
        }

        .favorite-heart:focus-visible {
          outline:
            2px solid
            rgba(145, 104, 74, .5);

          outline-offset: 3px;
        }

        /* =====================================================
           CONTENT
        ===================================================== */

        .favorite-content {
          padding:
            25px
            24px
            24px;
        }

        .favorite-name {
          margin: 0;

          color: #352920;

          font-family:
            "Playfair Display",
            serif;

          font-size: 26px;

          font-weight: 500;

          line-height: 1.15;

          letter-spacing: -.018em;
        }

        .favorite-description {
          min-height: 50px;

          margin:
            12px
            0
            21px;

          color: #7d6f66;

          font-size: 15px;

          line-height: 1.65;

          display: -webkit-box;

          -webkit-line-clamp: 2;

          -webkit-box-orient: vertical;

          overflow: hidden;
        }

        .favorite-divider {
          width: 100%;
          height: 1px;

          margin-bottom: 18px;

          background:
            #eee4da;
        }

        /* =====================================================
           FOOTER
        ===================================================== */

        .favorite-footer {
          display: flex;

          align-items: center;
          justify-content: space-between;

          gap: 15px;
        }

        .favorite-price {
          color: #392b23;

          font-size: 21px;

          font-weight: 700;

          letter-spacing: -.025em;
        }

        /* =====================================================
           ADD
        ===================================================== */

        .add-cart-button {
          display: inline-flex;

          align-items: center;
          justify-content: center;

          gap: 7px;

          min-height: 44px;

          padding:
            0
            18px;

          border:
            1px solid
            #49372b;

          border-radius: 9px;

          background:
            #49372b;

          color:
            #fffaf5;

          font-size: 13px;

          font-weight: 600;

          letter-spacing: .015em;

          cursor: pointer;

          transition:
            background .25s ease,
            border-color .25s ease,
            transform .25s ease;
        }

        .add-cart-button:hover {
          background:
            #644936;

          border-color:
            #644936;

          transform:
            translateY(-1px);
        }

        .add-cart-button:active {
          transform:
            translateY(0);
        }

        .add-cart-button:focus-visible {
          outline:
            2px solid
            rgba(145, 104, 74, .5);

          outline-offset: 3px;
        }

        .add-cart-button svg {
          transition:
            transform .25s ease;
        }

        .add-cart-button:hover svg {
          transform:
            translate(
              2px,
              -2px
            );
        }

        /* =====================================================
           EMPTY STATE
        ===================================================== */

        .empty-state {
          padding:
            90px
            25px;

          text-align: center;

          background:
            rgba(255,253,249,.72);

          border:
            1px solid
            #e7ded5;

          border-radius: 18px;

          box-shadow:
            0 8px 26px
            rgba(52,39,30,.035);
        }

        .empty-icon {
          width: 60px;
          height: 60px;

          display: flex;

          align-items: center;
          justify-content: center;

          margin:
            0
            auto
            22px;

          border:
            1px solid
            #ddd1c5;

          border-radius: 50%;

          background:
            #faf6f0;

          color:
            #96745b;
        }

        .empty-title {
          margin:
            0
            0
            10px;

          color:
            #382b23;

          font-family:
            "Playfair Display",
            serif;

          font-size:
            31px;

          font-weight:
            500;
        }

        .empty-text {
          max-width:
            410px;

          margin:
            0
            auto;

          color:
            #83746b;

          font-size:
            15px;

          line-height:
            1.7;
        }

        /* =====================================================
           TABLET
        ===================================================== */

        @media (max-width: 980px) {

          .favorites-page {
            padding-left: 22px;
            padding-right: 22px;
          }

          .favorites-grid {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              );
          }

        }

        /* =====================================================
           MOBILE
        ===================================================== */

        @media (max-width: 650px) {

          .favorites-page {
            padding:
              48px
              16px
              55px;
          }

          .favorites-header {
            margin-bottom: 38px;
          }

          .favorites-nav {
            margin-bottom: 27px;
          }

          .back-button {
            font-size: 13px;
          }

          .favorites-title {
            font-size: 47px;

            line-height: .95;
          }

          .favorites-subtitle {
            max-width:
              350px;

            margin-top:
              15px;

            font-size:
              15px;

            line-height:
              1.7;
          }

          .favorites-grid {
            grid-template-columns: 1fr;

            gap: 19px;
          }

          .favorite-image-wrapper {
            height:
              255px;
          }

          .favorite-content {
            padding:
              22px
              21px
              23px;
          }

          .favorite-name {
            font-size:
              25px;
          }

          .favorite-description {
            min-height:
              49px;

            margin-top:
              11px;

            margin-bottom:
              20px;

            font-size:
              14.5px;

            line-height:
              1.68;
          }

          .favorite-price {
            font-size:
              20px;
          }

          .add-cart-button {
            min-height:
              43px;

            padding:
              0
              18px;

            font-size:
              13px;
          }

        }

        /* =====================================================
           SMALL MOBILE
        ===================================================== */

        @media (max-width: 380px) {

          .favorites-page {
            padding:
              43px
              14px
              50px;
          }

          .favorites-title {
            font-size:
              43px;
          }

          .favorites-subtitle {
            font-size:
              14px;
          }

          .favorite-footer {
            align-items:
              stretch;

            flex-direction:
              column;
          }

          .add-cart-button {
            width:
              100%;
          }

        }

        /* =====================================================
           REDUCED MOTION
        ===================================================== */

        @media (prefers-reduced-motion: reduce) {

          .favorite-card,
          .favorite-image,
          .favorite-heart,
          .add-cart-button,
          .back-button {
            transition:
              none !important;
          }

          .favorite-card:hover {
            transform:
              none;
          }

          .favorite-card:hover
          .favorite-image {
            transform:
              none;
          }

        }

      `}</style>

      <div className="favorites-page">

        <div className="favorites-container">

          {/* =================================================
              HEADER
          ================================================= */}

          <header className="favorites-header">

            <div className="favorites-nav">

              <button
                type="button"
                className="back-button"
                onClick={() =>
                  setPage("menu")
                }
              >
                <ArrowLeft
                  size={15}
                  strokeWidth={1.8}
                />

                Menu
              </button>

            </div>

            <h1 className="favorites-title">
              Things you love.
            </h1>

            <p className="favorites-subtitle">
              Your saved Brewed favorites,
              ready whenever you are.
            </p>

          </header>

          {/* =================================================
              EMPTY STATE
          ================================================= */}

          {favorites.length === 0 ? (

            <div className="empty-state">

              <div className="empty-icon">

                <Heart
                  size={23}
                  strokeWidth={1.5}
                />

              </div>

              <h2 className="empty-title">
                Nothing saved yet
              </h2>

              <p className="empty-text">
                When something on the menu
                steals your heart, tap the
                heart icon and it'll appear here.
              </p>

            </div>

          ) : (

            /* =================================================
               FAVORITES
            ================================================= */

            <div className="favorites-grid">

              {favorites.map((item) => (

                <article
                  key={item.id}
                  className="favorite-card"

                  onClick={() =>
                    openProduct(item)
                  }

                  role="button"
                  tabIndex={0}

                  onKeyDown={(event) =>
                    handleCardKeyDown(
                      event,
                      item
                    )
                  }

                  aria-label={
                    `View ${item.name}`
                  }
                >

                  {/* HEART */}

                  <button
                    type="button"
                    className="favorite-heart"

                    aria-label={
                      `Remove ${item.name} ` +
                      `from favorites`
                    }

                    onClick={(event) =>
                      removeFavorite(
                        item.id,
                        event
                      )
                    }
                  >

                    <Heart
                      size={18}
                      strokeWidth={2}
                      fill="currentColor"
                    />

                  </button>

                  {/* IMAGE */}

                  <div className="favorite-image-wrapper">

                    {item.image ? (

                      <img
                        src={item.image}
                        alt={item.name}
                        className="favorite-image"

                        onError={(event) => {

                          event
                            .currentTarget
                            .style
                            .display =
                            "none";

                          const fallback =
                            event
                              .currentTarget
                              .nextElementSibling;

                          if (fallback) {
                            fallback.style.display =
                              "flex";
                          }

                        }}
                      />

                    ) : null}

                    <div
                      className="emoji-fallback"

                      style={{
                        display:
                          item.image
                            ? "none"
                            : "flex",
                      }}
                    >
                      {item.emoji || "☕"}
                    </div>

                    <div className="image-shade" />

                  </div>

                  {/* CONTENT */}

                  <div className="favorite-content">

                    <h2 className="favorite-name">
                      {item.name}
                    </h2>

                    <p className="favorite-description">
                      {item.desc ||
                        "A delicious Brewed favorite, made for your next coffee moment."}
                    </p>

                    <div className="favorite-divider" />

                    <div className="favorite-footer">

                      <div className="favorite-price">
                        ₹{item.price}
                      </div>

                      <button
                        type="button"
                        className="add-cart-button"

                        onClick={(event) =>
                          handleAddToCart(
                            item,
                            event
                          )
                        }
                      >
                        Add

                        <ArrowUpRight
                          size={14}
                          strokeWidth={2}
                        />
                      </button>

                    </div>

                  </div>

                </article>

              ))}

            </div>

          )}

        </div>

      </div>
    </>
  );
}
