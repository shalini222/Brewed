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

  /* ==========================================
     LOAD FAVORITES
  ========================================== */

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

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

        const items = snapshot.docs.map((favoriteDoc) => ({
          id: favoriteDoc.id,
          ...favoriteDoc.data(),
        }));

        setFavorites(items);
      } catch (error) {
        console.error(
          "Error loading favorites:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadFavorites();
  }, [currentUser]);

  /* ==========================================
     OPEN PRODUCT
  ========================================== */

  const openProduct = (item) => {
    if (!item) return;

    setSelectedProduct(item);
    setPage("product");
  };

  /* ==========================================
     ADD TO CART
  ========================================== */

  const handleAddToCart = (item, event) => {
    event.stopPropagation();

    addToCart({
      ...item,
      qty: 1,
    });

    setPage("cart");
  };

  /* ==========================================
     REMOVE FAVORITE
  ========================================== */

  const removeFavorite = async (
    itemId,
    event
  ) => {
    event.stopPropagation();

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

      setFavorites((prev) =>
        prev.filter(
          (favorite) => favorite.id !== itemId
        )
      );
    } catch (error) {
      console.error(
        "Error removing favorite:",
        error
      );
    }
  };

  /* ==========================================
     LOADING
  ========================================== */

  if (loading) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Playfair+Display:wght@400;500;600&display=swap');

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            background: #f7f4ee;
          }

          .favorites-loading {
            min-height: 100vh;
            background: #f7f4ee;

            display: flex;
            align-items: center;
            justify-content: center;

            font-family: "DM Sans", sans-serif;
          }

          .loading-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 14px;
          }

          .loading-icon {
            width: 46px;
            height: 46px;

            display: flex;
            align-items: center;
            justify-content: center;

            border: 1px solid #ded4c9;
            border-radius: 50%;

            color: #8d6b52;

            animation:
              loadingPulse
              1.5s
              ease-in-out
              infinite;
          }

          .loading-label {
            color: #94867c;

            font-size: 10px;
            font-weight: 600;

            letter-spacing: .16em;
            text-transform: uppercase;
          }

          @keyframes loadingPulse {
            0%,
            100% {
              opacity: .55;
              transform: scale(.95);
            }

            50% {
              opacity: 1;
              transform: scale(1);
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

        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600&display=swap');

        /* ==========================================
           RESET
        ========================================== */

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

        /* ==========================================
           PAGE
        ========================================== */

        .favorites-page {
          min-height: 100vh;

          padding:
            105px
            28px
            90px;

          background:
            radial-gradient(
              circle at 90% -5%,
              rgba(182, 143, 108, .10),
              transparent 30%
            ),
            radial-gradient(
              circle at -5% 40%,
              rgba(207, 189, 168, .09),
              transparent 25%
            ),
            #f7f4ee;

          color: #302720;

          font-family:
            "DM Sans",
            sans-serif;
        }

        .favorites-container {
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
        }

        /* ==========================================
           HEADER
        ========================================== */

        .favorites-header {
          margin-bottom: 56px;
        }

        .favorites-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;

          margin-bottom: 54px;
        }

        .back-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;

          padding: 0;

          border: 0;
          background: transparent;

          color: #796c63;

          font-size: 11px;
          font-weight: 600;

          letter-spacing: .04em;

          cursor: pointer;

          transition:
            color .25s ease,
            transform .25s ease;
        }

        .back-button:hover {
          color: #513b2c;
          transform: translateX(-3px);
        }

        .saved-count {
          display: flex;
          align-items: baseline;
          gap: 7px;

          color: #918279;

          font-size: 10px;
          font-weight: 500;

          letter-spacing: .10em;
          text-transform: uppercase;
        }

        .saved-number {
          color: #49372b;

          font-size: 12px;
          font-weight: 700;

          letter-spacing: 0;
        }

        /* ==========================================
           EDITORIAL TITLE
        ========================================== */

        .favorites-heading {
          display: flex;
          align-items: flex-start;
          gap: 24px;
        }

        .heading-accent {
          flex-shrink: 0;

          width: 2px;
          height: 82px;

          margin-top: 4px;

          border-radius: 20px;

          background:
            linear-gradient(
              to bottom,
              #987054,
              rgba(152,112,84,.12)
            );
        }

        .heading-content {
          max-width: 760px;
        }

        .heading-kicker {
          margin: 0 0 11px;

          color: #a17a5b;

          font-size: 9px;
          font-weight: 700;

          letter-spacing: .22em;
          text-transform: uppercase;
        }

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
              74px
            );

          font-weight: 400;

          line-height: .94;

          letter-spacing: -.045em;
        }

        .favorites-subtitle {
          max-width: 480px;

          margin:
            19px
            0
            0;

          color: #887970;

          font-size: 13px;

          line-height: 1.75;

          letter-spacing: .002em;
        }

        /* ==========================================
           GRID
        ========================================== */

        .favorites-grid {
          display: grid;

          grid-template-columns:
            repeat(
              3,
              minmax(0, 1fr)
            );

          gap: 27px;
        }

        /* ==========================================
           CARD
        ========================================== */

        .favorite-card {
          position: relative;

          overflow: hidden;

          background: #fffdf9;

          border:
            1px solid
            rgba(71, 52, 39, .095);

          border-radius: 17px;

          box-shadow:
            0 8px 26px
            rgba(54, 40, 30, .042);

          cursor: pointer;

          transition:
            transform .45s
              cubic-bezier(.22, 1, .36, 1),
            box-shadow .45s ease,
            border-color .35s ease;
        }

        .favorite-card:hover {
          transform: translateY(-8px);

          border-color:
            rgba(125, 89, 61, .19);

          box-shadow:
            0 25px 55px
            rgba(52, 39, 30, .095),
            0 6px 15px
            rgba(52, 39, 30, .035);
        }

        /* ==========================================
           IMAGE
        ========================================== */

        .favorite-image-wrapper {
          position: relative;

          height: 265px;

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
          transform: scale(1.055);
        }

        .image-shade {
          position: absolute;

          inset: auto 0 0;

          height: 100px;

          background:
            linear-gradient(
              to top,
              rgba(31, 24, 19, .18),
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
              circle at center,
              #faf0e6 0%,
              #eadbcb 100%
            );

          font-size: 76px;
        }

        /* ==========================================
           HEART
        ========================================== */

        .favorite-heart {
          position: absolute;

          top: 16px;
          right: 16px;

          z-index: 5;

          width: 40px;
          height: 40px;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: 0;

          border:
            1px solid
            rgba(255,255,255,.58);

          border-radius: 50%;

          background:
            rgba(255,255,255,.86);

          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);

          color: #98694d;

          box-shadow:
            0 5px 17px
            rgba(33, 23, 16, .10);

          cursor: pointer;

          transition:
            transform .25s ease,
            background .25s ease,
            color .25s ease;
        }

        .favorite-heart:hover {
          transform: scale(1.08);

          background: #ffffff;

          color: #a75f3e;
        }

        .favorite-heart:active {
          transform: scale(.93);
        }

        /* ==========================================
           CONTENT
        ========================================== */

        .favorite-content {
          padding:
            23px
            23px
            22px;
        }

        .favorite-name {
          margin: 0;

          color: #352920;

          font-family:
            "Playfair Display",
            serif;

          font-size: 23px;
          font-weight: 500;

          line-height: 1.12;

          letter-spacing: -.018em;
        }

        .favorite-description {
          min-height: 45px;

          margin:
            11px
            0
            21px;

          color: #897970;

          font-size: 12.5px;

          line-height: 1.7;

          display: -webkit-box;

          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;

          overflow: hidden;
        }

        .favorite-divider {
          width: 100%;
          height: 1px;

          margin-bottom: 17px;

          background:
            #eee6dd;
        }

        /* ==========================================
           FOOTER
        ========================================== */

        .favorite-footer {
          display: flex;

          align-items: center;
          justify-content: space-between;

          gap: 14px;
        }

        .price-label {
          display: block;

          margin-bottom: 3px;

          color: #a2958c;

          font-size: 8px;
          font-weight: 700;

          letter-spacing: .16em;
          text-transform: uppercase;
        }

        .favorite-price {
          color: #392b23;

          font-size: 18px;
          font-weight: 700;

          letter-spacing: -.025em;
        }

        /* ==========================================
           ADD TO CART
        ========================================== */

        .add-cart-button {
          display: inline-flex;

          align-items: center;
          justify-content: center;

          gap: 7px;

          min-height: 41px;

          padding:
            0
            15px;

          border:
            1px solid
            #49372b;

          border-radius: 9px;

          background: #49372b;

          color: #fffaf5;

          font-size: 10px;
          font-weight: 600;

          letter-spacing: .02em;

          cursor: pointer;

          transition:
            background .25s ease,
            border-color .25s ease,
            transform .25s ease;
        }

        .add-cart-button:hover {
          background: #654937;

          border-color: #654937;

          transform: translateY(-1px);
        }

        .add-cart-button:hover svg {
          transform: translate(
            2px,
            -2px
          );
        }

        .add-cart-button svg {
          transition:
            transform .25s ease;
        }

        .add-cart-button:active {
          transform: translateY(0);
        }

        /* ==========================================
           EMPTY STATE
        ========================================== */

        .empty-state {
          position: relative;

          padding:
            92px
            28px;

          text-align: center;

          background:
            rgba(255,253,249,.78);

          border:
            1px solid
            #e7ded5;

          border-radius: 20px;

          box-shadow:
            0 8px 28px
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
            23px;

          border:
            1px solid
            #ddd1c5;

          border-radius: 50%;

          background: #faf6f0;

          color: #96745b;
        }

        .empty-title {
          margin:
            0
            0
            10px;

          color: #382b23;

          font-family:
            "Playfair Display",
            serif;

          font-size: 29px;

          font-weight: 500;
        }

        .empty-text {
          max-width: 400px;

          margin:
            0
            auto;

          color: #8a7a70;

          font-size: 13px;

          line-height: 1.75;
        }

        /* ==========================================
           TABLET
        ========================================== */

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

        /* ==========================================
           MOBILE
        ========================================== */

        @media (max-width: 650px) {

          .favorites-page {
            padding:
              91px
              16px
              55px;
          }

          .favorites-header {
            margin-bottom: 38px;
          }

          .favorites-nav {
            margin-bottom: 40px;
          }

          .favorites-heading {
            gap: 17px;
          }

          .heading-accent {
            width: 2px;
            height: 62px;

            margin-top: 3px;
          }

          .heading-kicker {
            margin-bottom: 9px;

            font-size: 8px;
            letter-spacing: .20em;
          }

          .favorites-title {
            font-size: 47px;

            line-height: .95;
          }

          .favorites-subtitle {
            margin-top: 14px;

            font-size: 12px;

            line-height: 1.72;
          }

          .favorites-grid {
            grid-template-columns: 1fr;

            gap: 19px;
          }

          .favorite-image-wrapper {
            height: 250px;
          }

          .favorite-content {
            padding:
              20px
              20px
              21px;
          }

          .favorite-name {
            font-size: 22px;
          }

          .favorite-description {
            margin-top: 9px;
            margin-bottom: 19px;
          }
        }

        /* ==========================================
           SMALL MOBILE
        ========================================== */

        @media (max-width: 380px) {

          .favorites-page {
            padding-left: 14px;
            padding-right: 14px;
          }

          .favorites-title {
            font-size: 43px;
          }

          .favorite-footer {
            align-items: stretch;

            flex-direction: column;
          }

          .add-cart-button {
            width: 100%;
          }
        }

      `}</style>

      <div className="favorites-page">

        <div className="favorites-container">

          {/* ======================================
              HEADER
          ====================================== */}

          <header className="favorites-header">

            <div className="favorites-nav">

              <button
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

              {favorites.length > 0 && (
                <div className="saved-count">

                  <span className="saved-number">
                    {String(
                      favorites.length
                    ).padStart(2, "0")}
                  </span>

                  <span>
                    saved
                  </span>

                </div>
              )}

            </div>

            <div className="favorites-heading">

              <div className="heading-accent" />

              <div className="heading-content">

                <p className="heading-kicker">
                  Your collection
                </p>

                <h1 className="favorites-title">
                  Things you love.
                </h1>

                <p className="favorites-subtitle">
                  Your personal selection of Brewed
                  favorites, saved for whenever the
                  mood strikes.
                </p>

              </div>

            </div>

          </header>

          {/* ======================================
              EMPTY
          ====================================== */}

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
                When something on the menu steals
                your heart, tap the heart icon and
                it'll appear here.
              </p>

            </div>

          ) : (

            /* ======================================
               FAVORITES
            ====================================== */

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

                  onKeyDown={(event) => {

                    if (
                      event.key === "Enter" ||
                      event.key === " "
                    ) {

                      event.preventDefault();

                      openProduct(item);
                    }

                  }}

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
                            .display = "none";

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

                      <div>

                        <span className="price-label">
                          Price
                        </span>

                        <div className="favorite-price">
                          ₹{item.price}
                        </div>

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

                        Add to cart

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
