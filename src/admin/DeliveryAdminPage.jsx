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
  MapPin,
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
      name: zone.name || "",
      deliveryFee: zone.deliveryFee ?? 40,
      freeDeliveryAbove: zone.freeDeliveryAbove ?? 499,
      minOrder: zone.minOrder ?? 199,
      estimatedTime: zone.estimatedTime || "30-40 mins",
      pincodes: zone.pincodes || "",
      active: zone.active ?? true,
    });
    setShowForm(true);
  }

  async function removeZone(id) {
    const ok = window.confirm("Are you sure you want to delete this zone?");
    if (!ok) return;

    try {
      await deleteDoc(doc(db, "deliveryZones", id));
      setZones((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.log(err);
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
          zones.map((zone) => (
            <div
              key={zone.id}
              style={styles.card}
            >
              <div style={styles.cardTop}>
                <div>
                  <h3 style={styles.zoneName}>{zone.name}</h3>
                  <span
                    style={{
                      ...styles.badge,
                      background: zone.active ? "#E6F4EA" : "#FCE8E6",
                      color: zone.active ? "#137333" : "#C5221F",
                    }}
                  >
                    {zone.active ? "Active" : "Inactive"}
                  </span>
                </div>

                <div style={styles.actions}>
                  <button
                    style={styles.iconButton}
                    onClick={() => editZone(zone)}
                  >
                    <Pencil size={18} />
                  </button>

                  <button
                    style={styles.iconButton}
                    onClick={() => removeZone(zone.id)}
                  >
                    <Trash2 size={18} color="#d9534f" />
                  </button>
                </div>
              </div>

              <div style={styles.zoneDetails}>
                <p><strong>Fee:</strong> ₹{zone.deliveryFee}</p>
                <p><strong>Free Delivery Above:</strong> ₹{zone.freeDeliveryAbove}</p>
                <p><strong>Min Order:</strong> ₹{zone.minOrder}</p>
                <p><strong>Time:</strong> {zone.estimatedTime}</p>
                <p><strong>Pincodes:</strong> {zone.pincodes.replace(/\n/g, ", ")}</p>
              </div>
            </div>
          ))
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
  card: {
    background: "#fff",
    padding: "16px",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  zoneName: {
    fontSize: "16px",
    fontWeight: "bold",
    color: "#333",
  },
  badge: {
    fontSize: "11px",
    padding: "2px 8px",
    borderRadius: "12px",
    fontWeight: "500",
    display: "inline-block",
    marginTop: "4px",
  },
  actions: {
    display: "flex",
    gap: "8px",
  },
  iconButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px",
  },
  zoneDetails: {
    fontSize: "13px",
    color: "#555",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  emptyBox: {
    textAlign: "center",
    padding: "40px",
    background: "#fff",
    borderRadius: "12px",
  },
  emptyText: {
    fontSize: "14px",
    color: "#666",
    marginTop: "8px",
  },
  loading: {
    textAlign: "center",
    color: "#666",
  },
};

