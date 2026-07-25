import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

import {
  Plus,
  Pencil,
  Trash2,
  Truck,
  ArrowLeft,
} from "lucide-react";

export default function DeliveryAdminPage({ setPage }) {
  const emptyZone = {
    name: "",
    deliveryFee: 40,
    freeDeliveryAbove: 499,
    minOrder: 199,
    estimatedTime: "30-40 mins",
    pincodes: "",
    active: true,
  };

  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [zoneForm, setZoneForm] = useState(emptyZone);

  // Added states for checking delivery logic
  const [checkingDelivery, setCheckingDelivery] = useState(false);
  const [deliveryAvailable, setDeliveryAvailable] = useState(null);
  const [deliveryInfo, setDeliveryInfo] = useState(null);

  useEffect(() => {
    loadZones();
  }, []);

  async function loadZones() {
    try {
      setLoading(true);

      const snap = await getDocs(
        collection(db, "deliveryZones")
      );

      const data = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          ...d,
          pincodes: Array.isArray(d.pincodes)
            ? d.pincodes.join("\n")
            : d.pincodes || "",
        };
      });

      setZones(data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  }

  async function saveZone() {
    const name = zoneForm.name.trim();

    if (!name) {
      alert("Please enter a zone name.");
      return;
    }

    const pincodesArray = zoneForm.pincodes
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean);

    if (pincodesArray.length === 0) {
      alert("Please enter at least one pincode.");
      return;
    }

    const zoneData = {
      ...zoneForm,
      name,
      pincodes: pincodesArray,
    };

    try {
      if (editingId) {
        await updateDoc(
          doc(db, "deliveryZones", editingId),
          zoneData
        );
      } else {
        await addDoc(
          collection(db, "deliveryZones"),
          {
            ...zoneData,
            createdAt: serverTimestamp(),
          }
        );
      }

      loadZones();
      setShowForm(false);
      setEditingId(null);
      setZoneForm(emptyZone);
    } catch (err) {
      console.log(err);
    }
  }

  function editZone(zone) {
    setEditingId(zone.id);

    setZoneForm({
      name: zone.name,
      deliveryFee: zone.deliveryFee,
      freeDeliveryAbove: zone.freeDeliveryAbove,
      minOrder: zone.minOrder,
      estimatedTime: zone.estimatedTime,
      pincodes: Array.isArray(zone.pincodes)
        ? zone.pincodes.join("\n")
        : zone.pincodes,
      active: zone.active,
    });

    setShowForm(true);
  }

  async function deleteZone(id) {
    const ok = window.confirm("Delete this delivery zone?");

    if (!ok) return;

    try {
      await deleteDoc(
        doc(db, "deliveryZones", id)
      );

      setZones((prev) =>
        prev.filter((z) => z.id !== id)
      );
    } catch (err) {
      console.log(err);
    }
  }

  async function toggleZone(zone) {
    try {
      await updateDoc(
        doc(db, "deliveryZones", zone.id),
        {
          active: !zone.active,
        }
      );

      setZones((prev) =>
        prev.map((z) =>
          z.id === zone.id
            ? {
                ...z,
                active: !z.active,
              }
            : z
        )
      );
    } catch (err) {
      console.log(err);
    }
  }

  async function checkDelivery(pincode) {
    setCheckingDelivery(true);

    try {
      const snap = await getDocs(
        collection(db, "deliveryZones")
      );

      const zoneDocs = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      const zone = zoneDocs.find(
        (z) =>
          z.active &&
          Array.isArray(z.pincodes) &&
          z.pincodes.includes(pincode)
      );

      if (zone) {
        setDeliveryAvailable(true);

        setDeliveryInfo({
          zoneName: zone.name,
          fee: zone.deliveryFee,
          freeAbove: zone.freeDeliveryAbove,
          minOrder: zone.minOrder,
          eta: zone.estimatedTime,
        });
      } else {
        setDeliveryAvailable(false);
        setDeliveryInfo(null);
      }
    } catch (err) {
      console.log(err);
    } finally {
      setCheckingDelivery(false);
    }
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <button
          style={styles.backButton}
          onClick={() => setPage("admin")}
        >
          <ArrowLeft size={22} />
        </button>
        <div>
          <h1 style={styles.title}>Delivery Management</h1>
          <p style={styles.subtitle}>Configure delivery zones and charges</p>
        </div>
      </div>

      {/* Add Button */}
      <button
        style={styles.addButton}
        onClick={() => {
          setEditingId(null);
          setZoneForm(emptyZone);
          setShowForm(true);
        }}
      >
        <Plus size={18} />
        Add Delivery Zone
      </button>

      {/* Form Modal / Card */}
      {showForm && (
        <div style={styles.formCard}>
          <h2 style={styles.formTitle}>
            {editingId ? "Edit Delivery Zone" : "Add Delivery Zone"}
          </h2>

          <input
            style={styles.input}
            placeholder="Zone Name"
            value={zoneForm.name}
            onChange={(e) =>
              setZoneForm({
                ...zoneForm,
                name: e.target.value,
              })
            }
          />

          <input
            style={styles.input}
            type="number"
            placeholder="Delivery Fee"
            value={zoneForm.deliveryFee}
            onChange={(e) =>
              setZoneForm({
                ...zoneForm,
                deliveryFee: Number(e.target.value),
              })
            }
          />

          <input
            style={styles.input}
            type="number"
            placeholder="Free Delivery Above"
            value={zoneForm.freeDeliveryAbove}
            onChange={(e) =>
              setZoneForm({
                ...zoneForm,
                freeDeliveryAbove: Number(e.target.value),
              })
            }
          />

          <input
            style={styles.input}
            type="number"
            placeholder="Minimum Order"
            value={zoneForm.minOrder}
            onChange={(e) =>
              setZoneForm({
                ...zoneForm,
                minOrder: Number(e.target.value),
              })
            }
          />

          <input
            style={styles.input}
            placeholder="Estimated Delivery Time"
            value={zoneForm.estimatedTime}
            onChange={(e) =>
              setZoneForm({
                ...zoneForm,
                estimatedTime: e.target.value,
              })
            }
          />

          <textarea
            style={styles.textarea}
            rows={6}
            placeholder="One pincode per line"
            value={zoneForm.pincodes}
            onChange={(e) =>
              setZoneForm({
                ...zoneForm,
                pincodes: e.target.value,
              })
            }
          />

          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={zoneForm.active}
              onChange={(e) =>
                setZoneForm({
                  ...zoneForm,
                  active: e.target.checked,
                })
              }
            />
            Active Zone
          </label>

          <div style={styles.formActions}>
            <button
              style={styles.saveButton}
              onClick={saveZone}
            >
              {editingId ? "Update Zone" : "Save Zone"}
            </button>

            <button
              style={styles.cancelButton}
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setZoneForm(emptyZone);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Zones List */}
      <div style={styles.list}>
        {loading ? (
          <p style={styles.loading}>Loading delivery zones...</p>
        ) : zones.length === 0 ? (
          <div style={styles.emptyBox}>
            <Truck size={45} color="#C4956A" />
            <p style={styles.emptyText}>No delivery zones found.</p>
          </div>
        ) : (
          zones.map((zone) => {
            const pinArray = Array.isArray(zone.pincodes)
              ? zone.pincodes
              : typeof zone.pincodes === "string"
              ? zone.pincodes.split("\n").map((p) => p.trim()).filter(Boolean)
              : [];

            return (
              <div key={zone.id} style={styles.zoneCard}>
                <div style={styles.zoneHeader}>
                  <h3>{zone.name}</h3>

                  <div style={styles.headerRight}>
                    <span
                      style={{
                        ...styles.badge,
                        background: zone.active ? "#E6F4EA" : "#FCE8E6",
                        color: zone.active ? "#137333" : "#C5221F",
                      }}
                    >
                      {zone.active ? "🟢 Active" : "🔴 Disabled"}
                    </span>

                    <div style={styles.actions}>
                      <button
                        style={styles.actionButton}
                        onClick={() => toggleZone(zone)}
                      >
                        {zone.active ? "Disable" : "Enable"}
                      </button>

                      <button
                        style={styles.iconButton}
                        onClick={() => editZone(zone)}
                      >
                        <Pencil size={16} /> Edit
                      </button>

                      <button
                        style={{ ...styles.iconButton, color: "#d9534f" }}
                        onClick={() => deleteZone(zone.id)}
                      >
                        <Trash2 size={16} /> Delete
                      </button>
                    </div>
                  </div>
                </div>

                <p style={styles.detailText}>
                  <strong>Delivery Fee:</strong> ₹{zone.deliveryFee}
                </p>

                <p style={styles.detailText}>
                  <strong>Free Delivery Above:</strong> ₹{zone.freeDeliveryAbove}
                </p>

                <p style={styles.detailText}>
                  <strong>Minimum Order:</strong> ₹{zone.minOrder}
                </p>

                <p style={styles.detailText}>
                  <strong>ETA:</strong> {zone.estimatedTime}
                </p>

                <p style={styles.pincodeLabel}>
                  <strong>Pincodes:</strong>
                </p>

                <div style={styles.pinContainer}>
                  {pinArray.map((pin) => (
                    <span key={pin} style={styles.pin}>
                      {pin}
                    </span>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#FDFAF5",
    padding: "24px",
    fontFamily: "Inter, sans-serif",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginBottom: "24px",
  },
  backButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "8px",
  },
  title: {
    fontSize: "24px",
    fontWeight: "bold",
    color: "#333",
  },
  subtitle: {
    fontSize: "14px",
    color: "#666",
  },
  addButton: {
    background: "#C4956A",
    color: "#fff",
    border: "none",
    padding: "12px 20px",
    borderRadius: "8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontWeight: "600",
    marginBottom: "24px",
  },
  formCard: {
    background: "#fff",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    marginBottom: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  formTitle: {
    fontSize: "18px",
    fontWeight: "bold",
    color: "#333",
  },
  input: {
    padding: "10px 14px",
    borderRadius: "6px",
    border: "1px solid #ddd",
    fontSize: "14px",
  },
  textarea: {
    padding: "10px 14px",
    borderRadius: "6px",
    border: "1px solid #ddd",
    fontSize: "14px",
    fontFamily: "inherit",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    cursor: "pointer",
  },
  formActions: {
    display: "flex",
    gap: "12px",
    marginTop: "8px",
  },
  saveButton: {
    background: "#C4956A",
    color: "#fff",
    border: "none",
    padding: "10px 16px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
  },
  cancelButton: {
    background: "#f5f5f5",
    color: "#333",
    border: "1px solid #ddd",
    padding: "10px 16px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  zoneCard: {
    background: "#fff",
    padding: "18px",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  zoneHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "4px",
    flexWrap: "wrap",
    gap: "12px",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  badge: {
    fontSize: "12px",
    padding: "4px 10px",
    borderRadius: "12px",
    fontWeight: "600",
  },
  actions: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  actionButton: {
    background: "#f5f5f5",
    border: "1px solid #ddd",
    padding: "6px 10px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600",
  },
  iconButton: {
    background: "none",
    border: "1px solid #ddd",
    borderRadius: "6px",
    cursor: "pointer",
    padding: "6px 10px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "12px",
    fontWeight: "600",
  },
  detailText: {
    fontSize: "14px",
    color: "#444",
  },
  pincodeLabel: {
    fontSize: "14px",
    color: "#444",
    marginTop: "4px",
  },
  pinContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    marginTop: "4px",
  },
  pin: {
    background: "#F5F5F5",
    color: "#333",
    padding: "4px 8px",
    borderRadius: "6px",
    fontSize: "12px",
    border: "1px solid #eee",
    fontWeight: "500",
  },
  emptyBox: {
    textAlign: "center",
    padding: "40px",
    background: "#fff",
    borderRadius: "12px",
  },
  emptyText: {
    fontSize: "14px",
    color: "#667",
    marginTop: "8px",
  },
  loading: {
    textAlign: "center",
    color: "#667",
  },
};
