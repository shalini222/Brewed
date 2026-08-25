import React, { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { useCart } from "../context/CartContext";
import { ArrowLeft, Clock3, CheckCircle2, PackageCheck } from "lucide-react";

export default function OrdersPage({ setPage }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { reorder } = useCart();

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const ordersRef = collection(db, "orders");

    const unsubscribe = onSnapshot(
      ordersRef,
      (snapshot) => {
        try {
          const userOrders = snapshot.docs
            .map((doc) => {
              const data = doc.data();

              return {
                id: doc.id,
                ...data,
              };
            })
            .filter((order) => order.userId === user.uid)
            .sort((a, b) => {
              const aTime = a.createdAt?.toMillis?.() || 0;
              const bTime = b.createdAt?.toMillis?.() || 0;
              return bTime - aTime;
            });

          setOrders(userOrders);
          setLoading(false);
          setError("");
        } catch (err) {
          console.error("Orders processing error:", err);
          setError("Couldn't load your orders.");
          setLoading(false);
        }
      },
      (err) => {
        console.error("Orders listener error:", err);
        setError("Couldn't load your orders.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const formatDate = (timestamp) => {
    if (!timestamp) return "Date unavailable";

    try {
      const date = timestamp.toDate
        ? timestamp.toDate()
        : new Date(timestamp);

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
      const date = timestamp.toDate
        ? timestamp.toDate()
        : new Date(timestamp);

      return date.toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const getStatus = (status) => {
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
        icon: <CheckCircle2 size={14} />,
      };
    }

    if (
      normalized.includes("out for delivery") ||
      normalized.includes("rider")
    ) {
      return {
        label: "Out for delivery",
        className: "status-delivery",
        icon: <PackageCheck size={14} />,
      };
    }

    if (
      normalized.includes("prepar") ||
      normalized === "accepted" ||
      normalized === "confirmed"
    ) {
      return {
        label:
          normalized === "confirmed"
            ? "Confirmed"
            : "Preparing",
        className: "status-preparing",
        icon: <Clock3 size={14} />,
      };
    }

    if (
      normalized.includes("cancel") ||
      normalized.includes("failed")
    ) {
      return {
        label: "Cancelled",
        className: "status-cancelled",
        icon: <span className="status-dot" />,
      };
    }

    return {
      label: "New",
      className: "status-new",
      icon: <Clock3 size={14} />,
    };
  };

  const getItemImage = (item) => {
    return (
      item?.image ||
      item?.img ||
      item?.imageUrl ||
      item?.photo ||
      item?.thumbnail ||
      "/default-coffee.jpg"
    );
  };

  const handleReorder = (e, order) => {
    e.stopPropagation();

    if (!order?.items?.length) return;

    try {
      reorder(order.items);
      setPage("menu");
    } catch (err) {
      console.error("Reorder failed:", err);
    }
  };

  return (
    <>
      <style>{`
        .orders-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 50% -10%,
              rgba(196,149,106,0.10),
              transparent 42%
            ),
            #FAF6F0;
          padding: 92px 20px 70px;
          box-sizing: border-box;
          color: #1A0B05;
        }

        .orders-shell {
          width: 100%;
          max-width: 920px;
          margin: 0 auto;
        }

        /* HEADER */

        .orders-header {
          margin-bottom: 34px;
        }

        .orders-back {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: none;
          background: transparent;
          padding: 0;
          margin-bottom: 22px;
          color: #75685F;
          font-family: Inter, sans-serif;
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          transition: color 0.2s ease;
        }

        .orders-back:hover {
          color: #1A0B05;
        }

        .orders-eyebrow {
          margin: 0 0 7px;
          color: #C4956A;
          font-family: Inter, sans-serif;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .orders-title {
          margin: 0;
          color: #1A0B05;
          font-family: "Playfair Display", serif;
          font-size: clamp(2.25rem, 5vw, 3.15rem);
          font-weight: 500;
          letter-spacing: -0.035em;
          line-height: 1.05;
        }

        .orders-subtitle {
          margin: 11px 0 0;
          max-width: 540px;
          color: #75685F;
          font-family: Inter, sans-serif;
          font-size: 0.93rem;
          line-height: 1.6;
        }

        .orders-count {
          margin-top: 17px;
          display: inline-flex;
          align-items: center;
          padding: 7px 12px;
          border-radius: 999px;
          background: #F1E8DE;
          color: #6D594A;
          font-family: Inter, sans-serif;
          font-size: 0.76rem;
          font-weight: 700;
        }

        /* LOADING */

        .orders-loading {
          display: flex;
          justify-content: center;
          padding: 55px 0;
        }

        .loading-card {
          width: 100%;
          background: rgba(255,255,255,0.8);
          border: 1px solid #E8DED3;
          border-radius: 24px;
          padding: 34px;
          text-align: center;
          box-sizing: border-box;
        }

        .loading-spinner {
          width: 26px;
          height: 26px;
          margin: 0 auto 14px;
          border: 2px solid #E8DED3;
          border-top-color: #C4956A;
          border-radius: 50%;
          animation: ordersSpin 0.8s linear infinite;
        }

        @keyframes ordersSpin {
          to {
            transform: rotate(360deg);
          }
        }

        .loading-text {
          margin: 0;
          color: #75685F;
          font-family: Inter, sans-serif;
          font-size: 0.88rem;
        }

        /* ERROR */

        .orders-error {
          padding: 28px;
          border: 1px solid #E8D4CD;
          border-radius: 22px;
          background: #FFF9F7;
          text-align: center;
        }

        .orders-error h3 {
          margin: 0 0 7px;
          font-family: "Playfair Display", serif;
          font-size: 1.35rem;
          font-weight: 500;
          color: #5D2518;
        }

        .orders-error p {
          margin: 0;
          color: #8B665D;
          font-family: Inter, sans-serif;
          font-size: 0.86rem;
        }

        /* EMPTY */

        .empty-orders {
          padding: 68px 28px;
          background: rgba(255,255,255,0.82);
          border: 1px solid #E8DED3;
          border-radius: 28px;
          text-align: center;
          box-shadow: 0 12px 35px rgba(26,11,5,0.035);
        }

        .empty-icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #F3EAE1;
          font-size: 1.65rem;
        }

        .empty-orders h2 {
          margin: 0 0 8px;
          color: #1A0B05;
          font-family: "Playfair Display", serif;
          font-size: 1.7rem;
          font-weight: 500;
        }

        .empty-orders p {
          max-width: 360px;
          margin: 0 auto 23px;
          color: #75685F;
          font-family: Inter, sans-serif;
          font-size: 0.87rem;
          line-height: 1.6;
        }

        .empty-menu-btn {
          border: none;
          background: #1A0B05;
          color: #fff;
          padding: 11px 20px;
          border-radius: 12px;
          font-family: Inter, sans-serif;
          font-size: 0.84rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.2s ease, background 0.2s ease;
        }

        .empty-menu-btn:hover {
          background: #2C1710;
          transform: translateY(-1px);
        }

        /* ORDER LIST */

        .orders-list {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .order-card {
          position: relative;
          background: rgba(255,255,255,0.94);
          border: 1px solid #E8DED3;
          border-radius: 24px;
          padding: 22px;
          box-sizing: border-box;
          box-shadow:
            0 10px 30px rgba(26,11,5,0.035),
            0 2px 7px rgba(26,11,5,0.02);
          cursor: pointer;
          transition:
            transform 0.22s ease,
            box-shadow 0.22s ease,
            border-color 0.22s ease;
        }

        .order-card:hover {
          transform: translateY(-2px);
          border-color: #D8C5B4;
          box-shadow:
            0 15px 38px rgba(26,11,5,0.06),
            0 3px 9px rgba(26,11,5,0.025);
        }

        .order-card:active {
          transform: translateY(0);
        }

        .order-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
          padding-bottom: 17px;
          border-bottom: 1px solid #F0EAE3;
        }

        .order-reference {
          min-width: 0;
        }

        .order-label {
          margin: 0 0 5px;
          color: #A08F83;
          font-family: Inter, sans-serif;
          font-size: 0.69rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .order-number {
          margin: 0;
          color: #1A0B05;
          font-family: Inter, sans-serif;
          font-size: 0.87rem;
          font-weight: 800;
          letter-spacing: 0.025em;
        }

        .order-date {
          margin: 5px 0 0;
          color: #8C7D72;
          font-family: Inter, sans-serif;
          font-size: 0.75rem;
        }

        /* STATUS */

        .order-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
          padding: 7px 10px;
          border-radius: 999px;
          font-family: Inter, sans-serif;
          font-size: 0.7rem;
          font-weight: 800;
          white-space: nowrap;
        }

        .status-new {
          background: #F1E8DE;
          color: #73553E;
        }

        .status-preparing {
          background: #FFF4D9;
          color: #987019;
        }

        .status-delivery {
          background: #E9F1F4;
          color: #3F6470;
        }

        .status-delivered {
          background: #E8F2EA;
          color: #4A7A5B;
        }

        .status-cancelled {
          background: #FCEAE6;
          color: #A14C3B;
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: currentColor;
        }

        /* ITEMS */

        .order-items {
          display: flex;
          flex-direction: column;
          gap: 13px;
          padding: 18px 0;
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
          background: #F1E9E1;
        }

        .item-image {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .item-details {
          min-width: 0;
          flex: 1;
        }

        .item-name {
          margin: 0 0 4px;
          color: #2A1710;
          font-family: "Playfair Display", serif;
          font-size: 1rem;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .item-meta {
          margin: 0;
          color: #8C7D72;
          font-family: Inter, sans-serif;
          font-size: 0.75rem;
        }

        .item-price {
          flex-shrink: 0;
          color: #4C392E;
          font-family: Inter, sans-serif;
          font-size: 0.82rem;
          font-weight: 700;
        }

        .more-items {
          margin: -2px 0 0 71px;
          color: #A08F83;
          font-family: Inter, sans-serif;
          font-size: 0.73rem;
          font-weight: 600;
        }

        /* FOOTER */

        .order-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding-top: 16px;
          border-top: 1px solid #F0EAE3;
        }

        .order-total-label {
          margin: 0 0 3px;
          color: #9B8B80;
          font-family: Inter, sans-serif;
          font-size: 0.69rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }

        .order-total {
          margin: 0;
          color: #1A0B05;
          font-family: Inter, sans-serif;
          font-size: 1.08rem;
          font-weight: 800;
        }

        .reorder-btn {
          flex-shrink: 0;
          border: 1px solid #D8C5B4;
          background: #1A0B05;
          color: #FFFFFF;
          padding: 10px 18px;
          border-radius: 12px;
          font-family: Inter, sans-serif;
          font-size: 0.78rem;
          font-weight: 800;
          cursor: pointer;
          transition:
            background 0.2s ease,
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .reorder-btn:hover {
          background: #2C1710;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(26,11,5,0.12);
        }

        .reorder-btn:active {
          transform: translateY(0);
        }

        @media (max-width: 640px) {
          .orders-page {
            padding: 78px 14px 50px;
          }

          .orders-header {
            margin-bottom: 25px;
          }

          .order-card {
            padding: 17px;
            border-radius: 20px;
          }

          .order-top {
            gap: 9px;
          }

          .order-status {
            padding: 6px 8px;
            font-size: 0.64rem;
          }

          .order-footer {
            align-items: flex-end;
          }

          .reorder-btn {
            padding: 9px 15px;
          }

          .item-image-wrap {
            width: 52px;
            height: 52px;
            flex-basis: 52px;
          }

          .more-items {
            margin-left: 65px;
          }
        }

        @media (max-width: 400px) {
          .order-status {
            max-width: 105px;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .order-number {
            font-size: 0.8rem;
          }
        }
      `}</style>

      <main className="orders-page">
        <div className="orders-shell">

          {/* HEADER */}
          <header className="orders-header">
            <button
              className="orders-back"
              type="button"
              onClick={() => setPage("menu")}
            >
              <ArrowLeft size={16} />
              Back to Menu
            </button>

            <p className="orders-eyebrow">
              Your Brewed
            </p>

            <h1 className="orders-title">
              Order Journey
            </h1>

            <p className="orders-subtitle">
              A little history of every cup, bite and moment
              you've enjoyed with Brewed.
            </p>

            {!loading && !error && orders.length > 0 && (
              <div className="orders-count">
                {orders.length}{" "}
                {orders.length === 1 ? "order" : "orders"}
              </div>
            )}
          </header>

          {/* LOADING */}
          {loading && (
            <div className="orders-loading">
              <div className="loading-card">
                <div className="loading-spinner" />
                <p className="loading-text">
                  Brewing your order history...
                </p>
              </div>
            </div>
          )}

          {/* ERROR */}
          {!loading && error && (
            <div className="orders-error">
              <h3>Couldn't load your orders</h3>
              <p>{error}</p>
            </div>
          )}

          {/* EMPTY */}
          {!loading && !error && orders.length === 0 && (
            <div className="empty-orders">
              <div className="empty-icon">
                ☕
              </div>

              <h2>
                No orders yet
              </h2>

              <p>
                Your next favourite coffee might just be
                a few clicks away.
              </p>

              <button
                className="empty-menu-btn"
                type="button"
                onClick={() => setPage("menu")}
              >
                Explore Menu
              </button>
            </div>
          )}

          {/* ORDERS */}
          {!loading && !error && orders.length > 0 && (
            <section className="orders-list">
              {orders.map((order) => {
                const status = getStatus(order.status);
                const items = Array.isArray(order.items)
                  ? order.items
                  : [];

                const visibleItems = items.slice(0, 3);
                const remainingItems =
                  Math.max(0, items.length - 3);

                return (
                  <article
                    className="order-card"
                    key={order.id}
                    onClick={() => setPage("menu")}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" ||
                        e.key === " "
                      ) {
                        e.preventDefault();
                        setPage("menu");
                      }
                    }}
                  >

                    {/* ORDER HEADER */}
                    <div className="order-top">
                      <div className="order-reference">
                        <p className="order-label">
                          Order
                        </p>

                        <p className="order-number">
                          #{order.id.slice(-7).toUpperCase()}
                        </p>

                        <p className="order-date">
                          {formatDate(order.createdAt)}
                          {formatTime(order.createdAt)
                            ? ` • ${formatTime(order.createdAt)}`
                            : ""}
                        </p>
                      </div>

                      {/* DYNAMIC STATUS */}
                      <div
                        className={`order-status ${status.className}`}
                      >
                        {status.icon}
                        {status.label}
                      </div>
                    </div>

                    {/* ITEMS */}
                    <div className="order-items">
                      {visibleItems.map((item, index) => (
                        <div
                          className="order-item"
                          key={
                            item.id ||
                            item.firestoreId ||
                            `${item.name}-${index}`
                          }
                        >
                          <div className="item-image-wrap">
                            <img
                              className="item-image"
                              src={getItemImage(item)}
                              alt={item.name || "Ordered item"}
                              loading="lazy"
                              onError={(e) => {
                                if (
                                  e.currentTarget.src.endsWith(
                                    "/default-coffee.jpg"
                                  )
                                ) {
                                  return;
                                }

                                e.currentTarget.src =
                                  "/default-coffee.jpg";
                              }}
                            />
                          </div>

                          <div className="item-details">
                            <p className="item-name">
                              {item.name || "Brewed item"}
                            </p>

                            <p className="item-meta">
                              {item.qty || 1} ×{" "}
                              {item.size || "Regular"}
                            </p>
                          </div>

                          <span className="item-price">
                            ₹
                            {Number(
                              item.price || 0
                            ).toLocaleString("en-IN")}
                          </span>
                        </div>
                      ))}

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
                          Total
                        </p>

                        <p className="order-total">
                          ₹
                          {Number(
                            order.total || 0
                          ).toLocaleString("en-IN")}
                        </p>
                      </div>

                      {/* CLEAN REORDER — NO ARROW */}
                      <button
                        className="reorder-btn"
                        type="button"
                        onClick={(e) =>
                          handleReorder(e, order)
                        }
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
