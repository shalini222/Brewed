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

export default function RiderPage({ setPage, setActivePage }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [rider, setRider] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [updatingOrder, setUpdatingOrder] = useState(null);
  const [error, setError] = useState("");
  const [showHistory, setShowHistory] = useState(false);

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
        console.error(
          "Error loading rider orders:",
          err
        );

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

      // -----------------------------------------------
      // ACCEPT DELIVERY
      // -----------------------------------------------

      if (newStatus === "Out for Delivery") {
        updateData.deliveryStartedAt =
          serverTimestamp();

        updateData.deliveryAcceptedAt =
          serverTimestamp();

        updateData.deliveryPartnerMessage =
          "Your coffee is on the way! ☕";
      }

      // -----------------------------------------------
      // DELIVERED
      // -----------------------------------------------

      if (newStatus === "Delivered") {
        updateData.deliveredAt =
          serverTimestamp();

        updateData.deliveryPartnerMessage =
          "Your order has been delivered. Enjoy! ☕";
      }

      // -----------------------------------------------
      // CANCELLED BY RIDER
      // -----------------------------------------------

      if (newStatus === "Cancelled") {
        updateData.cancelledAt =
          serverTimestamp();

        updateData.cancelledBy =
          "rider";

        updateData.cancelledByRiderId =
          rider?.id || null;

        updateData.deliveryPartnerMessage =
          "This delivery was cancelled by the rider.";
      }

      await updateDoc(
        orderRef,
        updateData
      );
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

  // =====================================================
  // ORDER GROUPS
  // =====================================================

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

        {/* =================================================
            HEADER
        ================================================= */}

        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>
              RIDER DASHBOARD
            </p>

            <h1 style={styles.title}>
              Hello, {rider.name || "Rider"} 👋
            </h1>

            <p style={styles.subtitle}>
              Your deliveries for today.
            </p>
          </div>

          <div style={styles.activeBadge}>
            <span style={styles.activeDot} />
            ON DUTY
          </div>
        </header>

        {/* =================================================
            RIDER SUMMARY
        ================================================= */}

        <div style={styles.riderCard}>

          <div style={styles.riderIdentity}>
            <div style={styles.riderIcon}>
              🛵
            </div>

            <div>
              <p style={styles.riderEyebrow}>
                RIDER
              </p>

              <h3 style={styles.riderName}>
                {rider.name || "Rider"}
              </h3>

              <p style={styles.riderDetails}>
                {rider.vehicleType || "Vehicle"}

                {rider.vehicleNumber
                  ? ` • ${rider.vehicleNumber}`
                  : ""}
              </p>
            </div>
          </div>

          <div style={styles.riderStats}>
            <div>
              <strong>
                {activeOrders.length}
              </strong>

              <span>
                ACTIVE
              </span>
            </div>

            <div style={styles.statDivider} />

            <button
              onClick={() =>
                setShowHistory(true)
              }
              style={styles.historyButton}
            >
              <strong>
                {deliveredOrders.length}
              </strong>

              <span>
                HISTORY →
              </span>
            </button>
          </div>
        </div>

        {/* =================================================
            ACTIVE DELIVERY HEADER
        ================================================= */}

        <div style={styles.sectionHeader}>
          <div>
            <p style={styles.sectionEyebrow}>
              CURRENT SHIFT
            </p>

            <h2 style={styles.sectionTitle}>
              My Deliveries
            </h2>
          </div>

          <div style={styles.countBadge}>
            {activeOrders.length}
          </div>
        </div>

        {/* =================================================
            ACTIVE DELIVERIES
        ================================================= */}

        {ordersLoading ? (
          <div style={styles.emptyCard}>
            <div style={styles.loadingMini}>
              🛵
            </div>

            <p style={styles.muted}>
              Loading your deliveries...
            </p>
          </div>
        ) : activeOrders.length === 0 ? (
          <div style={styles.emptyCard}>
            <div style={styles.emptyIcon}>
              ☕
            </div>

            <h2 style={styles.emptyTitle}>
              All clear
            </h2>

            <p style={styles.muted}>
              You don't have any active deliveries
              right now.
            </p>

            <span style={styles.emptyHint}>
              New assignments will appear here.
            </span>
          </div>
        ) : (
          <div style={styles.orderList}>
            {activeOrders.map((order) => (
              <DeliveryCard
                key={order.id}
                order={order}
                updating={
                  updatingOrder === order.id
                }
                onUpdateStatus={
                  updateDeliveryStatus
                }
              />
            ))}
          </div>
        )}

        {/* =================================================
            HISTORY DRAWER
        ================================================= */}

        {showHistory && (
          <>
            <div
              onClick={() =>
                setShowHistory(false)
              }
              style={styles.historyBackdrop}
            />

            <aside
              style={styles.historyDrawer}
            >

              {/* DRAWER HEADER */}

              <div style={styles.historyHeader}>
                <div>
                  <p style={styles.sectionEyebrow}>
                    COMPLETED
                  </p>

                  <h2 style={styles.sectionTitle}>
                    Delivery History
                  </h2>

                  <p style={styles.historySubtitle}>
                    {deliveredOrders.length} completed{" "}
                    {deliveredOrders.length === 1
                      ? "delivery"
                      : "deliveries"}
                  </p>
                </div>

                <button
                  onClick={() =>
                    setShowHistory(false)
                  }
                  style={
                    styles.closeHistoryButton
                  }
                >
                  ×
                </button>
              </div>

              {/* HISTORY */}

              <div style={styles.historyList}>
                {deliveredOrders.length === 0 ? (
                  <div style={styles.historyEmpty}>
                    <div style={styles.emptyIcon}>
                      ☕
                    </div>

                    <p style={styles.muted}>
                      No completed deliveries yet.
                    </p>
                  </div>
                ) : (
                  deliveredOrders.map(
                    (order) => (
                      <HistoryCard
                        key={order.id}
                        order={order}
                      />
                    )
                  )
                )}
              </div>

            </aside>
          </>
        )}
      </div>
    </div>
  );
}


