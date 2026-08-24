import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { useCart } from "../context/CartContext";

import {
  ArrowLeft,
  Coffee,
  Package,
  Clock3,
  CheckCircle2,
  XCircle,
  Truck,
  RotateCcw,
  ChevronRight,
} from "lucide-react";

export default function OrdersPage({ setPage }) {
  const { reorder } = useCart();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /*
   * ------------------------------------------------------------
   * REAL-TIME ORDERS
   * ------------------------------------------------------------
   *
   * IMPORTANT:
   * We intentionally DO NOT use orderBy().
   *
   * Your Firestore setup was asking for a composite index when
   * filtering + ordering the orders collection.
   *
   * We only query by userId and sort safely on the client.
   */
  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const ordersRef = collection(db, "orders");

    const q = query(
      ordersRef,
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedOrders = snapshot.docs.map((doc) => {
          const data = doc.data();

          return {
            id: doc.id,
            ...data,
          };
        });

        /*
         * Sort on the client instead of using Firestore orderBy().
         * Handles Timestamp, Date, string and missing createdAt.
         */
        fetchedOrders.sort((a, b) => {
          const getTime = (value) => {
            if (!value) return 0;

            if (typeof value?.toMillis === "function") {
              return value.toMillis();
            }

            if (typeof value?.toDate === "function") {
              return value.toDate().getTime();
            }

            if (value instanceof Date) {
              return value.getTime();
            }

            const parsed = new Date(value).getTime();

            return Number.isNaN(parsed) ? 0 : parsed;
          };

          return getTime(b.createdAt) - getTime(a.createdAt);
        });

        setOrders(fetchedOrders);
        setLoading(false);
      },
      (err) => {
        console.error("Orders listener error:", err);

        setError(
          "We couldn't load your orders right now. Please try again."
        );

        setOrders([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  /*
   * ------------------------------------------------------------
   * HELPERS
   * ------------------------------------------------------------
   */

  const formatDate = (createdAt) => {
    if (!createdAt) return "Date unavailable";

    let date;

    try {
      if (typeof createdAt?.toDate === "function") {
        date = createdAt.toDate();
      } else if (typeof createdAt?.toMillis === "function") {
        date = new Date(createdAt.toMillis());
      } else if (createdAt instanceof Date) {
        date = createdAt;
      } else {
        date = new Date(createdAt);
      }

      if (Number.isNaN(date.getTime())) {
        return "Date unavailable";
      }

      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "Date unavailable";
    }
  };

  const formatTime = (createdAt) => {
    if (!createdAt) return "";

    try {
      let date;

      if (typeof createdAt?.toDate === "function") {
        date = createdAt.toDate();
      } else if (typeof createdAt?.toMillis === "function") {
        date = new Date(createdAt.toMillis());
      } else {
        date = new Date(createdAt);
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

    if (!Number.isFinite(number)) return "0";

    return number.toLocaleString("en-IN");
  };

  const getOrderNumber = (id) => {
    if (!id) return "ORDER";

    return `#${id.slice(-6).toUpperCase()}`;
  };

  const getItemImage = (item) => {
    /*
     * Supports both:
     *
     * image
     * img
     *
     * so old and new orders continue to work.
     */
    return (
      item?.image ||
      item?.img ||
      item?.imageUrl ||
      item?.photo ||
      item?.thumbnail ||
      ""
    );
  };

  const getStatus = (status) => {
    const normalized = String(status || "New")
      .trim()
      .toLowerCase();

    if (
      normalized.includes("cancel") ||
      normalized.includes("reject") ||
      normalized.includes("failed")
    ) {
      return {
        label: "Cancelled",
        className: "status-cancelled",
        icon: XCircle,
      };
    }

    if (
      normalized.includes("deliver") &&
      !normalized.includes("out")
    ) {
      return {
        label: "Delivered",
        className: "status-delivered",
        icon: CheckCircle2,
      };
    }

    if (
      normalized.includes("out") ||
      normalized.includes("rider") ||
      normalized.includes("transit")
    ) {
      return {
        label: "Out for delivery",
        className: "status-transit",
        icon: Truck,
      };
    }

    if (
      normalized.includes("prepar") ||
      normalized.includes("accept") ||
      normalized.includes("confirm") ||
      normalized.includes("new")
    ) {
      return {
        label:
          normalized.includes("prepar")
            ? "Preparing"
            : normalized.includes("accept")
              ? "Accepted"
              : "New",
        className: "status-preparing",
        icon: Clock3,
      };
    }

    return {
      label:
        String(status || "New")
          .charAt(0)
          .toUpperCase() +
        String(status || "New").slice(1),
      className: "status-default",
      icon: Package,
    };
  };

  const getItemCount = (items = []) => {
    return items.reduce((sum, item) => {
      const qty = Number(item?.qty ?? item?.quantity ?? 1);

      return sum + (Number.isFinite(qty) ? qty : 1);
    }, 0);
  };

  const handleReorder = async (event, order) => {
    /*
     * Prevent the card click from triggering.
     */
    event.stopPropagation();

    if (!order?.items?.length) return;

    try {
      await reorder(order.items);
    } catch (err) {
      console.error("Reorder failed:", err);
    }
  };

  /*
   * ------------------------------------------------------------
   * EMPTY / LOADING
   * ------------------------------------------------------------
   */

  if (loading) {
    return (
      <>
        <style>{`
          .orders-loading-page {
            min-height: 100vh;
            background:
              radial-gradient(
                circle at top left,
                rgba(196,149,106,0.08),
                transparent 35%
              ),
              #FAF6F0;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
            box-sizing: border-box;
            font-family: 'Inter', sans-serif;
          }

          .orders-loading-card {
            text-align: center;
            background: rgba(255,255,255,0.88);
            border: 1px solid #E8DED2;
            border-radius: 28px;
            padding: 42px 34px;
            width: 100%;
            max-width: 390px;
            box-shadow: 0 18px 50px rgba(45,27,14,0.07);
          }

          .orders-loading-icon {
            width: 58px;
            height: 58px;
            border-radius: 18px;
            background: #F2E6D9;
            color: #8E6245;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 18px;
          }

          .orders-loading-title {
            margin: 0;
            font-family: 'Playfair Display', serif;
            font-size: 1.55rem;
            color: #2D1B0E;
            font-weight: 600;
          }

          .orders-loading-text {
            margin: 8px 0 0;
            color: #887A70;
            font-size: 0.9rem;
          }
        `}</style>

        <div className="orders-loading-page">
          <div className="orders-loading-card">
            <div className="orders-loading-icon">
              <Coffee size={27} />
            </div>

            <h2 className="orders-loading-title">
              Brewing your history
            </h2>

            <p className="orders-loading-text">
              Just a moment while we fetch your orders...
            </p>
          </div>
        </div>
      </>
    );
  }

  /*
   * ------------------------------------------------------------
   * MAIN PAGE
   * ------------------------------------------------------------
   */

  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
        }

        .orders-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 10% 0%,
              rgba(196,149,106,0.10),
              transparent 30%
            ),
            radial-gradient(
              circle at 100% 20%,
              rgba(45,27,14,0.035),
              transparent 28%
            ),
            #FAF6F0;
          padding: 104px 20px 70px;
          font-family: 'Inter', sans-serif;
          color: #2D1B0E;
        }

        .orders-container {
          width: 100%;
          max-width: 760px;
          margin: 0 auto;
        }

        .orders-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 28px;
        }

        .orders-back {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: none;
          background: transparent;
          color: #76675D;
          font-size: 0.88rem;
          font-weight: 600;
          padding: 7px 0;
          cursor: pointer;
          transition: color 0.2s ease;
        }

        .orders-back:hover {
          color: #2D1B0E;
        }

        .orders-eyebrow {
          margin: 0 0 7px;
          color: #B18461;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        .orders-title {
          margin: 0;
          font-family: 'Playfair Display', serif;
          color: #2D1B0E;
          font-size: clamp(2.15rem, 6vw, 3.15rem);
          line-height: 1;
          letter-spacing: -0.035em;
          font-weight: 600;
        }

        .orders-subtitle {
          margin: 11px 0 0;
          color: #877970;
          font-size: 0.9rem;
          line-height: 1.5;
        }

        .orders-count {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 40px;
          height: 40px;
          padding: 0 12px;
          border-radius: 999px;
          background: #F0E4D7;
          color: #755038;
          font-size: 0.82rem;
          font-weight: 800;
        }

        .orders-error {
          background: #FFF5F2;
          border: 1px solid #EBCFC5;
          color: #9A4935;
          padding: 17px 18px;
          border-radius: 16px;
          margin-bottom: 20px;
          font-size: 0.88rem;
          line-height: 1.5;
        }

        .orders-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .order-card {
          position: relative;
          overflow: hidden;
          background: rgba(255,255,255,0.94);
          border: 1px solid #E9E0D7;
          border-radius: 24px;
          padding: 20px;
          box-shadow:
            0 8px 28px rgba(45,27,14,0.045);
          cursor: pointer;
          transition:
            transform 0.22s ease,
            box-shadow 0.22s ease,
            border-color 0.22s ease;
        }

        .order-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 3px;
          background: linear-gradient(
            90deg,
            #C4956A,
            #E5CDB7,
            transparent
          );
          opacity: 0.8;
        }

        .order-card:hover {
          transform: translateY(-2px);
          border-color: #DCCABB;
          box-shadow:
            0 14px 38px rgba(45,27,14,0.075);
        }

        .order-card:active {
          transform: translateY(0);
        }

        .order-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 17px;
        }

        .order-reference {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .order-number {
          color: #2D1B0E;
          font-size: 0.84rem;
          font-weight: 800;
          letter-spacing: 0.03em;
        }

        .order-date {
          color: #9A8D83;
          font-size: 0.76rem;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: 999px;
          padding: 7px 10px;
          font-size: 0.72rem;
          font-weight: 800;
          white-space: nowrap;
        }

        .status-preparing {
          background: #FFF4DD;
          color: #9A6B18;
        }

        .status-transit {
          background: #F0E8FF;
          color: #6D4CA1;
        }

        .status-delivered {
          background: #E8F3EA;
          color: #4D795A;
        }

        .status-cancelled {
          background: #FCEBE7;
          color: #A8513D;
        }

        .status-default {
          background: #F0ECE7;
          color: #70645C;
        }

        .items-preview {
          display: flex;
          flex-direction: column;
          gap: 11px;
        }

        .order-item {
          display: flex;
          align-items: center;
          gap: 13px;
          min-width: 0;
        }

        .item-image-wrap {
          position: relative;
          flex: 0 0 58px;
          width: 58px;
          height: 58px;
          border-radius: 16px;
          overflow: hidden;
          background: #F3ECE5;
          border: 1px solid #E9DED3;
        }

        .item-image {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .item-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #B79A83;
        }

        .item-info {
          min-width: 0;
          flex: 1;
        }

        .item-name {
          color: #302016;
          font-family: 'Playfair Display', serif;
          font-size: 1rem;
          font-weight: 600;
          line-height: 1.25;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .item-meta {
          color: #96877C;
          font-size: 0.76rem;
          margin-top: 4px;
          line-height: 1.4;
        }

        .item-price {
          flex-shrink: 0;
          color: #493225;
          font-size: 0.86rem;
          font-weight: 800;
        }

        .more-items {
          margin-left: 71px;
          color: #9A8C81;
          font-size: 0.76rem;
          font-weight: 600;
        }

        .order-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          border-top: 1px solid #F0EAE4;
          margin-top: 18px;
          padding-top: 16px;
        }

        .order-total-wrap {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .total-label {
          color: #9A8D83;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 700;
        }

        .total-price {
          color: #2D1B0E;
          font-size: 1.15rem;
          font-weight: 800;
        }

        .reorder-btn {
          border: 1px solid #D8C4B3;
          background: #FFFDFB;
          color: #5A3D2A;
          border-radius: 13px;
          padding: 10px 15px;
          min-height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          font-size: 0.78rem;
          font-weight: 800;
          cursor: pointer;
          transition:
            background 0.2s ease,
            border-color 0.2s ease,
            transform 0.2s ease;
        }

        .reorder-btn:hover {
          background: #F5EBDD;
          border-color: #C9AD95;
        }

        .reorder-btn:active {
          transform: scale(0.97);
        }

        .order-chevron {
          color: #B5A69B;
          flex-shrink: 0;
        }

        .empty-orders {
          text-align: center;
          background: rgba(255,255,255,0.9);
          border: 1px solid #E8DED4;
          border-radius: 28px;
          padding: 55px 25px;
          box-shadow: 0 12px 35px rgba(45,27,14,0.045);
        }

        .empty-icon {
          width: 68px;
          height: 68px;
          margin: 0 auto 18px;
          border-radius: 22px;
          background: #F1E5D8;
          color: #8C6244;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .empty-title {
          margin: 0;
          font-family: 'Playfair Display', serif;
          color: #2D1B0E;
          font-size: 1.65rem;
        }

        .empty-text {
          max-width: 330px;
          margin: 9px auto 23px;
          color: #8A7C72;
          font-size: 0.88rem;
          line-height: 1.55;
        }

        .empty-button {
          border: none;
          background: #2D1B0E;
          color: #FFF9F4;
          border-radius: 14px;
          padding: 12px 21px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.2s ease, opacity 0.2s ease;
        }

        .empty-button:hover {
          opacity: 0.92;
          transform: translateY(-1px);
        }

        @media (max-width: 600px) {
          .orders-page {
            padding: 88px 14px 50px;
          }

          .orders-topbar {
            align-items: flex-start;
            margin-bottom: 24px;
          }

          .orders-title {
            font-size: 2.35rem;
          }

          .orders-count {
            min-width: 36px;
            height: 36px;
          }

          .order-card {
            border-radius: 21px;
            padding: 17px;
          }

          .order-header {
            align-items: flex-start;
          }

          .status-badge {
            padding: 6px 8px;
            font-size: 0.66rem;
          }

          .item-image-wrap {
            flex-basis: 54px;
            width: 54px;
            height: 54px;
            border-radius: 14px;
          }

          .more-items {
            margin-left: 67px;
          }

          .order-footer {
            align-items: flex-end;
          }

          .reorder-btn {
            padding: 9px 13px;
          }
        }

        @media (max-width: 380px) {
          .order-footer {
            flex-direction: column;
            align-items: stretch;
          }

          .reorder-btn {
            width: 100%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .order-card,
          .reorder-btn,
          .orders-back,
          .empty-button {
            transition: none;
          }
        }
      `}</style>

      <div className="orders-page">
        <div className="orders-container">

          <div className="orders-topbar">
            <div>
              <button
                className="orders-back"
                onClick={() => setPage("menu")}
                type="button"
              >
                <ArrowLeft size={16} />
                Back to menu
              </button>

              <p className="orders-eyebrow">
                Your Brewed moments
              </p>

              <h1 className="orders-title">
                Order History
              </h1>

              <p className="orders-subtitle">
                Every cup, every craving, all in one place.
              </p>
            </div>

            {orders.length > 0 && (
              <div className="orders-count">
                {orders.length}
              </div>
            )}
          </div>

          {error && (
            <div className="orders-error">
              {error}
            </div>
          )}

          {orders.length === 0 ? (
            <div className="empty-orders">
              <div className="empty-icon">
                <Coffee size={30} />
              </div>

              <h2 className="empty-title">
                Nothing brewed yet
              </h2>

              <p className="empty-text">
                Your first Brewed order is waiting.
                Find something lovely from the menu and
                make it yours.
              </p>

              <button
                className="empty-button"
                type="button"
                onClick={() => setPage("menu")}
              >
                Explore the menu
              </button>
            </div>
          ) : (
            <div className="orders-list">
              {orders.map((order) => {
                const status = getStatus(order.status);
                const StatusIcon = status.icon;

                const items = Array.isArray(order.items)
                  ? order.items
                  : [];

                const visibleItems = items.slice(0, 3);
                const remainingItems = Math.max(
                  0,
                  items.length - visibleItems.length
                );

                return (
                  <div
                    className="order-card"
                    key={order.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setPage("menu")}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" ||
                        event.key === " "
                      ) {
                        event.preventDefault();
                        setPage("menu");
                      }
                    }}
                  >

                    <div className="order-header">
                      <div className="order-reference">
                        <span className="order-number">
                          {getOrderNumber(order.id)}
                        </span>

                        <span className="order-date">
                          {formatDate(order.createdAt)}
                          {formatTime(order.createdAt) &&
                            ` • ${formatTime(order.createdAt)}`}
                        </span>
                      </div>

                      <span
                        className={`status-badge ${status.className}`}
                      >
                        <StatusIcon size={13} />
                        {status.label}
                      </span>
                    </div>

                    <div className="items-preview">
                      {visibleItems.length > 0 ? (
                        visibleItems.map((item, index) => {
                          const image = getItemImage(item);

                          const quantity = Number(
                            item?.qty ??
                            item?.quantity ??
                            1
                          );

                          return (
                            <div
                              className="order-item"
                              key={`${order.id}-${item?.id || index}`}
                            >
                              <div className="item-image-wrap">
                                {image ? (
                                  <img
                                    className="item-image"
                                    src={image}
                                    alt={item?.name || "Order item"}
                                    loading="lazy"
                                    onError={(event) => {
                                      event.currentTarget.style.display =
                                        "none";

                                      const placeholder =
                                        event.currentTarget
                                          .nextElementSibling;

                                      if (placeholder) {
                                        placeholder.style.display =
                                          "flex";
                                      }
                                    }}
                                  />
                                ) : null}

                                <div
                                  className="item-placeholder"
                                  style={{
                                    display: image
                                      ? "none"
                                      : "flex",
                                  }}
                                >
                                  <Coffee size={22} />
                                </div>
                              </div>

                              <div className="item-info">
                                <div className="item-name">
                                  {item?.name ||
                                    "Brewed item"}
                                </div>

                                <div className="item-meta">
                                  Qty {Number.isFinite(quantity)
                                    ? quantity
                                    : 1}

                                  {item?.size
                                    ? ` • ${item.size}`
                                    : ""}

                                  {item?.variant
                                    ? ` • ${item.variant}`
                                    : ""}
                                </div>
                              </div>

                              {item?.price !== undefined && (
                                <div className="item-price">
                                  ₹
                                  {formatPrice(
                                    Number(item.price || 0) *
                                      (Number.isFinite(quantity)
                                        ? quantity
                                        : 1)
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="order-item">
                          <div className="item-image-wrap">
                            <div className="item-placeholder">
                              <Package size={22} />
                            </div>
                          </div>

                          <div className="item-info">
                            <div className="item-name">
                              Brewed order
                            </div>

                            <div className="item-meta">
                              Order details available
                            </div>
                          </div>
                        </div>
                      )}

                      {remainingItems > 0 && (
                        <div className="more-items">
                          + {remainingItems} more{" "}
                          {remainingItems === 1
                            ? "item"
                            : "items"}
                        </div>
                      )}
                    </div>

                    <div className="order-footer">
                      <div className="order-total-wrap">
                        <span className="total-label">
                          {getItemCount(items)}{" "}
                          {getItemCount(items) === 1
                            ? "item"
                            : "items"}{" "}
                          • Total
                        </span>

                        <span className="total-price">
                          ₹{formatPrice(order.total)}
                        </span>
                      </div>

                      <button
                        className="reorder-btn"
                        type="button"
                        onClick={(event) =>
                          handleReorder(event, order)
                        }
                        disabled={!items.length}
                      >
                        <RotateCcw size={14} />
                        Reorder
                      </button>

                      <ChevronRight
                        className="order-chevron"
                        size={17}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
