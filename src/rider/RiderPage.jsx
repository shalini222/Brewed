import React, { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

import { db, auth } from "../firebase";

export default function RiderPage({setPage, setActivePage}) {
  const [rider, setRider] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrder, setUpdatingOrder] = useState(null);

  // --------------------------------------------------
  // Get logged-in rider
  // --------------------------------------------------

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setRider(null);
        setLoading(false);
        return;
      }

      // Rider document ID = Firebase Auth UID
      const riderRef = doc(db, "riders", user.uid);

      const unsubscribeRider = onSnapshot(
        riderRef,
        (snapshot) => {
          if (snapshot.exists()) {
            setRider({
              id: snapshot.id,
              ...snapshot.data(),
            });
          } else {
            // Fallback if rider document doesn't exist
            setRider({
              id: user.uid,
              name: user.displayName || "Rider",
              phone: user.phoneNumber || "",
            });
          }

          setLoading(false);
        },
        (error) => {
          console.error("Rider listener error:", error);
          setLoading(false);
        }
      );

      return () => unsubscribeRider();
    });

    return () => unsubscribeAuth();
  }, []);

  // --------------------------------------------------
  // Listen for this rider's orders
  // --------------------------------------------------

  useEffect(() => {
    if (!rider?.id) return;

    const ordersQuery = query(
      collection(db, "orders"),
      where("riderId", "==", rider.id)
    );

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const data = snapshot.docs
          .map((orderDoc) => ({
            id: orderDoc.id,
            ...orderDoc.data(),
          }))
          .filter(
            (order) =>
              order.status === "Assigned to Rider" ||
              order.status === "Out for Delivery"
          )
          .sort(
            (a, b) =>
              (b.riderAssignedAt?.seconds || 0) -
              (a.riderAssignedAt?.seconds || 0)
          );

        setOrders(data);
      },
      (error) => {
        console.error("Rider orders listener error:", error);
      }
    );

    return () => unsubscribe();
  }, [rider?.id]);

  // --------------------------------------------------
  // Update delivery status
  // --------------------------------------------------

  async function updateDeliveryStatus(order, status) {
    try {
      setUpdatingOrder(order.id);

      await updateDoc(doc(db, "orders", order.id), {
        status,

        ...(status === "Out for Delivery"
          ? {
              deliveryStartedAt: serverTimestamp(),
              trackingUpdatedAt: serverTimestamp(),
            }
          : {}),

        ...(status === "Delivered"
          ? {
              deliveredAt: serverTimestamp(),
              trackingUpdatedAt: serverTimestamp(),
            }
          : {}),
      });
    } catch (error) {
      console.error("Error updating delivery:", error);
      alert("Failed to update delivery status.");
    } finally {
      setUpdatingOrder(null);
    }
  }

  // --------------------------------------------------
  // Loading
  // --------------------------------------------------

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.centerMessage}>
          Loading rider dashboard...
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // Not logged in
  // --------------------------------------------------

  if (!rider) {
    return (
      <div style={styles.page}>
        <div style={styles.centerMessage}>
          Please log in to access the rider dashboard.
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // Dashboard
  // --------------------------------------------------

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* HEADER */}
        <div style={styles.header}>
          <div>
            <p style={styles.eyebrow}>RIDER DASHBOARD</p>

            <h1 style={styles.title}>
              Hello, {rider.name || "Rider"} 👋
            </h1>

            <p style={styles.subtitle}>
              Your assigned deliveries
            </p>
          </div>

          <div style={styles.statusBadge}>
            <span style={styles.statusDot} />
            Active
          </div>
        </div>

        {/* SUMMARY */}
        <div style={styles.summaryCard}>
          <div>
            <p style={styles.summaryLabel}>
              ACTIVE DELIVERIES
            </p>

            <h2 style={styles.summaryNumber}>
              {orders.length}
            </h2>
          </div>

          <div style={styles.summaryIcon}>
            🛵
          </div>
        </div>

        {/* ORDERS */}
        {orders.length === 0 ? (
          <div style={styles.emptyCard}>
            <div style={styles.emptyIcon}>
              🛵
            </div>

            <h2 style={styles.emptyTitle}>
              No deliveries assigned
            </h2>

            <p style={styles.emptyText}>
              New deliveries will appear here when they are assigned to you.
            </p>
          </div>
        ) : (
          <div>
            <h2 style={styles.sectionTitle}>
              Deliveries
            </h2>

            <div style={styles.orders}>
              {orders.map((order) => (
                <DeliveryCard
                  key={order.id}
                  order={order}
                  updating={updatingOrder === order.id}
                  onUpdateStatus={updateDeliveryStatus}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// ==================================================
// DELIVERY CARD
// ==================================================

function DeliveryCard({
  order,
  updating,
  onUpdateStatus,
}) {
  const isOutForDelivery =
    order.status === "Out for Delivery";

  return (
    <div style={styles.orderCard}>

      {/* ORDER HEADER */}
      <div style={styles.orderHeader}>
        <div>
          <p style={styles.orderLabel}>
            ORDER
          </p>

          <h3 style={styles.orderId}>
            #{order.id.slice(0, 8)}
          </h3>
        </div>

        <span
          style={{
            ...styles.orderStatus,
            background: isOutForDelivery
              ? "#E3F2FD"
              : "#FFF3CD",
            color: isOutForDelivery
              ? "#1565C0"
              : "#856404",
          }}
        >
          {order.status}
        </span>
      </div>

      {/* CUSTOMER */}
      <div style={styles.customerBox}>
        <p style={styles.customerName}>
          👤 {order.customer?.name || "Customer"}
        </p>

        {order.customer?.phone && (
          <p style={styles.customerDetail}>
            📞 {order.customer.phone}
          </p>
        )}

        {order.customer?.address && (
          <p style={styles.customerDetail}>
            📍 {order.customer.address}
          </p>
        )}

        {order.customer?.instructions && (
          <p style={styles.instructions}>
            💬 {order.customer.instructions}
          </p>
        )}
      </div>

      {/* ITEMS */}
      <h4 style={styles.itemsTitle}>
        Order Items
      </h4>

      <div style={styles.items}>
        {order.items?.map((item, index) => {
          const quantity =
            item.qty || item.quantity || 1;

          return (
            <div
              key={index}
              style={styles.item}
            >
              <div style={{ flex: 1 }}>
                <p style={styles.itemName}>
                  {quantity} × {item.name}
                </p>

                <p style={styles.itemDetails}>
                  {item.size && `Size: ${item.size}`}
                  {item.milk && ` • ${item.milk}`}
                  {item.temperature &&
                    ` • ${item.temperature}`}
                </p>
              </div>

              <span style={styles.itemPrice}>
                ₹{quantity * Number(item.price || 0)}
              </span>
            </div>
          );
        })}
      </div>

      {/* PAYMENT */}
      <div style={styles.paymentBox}>
        <div>
          <span style={styles.paymentLabel}>
            Payment
          </span>

          <strong>
            {order.paymentMethod || "N/A"}
          </strong>
        </div>

        <div style={{ textAlign: "right" }}>
          <span style={styles.paymentLabel}>
            Total
          </span>

          <strong style={styles.total}>
            ₹{order.total || 0}
          </strong>
        </div>
      </div>

      {/* ACTION */}
      {!isOutForDelivery ? (
        <button
          disabled={updating}
          onClick={() =>
            onUpdateStatus(
              order,
              "Out for Delivery"
            )
          }
          style={{
            ...styles.primaryButton,
            opacity: updating ? 0.6 : 1,
          }}
        >
          {updating
            ? "Starting..."
            : "🛵 Start Delivery"}
        </button>
      ) : (
        <button
          disabled={updating}
          onClick={() =>
            onUpdateStatus(
              order,
              "Delivered"
            )
          }
          style={{
            ...styles.deliveredButton,
            opacity: updating ? 0.6 : 1,
          }}
        >
          {updating
            ? "Updating..."
            : "✅ Mark Delivered"}
        </button>
      )}
    </div>
  );
}


// ==================================================
// STYLES
// ==================================================

const styles = {
  page: {
    minHeight: "100vh",
    background: "#F7F4EF",
    padding: "30px 20px",
    color: "#3B1A08",
  },

  container: {
    maxWidth: 800,
    margin: "0 auto",
  },

  centerMessage: {
    textAlign: "center",
    padding: 60,
    color: "#70645C",
    fontSize: 16,
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 20,
    marginBottom: 28,
  },

  eyebrow: {
    margin: 0,
    color: "#9E8E85",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "1px",
  },

  title: {
    margin: "6px 0 4px",
    fontFamily: "Playfair Display",
    fontSize: 30,
    color: "#3B1A08",
  },

  subtitle: {
    margin: 0,
    color: "#70645C",
    fontSize: 14,
  },

  statusBadge: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    background: "#E8F5E9",
    color: "#2E7D32",
    padding: "8px 14px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 700,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#2E7D32",
  },

  summaryCard: {
    background: "#3B1A08",
    color: "white",
    borderRadius: 22,
    padding: 24,
    marginBottom: 32,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  summaryLabel: {
    margin: 0,
    fontSize: 11,
    letterSpacing: "1px",
    opacity: 0.65,
    fontWeight: 700,
  },

  summaryNumber: {
    margin: "4px 0 0",
    fontSize: 32,
  },

  summaryIcon: {
    fontSize: 38,
  },

  sectionTitle: {
    fontFamily: "Playfair Display",
    fontSize: 22,
    marginBottom: 16,
  },

  orders: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },

  orderCard: {
    background: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    border: "1px solid #EEE6DD",
    boxShadow: "0 8px 24px rgba(0,0,0,.05)",
  },

  orderHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },

  orderLabel: {
    margin: 0,
    fontSize: 11,
    color: "#9E8E85",
    fontWeight: 700,
    letterSpacing: "1px",
  },

  orderId: {
    margin: "4px 0 0",
    fontFamily: "Playfair Display",
    fontSize: 20,
  },

  orderStatus: {
    padding: "7px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
  },

  customerBox: {
    background: "#FCF8F3",
    borderRadius: 16,
    padding: 18,
    marginBottom: 22,
    border: "1px solid #F2ECE5",
  },

  customerName: {
    margin: "0 0 8px",
    fontWeight: 700,
    fontSize: 16,
  },

  customerDetail: {
    margin: "5px 0",
    color: "#5C4F47",
    fontSize: 14,
  },

  instructions: {
    margin: "10px 0 0",
    color: "#8C7B70",
    fontSize: 13,
    fontStyle: "italic",
  },

  itemsTitle: {
    margin: "0 0 12px",
    fontFamily: "Playfair Display",
    fontSize: 16,
  },

  items: {
    display: "flex",
    flexDirection: "column",
    marginBottom: 20,
  },

  item: {
    display: "flex",
    gap: 12,
    padding: "12px 0",
    borderBottom: "1px solid #F2ECE5",
  },

  itemName: {
    margin: 0,
    fontWeight: 600,
    fontSize: 14,
  },

  itemDetails: {
    margin: "4px 0 0",
    color: "#8C7B70",
    fontSize: 12,
  },

  itemPrice: {
    fontWeight: 600,
    fontSize: 14,
  },

  paymentBox: {
    background: "#F8F3ED",
    borderRadius: 14,
    padding: 16,
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  paymentLabel: {
    display: "block",
    color: "#8C7B70",
    fontSize: 11,
    marginBottom: 4,
  },

  total: {
    fontSize: 18,
  },

  primaryButton: {
    width: "100%",
    background: "#1565C0",
    color: "white",
    border: "none",
    padding: "15px 20px",
    borderRadius: 13,
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
  },

  deliveredButton: {
    width: "100%",
    background: "#27AE60",
    color: "white",
    border: "none",
    padding: "15px 20px",
    borderRadius: 13,
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
  },

  emptyCard: {
    background: "#FFFFFF",
    borderRadius: 24,
    padding: "50px 25px",
    textAlign: "center",
    border: "1px solid #EEE6DD",
  },

  emptyIcon: {
    fontSize: 42,
    marginBottom: 12,
  },

  emptyTitle: {
    fontFamily: "Playfair Display",
    fontSize: 22,
    margin: "0 0 8px",
  },

  emptyText: {
    margin: 0,
    color: "#70645C",
    fontSize: 14,
    lineHeight: 1.6,
  },
};
