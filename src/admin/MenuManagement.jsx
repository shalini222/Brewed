import { useEffect, useState, useRef } from "react";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";

export default function MenuManagement({ setPage, setActivePage }) {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [orders, setOrders] = useState([]);
  const [orderLoading, setOrderLoading] = useState(true);
  const [analytics, setAnalytics] = useState([]);
  const [range, setRange] = useState(7);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const lastOrderId = useRef(null);
  const [userNotifications, setUserNotifications] = useState([]);
  const lastUserId = useRef(null);

  const [newItem, setNewItem] = useState({
    name: "",
    category: "Coffee",
    price: "",
    desc: "",
    emoji: "",
    img: "",
    available: true,
    isFeatured: false,
    prepTime: "5–8 mins",
    servedAs: "Hot",
    dietType: "Vegetarian",
    salesCount: 0,
    rating: 0,
    reviews: 0,
    sizes: [],
    milkOptions: [],
    temperatureOptions: [],
    customExtras: [],
    customExtrasMaxSelection: 3,
    sweetnessOptions: [],
  });

  const [editing, setEditing] = useState(null);
  const [editItem, setEditItem] = useState({
    name: "",
    category: "Coffee",
    price: "",
    desc: "",
    emoji: "",
    img: "",
    available: true,
    isFeatured: false,
    prepTime: "5–8 mins",
    servedAs: "Hot",
    dietType: "Vegetarian",
    sizes: [],
    milkOptions: [],
    temperatureOptions: [],
    customExtras: [],
    customExtrasMaxSelection: 3,
    sweetnessOptions: [],
  });

  useEffect(() => {
    loadMenu();
    const unsubscribe = onSnapshot(collection(db, "orders"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setOrders(data);
      setOrderLoading(false);
      if (data.length > 0) {
        const newest = [...data].sort(
          (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
        )[0];
        if (lastOrderId.current && newest.id !== lastOrderId.current) {
          setNotifications((prev) => [
            {
              id: newest.id,
              text: `🛎️ New order from ${newest.customer?.name || "Customer"}`,
            },
            ...prev,
          ]);
        }
        lastOrderId.current = newest.id;
      }
    });

    const unsubscribeUsers = onSnapshot(
      query(collection(db, "users"), orderBy("createdAt", "desc")),
      (snapshot) => {
        if (snapshot.empty) return;
        const newest = snapshot.docs[0];
        const user = newest.data();
        if (lastUserId.current && newest.id !== lastUserId.current) {
          setUserNotifications((prev) => [
            {
              id: newest.id,
              text: `👤 ${user.name || "New user"} has joined Brewed`,
            },
            ...prev,
          ]);
        }
        lastUserId.current = newest.id;
      }
    );

    return () => {
      unsubscribe();
      unsubscribeUsers();
    };
  }, []);

  useEffect(() => {
    const today = new Date();
    const data = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      data.push({
        key: d.toDateString(),
        day: d.toLocaleDateString("en-US", { weekday: "short" }),
        revenue: 0,
        orders: 0,
      });
    }
    orders.forEach((order) => {
      if (!order.createdAt?.toDate) return;
      const date = order.createdAt.toDate().toDateString();
      const item = data.find((d) => d.key === date);
      if (item) {
        item.orders += 1;
        item.revenue += Number(order.total || 0);
      }
    });
    setAnalytics(data);
  }, [orders, range]);

  async function loadMenu() {
    const snapshot = await getDocs(collection(db, "menu"));
    const items = snapshot.docs.map((doc) => ({
      ...doc.data(),
      firestoreId: doc.id,
    }));
    setMenu(items);
    setLoading(false);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#FDFBF7", color: "#3B1A08", fontSize: "20px", fontWeight: 600, fontFamily: "Playfair Display, serif" }}>
        ☕ Crafting Brewed Experience...
      </div>
    );
  }

  async function addProduct() {
    if (!newItem.name || !newItem.price) {
      alert("Please fill in the product name and price.");
      return;
    }
    await addDoc(collection(db, "menu"), {
      ...newItem,
      price: Number(newItem.price),
      available: newItem.available,
      isFeatured: newItem.isFeatured,
      sizes: newItem.sizes,
      prepTime: newItem.prepTime,
      servedAs: newItem.servedAs,
      dietType: newItem.dietType,
      milkOptions: newItem.milkOptions,
      temperatureOptions: newItem.temperatureOptions,
      customExtras: newItem.customExtras,
      customExtrasMaxSelection: Number(newItem.customExtrasMaxSelection),
      sweetnessOptions: newItem.sweetnessOptions,
      salesCount: 0,
      rating: 0,
      reviews: 0,
    });
    setNewItem({
      name: "",
      category: "Coffee",
      price: "",
      desc: "",
      emoji: "",
      img: "",
      available: true,
      isFeatured: false,
      prepTime: "5–8 mins",
      servedAs: "Hot",
      dietType: "Vegetarian",
      salesCount: 0,
      rating: 0,
      reviews: 0,
      sizes: [],
      milkOptions: [],
      temperatureOptions: [],
      customExtras: [],
      customExtrasMaxSelection: 3,
      sweetnessOptions: [],
    });
    setShowAdd(false);
    loadMenu();
  }

  async function deleteProduct(id) {
    const confirmed = window.confirm("Are you sure you want to delete this product?");
    if (!confirmed) return;
    await deleteDoc(doc(db, "menu", id));
    loadMenu();
  }

  async function toggleAvailability(item) {
    await updateDoc(doc(db, "menu", item.firestoreId), {
      available: item.available === false ? true : false,
    });
    loadMenu();
  }

  async function updateProduct() {
    if (!editing) return;
    try {
      await updateDoc(doc(db, "menu", editing.firestoreId), {
        name: editItem.name,
        category: editItem.category,
        price: Number(editItem.price),
        desc: editItem.desc,
        emoji: editItem.emoji,
        img: editItem.img,
        available: editItem.available,
        isFeatured: editItem.isFeatured,
        sizes: editItem.sizes,
        milkOptions: editItem.milkOptions,
        temperatureOptions: editItem.temperatureOptions,
        customExtras: editItem.customExtras,
        customExtrasMaxSelection: Number(editItem.customExtrasMaxSelection),
        sweetnessOptions: editItem.sweetnessOptions,
        prepTime: editItem.prepTime,
        servedAs: editItem.servedAs,
        dietType: editItem.dietType,
      });
      alert("Product Updated Successfully!");
      setEditing(null);
      loadMenu();
    } catch (e) {
      alert("Error updating product:\n" + String(e));
    }
  }

  const today = new Date().toDateString();
  const todaySales = orders
    .filter(
      (order) =>
        order.createdAt?.toDate &&
        order.createdAt.toDate().toDateString() === today &&
        order.status !== "Cancelled"
    )
    .reduce((sum, order) => sum + (order.total || 0), 0);
  const todayOrders = orders.filter(
    (order) =>
      order.createdAt?.toDate &&
      order.createdAt.toDate().toDateString() === today &&
      order.status !== "Cancelled"
  ).length;

  return (
    <div style={{ padding: "48px 40px", fontFamily: "'Inter', sans-serif", background: "#FDFBF7", minHeight: "100vh", color: "#2C1810" }}>
      
      {/* Header Section */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "40px",
          borderBottom: "1px solid #E8DFD5",
          paddingBottom: "24px",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "36px", fontWeight: "700", fontFamily: "'Playfair Display', serif", color: "#3B1A08", letterSpacing: "-0.5px" }}>
            Menu Curation
          </h1>
          <p style={{ margin: "6px 0 0 0", color: "#8C7A6B", fontSize: "15px", fontWeight: "400" }}>
            Architect your artisanal coffee collection, pricing, and live catalog availability.
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {setActivePage && (
            <button
              onClick={() => setActivePage("dashboard")}
              style={{
                padding: "12px 20px",
                backgroundColor: "#F2ECE4",
                color: "#3B1A08",
                border: "1px solid #E2D5C9",
                borderRadius: "12px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "14px",
                transition: "all 0.2s ease",
              }}
            >
              ← Dashboard
            </button>
          )}
          {setPage && (
            <button
              onClick={() => setPage("home")}
              style={{
                padding: "12px 22px",
                backgroundColor: "#3B1A08",
                color: "#FFF",
                border: "none",
                borderRadius: "12px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "14px",
                boxShadow: "0 4px 14px rgba(59, 26, 8, 0.15)",
              }}
            >
              Exit to Store
            </button>
          )}
        </div>
      </header>

      {/* Metrics Bar & Action Trigger */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "36px", flexWrap: "wrap", gap: "20px" }}>
        <div style={{ background: "#FFFFFF", padding: "20px 28px", borderRadius: "16px", border: "1px solid #E8DFD5", boxShadow: "0 4px 20px rgba(59, 26, 8, 0.03)", display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "#F7F2EB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }}>
            ☕
          </div>
          <div>
            <span style={{ fontSize: "12px", color: "#8C7A6B", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>Today's Performance</span>
            <h2 style={{ color: "#C4956A", margin: "2px 0 0 0", fontSize: "26px", fontWeight: 800, fontFamily: "'Playfair Display', serif" }}>₹{todaySales} <span style={{ fontSize: "14px", color: "#8C7A6B", fontWeight: 500, fontFamily: "'Inter', sans-serif" }}>({todayOrders} orders)</span></h2>
          </div>
        </div>

        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{
            background: "#3B1A08",
            color: "#FFF",
            border: "none",
            padding: "16px 28px",
            borderRadius: "14px",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "15px",
            boxShadow: "0 6px 20px rgba(59, 26, 8, 0.18)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            transition: "transform 0.2s ease",
          }}
        >
          <span style={{ fontSize: "18px" }}>+</span> Add New Product
        </button>
      </div>

      {/* Search & Categories Filter */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "36px" }}>
        <div style={{ position: "relative", maxWidth: "440px" }}>
          <input
            type="text"
            placeholder="Search items by name or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "15px 18px 15px 44px",
              borderRadius: "14px",
              border: "1px solid #E2D5C9",
              fontSize: "14px",
              outline: "none",
              background: "#FFFFFF",
              boxShadow: "0 2px 10px rgba(59, 26, 8, 0.02)",
              color: "#2C1810",
            }}
          />
          <span style={{ position: "absolute", left: "16px", top: "50%”, transform: "translateY(-50%)", color: "#8C7A6B", fontSize: "16px" }}>🔍</span>
        </div>
        
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {["All", "Coffee", "Non-Coffee", "Food"].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              style={{
                padding: "10px 22px",
                borderRadius: "30px",
                border: categoryFilter === cat ? "1px solid #3B1A08" : "1px solid #E2D5C9",
                cursor: "pointer",
                background: categoryFilter === cat ? "#3B1A08" : "#FFFFFF",
                color: categoryFilter === cat ? "#FFF" : "#5C4A3E",
                fontWeight: 600,
                fontSize: "13px",
                boxShadow: categoryFilter === cat ? "0 4px 12px rgba(59, 26, 8, 0.15)" : "none",
                transition: "all 0.2s ease",
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Add Product Modal Drawer */}
      {showAdd && (
        <div
          style={{
            background: "#FFFFFF",
            padding: "40px",
            borderRadius: "24px",
            marginBottom: "40px",
            boxShadow: "0 20px 50px rgba(59, 26, 8, 0.08)",
            border: "1px solid #E8DFD5",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", borderBottom: "1px solid #F2ECE4", paddingBottom: "16px" }}>
            <h2 style={{ margin: 0, color: "#3B1A08", fontSize: "24px", fontFamily: "'Playfair Display', serif" }}>
              Craft New Menu Product
            </h2>
            <button onClick={() => setShowAdd(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#8C7A6B" }}>✕</button>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "20px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#8C7A6B", marginBottom: "8px", textTransform: "uppercase" }}>Product Name</label>
              <input
                placeholder="e.g. Vanilla Velvet Latte"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #E2D5C9", fontSize: "14px", outline: "none", background: "#FAF7F2" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#8C7A6B", marginBottom: "8px", textTransform: "uppercase" }}>Category</label>
              <select
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #E2D5C9", fontSize: "14px", outline: "none", background: "#FAF7F2" }}
              >
                <option>Coffee</option>
                <option>Non-Coffee</option>
                <option>Food</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#8C7A6B", marginBottom: "8px", textTransform: "uppercase" }}>Price (₹)</label>
              <input
                placeholder="160"
                type="number"
                value={newItem.price}
                onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #E2D5C9", fontSize: "14px", outline: "none", background: "#FAF7F2" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#8C7A6B", marginBottom: "8px", textTransform: "uppercase" }}>Emoji</label>
              <input
                placeholder="☕"
                value={newItem.emoji}
                onChange={(e) => setNewItem({ ...newItem, emoji: e.target.value })}
                style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #E2D5C9", fontSize: "14px", outline: "none", background: "#FAF7F2" }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#8C7A6B", marginBottom: "8px", textTransform: "uppercase" }}>Description</label>
            <textarea
              placeholder="Rich, velvety espresso blended with steamed microfoam and gourmet vanilla essence..."
              value={newItem.desc}
              onChange={(e) => setNewItem({ ...newItem, desc: e.target.value })}
              style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #E2D5C9", fontSize: "14px", outline: "none", minHeight: "90px", resize: "vertical", background: "#FAF7F2" }}
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#8C7A6B", marginBottom: "8px", textTransform: "uppercase" }}>Cloudinary Image URL</label>
            <input
              placeholder="https://res.cloudinary.com/..."
              value={newItem.img}
              onChange={(e) => setNewItem({ ...newItem, img: e.target.value })}
              style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #E2D5C9", fontSize: "14px", outline: "none", background: "#FAF7F2" }}
            />
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "25px", fontWeight: 600, color: "#3B1A08", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={newItem.isFeatured}
              onChange={(e) => setNewItem({ ...newItem, isFeatured: e.target.checked })}
              style={{ width: "18px", height: "18px", accentColor: "#3B1A08" }}
            />
            Highlight as Featured Menu Item
          </label>

          <div style={{ display: "flex", gap: "15px" }}>
            <button
              onClick={addProduct}
              style={{ background: "#3B1A08", color: "#FFF", border: "none", padding: "14px 28px", borderRadius: "12px", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}
            >
              Save Product
            </button>
            <button
              onClick={() => setShowAdd(false)}
              style={{ background: "#E8DFD5", color: "#3B1A08", border: "none", padding: "14px 28px", borderRadius: "12px", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Editing State Modal / Drawer */}
      {editing && (
        <div
          style={{
            background: "#FFFFFF",
            padding: "40px",
            borderRadius: "24px",
            marginBottom: "40px",
            boxShadow: "0 20px 50px rgba(59, 26, 8, 0.12)",
            border: "2px solid #C4956A",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", borderBottom: "1px solid #F2ECE4", paddingBottom: "16px" }}>
            <h2 style={{ margin: 0, color: "#3B1A08", fontSize: "24px", fontFamily: "'Playfair Display', serif" }}>
              Editing: {editing.name}
            </h2>
            <button onClick={() => setEditing(null)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#8C7A6B" }}>✕</button>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "20px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#8C7A6B", marginBottom: "8px", textTransform: "uppercase" }}>Name</label>
              <input
                value={editItem.name}
                onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
                style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #E2D5C9", fontSize: "14px", outline: "none", background: "#FAF7F2" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#8C7A6B", marginBottom: "8px", textTransform: "uppercase" }}>Category</label>
              <select
                value={editItem.category}
                onChange={(e) => setEditItem({ ...editItem, category: e.target.value })}
                style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #E2D5C9", fontSize: "14px", outline: "none", background: "#FAF7F2" }}
              >
                <option>Coffee</option>
                <option>Non-Coffee</option>
                <option>Food</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#8C7A6B", marginBottom: "8px", textTransform: "uppercase" }}>Price (₹)</label>
              <input
                type="number"
                value={editItem.price}
                onChange={(e) => setEditItem({ ...editItem, price: e.target.value })}
                style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #E2D5C9", fontSize: "14px", outline: "none", background: "#FAF7F2" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#8C7A6B", marginBottom: "8px", textTransform: "uppercase" }}>Emoji</label>
              <input
                value={editItem.emoji}
                onChange={(e) => setEditItem({ ...editItem, emoji: e.target.value })}
                style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #E2D5C9", fontSize: "14px", outline: "none", background: "#FAF7F2" }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#8C7A6B", marginBottom: "8px", textTransform: "uppercase" }}>Description</label>
            <textarea
              value={editItem.desc}
              onChange={(e) => setEditItem({ ...editItem, desc: e.target.value })}
              style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #E2D5C9", fontSize: "14px", outline: "none", minHeight: "90px", background: "#FAF7F2" }}
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#8C7A6B", marginBottom: "8px", textTransform: "uppercase" }}>Cloudinary URL</label>
            <input
              value={editItem.img}
              onChange={(e) => setEditItem({ ...editItem, img: e.target.value })}
              style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #E2D5C9", fontSize: "14px", outline: "none", background: "#FAF7F2" }}
            />
          </div>

          <div style={{ display: "flex", gap: "15px" }}>
            <button
              onClick={updateProduct}
              style={{ background: "#2E7D32", color: "#FFF", border: "none", padding: "14px 28px", borderRadius: "12px", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}
            >
              Save Changes
            </button>
            <button
              onClick={() => setEditing(null)}
              style={{ background: "#E8DFD5", color: "#3B1A08", border: "none", padding: "14px 28px", borderRadius: "12px", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Menu Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px" }}>
        {menu
          .filter((item) => {
            const matchesSearch =
              (item.name || "").toLowerCase().includes(search.toLowerCase()) ||
              (item.category || "").toLowerCase().includes(search.toLowerCase());
            const matchesCategory =
              categoryFilter === "All" || item.category === categoryFilter;
            return matchesSearch && matchesCategory;
          })
          .map((item) => (
            <div
              key={item.firestoreId}
              style={{
                background: "#FFFFFF",
                borderRadius: "20px",
                overflow: "hidden",
                boxShadow: "0 8px 30px rgba(59, 26, 8, 0.04)",
                border: "1px solid #E8DFD5",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
              }}
            >
              <div>
                {/* Product Image Thumbnail Preview if available */}
                {item.img && (
                  <div style={{ width: "100%", height: "160px", overflow: "hidden", background: "#F2ECE4" }}>
                    <img src={item.img} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                )}
                
                <div style={{ padding: "24px 24px 16px 24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div>
                      <span style={{ fontSize: "11px", fontWeight: 700, background: "#F2ECE4", color: "#7A6558", padding: "4px 10px", borderRadius: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        {item.category || "General"}
                      </span>
                      <h3 style={{ margin: "10px 0 4px 0", fontSize: "20px", fontWeight: 700, color: "#3B1A08", fontFamily: "'Playfair Display', serif" }}>
                        {item.emoji || "☕"} {item.name || "Unnamed Product"}
                      </h3>
                    </div>
                    <strong style={{ fontSize: "18px", color: "#C4956A", fontWeight: 800 }}>₹{item.price || 0}</strong>
                  </div>
                  <p style={{ color: "#7A6558", fontSize: "13px", margin: "0", lineHeight: "1.6", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {item.desc || "No description provided."}
                  </p>
                </div>
              </div>

              <div style={{ padding: "16px 24px", background: "#FAF7F2", borderTop: "1px solid #F2ECE4", display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  onClick={() => {
                    setEditing(item);
                    setEditItem({
                      name: item.name || "",
                      category: item.category || "Coffee",
                      price: item.price || "",
                      desc: item.desc || "",
                      emoji: item.emoji || "",
                      img: item.img || "",
                      isFeatured: item.isFeatured || false,
                      available: item.available ?? true,
                      sizes: item.sizes || [],
                      milkOptions: item.milkOptions || [],
                      temperatureOptions: item.temperatureOptions || [],
                      customExtras: item.customExtras || [],
                      customExtrasMaxSelection: item.customExtrasMaxSelection || 3,
                      sweetnessOptions: item.sweetnessOptions || [],
                      prepTime: item.prepTime || "5–8 mins",
                      servedAs: item.servedAs || "Hot",
                      dietType: item.dietType || "Vegetarian",
                    });
                  }}
                  style={{
                    flex: 1,
                    background: "#FFFFFF",
                    color: "#3B1A08",
                    border: "1px solid #E2D5C9",
                    padding: "10px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "13px",
                    transition: "all 0.2s ease",
                  }}
                >
                  ✏️ Edit
                </button>

                {/* Exact required stock toggle button functionality kept pristine */}
                <button
                  onClick={() => toggleAvailability(item)}
                  style={{
                    flex: 1.2,
                    background: item.available === false ? "#777777" : "#2E7D32",
                    color: "#FFFFFF",
                    border: "none",
                    padding: "10px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "13px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  }}
                >
                  {item.available === false ? "🚫 Out of Stock" : "✅ In Stock"}
                </button>

                <button
                  onClick={() => deleteProduct(item.firestoreId)}
                  style={{
                    background: "#FCE8E6",
                    color: "#C62828",
                    border: "none",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                  title="Delete Product"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
