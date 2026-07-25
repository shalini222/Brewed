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
  Search,
  Download,
  Upload,
  CheckCircle2,
  XCircle,
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

  // New Feature States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'active', 'inactive'
  const [sortBy, setSortBy] = useState("name-asc"); // 'name-asc', 'name-desc', 'fee-asc', 'fee-desc'
  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' | 'info' }

  // Test Pincode Tool State
  const [testPin, setTestPin] = useState("");
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    loadZones();
  }, []);

  // Toast Helper with cleanup on unmount
  function showToast(message, type = "success") {
  setToast({ message, type });

  setTimeout(() => {
    setToast(null);
  }, 4000);
  }

  async function loadZones() {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, "deliveryZones"));
      const data = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setZones(data);
    } catch (err) {
      console.log(err);
      showToast("Failed to load delivery zones.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function saveZone() {
    const name = zoneForm.name.trim();

    if (!name) {
      showToast("Please enter a zone name.", "error");
      return;
    }

    // Duplicate Zone Name Check
    const duplicateZone = zones.some(
      (z) =>
        z.id !== editingId &&
        z.name.toLowerCase() === name.toLowerCase()
    );

    if (duplicateZone) {
      showToast("Zone name already exists.", "error");
      return;
    }

    if (!zoneForm.estimatedTime.trim()) {
      showToast("Please enter estimated delivery time.", "error");
      return;
    }

    const pincodesArray = zoneForm.pincodes
      .split(/[\n,]+/) // Split by newline or comma
      .map((p) => p.trim())
      .filter(Boolean);

    if (pincodesArray.length === 0) {
      showToast("Please enter at least one pincode.", "error");
      return;
    }

    const invalid = pincodesArray.some((pin) => !/^\d{6}$/.test(pin));
    if (invalid) {
      showToast("Every pincode must be exactly 6 digits.", "error");
      return;
    }

    if (Number(zoneForm.deliveryFee) < 0) {
      showToast("Delivery fee cannot be negative.", "error");
      return;
    }

    if (Number(zoneForm.minOrder) <= 0) {
      showToast("Minimum order must be greater than ₹0.", "error");
      return;
    }

    if (Number(zoneForm.freeDeliveryAbove) <= 0) {
      showToast("Free delivery amount must be greater than ₹0.", "error");
      return;
    }

    // Duplicate Pincode Detection Across Other Zones
    for (let zone of zones) {
      if (editingId && zone.id === editingId) continue; // Skip current zone being edited
      const existingPins = Array.isArray(zone.pincodes) ? zone.pincodes : [];
      const duplicatePin = pincodesArray.find((p) => existingPins.includes(p));
      if (duplicatePin) {
        showToast(`Pincode ${duplicatePin} already belongs to zone "${zone.name}".`, "error");
        return;
      }
    }

    const zoneData = {
      ...zoneForm,
      name,
      pincodes: pincodesArray,
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, "deliveryZones", editingId), zoneData);
        showToast("Zone updated successfully!");
      } else {
        await addDoc(collection(db, "deliveryZones"), {
          ...zoneData,
          createdAt: serverTimestamp(),
        });
        showToast("Zone added successfully!");
      }

      await loadZones();
      setShowForm(false);
      setEditingId(null);
      setZoneForm(emptyZone);
    } catch (err) {
      console.log(err);
      showToast("Error saving zone.", "error");
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
    if (!window.confirm("Delete this delivery zone?")) return;

    try {
      await deleteDoc(doc(db, "deliveryZones", id));
      setZones((prev) => prev.filter((z) => z.id !== id));
      showToast("Zone deleted successfully.");
    } catch (err) {
      console.log(err);
      showToast("Failed to delete zone.", "error");
    }
  }

  async function toggleZone(zone) {
    try {
      await updateDoc(doc(db, "deliveryZones", zone.id), {
        active: !zone.active,
      });
      setZones((prev) =>
        prev.map((z) => (z.id === zone.id ? { ...z, active: !z.active } : z))
      );
      showToast(`Zone ${!zone.active ? "enabled" : "disabled"}.`);
    } catch (err) {
      console.log(err);
      showToast("Failed to update status.", "error");
    }
  }

  // Bulk Import & Export Handlers
  function handleExportPincodes() {
  const text = zoneForm.pincodes;

  if (!text) {
    showToast("No pincodes to export.", "error");
    return;
  }

  const blob = new Blob([text], {
    type: "text/plain;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${zoneForm.name || "zone"}-pincodes.txt`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);

  showToast("Pincodes exported successfully!");
  }

  function handleImportPincodes(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      const parsedPins = content
        .split(/[\n,]+/)
        .map((p) => p.trim())
        .filter(Boolean)
        .join("\n");

      setZoneForm((prev) => ({ ...prev, pincodes: parsedPins }));
      showToast("Pincodes imported successfully!");
    };
    reader.readAsText(file);
  }

  // Test Pincode Tool Handler
  function handleTestPincode(e) {
    e.preventDefault();
    const pin = testPin.trim();
    if (!/^\d{6}$/.test(pin)) {
      setTestResult({ status: "invalid", message: "Please enter a valid 6-digit pincode." });
      return;
    }

    const matchedZone = zones.find(
      (z) => z.active && Array.isArray(z.pincodes) && z.pincodes.includes(pin)
    );

    if (matchedZone) {
      setTestResult({
        status: "available",
        zone: matchedZone,
        message: `Delivery available via "${matchedZone.name}"! Fee: ₹${matchedZone.deliveryFee}, ETA: ${matchedZone.estimatedTime}`,
      });
    } else {
      setTestResult({
        status: "unavailable",
        message: "Sorry, delivery is not available for this pincode or the zone is disabled.",
      });
    }
  }

  // Filter & Sort Logic
  const filteredZones = zones
    .filter((zone) => {
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
          ? zone.active
          : !zone.active;

      const pinArray = Array.isArray(zone.pincodes) ? zone.pincodes : [];
      const matchesSearch =
        zone.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pinArray.some((p) => p.includes(searchTerm));

      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "name-asc") return a.name.localeCompare(b.name);
      if (sortBy === "name-desc") return b.name.localeCompare(a.name);
      if (sortBy === "fee-asc") return Number(a.deliveryFee) - Number(b.deliveryFee);
      if (sortBy === "fee-desc") return Number(b.deliveryFee) - Number(a.deliveryFee);
      return 0;
    });

  return (
    <div style={styles.page}>
      {/* Toast Notification Banner */}
      {toast && (
        <div
          style={{
            ...styles.toast,
            background:
              toast.type === "error"
                ? "#C5221F"
                : toast.type === "info"
                ? "#1a73e8"
                : "#137333",
          }}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backButton} onClick={() => setPage("admin")}>
          <ArrowLeft size={22} />
        </button>
        <div>
          <h1 style={styles.title}>Delivery Management</h1>
          <p style={styles.subtitle}>Configure delivery zones and charges</p>
        </div>
      </div>

      {/* Test Pincode Tool Widget */}
      <div style={styles.testToolCard}>
        <h3 style={styles.testTitle}>🔍 Test Pincode Availability</h3>
        <form onSubmit={handleTestPincode} style={styles.testForm}>
          <input
            style={styles.testInput}
            placeholder="Enter 6-digit pincode"
            maxLength={6}
            value={testPin}
            onChange={(e) =>
              setTestPin(
                e.target.value.replace(/\D/g, "")
              )
            }
          />
          <button type="submit" style={styles.testButton}>
            Check
          </button>
        </form>
        {testResult && (
          <div
            style={{
              ...styles.testResultBox,
              background: testResult.status === "available" ? "#E6F4EA" : "#FCE8E6",
              color: testResult.status === "available" ? "#137333" : "#C5221F",
            }}
          >
            {testResult.status === "available" ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            <span>{testResult.message}</span>
          </div>
        )}
      </div>

      {/* Actions & Filters Bar */}
      <div style={styles.controlsBar}>
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

        <div style={styles.filterGroup}>
          <div style={styles.searchBox}>
            <Search size={16} color="#777" />
            <input
              style={styles.searchInput}
              placeholder="Search zone or pincode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            style={styles.select}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          <select
            style={styles.select}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="name-asc">Sort: Name (A-Z)</option>
            <option value="name-desc">Sort: Name (Z-A)</option>
            <option value="fee-asc">Fee: Low to High</option>
            <option value="fee-desc">Fee: High to Low</option>
          </select>
        </div>
      </div>

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
            onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
          />

          <input
            style={styles.input}
            type="number"
            placeholder="Delivery Fee"
            value={zoneForm.deliveryFee}
            onChange={(e) =>
              setZoneForm({ ...zoneForm, deliveryFee: Number(e.target.value) })
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
              setZoneForm({ ...zoneForm, minOrder: Number(e.target.value) })
            }
          />

          <input
            style={styles.input}
            placeholder="Estimated Delivery Time"
            value={zoneForm.estimatedTime}
            onChange={(e) =>
              setZoneForm({ ...zoneForm, estimatedTime: e.target.value })
            }
          />

          <div style={styles.bulkToolbar}>
            <span style={styles.helperText}>Pincodes (One per line or comma-separated)</span>
            <div>
              <button type="button" style={styles.bulkBtn} onClick={handleExportPincodes} title="Export Pincodes">
                <Download size={14} /> Export
              </button>
              <label style={styles.bulkBtnUpload}>
                <Upload size={14} /> Import File
                <input type="file" accept=".txt,.csv" style={{ display: "none" }} onChange={handleImportPincodes} />
              </label>
            </div>
          </div>

          <textarea
            style={styles.textarea}
            rows={6}
            placeholder="e.g. 700001, 700002..."
            value={zoneForm.pincodes}
            onChange={(e) => setZoneForm({ ...zoneForm, pincodes: e.target.value })}
          />

          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={zoneForm.active}
              onChange={(e) =>
                setZoneForm({ ...zoneForm, active: e.target.checked })
              }
            />
            Active Zone
          </label>

          <div style={styles.formActions}>
            <button style={styles.saveButton} onClick={saveZone}>
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
        ) : filteredZones.length === 0 ? (
          <div style={styles.emptyBox}>
            <Truck size={45} color="#C4956A" />
            <p style={styles.emptyText}>No delivery zones found matching criteria.</p>
          </div>
        ) : (
          filteredZones.map((zone) => {
            const pinArray = Array.isArray(zone.pincodes) ? zone.pincodes : [];

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
                      <button style={styles.actionButton} onClick={() => toggleZone(zone)}>
                        {zone.active ? "Disable" : "Enable"}
                      </button>
                      <button style={styles.iconButton} onClick={() => editZone(zone)}>
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
                  <strong>Pincodes ({pinArray.length}):</strong>
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

// Inline Styles Object matching clean admin dashboard styling
const styles = {
  page: { padding: "20px", maxWidth: "1000px", margin: "0 auto", fontFamily: "sans-serif", position: "relative" },
  toast: { position: "fixed", top: "20px", right: "20px", color: "#fff", padding: "12px 20px", borderRadius: "6px", zIndex: 1000, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", fontWeight: "550" },
  header: { display: "flex", alignItems: "center", gap: "15px", marginBottom: "20px" },
  backButton: { background: "#f0f0f0", border: "none", padding: "8px", borderRadius: "50%", cursor: "pointer" },
  title: { margin: 0, fontSize: "24px", color: "#333" },
  subtitle: { margin: "4px 0 0 0", color: "#666", fontSize: "14px" },
  testToolCard: { background: "#f9f9f9", border: "1px solid #e0e0e0", borderRadius: "8px", padding: "15px", marginBottom: "20px" },
  testTitle: { margin: "0 0 10px 0", fontSize: "15px", color: "#444" },
  testForm: { display: "flex", gap: "10px" },
  testInput: { flex: 1, padding: "8px 12px", borderRadius: "4px", border: "1px solid #ccc" },
  testButton: { padding: "8px 16px", background: "#333", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" },
  testResultBox: { marginTop: "10px", padding: "10px", borderRadius: "4px", display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: "500" },
  controlsBar: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "15px", marginBottom: "20px" },
  filterGroup: { display: "flex", gap: "10px", flexWrap: "wrap", flex: 1, justifyContent: "flex-end" },
  searchBox: { display: "flex", alignItems: "center", background: "#fff", border: "1px solid #ccc", borderRadius: "4px", padding: "0 8px" },
  searchInput: { border: "none", outline: "none", padding: "8px", fontSize: "14px" },
  select: { padding: "8px 12px", borderRadius: "4px", border: "1px solid #ccc", background: "#fff", fontSize: "14px" },
  addButton: { display: "flex", alignItems: "center", gap: "6px", background: "#2ecc71", color: "#fff", border: "none", padding: "10px 16px", borderRadius: "6px", fontWeight: "600", cursor: "pointer" },
  formCard: { background: "#fff", border: "1px solid #ddd", borderRadius: "8px", padding: "20px", marginBottom: "25px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" },
  formTitle: { margin: "0 0 15px 0", fontSize: "18px" },
  input: { width: "100%", padding: "10px", marginBottom: "12px", borderRadius: "4px", border: "1px solid #ccc", boxSizing: "border-box" },
  textarea: { width: "100%", padding: "10px", marginBottom: "12px", borderRadius: "4px", border: "1px solid #ccc", boxSizing: "border-box", fontFamily: "monospace" },
  bulkToolbar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" },
  helperText: { fontSize: "12px", color: "#666" },
  bulkBtn: { background: "none", border: "1px solid #ccc", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", cursor: "pointer", marginRight: "6px", display: "inline-flex", alignItems: "center", gap: "4px" },
  bulkBtnUpload: { background: "none", border: "1px solid #ccc", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px", color: "#333" },
  checkboxLabel: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "15px", cursor: "pointer", fontSize: "14px" },
  formActions: { display: "flex", gap: "10px" },
  saveButton: { background: "#3498db", color: "#fff", border: "none", padding: "10px 16px", borderRadius: "4px", cursor: "pointer", fontWeight: "600" },
  cancelButton: { background: "#e0e0e0", color: "#333", border: "none", padding: "10px 16px", borderRadius: "4px", cursor: "pointer" },
  list: { display: "flex", flexDirection: "column", gap: "15px" },
  loading: { textAlign: "center", color: "#666" },
  emptyBox: { textAlign: "center", padding: "40px", background: "#fcfcfc", borderRadius: "8px", border: "1px dashed #ddd" },
  emptyText: { color: "#777", marginTop: "10px" },
  zoneCard: { background: "#fff", border: "1px solid #e0e0e0", borderRadius: "8px", padding: "15px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" },
  zoneHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "10px" },
  headerRight: { display: "flex", alignItems: "center", gap: "12px" },
  badge: { padding: "4px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "600" },
  actions: { display: "flex", gap: "8px" },
  actionButton: { background: "#f5f5f5", border: "1px solid #ddd", padding: "4px 8px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" },
  iconButton: { background: "none", border: "none", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer", fontSize: "12px", color: "#555" },
  detailText: { margin: "4px 0", fontSize: "14px", color: "#444" },
  pincodeLabel: { margin: "10px 0 4px 0", fontSize: "14px", color: "#444" },
  pinContainer: { display: "flex", flexWrap: "wrap", gap: "6px", maxHeight: "100px", overflowY: "auto", padding: "4px 0" },
  pin: { background: "#f1f3f4", padding: "2px 6px", borderRadius: "4px", fontSize: "12px", fontFamily: "monospace", color: "#333" }
};
