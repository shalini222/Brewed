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
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

import { db, auth } from "../firebase";

export default function RiderPage({
  setPage,
  setActivePage,
}) {
  const [currentUser, setCurrentUser] = useState(null);
  const [rider, setRider] = useState(null);
  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [updatingOrder, setUpdatingOrder] = useState(null);
  const [error, setError] = useState("");

  const [showHistory, setShowHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState("Delivered");

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
          console.error(
            "Error finding rider:",
            err
          );

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

      // ACCEPTED
      if (newStatus === "Accepted") {
        updateData.riderAcceptedAt =
          serverTimestamp();

        updateData.deliveryPartnerMessage =
          "Your delivery partner has accepted the order.";
      }

      // CANCELLED / REJECTED
      if (newStatus === "Cancelled") {
        updateData.riderCancelledAt =
          serverTimestamp();

        updateData.cancelledBy = "rider";

        updateData.deliveryPartnerMessage =
          "Your delivery partner was unable to complete this delivery.";
      }

      // OUT FOR DELIVERY
      if (newStatus === "Out for Delivery") {
        updateData.deliveryStartedAt =
          serverTimestamp();

        updateData.deliveryPartnerMessage =
          "Your coffee is on the way! ☕";
      }

      // DELIVERED
      if (newStatus === "Delivered") {
        updateData.deliveredAt =
          serverTimestamp();

        updateData.deliveryPartnerMessage =
          "Your order has been delivered. Enjoy! ☕";

        /*
         * If admin has already assigned a payout,
         * preserve it.
         *
         * Otherwise use rider.defaultDeliveryPay
         * if configured.
         */
        if (
          order.riderPayout === undefined &&
          rider.defaultDeliveryPay !== undefined
        ) {
          updateData.riderPayout =
            Number(rider.defaultDeliveryPay) || 0;
        }

        /*
         * Keep an explicit tip field.
         * If no tip exists, use 0.
         */
        if (order.riderTip === undefined) {
          updateData.riderTip = 0;
        }
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
  // DERIVED ORDER DATA
  // =====================================================

  const activeOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.status ===
            "Assigned to Rider" ||
          order.status === "Accepted" ||
          order.status ===
            "Out for Delivery"
      ),
    [orders]
  );

  const deliveredOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.status === "Delivered"
      ),
    [orders]
  );

  const cancelledOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.status === "Cancelled" &&
          order.cancelledBy === "rider"
      ),
    [orders]
  );

  // =====================================================
  // EARNINGS
  // =====================================================

  const earnings = useMemo(() => {
    let deliveryPay = 0;
    let tips = 0;

    deliveredOrders.forEach((order) => {
      deliveryPay += Number(
        order.riderPayout ||
          rider?.defaultDeliveryPay ||
          0
      );

      tips += Number(
        order.riderTip || 0
      );
    });

    return {
      deliveryPay,
      tips,
      total: deliveryPay + tips,
      deliveries: deliveredOrders.length,
    };
  }, [deliveredOrders, rider]);

  // =====================================================
  // TODAY'S EARNINGS
  // =====================================================

  const todaysEarnings = useMemo(() => {
    const now = new Date();

    let deliveryPay = 0;
    let tips = 0;
    let deliveries = 0;

    deliveredOrders.forEach((order) => {
      const timestamp =
        order.deliveredAt ||
        order.createdAt;

      if (!timestamp?.toDate) return;

      const date = timestamp.toDate();

      const sameDay =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() ===
          now.getFullYear();

      if (!sameDay) return;

      deliveryPay += Number(
        order.riderPayout ||
          rider?.defaultDeliveryPay ||
          0
      );

      tips += Number(
        order.riderTip || 0
      );

      deliveries++;
    });

    return {
      deliveryPay,
      tips,
      total: deliveryPay + tips,
      deliveries,
    };
  }, [deliveredOrders, rider]);

  // =====================================================
  // ACCEPTANCE / PERFORMANCE
  // =====================================================

  const assignedCount = orders.filter(
    (order) =>
      order.status ===
        "Assigned to Rider" ||
      order.status === "Accepted" ||
      order.status ===
        "Out for Delivery" ||
      order.status === "Delivered" ||
      (
        order.status === "Cancelled" &&
        order.cancelledBy === "rider"
      )
  ).length;

  const acceptanceRate =
    assignedCount > 0
      ? Math.round(
          ((assignedCount -
            cancelledOrders.length) /
            assignedCount) *
            100
        )
      : 100;

  // =====================================================
  // HISTORY FILTER
  // =====================================================

  const historyOrders =
    historyFilter === "Delivered"
      ? deliveredOrders
      : cancelledOrders;

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
            Please log in to access your
            deliveries.
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // RIDER NOT FOUND
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
            Logged in as:{" "}
            {currentUser.email}
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
            Your rider account is currently
            inactive.
          </p>

          <p style={styles.emailText}>
            Please contact the café
            administrator.
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
            <p style={styles.eyebrow}>
              RIDER DASHBOARD
            </p>

            <h1 style={styles.title}>
              Hello,{" "}
              {rider.name || "Rider"} 👋
            </h1>

            <p style={styles.subtitle}>
              Your deliveries, earnings and
              performance.
            </p>
          </div>

          <div style={styles.activeBadge}>
            <span
              style={styles.activeDot}
            />
            Active
          </div>
        </header>

        {/* =================================================
            RIDER PROFILE CARD
        ================================================= */}

        <div style={styles.riderCard}>
          <div style={styles.riderIcon}>
            🛵
          </div>

          <div
            style={{
              flex: 1,
              minWidth: 0,
            }}
          >
            <h3
              style={styles.riderName}
            >
              {rider.name ||
                "Rider"}
            </h3>

            <p
              style={styles.riderDetails}
            >
              {rider.vehicleType ||
                "Vehicle"}

              {rider.vehicleNumber
                ? ` • ${rider.vehicleNumber}`
                : ""}
            </p>
          </div>

          <div
            style={
              styles.deliveryCount
            }
          >
            <strong>
              {activeOrders.length}
            </strong>

            <span>
              Active
            </span>

            {(deliveredOrders.length >
              0 ||
              cancelledOrders.length >
                0) && (
              <button
                onClick={() =>
                  setShowHistory(true)
                }
                style={
                  styles.historyButton
                }
              >
                View History
              </button>
            )}
          </div>
        </div>

        {/* =================================================
            EARNINGS OVERVIEW
        ================================================= */}

        <div
          style={
            styles.earningsGrid
          }
        >
          <div
            style={
              styles.earningsHero
            }
          >
            <div
              style={
                styles.earningsHeroTop
              }
            >
              <span
                style={
                  styles.earningsLabel
                }
              >
                TODAY'S EARNINGS
              </span>

              <span
                style={
                  styles.moneyIcon
                }
              >
                ₹
              </span>
            </div>

            <strong
              style={
                styles.earningsAmount
              }
            >
              ₹
              {todaysEarnings.total.toLocaleString(
                "en-IN"
              )}
            </strong>

            <p
              style={
                styles.earningsSubtext
              }
            >
              {todaysEarnings.deliveries}{" "}
              completed{" "}
              {todaysEarnings.deliveries ===
              1
                ? "delivery"
                : "deliveries"}
            </p>
          </div>

          <div
            style={
              styles.statCard
            }
          >
            <span
              style={
                styles.statLabel
              }
            >
              DELIVERY PAY
            </span>

            <strong
              style={
                styles.statValue
              }
            >
              ₹
              {todaysEarnings.deliveryPay.toLocaleString(
                "en-IN"
              )}
            </strong>

            <span
              style={
                styles.statHint
              }
            >
              Today
            </span>
          </div>

          <div
            style={
              styles.statCard
            }
          >
            <span
              style={
                styles.statLabel
              }
            >
              TIPS
            </span>

            <strong
              style={
                styles.statValue
              }
            >
              ₹
              {todaysEarnings.tips.toLocaleString(
                "en-IN"
              )}
            </strong>

            <span
              style={
                styles.statHint
              }
            >
              Today
            </span>
          </div>
        </div>

        {/* =================================================
            PERFORMANCE
        ================================================= */}

        <div
          style={
            styles.performanceCard
          }
        >
          <div
            style={
              styles.performanceItem
            }
          >
            <strong>
              {deliveredOrders.length}
            </strong>

            <span>
              Completed
            </span>
          </div>

          <div
            style={
              styles.performanceDivider
            }
          />

          <div
            style={
              styles.performanceItem
            }
          >
            <strong>
              {cancelledOrders.length}
            </strong>

            <span>
              Cancelled
            </span>
          </div>

          <div
            style={
              styles.performanceDivider
            }
          />

          <div
            style={
              styles.performanceItem
            }
          >
            <strong>
              {acceptanceRate}%
            </strong>

            <span>
              Acceptance
            </span>
          </div>

          <div
            style={
              styles.performanceDivider
            }
          />

          <div
            style={
              styles.performanceItem
            }
          >
            <strong>
              ₹
              {earnings.total.toLocaleString(
                "en-IN"
              )}
            </strong>

            <span>
              Lifetime
            </span>
          </div>
        </div>

        {/* =================================================
            ACTIVE DELIVERIES
        ================================================= */}

        <div
          style={
            styles.sectionHeader
          }
        >
          <div>
            <p
              style={
                styles.sectionEyebrow
              }
            >
              CURRENT WORK
            </p>

            <h2
              style={
                styles.sectionTitle
              }
            >
              My Deliveries
            </h2>
          </div>

          <span
            style={
              styles.countBadge
            }
          >
            {activeOrders.length}
          </span>
        </div>

        {ordersLoading ? (
          <div
            style={
              styles.emptyCard
            }
          >
            <p
              style={
                styles.muted
              }
            >
              Loading deliveries...
            </p>
          </div>
        ) : activeOrders.length ===
          0 ? (
          <div
            style={
              styles.emptyCard
            }
          >
            <div
              style={
                styles.emptyIcon
              }
            >
              ☕
            </div>

            <h2
              style={
                styles.emptyTitle
              }
            >
              You're all caught up
            </h2>

            <p
              style={
                styles.muted
              }
            >
              New deliveries will
              appear here when they
              are assigned to you.
            </p>
          </div>
        ) : (
          <div
            style={
              styles.orderList
            }
          >
            {activeOrders.map(
              (order) => (
                <DeliveryCard
                  key={order.id}
                  order={order}
                  updating={
                    updatingOrder ===
                    order.id
                  }
                  onUpdateStatus={
                    updateDeliveryStatus
                  }
                />
              )
            )}
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
              style={
                styles.historyBackdrop
              }
            />

            <div
              style={
                styles.historyDrawer
              }
            >
              <div
                style={
                  styles.historyHeader
                }
              >
                <div>
                  <p
                    style={
                      styles.sectionEyebrow
                    }
                  >
                    YOUR RECORD
                  </p>

                  <h2
                    style={
                      styles.sectionTitle
                    }
                  >
                    Delivery History
                  </h2>
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

              {/* HISTORY TABS */}

              <div
                style={
                  styles.historyTabs
                }
              >
                <button
                  onClick={() =>
                    setHistoryFilter(
                      "Delivered"
                    )
                  }
                  style={{
                    ...styles.historyTab,
                    ...(historyFilter ===
                    "Delivered"
                      ? styles.historyTabActive
                      : {}),
                  }}
                >
                  Completed{" "}
                  <span>
                    {deliveredOrders.length}
                  </span>
                </button>

                <button
                  onClick={() =>
                    setHistoryFilter(
                      "Cancelled"
                    )
                  }
                  style={{
                    ...styles.historyTab,
                    ...(historyFilter ===
                    "Cancelled"
                      ? styles.historyTabActive
                      : {}),
                  }}
                >
                  Cancelled{" "}
                  <span>
                    {cancelledOrders.length}
                  </span>
                </button>
              </div>

              <div
                style={
                  styles.historyList
                }
              >
                {historyOrders.length ===
                0 ? (
                  <div
                    style={
                      styles.historyEmpty
                    }
                  >
                    <div
                      style={
                        styles.emptyIcon
                      }
                    >
                      ☕
                    </div>

                    <p
                      style={
                        styles.muted
                      }
                    >
                      No{" "}
                      {historyFilter.toLowerCase()}{" "}
                      deliveries yet.
                    </p>
                  </div>
                ) : (
                  historyOrders.map(
                    (order) => (
                      <HistoryCard
                        key={order.id}
                        order={order}
                        rider={rider}
                      />
                    )
                  )
                )}
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
}) {
  const isAssigned =
    order.status ===
    "Assigned to Rider";

  const isAccepted =
    order.status === "Accepted";

  const isOutForDelivery =
    order.status ===
    "Out for Delivery";

  const payout = Number(
    order.riderPayout || 0
  );

  const tip = Number(
    order.riderTip || 0
  );

  return (
    <div
      style={
        styles.orderCard
      }
    >
      {/* ORDER HEADER */}

      <div
        style={
          styles.orderHeader
        }
      >
        <div>
          <p
            style={
              styles.orderLabel
            }
          >
            ORDER
          </p>

          <h3
            style={
              styles.orderId
            }
          >
            #{order.id.slice(
              0,
              8
            )}
          </h3>

          <p
            style={
              styles.orderTime
            }
          >
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
              ? styles.statusAssigned
              : isAccepted
              ? styles.statusAccepted
              : styles.statusOut),
          }}
        >
          {order.status}
        </span>
      </div>

      {/* CUSTOMER */}

      <div
        style={
          styles.customerBox
        }
      >
        <p
          style={
            styles.customerName
          }
        >
          👤{" "}
          {order.customer?.name ||
            "Customer"}
        </p>

        {order.customer?.phone && (
          <p
            style={
              styles.customerDetail
            }
          >
            📞{" "}
            {order.customer.phone}
          </p>
        )}

        {order.customer?.address && (
          <p
            style={
              styles.address
            }
          >
            📍{" "}
            {order.customer.address}
          </p>
        )}

        {order.customer
          ?.instructions && (
          <div
            style={
              styles.instructions
            }
          >
            <strong>
              Customer note
            </strong>

            <p>
              {
                order.customer
                  .instructions
              }
            </p>
          </div>
        )}
      </div>

      {/* ITEMS */}

      <h4
        style={
          styles.itemsTitle
        }
      >
        Order Items
      </h4>

      <div
        style={
          styles.items
        }
      >
        {order.items?.map(
          (item, index) => {
            const quantity =
              item.qty ||
              item.quantity ||
              1;

            const itemTotal =
              quantity *
              Number(
                item.price || 0
              );

            return (
              <div
                key={index}
                style={
                  styles.item
                }
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
                        Size:{" "}
                        {item.size}
                      </span>
                    )}

                    {item.milk && (
                      <span>
                        Milk:{" "}
                        {item.milk}
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
                      item.extras
                        .length >
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
                  ₹
                  {itemTotal}
                </strong>
              </div>
            );
          }
        )}
      </div>

      {/* EARNINGS PREVIEW */}

      {(payout > 0 ||
        tip > 0) && (
        <div
          style={
            styles.orderEarnings
          }
        >
          <div>
            <span>
              DELIVERY PAY
            </span>

            <strong>
              ₹{payout}
            </strong>
          </div>

          <div>
            <span>
              TIP
            </span>

            <strong>
              ₹{tip}
            </strong>
          </div>
        </div>
      )}

      {/* PAYMENT */}

      <div
        style={
          styles.paymentBox
        }
      >
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
            textAlign:
              "right",
          }}
        >
          <span
            style={
              styles.paymentLabel
            }
          >
            ORDER TOTAL
          </span>

          <strong
            style={
              styles.total
            }
          >
            ₹
            {order.total ||
              0}
          </strong>
        </div>
      </div>

      {/* ACTIONS */}

      {isAssigned && (
        <div
          style={
            styles.actionGroup
          }
        >
          <button
            disabled={updating}
            onClick={() =>
              onUpdateStatus(
                order,
                "Cancelled"
              )
            }
            style={
              styles.cancelButton
            }
          >
            {updating
              ? "Updating..."
              : "Decline"}
          </button>

          <button
            disabled={updating}
            onClick={() =>
              onUpdateStatus(
                order,
                "Accepted"
              )
            }
            style={
              styles.acceptButton
            }
          >
            {updating
              ? "Accepting..."
              : "✓ Accept Delivery"}
          </button>
        </div>
      )}

      {isAccepted && (
        <button
          disabled={updating}
          onClick={() =>
            onUpdateStatus(
              order,
              "Out for Delivery"
            )
          }
          style={
            styles.startButton
          }
        >
          {updating
            ? "Starting..."
            : "🛵 Start Delivery"}
        </button>
      )}

      {isOutForDelivery && (
        <button
          disabled={updating}
          onClick={() =>
            onUpdateStatus(
              order,
              "Delivered"
            )
          }
          style={
            styles.deliveredButton
          }
        >
          {updating
            ? "Updating..."
            : "✓ Mark Delivered"}
        </button>
      )}
    </div>
  );
}

