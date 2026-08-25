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
  ChevronRight,
  Clock3,
  Check,
  PackageCheck,
  Truck,
  XCircle,
  RotateCcw,
  ShoppingBag,
  Coffee,
} from "lucide-react";

export default function OrdersPage({ setPage }) {
  const { reorder } = useCart();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reorderingId, setReorderingId] = useState(null);

  /*
   * ============================================================
   * LOAD USER ORDERS
   * ============================================================
   *
   * IMPORTANT:
   * We intentionally DO NOT use orderBy().
   *
   * Your previous implementation caused the Firestore composite
   * index requirement. We sort locally instead.
   */
  useEffect(() => {
    let unsubscribe = null;

    const startOrdersListener = (user) => {
      if (!user) {
        setOrders([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const ordersQuery = query(
          collection(db, "orders"),
          where("userId", "==", user.uid)
        );

        unsubscribe = onSnapshot(
          ordersQuery,
          (snapshot) => {
            const fetchedOrders = snapshot.docs.map((orderDoc) => {
              const data = orderDoc.data();

              return {
                id: orderDoc.id,
                ...data,
              };
            });

            /*
             * Sort locally instead of using Firestore orderBy().
             */
            fetchedOrders.sort((a, b) => {
              const aTime = getTimestampMillis(a.createdAt);
              const bTime = getTimestampMillis(b.createdAt);

              return bTime - aTime;
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
      } catch (err) {
        console.error("Orders query error:", err);

        setError(
          "We couldn't load your orders right now. Please try again."
        );

        setOrders([]);
        setLoading(false);
      }
    };

    /*
     * Auth can be ready immediately or slightly later.
     */
    const authUnsubscribe = auth.onAuthStateChanged((user) => {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }

      startOrdersListener(user);
    });

    return () => {
      authUnsubscribe();

      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  /*
   * ============================================================
   * HELPERS
   * ============================================================
   */

  function getTimestampMillis(timestamp) {
    if (!timestamp) return 0;

    if (typeof timestamp?.toMillis === "function") {
      return timestamp.toMillis();
    }

    if (timestamp instanceof Date) {
      return timestamp.getTime();
    }

    if (typeof timestamp === "number") {
      return timestamp;
    }

    if (typeof timestamp === "string") {
      const parsed = new Date(timestamp).getTime();
      return Number.isNaN(parsed) ? 0 : parsed;
    }

    if (
      typeof timestamp === "object" &&
      typeof timestamp.seconds === "number"
    ) {
      return timestamp.seconds * 1000;
    }

    return 0;
  }

  function formatOrderDate(timestamp) {
    const millis = getTimestampMillis(timestamp);

    if (!millis) {
      return "Date unavailable";
    }

    const date = new Date(millis);

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatOrderTime(timestamp) {
    const millis = getTimestampMillis(timestamp);

    if (!millis) {
      return "";
    }

    const date = new Date(millis);

    return date.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatCurrency(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return "₹0";
    }

    return `₹${number.toLocaleString("en-IN")}`;
  }

  function getShortOrderId(id) {
    if (!id) return "ORDER";

    return id.slice(-7).toUpperCase();
  }

  function normalizeStatus(status) {
    if (!status) return "new";

    return String(status)
      .trim()
      .toLowerCase()
      .replace(/[_-]/g, " ");
  }

  function getStatusInfo(status) {
    const normalized = normalizeStatus(status);

    if (
      normalized.includes("cancel") ||
      normalized.includes("failed") ||
      normalized.includes("reject")
    ) {
      return {
        label: "Cancelled",
        className: "status-cancelled",
        icon: <XCircle size={14} strokeWidth={2.2} />,
      };
    }

    if (
      normalized.includes("delivered") ||
      normalized.includes("complete")
    ) {
      return {
        label: "Delivered",
        className: "status-delivered",
        icon: <Check size={14} strokeWidth={2.4} />,
      };
    }

    if (
      normalized.includes("out for delivery") ||
      normalized.includes("outfordelivery") ||
      normalized.includes("on the way") ||
      normalized.includes("rider")
    ) {
      return {
        label: "On the way",
        className: "status-transit",
        icon: <Truck size={14} strokeWidth={2.2} />,
      };
    }

    if (
      normalized.includes("preparing") ||
      normalized.includes("accepted") ||
      normalized.includes("confirmed") ||
      normalized.includes("processing")
    ) {
      return {
        label:
          normalized.includes("preparing")
            ? "Preparing"
            : normalized.includes("accepted")
              ? "Accepted"
              : "Preparing",
        className: "status-preparing",
        icon: <Coffee size={14} strokeWidth={2.2} />,
      };
    }

    return {
      label: "New",
      className: "status-new",
      icon: <Clock3 size={14} strokeWidth={2.2} />,
    };
  }

  function getItemImage(item) {
    /*
     * Supports BOTH naming conventions used throughout Brewed.
     */
    return (
      item?.image ||
      item?.img ||
      item?.imageUrl ||
      item?.photoURL ||
      item?.photo ||
      ""
    );
  }

  function getItemQuantity(item) {
    const quantity = Number(item?.qty ?? item?.quantity ?? 1);

    return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
  }

  function getItemSize(item) {
    return (
      item?.size ||
      item?.selectedSize ||
      item?.variant ||
      ""
    );
  }

  function getItemPrice(item) {
    const price = Number(
      item?.price ??
        item?.finalPrice ??
        item?.unitPrice ??
        0
    );

    const quantity = getItemQuantity(item);

    return Number.isFinite(price) ? price * quantity : 0;
  }

  /*
   * ============================================================
   * REORDER
   * ============================================================
   */

  const handleReorder = async (event, order) => {
    event.stopPropagation();

    if (!order?.items?.length) {
      return;
    }

    try {
      setReorderingId(order.id);

      await reorder(order.items);

      /*
       * Keep the user on Orders instead of navigating away.
       * CartContext handles adding the items.
       */
    } catch (err) {
      console.error("Reorder failed:", err);
      alert("We couldn't add these items to your cart.");
    } finally {
      setReorderingId(null);
    }
  };

  /*
   * ============================================================
   * ORDER STATS
   * ============================================================
   */

  const orderCountLabel = useMemo(() => {
    if (orders.length === 0) {
      return "Your coffee journey starts here";
    }

    if (orders.length === 1) {
      return "1 order with Brewed";
    }

    return `${orders.length} orders with Brewed`;
  }, [orders.length]);

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap');

        .orders-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 15% 5%,
              rgba(196, 149, 106, 0.07),
              transparent 28%
            ),
            #faf6f0;
          color: #1a0b05;
          font-family: 'Inter', sans-serif;
          padding: 34px 20px 80px;
          box-sizing: border-box;
        }

        .orders-shell {
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
        }

        /* ======================================================
           HEADER
           ====================================================== */

        .orders-header {
          margin-bottom: 30px;
        }

        .orders-back {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 0;
          background: transparent;
          color: #76685f;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 600;
          padding: 6px 0;
          margin-bottom: 24px;
          cursor: pointer;
          transition:
            color 0.2s ease,
            transform 0.2s ease;
        }

        .orders-back:hover {
          color: #1a0b05;
          transform: translateX(-2px);
        }

        .orders-eyebrow {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #a58c79;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .orders-eyebrow-line {
          width: 24px;
          height: 1px;
          background: #c4956a;
        }

        .orders-title {
          margin: 0;
          color: #1a0b05;
          font-family: 'Playfair Display', serif;
          font-size: clamp(2.15rem, 6vw, 3.15rem);
          font-weight: 600;
          line-height: 1.05;
          letter-spacing: -0.035em;
        }

        .orders-subtitle {
          margin: 10px 0 0;
          color: #7c7068;
          font-size: 14px;
          line-height: 1.6;
        }

        /* ======================================================
           ORDER LIST
           ====================================================== */

        .orders-list {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        /* ======================================================
           ORDER CARD
           ====================================================== */

        .order-card {
          position: relative;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid rgba(93, 67, 48, 0.11);
          border-radius: 24px;
          box-shadow:
            0 8px 30px rgba(48, 31, 20, 0.045),
            0 2px 7px rgba(48, 31, 20, 0.025);
          cursor: pointer;
          transition:
            transform 0.22s ease,
            box-shadow 0.22s ease,
            border-color 0.22s ease;
        }

        .order-card::before {
          content: "";
          position: absolute;
          inset: 0 auto 0 0;
          width: 3px;
          background: linear-gradient(
            180deg,
            #c4956a,
            rgba(196, 149, 106, 0.15)
          );
          opacity: 0;
          transition: opacity 0.22s ease;
        }

        .order-card:hover {
          transform: translateY(-2px);
          border-color: rgba(196, 149, 106, 0.32);
          box-shadow:
            0 16px 38px rgba(48, 31, 20, 0.07),
            0 3px 10px rgba(48, 31, 20, 0.035);
        }

        .order-card:hover::before {
          opacity: 1;
        }

        .order-card-inner {
          padding: 22px 24px 20px;
        }

        /* ======================================================
           ORDER TOP
           ====================================================== */

        .order-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          padding-bottom: 17px;
          border-bottom: 1px solid #eee8e1;
        }

        .order-label {
          color: #a2968d;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          margin-bottom: 5px;
        }

        .order-number {
          color: #1a0b05;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.01em;
        }

        .order-date {
          margin-top: 5px;
          color: #91857d;
          font-size: 12px;
        }

        .order-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
          padding: 7px 11px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          line-height: 1;
          white-space: nowrap;
        }

        .status-new {
          background: #f2e9df;
          color: #725743;
        }

        .status-preparing {
          background: #fff3dc;
          color: #9a6818;
        }

        .status-transit {
          background: #eee8f5;
          color: #68517e;
        }

        .status-delivered {
          background: #e8f1e8;
          color: #527054;
        }

        .status-cancelled {
          background: #f8e7e3;
          color: #a04d3d;
        }

        /* ======================================================
           ITEMS
           ====================================================== */

        .order-items {
          padding: 5px 0;
        }

        .order-item {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 14px 0;
        }

        .order-item + .order-item {
          border-top: 1px solid #f2ede8;
        }

        .order-item-image-wrap {
          width: 66px;
          height: 66px;
          flex: 0 0 66px;
          overflow: hidden;
          border-radius: 17px;
          background: #f1e9df;
          border: 1px solid rgba(83, 57, 38, 0.07);
        }

        .order-item-image {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.25s ease;
        }

        .order-card:hover .order-item-image {
          transform: scale(1.035);
        }

        .order-item-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #a9907b;
          background:
            radial-gradient(
              circle at center,
              #f8f1e9 0%,
              #eee4d8 100%
            );
        }

        .order-item-content {
          min-width: 0;
          flex: 1;
        }

        .order-item-name {
          color: #2a1a10;
          font-family: 'Playfair Display', serif;
          font-size: 16px;
          font-weight: 600;
          line-height: 1.25;
          margin-bottom: 5px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .order-item-meta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
          color: #8c8077;
          font-size: 12px;
        }

        .order-item-dot {
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: #c7b9ac;
        }

        .order-item-price {
          flex-shrink: 0;
          color: #3a271b;
          font-size: 14px;
          font-weight: 700;
        }

        /* ======================================================
           BOTTOM
           ====================================================== */

        .order-bottom {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          padding-top: 17px;
          border-top: 1px solid #eee8e1;
        }

        .order-total-label {
          color: #a2968d;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          margin-bottom: 3px;
        }

        .order-total {
          color: #1a0b05;
          font-family: 'Playfair Display', serif;
          font-size: 23px;
          font-weight: 600;
          line-height: 1;
        }

        .reorder-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 108px;
          height: 40px;
          padding: 0 18px;
          border: 0;
          border-radius: 13px;
          background: #1a0b05;
          color: #fffaf5;
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.01em;
          cursor: pointer;
          box-shadow: 0 5px 14px rgba(26, 11, 5, 0.12);
          transition:
            background 0.2s ease,
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .reorder-btn:hover {
          background: #2a160d;
          transform: translateY(-1px);
          box-shadow: 0 7px 18px rgba(26, 11, 5, 0.16);
        }

        .reorder-btn:active {
          transform: translateY(0);
        }

        .reorder-btn:disabled {
          opacity: 0.6;
          cursor: wait;
          transform: none;
        }

        /* ======================================================
           LOADING
           ====================================================== */

        .orders-loading {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .order-skeleton {
          height: 270px;
          border-radius: 24px;
          background:
            linear-gradient(
              90deg,
              #f4eee7 25%,
              #faf7f2 50%,
              #f4eee7 75%
            );
          background-size: 200% 100%;
          animation: orderShimmer 1.5s infinite;
          border: 1px solid #eee6dd;
        }

        @keyframes orderShimmer {
          0% {
            background-position: 200% 0;
          }

          100% {
            background-position: -200% 0;
          }
        }

        /* ======================================================
           EMPTY / ERROR
           ====================================================== */

        .orders-state {
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(93, 67, 48, 0.10);
          border-radius: 24px;
          padding: 58px 25px;
          text-align: center;
          box-shadow: 0 8px 30px rgba(48, 31, 20, 0.04);
        }

        .orders-state-icon {
          width: 58px;
          height: 58px;
          margin: 0 auto 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 18px;
          background: #f1e8de;
          color: #94765f;
        }

        .orders-state-title {
          margin: 0;
          color: #2b1a10;
          font-family: 'Playfair Display', serif;
          font-size: 22px;
          font-weight: 600;
        }

        .orders-state-text {
          max-width: 400px;
          margin: 8px auto 0;
          color: #8b7e74;
          font-size: 13px;
          line-height: 1.6;
        }

        .orders-state-btn {
          margin-top: 22px;
          border: 0;
          border-radius: 12px;
          background: #1a0b05;
          color: white;
          padding: 11px 19px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        /* ======================================================
           MOBILE
           ====================================================== */

        @media (max-width: 640px) {
          .orders-page {
            padding: 25px 14px 60px;
          }

          .orders-header {
            margin-bottom: 22px;
          }

          .orders-back {
            margin-bottom: 19px;
          }

          .order-card {
            border-radius: 20px;
          }

          .order-card-inner {
            padding: 18px 17px 17px;
          }

          .order-top {
            gap: 10px;
          }

          .order-status {
            padding: 7px 9px;
            font-size: 10px;
          }

          .order-item-image-wrap {
            width: 58px;
            height: 58px;
            flex-basis: 58px;
            border-radius: 15px;
          }

          .order-item {
            gap: 12px;
            padding: 12px 0;
          }

          .order-item-name {
            font-size: 15px;
          }

          .order-item-price {
            font-size: 13px;
          }

          .order-bottom {
            align-items: center;
          }

          .order-total {
            font-size: 21px;
          }

          .reorder-btn {
            min-width: 96px;
            height: 38px;
            padding: 0 14px;
          }
        }

        @media (max-width: 390px) {
          .order-item-price {
            display: none;
          }

          .order-status {
            font-size: 0;
          }

          .order-status svg {
            width: 15px;
            height: 15px;
          }

          .reorder-btn {
            min-width: 90px;
          }
        }
      `}</style>

      <main className="orders-page">
        <div className="orders-shell">

          {/* ====================================================
              HEADER
          ==================================================== */}

          <header className="orders-header">

            <button
              type="button"
              className="orders-back"
              onClick={() => setPage("menu")}
            >
              <ArrowLeft size={16} strokeWidth={2} />
              Back to Menu
            </button>

            <div className="orders-eyebrow">
              <span className="orders-eyebrow-line" />
              Your Brewed Journey
            </div>

            <h1 className="orders-title">
              Orders
            </h1>

            <p className="orders-subtitle">
              {orderCountLabel}
            </p>

          </header>

          {/* ====================================================
              LOADING
          ==================================================== */}

          {loading && (
            <div className="orders-loading">
              <div className="order-skeleton" />
              <div className="order-skeleton" />
            </div>
          )}

          {/* ====================================================
              ERROR
          ==================================================== */}

          {!loading && error && (
            <div className="orders-state">

              <div className="orders-state-icon">
                <XCircle size={25} />
              </div>

              <h2 className="orders-state-title">
                Couldn't load your orders
              </h2>

              <p className="orders-state-text">
                {error}
              </p>

              <button
                type="button"
                className="orders-state-btn"
                onClick={() => window.location.reload()}
              >
                Try Again
              </button>

            </div>
          )}

          {/* ====================================================
              EMPTY
          ==================================================== */}

          {!loading && !error && orders.length === 0 && (
            <div className="orders-state">

              <div className="orders-state-icon">
                <ShoppingBag size={25} />
              </div>

              <h2 className="orders-state-title">
                No orders yet
              </h2>

              <p className="orders-state-text">
                Your favourite coffees, pastries and little
                Brewed moments will appear here once you place
                your first order.
              </p>

              <button
                type="button"
                className="orders-state-btn"
                onClick={() => setPage("menu")}
              >
                Explore the Menu
              </button>

            </div>
          )}

          {/* ====================================================
              ORDERS
          ==================================================== */}

          {!loading && !error && orders.length > 0 && (
            <div className="orders-list">

              {orders.map((order) => {
                const statusInfo = getStatusInfo(order.status);

                const items = Array.isArray(order.items)
                  ? order.items
                  : [];

                return (
                  <article
                    key={order.id}
                    className="order-card"
                    onClick={() => setPage("menu")}
                  >

                    <div className="order-card-inner">

                      {/* ================================
                          ORDER HEADER
                      ================================= */}

                      <div className="order-top">

                        <div>
                          <div className="order-label">
                            Order
                          </div>

                          <div className="order-number">
                            #{getShortOrderId(order.id)}
                          </div>

                          <div className="order-date">
                            {formatOrderDate(order.createdAt)}

                            {formatOrderTime(order.createdAt) && (
                              <>
                                {" "}•{" "}
                                {formatOrderTime(order.createdAt)}
                              </>
                            )}
                          </div>
                        </div>

                        <div
                          className={`order-status ${statusInfo.className}`}
                        >
                          {statusInfo.icon}
                          <span>
                            {statusInfo.label}
                          </span>
                        </div>

                      </div>

                      {/* ================================
                          ORDER ITEMS
                      ================================= */}

                      <div className="order-items">

                        {items.length > 0 ? (
                          items.map((item, index) => {

                            const imageSrc = getItemImage(item);
                            const quantity = getItemQuantity(item);
                            const size = getItemSize(item);
                            const price = getItemPrice(item);

                            return (
                              <div
                                className="order-item"
                                key={
                                  item?.id ||
                                  item?.menuItemId ||
                                  item?.rewardId ||
                                  `${order.id}-${index}`
                                }
                              >

                                {/* IMAGE */}

                                <div className="order-item-image-wrap">

                                  {imageSrc ? (
                                    <img
                                      className="order-item-image"
                                      src={imageSrc}
                                      alt={item?.name || "Brewed item"}
                                      loading="lazy"
                                      onError={(event) => {
                                        /*
                                         * Prevent an infinite
                                         * broken-image loop.
                                         */
                                        event.currentTarget.style.display =
                                          "none";

                                        const parent =
                                          event.currentTarget.parentElement;

                                        if (
                                          parent &&
                                          !parent.querySelector(
                                            ".order-item-placeholder"
                                          )
                                        ) {
                                          const fallback =
                                            document.createElement("div");

                                          fallback.className =
                                            "order-item-placeholder";

                                          fallback.innerHTML =
                                            `<span aria-hidden="true">☕</span>`;

                                          parent.appendChild(fallback);
                                        }
                                      }}
                                    />
                                  ) : (
                                    <div className="order-item-placeholder">
                                      <Coffee
                                        size={23}
                                        strokeWidth={1.7}
                                      />
                                    </div>
                                  )}

                                </div>

                                {/* CONTENT */}

                                <div className="order-item-content">

                                  <div className="order-item-name">
                                    {item?.name || "Brewed Item"}
                                  </div>

                                  <div className="order-item-meta">

                                    <span>
                                      {quantity} ×
                                    </span>

                                    {size && (
                                      <>
                                        <span className="order-item-dot" />
                                        <span>
                                          {size}
                                        </span>
                                      </>
                                    )}

                                  </div>

                                </div>

                                {/* PRICE */}

                                <div className="order-item-price">
                                  {formatCurrency(price)}
                                </div>

                              </div>
                            );
                          })
                        ) : (
                          <div className="order-item">
                            <div className="order-item-image-wrap">
                              <div className="order-item-placeholder">
                                <Coffee size={23} />
                              </div>
                            </div>

                            <div className="order-item-content">
                              <div className="order-item-name">
                                Brewed Order
                              </div>

                              <div className="order-item-meta">
                                Order details unavailable
                              </div>
                            </div>
                          </div>
                        )}

                      </div>

                      {/* ================================
                          TOTAL + REORDER
                      ================================= */}

                      <div className="order-bottom">

                        <div>
                          <div className="order-total-label">
                            Total
                          </div>

                          <div className="order-total">
                            {formatCurrency(order.total)}
                          </div>
                        </div>

                        <button
                          type="button"
                          className="reorder-btn"
                          disabled={reorderingId === order.id}
                          onClick={(event) =>
                            handleReorder(event, order)
                          }
                        >
                          {reorderingId === order.id
                            ? "Adding..."
                            : "Reorder"}
                        </button>

                      </div>

                    </div>

                  </article>
                );
              })}

            </div>
          )}

        </div>
      </main>
    </>
  );
}