// =====================================================
// ACTIVE DELIVERY CARD
// =====================================================

function DeliveryCard({
  order,
  updating,
  onUpdateStatus,
}) {
  const isAssigned =
    order.status === "Assigned to Rider";

  const isOutForDelivery =
    order.status === "Out for Delivery";

  return (
    <div
      style={{
        ...styles.orderCard,
        borderTop: isOutForDelivery
          ? "4px solid #27AE60"
          : "4px solid #C58A52",
      }}
    >

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
            ...(isAssigned
              ? styles.assignedStatus
              : styles.outStatus),
          }}
        >
          {isAssigned
            ? "NEW ASSIGNMENT"
            : "OUT FOR DELIVERY"}
        </span>
      </div>

      {/* CUSTOMER */}

      <div style={styles.customerBox}>

        <div style={styles.customerTop}>
          <div style={styles.customerAvatar}>
            {(order.customer?.name ||
              "C")
              .charAt(0)
              .toUpperCase()}
          </div>

          <div>
            <p style={styles.customerLabel}>
              CUSTOMER
            </p>

            <p style={styles.customerName}>
              {order.customer?.name ||
                "Customer"}
            </p>
          </div>
        </div>

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

      <div style={styles.itemsHeader}>
        <h4 style={styles.itemsTitle}>
          Order Items
        </h4>

        <span style={styles.itemCount}>
          {order.items?.length || 0} items
        </span>
      </div>

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
                <div style={{ flex: 1 }}>

                  <p style={styles.itemName}>
                    {quantity} × {item.name}
                  </p>

                  <div style={styles.itemOptions}>

                    {item.size && (
                      <span>
                        {item.size}
                      </span>
                    )}

                    {item.milk && (
                      <span>
                        {item.milk}
                      </span>
                    )}

                    {item.temperature &&
                      typeof item.temperature ===
                        "string" && (
                        <span>
                          {item.temperature}
                        </span>
                      )}

                    {item.sweetness && (
                      <span>
                        {typeof item.sweetness ===
                        "string"
                          ? item.sweetness
                          : item.sweetness.name}
                      </span>
                    )}

                    {Array.isArray(
                      item.extras
                    ) &&
                      item.extras.length > 0 && (
                        <span>
                          +{" "}
                          {item.extras
                            .map(
                              (extra) =>
                                typeof extra ===
                                "string"
                                  ? extra
                                  : extra.name
                            )
                            .join(", ")}
                        </span>
                      )}

                  </div>
                </div>

                <strong style={styles.itemPrice}>
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
          <span style={styles.paymentLabel}>
            PAYMENT
          </span>

          <strong style={styles.paymentMethod}>
            {order.paymentMethod || "N/A"}
          </strong>
        </div>

        <div style={{ textAlign: "right" }}>
          <span style={styles.paymentLabel}>
            TOTAL
          </span>

          <strong style={styles.total}>
            ₹{order.total || 0}
          </strong>
        </div>

      </div>

      {/* ACTIONS */}

      {isAssigned ? (
        <div style={styles.actionArea}>

          <button
            disabled={updating}
            onClick={() =>
              onUpdateStatus(
                order,
                "Out for Delivery"
              )
            }
            style={{
              ...styles.acceptButton,
              opacity: updating ? 0.6 : 1,
            }}
          >
            {updating
              ? "Accepting..."
              : "✓ Accept Delivery"}
          </button>

          <button
            disabled={updating}
            onClick={() => {
              const confirmed =
                window.confirm(
                  "Are you sure you want to cancel this delivery?"
                );

              if (confirmed) {
                onUpdateStatus(
                  order,
                  "Cancelled"
                );
              }
            }}
            style={{
              ...styles.cancelButton,
              opacity: updating ? 0.6 : 1,
            }}
          >
            Cancel delivery
          </button>

        </div>
      ) : isOutForDelivery ? (
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
            : "✓ Mark Delivered"}
        </button>
      ) : null}

    </div>
  );
}


