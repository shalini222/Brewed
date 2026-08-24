import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronRight,
  Clock3,
  Coffee,
  Package,
  RefreshCw,
  ShoppingBag,
  Truck,
  X,
} from "lucide-react";

import { auth, db } from "../firebase";
import { useCart } from "../context/CartContext";

export default function OrdersPage({ setPage }) {
  const { reorder } = useCart();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /*
   * ============================================================
   * AUTH + REAL-TIME ORDERS
   * ============================================================
   */

  useEffect(() => {
    let unsubscribeOrders = null;

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (unsubscribeOrders) {
        unsubscribeOrders();
        unsubscribeOrders = null;
      }

      setOrders([]);
      setError("");

      if (!user) {
        setLoading(false);
        setError("Please log in to view your orders.");
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

            setLoading(false);

            if (
              snapshotError?.code ===
              "failed-precondition"
            ) {
              setError(
                "Your order history needs a Firestore index. Please create the index requested by Firebase."
              );
            } else if (
              snapshotError?.code === "permission-denied"
            ) {
              setError(
                "You don't have permission to view these orders."
              );
            } else {
              setError(
                "We couldn't load your orders right now. Please try again."
              );
            }
          }
        );
      } catch (err) {
        console.error("OrdersPage query error:", err);

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
   * ============================================================
   * HELPERS
   * ============================================================
   */

  const normalizeStatus = (status) => {
    if (!status) return "new";

    return String(status)
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ");
  };

  const getStatusConfig = (status) => {
    const normalized = normalizeStatus(status);

    switch (normalized) {
      case "new":
      case "placed":
      case "order placed":
        return {
          label: "Order Placed",
          className: "status-new",
          icon: ShoppingBag,
        };

      case "accepted":
        return {
          label: "Accepted",
          className: "status-accepted",
          icon: Check,
        };

      case "preparing":
      case "being prepared":
        return {
          label: "Preparing",
          className: "status-preparing",
          icon: Coffee,
        };

      case "ready":
      case "ready for pickup":
        return {
          label: "Ready",
          className: "status-ready",
          icon: Package,
        };

      case "assigned":
        return {
          label: "Rider Assigned",
          className: "status-assigned",
          icon: Truck,
        };

      case "out for delivery":
      case "outfordelivery":
      case "out_for_delivery":
        return {
          label: "Out for Delivery",
          className: "status-delivery",
          icon: Truck,
        };

      case "delivered":
      case "completed":
        return {
          label: "Delivered",
          className: "status-delivered",
          icon: Check,
        };

      case "cancelled":
      case "canceled":
        return {
          label: "Cancelled",
          className: "status-cancelled",
          icon: X,
        };

      case "failed":
      case "delivery failed":
        return {
          label: "Delivery Failed",
          className: "status-failed",
          icon: AlertCircle,
        };

      default:
        return {
          label: String(status)
            .replace(/[_-]/g, " ")
            .replace(/\b\w/g, (char) =>
              char.toUpperCase()
            ),
          className: "status-default",
          icon: Clock3,
        };
    }
  };

  const formatDate = (createdAt) => {
    if (!createdAt) return "Date unavailable";

    try {
      let date = null;

      if (
        createdAt &&
        typeof createdAt.toDate === "function"
      ) {
        date = createdAt.toDate();
      } else if (createdAt instanceof Date) {
        date = createdAt;
      } else if (
        typeof createdAt === "string" ||
        typeof createdAt === "number"
      ) {
        date = new Date(createdAt);
      }

      if (!date || Number.isNaN(date.getTime())) {
        return "Date unavailable";
      }

      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch (err) {
      console.error("Date formatting error:", err);
      return "Date unavailable";
    }
  };

  const formatTime = (createdAt) => {
    if (!createdAt) return "";

    try {
      let date = null;

      if (
        createdAt &&
        typeof createdAt.toDate === "function"
      ) {
        date = createdAt.toDate();
      } else if (createdAt instanceof Date) {
        date = createdAt;
      } else {
        date = new Date(createdAt);
      }

      if (!date || Number.isNaN(date.getTime())) {
        return "";
      }

      return date.toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const formatCurrency = (amount) => {
    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount)) {
      return "₹0";
    }

    return `₹${numericAmount.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;
  };

  const getItemImage = (item) => {
    if (!item || typeof item !== "object") {
      return null;
    }

    const possibleImages = [
      item.image,
      item.imageUrl,
      item.img,
      item.photo,
      item.photoUrl,
      item.thumbnail,
      item.thumbnailUrl,
    ];

    const validImage = possibleImages.find(
      (value) =>
        typeof value === "string" &&
        value.trim().length > 0
    );

    return validImage || null;
  };

  const getItemQuantity = (item) => {
    const quantity = Number(
      item?.qty ??
        item?.quantity ??
        item?.count ??
        1
    );

    return Number.isFinite(quantity) && quantity > 0
      ? quantity
      : 1;
  };

  const getItemSize = (item) => {
    if (!item?.size) return "";

    return String(item.size);
  };

  const getItemName = (item) => {
    return (
      item?.name ||
      item?.title ||
      item?.productName ||
      "Brewed Item"
    );
  };

  const getOrderItemCount = (order) => {
    if (!Array.isArray(order?.items)) return 0;

    return order.items.reduce(
      (total, item) =>
        total + getItemQuantity(item),
      0
    );
  };

  /*
   * ============================================================
   * SAFE REORDER
   * ============================================================
   */

  const handleReorder = async (event, order) => {
    event.preventDefault();
    event.stopPropagation();

    if (!Array.isArray(order?.items)) {
      return;
    }

    if (order.items.length === 0) {
      return;
    }

    try {
      await reorder(order.items);

      /*
       * Reorder stays on the Orders page.
       *
       * If your CartContext already navigates to cart,
       * that behavior remains controlled by your context.
       */
    } catch (err) {
      console.error("Reorder failed:", err);

      alert(
        "We couldn't add this order to your cart. Please try again."
      );
    }
  };

  /*
   * ============================================================
   * ORDER SUMMARY
   * ============================================================
   */

  const orderCountLabel = useMemo(() => {
    if (orders.length === 0) {
      return "";
    }

    return `${orders.length} ${
      orders.length === 1 ? "order" : "orders"
    }`;
  }, [orders.length]);

  /*
   * ============================================================
   * RENDER
   * ============================================================
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
              circle at top left,
              rgba(196, 149, 106, 0.08),
              transparent 35%
            ),
            #FAF6F0;
          padding: 88px 20px 60px;
          color: #1A0B05;
        }

        .orders-container {
          width: 100%;
          max-width: 780px;
          margin: 0 auto;
        }

        .orders-topbar {
          margin-bottom: 28px;
        }

        .orders-back {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: none;
          background: transparent;
          color: #70645C;
          padding: 0;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: color 0.2s ease;
        }

        .orders-back:hover {
          color: #1A0B05;
        }

        .orders-heading-row {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          margin-top: 18px;
        }

        .orders-heading {
          margin: 0;
          font-family: "Playfair Display", serif;
          font-size: clamp(2.2rem, 6vw, 3.2rem);
          font-weight: 500;
          line-height: 1;
          letter-spacing: -0.03em;
          color: #1A0B05;
        }

        .orders-subtitle {
          margin: 10px 0 0;
          color: #70645C;
          font-size: 14px;
          line-height: 1.5;
        }

        .orders-count {
          flex-shrink: 0;
          padding: 8px 13px;
          border-radius: 999px;
          background: rgba(196, 149, 106, 0.12);
          color: #805D3F;
          font-size: 12px;
          font-weight: 700;
        }

        .orders-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .order-card {
          position: relative;
          overflow: hidden;
          background: #FFFFFF;
          border: 1px solid #E6DFD5;
          border-radius: 22px;
          padding: 20px;
          box-shadow:
            0 7px 25px rgba(26, 11, 5, 0.045);
          cursor: pointer;
          transition:
            transform 0.22s ease,
            box-shadow 0.22s ease,
            border-color 0.22s ease;
        }

        .order-card:hover {
          transform: translateY(-2px);
          border-color: #D7C6B5;
          box-shadow:
            0 12px 30px rgba(26, 11, 5, 0.075);
        }

        .order-card:active {
          transform: translateY(0);
        }

        .order-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding-bottom: 15px;
          border-bottom: 1px solid #F0EBE4;
        }

        .order-id-block {
          min-width: 0;
        }

        .order-number {
          margin: 0;
          color: #1A0B05;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.04em;
        }

        .order-date {
          margin: 4px 0 0;
          color: #8C8179;
          font-size: 12px;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
          padding: 7px 11px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.01em;
        }

        .status-new {
          background: #F4EFEA;
          color: #6B5141;
        }

        .status-accepted {
          background: #EDF5EE;
          color: #4A7A5B;
        }

        .status-preparing {
          background: #FFF4DE;
          color: #9A6A16;
        }

        .status-ready {
          background: #F3EAFE;
          color: #77539B;
        }

        .status-assigned {
          background: #EAF2FA;
          color: #416A91;
        }

        .status-delivery {
          background: #E9F4F5;
          color: #34747A;
        }

        .status-delivered {
          background: #EAF5EC;
          color: #397047;
        }

        .status-cancelled,
        .status-failed {
          background: #FCEDEA;
          color: #A94E3A;
        }

        .status-default {
          background: #F1EEEB;
          color: #645A53;
        }

        .order-items {
          padding: 17px 0 4px;
        }

        .order-item {
          display: flex;
          align-items: center;
          gap: 13px;
          min-width: 0;
        }

        .order-item + .order-item {
          margin-top: 13px;
        }

        .item-image-wrap {
          width: 58px;
          height: 58px;
          flex: 0 0 58px;
          overflow: hidden;
          border-radius: 15px;
          background:
            linear-gradient(
              145deg,
              #F4ECE3,
              #EDE2D5
            );
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

        .item-image-fallback {
          color: #9D7A5B;
        }

        .item-details {
          min-width: 0;
          flex: 1;
        }

        .item-name {
          margin: 0;
          color: #2A1710;
          font-size: 14px;
          font-weight: 750;
          line-height: 1.3;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .item-meta {
          margin: 5px 0 0;
          color: #8B8078;
          font-size: 12px;
          line-height: 1.4;
        }

        .item-price {
          flex-shrink: 0;
          color: #2A1710;
          font-size: 13px;
          font-weight: 700;
        }

        .more-items {
          margin: 14px 0 0 71px;
          color: #8B8078;
          font-size: 12px;
          font-weight: 600;
        }

        .order-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px solid #F0EBE4;
        }

        .order-total-label {
          margin: 0 0 3px;
          color: #8C8179;
          font-size: 11px;
          font-weight: 600;
        }

        .order-total {
          margin: 0;
          color: #1A0B05;
          font-size: 18px;
          font-weight: 800;
        }

        .order-total-meta {
          color: #8C8179;
          font-size: 11px;
        }

        .reorder-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 40px;
          padding: 0 16px;
          border: 1px solid #1A0B05;
          border-radius: 12px;
          background: #1A0B05;
          color: #FFFFFF;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
          transition:
            background 0.2s ease,
            transform 0.2s ease;
        }

        .reorder-button:hover {
          background: #321910;
        }

        .reorder-button:active {
          transform: scale(0.97);
        }

        .order-chevron {
          position: absolute;
          right: 16px;
          bottom: 20px;
          color: #C7B9AE;
          pointer-events: none;
        }

        .loading-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .skeleton-card {
          height: 230px;
          border-radius: 22px;
          border: 1px solid #E6DFD5;
          background:
            linear-gradient(
              90deg,
              #FFFFFF 25%,
              #F5F0EA 50%,
              #FFFFFF 75%
            );
          background-size: 200% 100%;
          animation: orderSkeleton 1.4s infinite;
        }

        @keyframes orderSkeleton {
          0% {
            background-position: 200% 0;
          }

          100% {
            background-position: -200% 0;
          }
        }

        .orders-state {
          text-align: center;
          padding: 58px 25px;
          background: #FFFFFF;
          border: 1px solid #E6DFD5;
          border-radius: 22px;
        }

        .orders-state-icon {
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          border-radius: 18px;
          background: #F4ECE3;
          color: #8A674A;
        }

        .orders-state h2 {
          margin: 0;
          font-family: "Playfair Display", serif;
          font-size: 24px;
          font-weight: 500;
          color: #1A0B05;
        }

        .orders-state p {
          max-width: 420px;
          margin: 9px auto 0;
          color: #70645C;
          font-size: 14px;
          line-height: 1.55;
        }

        .state-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          margin-top: 20px;
          padding: 11px 18px;
          border: none;
          border-radius: 12px;
          background: #1A0B05;
          color: #FFFFFF;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }

        .error-state .orders-state-icon {
          background: #FCEDEA;
          color: #A94E3A;
        }

        @media (max-width: 600px) {
          .orders-page {
            padding: 76px 14px 40px;
          }

          .orders-heading-row {
            align-items: flex-start;
          }

          .orders-count {
            display: none;
          }

          .order-card {
            padding: 16px;
            border-radius: 19px;
          }

          .order-header {
            align-items: flex-start;
          }

          .status-badge {
            padding: 6px 9px;
            font-size: 10px;
          }

          .item-image-wrap {
            width: 52px;
            height: 52px;
            flex-basis: 52px;
          }

          .more-items {
            margin-left: 65px;
          }

          .order-footer {
            align-items: flex-end;
          }

          .reorder-button {
            padding: 0 13px;
            min-height: 38px;
          }

          .order-chevron {
            display: none;
          }
        }

        @media (max-width: 390px) {
          .order-footer {
            flex-direction: column;
            align-items: stretch;
          }

          .reorder-button {
            width: 100%;
          }
        }
      `}</style>

      <main className="orders-page">
        <div className="orders-container">

          {/* ==================================================
              HEADER
          ================================================== */}

          <header className="orders-topbar">
            <button
              type="button"
              className="orders-back"
              onClick={() => setPage("menu")}
            >
              <ArrowLeft size={16} />
              Back to Menu
            </button>

            <div className="orders-heading-row">
              <div>
                <h1 className="orders-heading">
                  Your Orders
                </h1>

                <p className="orders-subtitle">
                  A little history of everything you've brewed.
                </p>
              </div>

              {orderCountLabel && (
                <span className="orders-count">
                  {orderCountLabel}
                </span>
              )}
            </div>
          </header>

          {/* ==================================================
              LOADING
          ================================================== */}

          {loading && (
            <div
              className="loading-list"
              aria-label="Loading orders"
            >
              <div className="skeleton-card" />
              <div className="skeleton-card" />
              <div className="skeleton-card" />
            </div>
          )}

          {/* ==================================================
              ERROR
          ================================================== */}

          {!loading && error && (
            <div className="orders-state error-state">
              <div className="orders-state-icon">
                <AlertCircle size={25} />
              </div>

              <h2>Couldn't load your orders</h2>

              <p>{error}</p>

              <button
                type="button"
                className="state-button"
                onClick={() => window.location.reload()}
              >
                <RefreshCw size={15} />
                Try Again
              </button>
            </div>
          )}

          {/* ==================================================
              EMPTY
          ================================================== */}

          {!loading &&
            !error &&
            orders.length === 0 && (
              <div className="orders-state">
                <div className="orders-state-icon">
                  <Coffee size={25} />
                </div>

                <h2>No orders yet</h2>

                <p>
                  Your first cup is waiting. Explore the menu
                  and find something worth brewing.
                </p>

                <button
                  type="button"
                  className="state-button"
                  onClick={() => setPage("menu")}
                >
                  Explore Menu
                  <ChevronRight size={16} />
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
                  const statusConfig =
                    getStatusConfig(order.status);

                  const StatusIcon =
                    statusConfig.icon;

                  const items = Array.isArray(
                    order.items
                  )
                    ? order.items
                    : [];

                  const visibleItems =
                    items.slice(0, 3);

                  const remainingItems =
                    Math.max(
                      0,
                      items.length -
                        visibleItems.length
                    );

                  const totalItemCount =
                    getOrderItemCount(order);

                  return (
                    <article
                      key={order.id}
                      className="order-card"
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        setPage("menu")
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" ||
                          event.key === " "
                        ) {
                          event.preventDefault();
                          setPage("menu");
                        }
                      }}
                      aria-label={`Order ${order.id
                        .slice(-6)
                        .toUpperCase()}`}
                    >

                      {/* ORDER HEADER */}

                      <div className="order-header">
                        <div className="order-id-block">
                          <p className="order-number">
                            ORDER #
                            {order.id
                              .slice(-6)
                              .toUpperCase()}
                          </p>

                          <p className="order-date">
                            {formatDate(
                              order.createdAt
                            )}

                            {formatTime(
                              order.createdAt
                            ) && (
                              <>
                                {" "}
                                ·{" "}
                                {formatTime(
                                  order.createdAt
                                )}
                              </>
                            )}
                          </p>
                        </div>

                        <span
                          className={`status-badge ${statusConfig.className}`}
                        >
                          <StatusIcon size={13} />
                          {statusConfig.label}
                        </span>
                      </div>

                      {/* ORDER ITEMS */}

                      <div className="order-items">
                        {visibleItems.map(
                          (item, index) => {
                            const image =
                              getItemImage(item);

                            const quantity =
                              getItemQuantity(
                                item
                              );

                            const size =
                              getItemSize(item);

                            const itemName =
                              getItemName(item);

                            return (
                              <div
                                className="order-item"
                                key={
                                  item?.id ||
                                  item?.menuItemId ||
                                  `${itemName}-${index}`
                                }
                              >
                                <div className="item-image-wrap">
                                  {image ? (
                                    <img
                                      src={image}
                                      alt={itemName}
                                      className="item-image"
                                      loading="lazy"
                                      onError={(
                                        event
                                      ) => {
                                        event.currentTarget.style.display =
                                          "none";

                                        const parent =
                                          event
                                            .currentTarget
                                            .parentElement;

                                        if (
                                          parent &&
                                          !parent.querySelector(
                                            ".item-image-fallback"
                                          )
                                        ) {
                                          const fallback =
                                            document.createElement(
                                              "div"
                                            );

                                          fallback.className =
                                            "item-image-fallback";

                                          fallback.innerHTML =
                                            "☕";

                                          parent.appendChild(
                                            fallback
                                          );
                                        }
                                      }}
                                    />
                                  ) : (
                                    <div className="item-image-fallback">
                                      <Coffee
                                        size={22}
                                      />
                                    </div>
                                  )}
                                </div>

                                <div className="item-details">
                                  <p className="item-name">
                                    {itemName}
                                  </p>

                                  <p className="item-meta">
                                    Qty {quantity}

                                    {size && (
                                      <>
                                        {" "}
                                        · {size}
                                      </>
                                    )}
                                  </p>
                                </div>

                                {item?.price != null && (
                                  <span className="item-price">
                                    {formatCurrency(
                                      Number(
                                        item.price
                                      ) *
                                        quantity
                                    )}
                                  </span>
                                )}
                              </div>
                            );
                          }
                        )}

                        {remainingItems > 0 && (
                          <p className="more-items">
                            + {remainingItems} more{" "}
                            {remainingItems === 1
                              ? "item"
                              : "items"}
                          </p>
                        )}
                      </div>

                      {/* FOOTER */}

                      <div className="order-footer">
                        <div>
                          <p className="order-total-label">
                            {totalItemCount}{" "}
                            {totalItemCount === 1
                              ? "item"
                              : "items"}
                          </p>

                          <p className="order-total">
                            {formatCurrency(
                              order.total
                            )}
                          </p>

                          {order.paymentStatus && (
                            <span className="order-total-meta">
                              {String(
                                order.paymentStatus
                              ).toUpperCase()}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          className="reorder-button"
                          onClick={(event) =>
                            handleReorder(
                              event,
                              order
                            )
                          }
                        >
                          <RefreshCw size={14} />
                          Reorder
                        </button>
                      </div>

                      <ChevronRight
                        className="order-chevron"
                        size={17}
                      />
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
