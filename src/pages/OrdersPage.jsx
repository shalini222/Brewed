import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import {
  ArrowLeft,
  CheckCircle2,
  ChefHat,
  Clock3,
  PackageCheck,
  ShoppingBag,
  Truck,
  XCircle,
} from "lucide-react";

import { auth, db } from "../firebase";
import { useCart } from "../context/CartContext";

export default function OrdersPage({ setPage, product }) {
  const { reorder } = useCart();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /*
  ============================================================
  STATUS CONFIG
  ============================================================
  */

  const getStatusConfig = (status) => {
    const normalized = String(status || "New")
      .trim()
      .toLowerCase();

    if (
      normalized.includes("deliver") ||
      normalized === "completed"
    ) {
      return {
        label: "Delivered",
        className: "status-delivered",
        icon: <CheckCircle2 size={15} strokeWidth={2} />,
      };
    }

    if (
      normalized.includes("out for delivery") ||
      normalized.includes("out_for_delivery")
    ) {
      return {
        label: "Out for delivery",
        className: "status-delivery",
        icon: <Truck size={15} strokeWidth={2} />,
      };
    }

    if (
      normalized.includes("prepar") ||
      normalized.includes("accepted") ||
      normalized.includes("processing")
    ) {
      return {
        label:
          normalized.includes("accepted")
            ? "Accepted"
            : "Preparing",
        className: "status-preparing",
        icon: <ChefHat size={15} strokeWidth={2} />,
      };
    }

    if (
      normalized.includes("cancel") ||
      normalized.includes("reject") ||
      normalized.includes("failed")
    ) {
      return {
        label: "Cancelled",
        className: "status-cancelled",
        icon: <XCircle size={15} strokeWidth={2} />,
      };
    }

    return {
      label:
        status && String(status).trim()
          ? String(status)
          : "New",
      className: "status-new",
      icon: <Clock3 size={15} strokeWidth={2} />,
    };
  };

  /*
  ============================================================
  DATE HELPERS
  ============================================================
  */

  const getTimestampValue = (timestamp) => {
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

    if (typeof timestamp === "string") {
      const parsed = new Date(timestamp).getTime();
      return Number.isNaN(parsed) ? 0 : parsed;
    }

    return 0;
  };

  const formatOrderDate = (timestamp) => {
    const milliseconds = getTimestampValue(timestamp);

    if (!milliseconds) {
      return "Date unavailable";
    }

    const date = new Date(milliseconds);

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatOrderTime = (timestamp) => {
    const milliseconds = getTimestampValue(timestamp);

    if (!milliseconds) {
      return "";
    }

    return new Date(milliseconds).toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  /*
  ============================================================
  IMAGE HANDLING
  ============================================================
  */

  const getItemImage = (item) => {
    if (!item) return "";

    return (
      item.image ||
      item.img ||
      item.imageUrl ||
      item.photoURL ||
      item.photo ||
      ""
    );
  };

  const handleImageError = (event) => {
    const img = event.currentTarget;

    if (img.dataset.fallbackApplied === "true") {
      return;
    }

    img.dataset.fallbackApplied = "true";

    img.src =
      "data:image/svg+xml;charset=UTF-8," +
      encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
          <rect width="160" height="160" rx="24" fill="#F1E9DE"/>
          <circle cx="80" cy="65" r="24" fill="#D4B08B"/>
          <path d="M48 112c8-20 20-30 32-30s24 10 32 30" fill="none" stroke="#5A3A24" stroke-width="7" stroke-linecap="round"/>
          <path d="M63 48c-5-11 1-19 9-24" fill="none" stroke="#8B684B" stroke-width="4" stroke-linecap="round"/>
          <path d="M80 48c-5-11 1-19 9-24" fill="none" stroke="#8B684B" stroke-width="4" stroke-linecap="round"/>
        </svg>
      `);
  };

  /*
  ============================================================
  LOAD USER ORDERS
  ============================================================

  IMPORTANT:
  We deliberately do NOT use orderBy().
  This avoids the Firestore index problem.

  We sort locally after receiving the orders.
  ============================================================
  */

  useEffect(() => {
    let unsubscribeOrders = null;
    let unsubscribeAuth = null;

    setLoading(true);
    setError("");

    unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (unsubscribeOrders) {
        unsubscribeOrders();
        unsubscribeOrders = null;
      }

      if (!user) {
        setOrders([]);
        setLoading(false);
        return;
      }

      try {
        const ordersQuery = query(
          collection(db, "orders"),
          where("userId", "==", user.uid)
        );

        unsubscribeOrders = onSnapshot(
          ordersQuery,
          (snapshot) => {
            const fetchedOrders = snapshot.docs
              .map((document) => ({
                id: document.id,
                ...document.data(),
              }))
              .sort((a, b) => {
                return (
                  getTimestampValue(b.createdAt) -
                  getTimestampValue(a.createdAt)
                );
              });

            setOrders(fetchedOrders);
            setLoading(false);
            setError("");
          },
          (snapshotError) => {
            console.error(
              "ORDERS SNAPSHOT ERROR:",
              snapshotError
            );

            setError(
              "We couldn't load your orders right now."
            );

            setOrders([]);
            setLoading(false);
          }
        );
      } catch (err) {
        console.error("ORDERS QUERY ERROR:", err);

        setError(
          "We couldn't load your orders right now."
        );

        setOrders([]);
        setLoading(false);
      }
    });

    return () => {
      if (unsubscribeOrders) {
        unsubscribeOrders();
      }

      if (unsubscribeAuth) {
        unsubscribeAuth();
      }
    };
  }, []);

  /*
  ============================================================
  NAVIGATION
  ============================================================
  */

  const goToMenu = () => {
    setPage("menu");
  };

  /*
  IMPORTANT:
  Only item rows call this.
  The order card itself has NO onClick.
  */

  const openItem = (item) => {
    if (!item) return;

    /*
      Your App navigation convention is:

      setPage("product", item)

      so ProductPage receives the selected menu item.
    */

    setPage("product", item);
  };

  /*
  ============================================================
  ORDER COUNT
  ============================================================
  */

  const orderCountText = useMemo(() => {
    if (orders.length === 0) {
      return "Your little history of coffee, bites and moments.";
    }

    return `${orders.length} ${
      orders.length === 1 ? "order" : "orders"
    } · Every cup, bite and moment you've enjoyed with Brewed.`;
  }, [orders.length]);

  return (
    <>
      <style>{`
        /* =====================================================
           PAGE
        ===================================================== */

        .orders-page {
          min-height: 100vh;
          width: 100%;
          background:
            radial-gradient(
              circle at 92% 8%,
              rgba(205, 178, 146, 0.13),
              transparent 24%
            ),
            linear-gradient(
              180deg,
              #fbf7f0 0%,
              #f8f1e7 100%
            );
          color: #24150d;
          box-sizing: border-box;
          padding: 42px 22px 80px;
        }

        .orders-page *,
        .orders-page *::before,
        .orders-page *::after {
          box-sizing: border-box;
        }

        .orders-shell {
          width: 100%;
          max-width: 940px;
          margin: 0 auto;
          position: relative;
        }

        /* =====================================================
           TOP NAV
        ===================================================== */

        .orders-back {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          border: none;
          background: transparent;
          color: #5e4735;
          padding: 7px 0;
          margin: 0 0 38px;
          font-family: "Inter", sans-serif;
          font-size: 0.96rem;
          font-weight: 500;
          cursor: pointer;
          transition:
            color 180ms ease,
            transform 180ms ease;
        }

        .orders-back:hover {
          color: #24150d;
          transform: translateX(-2px);
        }

        .orders-back svg {
          flex-shrink: 0;
        }

        /* =====================================================
           HERO
        ===================================================== */

        .orders-hero {
          margin-bottom: 42px;
          position: relative;
        }

        .orders-eyebrow {
          margin: 0 0 10px;
          color: #92775c;
          font-family: "Inter", sans-serif;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .orders-title {
          margin: 0;
          color: #24150d;
          font-family: "Playfair Display", Georgia, serif;
          font-size: clamp(3.2rem, 8vw, 5.6rem);
          font-weight: 400;
          letter-spacing: -0.045em;
          line-height: 0.98;
        }

        .orders-subtitle {
          max-width: 610px;
          margin: 20px 0 0;
          color: #705f50;
          font-family: "Inter", sans-serif;
          font-size: 1.02rem;
          line-height: 1.75;
        }

        /* subtle decorative corner */
        .orders-decoration {
          position: absolute;
          top: -18px;
          right: 15px;
          width: 115px;
          height: 115px;
          pointer-events: none;
          opacity: 0.55;
        }

        .orders-decoration::before,
        .orders-decoration::after {
          content: "";
          position: absolute;
          border-radius: 100%;
          border: 1px solid rgba(151, 122, 92, 0.22);
          transform: rotate(25deg);
        }

        .orders-decoration::before {
          width: 75px;
          height: 120px;
          right: 0;
          top: -5px;
        }

        .orders-decoration::after {
          width: 50px;
          height: 95px;
          right: 38px;
          top: 12px;
          transform: rotate(-22deg);
        }

        /* =====================================================
           LOADING
        ===================================================== */

        .orders-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 300px;
          padding: 40px;
          background: rgba(255,255,255,0.72);
          border: 1px solid #e7ddd0;
          border-radius: 28px;
        }

        .loading-cup {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          border: 2px solid #ded1c2;
          border-top-color: #5b321b;
          animation: brewedSpin 900ms linear infinite;
          margin-bottom: 18px;
        }

        .orders-loading p {
          margin: 0;
          color: #79695b;
          font-family: "Inter", sans-serif;
          font-size: 0.92rem;
        }

        @keyframes brewedSpin {
          to {
            transform: rotate(360deg);
          }
        }

        /* =====================================================
           ERROR
        ===================================================== */

        .orders-error {
          padding: 28px;
          background: #fff;
          border: 1px solid #eadfd3;
          border-radius: 24px;
          color: #70594b;
          text-align: center;
          font-family: "Inter", sans-serif;
        }

        .orders-error strong {
          display: block;
          margin-bottom: 7px;
          color: #321d12;
          font-family: "Playfair Display", Georgia, serif;
          font-size: 1.4rem;
          font-weight: 500;
        }

        /* =====================================================
           EMPTY
        ===================================================== */

        .orders-empty {
          text-align: center;
          padding: 75px 30px;
          background: rgba(255,255,255,0.76);
          border: 1px solid #e5dbcf;
          border-radius: 30px;
          box-shadow: 0 18px 50px rgba(60, 37, 20, 0.05);
        }

        .empty-icon {
          width: 62px;
          height: 62px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          border-radius: 50%;
          background: #f1e7da;
          color: #5c3b24;
        }

        .orders-empty h2 {
          margin: 0 0 8px;
          font-family: "Playfair Display", Georgia, serif;
          font-size: 2rem;
          font-weight: 500;
          color: #2b190f;
        }

        .orders-empty p {
          margin: 0 auto 25px;
          max-width: 420px;
          color: #79695c;
          line-height: 1.6;
          font-family: "Inter", sans-serif;
        }

        .empty-menu-btn {
          border: none;
          background: #28150b;
          color: #fffaf4;
          padding: 13px 23px;
          border-radius: 13px;
          font-family: "Inter", sans-serif;
          font-weight: 650;
          cursor: pointer;
          transition:
            transform 180ms ease,
            box-shadow 180ms ease;
        }

        .empty-menu-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(40, 21, 11, 0.16);
        }

        /* =====================================================
           ORDER LIST
        ===================================================== */

        .orders-list {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        /* =====================================================
           ORDER CARD
        ===================================================== */

        .order-card {
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid #e5ddd3;
          border-radius: 28px;
          padding: 28px 30px 24px;
          box-shadow:
            0 12px 38px rgba(55, 34, 20, 0.055),
            0 2px 7px rgba(55, 34, 20, 0.025);
          transition:
            box-shadow 220ms ease,
            transform 220ms ease,
            border-color 220ms ease;
        }

        .order-card:hover {
          transform: translateY(-2px);
          border-color: #ded2c4;
          box-shadow:
            0 18px 48px rgba(55, 34, 20, 0.075),
            0 3px 10px rgba(55, 34, 20, 0.035);
        }

        /* =====================================================
           ORDER HEADER
        ===================================================== */

        .order-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          padding-bottom: 22px;
          border-bottom: 1px solid #eee7df;
        }

        .order-label {
          margin: 0 0 7px;
          color: #9a8978;
          font-family: "Inter", sans-serif;
          font-size: 0.74rem;
          font-weight: 750;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }

        .order-number {
          margin: 0;
          color: #29170d;
          font-family: "Inter", sans-serif;
          font-size: 1.02rem;
          font-weight: 750;
          letter-spacing: 0.01em;
        }

        .order-date {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-top: 7px;
          color: #8b7a6b;
          font-family: "Inter", sans-serif;
          font-size: 0.84rem;
        }

        .order-date-dot {
          opacity: 0.55;
        }

        /* =====================================================
           STATUS
        ===================================================== */

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          flex-shrink: 0;
          padding: 9px 13px;
          border-radius: 999px;
          font-family: "Inter", sans-serif;
          font-size: 0.78rem;
          font-weight: 650;
          white-space: nowrap;
        }

        .status-new {
          background: #f2e9df;
          color: #684b34;
        }

        .status-preparing {
          background: #f5eadb;
          color: #805629;
        }

        .status-delivery {
          background: #e9efe8;
          color: #496348;
        }

        .status-delivered {
          background: #edf1df;
          color: #4d6238;
        }

        .status-cancelled {
          background: #f7e7e2;
          color: #a04f3e;
        }

        /* =====================================================
           ITEMS
        ===================================================== */

        .order-items {
          padding: 4px 0;
        }

        .order-item {
          display: flex;
          align-items: center;
          gap: 18px;
          min-height: 98px;
          padding: 18px 0;
          border: none;
          background: transparent;
          width: 100%;
          text-align: left;
          cursor: pointer;
          border-radius: 16px;
          transition:
            background 180ms ease,
            padding 180ms ease;
        }

        /*
          ONLY THE ITEM is clickable.
          The order-card has no click handler.
        */

        .order-item:hover {
          background: #fcf9f5;
          padding-left: 10px;
          padding-right: 10px;
        }

        .order-item:focus-visible {
          outline: 2px solid #c4956a;
          outline-offset: 3px;
        }

        .item-image-wrap {
          width: 88px;
          height: 88px;
          flex: 0 0 88px;
          overflow: hidden;
          border-radius: 19px;
          background: #f0e7dc;
          box-shadow:
            inset 0 0 0 1px rgba(89, 58, 35, 0.05);
        }

        .item-image {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          transition: transform 280ms ease;
        }

        .order-item:hover .item-image {
          transform: scale(1.045);
        }

        .item-info {
          min-width: 0;
          flex: 1;
          padding-right: 12px;
        }

        .item-name {
          margin: 0 0 7px;
          color: #2b190f;
          font-family: "Playfair Display", Georgia, serif;
          font-size: 1.28rem;
          font-weight: 500;
          line-height: 1.2;
        }

        .item-meta {
          margin: 0;
          color: #87776a;
          font-family: "Inter", sans-serif;
          font-size: 0.84rem;
          line-height: 1.5;
        }

        .item-price {
          flex-shrink: 0;
          color: #3b271b;
          font-family: "Inter", sans-serif;
          font-size: 0.98rem;
          font-weight: 700;
          text-align: right;
        }

        .item-divider {
          height: 1px;
          background: #f0eae3;
        }

        /* =====================================================
           ORDER FOOTER
        ===================================================== */

        .order-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding-top: 20px;
          margin-top: 2px;
          border-top: 1px solid #eee7df;
        }

        .total-block {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .total-label {
          color: #998879;
          font-family: "Inter", sans-serif;
          font-size: 0.72rem;
          font-weight: 750;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .total-value {
          color: #29170d;
          font-family: "Playfair Display", Georgia, serif;
          font-size: 1.65rem;
          font-weight: 600;
          line-height: 1;
        }

        /* =====================================================
           REORDER
        ===================================================== */

        .reorder-btn {
          flex-shrink: 0;
          min-width: 116px;
          border: none;
          background: #29160b;
          color: #fffaf5;
          padding: 13px 20px;
          border-radius: 13px;
          font-family: "Inter", sans-serif;
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          transition:
            transform 180ms ease,
            background 180ms ease,
            box-shadow 180ms ease;
        }

        .reorder-btn:hover {
          background: #3a2112;
          transform: translateY(-2px);
          box-shadow: 0 9px 22px rgba(41, 22, 11, 0.16);
        }

        .reorder-btn:active {
          transform: translateY(0);
        }

        /* =====================================================
           MOBILE
        ===================================================== */

        @media (max-width: 700px) {
          .orders-page {
            padding: 28px 14px 55px;
          }

          .orders-back {
            margin-bottom: 30px;
          }

          .orders-hero {
            margin-bottom: 30px;
          }

          .orders-title {
            font-size: clamp(2.9rem, 15vw, 4.2rem);
          }

          .orders-subtitle {
            font-size: 0.91rem;
            line-height: 1.65;
          }

          .orders-decoration {
            display: none;
          }

          .orders-list {
            gap: 17px;
          }

          .order-card {
            padding: 21px 18px 19px;
            border-radius: 23px;
          }

          .order-header {
            padding-bottom: 17px;
          }

          .status-pill {
            padding: 8px 10px;
            font-size: 0.72rem;
          }

          .order-date {
            font-size: 0.77rem;
          }

          .order-item {
            gap: 13px;
            min-height: 82px;
            padding: 14px 0;
          }

          .item-image-wrap {
            width: 70px;
            height: 70px;
            flex-basis: 70px;
            border-radius: 15px;
          }

          .item-name {
            font-size: 1.08rem;
            margin-bottom: 5px;
          }

          .item-meta {
            font-size: 0.76rem;
          }

          .item-price {
            font-size: 0.88rem;
          }

          .order-footer {
            padding-top: 17px;
          }

          .total-value {
            font-size: 1.42rem;
          }

          .reorder-btn {
            min-width: 104px;
            padding: 12px 15px;
          }
        }

        @media (max-width: 450px) {
          .order-header {
            gap: 10px;
          }

          .status-pill span {
            display: none;
          }

          .status-pill {
            width: 34px;
            height: 34px;
            padding: 0;
            justify-content: center;
          }

          .item-image-wrap {
            width: 64px;
            height: 64px;
            flex-basis: 64px;
          }

          .item-info {
            padding-right: 3px;
          }

          .item-name {
            font-size: 1rem;
          }

          .item-price {
            font-size: 0.8rem;
          }

          .order-footer {
            align-items: flex-end;
          }

          .reorder-btn {
            min-width: 96px;
            font-size: 0.8rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .orders-page *,
          .orders-page *::before,
          .orders-page *::after {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      <main className="orders-page">
        <div className="orders-shell">

          {/* ==================================================
              BACK
          ================================================== */}

          <button
            type="button"
            className="orders-back"
            onClick={goToMenu}
          >
            <ArrowLeft size={19} strokeWidth={1.8} />
            <span>Back to Menu</span>
          </button>

          {/* ==================================================
              HERO
          ================================================== */}

          <header className="orders-hero">
            <div className="orders-decoration" />

            <p className="orders-eyebrow">
              Your Orders
            </p>

            <h1 className="orders-title">
              Order Journey
            </h1>

            <p className="orders-subtitle">
              {orderCountText}
            </p>
          </header>

          {/* ==================================================
              LOADING
          ================================================== */}

          {loading && (
            <div className="orders-loading">
              <div className="loading-cup" />
              <p>
                Brewing your order history...
              </p>
            </div>
          )}

          {/* ==================================================
              ERROR
          ================================================== */}

          {!loading && error && (
            <div className="orders-error">
              <strong>
                Couldn't load your orders
              </strong>

              {error}
            </div>
          )}

          {/* ==================================================
              EMPTY
          ================================================== */}

          {!loading &&
            !error &&
            orders.length === 0 && (
              <div className="orders-empty">
                <div className="empty-icon">
                  <ShoppingBag
                    size={27}
                    strokeWidth={1.6}
                  />
                </div>

                <h2>
                  No orders yet
                </h2>

                <p>
                  Your Brewed journey is waiting.
                  Find something lovely on the menu
                  and your first order will appear here.
                </p>

                <button
                  type="button"
                  className="empty-menu-btn"
                  onClick={goToMenu}
                >
                  Explore Menu
                </button>
              </div>
            )}

          {/* ==================================================
              ORDERS
          ================================================== */}

          {!loading &&
            !error &&
            orders.length > 0 && (
              <section className="orders-list">

                {orders.map((order) => {
                  const status =
                    getStatusConfig(order.status);

                  const items = Array.isArray(order.items)
                    ? order.items
                    : [];

                  return (
                    <article
                      className="order-card"
                      key={order.id}
                    >

                      {/* ======================================
                          HEADER
                      ====================================== */}

                      <div className="order-header">
                        <div>
                          <p className="order-label">
                            Order
                          </p>

                          <h2 className="order-number">
                            #
                            {String(order.id)
                              .slice(-8)
                              .toUpperCase()}
                          </h2>

                          <div className="order-date">
                            <span>
                              {formatOrderDate(
                                order.createdAt
                              )}
                            </span>

                            {formatOrderTime(
                              order.createdAt
                            ) && (
                              <>
                                <span className="order-date-dot">
                                  •
                                </span>

                                <span>
                                  {formatOrderTime(
                                    order.createdAt
                                  )}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div
                          className={`status-pill ${status.className}`}
                        >
                          {status.icon}

                          <span>
                            {status.label}
                          </span>
                        </div>
                      </div>

                      {/* ======================================
                          ITEMS

                          ONLY THESE ROWS ARE CLICKABLE.
                      ====================================== */}

                      <div className="order-items">
                        {items.length > 0 ? (
                          items.map((item, index) => {
                            const image =
                              getItemImage(item);

                            const quantity =
                              Number(item.qty) ||
                              Number(item.quantity) ||
                              1;

                            const size =
                              item.size ||
                              item.variant ||
                              item.selectedSize ||
                              "";

                            const price =
                              Number(item.price) || 0;

                            return (
                              <React.Fragment
                                key={
                                  item.id ||
                                  item.firestoreId ||
                                  item.menuItemId ||
                                  index
                                }
                              >

                                <button
                                  type="button"
                                  className="order-item"
                                  onClick={() =>
                                    openItem(item)
                                  }
                                  aria-label={`View ${item.name || "menu item"}`}
                                >

                                  <div className="item-image-wrap">
                                    <img
                                      className="item-image"
                                      src={image}
                                      alt={
                                        item.name ||
                                        "Brewed menu item"
                                      }
                                      onError={
                                        handleImageError
                                      }
                                    />
                                  </div>

                                  <div className="item-info">
                                    <h3 className="item-name">
                                      {item.name ||
                                        "Brewed item"}
                                    </h3>

                                    <p className="item-meta">
                                      {quantity} ×{" "}
                                      {size ||
                                        "Regular"}
                                    </p>
                                  </div>

                                  <div className="item-price">
                                    ₹
                                    {(
                                      price *
                                      quantity
                                    ).toLocaleString(
                                      "en-IN"
                                    )}
                                  </div>

                                </button>

                                {index <
                                  items.length - 1 && (
                                  <div className="item-divider" />
                                )}

                              </React.Fragment>
                            );
                          })
                        ) : (
                          <div
                            style={{
                              padding:
                                "24px 0",
                              color: "#89786a",
                              fontFamily:
                                '"Inter", sans-serif',
                              fontSize:
                                "0.9rem",
                            }}
                          >
                            Order items unavailable.
                          </div>
                        )}
                      </div>

                      {/* ======================================
                          FOOTER
                      ====================================== */}

                      <div className="order-footer">

                        <div className="total-block">
                          <span className="total-label">
                            Total
                          </span>

                          <span className="total-value">
                            ₹
                            {(
                              Number(order.total) ||
                              0
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </span>
                        </div>

                        <button
                          type="button"
                          className="reorder-btn"
                          onClick={(event) => {
                            event.stopPropagation();

                            if (
                              items.length > 0
                            ) {
                              reorder(items);
                            }
                          }}
                        >
                          Reorder
                        </button>

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