// =====================================================
// COMPACT HISTORY CARD
// =====================================================

function HistoryCard({ order }) {
  const customerName =
    order.customer?.name ||
    "Customer";

  const itemCount =
    order.items?.reduce(
      (total, item) =>
        total +
        (item.qty ||
          item.quantity ||
          1),
      0
    ) || 0;

  return (
    <div style={styles.historyCard}>

      <div style={styles.historyCardTop}>

        <div>
          <p style={styles.historyOrderId}>
            #{order.id.slice(0, 8)}
          </p>

          <p style={styles.historyCustomer}>
            {customerName}
          </p>
        </div>

        <span style={styles.deliveredBadge}>
          ✓ Delivered
        </span>

      </div>

      <div style={styles.historyCardBottom}>

        <span>
          {itemCount}{" "}
          {itemCount === 1
            ? "item"
            : "items"}
        </span>

        <span>
          ₹{order.total || 0}
        </span>

        <span>
          {order.deliveredAt?.toDate
            ? order.deliveredAt
                .toDate()
                .toLocaleTimeString(
                  [],
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                )
            : "Completed"}
        </span>

      </div>

    </div>
  );
}


// =====================================================
// STYLES
// =====================================================

const styles = {

  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(180deg, #FBF8F4 0%, #F5F0E9 100%)",
    padding: "34px 20px",
    color: "#3B1A08",
  },

  container: {
    maxWidth: 850,
    margin: "0 auto",
  },

  center: {
    maxWidth: 500,
    margin: "0 auto",
    textAlign: "center",
    padding: "90px 20px",
  },

  loadingIcon: {
    fontSize: 42,
    marginBottom: 15,
  },

  loadingMini: {
    fontSize: 32,
    marginBottom: 10,
  },

  emptyIcon: {
    fontSize: 44,
    marginBottom: 12,
  },

  emptyTitle: {
    fontFamily:
      "Playfair Display, serif",
    fontSize: 24,
    margin: "0 0 10px",
    color: "#3B1A08",
  },

  muted: {
    color: "#70645C",
    fontSize: 14,
    lineHeight: 1.6,
  },

  emptyHint: {
    display: "inline-block",
    marginTop: 12,
    color: "#A49387",
    fontSize: 12,
  },

  emailText: {
    color: "#8C7B70",
    fontSize: 13,
    marginTop: 15,
  },

  // HEADER

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 20,
    marginBottom: 28,
  },

  eyebrow: {
    margin: 0,
    color: "#A08F83",
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "1.5px",
  },

  title: {
    margin: "7px 0 5px",
    fontFamily:
      "Playfair Display, serif",
    fontSize: 32,
    fontWeight: 600,
    letterSpacing: "-0.5px",
  },

  subtitle: {
    margin: 0,
    color: "#756961",
    fontSize: 14,
  },

  activeBadge: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#EEF7EF",
    color: "#34723B",
    padding: "9px 14px",
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.7px",
    border: "1px solid #DCECDC",
  },

  activeDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#3E9147",
  },

  // RIDER CARD

  riderCard: {
    background:
      "linear-gradient(135deg, #3B1A08 0%, #54270F 100%)",
    color: "#fff",
    borderRadius: 24,
    padding: "24px 26px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
    marginBottom: 38,
    boxShadow:
      "0 14px 35px rgba(59,26,8,.16)",
  },

  riderIdentity: {
    display: "flex",
    alignItems: "center",
    gap: 15,
  },

  riderIcon: {
    width: 56,
    height: 56,
    borderRadius: 17,
    background:
      "rgba(255,255,255,.10)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 28,
    border:
      "1px solid rgba(255,255,255,.08)",
  },

  riderEyebrow: {
    margin: 0,
    fontSize: 9,
    letterSpacing: "1.5px",
    opacity: 0.5,
    fontWeight: 800,
  },

  riderName: {
    margin: "3px 0 3px",
    fontSize: 18,
    fontWeight: 700,
  },

  riderDetails: {
    margin: 0,
    fontSize: 12,
    opacity: 0.6,
  },

  riderStats: {
    display: "flex",
    alignItems: "center",
    gap: 20,
  },

  riderStatsText: {
    textAlign: "right",
  },

  riderStatsStrong: {
    display: "block",
  },

  statDivider: {
    width: 1,
    height: 38,
    background:
      "rgba(255,255,255,.15)",
  },

  historyButton: {
    border: "none",
    background: "transparent",
    color: "#fff",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 2,
    padding: 0,
  },

  // SECTIONS

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 17,
  },

  sectionEyebrow: {
    margin: 0,
    color: "#A08F83",
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: "1.4px",
  },

  sectionTitle: {
    margin: "4px 0 0",
    fontFamily:
      "Playfair Display, serif",
    fontSize: 24,
    fontWeight: 600,
  },

  countBadge: {
    background: "#3B1A08",
    color: "#fff",
    minWidth: 31,
    height: 31,
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 800,
  },

  // ACTIVE ORDERS

  orderList: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },

  orderCard: {
    background: "#fff",
    borderRadius: 24,
    padding: 25,
    border:
      "1px solid #ECE4DB",
    boxShadow:
      "0 10px 30px rgba(65,43,27,.055)",
  },

  orderHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 15,
    marginBottom: 22,
  },

  orderLabel: {
    margin: 0,
    color: "#A08F83",
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: "1.4px",
  },

  orderId: {
    margin: "4px 0 3px",
    fontFamily:
      "Playfair Display, serif",
    fontSize: 21,
    fontWeight: 600,
  },

  orderTime: {
    margin: 0,
    color: "#9B8D84",
    fontSize: 11,
  },

  statusBadge: {
    padding: "8px 11px",
    borderRadius: 999,
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: ".4px",
    whiteSpace: "nowrap",
  },

  assignedStatus: {
    background: "#FFF3E3",
    color: "#9A5C17",
  },

  outStatus: {
    background: "#EAF6ED",
    color: "#31723B",
  },

  // CUSTOMER

  customerBox: {
    background: "#FCF8F3",
    borderRadius: 17,
    padding: 18,
    marginBottom: 23,
    border:
      "1px solid #F0E7DE",
  },

  customerTop: {
    display: "flex",
    alignItems: "center",
    gap: 11,
    marginBottom: 13,
  },

  customerAvatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "#E9DDD1",
    color: "#5A2D15",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: 14,
  },

  customerLabel: {
    margin: 0,
    color: "#A08F83",
    fontSize: 8,
    fontWeight: 800,
    letterSpacing: "1px",
  },

  customerName: {
    margin: "2px 0 0",
    fontWeight: 700,
    fontSize: 15,
  },

  customerDetail: {
    margin: "6px 0",
    color: "#63564D",
    fontSize: 13,
  },

  address: {
    margin: "8px 0 0",
    color: "#3B1A08",
    fontSize: 13,
    lineHeight: 1.5,
  },

  instructions: {
    marginTop: 13,
    paddingTop: 12,
    borderTop:
      "1px solid #E8DED5",
    color: "#8C7B70",
    fontSize: 12,
    lineHeight: 1.5,
  },

 

  // ITEMS

  itemsHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5,
  },

  itemsTitle: {
    margin: 0,
    fontFamily:
      "Playfair Display, serif",
    fontSize: 16,
  },

  itemCount: {
    color: "#A08F83",
    fontSize: 10,
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
    borderBottom:
      "1px solid #F1EBE5",
  },

  itemName: {
    margin: 0,
    fontWeight: 650,
    fontSize: 13,
  },

  itemOptions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 5,
    color: "#95867C",
    fontSize: 10,
  },

  itemOptionsSpan: {
    background: "#F5EFE9",
    padding: "3px 6px",
    borderRadius: 5,
  },

  itemPrice: {
    fontSize: 13,
    color: "#3B1A08",
  },

  // PAYMENT

  paymentBox: {
    background: "#F8F3ED",
    borderRadius: 15,
    padding: 16,
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  paymentLabel: {
    display: "block",
    color: "#9B8D84",
    fontSize: 8,
    fontWeight: 800,
    marginBottom: 4,
    letterSpacing: "1px",
  },

  paymentMethod: {
    fontSize: 13,
  },

  total: {
    fontSize: 19,
  },

  // BUTTONS

  actionArea: {
    display: "flex",
    flexDirection: "column",
    gap: 9,
  },

  acceptButton: {
    width: "100%",
    background: "#3B1A08",
    color: "#fff",
    border: "none",
    padding: "15px 20px",
    borderRadius: 13,
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
  },

  cancelButton: {
    width: "100%",
    background: "transparent",
    color: "#A35E5E",
    border: "none",
    padding: "7px",
    borderRadius: 10,
    fontWeight: 600,
    fontSize: 12,
    cursor: "pointer",
  },

  deliveredButton: {
    width: "100%",
    background: "#287C3D",
    color: "#fff",
    border: "none",
    padding: "15px 20px",
    borderRadius: 13,
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
  },

  // EMPTY

  emptyCard: {
    background: "rgba(255,255,255,.72)",
    borderRadius: 24,
    padding: "65px 25px",
    textAlign: "center",
    border:
      "1px solid #EDE5DC",
  },

  // HISTORY DRAWER

  historyBackdrop: {
    position: "fixed",
    inset: 0,
    background:
      "rgba(31,20,14,.30)",
    backdropFilter: "blur(3px)",
    zIndex: 9998,
  },

  historyDrawer: {
    position: "fixed",
    top: 0,
    right: 0,
    width: "min(440px, 94vw)",
    height: "100vh",
    background: "#FBF8F4",
    zIndex: 9999,
    boxShadow:
      "-15px 0 45px rgba(0,0,0,.16)",
    padding: "30px 25px",
    overflowY: "auto",
  },

  historyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 20,
    borderBottom:
      "1px solid #E7DED5",
  },

  historySubtitle: {
    color: "#918279",
    fontSize: 12,
    margin: "7px 0 0",
  },

  closeHistoryButton: {
    width: 38,
    height: 38,
    borderRadius: "50%",
    border:
      "1px solid #E0D6CD",
    background: "#fff",
    color: "#3B302A",
    fontSize: 24,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  historyList: {
    display: "flex",
    flexDirection: "column",
    gap: 11,
    paddingTop: 22,
  },

  historyEmpty: {
    textAlign: "center",
    padding: "70px 20px",
  },

  // COMPACT HISTORY CARD

  historyCard: {
    background: "#fff",
    border:
      "1px solid #ECE4DB",
    borderRadius: 16,
    padding: "15px 16px",
  },

  historyCardTop: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },

  historyOrderId: {
    margin: 0,
    fontSize: 11,
    color: "#9B8D84",
    fontWeight: 700,
  },

  historyCustomer: {
    margin: "4px 0 0",
    fontSize: 14,
    fontWeight: 700,
    color: "#3B1A08",
  },

  deliveredBadge: {
    background: "#EAF6ED",
    color: "#32733D",
    padding: "5px 8px",
    borderRadius: 999,
    fontSize: 9,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },

  historyCardBottom: {
    display: "flex",
    gap: 13,
    marginTop: 14,
    paddingTop: 11,
    borderTop:
      "1px solid #F1EBE5",
    color: "#897A70",
    fontSize: 10,
  },
};
