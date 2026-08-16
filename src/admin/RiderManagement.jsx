import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";

import { db } from "../firebase";

export default function RidersAdmin({ setPage, setActivePage }) {
  const [riders, setRiders] = useState([]);
  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingRider, setEditingRider] = useState(null);
  const [selectedRider, setSelectedRider] = useState(null);

  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    name: "",
    phone: "",
    email: "",
    vehicleType: "",
    vehicleNumber: "",
    deliveryPay: "50",
  };

  const [form, setForm] = useState(emptyForm);

  // =====================================================
  // LOAD RIDERS
  // =====================================================

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "riders"),
      (snapshot) => {
        const riderList = snapshot.docs.map((riderDoc) => ({
          id: riderDoc.id,
          ...riderDoc.data(),
        }));

        setRiders(riderList);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading riders:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // =====================================================
  // LOAD ORDERS
  // =====================================================

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "orders"),
      (snapshot) => {
        const orderList = snapshot.docs.map((orderDoc) => ({
          id: orderDoc.id,
          ...orderDoc.data(),
        }));

        setOrders(orderList);
        setOrdersLoading(false);
      },
      (error) => {
        console.error("Error loading orders:", error);
        setOrdersLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // =====================================================
  // RIDER STATS
  // =====================================================

  const getRiderStats = (rider) => {
    const riderOrders = orders.filter(
      (order) => order.riderId === rider.id
    );

    const completedOrders = riderOrders.filter(
      (order) => order.status === "Delivered"
    );

    const activeOrders = riderOrders.filter(
      (order) =>
        order.status === "Assigned to Rider" ||
        order.status === "Out for Delivery"
    );

    const deliveryPay = Number(rider.deliveryPay || 0);

    const deliveryEarnings =
      completedOrders.length * deliveryPay;

    const tips = completedOrders.reduce(
      (sum, order) =>
        sum +
        Number(
          order.riderTip ??
            order.tip ??
            order.tipAmount ??
            0
        ),
      0
    );

    const totalEarnings =
      completedOrders.reduce(
        (sum, order) =>
          sum +
          Number(
            order.riderTotalEarning ??
              order.riderEarning ??
              deliveryPay
          ),
        0
      ) || deliveryEarnings + tips;

    return {
      totalOrders: riderOrders.length,
      completedOrders: completedOrders.length,
      activeOrders: activeOrders.length,
      deliveryEarnings,
      tips,
      totalEarnings,
    };
  };

  // =====================================================
  // FILTER RIDERS
  // =====================================================

  const filteredRiders = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return riders;

    return riders.filter((rider) =>
      [
        rider.name,
        rider.phone,
        rider.email,
        rider.vehicleType,
        rider.vehicleNumber,
      ]
        .filter(Boolean)
        .some((field) =>
          String(field).toLowerCase().includes(value)
        )
    );
  }, [riders, search]);

  // =====================================================
  // GLOBAL STATS
  // =====================================================

  const activeRiders = riders.filter(
    (rider) => rider.status === "Active"
  ).length;

  const inactiveRiders = riders.filter(
    (rider) => rider.status !== "Active"
  ).length;

  const availableRiders = riders.filter(
  (rider) =>
    rider.status === "Active" &&
    rider.isOnDuty === true
).length;

  const completedDeliveries = riders.reduce(
    (sum, rider) =>
      sum + getRiderStats(rider).completedOrders,
    0
  );

  const totalTips = riders.reduce(
    (sum, rider) =>
      sum + getRiderStats(rider).tips,
    0
  );

  const totalRiderEarnings = riders.reduce(
    (sum, rider) =>
      sum + getRiderStats(rider).totalEarnings,
    0
  );

  // =====================================================
  // OPEN ADD FORM
  // =====================================================

  const openAddForm = () => {
    setEditingRider(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  // =====================================================
  // OPEN EDIT FORM
  // =====================================================

  const openEditForm = (rider) => {
    setEditingRider(rider);

    setForm({
      name: rider.name || "",
      phone: rider.phone || "",
      email: rider.email || "",
      vehicleType: rider.vehicleType || "",
      vehicleNumber: rider.vehicleNumber || "",
      deliveryPay: String(rider.deliveryPay ?? 50),
    });

    setShowForm(true);
  };

  // =====================================================
  // SAVE RIDER
  // =====================================================

  const handleSaveRider = async (e) => {
    e.preventDefault();

    if (!form.name.trim() || !form.phone.trim()) {
      alert("Rider name and phone are required.");
      return;
    }

    const deliveryPay = Number(form.deliveryPay);

    if (
      Number.isNaN(deliveryPay) ||
      deliveryPay < 0
    ) {
      alert("Enter a valid delivery pay.");
      return;
    }

    try {
      setSaving(true);

      const riderData = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        vehicleType: form.vehicleType,
        vehicleNumber: form.vehicleNumber.trim(),
        deliveryPay,
        deliveryRate: deliveryPay,
      };

      if (editingRider) {
        await updateDoc(
          doc(db, "riders", editingRider.id),
          riderData
        );
      } else {
        await addDoc(collection(db, "riders"), {
          ...riderData,
          status: "Active",
          dutyStatus: "Off Duty",
          createdAt: serverTimestamp(),
        });
      }

      setForm(emptyForm);
      setEditingRider(null);
      setShowForm(false);
    } catch (error) {
      console.error("Error saving rider:", error);
      alert("Failed to save rider.");
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // TOGGLE STATUS
  // =====================================================

  const toggleStatus = async (rider) => {
    try {
      const newStatus =
        rider.status === "Active"
          ? "Inactive"
          : "Active";

      await updateDoc(
        doc(db, "riders", rider.id),
        {
          status: newStatus,
        }
      );

      if (
        selectedRider?.id === rider.id
      ) {
        setSelectedRider({
          ...selectedRider,
          status: newStatus,
        });
      }
    } catch (error) {
      console.error(
        "Error updating rider status:",
        error
      );

      alert("Failed to update rider status.");
    }
  };





  // =====================================================
// TOGGLE DUTY STATUS
// =====================================================

const toggleDutyStatus = async (rider) => {
  try {
    const newDutyStatus =
      rider.dutyStatus === "On Duty"
        ? "Off Duty"
        : "On Duty";

    await updateDoc(
      doc(db, "riders", rider.id),
      {
        dutyStatus: newDutyStatus,
        dutyUpdatedAt: serverTimestamp(),
      }
    );

    if (selectedRider?.id === rider.id) {
      setSelectedRider({
        ...selectedRider,
        dutyStatus: newDutyStatus,
      });
    }
  } catch (error) {
    console.error(
      "Error updating duty status:",
      error
    );

    alert("Failed to update duty status.");
  }
};
  // =====================================================
  // RIDER DETAILS
  // =====================================================

  const openDetails = (rider) => {
    setSelectedRider(rider);
  };

  // =====================================================
  // RENDER
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
              DELIVERY OPERATIONS
            </p>

            <h1 style={styles.title}>
              Riders
            </h1>

            <p style={styles.subtitle}>
              Manage delivery partners, earnings and performance.
            </p>
          </div>

          <button
            onClick={openAddForm}
            style={styles.primaryButton}
          >
            + Add Rider
          </button>
        </header>

        {/* =================================================
            STATS
        ================================================= */}

        <div style={styles.statsGrid}>

          <StatCard
            label="Total Riders"
            value={riders.length}
            icon="👥"
          />

          <StatCard
            label="Active Riders"
            value={activeRiders}
            icon="●"
            positive
          />
          
          <StatCard
  label="Available Riders"
  value={availableRiders}
  icon="🟢"
  positive
/>

          <StatCard
            label="Deliveries Completed"
            value={completedDeliveries}
            icon="✓"
          />

          <StatCard
            label="Rider Earnings"
            value={`₹${totalRiderEarnings}`}
            icon="₹"
          />

          <StatCard
            label="Tips Collected"
            value={`₹${totalTips}`}
            icon="♥"
          />
        </div>

        {/* =================================================
            SEARCH
        ================================================= */}

        <div style={styles.toolbar}>
          <div style={styles.searchBox}>
            <span style={styles.searchIcon}>
              ⌕
            </span>

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search riders, phone, vehicle..."
              style={styles.searchInput}
            />
          </div>

          <div style={styles.resultText}>
            {filteredRiders.length} rider
            {filteredRiders.length !== 1
              ? "s"
              : ""}
          </div>
        </div>

        {/* =================================================
            ADD / EDIT FORM
        ================================================= */}

        {showForm && (
          <div style={styles.formCard}>

            <div style={styles.formHeader}>
              <div>
                <p style={styles.sectionEyebrow}>
                  {editingRider
                    ? "EDIT PROFILE"
                    : "NEW DELIVERY PARTNER"}
                </p>

                <h2 style={styles.formTitle}>
                  {editingRider
                    ? "Edit Rider"
                    : "Add Rider"}
                </h2>
              </div>

              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingRider(null);
                }}
                style={styles.iconButton}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveRider}>

              <div style={styles.formGrid}>

                <Input
                  label="Rider Name *"
                  value={form.name}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      name: value,
                    })
                  }
                />

                <Input
                  label="Phone *"
                  value={form.phone}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      phone: value,
                    })
                  }
                />

                <Input
                  label="Email"
                  value={form.email}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      email: value,
                    })
                  }
                />

                <div>
                  <label style={labelStyle}>
                    Vehicle Type
                  </label>

                  <select
                    value={form.vehicleType}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        vehicleType:
                          e.target.value,
                      })
                    }
                    style={inputStyle}
                  >
                    <option value="">
                      Select vehicle
                    </option>
                    <option value="Bike">
                      Bike
                    </option>
                    <option value="Scooter">
                      Scooter
                    </option>
                    <option value="Bicycle">
                      Bicycle
                    </option>
                    <option value="Car">
                      Car
                    </option>
                  </select>
                </div>

                <Input
                  label="Vehicle Number"
                  value={form.vehicleNumber}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      vehicleNumber: value,
                    })
                  }
                />

                {/* DELIVERY PAY */}

                <div>
                  <label style={labelStyle}>
                    Pay Per Delivery (₹)
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={form.deliveryPay}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        deliveryPay:
                          e.target.value,
                      })
                    }
                    style={inputStyle}
                  />

                  <p style={helpText}>
                    Rider earns this amount for each
                    completed delivery.
                  </p>
                </div>
              </div>

              <div style={formActions}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    ...styles.primaryButton,
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  {saving
                    ? "Saving..."
                    : editingRider
                    ? "Save Changes"
                    : "Add Rider"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingRider(null);
                  }}
                  style={styles.secondaryButton}
                >
                  Cancel
                </button>
              </div>

            </form>
          </div>
        )}

        {/* =================================================
            RIDER LIST
        ================================================= */}

        <div style={styles.tableCard}>

          <div style={styles.tableHeader}>
            <div>
              <p style={styles.sectionEyebrow}>
                DELIVERY TEAM
              </p>

              <h2 style={styles.sectionTitle}>
                Delivery Partners
              </h2>
            </div>

            <span style={styles.countBadge}>
              {riders.length}
            </span>
          </div>

          {loading ? (
            <div style={styles.emptyState}>
              Loading riders...
            </div>
          ) : filteredRiders.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>
                🛵
              </div>

              <strong>
                {search
                  ? "No riders found"
                  : "No riders added yet"}
              </strong>

              <p>
                {search
                  ? "Try a different search."
                  : "Add your first delivery partner to get started."}
              </p>
            </div>
          ) : (
            <div style={styles.riderList}>

              {filteredRiders.map((rider) => {
                const stats =
                  getRiderStats(rider);

                return (
                  <div
                    key={rider.id}
                    style={styles.riderRow}
                  >

                    {/* RIDER */}

                    <div style={styles.riderIdentity}>

                      <div style={styles.avatar}>
                        {rider.name
                          ?.charAt(0)
                          ?.toUpperCase() || "R"}
                      </div>

                      <div>
                        <strong style={styles.riderName}>
                          {rider.name}
                        </strong>

                        <p style={styles.riderMeta}>
                          {rider.phone}
                        </p>

                        {rider.email && (
                          <p style={styles.riderEmail}>
                            {rider.email}
                          </p>
                        )}
                      </div>

                    </div>

                    {/* VEHICLE */}

                    <div style={styles.rowColumn}>
                      <span style={styles.columnLabel}>
                        VEHICLE
                      </span>

                      <strong>
                        {rider.vehicleType ||
                          "—"}
                      </strong>

                      <span style={styles.smallText}>
                        {rider.vehicleNumber ||
                          "No registration"}
                      </span>
                    </div>

                    {/* DELIVERY */}

                    <div style={styles.rowColumn}>
                      <span style={styles.columnLabel}>
                        DELIVERIES
                      </span>

                      <strong>
                        {stats.completedOrders}
                      </strong>

                      <span style={styles.smallText}>
                        {stats.activeOrders} active
                      </span>
                    </div>

                    {/* PAY */}

                    <div style={styles.rowColumn}>
                      <span style={styles.columnLabel}>
                        PAY / DELIVERY
                      </span>

                      <strong>
                        ₹{rider.deliveryPay || 0}
                      </strong>

                      <span style={styles.smallText}>
                        ₹{stats.tips} tips
                      </span>
                    </div>

     {/* STATUS */}

<div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>

  {/* ACCOUNT STATUS */}
  <span
    style={{
      ...styles.statusBadge,
      ...(rider.status === "Active"
        ? styles.activeStatus
        : styles.inactiveStatus),
    }}
  >
    <span
      style={{
        ...styles.statusDot,
        background:
          rider.status === "Active"
            ? "#397044"
            : "#8A7D73",
      }}
    />

    {rider.status || "Inactive"}
  </span>

  {/* DUTY STATUS */}
{rider.status === "Active" && (
  <span
    style={{
      ...styles.statusBadge,
      background:
        rider.dutyStatus === "On Duty"
          ? "#D9FF8A"
          : "#E8E3DD",
      color:
        rider.dutyStatus === "On Duty"
          ? "#294000"
          : "#6F675F",
    }}
  >
    <span
      style={{
        ...styles.statusDot,
        background:
          rider.dutyStatus === "On Duty"
            ? "#8CFF00"
            : "#9B948C",
        boxShadow:
          rider.dutyStatus === "On Duty"
            ? "0 0 7px #8CFF00"
            : "none",
      }}
    />

    {rider.dutyStatus === "On Duty"
      ? "On Duty"
      : "Off Duty"}
  </span>
)}

</div>


                    
                    {/* ACTIONS */}

<div style={styles.actions}>

  <button
    onClick={() =>
      openDetails(rider)
    }
    style={styles.viewButton}
  >
    View
  </button>

  <button
    onClick={() =>
      openEditForm(rider)
    }
    style={styles.editButton}
  >
    Edit
  </button>

  <button
    onClick={() =>
      toggleDutyStatus(rider)
    }
    style={styles.moreButton}
  >
    {rider.dutyStatus === "On Duty"
      ? "Go Off Duty"
      : "Go On Duty"}
  </button>

  <button
    onClick={() =>
      toggleStatus(rider)
    }
    style={styles.moreButton}
  >
    {rider.status === "Active"
      ? "Deactivate"
      : "Activate"}
  </button>

</div>

                  </div>
                );
              })}

            </div>
          )}
        </div>

        {/* =================================================
            RIDER DETAILS DRAWER
        ================================================= */}

        {selectedRider && (
          <>
            <div
              onClick={() =>
                setSelectedRider(null)
              }
              style={styles.drawerBackdrop}
            />

            <div style={styles.drawer}>

              <div style={styles.drawerHeader}>
                <div>
                  <p style={styles.sectionEyebrow}>
                    RIDER PROFILE
                  </p>

                  <h2 style={styles.drawerTitle}>
                    {selectedRider.name}
                  </h2>
                </div>

                <button
                  onClick={() =>
                    setSelectedRider(null)
                  }
                  style={styles.iconButton}
                >
                  ×
                </button>
              </div>

              <div style={styles.profileBlock}>

                <div style={styles.largeAvatar}>
                  {selectedRider.name
                    ?.charAt(0)
                    ?.toUpperCase() || "R"}
                </div>

                <div>
                  <strong
                    style={{
                      fontSize: 18,
                    }}
                  >
                    {selectedRider.name}
                  </strong>

                  <p style={styles.riderMeta}>
                    {selectedRider.phone}
                  </p>

                <div
  style={{
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    marginTop: "8px",
  }}
>
  {/* ACCOUNT STATUS */}
  <span
    style={{
      ...styles.statusBadge,
      ...(selectedRider.status === "Active"
        ? styles.activeStatus
        : styles.inactiveStatus),
    }}
  >
    <span
      style={{
        ...styles.statusDot,
        background:
          selectedRider.status === "Active"
            ? "#397044"
            : "#8A7D73",
      }}
    />

    {selectedRider.status || "Inactive"}
  </span>

  {/* DUTY STATUS */}
  {selectedRider.status === "Active" && (
    <span
      style={{
        ...styles.statusBadge,
        background: selectedRider.isOnDuty
          ? "#E8F4EA"
          : "#F1ECE8",
        color: selectedRider.isOnDuty
          ? "#397044"
          : "#7C7068",
      }}
    >
      <span
        style={{
          ...styles.statusDot,
          background: selectedRider.isOnDuty
            ? "#397044"
            : "#8A7D73",
        }}
      />

      {selectedRider.isOnDuty
        ? "On Duty"
        : "Off Duty"}
    </span>
  )}
</div>
                </div>

              </div>

              <div style={styles.detailGrid}>

                <Detail
                  label="Vehicle"
                  value={
                    selectedRider.vehicleType ||
                    "—"
                  }
                />

                <Detail
                  label="Vehicle Number"
                  value={
                    selectedRider.vehicleNumber ||
                    "—"
                  }
                />

                <Detail
                  label="Phone"
                  value={
                    selectedRider.phone ||
                    "—"
                  }
                />

                <Detail
                  label="Email"
                  value={
                    selectedRider.email ||
                    "—"
                  }
                />

                <Detail
                  label="Pay Per Delivery"
                  value={`₹${
                    selectedRider.deliveryPay ||
                    0
                  }`}
                />
                <Detail
  label="Availability"
  value={
    selectedRider.status !== "Active"
      ? "Unavailable"
      : selectedRider.isOnDuty
      ? "On Duty"
      : "Off Duty"
  }
/>

              </div>

              {/* PERFORMANCE */}

              <div style={styles.drawerSection}>

                <p style={styles.sectionEyebrow}>
                  PERFORMANCE
                </p>

                <div style={styles.performanceGrid}>

                  <MiniStat
                    label="Completed"
                    value={
                      getRiderStats(
                        selectedRider
                      ).completedOrders
                    }
                  />

                  <MiniStat
                    label="Active"
                    value={
                      getRiderStats(
                        selectedRider
                      ).activeOrders
                    }
                  />

                  <MiniStat
                    label="Tips"
                    value={`₹${
                      getRiderStats(
                        selectedRider
                      ).tips
                    }`}
                  />

                  <MiniStat
                    label="Total Earned"
                    value={`₹${
                      getRiderStats(
                        selectedRider
                      ).totalEarnings
                    }`}
                  />

                </div>

              </div>

              {/* ACTIONS */}

              <div style={styles.drawerActions}>

                <button
                  onClick={() => {
                    openEditForm(
                      selectedRider
                    );
                    setSelectedRider(null);
                  }}
                  style={styles.primaryButton}
                >
                  Edit Rider
                </button>

                <button
                  onClick={() =>
                    toggleStatus(
                      selectedRider
                    )
                  }
                  style={styles.secondaryButton}
                >
                  {selectedRider.status ===
                  "Active"
                    ? "Deactivate Rider"
                    : "Activate Rider"}
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
// STAT CARD
// =====================================================

function StatCard({
  label,
  value,
  icon,
  positive,
}) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statTop}>
        <span style={styles.statLabel}>
          {label}
        </span>

        <span
          style={{
            ...styles.statIcon,
            ...(positive
              ? styles.statIconPositive
              : {}),
          }}
        >
          {icon}
        </span>
      </div>

      <strong style={styles.statValue}>
        {value}
      </strong>
    </div>
  );
}

