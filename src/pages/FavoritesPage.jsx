import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
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

  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

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

  /* --------------------------------
     OPEN PRODUCT
  -------------------------------- */

  const openProduct = (item) => {
    if (!item) return;

    setSelectedProduct(item);
    setPage("product");
  };

  /* --------------------------------
     REMOVE FAVORITE
  -------------------------------- */

  const removeFavorite = async (
    itemId,
    event
  ) => {
    event?.stopPropagation();

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

  /* --------------------------------
     LOADING
  -------------------------------- */

  if (loading) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Playfair+Display:wght@500;600;700&display=swap');

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            background: #f8f5ef;
          }

          .favorites-loading {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f8f5ef;
            font-family: "DM Sans", sans-serif;
          }

          .loading-inner {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 13px;
          }

          .loading-icon {
            width: 44px;
            height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid #ded3c8;
            border-radius: 50%;
            color: #8b6b54;
            animation: favoritePulse 1.5s ease-in-out infinite;
          }

          .loading-text {
            color: #8d7d71;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: .14em;
            text-transform: uppercase;
          }

          @keyframes favoritePulse {
            0%,
            100% {
              transform: scale(.94);
              opacity: .65;
            }

            50% {
              transform: scale(1);
              opacity: 1;
            }
          }
        `}</style>

        <div className="favorites-loading">
          <div className="loading-inner">
            <div className="loading-icon">
              <Coffee
                size={19}
                strokeWidth={1.6}
              />
            </div>

            <div className="loading-text">
              Loading favorites
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap');

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #f8f5ef;
        }

        /* =================================
           PAGE
        ================================= */

        .favorites-page {
          min-height: 100vh;
          padding: 108px 28px 80px;

          background:
            radial-gradient(
              circle at 90% 0%,
              rgba(183, 145, 112, .08),
              transparent 28%
            ),
            #f8f5ef;

          font-family: "DM Sans", sans-serif;
          color: #302821;
        }

        .favorites-container {
          width: 100%;
          max-width: 1160px;
          margin: 0 auto;
        }

        /* =================================
           HEADER
        ================================= */

        .favorites-header {
          margin-bottom: 44px;
        }

        .favorites-header-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 22px;
        }

        .back-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;

          padding: 0;
          border: 0;
          background: transparent;

          color: #75665c;
          font-family: "DM Sans", sans-serif;
          font-size: 13px;
          font-weight: 600;

          cursor: pointer;

          transition:
            color .25s ease,
            transform .25s ease;
        }

        .back-button:hover {
          color: #8a654b;
          transform: translateX(-3px);
        }

        .favorites-count {
          display: flex;
          align-items: center;
          gap: 8px;

          color: #96867b;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .count-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #a97c5a;
        }

        .favorites-eyebrow {
          margin: 0 0 10px;

          color: #a07859;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .19em;
          text-transform: uppercase;
        }

        .favorites-title {
          margin: 0;

          color: #30251e;
          font-family: "Playfair Display", serif;
          font-size: clamp(44px, 5vw, 62px);
          font-weight: 600;
          line-height: .98;
          letter-spacing: -.035em;
        }

        .favorites-subtitle {
          max-width: 470px;
          margin: 15px 0 0;

          color: #87776d;
          font-size: 14px;
          line-height: 1.7;
        }

        /* =================================
           GRID
        ================================= */

        .favorites-grid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 25px;
        }

        /* =================================
           CARD
        ================================= */

        .favorite-card {
          position: relative;
          overflow: hidden;

          background: #fffdf9;
          border: 1px solid rgba(77, 56, 43, .10);
          border-radius: 18px;

          box-shadow:
            0 6px 22px rgba(54, 40, 30, .045),
            0 2px 5px rgba(54, 40, 30, .025);

          cursor: pointer;

          transition:
            transform .35s cubic-bezier(.22, 1, .36, 1),
            box-shadow .35s ease,
            border-color .35s ease;
        }

        .favorite-card:hover {
          transform: translateY(-7px);

          border-color:
            rgba(130, 94, 66, .20);

          box-shadow:
            0 23px 48px rgba(52, 39, 30, .10),
            0 5px 13px rgba(52, 39, 30, .035);
        }

        .favorite-card:active {
          transform: translateY(-4px);
        }

        /* =================================
           IMAGE
        ================================= */

        .favorite-image-wrapper {
          position: relative;
          height: 255px;
          overflow: hidden;
          background: #eee5da;
        }

        .favorite-image {
          display: block;

          width: 100%;
          height: 100%;

          object-fit: cover;

          transition:
            transform .7s
            cubic-bezier(.22, 1, .36, 1);
        }

        .favorite-card:hover
        .favorite-image {
          transform: scale(1.045);
        }

        .image-overlay {
          position: absolute;
          inset: auto 0 0;

          height: 85px;

          background: linear-gradient(
            to top,
            rgba(31, 24, 19, .20),
            transparent
          );

          pointer-events: none;
        }

        .emoji-image {
          width: 100%;
          height: 100%;

          align-items: center;
          justify-content: center;

          background:
            radial-gradient(
              circle,
              #f8eee4 0%,
              #ecdfd1 100%
            );

          font-size: 74px;
        }

        /* =================================
           HEART
        ================================= */

        .favorite-heart {
          position: absolute;
          top: 15px;
          right: 15px;
          z-index: 10;

          width: 40px;
          height: 40px;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: 0;

          border: 1px solid
            rgba(255, 255, 255, .60);

          border-radius: 50%;

          background:
            rgba(255, 255, 255, .88);

          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);

          color: #96664b;

          cursor: pointer;

          box-shadow:
            0 5px 16px
            rgba(31, 21, 15, .10);

          transition:
            transform .25s ease,
            background .25s ease,
            color .25s ease;
        }

        .favorite-heart:hover {
          transform: scale(1.08);
          background: #fff;
          color: #a96748;
        }

        .favorite-heart:active {
          transform: scale(.94);
        }

        /* =================================
           CARD CONTENT
        ================================= */

        .favorite-content {
          padding: 22px 22px 21px;
        }

        .favorite-name {
          margin: 0;

          color: #362a22;
          font-family: "Playfair Display", serif;
          font-size: 23px;
          font-weight: 600;
          line-height: 1.15;
          letter-spacing: -.015em;
        }

        .favorite-description {
          min-height: 46px;

          margin: 10px 0 20px;

          color: #897970;
          font-size: 13px;
          line-height: 1.65;

          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .favorite-divider {
          width: 100%;
          height: 1px;
          margin-bottom: 17px;
          background: #eee6de;
        }

        .favorite-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
        }

        .price-label {
          display: block;

          margin-bottom: 3px;

          color: #a09389;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .13em;
          text-transform: uppercase;
        }

        .favorite-price {
          color: #392b23;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -.02em;
        }

        /*
          This button is deliberately visual only.
          The card itself handles navigation.
        */

        .view-product {
          display: inline-flex;
          align-items: center;
          gap: 6px;

          min-height: 40px;
          padding: 0 14px;

          border: 1px solid #4b382c;
          border-radius: 9px;

          background: #4b382c;
          color: #fffaf5;

          font-family: "DM Sans", sans-serif;
          font-size: 11px;
          font-weight: 600;

          pointer-events: none;
        }

        /* =================================
           EMPTY
        ================================= */

        .empty-state {
          padding: 78px 28px;

          text-align: center;

          background: rgba(255, 253, 249, .82);
          border: 1px solid #e8dfd6;
          border-radius: 20px;
        }

        .empty-icon {
          width: 58px;
          height: 58px;

          display: flex;
          align-items: center;
          justify-content: center;

          margin: 0 auto 22px;

          border: 1px solid #ded1c5;
          border-radius: 50%;

          background: #faf5ef;
          color: #96745c;
        }

        .empty-title {
          margin: 0 0 9px;

          color: #392c24;
          font-family: "Playfair Display", serif;
          font-size: 28px;
          font-weight: 600;
        }

        .empty-text {
          max-width: 400px;
          margin: 0 auto;

          color: #8b7b70;
          font-size: 13px;
          line-height: 1.7;
        }

        /* =================================
           TABLET
        ================================= */

        @media (max-width: 980px) {
          .favorites-page {
            padding-left: 22px;
            padding-right: 22px;
          }

          .favorites-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }
        }

        /* =================================
           MOBILE
        ================================= */

        @media (max-width: 650px) {
          .favorites-page {
            padding:
              92px
              16px
              55px;
          }

          .favorites-header {
            margin-bottom: 34px;
          }

          .favorites-header-top {
            margin-bottom: 25px;
          }

          .favorites-count {
            font-size: 9px;
          }

          .favorites-eyebrow {
            margin-bottom: 9px;
            font-size: 9px;
          }

          .favorites-title {
            font-size: 44px;
          }

          .favorites-subtitle {
            margin-top: 13px;
            font-size: 13px;
          }

          .favorites-grid {
            grid-template-columns: 1fr;
            gap: 19px;
          }

          .favorite-image-wrapper {
            height: 245px;
          }

          .favorite-content {
            padding: 20px;
          }

          .favorite-name {
            font-size: 22px;
          }

          .favorite-description {
            margin-top: 9px;
            margin-bottom: 19px;
          }
        }

        @media (max-width: 380px) {
          .favorites-footer {
            align-items: stretch;
            flex-direction: column;
          }

          .view-product {
            justify-content: center;
            width: 100%;
          }
        }
      `}</style>

      <div className="favorites-page">
        <div className="favorites-container">

          {/* ===============================
              HEADER
          =============================== */}

          <header className="favorites-header">

            <div className="favorites-header-top">

              <button
                className="back-button"
                onClick={() => setPage("menu")}
              >
                <ArrowLeft
                  size={16}
                  strokeWidth={2}
                />

                Back to menu
              </button>

              {favorites.length > 0 && (
                <div className="favorites-count">
                  <span className="count-dot" />

                  {favorites.length}{" "}
                  {favorites.length === 1
                    ? "favorite"
                    : "favorites"}
                </div>
              )}

            </div>

            <p className="favorites-eyebrow">
              Your personal collection
            </p>

            <h1 className="favorites-title">
              Favorites
            </h1>

            <p className="favorites-subtitle">
              The drinks and treats you love,
              saved for your next Brewed moment.
            </p>

          </header>

          {/* ===============================
              EMPTY STATE
          =============================== */}

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

            /* ===============================
               FAVORITES
            =============================== */

            <div className="favorites-grid">

              {favorites.map((item) => (

                <article
                  key={item.id}
                  className="favorite-card"
                  onClick={() => openProduct(item)}
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
                  aria-label={`View ${item.name}`}
                >

                  {/* HEART */}

                  <button
                    type="button"
                    className="favorite-heart"
                    aria-label={`Remove ${item.name} from favorites`}
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
                          event.currentTarget.style.display =
                            "none";

                          const fallback =
                            event.currentTarget
                              .nextElementSibling;

                          if (fallback) {
                            fallback.style.display =
                              "flex";
                          }
                        }}
                      />
                    ) : null}

                    <div
                      className="emoji-image"
                      style={{
                        display: item.image
                          ? "none"
                          : "flex",
                      }}
                    >
                      {item.emoji || "☕"}
                    </div>

                    <div className="image-overlay" />

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

                      <div className="view-product">
                        View item
                        <ArrowUpRight
                          size={14}
                          strokeWidth={2}
                        />
                      </div>

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