// =====================================================
// HISTORY CARD
// =====================================================

function HistoryCard({
  order,
  rider,
}) {
  const payout = Number(
    order.riderPayout ||
      rider?.defaultDeliveryPay ||
      0
  );

  const tip = Number(
    order.riderTip || 0
  );

  const totalEarned =
    payout + tip;

  const delivered =
    order.status === "Delivered";

  const timestamp =
    order.deliveredAt ||
    order.riderCancelledAt ||
    order.createdAt;

  return (
    <div
      style={
        styles.historyCard
      }
    >
      <div
        style={
          styles.historyCardTop
        }
      >
        <div>
          <span
            style={
              styles.historyOrderLabel
            }
          >
            ORDER
          </span>

          <strong>
            #
            {order.id.slice(
              0,
              8
            )}
          </strong>
        </div>

        <span
          style={{
            ...styles.historyStatus,
            background: delivered
              ? "#E8F5E9"
              : "#FCE8E6",
            color: delivered
              ? "#2E7D32"
              : "#B42318",
          }}
        >
          {delivered
            ? "Delivered"
            : "Cancelled"}
        </span>
      </div>

      <p
        style={
          styles.historyDate
        }
      >
        {timestamp?.toDate
          ? timestamp
              .toDate()
              .toLocaleString()
          : "Recently"}
      </p>

      {delivered && (
        <div
          style={
            styles.historyEarnings
          }
        >
          <div>
            <span>
              Delivery
            </span>

            <strong>
              ₹{payout}
            </strong>
          </div>

          <div>
            <span>
              Tip
            </span>

            <strong>
              ₹{tip}
            </strong>
          </div>

          <div
            style={
              styles.historyTotal
            }
          >
            <span>
              Earned
            </span>

            <strong>
              ₹{totalEarned}
            </strong>
          </div>
        </div>
      )}

      {order.customer?.name && (
        <p
          style={
            styles.historyCustomer
          }
        >
          👤{" "}
          {order.customer.name}
        </p>
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
    background:
      "linear-gradient(180deg, #F8F5F0 0%, #F4EFE8 100%)",
    padding:
      "34px 20px 60px",
    color: "#32170B",
    fontFamily:
      "Inter, sans-serif",
  },

  container: {
    maxWidth: 850,
    margin: "0 auto",
  },

  center: {
    maxWidth: 500,
    margin: "0 auto",
    textAlign: "center",
    padding:
      "100px 20px",
  },

  loadingIcon: {
    fontSize: 42,
    marginBottom: 15,
  },

  emptyIcon: {
    fontSize: 42,
    marginBottom: 12,
  },

  emptyTitle: {
    fontFamily:
      "Playfair Display, serif",
    fontSize: 24,
    margin:
      "0 0 10px",
    color: "#32170B",
  },

  muted: {
    color: "#786D65",
    fontSize: 14,
    lineHeight: 1.65,
  },

  emailText: {
    color: "#968980",
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
    color: "#A29287",
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "1.5px",
  },

  title: {
    margin:
      "7px 0 5px",
    fontFamily:
      "Playfair Display, serif",
    fontSize: 32,
    letterSpacing:
      "-0.5px",
    color: "#32170B",
  },

  subtitle: {
    margin: 0,
    color: "#786D65",
    fontSize: 14,
  },

  activeBadge: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    background: "#E9F5EA",
    color: "#28733A",
    padding:
      "8px 14px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
  },

  activeDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#35A34A",
  },

  riderCard: {
    background:
      "linear-gradient(135deg, #3A1A0A, #522712)",
    color: "#fff",
    borderRadius: 24,
    padding: 23,
    display: "flex",
    alignItems: "center",
    gap: 15,
    marginBottom: 18,
    boxShadow:
      "0 15px 35px rgba(59,26,8,.16)",
  },

  riderIcon: {
    width: 54,
    height: 54,
    flexShrink: 0,
    borderRadius: 17,
    background:
      "rgba(255,255,255,.1)",
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
    fontSize: 12,
    opacity: 0.65,
  },

  deliveryCount: {
    textAlign: "right",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
  },

  historyButton: {
    marginTop: 8,
    border: "none",
    background:
      "rgba(255,255,255,.1)",
    color: "#fff",
    padding:
      "6px 10px",
    borderRadius: 8,
    fontSize: 10,
    fontWeight: 700,
    cursor: "pointer",
  },

  earningsGrid: {
    display: "grid",
    gridTemplateColumns:
      "2fr 1fr 1fr",
    gap: 12,
    marginBottom: 12,
  },

  earningsHero: {
    background: "#fff",
    border:
      "1px solid #EDE5DC",
    borderRadius: 20,
    padding: 20,
    boxShadow:
      "0 8px 25px rgba(59,26,8,.04)",
  },

  earningsHeroTop: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
  },

  earningsLabel: {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "1px",
    color: "#988A81",
  },

  moneyIcon: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    background: "#F5EBDD",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    color: "#8A5A32",
  },

  earningsAmount: {
    display: "block",
    fontFamily:
      "Playfair Display, serif",
    fontSize: 30,
    marginTop: 12,
    color: "#32170B",
  },

  earningsSubtext: {
    margin:
      "5px 0 0",
    color: "#968980",
    fontSize: 11,
  },

  statCard: {
    background: "#fff",
    border:
      "1px solid #EDE5DC",
    borderRadius: 20,
    padding: 18,
    display: "flex",
    flexDirection: "column",
    justifyContent:
      "space-between",
    minHeight: 100,
  },

  statLabel: {
    color: "#A09289",
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: "1px",
  },

  statValue: {
    fontSize: 20,
    marginTop: 8,
  },

  statHint: {
    color: "#A09289",
    fontSize: 10,
  },

  performanceCard: {
    background: "#FBF8F4",
    border:
      "1px solid #E9E0D7",
    borderRadius: 18,
    padding:
      "17px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-around",
    marginBottom: 35,
  },

  performanceItem: {
    display: "flex",
    flexDirection: "column",
    textAlign: "center",
    gap: 3,
  },

  performanceDivider: {
    height: 30,
    width: 1,
    background: "#E3D9D0",
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
    color: "#A09289",
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: "1.4px",
  },

  sectionTitle: {
    margin:
      "4px 0 0",
    fontFamily:
      "Playfair Display, serif",
    fontSize: 24,
    color: "#32170B",
  },

  countBadge: {
    background: "#32170B",
    color: "#fff",
    minWidth: 30,
    height: 30,
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 800,
  },

  orderList: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },

  orderCard: {
    background: "#fff",
    borderRadius: 24,
    padding: 24,
    border:
      "1px solid #EDE5DC",
    boxShadow:
      "0 10px 30px rgba(59,26,8,.055)",
  },

  orderHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems:
      "flex-start",
    marginBottom: 20,
    gap: 15,
  },

  orderLabel: {
    margin: 0,
    color: "#A09289",
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: "1.2px",
  },

  orderId: {
    margin:
      "4px 0 3px",
    fontFamily:
      "Playfair Display, serif",
    fontSize: 21,
  },

  orderTime: {
    margin: 0,
    color: "#9A8C83",
    fontSize: 10,
  },

  statusBadge: {
    padding:
      "7px 11px",
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 800,
    whiteSpace:
      "nowrap",
  },

  statusAssigned: {
    background: "#FFF3D9",
    color: "#9A6800",
  },

  statusAccepted: {
    background: "#EDE8FF",
    color: "#6247A8",
  },

  statusOut: {
    background: "#E5F1FF",
    color: "#1761A0",
  },

  customerBox: {
    background: "#FCF8F3",
    borderRadius: 17,
    padding: 18,
    marginBottom: 22,
    border:
      "1px solid #F1E9E0",
  },

  customerName: {
    margin:
      "0 0 9px",
    fontWeight: 700,
    fontSize: 15,
  },

  customerDetail: {
    margin:
      "5px 0",
    color: "#62564E",
    fontSize: 13,
  },

  address: {
    margin:
      "8px 0 0",
    color: "#3E2B20",
    fontSize: 13,
    lineHeight: 1.5,
  },

  instructions: {
    marginTop: 13,
    paddingTop: 12,
    borderTop:
      "1px solid #E8DED5",
    color: "#8C7B70",
    fontSize: 11,
    lineHeight: 1.5,
  },

  itemsTitle: {
    margin:
      "0 0 8px",
    fontFamily:
      "Playfair Display, serif",
    fontSize: 16,
  },

  items: {
    display: "flex",
    flexDirection: "column",
    marginBottom: 18,
  },

  item: {
    display: "flex",
    gap: 12,
    padding:
      "11px 0",
    borderBottom:
      "1px solid #F2ECE5",
  },

  itemName: {
    margin: 0,
    fontWeight: 600,
    fontSize: 13,
  },

  itemOptions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 5,
    color: "#8C7B70",
    fontSize: 10,
  },

  itemPrice: {
    fontSize: 13,
  },

  orderEarnings: {
    display: "flex",
    justifyContent:
      "space-between",
    background: "#F5F1EB",
    borderRadius: 13,
    padding:
      "12px 14px",
    marginBottom: 12,
  },

  orderEarnings: {
    display: "flex",
    gap: 30,
    background: "#F4F8F1",
    borderRadius: 13,
    padding:
      "12px 14px",
    marginBottom: 12,
  },

  paymentBox: {
    background: "#F8F3ED",
    borderRadius: 14,
    padding: 15,
    display: "flex",
    justifyContent:
      "space-between",
    marginBottom: 17,
  },

  paymentLabel: {
    display: "block",
    color: "#8C7B70",
    fontSize: 9,
    marginBottom: 4,
    letterSpacing: ".6px",
  },

  total: {
    fontSize: 17,
  },

  actionGroup: {
    display: "grid",
    gridTemplateColumns:
      "110px 1fr",
    gap: 10,
  },

  cancelButton: {
    border:
      "1px solid #E4D8D1",
    background: "#fff",
    color: "#8A4B3D",
    padding:
      "14px 15px",
    borderRadius: 13,
    fontWeight: 700,
    cursor: "pointer",
  },

  acceptButton: {
    border: "none",
    background: "#3B1A08",
    color: "#fff",
    padding:
      "14px 15px",
    borderRadius: 13,
    fontWeight: 700,
    cursor: "pointer",
  },

  startButton: {
    width: "100%",
    background: "#1765A5",
    color: "#fff",
    border: "none",
    padding:
      "15px 20px",
    borderRadius: 13,
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
  },

  deliveredButton: {
    width: "100%",
    background: "#278B52",
    color: "#fff",
    border: "none",
    padding:
      "15px 20px",
    borderRadius: 13,
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
  },

  emptyCard: {
    background: "#fff",
    borderRadius: 24,
    padding:
      "60px 25px",
    textAlign: "center",
    border:
      "1px solid #EDE5DC",
  },

  historyBackdrop: {
    position: "fixed",
    inset: 0,
    background:
      "rgba(25,15,10,.38)",
    backdropFilter:
      "blur(3px)",
    zIndex: 9998,
  },

  historyDrawer: {
    position: "fixed",
    top: 0,
    right: 0,
    width:
      "min(470px, 94vw)",
    height: "100vh",
    background: "#FCF9F5",
    zIndex: 9999,
    boxShadow:
      "-15px 0 50px rgba(0,0,0,.18)",
    padding: "28px",
    overflowY: "auto",
  },

  historyHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems:
      "flex-start",
    paddingBottom: 20,
    borderBottom:
      "1px solid #E8E0D9",
  },

  closeHistoryButton: {
    width: 38,
    height: 38,
    borderRadius: "50%",
    border:
      "1px solid #E1D8D0",
    background: "#fff",
    color: "#3B302A",
    fontSize: 24,
    cursor: "pointer",
  },

  historyTabs: {
    display: "flex",
    gap: 8,
    margin:
      "20px 0",
    background: "#F0EAE3",
    padding: 5,
    borderRadius: 12,
  },

  historyTab: {
    flex: 1,
    border: "none",
    background: "transparent",
    padding:
      "10px 8px",
    borderRadius: 9,
    color: "#806F64",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
  },

  historyTabActive: {
    background: "#fff",
    color: "#32170B",
    boxShadow:
      "0 2px 8px rgba(0,0,0,.05)",
  },

  historyList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },

  historyCard: {
    background: "#fff",
    border:
      "1px solid #EDE5DC",
    borderRadius: 17,
    padding: 16,
  },

  historyCardTop: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
  },

  historyOrderLabel: {
    display: "block",
    fontSize: 8,
    color: "#A09289",
    fontWeight: 800,
    letterSpacing: 1,
    marginBottom: 3,
  },

  historyStatus: {
    padding:
      "5px 9px",
    borderRadius: 999,
    fontSize: 9,
    fontWeight: 800,
  },

  historyDate: {
    color: "#9A8C83",
    fontSize: 10,
    margin:
      "8px 0 13px",
  },

  historyEarnings: {
    display: "grid",
    gridTemplateColumns:
      "1fr 1fr 1.2fr",
    gap: 8,
    paddingTop: 12,
    borderTop:
      "1px solid #F0E9E2",
  },

  historyEarnings: {
    display: "grid",
    gridTemplateColumns:
      "1fr 1fr 1.2fr",
    gap: 8,
    paddingTop: 12,
    borderTop:
      "1px solid #F0E9E2",
  },

  historyTotal: {
    textAlign: "right",
  },

 
  historyCustomer: {
    margin:
      "13px 0 0",
    paddingTop: 11,
    borderTop:
      "1px solid #F0E9E2",
    color: "#62564E",
    fontSize: 11,
  },

  historyEmpty: {
    textAlign: "center",
    padding:
      "70px 20px",
  },
};