// =====================================================
// INPUT
// =====================================================

function Input({
  label,
  value,
  onChange,
}) {
  return (
    <div>
      <label style={labelStyle}>
        {label}
      </label>

      <input
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        style={inputStyle}
      />
    </div>
  );
}

// =====================================================
// DETAIL
// =====================================================

function Detail({ label, value }) {
  return (
    <div style={styles.detail}>
      <span style={styles.columnLabel}>
        {label}
      </span>

      <strong>{value}</strong>
    </div>
  );
}

// =====================================================
// MINI STAT
// =====================================================

function MiniStat({ label, value }) {
  return (
    <div style={styles.miniStat}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = {
  page: {
    minHeight: "100vh",
    background: "#F8F5F1",
    color: "#2E2723",
    padding: "32px",
  },

  container: {
    maxWidth: 1250,
    margin: "0 auto",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 20,
    marginBottom: 30,
  },

  eyebrow: {
    margin: 0,
    color: "#9A8C82",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "1.3px",
  },

  title: {
    fontFamily: "Playfair Display, serif",
    fontSize: 34,
    margin: "5px 0",
  },

  subtitle: {
    margin: 0,
    color: "#8A7D73",
    fontSize: 14,
  },

  primaryButton: {
    border: "none",
    background: "#2E2723",
    color: "#fff",
    padding: "12px 19px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
  },

  secondaryButton: {
    border: "1px solid #DDD3CB",
    background: "#fff",
    color: "#4A4039",
    padding: "11px 18px",
    borderRadius: 9,
    cursor: "pointer",
    fontWeight: 600,
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(170px,1fr))",
    gap: 14,
    marginBottom: 25,
  },

  statCard: {
    background: "#fff",
    border: "1px solid #E8E0D9",
    borderRadius: 16,
    padding: 19,
  },

  statTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  statLabel: {
    color: "#8A7D73",
    fontSize: 12,
    fontWeight: 600,
  },

  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    background: "#F4EFEA",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
  },

  statIconPositive: {
    background: "#E8F4EA",
    color: "#397044",
  },

  statValue: {
    fontSize: 25,
  },

  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 15,
    marginBottom: 15,
  },

  searchBox: {
    width: "min(420px,100%)",
    background: "#fff",
    border: "1px solid #E2DAD3",
    borderRadius: 11,
    display: "flex",
    alignItems: "center",
    padding: "0 13px",
  },

  searchIcon: {
    fontSize: 20,
    color: "#9A8C82",
  },

  searchInput: {
    width: "100%",
    border: "none",
    outline: "none",
    padding: "12px 9px",
    fontSize: 13,
    background: "transparent",
  },

  resultText: {
    color: "#9A8C82",
    fontSize: 12,
  },

  formCard: {
    background: "#fff",
    border: "1px solid #E8E0D9",
    borderRadius: 18,
    padding: 24,
    marginBottom: 20,
  },

  formHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 22,
  },

  sectionEyebrow: {
    margin: 0,
    color: "#9A8C82",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "1px",
  },

  formTitle: {
    fontFamily: "Playfair Display, serif",
    margin: "5px 0 0",
    fontSize: 23,
  },

  iconButton: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    border: "1px solid #DDD3CB",
    background: "#fff",
    cursor: "pointer",
    fontSize: 22,
    color: "#5E5148",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2,minmax(0,1fr))",
    gap: 17,
  },

  formActions: {
    display: "flex",
    gap: 10,
    marginTop: 22,
  },

  tableCard: {
    background: "#fff",
    border: "1px solid #E8E0D9",
    borderRadius: 18,
    overflow: "hidden",
  },

  tableHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "21px 23px",
    borderBottom: "1px solid #EEE8E3",
  },

  sectionTitle: {
    fontFamily: "Playfair Display, serif",
    margin: "4px 0 0",
    fontSize: 22,
  },

  countBadge: {
    minWidth: 30,
    height: 30,
    padding: "0 8px",
    borderRadius: 99,
    background: "#2E2723",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
  },

  riderList: {
    display: "flex",
    flexDirection: "column",
  },

  riderRow: {
    display: "grid",
    gridTemplateColumns:
      "2fr 1.1fr .8fr 1fr .9fr 1.7fr",
    gap: 18,
    alignItems: "center",
    padding: "18px 22px",
    borderBottom: "1px solid #F0EBE7",
  },

  riderIdentity: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
  },

  avatar: {
    width: 43,
    height: 43,
    borderRadius: 14,
    background: "#F0E9E2",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 15,
    flexShrink: 0,
  },

  riderName: {
    display: "block",
    fontSize: 14,
  },

  riderMeta: {
    margin: "3px 0 0",
    color: "#766960",
    fontSize: 12,
  },

  riderEmail: {
    margin: "2px 0 0",
    color: "#A09289",
    fontSize: 11,
  },

  rowColumn: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    fontSize: 13,
  },

  columnLabel: {
    color: "#A09289",
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: ".8px",
    marginBottom: 3,
  },

  smallText: {
    color: "#96877D",
    fontSize: 11,
  },

  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 10px",
    borderRadius: 99,
    fontSize: 11,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },

  activeStatus: {
    background: "#E8F4EA",
    color: "#397044",
  },

  inactiveStatus: {
    background: "#F1ECE8",
    color: "#7C7068",
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
  },

  actions: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
  },

  viewButton: {
    border: "none",
    background: "#F3EEE9",
    color: "#4A4039",
    padding: "7px 10px",
    borderRadius: 7,
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 600,
  },

  editButton: {
    border: "1px solid #DDD3CB",
    background: "#fff",
    color: "#4A4039",
    padding: "7px 10px",
    borderRadius: 7,
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 600,
  },

  moreButton: {
    border: "1px solid #DDD3CB",
    background: "#fff",
    color: "#70645C",
    padding: "7px 10px",
    borderRadius: 7,
    cursor: "pointer",
    fontSize: 11,
  },

  emptyState: {
    textAlign: "center",
    padding: "65px 25px",
    color: "#8A7D73",
    fontSize: 14,
  },

  emptyIcon: {
    fontSize: 38,
    marginBottom: 10,
  },

  drawerBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(30,22,18,.28)",
    zIndex: 9998,
  },

  drawer: {
    position: "fixed",
    top: 0,
    right: 0,
    width: "min(470px,92vw)",
    height: "100vh",
    overflowY: "auto",
    background: "#FDFAF6",
    zIndex: 9999,
    padding: 28,
    boxSizing: "border-box",
    boxShadow: "-15px 0 45px rgba(0,0,0,.12)",
  },

  drawerHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 20,
    borderBottom: "1px solid #E8E0D9",
  },

  drawerTitle: {
    fontFamily: "Playfair Display, serif",
    margin: "5px 0 0",
    fontSize: 28,
  },

  profileBlock: {
    display: "flex",
    alignItems: "center",
    gap: 15,
    padding: "25px 0",
  },

  largeAvatar: {
    width: 62,
    height: 62,
    borderRadius: 20,
    background: "#EDE4DB",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 23,
    fontWeight: 700,
  },

  detailGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },

  detail: {
    background: "#fff",
    border: "1px solid #E8E0D9",
    borderRadius: 12,
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 3,
    fontSize: 13,
  },

  drawerSection: {
    marginTop: 28,
  },

  performanceGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginTop: 10,
  },

  miniStat: {
    background: "#fff",
    border: "1px solid #E8E0D9",
    borderRadius: 12,
    padding: 15,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },

  drawerActions: {
    display: "flex",
    gap: 10,
    marginTop: 25,
    paddingTop: 20,
    borderTop: "1px solid #E8E0D9",
  },
};

const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 700,
  marginBottom: 7,
  color: "#5E5148",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 12px",
  border: "1px solid #DDD3CB",
  borderRadius: 8,
  outline: "none",
  fontSize: 13,
  background: "#fff",
};

const helpText = {
  margin: "6px 0 0",
  color: "#9A8C82",
  fontSize: 10,
  lineHeight: 1.4,
};
