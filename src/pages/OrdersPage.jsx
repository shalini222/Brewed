import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import {
  ArrowLeft,
  ArrowRight,
  Coffee,
  Package,
  RefreshCw,
  Clock3,
  CheckCircle2,
  Truck,
  XCircle,
  CircleDot,
  Loader2,
  ShoppingBag,
} from "lucide-react";

import { db, auth } from "../firebase";
import { useCart } from "../context/CartContext";

export default function OrdersPage({ setPage }) {
  const { reorder } = useCart();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /*
   * ------------------------------------------------------------
   * STATUS CONFIG
   * ------------------------------------------------------------
   */

  const getStatusConfig = (status) => {
    const normalized = String(status || "New")
      .trim()
      .toLowerCase();

    if (
      normalized.includes("deliver") &&
      !normalized.includes("out")
    ) {
      return {
        label: "Delivered",
        className: "status-delivered",
        icon: <CheckCircle2 size={15} strokeWidth={2.2} />,
      };
    }

    if (
      normalized.includes("out for delivery") ||
      normalized === "outfordelivery"
    ) {
      return {
        label: "Out for Delivery",
        className: "status-delivery",
        icon: <Truck size={15} strokeWidth={2.2} />,
      };
    }

    if (
      normalized.includes("prepar") ||
      normalized.includes("processing") ||
      normalized.includes("accepted")
    ) {
      return {
        label:
          normalized.includes("accepted")
            ? "Accepted"
            : "Preparing",
        className: "status-preparing",
        icon: <Clock3 size={15} strokeWidth={2.2} />,
      };
    }

    if (
      normalized.includes("cancel") ||
      normalized.includes("failed") ||
      normalized.includes("reject")
    ) {
      return {
        label: "Cancelled",
        className: "status-cancelled",
        icon: <XCircle size={15} strokeWidth={2.2} />,
      };
    }

    if (
      normalized.includes("assign")
    ) {
      return {
        label: "Rider Assigned",
        className: "status-assigned",
        icon: <CircleDot size={15} strokeWidth={2.2} />,
      };
    }

    return {
      label: "New",
      className: "status-new",
      icon: <Package size={15} strokeWidth={2.2} />,
    };
  };

  /*
   * ------------------------------------------------------------
   * DATE HELPERS
   * ------------------------------------------------------------
   */

  const getTimestampMillis = (timestamp) => {
    if (!timestamp) return 0;

    if (
      typeof timestamp.toMillis === "function"
    ) {
      return timestamp.toMillis();
    }

    if (
      typeof timestamp.toDate === "function"
    ) {
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

  const formatDate = (timestamp) => {
    const millis = getTimestampMillis(timestamp);

    if (!millis) {
      return "Date unavailable";
    }

    try {
      return new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(millis));
    } catch {
      return "Date unavailable";
    }
  };

  const formatTime = (timestamp) => {
    const millis = getTimestampMillis(timestamp);

    if (!millis) return "";

    try {
      return new Intl.DateTimeFormat("en-IN", {
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(millis));
    } catch {
      return "";
    }
  };

  /*
   * ------------------------------------------------------------
   * IMAGE HANDLING
   * ------------------------------------------------------------
   */

  const getItemImage = (item) => {
    if (!item) return "";

    return (
      item.image ||
      item.img ||
      item.imageUrl ||
      item.imageURL ||
      item.photoURL ||
      item.photo ||
      item.thumbnail ||
      ""
    );
  };

  const handleImageError = (event) => {
    const image = event.currentTarget;

    if (image.dataset.fallbackApplied === "true") {
      return;
    }

    image.dataset.fallbackApplied = "true";

    /*
     * Hide broken remote image and show our CSS fallback.
     */
    image.style.display = "none";

    const fallback = image.parentElement?.querySelector(
      ".image-fallback"
    );

    if (fallback) {
      fallback.style.display = "flex";
    }
  };

  /*
   * ------------------------------------------------------------
   * LOAD USER ORDERS
   * ------------------------------------------------------------
   *
   * IMPORTANT:
   * We intentionally DO NOT use orderBy().
   *
   * This prevents the Firestore index requirement.
   *
   * Orders are sorted client-side below.
   * ------------------------------------------------------------
   */

  useEffect(() => {
    let unsubscribe = null;

    const setupOrdersListener = () => {
      const user = auth.currentUser;

      if (!user) {
        setOrders([]);
        setLoading(false);
        setError("Please log in to view your orders.");
        return;
      }

      setLoading(true);
      setError("");

      /*
       * Only filter by userId.
       * No orderBy = no index requirement.
       */
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
           * Client-side sorting.
           *
           * Newest order first.
           */
          fetchedOrders.sort((a, b) => {
            return (
              getTimestampMillis(b.createdAt) -
              getTimestampMillis(a.createdAt)
            );
          });

          setOrders(fetchedOrders);
          setLoading(false);
          setError("");
        },
        (snapshotError) => {
          console.error(
            "🔥 ORDERS LISTENER ERROR:",
            snapshotError
          );

          setOrders([]);
          setLoading(false);

          if (
            snapshotError?.code ===
            "permission-denied"
          ) {
            setError(
              "You don't have permission to view these orders."
            );
          } else {
            setError(
              "Couldn't load your orders. Please try again."
            );
          }
        }
      );
    };

    /*
     * Auth may not be immediately available.
     */
    const unsubscribeAuth =
      auth.onAuthStateChanged(() => {
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }

        setupOrdersListener();
      });

    return () => {
      unsubscribeAuth();

      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  /*
   * ------------------------------------------------------------
   * ORDER STATS
   * ------------------------------------------------------------
   */

  const orderStats = useMemo(() => {
    const delivered = orders.filter((order) => {
      const status = String(
        order.status || ""
      ).toLowerCase();

      return (
        status.includes("deliver") &&
        !status.includes("out")
      );
    }).length;

    const active = orders.filter((order) => {
      const status = String(
        order.status || ""
      ).toLowerCase();

      return (
        !status.includes("deliver") &&
        !status.includes("cancel") &&
        !status.includes("failed")
      );
    }).length;

    return {
      total: orders.length,
      delivered,
      active,
    };
  }, [orders]);

  /*
   * ------------------------------------------------------------
   * NAVIGATION
   * ------------------------------------------------------------
   */

  const goToMenu = () => {
    setPage("menu");
  };

  /*
   * ------------------------------------------------------------
   * REORDER
   * ------------------------------------------------------------
   */

  const handleReorder = async (
    event,
    items
  ) => {
    event.stopPropagation();

    if (!items || !Array.isArray(items)) {
      return;
    }

    try {
      await reorder(items);
      setPage("cart");
    } catch (err) {
      console.error(
        "🔥 REORDER ERROR:",
        err
      );

      alert(
        "We couldn't add this order to your cart. Please try again."
      );
    }
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
              circle at top left,
              rgba(196,149,106,0.08),
              transparent 30%
            ),
            #FAF6F0;
          padding: 42px 20px 80px;
          box-sizing: border-box;
          color: #1A0B05;
        }

        .orders-container {
          width: 100%;
          max-width: 850px;
          margin: 0 auto;
        }

        /* -------------------------------------------------- */
        /* HEADER */
        /* -------------------------------------------------- */

        .orders-back {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: none;
          background: transparent;
          color: #70645C;
          font-size: 0.9rem;
          font-weight: 600;
          padding: 7px 0;
          cursor: pointer;
          transition: color 0.2s ease;
        }

        .orders-back:hover {
          color: #1A0B05;
        }

        .orders-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          margin-top: 18px;
          margin-bottom: 28px;
        }

        .orders-heading {
          margin: 0;
          font-family: 'Playfair Display', serif;
          font-size: clamp(2.1rem, 5vw, 3rem);
          font-weight: 500;
          line-height: 1.05;
          letter-spacing: -0.025em;
          color: #1A0B05;
        }

        .orders-subtitle {
          margin: 9px 0 0;
          color: #81756D;
          font-size: 0.94rem;
          line-height: 1.5;
        }

        /* -------------------------------------------------- */
        /* STATS */
        /* -------------------------------------------------- */

        .orders-stats {
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
        }

        .orders-stat {
          min-width: 72px;
          padding: 10px 13px;
          background: rgba(255,255,255,0.72);
          border: 1px solid #E6DFD5;
          border-radius: 13px;
          text-align: center;
          box-sizing: border-box;
        }

        .orders-stat-number {
          display: block;
          font-size: 1rem;
          font-weight: 800;
          color: #1A0B05;
        }

        .orders-stat-label {
          display: block;
          margin-top: 2px;
          font-size: 0.67rem;
          color: #8B7D74;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 700;
        }

        /* -------------------------------------------------- */
        /* ORDER CARD */
        /* -------------------------------------------------- */

        .order-card {
          background: rgba(255,255,255,0.94);
          border: 1px solid #E6DFD5;
          border-radius: 22px;
          margin-bottom: 16px;
          padding: 20px;
          box-shadow:
            0 8px 30px rgba(26,11,5,0.045);
          cursor: pointer;
          transition:
            transform 0.22s ease,
            box-shadow 0.22s ease,
            border-color 0.22s ease;
        }

        .order-card:hover {
          transform: translateY(-2px);
          border-color: #D7C2AE;
          box-shadow:
            0 14px 36px rgba(26,11,5,0.075);
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
          display: flex;
          align-items: center;
          gap: 8px;
          color: #70645C;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.025em;
        }

        .order-date {
          margin-top: 3px;
          font-size: 0.74rem;
          color: #A0958D;
        }

        /* -------------------------------------------------- */
        /* STATUS */
        /* -------------------------------------------------- */

        .order-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 10px;
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 800;
          white-space: nowrap;
        }

        .status-new {
          background: #F4EEE8;
          color: #6E5140;
        }

        .status-preparing {
          background: #FFF4DB;
          color: #9A6910;
        }

        .status-assigned {
          background: #F1EAFE;
          color: #7050A6;
        }

        .status-delivery {
          background: #EAF3F7;
          color: #35677A;
        }

        .status-delivered {
          background: #E8F3EA;
          color: #467051;
        }

        .status-cancelled {
          background: #FCEAE6;
          color: #A84E39;
        }

        /* -------------------------------------------------- */
        /* ITEMS */
        /* -------------------------------------------------- */

        .order-items {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .order-item {
          display: flex;
          align-items: center;
          gap: 13px;
          min-width: 0;
        }

        .order-image-wrapper {
          width: 58px;
          height: 58px;
          flex: 0 0 58px;
          position: relative;
          overflow: hidden;
          border-radius: 15px;
          background:
            linear-gradient(
              145deg,
              #F3E9DE,
              #E9D8C7
            );
        }

        .order-image {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .image-fallback {
          width: 100%;
          height: 100%;
          display: none;
          align-items: center;
          justify-content: center;
          color: #806957;
        }

        .order-item-info {
          flex: 1;
          min-width: 0;
        }

        .order-item-name {
          margin: 0;
          color: #2A160C;
          font-size: 0.95rem;
          font-weight: 750;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .order-item-meta {
          margin-top: 4px;
          color: #93877F;
          font-size: 0.76rem;
          line-height: 1.4;
        }

        .order-item-price {
          color: #3A2417;
          font-size: 0.85rem;
          font-weight: 750;
          white-space: nowrap;
        }

        /* -------------------------------------------------- */
        /* BOTTOM */
        /* -------------------------------------------------- */

        .order-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-top: 18px;
          padding-top: 16px;
          border-top: 1px solid #F0EBE4;
        }

        .order-total-label {
          color: #958A82;
          font-size: 0.73rem;
          margin-bottom: 2px;
        }

        .order-total {
          color: #1A0B05;
          font-size: 1.15rem;
          font-weight: 850;
        }

        .order-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .reorder-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border: none;
          background: #1A0B05;
          color: #FFF;
          border-radius: 12px;
          padding: 10px 15px;
          font-size: 0.78rem;
          font-weight: 750;
          cursor: pointer;
          transition:
            transform 0.2s ease,
            background 0.2s ease;
        }

        .reorder-button:hover {
          background: #321A0E;
          transform: translateY(-1px);
        }

        .view-order {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 11px;
          background: #F8F3ED;
          color: #6F5D50;
        }

        /* -------------------------------------------------- */
        /* EMPTY */
        /* -------------------------------------------------- */

        .orders-empty {
          background: rgba(255,255,255,0.92);
          border: 1px solid #E6DFD5;
          border-radius: 24px;
          padding: 55px 25px;
          text-align: center;
          box-shadow: 0 10px 35px rgba(26,11,5,0.04);
        }

        .empty-icon {
          width: 62px;
          height: 62px;
          margin: 0 auto 17px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 20px;
          background: #F5EDE4;
          color: #806957;
        }

        .orders-empty h2 {
          margin: 0;
          font-family: 'Playfair Display', serif;
          font-size: 1.55rem;
          font-weight: 500;
          color: #2A160C;
        }

        .orders-empty p {
          max-width: 390px;
          margin: 9px auto 20px;
          color: #887C74;
          font-size: 0.88rem;
          line-height: 1.5;
        }

        .empty-button {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: none;
          border-radius: 12px;
          padding: 11px 17px;
          background: #1A0B05;
          color: #FFF;
          font-weight: 750;
          cursor: pointer;
        }

        /* -------------------------------------------------- */
        /* LOADING */
        /* -------------------------------------------------- */

        .orders-loading {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .order-skeleton {
          height: 150px;
          border-radius: 22px;
          background:
            linear-gradient(
              90deg,
              #F3EEE8 25%,
              #FAF7F3 50%,
              #F3EEE8 75%
            );
          background-size: 200% 100%;
          animation: orderShimmer 1.35s infinite;
          border: 1px solid #E9E1D8;
        }

        @keyframes orderShimmer {
          0% {
            background-position: 200% 0;
          }

          100% {
            background-position: -200% 0;
          }
        }

        /* -------------------------------------------------- */
        /* ERROR */
        /* -------------------------------------------------- */

        .orders-error {
          background: #FFF;
          border: 1px solid #E8D8D1;
          border-radius: 20px;
          padding: 28px;
          text-align: center;
        }

        .orders-error-icon {
          color: #B65C44;
          margin-bottom: 8px;
        }

        .orders-error h3 {
          margin: 0 0 6px;
          font-family: 'Playfair Display', serif;
          font-size: 1.35rem;
          font-weight: 500;
        }

        .orders-error p {
          margin: 0 0 17px;
          color: #83776F;
          font-size: 0.85rem;
        }

        .retry-button {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: 1px solid #D7C5B6;
          background: #FAF6F0;
          color: #3A2417;
          border-radius: 11px;
          padding: 9px 14px;
          font-weight: 700;
          cursor: pointer;
        }

        /* -------------------------------------------------- */
        /* MOBILE */
        /* -------------------------------------------------- */

        @media (max-width: 650px) {
          .orders-page {
            padding: 25px 14px 55px;
          }

          .orders-header {
            align-items: flex-start;
            flex-direction: column;
            margin-bottom: 22px;
          }

          .orders-stats {
            width: 100%;
          }

          .orders-stat {
            flex: 1;
          }

          .order-card {
            padding: 16px;
            border-radius: 19px;
          }

          .order-top {
            align-items: flex-start;
          }

          .order-status {
            font-size: 0.67rem;
            padding: 6px 8px;
          }

          .order-image-wrapper {
            width: 52px;
            height: 52px;
            flex-basis: 52px;
          }

          .order-item-name {
            font-size: 0.88rem;
          }

          .order-bottom {
            align-items: flex-end;
          }

          .order-actions {
            flex-shrink: 0;
          }

          .reorder-button {
            padding: 9px 11px;
          }

          .reorder-button span {
            display: none;
          }

          .view-order {
            display: none;
          }
        }

        @media (max-width: 400px) {
          .order-top {
            flex-direction: column;
            gap: 9px;
          }

          .order-status {
            align-self: flex-start;
          }

          .order-bottom {
            gap: 8px;
          }

          .order-total {
            font-size: 1rem;
          }
        }
      `}</style>

      <main className="orders-page">
        <div className="orders-container">

          {/* BACK */}
          <button
            type="button"
            className="orders-back"
            onClick={goToMenu}
          >
            <ArrowLeft size={16} />
            Back to Menu
          </button>

          {/* HEADER */}
          <header className="orders-header">
            <div>
              <h1 className="orders-heading">
                Your Orders
              </h1>

              <p className="orders-subtitle">
                A little history of everything you've brewed.
              </p>
            </div>

            {!loading && !error && orders.length > 0 && (
              <div className="orders-stats">
                <div className="orders-stat">
                  <span className="orders-stat-number">
                    {orderStats.total}
                  </span>
                  <span className="orders-stat-label">
                    Orders
                  </span>
                </div>

                <div className="orders-stat">
                  <span className="orders-stat-number">
                    {orderStats.active}
                  </span>
                  <span className="orders-stat-label">
                    Active
                  </span>
                </div>

                <div className="orders-stat">
                  <span className="orders-stat-number">
                    {orderStats.delivered}
                  </span>
                  <span className="orders-stat-label">
                    Delivered
                  </span>
                </div>
              </div>
            )}
          </header>

          {/* LOADING */}
          {loading && (
            <div className="orders-loading">
              <div className="order-skeleton" />
              <div className="order-skeleton" />
              <div className="order-skeleton" />
            </div>
          )}

          {/* ERROR */}
          {!loading && error && (
            <div className="orders-error">
              <div className="orders-error-icon">
                <XCircle size={30} />
              </div>

              <h3>
                Couldn't load your orders
              </h3>

              <p>
                {error}
              </p>

              <button
                type="button"
                className="retry-button"
                onClick={() => window.location.reload()}
              >
                <RefreshCw size={15} />
                Try Again
              </button>
            </div>
          )}

          {/* EMPTY */}
          {!loading &&
            !error &&
            orders.length === 0 && (
              <div className="orders-empty">
                <div className="empty-icon">
                  <ShoppingBag size={29} />
                </div>

                <h2>
                  Nothing brewed yet
                </h2>

                <p>
                  Your future coffee runs will appear here.
                  Find something lovely on the menu and
                  make your first order.
                </p>

                <button
                  type="button"
                  className="empty-button"
                  onClick={goToMenu}
                >
                  Explore Menu
                  <ArrowRight size={16} />
                </button>
              </div>
            )}

          {/* ORDERS */}
          {!loading &&
            !error &&
            orders.length > 0 && (
              <section>
                {orders.map((order) => {
                  const statusConfig =
                    getStatusConfig(
                      order.status
                    );

                  const items =
                    Array.isArray(order.items)
                      ? order.items
                      : [];

                  const totalItems = items.reduce(
                    (sum, item) =>
                      sum +
                      Number(
                        item?.qty ||
                        item?.quantity ||
                        1
                      ),
                    0
                  );

                  return (
                    <article
                      key={order.id}
                      className="order-card"
                      onClick={goToMenu}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" ||
                          event.key === " "
                        ) {
                          event.preventDefault();
                          goToMenu();
                        }
                      }}
                    >

                      {/* ORDER TOP */}
                      <div className="order-top">

                        <div>
                          <div className="order-number">
                            <Package size={14} />
                            Order #
                            {order.id
                              .slice(-6)
                              .toUpperCase()}
                          </div>

                          <div className="order-date">
                            {formatDate(
                              order.createdAt
                            )}

                            {formatTime(
                              order.createdAt
                            ) && (
                              <>
                                {" • "}
                                {formatTime(
                                  order.createdAt
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        <div
                          className={`order-status ${statusConfig.className}`}
                        >
                          {statusConfig.icon}
                          {statusConfig.label}
                        </div>

                      </div>

                      {/* ITEMS */}
                      <div className="order-items">

                        {items.length > 0 ? (
                          items.map(
                            (item, index) => {
                              const image =
                                getItemImage(item);

                              const quantity =
                                Number(
                                  item?.qty ||
                                  item?.quantity ||
                                  1
                                );

                              const size =
                                item?.size ||
                                item?.variant ||
                                "";

                              const price =
                                Number(
                                  item?.price ||
                                  item?.finalPrice ||
                                  0
                                );

                              return (
                                <div
                                  className="order-item"
                                  key={
                                    item?.id ||
                                    item?.productId ||
                                    index
                                  }
                                >

                                  {/* IMAGE */}
                                  <div className="order-image-wrapper">

                                    {image ? (
                                      <img
                                        className="order-image"
                                        src={image}
                                        alt={
                                          item?.name ||
                                          "Ordered item"
                                        }
                                        loading="lazy"
                                        onError={
                                          handleImageError
                                        }
                                      />
                                    ) : null}

                                    <div
                                      className="image-fallback"
                                      style={{
                                        display:
                                          image
                                            ? "none"
                                            : "flex",
                                      }}
                                    >
                                      <Coffee
                                        size={23}
                                        strokeWidth={1.8}
                                      />
                                    </div>

                                  </div>

                                  {/* INFO */}
                                  <div className="order-item-info">
                                    <p className="order-item-name">
                                      {item?.name ||
                                        "Coffee"}
                                    </p>

                                    <div className="order-item-meta">
                                      Qty {quantity}

                                      {size && (
                                        <>
                                          {" • "}
                                          {size}
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {/* ITEM PRICE */}
                                  {price > 0 && (
                                    <div className="order-item-price">
                                      ₹
                                      {Math.round(
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
                            <div className="order-image-wrapper">
                              <div
                                className="image-fallback"
                                style={{
                                  display: "flex",
                                }}
                              >
                                <Coffee size={23} />
                              </div>
                            </div>

                            <div className="order-item-info">
                              <p className="order-item-name">
                                Brewed Order
                              </p>

                              <div className="order-item-meta">
                                Order details unavailable
                              </div>
                            </div>
                          </div>
                        )}

                      </div>

                      {/* BOTTOM */}
                      <div className="order-bottom">

                        <div>
                          <div className="order-total-label">
                            {totalItems}{" "}
                            {totalItems === 1
                              ? "item"
                              : "items"}{" "}
                            • Total
                          </div>

                          <div className="order-total">
                            ₹
                            {Number(
                              order.total || 0
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </div>
                        </div>

                        <div className="order-actions">

                          {/* REORDER */}
                          {items.length > 0 && (
                            <button
                              type="button"
                              className="reorder-button"
                              onClick={(event) =>
                                handleReorder(
                                  event,
                                  items
                                )
                              }
                            >
                              <RefreshCw
                                size={14}
                              />
                              <span>
                                Reorder
                              </span>
                            </button>
                          )}

                          {/* VISUAL NAVIGATION */}
                          <div className="view-order">
                            <ArrowRight
                              size={16}
                            />
                          </div>

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
