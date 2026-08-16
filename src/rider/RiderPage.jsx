import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  getDocs,
  addDoc,
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

  const [activeTab, setActiveTab] = useState("deliveries");
  const [showHistory, setShowHistory] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const [cancelOrder, setCancelOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

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
            setError("No rider profile is linked to this login.");
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

          setError("Unable to load your rider profile.");
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
  // LOAD RIDER ORDERS
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
          .sort((a, b) => {
            const aTime =
              a.riderAssignedAt?.seconds ||
              a.createdAt?.seconds ||
              0;

            const bTime =
              b.riderAssignedAt?.seconds ||
              b.createdAt?.seconds ||
              0;

            return bTime - aTime;
          });

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
  // ORDER GROUPS
  // =====================================================

  const activeOrders = useMemo(() => {
    return orders.filter(
      (order) =>
        order.status === "Assigned to Rider" ||
        order.status === "Accepted by Rider" ||
        order.status === "Out for Delivery"
    );
  }, [orders]);

  const deliveredOrders = useMemo(() => {
    return orders.filter(
      (order) => order.status === "Delivered"
    );
  }, [orders]);

  const cancelledOrders = useMemo(() => {
    return orders.filter(
      (order) =>
        order.status === "Cancelled by Rider" ||
        order.status === "Delivery Cancelled"
    );
  }, [orders]);

  // =====================================================
  // EARNINGS
  // =====================================================

  const deliveryRate = Number(rider?.deliveryRate || 0);

  const totalDeliveryEarnings =
    deliveredOrders.length * deliveryRate;

  const totalTips = deliveredOrders.reduce(
    (sum, order) => {
      return (
        sum +
        Number(
          order.tipAmount ||
            order.tip ||
            order.customerTip ||
            0
        )
      );
    },
    0
  );

  const totalEarnings =
    totalDeliveryEarnings + totalTips;

  // =====================================================
  // PERFORMANCE
  // =====================================================

  const completedCount = deliveredOrders.length;
  const cancelledCount = cancelledOrders.length;

  const totalFinished =
    completedCount + cancelledCount;

  const completionRate =
    totalFinished > 0
      ? Math.round(
          (completedCount / totalFinished) * 100
        )
      : 100;

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
      // ACCEPT
      // -----------------------------------------------

      if (newStatus === "Accepted by Rider") {
        updateData.riderAcceptedAt =
          serverTimestamp();

        updateData.deliveryPartnerMessage =
          "Your delivery partner has accepted the order.";
      }

      // -----------------------------------------------
      // START DELIVERY
      // -----------------------------------------------

      if (newStatus === "Out for Delivery") {
        updateData.deliveryStartedAt =
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

        updateData.trackingUpdatedAt =
          serverTimestamp();

        updateData.deliveryPartnerMessage =
          "Your order has been delivered. Enjoy! ☕";

        // Save delivery earnings snapshot.
        updateData.riderDeliveryPay =
          Number(rider?.deliveryRate || 0);

        updateData.riderTipAmount =
          Number(
            order.tipAmount ||
              order.tip ||
              order.customerTip ||
              0
          );

        updateData.riderTotalEarning =
          Number(
            rider?.deliveryRate || 0
          ) +
          Number(
            order.tipAmount ||
              order.tip ||
              order.customerTip ||
              0
          );
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
  // CANCEL DELIVERY
  // =====================================================

  const handleCancelDelivery = async () => {
    if (!cancelOrder) return;

    if (!cancelReason.trim()) {
      alert("Please enter a reason for cancelling this delivery.");
      return;
    }

    try {
      setUpdatingOrder(cancelOrder.id);

      const orderRef = doc(
        db,
        "orders",
        cancelOrder.id
      );

      await updateDoc(orderRef, {
        status: "Cancelled by Rider",
        riderCancelledAt: serverTimestamp(),
        riderCancellationReason:
          cancelReason.trim(),
        trackingUpdatedAt:
          serverTimestamp(),
        deliveryPartnerMessage:
          "The delivery partner was unable to complete this delivery.",
      });

      setCancelOrder(null);
      setCancelReason("");
    } catch (err) {
      console.error(
        "Error cancelling delivery:",
        err
      );

      alert(
        "Failed to cancel delivery."
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
          <div style={styles.loadingOrb}>
            🛵
          </div>

          <h2 style={styles.loadingTitle}>
            Preparing your dashboard
          </h2>

          <p style={styles.muted}>
            Loading your rider profile...
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
            <div style={styles.headerEyebrow}>
              BREWED DELIVERY
            </div>

            <h1 style={styles.title}>
              Good day,{" "}
              {rider.name?.split(" ")[0] ||
                "Rider"}{" "}
              👋
            </h1>

            <p style={styles.subtitle}>
              Your delivery dashboard
            </p>
          </div>

          <button
            onClick={() =>
              setShowProfile(true)
            }
            style={styles.profileButton}
          >
            <span>
              {(rider.name || "R")
                .charAt(0)
                .toUpperCase()}
            </span>
          </button>
        </header>

        {/* =================================================
            RIDER HERO
        ================================================= */}

        <div style={styles.heroCard}>

          <div style={styles.heroTop}>
            <div style={styles.vehicleIcon}>
              🛵
            </div>

            <div style={{ flex: 1 }}>
              <p style={styles.heroLabel}>
                DELIVERY PARTNER
              </p>

              <h2 style={styles.heroName}>
                {rider.name}
              </h2>

              <p style={styles.heroVehicle}>
                {rider.vehicleType ||
                  "Vehicle"}
                {rider.vehicleNumber
                  ? ` • ${rider.vehicleNumber}`
                  : ""}
              </p>
            </div>

            <div style={styles.onlineBadge}>
              <span style={styles.onlineDot} />
              Online
            </div>
          </div>

          <div style={styles.heroStats}>

            <div style={styles.heroStat}>
              <strong>
                {activeOrders.length}
              </strong>
              <span>Active</span>
            </div>

            <div style={styles.heroDivider} />

            <div style={styles.heroStat}>
              <strong>
                {completedCount}
              </strong>
              <span>Completed</span>
            </div>

            <div style={styles.heroDivider} />

            <div style={styles.heroStat}>
              ₹{totalEarnings}
              <span>Earned</span>
            </div>

          </div>
        </div>

        {/* =================================================
            QUICK STATS
        ================================================= */}

        <div style={styles.quickStats}>

          <StatCard
            icon="📦"
            label="Deliveries"
            value={completedCount}
          />

          <StatCard
            icon="💰"
            label="Delivery Pay"
            value={`₹${totalDeliveryEarnings}`}
          />

          <StatCard
            icon="❤️"
            label="Tips"
            value={`₹${totalTips}`}
          />

        </div>

        {/* =================================================
            TABS
        ================================================= */}

        <div style={styles.tabs}>

          <button
            onClick={() =>
              setActiveTab("deliveries")
            }
            style={{
              ...styles.tab,
              ...(activeTab === "deliveries"
                ? styles.activeTab
                : {}),
            }}
          >
            Deliveries
            <span style={styles.tabCount}>
              {activeOrders.length}
            </span>
          </button>

          <button
            onClick={() =>
              setActiveTab("earnings")
            }
            style={{
              ...styles.tab,
              ...(activeTab === "earnings"
                ? styles.activeTab
                : {}),
            }}
          >
            Earnings
          </button>

          <button
            onClick={() =>
              setActiveTab("performance")
            }
            style={{
              ...styles.tab,
              ...(activeTab === "performance"
                ? styles.activeTab
                : {}),
            }}
          >
            Performance
          </button>

        </div>

        {/* =================================================
            DELIVERIES TAB
        ================================================= */}

        {activeTab === "deliveries" && (
          <>
            <div style={styles.sectionHeader}>
              <div>
                <p style={styles.sectionEyebrow}>
                  CURRENT QUEUE
                </p>

                <h2 style={styles.sectionTitle}>
                  My Deliveries
                </h2>
              </div>

              <span style={styles.countBadge}>
                {activeOrders.length}
              </span>
            </div>

            {ordersLoading ? (
              <LoadingCard />
            ) : activeOrders.length === 0 ? (
              <EmptyDeliveries />
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
                    onCancel={(order) =>
                      setCancelOrder(order)
                    }
                  />
                ))}
              </div>
            )}

            {deliveredOrders.length > 0 && (
              <button
                onClick={() =>
                  setShowHistory(true)
                }
                style={styles.historyLaunch}
              >
                <span>View delivery history</span>
                <span>→</span>
              </button>
            )}
          </>
        )}

        {/* =================================================
            EARNINGS TAB
        ================================================= */}

        {activeTab === "earnings" && (
          <EarningsSection
            deliveryEarnings={
              totalDeliveryEarnings
            }
            tips={totalTips}
            total={totalEarnings}
            completed={completedCount}
            rate={deliveryRate}
          />
        )}

        {/* =================================================
            PERFORMANCE TAB
        ================================================= */}

        {activeTab === "performance" && (
          <PerformanceSection
            completed={completedCount}
            cancelled={cancelledCount}
            completionRate={
              completionRate
            }
            active={
              activeOrders.length
            }
          />
        )}

        {/* =================================================
            HISTORY DRAWER
        ================================================= */}

        {showHistory && (
          <>
            <div
              style={styles.overlay}
              onClick={() =>
                setShowHistory(false)
              }
            />

            <div style={styles.drawer}>

              <div style={styles.drawerHeader}>
                <div>
                  <p style={styles.sectionEyebrow}>
                    COMPLETED
                  </p>

                  <h2 style={styles.sectionTitle}>
                    Delivery History
                  </h2>
                </div>

                <button
                  onClick={() =>
                    setShowHistory(false)
                  }
                  style={styles.closeButton}
                >
                  ×
                </button>
              </div>

              <p style={styles.drawerSubtitle}>
                Your completed and cancelled deliveries.
              </p>

              <div style={styles.historyList}>

                {orders
                  .filter(
                    (order) =>
                      order.status ===
                        "Delivered" ||
                      order.status ===
                        "Cancelled by Rider" ||
                      order.status ===
                        "Delivery Cancelled"
                  )
                  .map((order) => (
                    <HistoryCard
                      key={order.id}
                      order={order}
                      deliveryRate={
                        Number(
                          rider.deliveryRate ||
                            0
                        )
                      }
                    />
                  ))}

              </div>
            </div>
          </>
        )}

        {/* =================================================
            PROFILE DRAWER
        ================================================= */}

        {showProfile && (
          <>
            <div
              style={styles.overlay}
              onClick={() =>
                setShowProfile(false)
              }
            />

            <div style={styles.profileDrawer}>

              <div style={styles.drawerHeader}>
                <div>
                  <p style={styles.sectionEyebrow}>
                    ACCOUNT
                  </p>

                  <h2 style={styles.sectionTitle}>
                    My Profile
                  </h2>
                </div>

                <button
                  onClick={() =>
                    setShowProfile(false)
                  }
                  style={styles.closeButton}
                >
                  ×
                </button>
              </div>

              <div style={styles.profileAvatar}>
                {(rider.name || "R")
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <h2 style={styles.profileName}>
                {rider.name}
              </h2>

              <div style={styles.profileStatus}>
                <span
                  style={styles.onlineDot}
                />
                Active Rider
              </div>

              <div style={styles.profileInfo}>

                <ProfileRow
                  label="Phone"
                  value={
                    rider.phone ||
                    "Not provided"
                  }
                />

                <ProfileRow
                  label="Email"
                  value={
                    rider.email ||
                    currentUser.email
                  }
                />

                <ProfileRow
                  label="Vehicle"
                  value={
                    rider.vehicleType ||
                    "Not provided"
                  }
                />

                <ProfileRow
                  label="Vehicle Number"
                  value={
                    rider.vehicleNumber ||
                    "Not provided"
                  }
                />

                <ProfileRow
                  label="Delivery Rate"
                  value={`₹${deliveryRate} / delivery`}
                />

              </div>

            </div>
          </>
        )}

        {/* =================================================
            CANCEL MODAL
        ================================================= */}

        {cancelOrder && (
          <>
            <div
              style={styles.modalOverlay}
              onClick={() => {
                if (!updatingOrder) {
                  setCancelOrder(null);
                  setCancelReason("");
                }
              }}
            />

            <div style={styles.cancelModal}>

              <div style={styles.cancelIcon}>
                !
              </div>

              <h2 style={styles.modalTitle}>
                Cancel Delivery?
              </h2>

              <p style={styles.modalText}>
                Tell the café why you cannot complete
                this delivery.
              </p>

              <textarea
                value={cancelReason}
                onChange={(e) =>
                  setCancelReason(
                    e.target.value
                  )
                }
                placeholder="Enter cancellation reason..."
                style={styles.textarea}
                rows={4}
              />

              <div style={styles.modalActions}>

                <button
                  disabled={!!updatingOrder}
                  onClick={() => {
                    setCancelOrder(null);
                    setCancelReason("");
                  }}
                  style={styles.secondaryButton}
                >
                  Keep Delivery
                </button>

                <button
                  disabled={!!updatingOrder}
                  onClick={
                    handleCancelDelivery
                  }
                  style={styles.cancelButton}
                >
                  {updatingOrder
                    ? "Cancelling..."
                    : "Cancel Delivery"}
                </button>

              </div>
            </div>
          </>
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
  onCancel,
}) {
  const isAssigned =
    order.status === "Assigned to Rider";

  const isAccepted =
    order.status === "Accepted by Rider";

  const isOutForDelivery =
    order.status === "Out for Delivery";

  return (
    <div style={styles.orderCard}>

      {/* HEADER */}

      <div style={styles.orderHeader}>

        <div>
          <div style={styles.orderLabel}>
            DELIVERY
          </div>

          <h3 style={styles.orderId}>
            #{order.id.slice(0, 8).toUpperCase()}
          </h3>

          <p style={styles.orderTime}>
            {formatTimestamp(
              order.createdAt
            )}
          </p>
        </div>

        <StatusBadge
          status={order.status}
        />

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
            <p style={styles.customerName}>
              {order.customer?.name ||
                "Customer"}
            </p>

            {order.customer?.phone && (
              <p style={styles.customerDetail}>
                {order.customer.phone}
              </p>
            )}
          </div>
        </div>

        {order.customer?.address && (
          <div style={styles.addressRow}>
            <span style={styles.addressIcon}>
              📍
            </span>

            <span>
              {order.customer.address}
            </span>
          </div>
        )}

        {order.customer?.instructions && (
          <div style={styles.instructions}>
            <span>NOTE</span>

            <p>
              {order.customer.instructions}
            </p>
          </div>
        )}

      </div>

      {/* ITEMS */}

      <div style={styles.itemsHeader}>
        <h4 style={styles.itemsTitle}>
          Order
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
                    {quantity} ×{" "}
                    {item.name}
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
                          +
                          {" "}
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

          <strong>
            {order.paymentMethod ||
              "N/A"}
          </strong>
        </div>

        <div style={styles.paymentRight}>
          <span style={styles.paymentLabel}>
            ORDER TOTAL
          </span>

          <strong style={styles.total}>
            ₹{order.total || 0}
          </strong>
        </div>

      </div>

      {/* TIP */}

      {Number(
        order.tipAmount ||
          order.tip ||
          order.customerTip ||
          0
      ) > 0 && (
        <div style={styles.tipBox}>
          <span>
            ❤️ Customer tip
          </span>

          <strong>
            ₹
            {Number(
              order.tipAmount ||
                order.tip ||
                order.customerTip ||
                0
            )}
          </strong>
        </div>
      )}

      {/* ACTIONS */}

      <div style={styles.actions}>

        {isAssigned && (
          <>
            <button
              disabled={updating}
              onClick={() =>
                onUpdateStatus(
                  order,
                  "Accepted by Rider"
                )
              }
              style={{
                ...styles.primaryAction,
                opacity: updating
                  ? 0.6
                  : 1,
              }}
            >
              {updating
                ? "Accepting..."
                : "✓ Accept Delivery"}
            </button>

            <button
              disabled={updating}
              onClick={() =>
                onCancel(order)
              }
              style={styles.cancelOutline}
            >
              Cancel
            </button>
          </>
        )}

        {isAccepted && (
          <>
            <button
              disabled={updating}
              onClick={() =>
                onUpdateStatus(
                  order,
                  "Out for Delivery"
                )
              }
              style={{
                ...styles.primaryAction,
                opacity: updating
                  ? 0.6
                  : 1,
              }}
            >
              {updating
                ? "Starting..."
                : "🛵 Start Delivery"}
            </button>

            <button
              disabled={updating}
              onClick={() =>
                onCancel(order)
              }
              style={styles.cancelOutline}
            >
              Cancel
            </button>
          </>
        )}

        {isOutForDelivery && (
          <>
            <button
              disabled={updating}
              onClick={() =>
                onUpdateStatus(
                  order,
                  "Delivered"
                )
              }
              style={{
                ...styles.deliveredAction,
                opacity: updating
                  ? 0.6
                  : 1,
              }}
            >
              {updating
                ? "Updating..."
                : "✓ Mark Delivered"}
            </button>

            <button
              disabled={updating}
              onClick={() =>
                onCancel(order)
              }
              style={styles.cancelOutline}
            >
              Cancel
            </button>
          </>
        )}

      </div>
    </div>
  );
}

// =====================================================
// STATUS BADGE
// =====================================================

function StatusBadge({ status }) {
  let background = "#FFF4D6";
  let color = "#856404";

  if (status === "Accepted by Rider") {
    background = "#EEE8FF";
    color = "#6842B8";
  }

  if (status === "Out for Delivery") {
    background = "#E6F1FF";
    color = "#2165A6";
  }

  if (status === "Delivered") {
    background = "#E7F5EA";
    color = "#347044";
  }

  if (
    status === "Cancelled by Rider" ||
    status === "Delivery Cancelled"
  ) {
    background = "#FDECEC";
    color = "#A94442";
  }

  return (
    <span
      style={{
        ...styles.statusBadge,
        background,
        color,
      }}
    >
      {status}
    </span>
  );
}

// =====================================================
// HISTORY CARD
// =====================================================

function HistoryCard({
  order,
  deliveryRate,
}) {
  const tip = Number(
    order.tipAmount ||
      order.tip ||
      order.customerTip ||
      0
  );

  const pay =
    Number(
      order.riderDeliveryPay
    ) || (
      order.status === "Delivered"
        ? deliveryRate
        : 0
    );

  const total =
    Number(
      order.riderTotalEarning
    ) || pay + tip;

  return (
    <div style={styles.historyCard}>

      <div style={styles.historyCardTop}>
        <div>
          <strong>
            #{order.id.slice(0, 8).toUpperCase()}
          </strong>

          <p>
            {formatTimestamp(
              order.deliveredAt ||
                order.riderCancelledAt ||
                order.createdAt
            )}
          </p>
        </div>

        <StatusBadge
          status={order.status}
        />
      </div>

      <div style={styles.historyCustomer}>
        {order.customer?.name ||
          "Customer"}
      </div>

      {order.status === "Delivered" && (
        <div style={styles.historyEarnings}>

          <div>
            <span>Delivery</span>
            <strong>₹{pay}</strong>
          </div>

          <div>
            <span>Tip</span>
            <strong>₹{tip}</strong>
          </div>

          <div style={styles.historyTotal}>
            <span>Total</span>
            <strong>₹{total}</strong>
          </div>

        </div>
      )}

      {order.riderCancellationReason && (
        <div style={styles.cancelReason}>
          <span>Cancellation reason</span>

          <p>
            {order.riderCancellationReason}
          </p>
        </div>
      )}
    </div>
  );
}

// =====================================================
// EARNINGS SECTION
// =====================================================

function EarningsSection({
  deliveryEarnings,
  tips,
  total,
  completed,
  rate,
}) {
  return (
    <div>

      <div style={styles.earningsHero}>
        <p>
          TOTAL EARNED
        </p>

        <h2>
          ₹{total}
        </h2>

        <span>
          From {completed} completed deliveries
        </span>
      </div>

      <div style={styles.earningsGrid}>

        <EarningCard
          icon="📦"
          title="Delivery Pay"
          value={`₹${deliveryEarnings}`}
          description={
            rate > 0
              ? `₹${rate} per delivery`
              : "Rate not configured"
          }
        />

        <EarningCard
          icon="❤️"
          title="Customer Tips"
          value={`₹${tips}`}
          description="100% of recorded tips"
        />

      </div>

      <div style={styles.infoCard}>
        <div style={styles.infoIcon}>
          ℹ️
        </div>

        <div>
          <strong>
            Earnings are calculated from completed deliveries.
          </strong>

          <p>
            Your delivery rate and customer tips are
            recorded with each completed order.
          </p>
        </div>
      </div>

    </div>
  );
}

// =====================================================
// PERFORMANCE
// =====================================================

function PerformanceSection({
  completed,
  cancelled,
  completionRate,
  active,
}) {
  return (
    <div>

      <div style={styles.performanceHero}>
        <div>
          <p style={styles.sectionEyebrow}>
            DELIVERY PERFORMANCE
          </p>

          <h2 style={styles.performanceTitle}>
            {completionRate}%
          </h2>

          <p style={styles.muted}>
            Completion rate
          </p>
        </div>

        <div style={styles.performanceCircle}>
          {completionRate}%
        </div>
      </div>

      <div style={styles.performanceGrid}>

        <PerformanceCard
          icon="🛵"
          label="Active"
          value={active}
        />

        <PerformanceCard
          icon="✓"
          label="Completed"
          value={completed}
        />

        <PerformanceCard
          icon="×"
          label="Cancelled"
          value={cancelled}
        />

      </div>

    </div>
  );
}

// =====================================================
// SUPPORT COMPONENTS
// =====================================================

function StatCard({
  icon,
  label,
  value,
}) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statIcon}>
        {icon}
      </div>

      <div>
        <span style={styles.statLabel}>
          {label}
        </span>

        <strong style={styles.statValue}>
          {value}
        </strong>
      </div>
    </div>
  );
}

