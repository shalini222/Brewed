import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { useCart } from "../context/CartContext";

export default function OrdersPage({ setPage }) {
  const { reorder } = useCart();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* =========================================================
     LOAD USER ORDERS
     ---------------------------------------------------------
     No orderBy() here intentionally.
     This avoids requiring a Firestore composite index.
     Orders are sorted locally instead.
  ========================================================= */

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const ordersQuery = query(
      collection(db, "orders"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const result = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        }));

        result.sort((a, b) => {
          const getTimestamp = (value) => {
            if (!value) return 0;

            if (typeof value.toMillis === "function") {
              return value.toMillis();
            }

            if (typeof value.toDate === "function") {
              return value.toDate().getTime();
            }

            const date = new Date(value);
            return Number.isNaN(date.getTime())
              ? 0
              : date.getTime();
          };

          return (
            getTimestamp(b.createdAt) -
            getTimestamp(a.createdAt)
          );
        });

        setOrders(result);
        setLoading(false);
        setError("");
      },
      (err) => {
        console.error("Orders error:", err);
        setError("Couldn't load your orders.");
        setOrders([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  /* =========================================================
     HELPERS
  ========================================================= */

  const formatDate = (timestamp) => {
    if (!timestamp) return "Date unavailable";

    try {
      let date;

      if (typeof timestamp.toDate === "function") {
        date = timestamp.toDate();
      } else if (typeof timestamp.toMillis === "function") {
        date = new Date(timestamp.toMillis());
      } else {
        date = new Date(timestamp);
      }

      if (Number.isNaN(date.getTime())) {
        return "Date unavailable";
      }

      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "Date unavailable";
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";

    try {
      let date;

      if (typeof timestamp.toDate === "function") {
        date = timestamp.toDate();
      } else if (typeof timestamp.toMillis === "function") {
        date = new Date(timestamp.toMillis());
      } else {
        date = new Date(timestamp);
      }

      if (Number.isNaN(date.getTime())) return "";

      return date.toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const formatPrice = (value) => {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return "0";
    }

    return number.toLocaleString("en-IN");
  };

  const getImage = (item) => {
    return (
      item?.image ||
      item?.img ||
      item?.imageUrl ||
      item?.photo ||
      item?.thumbnail ||
      ""
    );
  };

  const getQuantity = (item) => {
    const quantity = Number(
      item?.qty ?? item?.quantity ?? 1
    );

    return Number.isFinite(quantity) && quantity > 0
      ? quantity
      : 1;
  };

  const getStatus = (status) => {
    const value = String(status || "New")
      .trim()
      .toLowerCase();

    if (
      value.includes("cancel") ||
      value.includes("reject") ||
      value.includes("fail")
    ) {
      return {
        label: "Cancelled",
        className: "cancelled",
      };
    }

    if (value.includes("deliver")) {
      return {
        label: "Delivered",
        className: "delivered",
      };
    }

    if (
      value.includes("out") ||
      value.includes("transit") ||
      value.includes("rider")
    ) {
      return {
        label: "Out for delivery",
        className: "transit",
      };
    }

    if (
      value.includes("prepar") ||
      value.includes("accept") ||
      value.includes("confirm")
    ) {
      return {
        label: "Preparing",
        className: "preparing",
      };
    }

    return {
      label:
        String(status || "New")
          .charAt(0)
          .toUpperCase() +
        String(status || "New").slice(1),
      className: "new",
    };
  };

  const getItemsLabel = (items) => {
    if (!items?.length) {
      return "Your Brewed order";
    }

    const firstItem = items[0];

    const quantity = getQuantity(firstItem);

    let label = firstItem?.name || "Brewed item";

    if (quantity > 1) {
      label += ` × ${quantity}`;
    }

    if (items.length > 1) {
      label += ` + ${items.length - 1} more`;
    }

    return label;
  };

  const handleCardClick = () => {
    setPage("menu");
  };

  const handleCardKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setPage("menu");
    }
  };

  const handleReorder = async (event, order) => {
    event.stopPropagation();

    if (!order?.items?.length) {
      return;
    }

    try {
      await reorder(order.items);
    } catch (err) {
      console.error("Reorder failed:", err);
    }
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <>
        <style>{`
          .orders-loading {
            min-height: 100vh;
            background: #faf7f2;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: Inter, sans-serif;
            color: #38261b;
          }

          .orders-loading-inner {
            text-align: center;
          }

          .orders-loading-mark {
            width: 38px;
            height: 38px;
            border: 2px solid #dfd4c8;
            border-top-color: #8a6246;
            border-radius: 50%;
            margin: 0 auto 18px;
            animation: brewedSpin 0.9s linear infinite;
          }

          .orders-loading-text {
            margin: 0;
            font-size: 13px;
            color: #8b7c70;
            letter-spacing: 0.02em;
          }

          @keyframes brewedSpin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>

        <div className="orders-loading">
          <div className="orders-loading-inner">
            <div className="orders-loading-mark" />
            <p className="orders-loading-text">
              Loading your orders
            </p>
          </div>
        </div>
      </>
    );
  }

  /* =========================================================
     MAIN
  ========================================================= */

  return (
    <>
      <style>{`
        .orders-page {
          min-height: 100vh;
          background: #faf7f2;
          color: #302116;
          font-family: Inter, -apple-system, BlinkMacSystemFont,
            "Segoe UI", sans-serif;
          padding: 105px 20px 70px;
        }

        .orders-shell {
          width: 100%;
          max-width: 720px;
          margin: 0 auto;
        }

        /* -----------------------------------------------------
           HEADER
        ----------------------------------------------------- */

        .orders-back {
          border: 0;
          background: transparent;
          padding: 0;
          margin: 0 0 34px;
          color: #806f62;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: color 0.2s ease;
        }

        .orders-back:hover {
          color: #302116;
        }

        .orders-heading {
          margin-bottom: 35px;
        }

        .orders-heading h1 {
          margin: 0;
          font-family: "Playfair Display", Georgia, serif;
          font-size: clamp(2.35rem, 7vw, 3.35rem);
          line-height: 0.98;
          font-weight: 500;
          letter-spacing: -0.045em;
          color: #302116;
        }

        .orders-heading p {
          margin: 12px 0 0;
          color: #8c7d71;
          font-size: 14px;
          line-height: 1.5;
        }

        /* -----------------------------------------------------
           ERROR
        ----------------------------------------------------- */

        .orders-error {
          margin-bottom: 20px;
          padding: 14px 16px;
          border-radius: 12px;
          background: #fff4f0;
          border: 1px solid #ead5cc;
          color: #99513d;
          font-size: 13px;
        }

        /* -----------------------------------------------------
           ORDER LIST
        ----------------------------------------------------- */

        .orders-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* -----------------------------------------------------
           CARD
        ----------------------------------------------------- */

        .order-card {
          background: #ffffff;
          border: 1px solid #e8e0d8;
          border-radius: 20px;
          overflow: hidden;
          cursor: pointer;
          transition:
            transform 0.2s ease,
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }

        .order-card:hover {
          transform: translateY(-2px);
          border-color: #d8c9bc;
          box-shadow: 0 12px 32px rgba(53, 34, 22, 0.055);
        }

        .order-card:focus-visible {
          outline: 2px solid #b58a68;
          outline-offset: 3px;
        }

        /* -----------------------------------------------------
           IMAGE
        ----------------------------------------------------- */

        .order-visual {
          width: 100%;
          height: 205px;
          background: #eee6de;
          overflow: hidden;
          position: relative;
        }

        .order-visual img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          transition: transform 0.45s ease;
        }

        .order-card:hover .order-visual img {
          transform: scale(1.025);
        }

        .image-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            linear-gradient(
              135deg,
              #eee5dc,
              #e5d8ca
            );
          color: #97745a;
          font-family: "Playfair Display", serif;
          font-size: 16px;
        }

        /* -----------------------------------------------------
           CONTENT
        ----------------------------------------------------- */

        .order-content {
          padding: 20px 21px 19px;
        }

        .order-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
        }

        .order-name {
          margin: 0;
          font-family: "Playfair Display", Georgia, serif;
          font-size: 20px;
          line-height: 1.2;
          font-weight: 500;
          color: #302116;
        }

        .order-meta {
          margin-top: 7px;
          color: #918278;
          font-size: 12px;
          line-height: 1.5;
        }

        /* -----------------------------------------------------
           STATUS
        ----------------------------------------------------- */

        .status {
          flex-shrink: 0;
          padding: 6px 10px;
          border-radius: 100px;
          font-size: 10px;
          line-height: 1;
          font-weight: 700;
          letter-spacing: 0.045em;
          text-transform: uppercase;
        }

        .status.new,
        .status.preparing {
          background: #f8eddd;
          color: #966b43;
        }

        .status.transit {
          background: #eee8f5;
          color: #725d83;
        }

        .status.delivered {
          background: #e9f0e8;
          color: #5e7659;
        }

        .status.cancelled {
          background: #f8e8e4;
          color: #a15e4e;
        }

        /* -----------------------------------------------------
           DIVIDER
        ----------------------------------------------------- */

        .order-divider {
          height: 1px;
          background: #eee8e2;
          margin: 18px 0 15px;
        }

        /* -----------------------------------------------------
           FOOTER
        ----------------------------------------------------- */

        .order-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
        }

        .order-number {
          color: #9a8b80;
          font-size: 11px;
          letter-spacing: 0.02em;
        }

        .order-total {
          margin-top: 3px;
          color: #302116;
          font-size: 16px;
          font-weight: 700;
        }

        .reorder-button {
          border: 1px solid #d8c6b6;
          background: #fff;
          color: #5e412e;
          border-radius: 11px;
          padding: 9px 15px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition:
            background 0.2s ease,
            border-color 0.2s ease,
            transform 0.2s ease;
        }

        .reorder-button:hover {
          background: #f8f0e8;
          border-color: #c9ae97;
        }

        .reorder-button:active {
          transform: scale(0.97);
        }

        .reorder-button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        /* -----------------------------------------------------
           EMPTY
        ----------------------------------------------------- */

        .empty-orders {
          text-align: center;
          background: #fff;
          border: 1px solid #e8e0d8;
          border-radius: 20px;
          padding: 60px 25px;
        }

        .empty-orders h2 {
          margin: 0;
          font-family: "Playfair Display", Georgia, serif;
          font-size: 25px;
          font-weight: 500;
          color: #302116;
        }

        .empty-orders p {
          max-width: 340px;
          margin: 10px auto 24px;
          color: #8b7d72;
          font-size: 13px;
          line-height: 1.6;
        }

        .empty-orders button {
          border: 0;
          background: #302116;
          color: #fffaf5;
          border-radius: 11px;
          padding: 11px 18px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        /* -----------------------------------------------------
           MOBILE
        ----------------------------------------------------- */

        @media (max-width: 600px) {
          .orders-page {
            padding: 88px 14px 50px;
          }

          .orders-back {
            margin-bottom: 28px;
          }

          .orders-heading {
            margin-bottom: 27px;
          }

          .orders-heading h1 {
            font-size: 2.45rem;
          }

          .order-visual {
            height: 190px;
          }

          .order-content {
            padding: 18px 17px 17px;
          }

          .order-name {
            font-size: 18px;
          }

          .order-top {
            gap: 10px;
          }

          .status {
            font-size: 9px;
            padding: 6px 8px;
          }
        }

        @media (max-width: 390px) {
          .order-bottom {
            align-items: flex-end;
          }

          .reorder-button {
            padding: 9px 12px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .order-card,
          .order-visual img,
          .reorder-button {
            transition: none;
          }
        }
      `}</style>

      <div className="orders-page">
        <div className="orders-shell">

          <button
            className="orders-back"
            type="button"
            onClick={() => setPage("menu")}
          >
            ← Back to menu
          </button>

          <div className="orders-heading">
            <h1>Your orders</h1>

            <p>
              A little history of everything you've brewed
              with us.
            </p>
          </div>

          {error && (
            <div className="orders-error">
              {error}
            </div>
          )}

          {orders.length === 0 ? (
            <div className="empty-orders">
              <h2>No orders yet</h2>

              <p>
                Your Brewed story starts with the first cup.
                Explore the menu and find something you love.
              </p>

              <button
                type="button"
                onClick={() => setPage("menu")}
              >
                Explore menu
              </button>
            </div>
          ) : (
            <div className="orders-list">
              {orders.map((order) => {
                const items = Array.isArray(order.items)
                  ? order.items
                  : [];

                const firstItem = items[0];
                const image = getImage(firstItem);
                const status = getStatus(order.status);

                return (
                  <article
                    className="order-card"
                    key={order.id}
                    tabIndex={0}
                    role="button"
                    onClick={handleCardClick}
                    onKeyDown={handleCardKeyDown}
                  >

                    {/* ------------------------------------------------
                        DYNAMIC ORDER IMAGE
                    ------------------------------------------------ */}

                    <div className="order-visual">
                      {image ? (
                        <>
                          <img
                            src={image}
                            alt={
                              firstItem?.name ||
                              "Brewed order"
                            }
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.style.display =
                                "none";

                              const fallback =
                                event.currentTarget
                                  .parentElement
                                  ?.querySelector(
                                    ".image-fallback"
                                  );

                              if (fallback) {
                                fallback.style.display =
                                  "flex";
                              }
                            }}
                          />

                          <div
                            className="image-fallback"
                            style={{ display: "none" }}
                          >
                            Brewed
                          </div>
                        </>
                      ) : (
                        <div className="image-fallback">
                          Brewed
                        </div>
                      )}
                    </div>

                    {/* ------------------------------------------------
                        ORDER CONTENT
                    ------------------------------------------------ */}

                    <div className="order-content">

                      <div className="order-top">

                        <div>
                          <h2 className="order-name">
                            {getItemsLabel(items)}
                          </h2>

                          <div className="order-meta">
                            {formatDate(order.createdAt)}

                            {formatTime(order.createdAt) &&
                              ` · ${formatTime(
                                order.createdAt
                              )}`}
                          </div>
                        </div>

                        <span
                          className={`status ${status.className}`}
                        >
                          {status.label}
                        </span>

                      </div>

                      <div className="order-divider" />

                      <div className="order-bottom">

                        <div>
                          <div className="order-number">
                            {getOrderNumber(order.id)}
                          </div>

                          <div className="order-total">
                            ₹{formatPrice(order.total)}
                          </div>
                        </div>

                        <button
                          className="reorder-button"
                          type="button"
                          disabled={!items.length}
                          onClick={(event) =>
                            handleReorder(event, order)
                          }
                        >
                          Reorder
                        </button>

                      </div>

                    </div>
                  </article>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
