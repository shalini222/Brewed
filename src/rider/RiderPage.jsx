import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

import { db, auth } from "../firebase";

export default function RiderPage({setPage, setActivePage}) {
  const [currentUser, setCurrentUser] = useState(null);
  const [rider, setRider] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [updatingOrder, setUpdatingOrder] = useState(null);
  const [error, setError] = useState("");

  // =====================================================
  // FIND LOGGED-IN RIDER
  // =====================================================

  useEffect(() => {
    let unsubscribeRider = null;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) {
          setCurrentUser(null);
          setRider(null);
          setLoading(false);
          return;
        }

        setCurrentUser(user);
        setLoading(true);
        setError("");

        try {
          /*
           * Your Rider Management creates random Firestore IDs:
           *
           * riders/{randomId}
           *
           * So we identify the rider using their email.
           */

          const ridersQuery = query(
            collection(db, "riders"),
            where("email", "==", user.email)
          );

          const snapshot = await getDocs(ridersQuery);

          if (snapshot.empty) {
            setError(
              "No rider profile is linked to this login."
            );
            setRider(null);
            setLoading(false);
            return;
          }

          const riderDoc = snapshot.docs[0];

          setRider({
            id: riderDoc.id,
            ...riderDoc.data(),
          });

          setLoading(false);

          /*
           * Keep rider profile live.
           */
          unsubscribeRider = onSnapshot(
            doc(db, "riders", riderDoc.id),
            (riderSnapshot) => {
              if (riderSnapshot.exists()) {
                setRider({
                  id: riderSnapshot.id,
                  ...riderSnapshot.data(),
                });
              }
            }
          );
        } catch (err) {
          console.error("Error finding rider:", err);

          setError(
            "Unable to load your rider profile."
          );

          setLoading(false);
        }
      }
    );

    return () => {
      unsubscribeAuth();

      if (unsubscribeRider) {
        unsubscribeRider();
      }
    };
  }, []);

  // =====================================================
  // LOAD ASSIGNED ORDERS
  // =====================================================

 useEffect(() => {
  if (!rider?.id) return;

  setOrdersLoading(true);

  const ordersQuery = query(
    collection(db, "orders"),
    where("riderId", "==", rider.id)
  );

  const unsubscribe = onSnapshot(
    ordersQuery,
    (snapshot) => {
      const riderOrders = snapshot.docs
        .map((orderDoc) => ({
          id: orderDoc.id,
          ...orderDoc.data(),
        }))
        .sort(
          (a, b) =>
            (b.riderAssignedAt?.seconds || 0) -
            (a.riderAssignedAt?.seconds || 0)
        );

      setOrders(riderOrders);
      setOrdersLoading(false);
    },
    (err) => {
      console.error("Error loading rider orders:", err);
      setOrdersLoading(false);
    }
  );

  return () => unsubscribe();
}, [rider?.id]);

  // =====================================================
  // UPDATE DELIVERY STATUS
  // =====================================================

  const updateDeliveryStatus = async (
    order,
    newStatus
  ) => {
    try {
      setUpdatingOrder(order.id);

      const orderRef = doc(
        db,
        "orders",
        order.id
      );

      const updateData = {
        status: newStatus,
        trackingUpdatedAt: serverTimestamp(),
      };

      if (newStatus === "Out for Delivery") {
        updateData.deliveryStartedAt =
          serverTimestamp();

        updateData.deliveryPartnerMessage =
          "Your coffee is on the way! ☕";
      }

      if (newStatus === "Delivered") {
        updateData.deliveredAt =
          serverTimestamp();

        updateData.deliveryPartnerMessage =
          "Your order has been delivered. Enjoy! ☕";
      }

      await updateDoc(orderRef, updateData);
    } catch (err) {
      console.error(
        "Error updating delivery status:",
        err
      );

      alert(
        "Failed to update delivery status."
      );
    } finally {
      setUpdatingOrder(null);
    }
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.center}>
          <div style={styles.loadingIcon}>
            🛵
          </div>

          <p style={styles.muted}>
            Loading rider dashboard...
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // NOT LOGGED IN
  // =====================================================

  if (!currentUser) {
    return (
      <div style={styles.page}>
        <div style={styles.center}>
          <div style={styles.emptyIcon}>
            🔐
          </div>

          <h2 style={styles.emptyTitle}>
            Rider Login Required
          </h2>

          <p style={styles.muted}>
            Please log in to access your deliveries.
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // RIDER PROFILE NOT FOUND
  // =====================================================

  if (!rider) {
    return (
      <div style={styles.page}>
        <div style={styles.center}>
          <div style={styles.emptyIcon}>
            ⚠️
          </div>

          <h2 style={styles.emptyTitle}>
            Rider Profile Not Found
          </h2>

          <p style={styles.muted}>
            {error ||
              "Your account is not linked to a rider profile."}
          </p>

          <p style={styles.emailText}>
            Logged in as: {currentUser.email}
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // INACTIVE RIDER
  // =====================================================

  if (rider.status !== "Active") {
    return (
      <div style={styles.page}>
        <div style={styles.center}>
          <div style={styles.emptyIcon}>
            ⏸️
          </div>

          <h2 style={styles.emptyTitle}>
            Account Inactive
          </h2>

          <p style={styles.muted}>
            Your rider account is currently inactive.
          </p>

          <p style={styles.emailText}>
            Please contact the café administrator.
          </p>
        </div>
      </div>
    );
  }



  const activeOrders = orders.filter(
  (order) =>
    order.status === "Assigned to Rider" ||
    order.status === "Out for Delivery"
);


  const deliveredOrders = orders.filter(
  (order) => order.status === "Delivered"
);

  // =====================================================
  // DASHBOARD
  // =====================================================

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* HEADER */}

        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>
              RIDER DASHBOARD
            </p>

            <h1 style={styles.title}>
              Hello, {rider.name || "Rider"} 👋
            </h1>

            <p style={styles.subtitle}>
              Manage your assigned deliveries.
            </p>
          </div>

          <div style={styles.activeBadge}>
            <span style={styles.activeDot} />
            Active
          </div>
        </header>

        {/* RIDER INFO */}

        <div style={styles.riderCard}>
          <div style={styles.riderIcon}>
            🛵
          </div>

          <div style={{ flex: 1 }}>
            <h3 style={styles.riderName}>
              {rider.name}
            </h3>

            <p style={styles.riderDetails}>
              {rider.vehicleType || "Vehicle"}
              {rider.vehicleNumber
                ? ` • ${rider.vehicleNumber}`
                : ""}
            </p>
          </div>

          <div style={styles.deliveryCount}>
            <strong>
              {activeOrders.length}
            </strong>

            <span>
              Active
               </span>
               <small>
    {deliveredOrders.length} Delivered
  </small>
           
          </div>
        </div>

        {/* DELIVERY SECTION */}
{/* DELIVERY SECTION */}

<div style={styles.sectionHeader}>
  <div>
    <p style={styles.sectionEyebrow}>
      TODAY
    </p>

    <h2 style={styles.sectionTitle}>
      My Deliveries
    </h2>
  </div>

  <span style={styles.countBadge}>
    {activeOrders.length}
  </span>
</div>

{/* ACTIVE DELIVERIES */}

{ordersLoading ? (
  <div style={styles.emptyCard}>
    <p style={styles.muted}>
      Loading deliveries...
    </p>
  </div>
) : activeOrders.length === 0 ? (
  <div style={styles.emptyCard}>
    <div style={styles.emptyIcon}>
      ☕
    </div>

    <h2 style={styles.emptyTitle}>
      No deliveries assigned
    </h2>

    <p style={styles.muted}>
      New deliveries will appear here
      when they are assigned to you.
    </p>
  </div>
) : (
  <div style={styles.orderList}>
    {activeOrders.map((order) => (
      <DeliveryCard
        key={order.id}
        order={order}
        updating={updatingOrder === order.id}
        onUpdateStatus={updateDeliveryStatus}
      />
    ))}
  </div>
)}

{/* DELIVERY HISTORY */}

{deliveredOrders.length > 0 && (
  <div style={{ marginTop: "40px" }}>

    <div style={styles.sectionHeader}>
      <div>
        <p style={styles.sectionEyebrow}>
          COMPLETED
        </p>

        <h2 style={styles.sectionTitle}>
          Delivery History
        </h2>
      </div>

      <span style={styles.countBadge}>
        {deliveredOrders.length}
      </span>
    </div>

    <div style={styles.orderList}>
      {deliveredOrders.map((order) => (
        <DeliveryCard
          key={order.id}
          order={order}
          updating={false}
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


// =====================================================
// DELIVERY CARD
// =====================================================

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

          <p style={styles.orderTime}>
            {order.createdAt?.toDate
              ? order.createdAt
                  .toDate()
                  .toLocaleString()
              : "Recently placed"}
          </p>
        </div>

        <span
          style={{
            ...styles.statusBadge,
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
          👤 {order.customer?.name ||
            "Customer"}
        </p>

        {order.customer?.phone && (
          <p style={styles.customerDetail}>
            📞 {order.customer.phone}
          </p>
        )}

        {order.customer?.address && (
          <p style={styles.address}>
            📍 {order.customer.address}
          </p>
        )}

        {order.customer?.instructions && (
          <div style={styles.instructions}>
            <strong>
              Customer note
            </strong>

            <p>
              {order.customer.instructions}
            </p>
          </div>
        )}
      </div>

      {/* ITEMS */}

      <h4 style={styles.itemsTitle}>
        Order Items
      </h4>

      <div style={styles.items}>
        {order.items?.map(
          (item, index) => {
            const quantity =
              item.qty ||
              item.quantity ||
              1;

            const itemTotal =
              quantity *
              Number(item.price || 0);

            return (
              <div
                key={index}
                style={styles.item}
              >
                <div
                  style={{
                    flex: 1,
                  }}
                >
                  <p
                    style={
                      styles.itemName
                    }
                  >
                    {quantity} ×{" "}
                    {item.name}
                  </p>

                  <div
                    style={
                      styles.itemOptions
                    }
                  >
                    {item.size && (
                      <span>
                        Size: {item.size}
                      </span>
                    )}

                    {item.milk && (
                      <span>
                        Milk: {item.milk}
                      </span>
                    )}

                    {item.temperature &&
                      typeof item.temperature ===
                        "string" && (
                        <span>
                          {
                            item.temperature
                          }
                        </span>
                      )}

                    {item.sweetness && (
                      <span>
                        Sweetness:{" "}
                        {typeof item.sweetness ===
                        "string"
                          ? item.sweetness
                          : item.sweetness
                              .name}
                      </span>
                    )}

                    {Array.isArray(
                      item.extras
                    ) &&
                      item.extras.length >
                        0 && (
                        <span>
                          Extras:{" "}
                          {item.extras
                            .map(
                              (
                                extra
                              ) =>
                                typeof extra ===
                                "string"
                                  ? extra
                                  : extra.name
                            )
                            .join(
                              ", "
                            )}
                        </span>
                      )}
                  </div>
                </div>

                <strong
                  style={
                    styles.itemPrice
                  }
                >
                  ₹{itemTotal}
                </strong>
              </div>
            );
          }
        )}
      </div>

      {/* PAYMENT */}

      <div style={styles.paymentBox}>
        <div>
          <span
            style={
              styles.paymentLabel
            }
          >
            PAYMENT
          </span>

          <strong>
            {order.paymentMethod ||
              "N/A"}
          </strong>
        </div>

        <div
          style={{
            textAlign: "right",
          }}
        >
          <span
            style={
              styles.paymentLabel
            }
          >
            TOTAL
          </span>

          <strong
            style={styles.total}
          >
            ₹{order.total || 0}
          </strong>
        </div>
      </div>

      {/* ACTION */}

      {isOutForDelivery ? (
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
            opacity: updating
              ? 0.6
              : 1,
          }}
        >
          {updating
            ? "Updating..."
            : "✅ Mark Delivered"}
        </button>
      ) : (
        <button
          disabled={updating}
          onClick={() =>
            onUpdateStatus(
              order,
              "Out for Delivery"
            )
          }
          style={{
            ...styles.startButton,
            opacity: updating
              ? 0.6
              : 1,
          }}
        >
          {updating
            ? "Starting..."
            : "🛵 Start Delivery"}
        </button>
      )}
    </div>
  );
}


// =====================================================
// STYLES
// =====================================================

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

  center: {
    maxWidth: 500,
    margin: "0 auto",
    textAlign: "center",
    padding: "80px 20px",
  },

  loadingIcon: {
    fontSize: 42,
    marginBottom: 15,
  },

  emptyIcon: {
    fontSize: 44,
    marginBottom: 12,
  },

  emptyTitle: {
    fontFamily:
      "Playfair Display, serif",
    fontSize: 24,
    margin:
      "0 0 10px",
  },

  muted: {
    color: "#70645C",
    fontSize: 14,
    lineHeight: 1.6,
  },

  emailText: {
    color: "#8C7B70",
    fontSize: 13,
    marginTop: 15,
  },

  header: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems:
      "flex-start",
    gap: 20,
    marginBottom: 25,
  },

  eyebrow: {
    margin: 0,
    color: "#9E8E85",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "1.2px",
  },

  title: {
    margin:
      "6px 0 5px",
    fontFamily:
      "Playfair Display, serif",
    fontSize: 30,
    color: "#3B1A08",
  },

  subtitle: {
    margin: 0,
    color: "#70645C",
    fontSize: 14,
  },

  activeBadge: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    background: "#E8F5E9",
    color: "#2E7D32",
    padding:
      "8px 14px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
  },

  activeDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#2E7D32",
  },

  riderCard: {
    background: "#3B1A08",
    color: "#fff",
    borderRadius: 22,
    padding: 22,
    display: "flex",
    alignItems: "center",
    gap: 15,
    marginBottom: 32,
  },

  riderIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    background:
      "rgba(255,255,255,0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 27,
  },

  riderName: {
    margin: 0,
    fontSize: 17,
  },

  riderDetails: {
    margin:
      "5px 0 0",
    fontSize: 13,
    opacity: 0.65,
  },

  deliveryCount: {
    textAlign: "right",
    display: "flex",
    flexDirection: "column",
  },

  sectionHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  sectionEyebrow: {
    margin: 0,
    color: "#9E8E85",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "1px",
  },

  sectionTitle: {
    margin:
      "4px 0 0",
    fontFamily:
      "Playfair Display, serif",
    fontSize: 23,
  },

  countBadge: {
    background: "#3B1A08",
    color: "#fff",
    minWidth: 30,
    height: 30,
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
  },

  orderList: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },

  orderCard: {
    background: "#fff",
    borderRadius: 24,
    padding: 24,
    border:
      "1px solid #EEE6DD",
    boxShadow:
      "0 8px 24px rgba(0,0,0,.05)",
  },

  orderHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems:
      "flex-start",
    marginBottom: 20,
  },

  orderLabel: {
    margin: 0,
    color: "#9E8E85",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "1px",
  },

  orderId: {
    margin:
      "4px 0 3px",
    fontFamily:
      "Playfair Display, serif",
    fontSize: 20,
  },

  orderTime: {
    margin: 0,
    color: "#9E8E85",
    fontSize: 11,
  },

  statusBadge: {
    padding:
      "7px 12px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
  },

  customerBox: {
    background: "#FCF8F3",
    borderRadius: 16,
    padding: 18,
    marginBottom: 22,
    border:
      "1px solid #F2ECE5",
  },

  customerName: {
    margin:
      "0 0 9px",
    fontWeight: 700,
    fontSize: 16,
  },

  customerDetail: {
    margin:
      "5px 0",
    color: "#5C4F47",
    fontSize: 14,
  },

  address: {
    margin:
      "8px 0 0",
    color: "#3B1A08",
    fontSize: 14,
    lineHeight: 1.5,
  },

  instructions: {
    marginTop: 13,
    paddingTop: 12,
    borderTop:
      "1px solid #E8DED5",
    color: "#8C7B70",
    fontSize: 12,
  },



  itemsTitle: {
    margin:
      "0 0 10px",
    fontFamily:
      "Playfair Display, serif",
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
    padding:
      "12px 0",
    borderBottom:
      "1px solid #F2ECE5",
  },

  itemName: {
    margin: 0,
    fontWeight: 600,
    fontSize: 14,
  },

  itemOptions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 5,
    color: "#8C7B70",
    fontSize: 11,
  },

  itemPrice: {
    fontSize: 14,
    color: "#3B1A08",
  },

  paymentBox: {
    background: "#F8F3ED",
    borderRadius: 14,
    padding: 16,
    display: "flex",
    justifyContent:
      "space-between",
    marginBottom: 18,
  },

  paymentLabel: {
    display: "block",
    color: "#8C7B70",
    fontSize: 10,
    marginBottom: 4,
    letterSpacing: "0.5px",
  },

  total: {
    fontSize: 18,
  },

  startButton: {
    width: "100%",
    background: "#1565C0",
    color: "#fff",
    border: "none",
    padding:
      "15px 20px",
    borderRadius: 13,
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
  },

  deliveredButton: {
    width: "100%",
    background: "#27AE60",
    color: "#fff",
    border: "none",
    padding:
      "15px 20px",
    borderRadius: 13,
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
  },

  emptyCard: {
    background: "#fff",
    borderRadius: 24,
    padding:
      "55px 25px",
    textAlign: "center",
    border:
      "1px solid #EEE6DD",
  },
};