function EarningCard({
  icon,
  title,
  value,
  description,
}) {
  return (
    <div style={styles.earningCard}>

      <div style={styles.earningIcon}>
        {icon}
      </div>

      <span style={styles.earningTitle}>
        {title}
      </span>

      <strong style={styles.earningValue}>
        {value}
      </strong>

      <p>
        {description}
      </p>

    </div>
  );
}

function PerformanceCard({
  icon,
  label,
  value,
}) {
  return (
    <div style={styles.performanceCard}>
      <div style={styles.performanceIcon}>
        {icon}
      </div>

      <span>{label}</span>

      <strong>{value}</strong>
    </div>
  );
}

function ProfileRow({
  label,
  value,
}) {
  return (
    <div style={styles.profileRow}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LoadingCard() {
  return (
    <div style={styles.emptyCard}>
      <div style={styles.loadingOrb}>
        🛵
      </div>

      <p style={styles.muted}>
        Loading deliveries...
      </p>
    </div>
  );
}

function EmptyDeliveries() {
  return (
    <div style={styles.emptyCard}>

      <div style={styles.emptyIllustration}>
        ☕
      </div>

      <h2 style={styles.emptyTitle}>
        You're all caught up
      </h2>

      <p style={styles.muted}>
        No active deliveries right now.
        New assignments will appear here.
      </p>

    </div>
  );
}

// =====================================================
// HELPERS
// =====================================================

function formatTimestamp(timestamp) {
  if (!timestamp?.toDate) {
    return "Recently";
  }

  return timestamp
    .toDate()
    .toLocaleString([], {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
}

// =====================================================
// STYLES
// =====================================================

const styles = {
  page: {
    minHeight: "100vh",
    background: "#F7F3EE",
    color: "#30251F",
    padding: "28px 18px 60px",
    boxSizing: "border-box",
  },

  container: {
    maxWidth: 850,
    margin: "0 auto",
  },

  center: {
    maxWidth: 500,
    margin: "0 auto",
    textAlign: "center",
    padding: "100px 20px",
  },

  loadingOrb: {
    width: 58,
    height: 58,
    borderRadius: 20,
    background: "#3B2112",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 18px",
    fontSize: 28,
  },

  loadingTitle: {
    fontFamily:
      "Playfair Display, serif",
    fontSize: 22,
    margin: "0 0 6px",
  },

  muted: {
    color: "#81736A",
    fontSize: 14,
    lineHeight: 1.6,
  },

  emailText: {
    color: "#91837A",
    fontSize: 13,
    marginTop: 15,
  },

  emptyIcon: {
    fontSize: 42,
    marginBottom: 14,
  },

  emptyTitle: {
    fontFamily:
      "Playfair Display, serif",
    fontSize: 25,
    margin: "0 0 8px",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },

  headerEyebrow: {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "1.5px",
    color: "#A08F83",
    marginBottom: 5,
  },

  title: {
    margin: 0,
    fontFamily:
      "Playfair Display, serif",
    fontSize: 32,
    color: "#321A0D",
  },

  subtitle: {
    margin: "5px 0 0",
    color: "#81736A",
    fontSize: 14,
  },

  profileButton: {
    width: 45,
    height: 45,
    borderRadius: "50%",
    border: "1px solid #E3D8CF",
    background: "#fff",
    color: "#3B2112",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 16,
  },

  heroCard: {
    background:
      "linear-gradient(135deg, #3B2112, #542C17)",
    color: "#fff",
    borderRadius: 26,
    padding: 23,
    marginBottom: 16,
    boxShadow:
      "0 18px 40px rgba(59,33,18,.16)",
  },

  heroTop: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },

  vehicleIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    background:
      "rgba(255,255,255,.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 27,
  },

  heroLabel: {
    margin: 0,
    fontSize: 9,
    letterSpacing: "1.3px",
    opacity: 0.55,
    fontWeight: 800,
  },

  heroName: {
    margin: "3px 0",
    fontFamily:
      "Playfair Display, serif",
    fontSize: 21,
  },

  heroVehicle: {
    margin: 0,
    fontSize: 12,
    opacity: 0.65,
  },

  onlineBadge: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background:
      "rgba(255,255,255,.1)",
    borderRadius: 999,
    padding: "7px 10px",
    fontSize: 11,
    fontWeight: 700,
  },

  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#63C174",
    display: "inline-block",
  },

  heroStats: {
    display: "flex",
    alignItems: "center",
    marginTop: 24,
    paddingTop: 19,
    borderTop:
      "1px solid rgba(255,255,255,.12)",
  },

  heroStat: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: 800,
  },

  heroDivider: {
    width: 1,
    height: 30,
    background:
      "rgba(255,255,255,.12)",
  },

  heroStatSpan: {
    display: "block",
  },

  quickStats: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, 1fr)",
    gap: 10,
    marginBottom: 25,
  },

  statCard: {
    background: "#fff",
    border: "1px solid #E9E0D8",
    borderRadius: 17,
    padding: 14,
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    background: "#F8F1E9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  statLabel: {
    display: "block",
    fontSize: 10,
    color: "#93857B",
    marginBottom: 2,
  },

  statValue: {
    fontSize: 16,
    color: "#342319",
  },

  tabs: {
    display: "flex",
    gap: 5,
    background: "#EDE5DD",
    borderRadius: 13,
    padding: 4,
    marginBottom: 27,
  },

  tab: {
    flex: 1,
    border: "none",
    background: "transparent",
    color: "#806F64",
    padding: "10px 8px",
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
  },

  activeTab: {
    background: "#fff",
    color: "#3B2112",
    boxShadow:
      "0 2px 8px rgba(0,0,0,.05)",
  },

  tabCount: {
    marginLeft: 5,
    opacity: 0.6,
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },

  sectionEyebrow: {
    margin: 0,
    color: "#A08F83",
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: "1.2px",
  },

  sectionTitle: {
    margin: "4px 0 0",
    fontFamily:
      "Playfair Display, serif",
    fontSize: 24,
    color: "#352319",
  },

  countBadge: {
    minWidth: 31,
    height: 31,
    borderRadius: "50%",
    background: "#3B2112",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 800,
  },

  orderList: {
    display: "flex",
    flexDirection: "column",
    gap: 17,
  },

  orderCard: {
    background: "#fff",
    border: "1px solid #E8DED5",
    borderRadius: 24,
    padding: 21,
    boxShadow:
      "0 8px 25px rgba(52,35,25,.045)",
  },

  orderHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 17,
  },

  orderLabel: {
    color: "#A08F83",
    fontSize: 9,
    letterSpacing: "1.2px",
    fontWeight: 800,
  },

  orderId: {
    margin: "3px 0",
    fontFamily:
      "Playfair Display, serif",
    fontSize: 19,
  },

  orderTime: {
    margin: 0,
    color: "#9B8D83",
    fontSize: 10,
  },

  statusBadge: {
    padding: "7px 10px",
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 800,
    maxWidth: 150,
    textAlign: "center",
  },

  customerBox: {
    background: "#FBF7F2",
    border: "1px solid #F0E8DF",
    borderRadius: 17,
    padding: 15,
    marginBottom: 19,
  },

  customerTop: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  customerAvatar: {
    width: 38,
    height: 38,
    borderRadius: "50%",
    background: "#E9DCD0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    color: "#5A3926",
  },

  customerName: {
    margin: 0,
    fontSize: 14,
    fontWeight: 800,
  },

  customerDetail: {
    margin: "3px 0 0",
    color: "#84766C",
    fontSize: 12,
  },

  addressRow: {
    display: "flex",
    gap: 8,
    marginTop: 13,
    color: "#4D4038",
    fontSize: 13,
    lineHeight: 1.5,
  },

  addressIcon: {
    flexShrink: 0,
  },

  instructions: {
    marginTop: 13,
    paddingTop: 11,
    borderTop:
      "1px solid #E9DED4",
  },

  instructionsSpan: {
    fontSize: 9,
  },



  itemsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  itemsTitle: {
    margin: 0,
    fontFamily:
      "Playfair Display, serif",
    fontSize: 16,
  },

  itemCount: {
    color: "#9A8B81",
    fontSize: 10,
  },

  items: {
    marginBottom: 16,
  },

  item: {
    display: "flex",
    gap: 12,
    padding: "11px 0",
    borderBottom:
      "1px solid #F0EAE4",
  },

  itemName: {
    margin: 0,
    fontSize: 13,
    fontWeight: 700,
  },

  itemOptions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 5,
    color: "#96877D",
    fontSize: 10,
  },

  itemOptionsSpan: {
    background: "#F6F0EA",
    padding: "3px 6px",
    borderRadius: 5,
  },

  itemPrice: {
    fontSize: 13,
    whiteSpace: "nowrap",
  },

  paymentBox: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#F7F1EA",
    borderRadius: 14,
    padding: 14,
    marginBottom: 9,
  },

  paymentLabel: {
    display: "block",
    color: "#9A8B81",
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: ".6px",
    marginBottom: 3,
  },

  paymentRight: {
    textAlign: "right",
  },

  total: {
    fontSize: 17,
  },

  tipBox: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#FFF8E9",
    color: "#806326",
    borderRadius: 12,
    padding: "10px 13px",
    marginBottom: 12,
    fontSize: 12,
  },

  actions: {
    display: "flex",
    gap: 9,
    marginTop: 13,
  },

  primaryAction: {
    flex: 1,
    border: "none",
    background: "#3B2112",
    color: "#fff",
    padding: "14px",
    borderRadius: 12,
    fontWeight: 800,
    cursor: "pointer",
    fontSize: 13,
  },

  deliveredAction: {
    flex: 1,
    border: "none",
    background: "#39824A",
    color: "#fff",
    padding: "14px",
    borderRadius: 12,
    fontWeight: 800,
    cursor: "pointer",
    fontSize: 13,
  },

  cancelOutline: {
    border: "1px solid #E1D4CC",
    background: "#fff",
    color: "#9B4A45",
    padding: "14px 16px",
    borderRadius: 12,
    fontWeight: 700,
    cursor: "pointer",
  },

  emptyCard: {
    background: "#fff",
    border: "1px solid #E8DED5",
    borderRadius: 24,
    padding: "60px 25px",
    textAlign: "center",
  },

  emptyIllustration: {
    width: 58,
    height: 58,
    borderRadius: 20,
    background: "#F7EEE5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 17px",
    fontSize: 27,
  },

  historyLaunch: {
    width: "100%",
    marginTop: 17,
    padding: 14,
    borderRadius: 13,
    border: "1px solid #E3D8CF",
    background: "#fff",
    display: "flex",
    justifyContent: "space-between",
    cursor: "pointer",
    color: "#4B392D",
    fontWeight: 700,
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(30,20,14,.38)",
    backdropFilter: "blur(3px)",
    zIndex: 9998,
  },

  drawer: {
    position: "fixed",
    right: 0,
    top: 0,
    width: "min(470px, 94vw)",
    height: "100vh",
    background: "#FCF9F5",
    zIndex: 9999,
    padding: 26,
    boxSizing: "border-box",
    overflowY: "auto",
    boxShadow:
      "-15px 0 45px rgba(0,0,0,.16)",
  },

  profileDrawer: {
    position: "fixed",
    right: 0,
    top: 0,
    width: "min(420px, 94vw)",
    height: "100vh",
    background: "#FCF9F5",
    zIndex: 9999,
    padding: 26,
    boxSizing: "border-box",
    overflowY: "auto",
    boxShadow:
      "-15px 0 45px rgba(0,0,0,.16)",
  },

  drawerHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 18,
    borderBottom:
      "1px solid #E6DDD5",
    marginBottom: 20,
  },

  drawerSubtitle: {
    color: "#88796F",
    fontSize: 13,
    marginBottom: 20,
  },

  closeButton: {
    width: 38,
    height: 38,
    borderRadius: "50%",
    border: "1px solid #DED3CB",
    background: "#fff",
    fontSize: 23,
    cursor: "pointer",
  },

  historyList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },

  historyCard: {
    background: "#fff",
    border: "1px solid #E9DFD7",
    borderRadius: 17,
    padding: 15,
  },

  historyCardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  historyCardTopP: {
    margin: "4px 0 0",
    color: "#998A80",
    fontSize: 10,
  },

  historyCustomer: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: 700,
  },

  historyEarnings: {
    display: "grid",
    gridTemplateColumns:
      "1fr 1fr 1fr",
    gap: 8,
    marginTop: 13,
    paddingTop: 12,
    borderTop:
      "1px solid #EFE8E2",
  },

  historyEarningsSpan: {
    display: "block",
    color: "#9A8C82",
    fontSize: 9,
    marginBottom: 3,
  },

  historyEarningsStrong: {
    fontSize: 13,
  },

  historyTotal: {
    textAlign: "right",
  },

  cancelReason: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    background: "#FDF0EF",
    color: "#87524D",
    fontSize: 11,
  },

  cancelReasonSpan: {
    fontWeight: 800,
    fontSize: 9,
    textTransform: "uppercase",
  },

  cancelReasonP: {
    margin: "4px 0 0",
  },

  earningsHero: {
    background:
      "linear-gradient(135deg,#3B2112,#5A3019)",
    color: "#fff",
    borderRadius: 24,
    padding: 27,
    marginBottom: 14,
  },

  earningsHeroP: {
    margin: 0,
    fontSize: 9,
    letterSpacing: "1.2px",
    opacity: .6,
  },

  earningsHeroH2: {
    fontFamily:
      "Playfair Display, serif",
    fontSize: 40,
    margin: "8px 0",
  },

  earningsHeroSpan: {
    fontSize: 12,
    opacity: .65,
  },

  earningsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },

  earningCard: {
    background: "#fff",
    border: "1px solid #E8DED5",
    borderRadius: 18,
    padding: 18,
  },

  earningIcon: {
    fontSize: 22,
    marginBottom: 14,
  },

  earningTitle: {
    display: "block",
    color: "#87786E",
    fontSize: 11,
  },

  earningValue: {
    display: "block",
    fontSize: 23,
    marginTop: 4,
  },

  earningCardP: {
    color: "#9A8B81",
    fontSize: 10,
    marginBottom: 0,
  },

  infoCard: {
    display: "flex",
    gap: 11,
    marginTop: 13,
    background: "#F8F1E9",
    borderRadius: 15,
    padding: 15,
    color: "#67554A",
    fontSize: 11,
  },

  infoCardP: {
    margin: "4px 0 0",
    color: "#8C7C72",
    lineHeight: 1.5,
  },

  performanceHero: {
    background: "#fff",
    border: "1px solid #E8DED5",
    borderRadius: 23,
    padding: 23,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 13,
  },

  performanceTitle: {
    fontFamily:
      "Playfair Display, serif",
    fontSize: 38,
    margin: "5px 0 0",
  },

  performanceCircle: {
    width: 82,
    height: 82,
    borderRadius: "50%",
    border: "7px solid #E4D5C7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    color: "#3B2112",
  },

  performanceGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3,1fr)",
    gap: 10,
  },

  performanceCard: {
    background: "#fff",
    border: "1px solid #E8DED5",
    borderRadius: 17,
    padding: 16,
  },

  performanceIcon: {
    fontSize: 18,
    marginBottom: 10,
  },

  performanceCardSpan: {
    display: "block",
    color: "#8F8076",
    fontSize: 10,
  },

  performanceCardStrong: {
    display: "block",
    fontSize: 22,
    marginTop: 3,
  },

  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    background: "#3B2112",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "25px auto 12px",
    fontSize: 30,
    fontWeight: 800,
  },

  profileName: {
    textAlign: "center",
    fontFamily:
      "Playfair Display, serif",
    fontSize: 25,
    margin: 0,
  },

  profileStatus: {
    width: "fit-content",
    margin: "9px auto 25px",
    display: "flex",
    alignItems: "center",
    gap: 6,
    color: "#39824A",
    fontSize: 11,
    fontWeight: 700,
  },

  profileInfo: {
    background: "#fff",
    border: "1px solid #E8DED5",
    borderRadius: 18,
    overflow: "hidden",
  },

  profileRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 20,
    padding: "15px 16px",
    borderBottom:
      "1px solid #F0EAE5",
    fontSize: 12,
  },

  profileRowSpan: {
    color: "#95867C",
  },

  profileRowStrong: {
    textAlign: "right",
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(30,20,14,.45)",
    backdropFilter: "blur(4px)",
    zIndex: 10000,
  },

  cancelModal: {
    position: "fixed",
    width: "min(430px, 90vw)",
    left: "50%",
    top: "50%",
    transform:
      "translate(-50%, -50%)",
    background: "#fff",
    borderRadius: 24,
    padding: 25,
    zIndex: 10001,
    boxShadow:
      "0 25px 70px rgba(0,0,0,.2)",
  },

  cancelIcon: {
    width: 45,
    height: 45,
    borderRadius: "50%",
    background: "#FCEAE8",
    color: "#A94442",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    fontSize: 20,
  },

  modalTitle: {
    fontFamily:
      "Playfair Display, serif",
    fontSize: 25,
    margin: "17px 0 7px",
  },

  modalText: {
    color: "#81736A",
    fontSize: 13,
    lineHeight: 1.5,
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    resize: "vertical",
    border:
      "1px solid #DED3CA",
    borderRadius: 12,
    padding: 12,
    outline: "none",
    fontFamily: "inherit",
    fontSize: 13,
    marginTop: 8,
  },

  modalActions: {
    display: "flex",
    gap: 9,
    marginTop: 14,
  },

  secondaryButton: {
    flex: 1,
    border:
      "1px solid #DED3CA",
    background: "#fff",
    color: "#4D4037",
    padding: 13,
    borderRadius: 11,
    cursor: "pointer",
    fontWeight: 700,
  },

  cancelButton: {
    flex: 1,
    border: "none",
    background: "#A94442",
    color: "#fff",
    padding: 13,
    borderRadius: 11,
    cursor: "pointer",
    fontWeight: 700,
  },
};
