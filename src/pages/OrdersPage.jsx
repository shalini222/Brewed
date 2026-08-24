import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Coffee,
  Loader2,
  Package,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";

export default function OrdersPage({ setPage }) {
  const { user } = useAuth();
  const { reorder } = useCart();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedOrders, setExpandedOrders] = useState({});
  const [reorderingId, setReorderingId] = useState(null);

  useEffect(() => {
    if (!user?.uid) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const ordersRef = collection(db, "orders");

    const ordersQuery = query(
      ordersRef,
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const fetchedOrders = snapshot.docs.map((orderDoc) => {
          const data = orderDoc.data();

          return {
            id: orderDoc.id,
            ...data,
            items: Array.isArray(data.items) ? data.items : [],
          };
        });

        setOrders(fetchedOrders);
        setLoading(false);
      },
      (snapshotError) => {
        console.error("Orders subscription error:", snapshotError);

        setError(
          "We couldn't load your orders right now. Please try again."
        );

        setOrders([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const formatDate = (timestamp) => {
    if (!timestamp) return "Date unavailable";

    try {
      const date =
        typeof timestamp?.toDate === "function"
          ? timestamp.toDate()
          : timestamp instanceof Date
          ? timestamp
          : new Date(timestamp);

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

  const formatTime = (timestamp) => {
    if (!timestamp) return "";

    try {
      const date =
        typeof timestamp?.toDate === "function"
          ? timestamp.toDate()
          : timestamp instanceof Date
          ? timestamp
          : new Date(timestamp);

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
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return "₹0";
    }

    return `₹${numericValue.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;
  };

  const getStatusConfig = (status) => {
    const normalized = String(status || "preparing")
      .trim()
      .toLowerCase();

    const configs = {
      pending: {
        label: "Pending",
        className: "status-pending",
      },
      confirmed: {
        label: "Confirmed",
        className: "status-confirmed",
      },
      accepted: {
        label: "Accepted",
        className: "status-confirmed",
      },
      preparing: {
        label: "Preparing",
        className: "status-preparing",
      },
      ready: {
        label: "Ready",
        className: "status-ready",
      },
      assigned: {
        label: "Rider Assigned",
        className: "status-assigned",
      },
      "out for delivery": {
        label: "Out for Delivery",
        className: "status-delivery",
      },
      delivered: {
        label: "Delivered",
        className: "status-delivered",
      },
      completed: {
        label: "Completed",
        className: "status-delivered",
      },
      cancelled: {
        label: "Cancelled",
        className: "status-cancelled",
      },
      canceled: {
        label: "Cancelled",
        className: "status-cancelled",
      },
      failed: {
        label: "Failed",
        className: "status-cancelled",
      },
      refunded: {
        label: "Refunded",
        className: "status-refunded",
      },
    };

    return (
      configs[normalized] || {
        label:
          normalized.charAt(0).toUpperCase() + normalized.slice(1) ||
          "Preparing",
        className: "status-default",
      }
    );
  };

  const getItemQuantity = (item) => {
    const quantity = Number(item?.qty ?? item?.quantity ?? 1);

    return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
  };

  const getItemLabel = (item) => {
    const quantity = getItemQuantity(item);

    return `${quantity} ${quantity === 1 ? "item" : "items"}`;
  };

  const getOrderTotal = (order) => {
    const total = Number(
      order?.total ??
        order?.grandTotal ??
        order?.amount ??
        order?.pricing?.total ??
        0
    );

    return Number.isFinite(total) ? total : 0;
  };

  const toggleExpanded = (orderId) => {
    setExpandedOrders((previous) => ({
      ...previous,
      [orderId]: !previous[orderId],
    }));
  };

  const handleReorder = async (order) => {
    if (!order?.items?.length || reorderingId) return;

    try {
      setReorderingId(order.id);

      await Promise.resolve(reorder(order.items));

      setPage("cart");
    } catch (reorderError) {
      console.error("Reorder failed:", reorderError);

      setError(
        "We couldn't add those items to your cart. Please try again."
      );
    } finally {
      setReorderingId(null);
    }
  };

  const totalOrders = orders.length;

  const deliveredOrders = useMemo(
    () =>
      orders.filter((order) => {
        const status = String(order.status || "").toLowerCase();

        return status === "delivered" || status === "completed";
      }).length,
    [orders]
  );

  return (
    <>
      <style>{`
        .orders-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at top right,
              rgba(177, 137, 94, 0.07),
              transparent 34%
            ),
            #fbf8f3;
          padding: 92px 20px 60px;
          color: #2d1b0e;
        }

        .orders-container {
          width: 100%;
          max-width: 780px;
          margin: 0 auto;
        }

        .orders-header {
          margin-bottom: 32px;
        }

        .back-button {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 0;
          margin: 0 0 25px;
          border: 0;
          background: transparent;
          color: #6f5b4e;
          font-size: 0.9rem;
          font-weight: 650;
          cursor: pointer;
          transition:
            color 0.2s ease,
            transform 0.2s ease;
        }

        .back-button:hover {
          color: #2d1b0e;
          transform: translateX(-2px);
        }

        .orders-heading-row {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
        }

        .eyebrow {
          margin: 0 0 7px;
          color: #a8845e;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .page-title {
          margin: 0;
          font-family: "Playfair Display", Georgia, serif;
          font-size: clamp(2.2rem, 6vw, 3.15rem);
          line-height: 1;
          letter-spacing: -0.035em;
          color: #2d1b0e;
        }

        .page-subtitle {
          margin: 12px 0 0;
          color: #8c7b70;
          font-size: 0.94rem;
          line-height: 1.6;
        }

        .orders-stats {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
          padding: 8px 12px;
          border: 1px solid #ece4db;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.72);
          color: #756359;
          font-size: 0.78rem;
          font-weight: 700;
        }

        .stats-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #b8895d;
        }

        .orders-error {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 20px;
          padding: 15px 17px;
          border: 1px solid #ead7d0;
          border-radius: 16px;
          background: #fff8f6;
          color: #875b4f;
          font-size: 0.88rem;
        }

        .retry-button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
          border: 0;
          background: transparent;
          color: #5f4638;
          font-weight: 750;
          cursor: pointer;
        }

        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 280px;
          border: 1px solid #eee6dd;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.76);
          color: #8d7c71;
          font-size: 0.92rem;
        }

        .spin {
          animation: orders-spin 0.9s linear infinite;
        }

        @keyframes orders-spin {
          to {
            transform: rotate(360deg);
          }
        }

        .empty-state {
          padding: 54px 28px;
          text-align: center;
          border: 1px solid #eee6dd;
          border-radius: 26px;
          background: rgba(255, 255, 255, 0.8);
          box-shadow: 0 14px 40px rgba(54, 35, 22, 0.035);
        }

        .empty-icon {
          width: 58px;
          height: 58px;
          display: grid;
          place-items: center;
          margin: 0 auto 18px;
          border-radius: 18px;
          background: #f3ebe2;
          color: #896b52;
        }

        .empty-state h2 {
          margin: 0;
          font-family: "Playfair Display", Georgia, serif;
          font-size: 1.6rem;
          color: #2d1b0e;
        }

        .empty-state p {
          max-width: 390px;
          margin: 9px auto 23px;
          color: #918076;
          font-size: 0.9rem;
          line-height: 1.6;
        }

        .shop-button {
          border: 0;
          padding: 11px 18px;
          border-radius: 13px;
          background: #2d1b0e;
          color: #fffaf5;
          font-size: 0.86rem;
          font-weight: 750;
          cursor: pointer;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .shop-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 18px rgba(45, 27, 14, 0.14);
        }

        .orders-list {
          display: grid;
          gap: 16px;
        }

        .order-card {
          overflow: hidden;
          border: 1px solid #eee7df;
          border-radius: 23px;
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 10px 30px rgba(54, 35, 22, 0.035);
          transition:
            box-shadow 0.25s ease,
            transform 0.25s ease;
        }

        .order-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 15px 34px rgba(54, 35, 22, 0.06);
        }

        .order-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 18px 20px 14px;
        }

        .order-reference {
          min-width: 0;
        }

        .order-number {
          margin: 0;
          color: #39271b;
          font-size: 0.8rem;
          font-weight: 800;
          letter-spacing: 0.06em;
        }

        .order-date {
          margin-top: 4px;
          color: #a0938a;
          font-size: 0.77rem;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          flex-shrink: 0;
          padding: 6px 11px;
          border-radius: 999px;
          font-size: 0.69rem;
          font-weight: 800;
          letter-spacing: 0.02em;
        }

        .status-pending {
          background: #fff5dd;
          color: #9b700d;
        }

        .status-confirmed,
        .status-assigned {
          background: #f0eee9;
          color: #66594f;
        }

        .status-preparing {
          background: #fff3e5;
          color: #a46b20;
        }

        .status-ready {
          background: #edf5ec;
          color: #557550;
        }

        .status-delivery {
          background: #eeeaf7;
          color: #65528d;
        }

        .status-delivered {
          background: #eaf4ed;
          color: #4f7359;
        }

        .status-cancelled {
          background: #faece9;
          color: #95584d;
        }

        .status-refunded {
          background: #f0edf2;
          color: #74677b;
        }

        .status-default {
          background: #f2eee9;
          color: #6f6258;
        }

        .items-list {
          padding: 0 20px;
        }

        .item-row {
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 12px 0;
          border-top: 1px solid #f5f0eb;
        }

        .item-row:first-child {
          border-top: 0;
        }

        .item-image {
          width: 52px;
          height: 52px;
          flex: 0 0 52px;
          border-radius: 14px;
          object-fit: cover;
          background: #f3eee8;
        }

        .item-placeholder {
          display: grid;
          place-items: center;
          color: #a88c72;
        }

        .item-details {
          min-width: 0;
          flex: 1;
        }

        .item-name {
          overflow: hidden;
          margin: 0;
          color: #342217;
          font-size: 0.92rem;
          font-weight: 750;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .item-meta {
          margin-top: 4px;
          color: #998a80;
          font-size: 0.75rem;
        }

        .item-price {
          flex-shrink: 0;
          color: #4b382b;
          font-size: 0.82rem;
          font-weight: 750;
        }

        .more-items {
          padding: 9px 0 13px;
          color: #9b8b81;
          font-size: 0.75rem;
          font-weight: 650;
        }

        .order-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-top: 4px;
          padding: 15px 20px 18px;
          border-top: 1px solid #f1ebe5;
        }

        .order-total-label {
          color: #988980;
          font-size: 0.74rem;
        }

        .order-total {
          margin-top: 2px;
          color: #2d1b0e;
          font-size: 1.04rem;
          font-weight: 850;
        }

        .footer-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .view-items-button,
        .reorder-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 39px;
          border-radius: 12px;
          font-size: 0.78rem;
          font-weight: 750;
          cursor: pointer;
          transition:
            transform 0.2s ease,
            background 0.2s ease,
            opacity 0.2s ease;
        }

        .view-items-button {
          padding: 0 12px;
          border: 1px solid #e9e1d9;
          background: #fffdfb;
          color: #66554a;
        }

        .view-items-button:hover {
          background: #f8f2ec;
        }

        .reorder-button {
          padding: 0 15px;
          border: 0;
          background: #2d1b0e;
          color: #fffaf5;
        }

        .reorder-button:hover:not(:disabled) {
          transform: translateY(-1px);
          background: #432a1a;
        }

        .reorder-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .reorder-button svg {
          flex-shrink: 0;
        }

        @media (max-width: 620px) {
          .orders-page {
            padding: 82px 14px 45px;
          }

          .orders-heading-row {
            align-items: flex-start;
            flex-direction: column;
          }

          .orders-stats {
            margin-top: 2px;
          }

          .order-top {
            padding: 16px 15px 12px;
          }

          .items-list {
            padding: 0 15px;
          }

          .order-footer {
            align-items: stretch;
            flex-direction: column;
            padding: 14px 15px 16px;
          }

          .footer-actions {
            width: 100%;
          }

          .view-items-button,
          .reorder-button {
            flex: 1;
          }

          .orders-error {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 390px) {
          .status-badge {
            padding: 5px 8px;
            font-size: 0.62rem;
          }

          .item-image {
            width: 46px;
            height: 46px;
            flex-basis: 46px;
          }

          .item-price {
            display: none;
          }

          .footer-actions {
            gap: 7px;
          }
        }
      `}</style>

      <main className="orders-page">
        <div className="orders-container">
          <header className="orders-header">
            <button
              type="button"
              className="back-button"
              onClick={() => setPage("menu")}
              aria-label="Return to menu"
            >
              <ArrowLeft size={17} strokeWidth={2.2} />
              Return to Menu
            </button>

            <div className="orders-heading-row">
              <div>
                <p className="eyebrow">Your coffee story</p>

                <h1 className="page-title">Orders</h1>

                <p className="page-subtitle">
                  Every cup, every craving, all in one place.
                </p>
              </div>

              {!loading && orders.length > 0 && (
                <div className="orders-stats">
                  <span>{totalOrders} orders</span>
                  <span className="stats-dot" />
                  <span>{deliveredOrders} enjoyed</span>
                </div>
              )}
            </div>
          </header>

          {error && (
            <div className="orders-error" role="alert">
              <span>{error}</span>

              <button
                type="button"
                className="retry-button"
                onClick={() => window.location.reload()}
              >
                <RefreshCw size={14} />
                Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className="loading-state" aria-live="polite">
              <Loader2 size={19} className="spin" />
              <span>Brewing your order history...</span>
            </div>
          ) : orders.length === 0 ? (
            <section className="empty-state">
              <div className="empty-icon">
                <Coffee size={25} strokeWidth={1.8} />
              </div>

              <h2>No orders yet</h2>

              <p>
                Your next favourite coffee is waiting. Browse the menu and
                make your first Brewed order.
              </p>

              <button
                type="button"
                className="shop-button"
                onClick={() => setPage("menu")}
              >
                Explore Menu
              </button>
            </section>
          ) : (
            <section className="orders-list" aria-label="Your orders">
              {orders.map((order) => {
                const statusConfig = getStatusConfig(order.status);
                const items = Array.isArray(order.items)
                  ? order.items
                  : [];

                const isExpanded = Boolean(expandedOrders[order.id]);
                const visibleItems = isExpanded
                  ? items
                  : items.slice(0, 3);

                const remainingItems = Math.max(
                  items.length - visibleItems.length,
                  0
                );

                const itemCount = items.reduce(
                  (total, item) => total + getItemQuantity(item),
                  0
                );

                const firstTimestamp = order.createdAt;
                const date = formatDate(firstTimestamp);
                const time = formatTime(firstTimestamp);

                return (
                  <article className="order-card" key={order.id}>
                    <div className="order-top">
                      <div className="order-reference">
                        <p className="order-number">
                          #{order.id.slice(-7).toUpperCase()}
                        </p>

                        <div className="order-date">
                          {date}
                          {time ? ` • ${time}` : ""}
                          {itemCount
                            ? ` • ${itemCount} ${
                                itemCount === 1 ? "item" : "items"
                              }`
                            : ""}
                        </div>
                      </div>

                      <span
                        className={`status-badge ${statusConfig.className}`}
                      >
                        {statusConfig.label}
                      </span>
                    </div>

                    <div className="items-list">
                      {visibleItems.length > 0 ? (
                        visibleItems.map((item, index) => {
                          const quantity = getItemQuantity(item);

                          const itemPrice = Number(
                            item?.price ??
                              item?.total ??
                              item?.unitPrice ??
                              0
                          );

                          const safeImage =
                            typeof item?.image === "string"
                              ? item.image.trim()
                              : "";

                          return (
                            <div
                              className="item-row"
                              key={`${order.id}-${index}`}
                            >
                              {safeImage ? (
                                <img
                                  className="item-image"
                                  src={safeImage}
                                  alt={item?.name || "Ordered item"}
                                  loading="lazy"
                                  onError={(event) => {
                                    event.currentTarget.style.display =
                                      "none";

                                    event.currentTarget.nextElementSibling?.classList.add(
                                      "item-placeholder"
                                    );
                                  }}
                                />
                              ) : null}

                              <div
                                className={`item-image ${
                                  safeImage ? "item-fallback" : "item-placeholder"
                                }`}
                                aria-hidden="true"
                              >
                                <Coffee size={20} strokeWidth={1.6} />
                              </div>

                              <div className="item-details">
                                <p className="item-name">
                                  {item?.name || "Brewed item"}
                                </p>

                                <div className="item-meta">
                                  {getItemLabel(item)}
                                  {item?.size ? ` • ${item.size}` : ""}
                                  {item?.variant
                                    ? ` • ${item.variant}`
                                    : ""}
                                </div>
                              </div>

                              {Number.isFinite(itemPrice) &&
                                itemPrice > 0 && (
                                  <div className="item-price">
                                    {formatPrice(itemPrice * quantity)}
                                  </div>
                                )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="item-row">
                          <div className="item-image item-placeholder">
                            <Package size={20} strokeWidth={1.6} />
                          </div>

                          <div className="item-details">
                            <p className="item-name">Order details</p>
                            <div className="item-meta">
                              Item information unavailable
                            </div>
                          </div>
                        </div>
                      )}

                      {!isExpanded && remainingItems > 0 && (
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
                          {formatPrice(getOrderTotal(order))}
                        </div>
                      </div>

                      <div className="footer-actions">
                        {items.length > 3 && (
                          <button
                            type="button"
                            className="view-items-button"
                            onClick={() => toggleExpanded(order.id)}
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp size={15} />
                                Show less
                              </>
                            ) : (
                              <>
                                <ChevronDown size={15} />
                                View all
                              </>
                            )}
                          </button>
                        )}

                        <button
                          type="button"
                          className="reorder-button"
                          disabled={
                            !items.length || reorderingId === order.id
                          }
                          onClick={() => handleReorder(order)}
                        >
                          {reorderingId === order.id ? (
                            <>
                              <Loader2
                                size={15}
                                className="spin"
                              />
                              Adding...
                            </>
                          ) : (
                            <>
                              <ShoppingBag size={15} />
                              Reorder
                            </>
                          )}
                        </button>
                      </div>
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
