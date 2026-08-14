import React, { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export default function RidersAdmin({setPage, setActivePage}) {
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    vehicleType: "",
    vehicleNumber: "",
  });

  // =========================
  // LOAD RIDERS
  // =========================
  const loadRiders = async () => {
    try {
      setLoading(true);

      const snapshot = await getDocs(collection(db, "riders"));

      const riderList = snapshot.docs.map((riderDoc) => ({
        id: riderDoc.id,
        ...riderDoc.data(),
      }));

      setRiders(riderList);
    } catch (error) {
      console.error("Error loading riders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRiders();
  }, []);

  // =========================
  // ADD RIDER
  // =========================
  const handleAddRider = async (e) => {
    e.preventDefault();

    if (!form.name.trim() || !form.phone.trim()) {
      alert("Rider name and phone are required.");
      return;
    }

    try {
      await addDoc(collection(db, "riders"), {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        vehicleType: form.vehicleType,
        vehicleNumber: form.vehicleNumber.trim(),
        status: "Active",
        createdAt: serverTimestamp(),
      });

      setForm({
        name: "",
        phone: "",
        email: "",
        vehicleType: "",
        vehicleNumber: "",
      });

      setShowForm(false);

      await loadRiders();
    } catch (error) {
      console.error("Error adding rider:", error);
      alert("Failed to add rider.");
    }
  };

  // =========================
  // TOGGLE RIDER STATUS
  // =========================
  const toggleStatus = async (rider) => {
    try {
      const newStatus =
        rider.status === "Active" ? "Inactive" : "Active";

      await updateDoc(doc(db, "riders", rider.id), {
        status: newStatus,
      });

      await loadRiders();
    } catch (error) {
      console.error("Error updating rider status:", error);
    }
  };

  const activeRiders = riders.filter(
    (rider) => rider.status === "Active"
  ).length;

  const inactiveRiders = riders.filter(
    (rider) => rider.status === "Inactive"
  ).length;

  return (
    <div
      style={{
        padding: "32px",
        background: "#F8F5F1",
        minHeight: "100vh",
        color: "#2E2723",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "28px",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "Playfair Display, serif",
              fontSize: "32px",
              margin: 0,
            }}
          >
            Riders
          </h1>

          <p
            style={{
              marginTop: "6px",
              color: "#8A7D73",
            }}
          >
            Manage your delivery partners.
          </p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          style={{
            border: "none",
            background: "#2E2723",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          + Add Rider
        </button>
      </div>

      {/* STATS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        <StatCard
          title="Total Riders"
          value={riders.length}
        />

        <StatCard
          title="Active Riders"
          value={activeRiders}
        />

        <StatCard
          title="Inactive Riders"
          value={inactiveRiders}
        />
      </div>

      {/* RIDER FORM */}
      {showForm && (
        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            padding: "24px",
            marginBottom: "24px",
            border: "1px solid #E8E0D9",
          }}
        >
          <h2
            style={{
              fontFamily: "Playfair Display, serif",
              marginTop: 0,
            }}
          >
            Add Rider
          </h2>

          <form onSubmit={handleAddRider}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
              }}
            >
              <Input
                label="Rider Name *"
                value={form.name}
                onChange={(value) =>
                  setForm({ ...form, name: value })
                }
              />

              <Input
                label="Phone *"
                value={form.phone}
                onChange={(value) =>
                  setForm({ ...form, phone: value })
                }
              />

              <Input
                label="Email"
                value={form.email}
                onChange={(value) =>
                  setForm({ ...form, email: value })
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
                      vehicleType: e.target.value,
                    })
                  }
                  style={inputStyle}
                >
                  <option value="">Select vehicle</option>
                  <option value="Bike">Bike</option>
                  <option value="Scooter">Scooter</option>
                  <option value="Bicycle">Bicycle</option>
                  <option value="Car">Car</option>
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
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                marginTop: "20px",
              }}
            >
              <button
                type="submit"
                style={primaryButton}
              >
                Add Rider
              </button>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={secondaryButton}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* RIDER TABLE */}
      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          border: "1px solid #E8E0D9",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #E8E0D9",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontFamily: "Playfair Display, serif",
              fontSize: "22px",
            }}
          >
            Delivery Partners
          </h2>
        </div>

        {loading ? (
          <div style={{ padding: "30px", color: "#8A7D73" }}>
            Loading riders...
          </div>
        ) : riders.length === 0 ? (
          <div
            style={{
              padding: "50px",
              textAlign: "center",
              color: "#8A7D73",
            }}
          >
            No riders added yet.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr>
                  <th style={thStyle}>Rider</th>
                  <th style={thStyle}>Phone</th>
                  <th style={thStyle}>Vehicle</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>

              <tbody>
                {riders.map((rider) => (
                  <tr key={rider.id}>
                    <td style={tdStyle}>
                      <strong>{rider.name}</strong>
                      {rider.email && (
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#9A8C82",
                            marginTop: "3px",
                          }}
                        >
                          {rider.email}
                        </div>
                      )}
                    </td>

                    <td style={tdStyle}>
                      {rider.phone}
                    </td>

                    <td style={tdStyle}>
                      {rider.vehicleType || "—"}
                      {rider.vehicleNumber && (
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#9A8C82",
                          }}
                        >
                          {rider.vehicleNumber}
                        </div>
                      )}
                    </td>

                    <td style={tdStyle}>
                      <span
                        style={{
                          padding: "5px 10px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: 600,
                          background:
                            rider.status === "Active"
                              ? "#E8F4EA"
                              : "#F1ECE8",
                          color:
                            rider.status === "Active"
                              ? "#397044"
                              : "#7C7068",
                        }}
                      >
                        {rider.status}
                      </span>
                    </td>

                    <td style={tdStyle}>
                      <button
                        onClick={() => toggleStatus(rider)}
                        style={{
                          border: "1px solid #DDD3CB",
                          background: "#fff",
                          padding: "7px 12px",
                          borderRadius: "6px",
                          cursor: "pointer",
                        }}
                      >
                        {rider.status === "Active"
                          ? "Deactivate"
                          : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// =========================
// SMALL COMPONENTS
// =========================

function StatCard({ title, value }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E8E0D9",
        borderRadius: "12px",
        padding: "20px",
      }}
    >
      <div
        style={{
          color: "#8A7D73",
          fontSize: "13px",
          marginBottom: "8px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: "28px",
          fontWeight: 700,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Input({ label, value, onChange }) {
  return (
    <div>
      <label style={labelStyle}>
        {label}
      </label>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    </div>
  );
}

const labelStyle = {
  display: "block",
  fontSize: "13px",
  fontWeight: 600,
  marginBottom: "7px",
  color: "#5E5148",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 12px",
  border: "1px solid #DDD3CB",
  borderRadius: "7px",
  outline: "none",
  fontSize: "14px",
  background: "#fff",
};

const primaryButton = {
  border: "none",
  background: "#2E2723",
  color: "#fff",
  padding: "11px 18px",
  borderRadius: "7px",
  cursor: "pointer",
  fontWeight: 600,
};

const secondaryButton = {
  border: "1px solid #DDD3CB",
  background: "#fff",
  color: "#4A4039",
  padding: "11px 18px",
  borderRadius: "7px",
  cursor: "pointer",
};

const thStyle = {
  textAlign: "left",
  padding: "14px 20px",
  fontSize: "12px",
  color: "#8A7D73",
  borderBottom: "1px solid #E8E0D9",
};

const tdStyle = {
  padding: "16px 20px",
  borderBottom: "1px solid #F0EBE7",
  fontSize: "14px",
};
