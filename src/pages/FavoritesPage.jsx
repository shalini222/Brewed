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

export default function FavoritesPage({ setPage }) {
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
          collection(db, "users", currentUser.uid, "favorites")
        );

        const items = snapshot.docs.map((favoriteDoc) => ({
          id: favoriteDoc.id,
          ...favoriteDoc.data(),
        }));

        setFavorites(items);
      } catch (error) {
        console.error(error);
      }

      setLoading(false);
    };

    loadFavorites();
  }, [currentUser]);

  const removeFavorite = async (itemId) => {
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
        prev.filter((item) => item.id !== itemId)
      );
    } catch (error) {
      console.error(error);
    }
  };

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
            color: #5a4638;
            font-family: "DM Sans", sans-serif;
          }

          .loading-inner {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 14px;
          }

          .loading-icon {
            width: 42px;
            height: 42px;
            border-radius: 50%;
            border: 1px solid #d9cbbd;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #8a6b54;
            animation: softPulse 1.5s ease-in-out infinite;
          }

          .loading-text {
            font-size: 13px;
            letter-spacing: .08em;
            text-transform: uppercase;
            color: #8a786b;
          }

          @keyframes softPulse {
            0%, 100% {
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
              <Coffee size={19} strokeWidth={1.6} />
            </div>
            <div className="loading-text">Loading favorites</div>
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

        .favorites-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 85% 5%,
              rgba(190, 160, 130, .08),
              transparent 28%
            ),
            #f8f5ef;
          padding: 112px 28px 80px;
          font-family: "DM Sans", sans-serif;
          color: #2f2925;
        }

        .favorites-container {
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
        }

        /* --------------------------------
           TOP NAV
        -------------------------------- */

        .favorites-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 58px;
        }

        .back-button {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          border: 0;
          background: transparent;
          color: #5f5148;
          padding: 0;
          font-family: "DM Sans", sans-serif;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: .02em;
          cursor: pointer;
          transition: color .25s ease, transform .25s ease;
        }

        .back-button:hover {
          color: #8a684e;
          transform: translateX(-3px);
        }

        .favorites-count {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #89796e;
          font-size: 12px;
          letter-spacing: .06em;
          text-transform: uppercase;
        }

        .count-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #ad8768;
        }

        /* --------------------------------
           HEADER
        -------------------------------- */

        .favorites-header {
          max-width: 760px;
          margin-bottom: 46px;
        }

        .eyebrow {
          margin: 0 0 14px;
          color: #9a7658;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .18em;
          text-transform: uppercase;
        }

        .page-title {
          margin: 0;
          color: #30261f;
          font-family: "Playfair Display", serif;
          font-size: clamp(42px, 5vw, 64px);
          font-weight: 600;
          line-height: .98;
          letter-spacing: -.035em;
        }

        .page-subtitle {
          max-width: 540px;
          margin: 20px 0 0;
          color: #817269;
          font-size: 15px;
          line-height: 1.7;
        }

        /* --------------------------------
           GRID
        -------------------------------- */

        .favorites-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 26px;
        }

        /* --------------------------------
           CARD
        -------------------------------- */

        .favorite-card {
          position: relative;
          overflow: hidden;
          background: #fffdf9;
          border: 1px solid rgba(95, 72, 55, .10);
          border-radius: 18px;
          box-shadow:
            0 7px 22px rgba(52, 39, 30, .045),
            0 2px 5px rgba(52, 39, 30, .025);
          transition:
            transform .35s cubic-bezier(.22, 1, .36, 1),
            box-shadow .35s ease,
            border-color .35s ease;
        }

        .favorite-card:hover {
          transform: translateY(-7px);
          border-color: rgba(130, 95, 68, .18);
          box-shadow:
            0 22px 48px rgba(52, 39, 30, .10),
            0 5px 12px rgba(52, 39, 30, .04);
        }

        /* --------------------------------
           IMAGE
        -------------------------------- */

        .favorite-image-wrapper {
          position: relative;
          height: 255px;
          overflow: hidden;
          background: #eee6dc;
        }

        .favorite-image {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform .65s cubic-bezier(.22, 1, .36, 1);
        }

        .favorite-card:hover .favorite-image {
          transform: scale(1.045);
        }

        .image-fade {
          position: absolute;
          inset: auto 0 0;
          height: 80px;
          background: linear-gradient(
            to top,
            rgba(32, 25, 20, .18),
            transparent
          );
          pointer-events: none;
        }

        .emoji-image {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          background:
            radial-gradient(
              circle at center,
              #f7eee4 0%,
              #eee0d1 100%
            );
          font-size: 76px;
        }

        /* --------------------------------
           HEART
        -------------------------------- */

        .favorite-heart {
          position: absolute;
          top: 15px;
          right: 15px;
          z-index: 5;

          width: 40px;
          height: 40px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 1px solid rgba(255,255,255,.55);
          border-radius: 50%;

          background: rgba(255,255,255,.88);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);

          color: #8c6048;
          cursor: pointer;

          box-shadow: 0 5px 16px rgba(30, 20, 14, .10);

          transition:
            transform .25s ease,
            background .25s ease,
            color .25s ease;
        }

        .favorite-heart:hover {
          transform: scale(1.08);
          background: #fff;
          color: #a76f4d;
        }

        .favorite-heart:active {
          transform: scale(.94);
        }

        /* --------------------------------
           CONTENT
        -------------------------------- */

        .favorite-content {
          padding: 23px 23px 22px;
        }

        .favorite-name-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
        }

        .favorite-name {
          margin: 0;
          color: #342a23;
          font-family: "Playfair Display", serif;
          font-size: 23px;
          font-weight: 600;
          line-height: 1.15;
          letter-spacing: -.015em;
        }

        .favorite-description {
          min-height: 48px;
          margin: 11px 0 22px;
          color: #88786d;
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
          margin-bottom: 18px;
          background: #eee7df;
        }

        .favorite-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
        }

        .favorite-price-label {
          display: block;
          margin-bottom: 3px;
          color: #a2948a;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .13em;
          text-transform: uppercase;
        }

        .favorite-price {
          color: #3b2d24;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -.02em;
        }

        .favorite-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;

          min-height: 42px;
          padding: 0 15px;

          border: 1px solid #49372b;
          border-radius: 9px;

          background: #49372b;
          color: #fffaf4;

          font-family: "DM Sans", sans-serif;
          font-size: 12px;
          font-weight: 600;

          cursor: pointer;

          transition:
            background .25s ease,
            border-color .25s ease,
            transform .25s ease;
        }

        .favorite-btn svg {
          transition: transform .25s ease;
        }

        .favorite-btn:hover {
          background: #674b39;
          border-color: #674b39;
          transform: translateY(-1px);
        }

        .favorite-btn:hover svg {
          transform: translate(2px, -2px);
        }

        .favorite-btn:active {
          transform: translateY(0);
        }

        /* --------------------------------
           EMPTY STATE
        -------------------------------- */

        .empty-state {
          position: relative;
          overflow: hidden;
          padding: 88px 30px;
          text-align: center;

          background: rgba(255,253,249,.78);
          border: 1px solid #e9e0d7;
          border-radius: 20px;
        }

        .empty-icon {
          width: 58px;
          height: 58px;
          margin: 0 auto 23px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 1px solid #ded1c4;
          border-radius: 50%;

          color: #98775e;
          background: #faf5ef;
        }

        .empty-title {
          margin: 0 0 10px;
          color: #392c24;
          font-family: "Playfair Display", serif;
          font-size: 29px;
          font-weight: 600;
        }

        .empty-text {
          max-width: 390px;
          margin: 0 auto;
          color: #8b7b70;
          font-size: 13px;
          line-height: 1.7;
        }

        /* --------------------------------
           TABLET
        -------------------------------- */

        @media (max-width: 980px) {
          .favorites-page {
            padding-left: 22px;
            padding-right: 22px;
          }

          .favorites-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        /* --------------------------------
           MOBILE
        -------------------------------- */

        @media (max-width: 650px) {
          .favorites-page {
            padding:
              92px
              16px
              55px;
          }

          .favorites-top {
            margin-bottom: 43px;
          }

          .favorites-count {
            font-size: 10px;
          }

          .favorites-header {
            margin-bottom: 34px;
          }

          .eyebrow {
            margin-bottom: 12px;
            font-size: 10px;
          }

          .page-title {
            font-size: 43px;
            line-height: 1;
          }

          .page-subtitle {
            margin-top: 15px;
            font-size: 13px;
            line-height: 1.65;
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

          .favorite-btn {
            min-width: 118px;
          }

          .empty-state {
            padding: 65px 22px;
          }

          .empty-title {
            font-size: 26px;
          }
        }

        @media (max-width: 380px) {
          .favorite-footer {
            align-items: stretch;
            flex-direction: column;
          }

          .favorite-btn {
            width: 100%;
          }
        }
      `}</style>

      <div className="favorites-page">
        <div className="favorites-container">

          {/* TOP */}
          <div className="favorites-top">
            <button
              className="back-button"
              onClick={() => setPage("menu")}
            >
              <ArrowLeft size={16} strokeWidth={2} />
              Back to menu
            </button>

            {favorites.length > 0 && (
              <div className="favorites-count">
                <span className="count-dot" />
                {favorites.length}{" "}
                {favorites.length === 1 ? "favorite" : "favorites"}
              </div>
            )}
          </div>

          {/* HEADER */}
          <div className="favorites-header">
            <p className="eyebrow">
              Your personal collection
            </p>

            <h1 className="page-title">
              Favorites
            </h1>

            <p className="page-subtitle">
              The drinks and treats you've loved enough
              to keep coming back to.
            </p>
          </div>

          {/* EMPTY */}
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
                When something on the menu steals your heart,
                tap the heart icon and it'll appear here.
              </p>

            </div>
          ) : (

            /* FAVORITES */
            <div className="favorites-grid">

              {favorites.map((item) => (
                <article
                  className="favorite-card"
                  key={item.id}
                >

                  {/* HEART */}
                  <button
                    className="favorite-heart"
                    aria-label={`Remove ${item.name} from favorites`}
                    onClick={() => removeFavorite(item.id)}
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
                        onError={(e) => {
                          e.currentTarget.style.display = "none";

                          const fallback =
                            e.currentTarget.nextElementSibling;

                          if (fallback) {
                            fallback.style.display = "flex";
                          }
                        }}
                      />
                    ) : null}

                    <div
                      className="emoji-image"
                      style={{
                        display: item.image ? "none" : "flex",
                      }}
                    >
                      {item.emoji || "☕"}
                    </div>

                    <div className="image-fade" />
                  </div>

                  {/* CONTENT */}
                  <div className="favorite-content">

                    <div className="favorite-name-row">
                      <h2 className="favorite-name">
                        {item.name}
                      </h2>
                    </div>

                    <p className="favorite-description">
                      {item.desc ||
                        "A delicious Brewed favorite, made for your next coffee moment."}
                    </p>

                    <div className="favorite-divider" />

                    <div className="favorite-footer">

                      <div>
                        <span className="favorite-price-label">
                          Price
                        </span>

                        <div className="favorite-price">
                          ₹{item.price}
                        </div>
                      </div>

                      <button
                        className="favorite-btn"
                        onClick={() =>
                          alert("Order feature coming soon ☕")
                        }
                      >
                        Order now
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
