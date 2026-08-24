import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase";
import { useCart } from "../context/CartContext";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Coffee,
  Package,
  RotateCcw,
  ShoppingBag,
  Truck,
  XCircle,
} from "lucide-react";

export default function OrdersPage({ setPage }) {
  const { reorder } = useCart();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState("");

  /*
   * ------------------------------------------------------------
   * AUTH + ORDERS
   * ------------------------------------------------------------
   *
   * IMPORTANT:
   * We filter by userId because CheckoutPage saves:
   *
   * userId: auth.currentUser.uid
   *
   * This prevents every customer's orders from being displayed.
   */
  useEffect(() => {
    let unsubscribeOrders = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setAuthLoading(false);
      setError("");

      if (unsubscribeOrders) {
        unsubscribeOrders();
        unsubscribeOrders = null;
      }

      if (!user) {
        setOrders([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const ordersRef = collection(db, "orders");

        const ordersQuery = query(
          ordersRef,
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );

        unsubscribeOrders = onSnapshot(
          ordersQuery,
          (snapshot) => {
            const fetchedOrders = snapshot.docs.map((orderDoc) => {
              const data = orderDoc.data();

              return {
                id: orderDoc.id,
                ...data,
              };
            });

            setOrders(fetchedOrders);
            setLoading(false);
            setError("");
          },
          (snapshotError) => {
            console.error(
              "OrdersPage Firestore error:",
              snapshotError
            );

            setOrders([]);
            setLoading(false);

            if (
              snapshotError?.code === "failed-precondition"
            ) {
              setError(
                "Orders are temporarily unavailable. Please try again in a moment."
              );
            } else if (
              snapshotError?.code === "permission-denied"
            ) {
              setError(
                "You don't have permission to view these orders."
              );
            } else {
              setError(
                "We couldn't load your orders. Please try again."
              );
            }
          }
        );
      } catch (err) {
        console.error("OrdersPage query error:", err);

        setOrders([]);
        setLoading(false);
        setError(
          "Something went wrong while loading your orders."
        );
      }
    });

    return () => {
      unsubscribeAuth();

      if (unsubscribeOrders) {
        unsubscribeOrders();
      }
    };
  }, []);

  /*
   * ------------------------------------------------------------
   * HELPERS
   * ------------------------------------------------------------
   */

  const getOrderDate = (createdAt) => {
    if (!createdAt) {
      return "Date unavailable";
    }

    try {
      if (typeof createdAt?.toDate === "function") {
        return createdAt.toDate().toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      }

      if (createdAt instanceof Date) {
        return createdAt.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      }

      if (typeof createdAt === "number") {
        return new Date(createdAt).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      }

      return new Date(createdAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "Date unavailable";
    }
  };

  const getOrderTime = (createdAt) => {
    if (!createdAt) {
      return "";
    }

    try {
      let date;

      if (typeof createdAt?.toDate === "function") {
        date = createdAt.toDate();
      } else if (createdAt instanceof Date) {
        date = createdAt;
      } else if (typeof createdAt === "number") {
        date = new Date(createdAt);
      } else {
        date = new Date(createdAt);
      }

      return date.toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  /*
   * Supports BOTH:
   *
   * item.image
   * item.img
   *
   * Your existing menu/cart data may use either.
   */
  const getItemImage = (item) => {
    if (!item) {
      return null;
    }

    const candidates = [
      item.image,
      item.img,
      item.imageUrl,
      item.photo,
      item.thumbnail,
    ];

    const validImage = candidates.find(
      (value) =>
        typeof value === "string" &&
        value.trim().length > 0
    );

    return validImage || null;
  };

  const getItemQuantity = (item) => {
    const quantity =
      item?.qty ??
      item?.quantity ??
      item?.count ??
      1;

    const parsed = Number(quantity);

    return Number.isFinite(parsed) && parsed > 0
      ? parsed
      : 1;
  };

  const getItemSize = (item) => {
    return (
      item?.size ||
      item?.variant ||
      item?.selectedSize ||
      ""
    );
  };

  const getStatus = (order) => {
    const rawStatus =
      order?.status ||
      order?.orderStatus ||
      "New";

    return String(rawStatus).trim();
  };

  const normalizeStatus = (status) => {
    return String(status || "")
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
      normalized.includes("reject") ||
      normalized.includes("declin")
    ) {
      return {
        label: status || "Cancelled",
        className: "status-cancelled",
        icon: XCircle,
      };
    }

    if (
      normalized.includes("deliver") &&
      !normalized.includes("out")
    ) {
      return {
        label: status || "Delivered",
        className: "status-delivered",
        icon: CheckCircle2,
      };
    }

    if (
      normalized.includes("out for delivery") ||
      normalized.includes("on the way") ||
      normalized.includes("dispatched") ||
      normalized.includes("rider")
    ) {
      return {
        label: status || "Out for Delivery",
        className: "status-delivery",
        icon: Truck,
      };
    }

    if (
      normalized.includes("prepar") ||
      normalized.includes("accepted") ||
      normalized.includes("processing") ||
      normalized.includes("confirmed")
    ) {
      return {
        label: status || "Preparing",
        className: "status-preparing",
        icon: Coffee,
      };
    }

    if (
      normalized.includes("new") ||
      normalized.includes("placed") ||
      normalized.includes("pending")
    ) {
      return {
        label: status || "New",
        className: "status-new",
        icon: Clock3,
      };
    }

    return {
      label: status || "Processing",
      className: "status-default",
      icon: Package,
    };
  };

  const formatCurrency = (value) => {
    const amount = Number(value);

    if (!Number.isFinite(amount)) {
      return "₹0";
    }

    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const getOrderItemCount = (order) => {
    if (!Array.isArray(order?.items)) {
      return 0;
    }

    return order.items.reduce(
      (total, item) =>
        total + getItemQuantity(item),
      0
    );
  };

  /*
   * ------------------------------------------------------------
   * ORDER CLICK
   * ------------------------------------------------------------
   *
   * Clicking anywhere on the card takes the customer back to
   * the Menu page as requested.
   */
  const handleOrderCardClick = () => {
    setPage("menu");
  };

  /*
   * Prevent the reorder button from triggering the card click.
   */
  const handleReorder = (event, order) => {
    event.stopPropagation();

    if (
      !Array.isArray(order?.items) ||
      order.items.length === 0
    ) {
      return;
    }

    try {
      reorder(order.items);
      setPage("menu");
    } catch (err) {
      console.error("Reorder failed:", err);
    }
  };

  /*
   * ------------------------------------------------------------
   * DERIVED VALUES
   * ------------------------------------------------------------
   */

  const totalOrders = useMemo(
    () => orders.length,
    [orders]
  );

  const activeOrders = useMemo(() => {
    return orders.filter((order) => {
      const normalized = normalizeStatus(
        getStatus(order)
      );

      return (
        !normalized.includes("deliver") &&
        !normalized.includes("cancel") &&
        !normalized.includes("failed")
      );
    });
  }, [orders]);

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
              transparent 35%
            ),
            #FAF6F0;
          padding: 90px 20px 60px;
          box-sizing: border-box;
        }

        .orders-container {
          width: 100%;
          max-width: 820px;
          margin: 0 auto;
        }

        .orders-back {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 0;
          background: transparent;
          color: #70645C;
          font-family: 'Inter', sans-serif;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          padding: 6px 0;
          margin-bottom: 25px;
          transition: color 0.2s ease;
        }

        .orders-back:hover {
          color: #1A0B05;
        }

        .orders-header {
          margin-bottom: 28px;
        }

        .orders-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-family: 'Inter', sans-serif;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #A77B55;
          margin-bottom: 8px;
        }

        .orders-title {
          margin: 0;
          color: #1A0B05;
          font-family: 'Playfair Display', serif;
          font-size: clamp(2.1rem, 5vw, 3.2rem);
          font-weight: 500;
          letter-spacing: -0.03em;
          line-height: 1.05;
        }

        .orders-subtitle {
          margin: 10px 0 0;
          color: #70645C;
          font-family: 'Inter', sans-serif;
          font-size: 0.95rem;
          line-height: 1.6;
        }

        .orders-stats {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 18px;
        }

        .orders-stat {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255,255,255,0.72);
          border: 1px solid #E6DFD5;
          color: #70645C;
          font-family: 'Inter', sans-serif;
          font-size: 0.78rem;
          font-weight: 600;
        }

        .orders-stat strong {
          color: #1A0B05;
        }

        .orders-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .order-card {
          position: relative;
          background: #FFFFFF;
          border: 1px solid #E6DFD5;
          border-radius: 20px;
          padding: 20px;
          cursor: pointer;
          overflow: hidden;
          box-shadow:
            0 8px 30px rgba(26, 11, 5, 0.035);
          transition:
            transform 0.22s ease,
            box-shadow 0.22s ease,
            border-color 0.22s ease;
        }

        .order-card:hover {
          transform: translateY(-2px);
          border-color: #D8C5B2;
          box-shadow:
            0 14px 36px rgba(26, 11, 5, 0.07);
        }

        .order-card:active {
          transform: translateY(0);
        }

        .order-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 15px;
          margin-bottom: 17px;
        }

        .order-number {
          margin: 0;
          color: #1A0B05;
          font-family: 'Inter', sans-serif;
          font-size: 0.9rem;
          font-weight: 800;
          letter-spacing: 0.02em;
        }

        .order-date {
          margin: 5px 0 0;
          color: #9A8E85;
          font-family: 'Inter', sans-serif;
          font-size: 0.76rem;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
          padding: 7px 10px;
          border-radius: 999px;
          font-family: 'Inter', sans-serif;
          font-size: 0.72rem;
          font-weight: 800;
          white-space: nowrap;
        }

        .status-new {
          background: #FFF7E8;
          color: #9A6800;
        }

        .status-preparing {
          background: #FFF2E5;
          color: #A85D19;
        }

        .status-delivery {
          background: #EEF5FF;
          color: #37679B;
        }

        .status-delivered {
          background: #EAF6EE;
          color: #39704B;
        }

        .status-cancelled {
          background: #FDEEEE;
          color: #B54A4A;
        }

        .status-default {
          background: #F3F0EC;
          color: #665A52;
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

        .order-image-wrap {
          width: 64px;
          height: 64px;
          flex: 0 0 64px;
          border-radius: 14px;
          overflow: hidden;
          background: #F5EFE8;
          border: 1px solid #EEE5DC;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .order-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .order-image-fallback {
          color: #B28A67;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .order-item-info {
          flex: 1;
          min-width: 0;
        }

        .order-item-name {
          margin: 0;
          color: #1A0B05;
          font-family: 'Inter', sans-serif;
          font-size: 0.92rem;
          font-weight: 700;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .order-item-meta {
          margin: 5px 0 0;
          color: #8A7D74;
          font-family: 'Inter', sans-serif;
          font-size: 0.76rem;
        }

        .order-item-price {
          color: #4F4036;
          font-family: 'Inter', sans-serif;
          font-size: 0.82rem;
          font-weight: 700;
          white-space: nowrap;
        }

        .order-divider {
          height: 1px;
          background: #F0EBE5;
          margin: 18px 0 15px;
        }

        .order-bottom {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .order-summary {
          flex: 1;
          min-width: 0;
        }

        .order-total-label {
          color: #9A8E85;
          font-family: 'Inter', sans-serif;
          font-size: 0.72rem;
          margin-bottom: 3px;
        }

        .order-total {
          color: #1A0B05;
          font-family: 'Inter', sans-serif;
          font-size: 1.08rem;
          font-weight: 800;
        }

        .order-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border: 1px solid #D9C6B2;
          background: #FFFDFB;
          color: #3A2A21;
          padding: 9px 13px;
          border-radius: 11px;
          font-family: 'Inter', sans-serif;
          font-size: 0.78rem;
          font-weight: 800;
          cursor: pointer;
          transition:
            background 0.2s ease,
            border-color 0.2s ease,
            transform 0.2s ease;
          white-space: nowrap;
        }

        .order-action:hover {
          background: #F8F0E8;
          border-color: #C4956A;
        }

        .order-arrow {
          color: #A88C75;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .orders-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 320px;
          text-align: center;
        }

        .loading-cup {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          background: #F2E7DB;
          color: #A77B55;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: brewedPulse 1.3s ease-in-out infinite;
          margin-bottom: 14px;
        }

        .orders-loading p {
          margin: 0;
          color: #70645C;
          font-family: 'Inter', sans-serif;
          font-size: 0.88rem;
        }

        .orders-empty {
          background: #FFFFFF;
          border: 1px solid #E6DFD5;
          border-radius: 22px;
          padding: 55px 25px;
          text-align: center;
          box-shadow:
            0 8px 30px rgba(26, 11, 5, 0.035);
        }

        .empty-icon {
          width: 66px;
          height: 66px;
          border-radius: 20px;
          background: #F5ECE3;
          color: #A77B55;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 18px;
        }

        .orders-empty h2 {
          margin: 0;
          color: #1A0B05;
          font-family: 'Playfair Display', serif;
          font-size: 1.65rem;
          font-weight: 500;
        }

        .orders-empty p {
          max-width: 380px;
          margin: 9px auto 22px;
          color: #81756C;
          font-family: 'Inter', sans-serif;
          font-size: 0.86rem;
          line-height: 1.6;
        }

        .empty-button {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: none;
          background: #1A0B05;
          color: #FFFFFF;
          padding: 11px 17px;
          border-radius: 11px;
          font-family: 'Inter', sans-serif;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
        }

        .orders-error {
          background: #FFF7F6;
          border: 1px solid #F0D5D1;
          color: #8F4038;
          border-radius: 15px;
          padding: 15px 16px;
          font-family: 'Inter', sans-serif;
          font-size: 0.84rem;
          line-height: 1.5;
          margin-bottom: 18px;
        }

        .orders-error button {
          margin-top: 9px;
          border: none;
          background: transparent;
          padding: 0;
          color: #8F4038;
          font-weight: 800;
          cursor: pointer;
          text-decoration: underline;
        }

        @keyframes brewedPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }

          50% {
            transform: scale(1.07);
            opacity: 0.72;
          }
        }

        @media (max-width: 640px) {
          .orders-page {
            padding: 78px 14px 40px;
          }

          .order-card {
            padding: 16px;
            border-radius: 18px;
          }

          .order-top {
            gap: 10px;
          }

          .status-badge {
            padding: 6px 8px;
            font-size: 0.67rem;
          }

          .order-image-wrap {
            width: 58px;
            height: 58px;
            flex-basis: 58px;
          }

          .order-bottom {
            flex-wrap: wrap;
          }

          .order-action {
            width: 100%;
          }

          .order-arrow {
            display: none;
          }
        }

        @media (max-width: 390px) {
          .orders-title {
            font-size: 2rem;
          }

          .order-top {
            flex-direction: column;
          }

          .status-badge {
            align-self: flex-start;
          }
        }
      `}</style>

      <div className="orders-page">
        <div className="orders-container">

          {/* BACK */}
          <button
            type="button"
            className="orders-back"
            onClick={() => setPage("menu")}
          >
            <ArrowLeft size={16} />
            Back to Menu
          </button>

          {/* HEADER */}
          <div className="orders-header">
            <div className="orders-eyebrow">
              <Coffee size={14} />
              Your Brewed
            </div>

            <h1 className="orders-title">
              Order Journey
            </h1>

            <p className="orders-subtitle">
              A little history of everything you've brewed
              with us.
            </p>

            {!authLoading && !loading && orders.length > 0 && (
              <div className="orders-stats">
                <div className="orders-stat">
                  <ShoppingBag size={14} />
                  <strong>{totalOrders}</strong>
                  {totalOrders === 1 ? " order" : " orders"}
                </div>

                {activeOrders.length > 0 && (
                  <div className="orders-stat">
                    <Clock3 size={14} />
                    <strong>{activeOrders.length}</strong>
                    {activeOrders.length === 1
                      ? " active"
                      : " active"}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ERROR */}
          {error && (
            <div className="orders-error">
              {error}

              <br />

              <button
                type="button"
                onClick={() => window.location.reload()}
              >
                Try again
              </button>
            </div>
          )}

          {/* LOADING */}
          {authLoading || loading ? (
            <div className="orders-loading">
              <div className="loading-cup">
                <Coffee size={22} />
              </div>

              <p>
                Brewing your order history...
              </p>
            </div>
          ) : !auth.currentUser ? (
            /* NOT LOGGED IN */
            <div className="orders-empty">
              <div className="empty-icon">
                <ShoppingBag size={28} />
              </div>

              <h2>
                Sign in to see your orders
              </h2>

              <p>
                Your Brewed order history lives inside
                your account.
              </p>

              <button
                type="button"
                className="empty-button"
                onClick={() => setPage("login")}
              >
                Sign In
                <ArrowRight size={15} />
              </button>
            </div>
          ) : orders.length === 0 ? (
            /* EMPTY */
            <div className="orders-empty">
              <div className="empty-icon">
                <Coffee size={28} />
              </div>

              <h2>
                No brews yet
              </h2>

              <p>
                Your first Brewed order is waiting to
                happen. Find something you love from
                the menu.
              </p>

              <button
                type="button"
                className="empty-button"
                onClick={() => setPage("menu")}
              >
                Explore Menu
                <ArrowRight size={15} />
              </button>
            </div>
          ) : (
            /* ORDERS */
            <div className="orders-list">
              {orders.map((order) => {
                const status = getStatus(order);
                const statusConfig =
                  getStatusConfig(status);

                const StatusIcon =
                  statusConfig.icon;

                const items = Array.isArray(
                  order.items
                )
                  ? order.items
                  : [];

                return (
                  <article
                    key={order.id}
                    className="order-card"
                    onClick={handleOrderCardClick}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" ||
                        event.key === " "
                      ) {
                        event.preventDefault();
                        handleOrderCardClick();
                      }
                    }}
                    aria-label={`Order ${order.id
                      .slice(-6)
                      .toUpperCase()}`}
                  >

                    {/* ORDER HEADER */}
                    <div className="order-top">
                      <div>
                        <p className="order-number">
                          #{order.id
                            .slice(-6)
                            .toUpperCase()}
                        </p>

                        <p className="order-date">
                          {getOrderDate(
                            order.createdAt
                          )}

                          {getOrderTime(
                            order.createdAt
                          ) && (
                            <>
                              {" "}
                              •{" "}
                              {getOrderTime(
                                order.createdAt
                              )}
                            </>
                          )}
                        </p>
                      </div>

                      <div
                        className={`status-badge ${statusConfig.className}`}
                      >
                        <StatusIcon size={13} />
                        {statusConfig.label}
                      </div>
                    </div>

                    {/* ITEMS */}
                    <div className="order-items">
                      {items.length > 0 ? (
                        items.map((item, index) => {
                          const image =
                            getItemImage(item);

                          const quantity =
                            getItemQuantity(item);

                          const size =
                            getItemSize(item);

                          return (
                            <div
                              className="order-item"
                              key={
                                item?.id ||
                                item?.firestoreId ||
                                item?.rewardId ||
                                `${order.id}-${index}`
                              }
                            >

                              {/* IMAGE */}
                              <div className="order-image-wrap">
                                {image ? (
                                  <img
                                    src={image}
                                    className="order-image"
                                    alt={
                                      item?.name ||
                                      "Ordered item"
                                    }
                                    loading="lazy"
                                    onError={(event) => {
                                      /*
                                       * If the image URL is
                                       * invalid, gracefully
                                       * fall back to the coffee
                                       * icon instead of showing
                                       * a broken image.
                                       */
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
                                  className="order-image-fallback"
                                  style={{
                                    display: image
                                      ? "none"
                                      : "flex",
                                    width: "100%",
                                    height: "100%",
                                  }}
                                >
                                  <Coffee size={25} />
                                </div>
                              </div>

                              {/* ITEM INFO */}
                              <div className="order-item-info">
                                <p className="order-item-name">
                                  {item?.name ||
                                    "Brewed Item"}
                                </p>

                                <p className="order-item-meta">
                                  Qty: {quantity}

                                  {size
                                    ? ` • ${size}`
                                    : ""}

                                  {item?.isReward
                                    ? " • Reward"
                                    : ""}
                                </p>
                              </div>

                              {/* ITEM PRICE */}
                              <div className="order-item-price">
                                {item?.isReward ||
                                Number(item?.price) === 0
                                  ? "FREE"
                                  : formatCurrency(
                                      Number(
                                        item?.price || 0
                                      ) * quantity
                                    )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="order-item">
                          <div className="order-image-wrap">
                            <div
                              className="order-image-fallback"
                              style={{
                                display: "flex",
                                width: "100%",
                                height: "100%",
                              }}
                            >
                              <Package size={25} />
                            </div>
                          </div>

                          <div className="order-item-info">
                            <p className="order-item-name">
                              Order items unavailable
                            </p>

                            <p className="order-item-meta">
                              Order #{order.id
                                .slice(-6)
                                .toUpperCase()}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* DIVIDER */}
                    <div className="order-divider" />

                    {/* FOOTER */}
                    <div className="order-bottom">
                      <div className="order-summary">
                        <div className="order-total-label">
                          {getOrderItemCount(order)}{" "}
                          {getOrderItemCount(order) === 1
                            ? "item"
                            : "items"}{" "}
                          • Total
                        </div>

                        <div className="order-total">
                          {formatCurrency(
                            order.total
                          )}
                        </div>
                      </div>

                      {/* REORDER */}
                      <button
                        type="button"
                        className="order-action"
                        onClick={(event) =>
                          handleReorder(
                            event,
                            order
                          )
                        }
                        aria-label={`Reorder ${order.id}`}
                      >
                        <RotateCcw size={14} />
                        Reorder
                      </button>

                      {/* CARD NAVIGATION INDICATOR */}
                      <div className="order-arrow">
                        <ChevronRight size={18} />
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
