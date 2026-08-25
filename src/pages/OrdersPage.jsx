import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { ChevronRight, Coffee, Package, RefreshCw } from "lucide-react";

import { db, auth } from "../firebase";
import { useCart } from "../context/CartContext";

export default function OrdersPage({ setPage }) {
  const { reorder } = useCart();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /*
   * ------------------------------------------------------------
   * HELPERS
   * ------------------------------------------------------------
   */

  const getDateValue = (createdAt) => {
    if (!createdAt) return null;

    try {
      if (typeof createdAt?.toDate === "function") {
        return createdAt.toDate();
      }

      if (createdAt instanceof Date) {
        return createdAt;
      }

      if (typeof createdAt === "string" || typeof createdAt === "number") {
        const date = new Date(createdAt);
        return Number.isNaN(date.getTime()) ? null : date;
      }

      if (
        typeof createdAt === "object" &&
        typeof createdAt.seconds === "number"
      ) {
        return new Date(createdAt.seconds * 1000);
      }

      return null;
    } catch {
      return null;
    }
  };

  const formatDate = (createdAt) => {
    const date = getDateValue(createdAt);

    if (!date) return "Date unavailable";

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (createdAt) => {
    const date = getDateValue(createdAt);

    if (!date) return "";

    return date.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatCurrency = (value) => {
    const amount = Number(value);

    if (!Number.isFinite(amount)) return "₹0";

    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const normalizeStatus = (status) => {
    return String(status || "New")
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ");
  };

  const getStatusConfig = (status) => {
    const normalized = normalizeStatus(status);

    if (
      normalized.includes("cancel") ||
      normalized.includes("failed") ||
      normalized.includes("reject")
    ) {
      return {
        label: status || "Cancelled",
        className: "status-cancelled",
        dot: "cancelled",
      };
    }

    if (
      normalized.includes("deliver") &&
      !normalized.includes("out for")
    ) {
      return {
        label: "Delivered",
        className: "status-delivered",
        dot: "delivered",
      };
    }

    if (
      normalized.includes("out for delivery") ||
      normalized === "out for delivery"
    ) {
      return {
        label: "Out for delivery",
        className: "status-out",
        dot: "out",
      };
    }

    if (
      normalized.includes("accepted") ||
      normalized.includes("confirmed")
    ) {
      return {
        label: "Accepted",
        className: "status-accepted",
        dot: "accepted",
      };
    }

    if (
      normalized.includes("prepar") ||
      normalized.includes("processing")
    ) {
      return {
        label: "Preparing",
        className: "status-preparing",
        dot: "preparing",
      };
    }

    return {
      label: status || "New",
      className: "status-new",
      dot: "new",
    };
  };

  const getItemImage = (item) => {
    if (!item) return null;

    return (
      item.image ||
      item.img ||
      item.imageUrl ||
      item.photo ||
      item.thumbnail ||
      null
    );
  };

  const getOrderItems = (order) => {
    if (!Array.isArray(order?.items)) return [];

    return order.items.filter(Boolean);
  };

  /*
   * ------------------------------------------------------------
   * LOAD USER ORDERS
   * ------------------------------------------------------------
   *
   * IMPORTANT:
   * We intentionally DO NOT use orderBy().
   *
   * This prevents the Firestore composite-index problem.
   *
   * We sort locally after receiving the documents.
   */

  useEffect(() => {
    let unsubscribe = null;

    const startOrdersListener = () => {
      const user = auth.currentUser;

      if (!user) {
        setOrders([]);
        setLoading(false);
        setError("");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const ordersRef = collection(db, "orders");

        const ordersQuery = query(
          ordersRef,
          where("userId", "==", user.uid)
        );

        unsubscribe = onSnapshot(
          ordersQuery,
          (snapshot) => {
            const fetchedOrders = snapshot.docs.map((orderDoc) => {
              const data = orderDoc.data() || {};

              return {
                id: orderDoc.id,
                ...data,
                items: Array.isArray(data.items) ? data.items : [],
              };
            });

            /*
             * Sort locally instead of Firestore orderBy().
             */
            fetchedOrders.sort((a, b) => {
              const dateA = getDateValue(a.createdAt)?.getTime() || 0;
              const dateB = getDateValue(b.createdAt)?.getTime() || 0;

              return dateB - dateA;
            });

            setOrders(fetchedOrders);
            setLoading(false);
          },
          (snapshotError) => {
            console.error("Orders listener error:", snapshotError);

            setError(
              "We couldn't load your orders right now. Please try again."
            );

            setOrders([]);
            setLoading(false);
          }
        );
      } catch (listenerError) {
        console.error("Orders query error:", listenerError);

        setError(
          "We couldn't load your orders right now. Please try again."
        );

        setOrders([]);
        setLoading(false);
      }
    };

    /*
     * auth.currentUser can be temporarily null when the component
     * first mounts, so listen for auth state before querying.
     */

    const authUnsubscribe = auth.onAuthStateChanged(() => {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }

      startOrdersListener();
    });

    return () => {
      authUnsubscribe();

      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  /*
   * ------------------------------------------------------------
   * ORDER SUMMARY
   * ------------------------------------------------------------
   */

  const totalOrders = orders.length;

  const activeOrders = useMemo(() => {
    return orders.filter((order) => {
      const status = normalizeStatus(order.status);

      return (
        !status.includes("deliver") &&
        !status.includes("cancel") &&
        !status.includes("failed")
      );
    }).length;
  }, [orders]);

  /*
   * ------------------------------------------------------------
   * HANDLERS
   * ------------------------------------------------------------
   */

  const handleReorder = (event, order) => {
    event.stopPropagation();

    const items = getOrderItems(order);

    if (!items.length) {
      return;
    }

    try {
      reorder(items);
      setPage("cart");
    } catch (err) {
      console.error("Reorder failed:", err);
    }
  };

  const handleOrderClick = (order) => {
    /*
     * Your current app navigation uses setPage().
     *
     * If you later have a dedicated order-details page,
     * this is the one place to change it.
     */

    setPage("menu");
  };

  /*
   * ------------------------------------------------------------
   * RENDER
   * ------------------------------------------------------------
   */

  return (
    <>
      <style>{`
        .orders-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at top right,
              rgba(196, 149, 106, 0.08),
              transparent 32%
            ),
            #faf6f0;
          color: #1a0b05;
          padding: 100px 20px 70px;
          box-sizing: border-box;
        }

        .orders-shell {
          width: 100%;
          max-width: 820px;
          margin: 0 auto;
        }

        .orders-header {
          margin-bottom: 32px;
        }

        .orders-back {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: none;
          background: transparent;
          padding: 0;
          margin: 0 0 24px;
          color: #806f64;
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          transition: color 0.2s ease;
        }

        .orders-back:hover {
          color: #1a0b05;
        }

        .orders-eyebrow {
          margin: 0 0 7px;
          color: #b58a62;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .orders-title {
          margin: 0;
          font-family: 'Playfair Display', serif;
          font-size: clamp(2.35rem, 7vw, 3.5rem);
          line-height: 1;
          font-weight: 500;
          letter-spacing: -0.035em;
          color: #1a0b05;
        }

        .orders-subtitle {
          margin: 13px 0 0;
          max-width: 540px;
          color: #786b63;
          font-size: 0.96rem;
          line-height: 1.65;
        }

        .orders-stats {
          display: flex;
          gap: 10px;
          margin-top: 22px;
          flex-wrap: wrap;
        }

        .orders-stat {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid #e7ded3;
          color: #6f625a;
          font-size: 0.76rem;
          font-weight: 700;
        }

        .orders-stat strong {
          color: #1a0b05;
        }

        .orders-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .order-card {
          position: relative;
          overflow: hidden;
          width: 100%;
          box-sizing: border-box;
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid #e9e0d6;
          border-radius: 22px;
          padding: 18px;
          box-shadow:
            0 8px 30px rgba(42, 27, 18, 0.045);
          cursor: pointer;
          transition:
            transform 0.22s ease,
            box-shadow 0.22s ease,
            border-color 0.22s ease;
        }

        .order-card:hover {
          transform: translateY(-2px);
          border-color: #d8c5b3;
          box-shadow:
            0 14px 35px rgba(42, 27, 18, 0.075);
        }

        .order-card:active {
          transform: translateY(0);
        }

        .order-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 17px;
        }

        .order-number {
          color: #806f64;
          font-size: 0.76rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .order-date {
          margin-top: 4px;
          color: #a09288;
          font-size: 0.75rem;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 10px;
          border-radius: 999px;
          font-size: 0.68rem;
          font-weight: 800;
          white-space: nowrap;
          text-transform: capitalize;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
          flex-shrink: 0;
        }

        .status-new {
          color: #72563c;
          background: #f7eee5;
        }

        .status-preparing {
          color: #a16b1d;
          background: #fff4dd;
        }

        .status-accepted {
          color: #536c55;
          background: #edf4ec;
        }

        .status-out {
          color: #75604b;
          background: #f3eee8;
        }

        .status-delivered {
          color: #4c7657;
          background: #eaf4eb;
        }

        .status-cancelled {
          color: #a85242;
          background: #faeae7;
        }

        .order-items {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .order-item {
          display: flex;
          align-items: center;
          gap: 13px;
          min-width: 0;
        }

        .item-image-wrap {
          width: 58px;
          height: 58px;
          flex: 0 0 58px;
          overflow: hidden;
          border-radius: 15px;
          background: #f3eee8;
          border: 1px solid #ece3da;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .item-image {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .item-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #b4967d;
        }

        .item-content {
          flex: 1;
          min-width: 0;
        }

        .item-name {
          margin: 0;
          color: #2a180f;
          font-size: 0.94rem;
          line-height: 1.35;
          font-weight: 750;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .item-meta {
          margin: 4px 0 0;
          color: #92847a;
          font-size: 0.76rem;
          line-height: 1.4;
        }

        .item-price {
          color: #2a180f;
          font-size: 0.84rem;
          font-weight: 800;
          white-space: nowrap;
        }

        .more-items {
          margin: 1px 0 0 71px;
          color: #9a8b81;
          font-size: 0.74rem;
          font-weight: 600;
        }

        .order-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 18px;
          padding-top: 15px;
          border-top: 1px solid #f0e9e2;
        }

        .order-total-label {
          color: #95867d;
          font-size: 0.72rem;
          margin-bottom: 3px;
        }

        .order-total {
          color: #1a0b05;
          font-size: 1.12rem;
          font-weight: 850;
        }

        .reorder-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 38px;
          padding: 0 15px;
          border: 1px solid #d8c4b1;
          border-radius: 12px;
          background: #fffaf5;
          color: #4c3426;
          font-size: 0.77rem;
          font-weight: 800;
          cursor: pointer;
          transition:
            background 0.2s ease,
            border-color 0.2s ease,
            transform 0.2s ease;
        }

        .reorder-button:hover {
          background: #f7eee5;
          border-color: #c8aa90;
          transform: translateY(-1px);
        }

        .order-chevron {
          color: #b5a59a;
          flex-shrink: 0;
          transition: transform 0.2s ease;
        }

        .order-card:hover .order-chevron {
          transform: translateX(2px);
        }

        .orders-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 300px;
          color: #8a7b71;
          text-align: center;
        }

        .loading-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 13px;
        }

        .loading-icon {
          animation: brewed-spin 1.2s linear infinite;
          color: #b58a62;
        }

        @keyframes brewed-spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .orders-error {
          padding: 28px 22px;
          text-align: center;
          background: #fff;
          border: 1px solid #eaded3;
          border-radius: 20px;
          color: #745f53;
        }

        .orders-error-title {
          margin: 0 0 7px;
          font-family: 'Playfair Display', serif;
          font-size: 1.35rem;
          color: #2a180f;
        }

        .orders-error-text {
          margin: 0;
          font-size: 0.84rem;
          line-height: 1.55;
        }

        .empty-orders {
          padding: 48px 25px;
          text-align: center;
          background: rgba(255, 255, 255, 0.75);
          border: 1px solid #e8dfd5;
          border-radius: 24px;
        }

        .empty-icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 20px;
          background: #f4ebe1;
          color: #b58a62;
        }

        .empty-title {
          margin: 0;
          font-family: 'Playfair Display', serif;
          font-size: 1.55rem;
          font-weight: 500;
          color: #2a180f;
        }

        .empty-text {
          max-width: 380px;
          margin: 9px auto 20px;
          color: #887a71;
          font-size: 0.85rem;
          line-height: 1.6;
        }

        .empty-button {
          border: none;
          border-radius: 12px;
          padding: 11px 18px;
          background: #1a0b05;
          color: #fff;
          font-size: 0.78rem;
          font-weight: 800;
          cursor: pointer;
        }

        @media (max-width: 600px) {
          .orders-page {
            padding: 82px 14px 50px;
          }

          .orders-header {
            margin-bottom: 24px;
          }

          .orders-title {
            font-size: 2.45rem;
          }

          .order-card {
            border-radius: 19px;
            padding: 15px;
          }

          .order-top {
            align-items: flex-start;
          }

          .status-badge {
            padding: 6px 8px;
            font-size: 0.62rem;
          }

          .item-image-wrap {
            width: 53px;
            height: 53px;
            flex-basis: 53px;
          }

          .more-items {
            margin-left: 66px;
          }

          .order-footer {
            align-items: flex-end;
          }

          .reorder-button {
            padding: 0 12px;
          }
        }
      `}</style>

      <main className="orders-page">
        <div className="orders-shell">

          <header className="orders-header">
            <button
              type="button"
              className="orders-back"
              onClick={() => setPage("menu")}
            >
              ← Back to Menu
            </button>

            <p className="orders-eyebrow">
              Your Brewed Journey
            </p>

            <h1 className="orders-title">
              Orders
            </h1>

            <p className="orders-subtitle">
              Every cup, every craving — all your Brewed orders in one place.
            </p>

            {!loading && !error && orders.length > 0 && (
              <div className="orders-stats">
                <div className="orders-stat">
                  <Package size={13} />
                  <strong>{totalOrders}</strong>
                  {totalOrders === 1 ? "order" : "orders"}
                </div>

                {activeOrders > 0 && (
                  <div className="orders-stat">
                    <span
                      className="status-dot"
                      style={{ color: "#b58a62" }}
                    />
                    <strong>{activeOrders}</strong>
                    active
                  </div>
                )}
              </div>
            )}
          </header>

          {loading ? (
            <div className="orders-loading">
              <div className="loading-content">
                <RefreshCw
                  size={27}
                  strokeWidth={1.7}
                  className="loading-icon"
                />
                <span>Brewing your order history…</span>
              </div>
            </div>
          ) : error ? (
            <div className="orders-error">
              <h2 className="orders-error-title">
                Couldn't load your orders
              </h2>

              <p className="orders-error-text">
                {error}
              </p>
            </div>
          ) : orders.length === 0 ? (
            <div className="empty-orders">
              <div className="empty-icon">
                <Coffee size={28} strokeWidth={1.6} />
              </div>

              <h2 className="empty-title">
                No orders yet
              </h2>

              <p className="empty-text">
                Your first Brewed order is waiting. Find something lovely
                from the menu and make it yours.
              </p>

              <button
                type="button"
                className="empty-button"
                onClick={() => setPage("menu")}
              >
                Explore Menu
              </button>
            </div>
          ) : (
            <section className="orders-list">
              {orders.map((order) => {
                const items = getOrderItems(order);
                const statusConfig = getStatusConfig(order.status);

                const visibleItems = items.slice(0, 3);
                const remainingItems = Math.max(
                  0,
                  items.length - visibleItems.length
                );

                return (
                  <article
                    key={order.id}
                    className="order-card"
                    onClick={() => handleOrderClick(order)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" ||
                        event.key === " "
                      ) {
                        event.preventDefault();
                        handleOrderClick(order);
                      }
                    }}
                  >
                    <div className="order-top">
                      <div>
                        <div className="order-number">
                          Order #{order.id.slice(-7).toUpperCase()}
                        </div>

                        <div className="order-date">
                          {formatDate(order.createdAt)}
                          {formatTime(order.createdAt)
                            ? ` · ${formatTime(order.createdAt)}`
                            : ""}
                        </div>
                      </div>

                      <div
                        className={`status-badge ${statusConfig.className}`}
                      >
                        <span className="status-dot" />
                        {statusConfig.label}
                      </div>
                    </div>

                    <div className="order-items">
                      {visibleItems.length > 0 ? (
                        visibleItems.map((item, index) => {
                          const image = getItemImage(item);

                          return (
                            <div
                              className="order-item"
                              key={`${order.id}-${item.id || item.firestoreId || index}`}
                            >
                              <div className="item-image-wrap">
                                {image ? (
                                  <img
                                    src={image}
                                    alt={item.name || "Brewed item"}
                                    className="item-image"
                                    loading="lazy"
                                    onError={(event) => {
                                      event.currentTarget.style.display =
                                        "none";

                                      const fallback =
                                        event.currentTarget.parentElement
                                          ?.querySelector(
                                            ".item-placeholder"
                                          );

                                      if (fallback) {
                                        fallback.style.display = "flex";
                                      }
                                    }}
                                  />
                                ) : null}

                                <div
                                  className="item-placeholder"
                                  style={{
                                    display: image ? "none" : "flex",
                                  }}
                                >
                                  <Coffee
                                    size={22}
                                    strokeWidth={1.5}
                                  />
                                </div>
                              </div>

                              <div className="item-content">
                                <p className="item-name">
                                  {item.name || "Brewed item"}
                                </p>

                                <p className="item-meta">
                                  Qty {Number(item.qty || 1)}
                                  {item.size
                                    ? ` · ${item.size}`
                                    : ""}
                                  {item.variant
                                    ? ` · ${item.variant}`
                                    : ""}
                                </p>
                              </div>

                              <div className="item-price">
                                {formatCurrency(
                                  Number(item.price || 0) *
                                    Number(item.qty || 1)
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="order-item">
                          <div className="item-image-wrap">
                            <div className="item-placeholder">
                              <Coffee
                                size={22}
                                strokeWidth={1.5}
                              />
                            </div>
                          </div>

                          <div className="item-content">
                            <p className="item-name">
                              Order items unavailable
                            </p>

                            <p className="item-meta">
                              Order #{order.id.slice(-7).toUpperCase()}
                            </p>
                          </div>
                        </div>
                      )}

                      {remainingItems > 0 && (
                        <div className="more-items">
                          + {remainingItems} more{" "}
                          {remainingItems === 1 ? "item" : "items"}
                        </div>
                      )}
                    </div>

                    <div className="order-footer">
                      <div>
                        <div className="order-total-label">
                          Total paid
                        </div>

                        <div className="order-total">
                          {formatCurrency(order.total)}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="reorder-button"
                        onClick={(event) =>
                          handleReorder(event, order)
                        }
                      >
                        Reorder
                      </button>

                      <ChevronRight
                        className="order-chevron"
                        size={18}
                        strokeWidth={1.7}
                      />
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </div>
      </main>
    </>
  );
}
