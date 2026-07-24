import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

import {
  ArrowLeft,
  Plus,
  Trash2,
  Pencil,
  Home,
  Briefcase,
  MapPin,
  Star
} from "lucide-react";

export default function AddressPage({ setPage }) {

  const { currentUser } = useAuth();

  const emptyForm = {
    name: "",
    phone: "",
    house: "",
    street: "",
    city: "",
    state: "",
    pincode: "",
    type: "Home",
    isDefault: false,
  };

  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);

  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState(emptyForm);






const GEOLOCATION_API_KEY = "AIzaSyBYw0b8SR-lJPdg1qvjDL9qaYshuhDhfuA";
const  PLACES_API_KEY = "AIzaSyBYw0b8SR-lJPdg1qvjDL9qaYshuhDhfuA";

  useEffect(() => {
    if (!currentUser) return;

    loadAddresses();
  }, [currentUser]);

  async function loadAddresses() {
    try {
      setLoading(true);

      const snap = await getDocs(
        collection(
          db,
          "users",
          currentUser.uid,
          "addresses"
        )
      );

      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      data.sort((a, b) => {
        if (a.isDefault) return -1;
        if (b.isDefault) return 1;
        return 0;
      });

      setAddresses(data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function saveAddress() {
    if (!currentUser) return;

    if (
      !form.name ||
      !form.phone ||
      !form.house ||
      !form.street ||
      !form.city ||
      !form.state ||
      !form.pincode
    ) {
      alert("Please fill all fields.");
      return;
    }

    try {
      if (editingId) {
        await updateDoc(
          doc(
            db,
            "users",
            currentUser.uid,
            "addresses",
            editingId
          ),
          form
        );

        setAddresses((prev) =>
          prev.map((item) =>
            item.id === editingId
              ? { ...item, ...form }
              : item
          )
        );
      } else {
        const ref = await addDoc(
          collection(
            db,
            "users",
            currentUser.uid,
            "addresses"
          ),
          {
            ...form,
            createdAt: serverTimestamp(),
          }
        );

        setAddresses((prev) => [
          ...prev,
          {
            id: ref.id,
            ...form,
          },
        ]);
      }

      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
    } catch (err) {
      console.log(err);
    }
  }

  function editAddress(address) {
    setForm({
  name: address.name || "",
  phone: address.phone || "",
  house: address.house || "",
  street: address.street || "",
  city: address.city || "",
  state: address.state || "",
  pincode: address.pincode || "",
  type: address.type || "Home",
  isDefault: address.isDefault || false,
});
    setEditingId(address.id);
    setShowForm(true);
  }

  async function removeAddress(id) {
    const ok = window.confirm(
      "Delete this address?"
    );

    if (!ok) return;

    try {
      await deleteDoc(
        doc(
          db,
          "users",
          currentUser.uid,
          "addresses",
          id
        )
      );

      setAddresses((prev) =>
        prev.filter((item) => item.id !== id)
      );
    } catch (err) {
      console.log(err);
    }
  }

  async function setDefault(id) {
    const updated = addresses.map((item) => ({
      ...item,
      isDefault: item.id === id,
    }));

    try {
      for (const item of updated) {
        await updateDoc(
          doc(
            db,
            "users",
            currentUser.uid,
            "addresses",
            item.id
          ),
          {
            isDefault: item.isDefault,
          }
        );
      }

      setAddresses(updated);
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
        onClick={() => setPage("menu")}
      >
        <ArrowLeft size={22} />
      </button>

      <div>
        <h1 style={styles.title}>
          My Addresses
        </h1>

        <p style={styles.subtitle}>
          Manage your saved delivery addresses
        </p>
      </div>

    </div>


    {/* Add Address Button */}

    <button
      style={styles.addButton}
      onClick={() => {
        setEditingId(null);
        setForm(emptyForm);
        setShowForm(!showForm);
      }}
    >
      <Plus size={18} />
      Add New Address
    </button>


    {/* Address Form */}

    {showForm && (

      <div style={styles.formCard}>

        <h2 style={styles.formTitle}>
          {editingId ? "Edit Address" : "New Address"}
        </h2>


        <input
          name="name"
          placeholder="Full Name"
          value={form.name}
          onChange={handleChange}
          style={styles.input}
        />

        <input
          name="phone"
          placeholder="Phone Number"
          value={form.phone}
          onChange={handleChange}
          style={styles.input}
        />

        <input
          name="house"
          placeholder="House / Flat No."
          value={form.house}
          onChange={handleChange}
          style={styles.input}
        />

        <input
          name="street"
          placeholder="Street / Area"
          value={form.street}
          onChange={handleChange}
          style={styles.input}
        />

        <input
          name="city"
          placeholder="City"
          value={form.city}
          onChange={handleChange}
          style={styles.input}
        />

        <input
          name="state"
          placeholder="State"
          value={form.state}
          onChange={handleChange}
          style={styles.input}
        />

        <input
          name="pincode"
          placeholder="Pincode"
          value={form.pincode}
          onChange={handleChange}
          style={styles.input}
        />

        <select
          name="type"
          value={form.type}
          onChange={handleChange}
          style={styles.input}
        >
          <option>Home</option>
          <option>Work</option>
          <option>Other</option>
        </select>

        <button
          style={styles.saveButton}
          onClick={saveAddress}
        >
          {editingId ? "Update Address" : "Save Address"}
        </button>

      </div>

    )}


    {/* Empty State */}

    {!loading && addresses.length === 0 && (

      <div style={styles.emptyBox}>

        <MapPin
          size={55}
          color="#C4956A"
        />

        <h2 style={styles.emptyTitle}>
          No Saved Addresses
        </h2>

        <p style={styles.emptyText}>
          Add your first delivery address to make checkout faster.
        </p>

      </div>

    )}


    {/* Address List */}

    <div style={styles.list}>

            {loading ? (

        <p style={styles.loading}>
          Loading addresses...
        </p>

      ) : (

        addresses.map((address) => (

          <div
            key={address.id}
            style={styles.card}
          >

            <div style={styles.cardTop}>

              <div style={styles.typeContainer}>

                {address.type === "Home" && (
                  <Home
                    size={18}
                    color="#C4956A"
                  />
                )}

                {address.type === "Work" && (
                  <Briefcase
                    size={18}
                    color="#C4956A"
                  />
                )}

                {address.type === "Other" && (
                  <MapPin
                    size={18}
                    color="#C4956A"
                  />
                )}

                <span style={styles.typeText}>
                  {address.type}
                </span>

                {address.isDefault && (

                  <div style={styles.defaultBadge}>

                    <Star
                      size={13}
                      fill="#fff"
                    />

                    Default

                  </div>

                )}

              </div>

              <div style={styles.actions}>

                <button
                  style={styles.iconButton}
                  onClick={() =>
                    editAddress(address)
                  }
                >
                  <Pencil size={18} />
                </button>

                <button
                  style={styles.iconButton}
                  onClick={() =>
                    removeAddress(address.id)
                  }
                >
                  <Trash2 size={18} />
                </button>

              </div>

            </div>

            <div style={styles.info}>

              <h3 style={styles.name}>
                {address.name}
              </h3>

              <p style={styles.phone}>
                {address.phone}
              </p>

              <p style={styles.address}>
                {address.house}, {address.street}
              </p>

              <p style={styles.address}>
                {address.city}, {address.state}
              </p>

              <p style={styles.address}>
                {address.pincode}
              </p>

            </div>

            {!address.isDefault && (

              <button
                style={styles.defaultButton}
                onClick={() =>
                  setDefault(address.id)
                }
              >
                Set as Default
              </button>

            )}

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
    width: "42px",
    height: "42px",
    borderRadius: "50%",
    border: "none",
    background: "#fff",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  },

  title: {
    margin: 0,
    fontSize: "28px",
    color: "#1A0B05",
    fontFamily: "Playfair Display, serif",
  },

  subtitle: {
    marginTop: "4px",
    color: "#777",
    fontSize: "14px",
  },

  addButton: {
    width: "100%",
    padding: "14px",
    border: "none",
    borderRadius: "14px",
    background: "#C4956A",
    color: "#fff",
    fontSize: "15px",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    cursor: "pointer",
    marginBottom: "24px",
  },

  formCard: {
    background: "#fff",
    borderRadius: "18px",
    padding: "22px",
    marginBottom: "28px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
  },

  formTitle: {
    margin: "0 0 20px",
    color: "#1A0B05",
    fontSize: "22px",
    fontFamily: "Playfair Display, serif",
  },

  input: {
    width: "100%",
    padding: "14px",
    marginBottom: "14px",
    border: "1px solid #ddd",
    borderRadius: "12px",
    fontSize: "15px",
    outline: "none",
    boxSizing: "border-box",
    background: "#fff",
  },

  saveButton: {
    width: "100%",
    padding: "14px",
    border: "none",
    borderRadius: "12px",
    background: "#1A0B05",
    color: "#fff",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "8px",
  },

  list: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },

  loading: {
    textAlign: "center",
    color: "#777",
    padding: "40px 0",
  },
    card: {
    background: "#FFFFFF",
    borderRadius: "18px",
    padding: "18px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
    border: "1px solid #F1ECE5",
  },

  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },

  typeContainer: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },

  typeText: {
    fontWeight: "600",
    color: "#1A0B05",
    fontSize: "15px",
  },

  defaultBadge: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    background: "#C4956A",
    color: "#fff",
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "600",
  },

  actions: {
    display: "flex",
    gap: "10px",
  },

  iconButton: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    border: "none",
    background: "#F8F5F1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#1A0B05",
  },

  info: {
    marginBottom: "16px",
  },

  name: {
    margin: "0 0 6px",
    color: "#1A0B05",
    fontSize: "18px",
    fontWeight: "700",
  },

  phone: {
    margin: "0 0 10px",
    color: "#666",
    fontSize: "14px",
  },

  address: {
    margin: "3px 0",
    color: "#444",
    lineHeight: "1.6",
    fontSize: "14px",
  },

  defaultButton: {
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #C4956A",
    background: "#FDFAF5",
    color: "#C4956A",
    fontWeight: "600",
    cursor: "pointer",
  },

  emptyBox: {
    marginTop: "60px",
    textAlign: "center",
    padding: "40px 20px",
    background: "#FFFFFF",
    borderRadius: "18px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
  },

  emptyTitle: {
    marginTop: "18px",
    marginBottom: "10px",
    fontFamily: "Playfair Display, serif",
    fontSize: "24px",
    color: "#1A0B05",
  },

  emptyText: {
    color: "#777",
    lineHeight: "1.6",
    fontSize: "15px",
    maxWidth: "320px",
    margin: "0 auto",
  },
};
