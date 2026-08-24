import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
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

import { db, auth } from "../firebase";
import { useCart } from "../context/CartContext";

export default function OrdersPage({ setPage }) {
  const { reorder } = useCart();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedOrders, setExpandedOrders] = useState({});
  const [reorderingId, setReorderingId] = useState(null);

  /*
   * ============================================================
   * LOAD CUSTOMER ORDERS
   * ============================================================
   *
   * Your CheckoutPage stores:
   *
   * userId: auth.currentUser.uid
   *
   * so OrdersPage queries using that exact field.
   *
   * Primary query:
   *   userId == current user
   *   order by createdAt descending
   *
   * Fallback:
   *   userId == current user
   *
   * The fallback prevents the page from becoming completely
   * unusable if the composite Firestore index hasn't been created.
   */

  useEffect(() => {
    let unsubscribe = null;
    let fallbackUnsubscribe = null;
    let isMounted = true;

    const subscribeToOrders = () => {
      const currentUser = auth.currentUser;

      if (!currentUser?.uid) {
        if (isMounted) {
          setOrders([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError("");

      const ordersRef = collection(db, "orders");

      /*
       * Preferred production query.
       *
       * This requires a Firestore composite index:
       *
       * userId ASC
       * createdAt DESC
       */
      const orderedQuery = query(
        ordersRef,
        where("userId", "==", currentUser.uid),
        orderBy("createdAt", "desc")
      );

      unsubscribe = onSnapshot(
        orderedQuery,
        (snapshot) => {
          if (!isMounted) return;

          const fetchedOrders = snapshot.docs.map((orderDoc) => ({
            id: orderDoc.id,
            ...orderDoc.data(),
            items: Array.isArray(orderDoc.data()?.items)
              ? orderDoc.data().items
              : [],
          }));

          setOrders(fetchedOrders);
          setLoading(false);
          setError("");
        },
        (snapshotError) => {
          console.error(
            "Orders ordered query failed:",
            snapshotError
          );

          /*
           * If Firestore complains about the composite index,
           * fall back to a user-only query.
           *
           * This means the page still works before the index
           * is created.
           */
          if (
            snapshotError?.code === "failed-precondition" ||
            snapshotError?.code === "permission-denied"
          ) {
            console.warn(
              "Falling back to user-only orders query."
            );

            if (unsubscribe) {
              unsubscribe();
              unsubscribe = null;
            }

            const fallbackQuery = query(
              ordersRef,
              where("userId", "==", currentUser.uid)
            );

            fallbackUnsubscribe = onSnapshot(
              fallbackQuery,
              (snapshot) => {
                if (!isMounted) return;

                const fetchedOrders = snapshot.docs
                  .map((orderDoc) => ({
                    id: orderDoc.id,
                    ...orderDoc.data(),
                    items: Array.isArray(
                      orderDoc.data()?.items
                    )
                      ? orderDoc.data().items
                      : [],
                  }))
                  .sort((a, b) => {
                    return (
                      getTimestampMillis(b.createdAt) -
                      getTimestampMillis(a.createdAt)
                    );
                  });

                setOrders(fetchedOrders);
                setLoading(false);

                /*
                 * Don't show an error just because the composite
                 * index doesn't exist.
                 */
                setError("");
              },
              (fallbackError) => {
                console.error(
                  "Fallback orders query failed:",
                  fallbackError
                );

                if (!isMounted) return;

                setOrders([]);
                setLoading(false);

                if (
                  fallbackError?.code ===
                  "permission-denied"
                ) {
                  setError(
                    "You don't have permission to view your orders."
                  );
                } else {
                  setError(
                    "We couldn't load your orders right now."
                  );
                }
              }
            );

            return;
          }

          if (!isMounted) return;

          setOrders([]);
          setLoading(false);

          if (
            snapshotError?.code === "permission-denied"
          ) {
            setError(
              "You don't have permission to view your orders."
            );
          } else {
            setError(
              "We couldn't load your orders right now."
            );
          }
        }
      );
    };

    /*
     * Firebase Auth may still be restoring the session when
     * OrdersPage first mounts.
     *
     * Waiting for the auth state prevents an unnecessary query
     * with a null user.
     */
    const unsubscribeAuth = auth.onAuthStateChanged(() => {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }

      if (fallbackUnsubscribe) {
        fallbackUnsubscribe();
        fallbackUnsubscribe = null;
      }

      subscribeToOrders();
    });

    return () => {
      isMounted = false;

      unsubscribeAuth();

      if (unsubscribe) {
        unsubscribe();
      }

      if (fallbackUnsubscribe) {
        fallbackUnsubscribe();
      }
    };
  }, []);

  /*
   * ============================================================
   * HELPERS
   * ============================================================
   */

  function getTimestampMillis(timestamp) {
    try {
      if (!timestamp) return 0;

      if (typeof timestamp.toMillis === "function") {
        return timestamp.toMillis();
      }

      if (typeof timestamp.toDate === "function") {
        return timestamp.toDate().getTime();
      }

      if (timestamp instanceof Date) {
        return timestamp.getTime();
      }

      if (typeof timestamp === "number") {
        return timestamp;
      }

      const parsed = new Date(timestamp).getTime();

      return Number.isNaN(parsed) ? 0 : parsed;
    } catch {
      return 0;
    }
  }

  const formatDate = (timestamp) => {
    const millis = getTimestampMillis(timestamp);

    if (!millis) {
      return "Date unavailable";
    }

    try {
      return new Date(millis).toLocaleDateString(
        "en-IN",
        {
          day: "numeric",
          month: "short",
          year: "numeric",
        }
      );
    } catch {
      return "Date unavailable";
    }
  };

  const formatTime = (timestamp) => {
    const millis = getTimestampMillis(timestamp);

    if (!millis) return "";

    try {
      return new Date(millis).toLocaleTimeString(
        "en-IN",
        {
          hour: "numeric",
          minute: "2-digit",
        }
      );
    } catch {
      return "";
    }
  };

  const formatPrice = (value) => {
    const amount = Number(value);

    if (!Number.isFinite(amount)) {
      return "₹0";
    }

    return `₹${amount.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;
  };

  const getQuantity = (item) => {
    const quantity = Number(
      item?.qty ?? item?.quantity ?? 1
    );

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return 1;
    }

    return quantity;
  };

  const getStatusConfig = (status) => {
    const normalized = String(
      status || "New"
    )
      .trim()
      .toLowerCase();

    const statusMap = {
      new: {
        label: "New",
        className: "status-new",
      },

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
      statusMap[normalized] || {
        label:
          String(status || "New")
            .trim()
            .replace(/\b\w/g, (char) =>
              char.toUpperCase()
            ),
        className: "status-default",
      }
    );
  };

  const getOrderTotal = (order) => {
    const total = Number(
      order?.total ??
        order?.grandTotal ??
        order?.amount ??
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
    if (
      !order?.items?.length ||
      reorderingId
    ) {
      return;
    }

    try {
      setReorderingId(order.id);
      setError("");

      await Promise.resolve(
        reorder(order.items)
      );

      setPage("cart");
    } catch (err) {
      console.error(
        "Reorder failed:",
        err
      );

      setError(
        "We couldn't add these items to your cart. Please try again."
      );
    } finally {
      setReorderingId(null);
    }
  };

  const totalOrders = orders.length;

  const deliveredOrders = useMemo(() => {
    return orders.filter((order) => {
      const status = String(
        order?.status || ""
      ).toLowerCase();

      return (
        status === "delivered" ||
        status === "completed"
      );
    }).length;
  }, [orders]);

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <>
      <style>{`
        .orders-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 92% 4%,
              rgba(196, 149, 106, 0.10),
              transparent 30%
            ),
            #faf6f0;
          padding: 92px 20px 70px;
          color: #1a0b05;
          box-sizing: border-box;
        }

        .orders-container {
          width: 100%;
          max-width: 780px;
          margin: 0 auto;
        }

        .orders-header {
          margin-bottom: 30px;
        }

        .orders-back {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: 0;
          background: transparent;
          padding: 0;
          margin: 0 0 24px;
          color: #70645c;
          font-size: 0.88rem;
          font-weight: 650;
          cursor: pointer;
          transition:
            color 0.2s ease,
            transform 0.2s ease;
        }

        .orders-back:hover {
          color: #1a0b05;
          transform: translateX(-2px);
        }

        .orders-heading-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
        }

        .orders-eyebrow {
          margin: 0 0 7px;
          color: #b38359;
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .orders-title {
          margin: 0;
          font-family: "Playfair Display", Georgia, serif;
          font-size: clamp(2.3rem, 6vw, 3.2rem);
          line-height: 1;
          letter-spacing: -0.04em;
          font-weight: 600;
          color: #1a0b05;
        }

        .orders-subtitle {
          margin: 11px 0 0;
          color: #8b7b70;
          font-size: 0.9rem;
          line-height: 1.6;
        }

        .orders-stats {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
          padding: 8px 12px;
          border: 1px solid #e6dfd5;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.7);
          color: #70645c;
          font-size: 0.73rem;
          font-weight: 700;
        }

        .orders-stat-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #c4956a;
        }

        .orders-error {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 14px 16px;
          margin-bottom: 18px;
          border: 1px solid #ecd8d1;
          border-radius: 15px;
          background: #fff8f6;
          color: #8d5c50;
          font-size: 0.84rem;
        }

        .orders-retry {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 0;
          background: transparent;
          color: #5e4033;
          font-weight: 750;
          cursor: pointer;
        }

        .orders-loading {
          min-height: 270px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border: 1px solid #e8e0d7;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.78);
          color: #8c7d72;
          font-size: 0.9rem;
        }

        .orders-spin {
          animation: ordersSpin 0.9s linear infinite;
        }

        @keyframes ordersSpin {
          to {
            transform: rotate(360deg);
          }
        }

        .orders-empty {
          padding: 56px 25px;
          text-align: center;
          border: 1px solid #e8e0d7;
          border-radius: 25px;
          background: rgba(255, 255, 255, 0.82);
          box-shadow: 0 12px 34px rgba(26, 11, 5, 0.035);
        }

        .orders-empty-icon {
          width: 58px;
          height: 58px;
          display: grid;
          place-items: center;
          margin: 0 auto 17px;
          border-radius: 18px;
          background: #f3e9df;
          color: #967455;
        }

        .orders-empty-title {
          margin: 0;
          font-family: "Playfair Display", Georgia, serif;
          font-size: 1.6rem;
          font-weight: 600;
        }

        .orders-empty-text {
          max-width: 390px;
          margin: 9px auto 23px;
          color: #8c7d72;
          font-size: 0.88rem;
          line-height: 1.6;
        }

        .orders-shop {
          border: 0;
          border-radius: 12px;
          padding: 11px 18px;
          background: #1a0b05;
          color: #fffaf5;
          font-size: 0.82rem;
          font-weight: 750;
          cursor: pointer;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .orders-shop:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(26, 11, 5, 0.15);
        }

        .orders-list {
          display: grid;
          gap: 16px;
        }

        .order-card {
          overflow: hidden;
          border: 1px solid #e8e0d7;
          border-radius: 23px;
          background: rgba(255, 255, 255, 0.92);
          box-shadow: 0 9px 28px rgba(26, 11, 5, 0.035);
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .order-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 34px rgba(26, 11, 5, 0.055);
        }

        .order-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 18px 20px 13px;
        }

        .order-id {
          margin: 0;
          color: #382318;
          font-size: 0.78rem;
          font-weight: 800;
          letter-spacing: 0.07em;
        }

        .order-date {
          margin-top: 5px;
          color: #9a8b81;
          font-size: 0.75rem;
        }

        .order-status {
          display: inline-flex;
          align-items: center;
          flex-shrink: 0;
          padding: 6px 11px;
          border-radius: 999px;
          font-size: 0.67rem;
          font-weight: 800;
        }

        .status-new {
          background: #fff1df;
          color: #a66c26;
        }

        .status-pending {
          background: #fff5dc;
          color: #98700e;
        }

        .status-confirmed,
        .status-assigned {
          background: #efede8;
          color: #655a51;
        }

        .status-preparing {
          background: #fff2e2;
          color: #a26925;
        }

        .status-ready {
          background: #edf5ed;
          color: #557552;
        }

        .status-delivery {
          background: #eeeaf7;
          color: #68528f;
        }

        .status-delivered {
          background: #e9f4ed;
          color: #4e7459;
        }

        .status-cancelled {
          background: #faece8;
          color: #94574b;
        }

        .status-refunded {
          background: #f0edf2;
          color: #71667a;
        }

        .status-default {
          background: #f1ede8;
          color: #6e6259;
        }

        .order-items {
          padding: 0 20px;
        }

        .order-item {
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 12px 0;
          border-top: 1px solid #f3eee9;
        }

        .order-item:first-child {
          border-top: 0;
        }

        .order-item-image,
        .order-item-placeholder {
          width: 52px;
          height: 52px;
          flex: 0 0 52px;
          border-radius: 14px;
        }

        .order-item-image {
          display: block;
          object-fit: cover;
          background: #f3eee8;
        }

        .order-item-placeholder {
          display: grid;
          place-items: center;
          background: #f3eee8;
          color: #aa8c70;
        }

        .order-item-info {
          min-width: 0;
          flex: 1;
        }

        .order-item-name {
          margin: 0;
          overflow: hidden;
          color: #332115;
          font-size: 0.91rem;
          font-weight: 750;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .order-item-meta {
          margin-top: 4px;
          color: #998a80;
          font-size: 0.74rem;
        }

        .order-item-price {
          flex-shrink: 0;
          color: #49352a;
          font-size: 0.81rem;
          font-weight: 750;
        }

        .order-more {
          padding: 8px 0 13px;
          color: #9b8b81;
          font-size: 0.75rem;
          font-weight: 650;
        }

        .order-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 15px 20px 18px;
          border-top: 1px solid #f0ebe5;
        }

        .order-total-label {
          color: #9a8c82;
          font-size: 0.72rem;
        }

        .order-total {
          margin-top: 3px;
          color: #1a0b05;
          font-size: 1.05rem;
          font-weight: 850;
        }

        .order-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .order-view,
        .order-reorder {
          min-height: 39px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 0 13px;
          border-radius: 12px;
          font-size: 0.76rem;
          font-weight: 750;
          cursor: pointer;
          transition:
            transform 0.2s ease,
            background 0.2s ease,
            opacity 0.2s ease;
        }

        .order-view {
          border: 1px solid #e7ded5;
          background: #fffdfb;
          color: #66564b;
        }

        .order-view:hover {
          background: #f8f2ec;
        }

        .order-reorder {
          border: 0;
          background: #1a0b05;
          color: #fffaf5;
        }

        .order-reorder:hover:not(:disabled) {
          background: #32190d;
          transform: translateY(-1px);
        }

        .order-reorder:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        @media (max-width: 620px) {
          .orders-page {
            padding: 82px 14px 50px;
          }

          .orders-heading-row {
            align-items: flex-start;
            flex-direction: column;
          }

          .orders-stats {
            margin-top: 3px;
          }

          .order-top {
            padding: 16px 15px 12px;
          }

          .order-items {
            padding: 0 15px;
          }

          .order-footer {
            align-items: stretch;
            flex-direction: column;
            padding: 14px 15px 16px;
          }

          .order-actions {
            width: 100%;
          }

          .order-view,
          .order-reorder {
            flex: 1;
          }

          .orders-error {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 390px) {
          .order-status {
            padding: 5px 8px;
            font-size: 0.61rem;
          }

          .order-item-image,
          .order-item-placeholder {
            width: 46px;
            height: 46px;
            flex-basis: 46px;
          }

          .order-item-price {
            display: none;
          }
        }
      `}</style>

      <main className="orders-page">
        <div className="orders-container">
          <header className="orders-header">
            <button
              type="button"
              className="orders-back"
              onClick={() => setPage("menu")}
            >
              <ArrowLeft size={17} />
              Return to Menu
            </button>

            <div className="orders-heading-row">
              <div>
                <p className="orders-eyebrow">
                  Your coffee story
                </p>

                <h1 className="orders-title">
                  Orders
                </h1>

                <p className="orders-subtitle">
                  Every cup, every craving, all in one place.
                </p>
              </div>

              {!loading && orders.length > 0 && (
                <div className="orders-stats">
                  <span>
                    {totalOrders}{" "}
                    {totalOrders === 1
                      ? "order"
                      : "orders"}
                  </span>

                  <span className="orders-stat-dot" />

                  <span>
                    {deliveredOrders} enjoyed
                  </span>
                </div>
              )}
            </div>
          </header>

          {error && (
            <div
              className="orders-error"
              role="alert"
            >
              <span>{error}</span>

              <button
                type="button"
                className="orders-retry"
                onClick={() =>
                  window.location.reload()
                }
              >
                <RefreshCw size={14} />
                Retry
              </button>
            </div>
          )}

          {loading ? (
            <div
              className="orders-loading"
              aria-live="polite"
            >
              <Loader2
                size={19}
                className="orders-spin"
              />
              Brewing your order history...
            </div>
          ) : orders.length === 0 ? (
            <section className="orders-empty">
              <div className="orders-empty-icon">
                <Coffee
                  size={25}
                  strokeWidth={1.7}
                />
              </div>

              <h2 className="orders-empty-title">
                No orders yet
              </h2>

              <p className="orders-empty-text">
                Your next favourite coffee is
                waiting. Browse the menu and make
                your first Brewed order.
              </p>

              <button
                type="button"
                className="orders-shop"
                onClick={() => setPage("menu")}
              >
                Explore Menu
              </button>
            </section>
          ) : (
            <section
              className="orders-list"
              aria-label="Your orders"
            >
              {orders.map((order) => {
                const items = Array.isArray(
                  order.items
                )
                  ? order.items
                  : [];

                const isExpanded =
                  Boolean(
                    expandedOrders[order.id]
                  );

                const visibleItems =
                  isExpanded
                    ? items
                    : items.slice(0, 3);

                const remainingItems = Math.max(
                  items.length -
                    visibleItems.length,
                  0
                );

                const itemCount =
                  items.reduce(
                    (sum, item) =>
                      sum + getQuantity(item),
                    0
                  );

                const statusConfig =
                  getStatusConfig(
                    order.status
                  );

                const orderDate =
                  formatDate(
                    order.createdAt
                  );

                const orderTime =
                  formatTime(
                    order.createdAt
                  );

                return (
                  <article
                    className="order-card"
                    key={order.id}
                  >
                    <div className="order-top">
                      <div>
                        <p className="order-id">
                          #
                          {order.id
                            .slice(-7)
                            .toUpperCase()}
                        </p>

                        <div className="order-date">
                          {orderDate}

                          {orderTime
                            ? ` • ${orderTime}`
                            : ""}

                          {itemCount > 0
                            ? ` • ${itemCount} ${
                                itemCount === 1
                                  ? "item"
                                  : "items"
                              }`
                            : ""}
                        </div>
                      </div>

                      <span
                        className={`order-status ${statusConfig.className}`}
                      >
                        {statusConfig.label}
                      </span>
                    </div>

                    <div className="order-items">
                      {visibleItems.length >
                      0 ? (
                        visibleItems.map(
                          (item, index) => {
                            const quantity =
                              getQuantity(
                                item
                              );

                            const price =
                              Number(
                                item?.price ??
                                  item?.unitPrice ??
                                  item?.total ??
                                  0
                              );

                            const image =
                              typeof item?.image ===
                              "string"
                                ? item.image.trim()
                                : "";

                            return (
                              <div
                                className="order-item"
                                key={`${order.id}-${index}`}
                              >
                                {image ? (
                                  <img
                                    src={image}
                                    alt={
                                      item?.name ||
                                      "Ordered item"
                                    }
                                    className="order-item-image"
                                    loading="lazy"
                                    onError={(
                                      event
                                    ) => {
                                      event.currentTarget.style.display =
                                        "none";
                                    }}
                                  />
                                ) : (
                                  <div
                                    className="order-item-placeholder"
                                    aria-hidden="true"
                                  >
                                    <Coffee
                                      size={20}
                                    />
                                  </div>
                                )}

                                <div className="order-item-info">
                                  <p className="order-item-name">
                                    {item?.name ||
                                      "Brewed item"}
                                  </p>

                                  <div className="order-item-meta">
                                    Qty:{" "}
                                    {quantity}

                                    {item?.size
                                      ? ` • ${item.size}`
                                      : ""}

                                    {item?.variant
                                      ? ` • ${item.variant}`
                                      : ""}

                                    {item?.isReward
                                      ? " • Reward"
                                      : ""}
                                  </div>
                                </div>

                                {Number.isFinite(
                                  price
                                ) &&
                                  price > 0 && (
                                    <div className="order-item-price">
                                      {formatPrice(
                                        price *
                                          quantity
                                      )}
                                    </div>
                                  )}
                              </div>
                            );
                          }
                        )
                      ) : (
                        <div className="order-item">
                          <div className="order-item-placeholder">
                            <Package
                              size={20}
                            />
                          </div>

                          <div className="order-item-info">
                            <p className="order-item-name">
                              Order details
                            </p>

                            <div className="order-item-meta">
                              Item information
                              unavailable
                            </div>
                          </div>
                        </div>
                      )}

                      {!isExpanded &&
                        remainingItems > 0 && (
                          <div className="order-more">
                            + {remainingItems}{" "}
                            more{" "}
                            {remainingItems ===
                            1
                              ? "item"
                              : "items"}
                          </div>
                        )}
                    </div>

                    <div className="order-footer">
                      <div>
                        <div className="order-total-label">
                          Total paid
                        </div>

                        <div className="order-total">
                          {formatPrice(
                            getOrderTotal(
                              order
                            )
                          )}
                        </div>
                      </div>

                      <div className="order-actions">
                        {items.length > 3 && (
                          <button
                            type="button"
                            className="order-view"
                            onClick={() =>
                              toggleExpanded(
                                order.id
                              )
                            }
                            aria-expanded={
                              isExpanded
                            }
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp
                                  size={15}
                                />
                                Show less
                              </>
                            ) : (
                              <>
                                <ChevronDown
                                  size={15}
                                />
                                View all
                              </>
                            )}
                          </button>
                        )}

                        <button
                          type="button"
                          className="order-reorder"
                          disabled={
                            !items.length ||
                            reorderingId ===
                              order.id
                          }
                          onClick={() =>
                            handleReorder(
                              order
                            )
                          }
                        >
                          {reorderingId ===
                          order.id ? (
                            <>
                              <Loader2
                                size={15}
                                className="orders-spin"
                              />
                              Adding...
                            </>
                          ) : (
                            <>
                              <ShoppingBag
                                size={15}
                              />
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
