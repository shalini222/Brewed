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
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

export default function AdminPage({ setPage }) {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [orders, setOrders] = useState([]);
  const [orderLoading, setOrderLoading] = useState(true);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderFilter, setOrderFilter] = useState("All");
  const [analytics, setAnalytics] = useState([]);
  const [range, setRange] = useState(7);
  const [topProducts, setTopProducts] = useState([]);
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
    // Orders listener
    const unsubscribe = onSnapshot(collection(db, "orders"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setOrders(data);
      setOrderLoading(false);
      if (data.length > 0) {
        const newest = [...data].sort(
          (a, b) =>
            (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
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

    // User registration listener
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
        day: d.toLocaleDateString("en-US", {
          weekday: "short",
        }),
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

  useEffect(() => {
    const stats = {};
    orders.forEach((order) => {
      order.items?.forEach((item) => {
        const name = item.name;
        if (!stats[name]) {
          stats[name] = {
            name,
            img: item.img || "",
            sold: 0,
            revenue: 0,
          };
        }
        const qty = item.qty || item.quantity || 1;
        stats[name].sold += qty;
        stats[name].revenue += qty * Number(item.price || 0);
      });
    });
    const ranked = Object.values(stats)
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 3);
    setTopProducts(ranked);
  }, [orders]);

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
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#FDFBF7", color: "#3B1A08", fontSize: "20px", fontWeight: 600, fontFamily: "'Playfair Display', serif" }}>
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
      isBestSeller: false,
      prepTime: "5–8 mins",
      servedAs: "Hot",
      dietType: "Vegetarian",
      salesCount: 0,
      rating: 0,
      reviews: 0,
      sizes: [],
      milkOptions: [],
    });
    setShowAdd(false);
    loadMenu();
  }

  async function deleteProduct(id) {
    const confirmed = window.confirm("Delete this product?");
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
      alert("Updated!");
      setEditing(null);
      loadMenu();
    } catch (e) {
      alert("Error:\n" + String(e));
    }
  }

  async function updateOrderStatus(id, status) {
    if (status === "Cancelled") {
      const confirmed = window.confirm(
        "Are you sure you want to cancel this order?"
      );
      if (!confirmed) return;
    }
    await updateDoc(doc(db, "orders", id), {
      status,
    });
  }

  const totalOrders = orders.length;
  const pendingOrders = orders.filter(
    (o) =>
      o.status === "New" ||
      o.status === "Preparing" ||
      o.status === "Ready"
  ).length;
  const totalRevenue = orders
    .filter((o) => o.status === "Delivered")
    .reduce((sum, o) => sum + (o.total || 0), 0);
  const totalProducts = menu.length;
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
            ☕ Brewed Admin Dashboard
          </h1>
          <p style={{ margin: "6px 0 0 0", color: "#8C7A6B", fontSize: "15px", fontWeight: "400" }}>
            Manage your cafe menu, orders, and view real-time sales performance.
          </p>
        </div>
        <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            style={{
              position: "relative",
              padding: "12px 20px",
              backgroundColor: "#FFFFFF",
              border: "1px solid #E2D5C9",
              borderRadius: "12px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "14px",
              color: "#3B1A08",
              boxShadow: "0 2px 10px rgba(59, 26, 8, 0.02)",
            }}
          >
            🔔 Notifications
            {(notifications.length > 0 || userNotifications.length > 0) && (
              <span
                style={{
                  position: "absolute",
                  top: "-6px",
                  right: "-6px",
                  background: "#C0392B",
                  color: "white",
                  borderRadius: "50%",
                  padding: "3px 7px",
                  fontSize: "11px",
                  fontWeight: "bold",
                }}
              >
                {notifications.length + userNotifications.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setPage("home")}
            style={{
              padding: "12px 22px",
              backgroundColor: "#3B1A08",
              color: "#FFFFFF",
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
        </div>
      </header>

      {/* Metrics Bar & Action Trigger */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "36px", flexWrap: "wrap", gap: "20px" }}>
        <div style={{ background: "#FFFFFF", padding: "20px 28px", borderRadius: "16px", border: "1px solid #E8DFD5", boxShadow: "0 4px 20px rgba(59, 26, 8, 0.03)", display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "#F7F2EB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }}>
            💰
          </div>
          <div>
            <span style={{ fontSize: "12px", color: "#8C7A6B", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>Today's Performance</span>
            <h1
              style={{
                color: "#C4956A",
                margin: "2px 0 0 0",
                fontSize: "26px",
                fontWeight: 800,
                fontFamily: "'Playfair Display', serif",
              }}
            >
              ₹{todaySales} <span style={{ fontSize: "14px", color: "#8C7A6B", fontWeight: 500, fontFamily: "'Inter', sans-serif" }}>({todayOrders} Orders Today)</span>
            </h1>
          </div>
        </div>

        <button
          onClick={() => setShowAdd(true)}
          style={{
            background: "#3B1A08",
            color: "white",
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
          <span style={{ fontSize: "18px" }}>+</span> Add Product
        </button>
      </div>

      {/* Search & Categories Filter */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "36px" }}>
        <div style={{ position: "relative", maxWidth: "440px" }}>
          <input
            type="text"
            placeholder="Search products..."
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
          <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "#8C7A6B", fontSize: "16px" }}>🔍</span>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          {["All", "Coffee", "Non-Coffee", "Food"].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              style={{
                padding: "10px 22px",
                borderRadius: "30px",
                border: categoryFilter === cat ? "1px solid #3B1A08" : "1px solid #E2D5C9",
                cursor: "pointer",
                background:
                  categoryFilter === cat ? "#3B1A08" : "#FFFFFF",
                color:
                  categoryFilter === cat ? "#fff" : "#5C4A3E",
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
                placeholder="Name"
                value={newItem.name}
                onChange={(e) =>
                  setNewItem({ ...newItem, name: e.target.value })
                }
                style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #E2D5C9", fontSize: "14px", outline: "none", background: "#FAF7F2" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#8C7A6B", marginBottom: "8px", textTransform: "uppercase" }}>Category</label>
              <select
                value={newItem.category}
                onChange={(e) =>
                  setNewItem({
                    ...newItem,
                    category: e.target.value,
                  })
                }
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
                placeholder="Price"
                type="number"
                value={newItem.price}
                onChange={(e) =>
                  setNewItem({
                    ...newItem,
                    price: e.target.value,
                  })
                }
                style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #E2D5C9", fontSize: "14px", outline: "none", background: "#FAF7F2" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#8C7A6B", marginBottom: "8px", textTransform: "uppercase" }}>Emoji</label>
              <input
                placeholder="Emoji (optional)"
                value={newItem.emoji}
                onChange={(e) =>
                  setNewItem({
                    ...newItem,
                    emoji: e.target.value,
                  })
                }
                style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #E2D5C9", fontSize: "14px", outline: "none", background: "#FAF7F2" }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#8C7A6B", marginBottom: "8px", textTransform: "uppercase" }}>Description</label>
            <textarea
              placeholder="Description"
              value={newItem.desc}
              onChange={(e) =>
                setNewItem({
                  ...newItem,
                  desc: e.target.value,
                })
              }
              style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #E2D5C9", fontSize: "14px", outline: "none", minHeight: "90px", resize: "vertical", background: "#FAF7F2" }}
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#8C7A6B", marginBottom: "8px", textTransform: "uppercase" }}>Cloudinary Image URL</label>
            <input
              placeholder="Cloudinary Image URL"
              value={newItem.img}
              onChange={(e) =>
                setNewItem({
                  ...newItem,
                  img: e.target.value,
                })
              }
              style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #E2D5C9", fontSize: "14px", outline: "none", background: "#FAF7F2" }}
            />
          </div>

          <h3
            style={{
              marginTop: 30,
              marginBottom: 15,
              fontSize: "16px",
              color: "#3B1A08",
              fontFamily: "'Playfair Display', serif"
            }}
          >
            Product Sizes
          </h3>
          <button
            type="button"
            onClick={() =>
              setNewItem({
                ...newItem,
                sizes: [
                  ...newItem.sizes,
                  {
                    name: "",
                    volume: "",
                    price: 0,
                  },
                ],
              })
            }
            style={{
              padding: "10px 18px",
              background: "#C4956A",
              border: "none",
              color: "#fff",
              borderRadius: 10,
              cursor: "pointer",
              marginBottom: 20,
              fontWeight: 600,
            }}
          >
            ➕ Add Size
          </button>
          {newItem.sizes.map((size, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <input
                placeholder="Size Name"
                value={size.name}
                onChange={(e) => {
                  const updated = [...newItem.sizes];
                  updated[index].name = e.target.value;
                  setNewItem({
                    ...newItem,
                    sizes: updated,
                  });
                }}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ddd", flex: 1 }}
              />
              <input
                placeholder="Volume"
                value={size.volume}
                onChange={(e) => {
                  const updated = [...newItem.sizes];
                  updated[index].volume = e.target.value;
                  setNewItem({
                    ...newItem,
                    sizes: updated,
                  });
                }}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ddd", flex: 1 }}
              />
              <input
                type="number"
                placeholder="Price Difference"
                value={size.price}
                onChange={(e) => {
                  const updated = [...newItem.sizes];
                  updated[index].price = Number(e.target.value);
                  setNewItem({
                    ...newItem,
                    sizes: updated,
                  });
                }}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ddd", width: "120px" }}
              />
              <button
                type="button"
                onClick={() => {
                  setNewItem({
                    ...newItem,
                    sizes: newItem.sizes.filter(
                      (_, i) => i !== index
                    ),
                  });
                }}
                style={{
                  background: "#D32F2F",
                  color: "#fff",
                  border: "none",
                  padding: "10px 14px",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                🗑
              </button>
            </div>
          ))}

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 20,
              fontWeight: 600,
              color: "#3B1A08",
            }}
          >
            <input
              type="checkbox"
              checked={newItem.isFeatured}
              onChange={(e) =>
                setNewItem({
                  ...newItem,
                  isFeatured: e.target.checked,
                })
              }
              style={{ width: "18px", height: "18px", accentColor: "#3B1A08" }}
            />
            Featured Product
          </label>
          <br />
          <br />
          <h3
            style={{
              marginTop: 30,
              marginBottom: 15,
              fontSize: "16px",
              color: "#3B1A08",
              fontFamily: "'Playfair Display', serif"
            }}
          >
            Milk Options
          </h3>
          <button
            type="button"
            onClick={() =>
              setNewItem({
                ...newItem,
                milkOptions: [
                  ...newItem.milkOptions,
                  {
                    name: "",
                    price: 0,
                    icon: "",
                  },
                ],
              })
            }
            style={{
              padding: "10px 18px",
              background: "#C4956A",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              marginBottom: 20,
              fontWeight: 600,
            }}
          >
            🥛 Add Milk Option
          </button>

          {newItem.milkOptions?.map((milk, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <input
                placeholder="Milk Name"
                value={milk.name}
                onChange={(e) => {
                  const updated = [...newItem.milkOptions];
                  updated[index].name = e.target.value;
                  setNewItem({
                    ...newItem,
                    milkOptions: updated,
                  });
                }}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ddd", flex: 1 }}
              />

              <input
                type="number"
                placeholder="Extra Price"
                value={milk.price}
                onChange={(e) => {
                  const updated = [...newItem.milkOptions];
                  updated[index].price = Number(e.target.value);

                  setNewItem({
                    ...newItem,
                    milkOptions: updated,
                  });
                }}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ddd", width: "120px" }}
              />

              <input
                placeholder="Icon (🥛 🌾 🫘 🥥 or image URL)"
                value={milk.icon}
                onChange={(e) => {
                  const updated = [...newItem.milkOptions];
                  updated[index].icon = e.target.value;

                  setNewItem({
                    ...newItem,
                    milkOptions: updated,
                  });
                }}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ddd", flex: 1 }}
              />
              <button
                type="button"
                onClick={() =>
                  setNewItem({
                    ...newItem,
                    milkOptions: newItem.milkOptions.filter(
                      (_, i) => i !== index
                    ),
                  })
                }
                style={{
                  background: "#D32F2F",
                  color: "#fff",
                  border: "none",
                  padding: "10px 14px",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                🗑
              </button>
            </div>
          ))}
          <br />
          <br />

          <h3
            style={{
              marginTop: 30,
              marginBottom: 15,
              fontSize: "16px",
              color: "#3B1A08",
              fontFamily: "'Playfair Display', serif"
            }}
          >
            Temperature Options
          </h3>
          <button
            type="button"
            onClick={() =>
              setNewItem({
                ...newItem,
                temperatureOptions: [
                  ...newItem.temperatureOptions,
                  {
                    name: "",
                    description: "",
                    icon: "",
                  },
                ],
              })
            }
            style={{
              padding: "10px 18px",
              background: "#C4956A",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              marginBottom: 20,
              fontWeight: 600,
            }}
          >
            🌡 Add Temperature
          </button>

          {newItem.temperatureOptions?.map((temp, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <input
                placeholder="Temperature Name"
                value={temp.name}
                onChange={(e) => {
                  const updated = [...newItem.temperatureOptions];
                  updated[index].name = e.target.value;

                  setNewItem({
                    ...newItem,
                    temperatureOptions: updated,
                  });
                }}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ddd", flex: 1 }}
              />

              <input
                placeholder="Description"
                value={temp.description}
                onChange={(e) => {
                  const updated = [...newItem.temperatureOptions];
                  updated[index].description = e.target.value;

                  setNewItem({
                    ...newItem,
                    temperatureOptions: updated,
                  });
                }}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ddd", flex: 1 }}
              />

              <input
                placeholder="Icon (🔥 ❄️ or image/SVG URL)"
                value={temp.icon}
                onChange={(e) => {
                  const updated = [...newItem.temperatureOptions];
                  updated[index].icon = e.target.value;

                  setNewItem({
                    ...newItem,
                    temperatureOptions: updated,
                  });
                }}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ddd", flex: 1 }}
              />

              <button
                type="button"
                onClick={() =>
                  setNewItem({
                    ...newItem,
                    temperatureOptions: newItem.temperatureOptions.filter(
                      (_, i) => i !== index
                    ),
                  })
                }
                style={{
                  background: "#D32F2F",
                  color: "#fff",
                  border: "none",
                  padding: "10px 14px",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                🗑
              </button>
            </div>
          ))}
          <br />
          <br />

          <h4
            style={{
              marginTop: 30,
              marginBottom: 10,
              fontSize: "14px",
              color: "#3B1A08",
              fontWeight: 700,
            }}
          >
            Maximum Extras Allowed
          </h4>
          <input
            type="number"
            min={1}
            value={newItem.customExtrasMaxSelection}
            onChange={(e) =>
              setNewItem({
                ...newItem,
                customExtrasMaxSelection: Math.max(
                  1,
                  Number(e.target.value)
                ),
              })
            }
            style={{
              width: 100,
              padding: 10,
              borderRadius: 10,
              border: "1px solid #ddd",
              marginBottom: 20,
            }}
          />

          <h3
            style={{
              marginTop: 30,
              marginBottom: 15,
              fontSize: "16px",
              color: "#3B1A08",
              fontFamily: "'Playfair Display', serif"
            }}
          >
            Custom Extras
          </h3>
          <button
            type="button"
            onClick={() =>
              setNewItem({
                ...newItem,
                customExtras: [
                  ...newItem.customExtras,
                  {
                    name: "",
                    description: "",
                    price: 0,
                    icon: "",
                  },
                ],
              })
            }
            style={{
              padding: "10px 18px",
              background: "#C4956A",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              marginBottom: 20,
              fontWeight: 600,
            }}
          >
            ➕ Add Extra
          </button>

          {newItem.customExtras?.map((extra, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <input
                placeholder="Extra Name"
                value={extra.name}
                onChange={(e) => {
                  const updated = [...newItem.customExtras];
                  updated[index].name = e.target.value;
                  setNewItem({
                    ...newItem,
                    customExtras: updated,
                  });
                }}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ddd", flex: 1 }}
              />

              <input
                placeholder="Description"
                value={extra.description}
                onChange={(e) => {
                  const updated = [...newItem.customExtras];
                  updated[index].description = e.target.value;

                  setNewItem({
                    ...newItem,
                    customExtras: updated,
                  });
                }}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ddd", flex: 1 }}
              />

              <input
                type="number"
                placeholder="Price"
                value={extra.price}
                onChange={(e) => {
                  const updated = [...newItem.customExtras];
                  updated[index].price = Number(e.target.value);

                  setNewItem({
                    ...newItem,
                    customExtras: updated,
                  });
                }}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ddd", width: "100px" }}
              />

              <input
                placeholder="Icon (🍫 or image/SVG URL)"
                value={extra.icon}
                onChange={(e) => {
                  const updated = [...newItem.customExtras];
                  updated[index].icon = e.target.value;

                  setNewItem({
                    ...newItem,
                    customExtras: updated,
                  });
                }}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ddd", flex: 1 }}
              />

              <button
                type="button"
                onClick={() =>
                  setNewItem({
                    ...newItem,
                    customExtras: newItem.customExtras.filter(
                      (_, i) => i !== index
                    ),
                  })
                }
                style={{
                  background: "#D32F2F",
                  color: "#fff",
                  border: "none",
                  padding: "10px 14px",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                🗑
              </button>
            </div>
          ))}
          <br />
          <br />

          <h3
            style={{
              marginTop: 30,
              marginBottom: 15,
              fontSize: "16px",
              color: "#3B1A08",
              fontFamily: "'Playfair Display', serif"
            }}
          >
            Sweetness Options
          </h3>
          <button
            type="button"
            onClick={() =>
              setNewItem({
                ...newItem,
                sweetnessOptions: [
                  ...newItem.sweetnessOptions,
                  {
                    name: "",
                    description: "",
                    icon: "",
                  },
                ],
              })
            }
            style={{
              padding: "10px 18px",
              background: "#C4956A",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              marginBottom: 20,
              fontWeight: 600,
            }}
          >
            🍬 Add Sweetness
          </button>

          {newItem.sweetnessOptions?.map((sweet, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <input
                placeholder="Name"
                value={sweet.name}
                onChange={(e) => {
                  const updated = [...newItem.sweetnessOptions];
                  updated[index].name = e.target.value;
                  setNewItem({
                    ...newItem,
                    sweetnessOptions: updated,
                  });
                }}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ddd", flex: 1 }}
              />

              <input
                placeholder="Description"
                value={sweet.description}
                onChange={(e) => {
                  const updated = [...newItem.sweetnessOptions];
                  updated[index].description = e.target.value;

                  setNewItem({
                    ...newItem,
                    sweetnessOptions: updated,
                  });
                }}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ddd", flex: 1 }}
              />

              <input
                placeholder="Icon (🍬 or image/SVG URL)"
                value={sweet.icon}
                onChange={(e) => {
                  const updated = [...newItem.sweetnessOptions];
                  updated[index].icon = e.target.value;

                  setNewItem({
                    ...newItem,
                    sweetnessOptions: updated,
                  });
                }}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ddd", flex: 1 }}
              />

              <button
                type="button"
                onClick={() =>
                  setNewItem({
                    ...newItem,
                    sweetnessOptions: newItem.sweetnessOptions.filter(
                      (_, i) => i !== index
                    ),
                  })
                }
                style={{
                  background: "#D32F2F",
                  color: "#fff",
                  border: "none",
                  padding: "10px 14px",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                🗑
              </button>
            </div>
          ))}
          <br />
          <br />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "30px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#8C7A6B", marginBottom: "8px", textTransform: "uppercase" }}>Prep Time</label>
              <select
                value={newItem.prepTime}
                onChange={(e) =>
                  setNewItem({
                    ...newItem,
                    prepTime: e.target.value,
                  })
                }
                style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #E2D5C9", background: "#FAF7F2" }}
              >
                <option>2–4 mins</option>
                <option>5–8 mins</option>
                <option>8–12 mins</option>
                <option>10–15 mins</option>
                <option>Ready to Serve</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#8C7A6B", marginBottom: "8px", textTransform: "uppercase" }}>Served As</label>
              <select
                value={newItem.servedAs}
                onChange={(e) =>
                  setNewItem({
                    ...newItem,
                    servedAs: e.target.value,
                  })
                }
                style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #E2D5C9", background: "#FAF7F2" }}
              >
                <option>Hot</option>
                <option>Cold</option>
                <option>Hot / Cold</option>
                <option>Room Temperature</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#8C7A6B", marginBottom: "8px", textTransform: "uppercase" }}>Diet Type</label>
              <select
                value={newItem.dietType}
                onChange={(e) =>
                  setNewItem({
                    ...newItem,
                    dietType: e.target.value,
                  })
                }
                style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #E2D5C9", background: "#FAF7F2" }}
              >
                <option>Vegetarian</option>
                <option>Vegan</option>
                <option>Non-Vegetarian</option>
              </select>
            </div>
          </div>

          <button onClick={addProduct} style={{ background: "#3B1A08", color: "#FFF", border: "none", padding: "14px 28px", borderRadius: "12px", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}>Save Product</button>
        </div>
      )}

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
                placeholder="Name"
                value={editItem.name}
                onChange={(e) =>
                  setEditItem({
                    ...editItem,
                    name: e.target.value,
                  })
                }
                style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #E2D5C9", fontSize: "14px", outline: "none", background: "#FAF7F2" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#8C7A6B", marginBottom: "8px", textTransform: "uppercase" }}>Category</label>
              <select
                value={editItem.category}
                onChange={(e) =>
                  setEditItem({
                    ...editItem,
                    category: e.target.value,
                  })
                }
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
                placeholder="Price"
                value={editItem.price}
                onChange={(e) =>
                  setEditItem({
                    ...editItem,
                    price: e.target.value,
                  })
                }
                style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #E2D5C9", fontSize: "14px", outline: "none", background: "#FAF7F2" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#8C7A6B", marginBottom: "8px", textTransform: "uppercase" }}>Emoji</label>
              <input
                placeholder="Emoji"
                value={editItem.emoji}
                onChange={(e) =>
                  setEditItem({
                    ...editItem,
                    emoji: e.target.value,
                  })
                }
                style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #E2D5C9", fontSize: "14px", outline: "none", background: "#FAF7F2" }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#8C7A6B", marginBottom: "8px", textTransform: "uppercase" }}>Description</label>
            <textarea
              placeholder="Description"
              value={editItem.desc}
              onChange={(e) =>
                setEditItem({
                  ...editItem,
                  desc: e.target.value,
                })
              }
              style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #E2D5C9", fontSize: "14px", outline: "none", minHeight: "90px", background: "#FAF7F2" }}
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#8C7A6B", marginBottom: "8px", textTransform: "uppercase" }}>Cloudinary URL</label>
            <input
              placeholder="Cloudinary URL"
              value={editItem.img}
              onChange={(e) =>
                setEditItem({
                  ...editItem,
                  img: e.target.value,
                })
              }
              style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #E2D5C9", fontSize: "14px", outline: "none", background: "#FAF7F2" }}
            />
          </div>

          <h3
            style={{
              marginTop: 30,
              marginBottom: 15,
              fontSize: "16px",
              color: "#3B1A08",
              fontFamily: "'Playfair Display', serif"
            }}
          >
            Product Sizes
          </h3>
          <button
            type="button"
            onClick={() =>
              setEditItem({
                ...editItem,
                sizes: [
                  ...editItem.sizes,
                  {
                    name: "",
                    volume: "",
                    price: 0,
                  },
                ],
              })
            }
            style={{
              padding: "10px 18px",
              background: "#C4956A",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              marginBottom: 20,
              fontWeight: 600,
            }}
          >
            ➕ Add Size
          </button>

          {editItem.sizes.map((size, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <input
                placeholder="Size Name"
                value={size.name}
                onChange={(e) => {
                  const updated = [...editItem.sizes];
                  updated[index].name = e.target.value;
                  setEditItem({
                    ...editItem,
                    sizes: updated,
                  });
                }}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ddd", flex: 1 }}
              />

              <input
                placeholder="Volume"
                value={size.volume}
                onChange={(e) => {
                  const updated = [...editItem.sizes];
                  updated[index].volume = e.target.value;
                  setEditItem({
                    ...editItem,
                    sizes: updated,
                  });
                }}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ddd", flex: 1 }}
              />

              <input
                type="number"
                placeholder="Price Difference"
                value={size.price}
                onChange={(e) => {
                  const updated = [...editItem.sizes];
                  updated[index].price = Number(e.target.value);
                  setEditItem({
                    ...editItem,
                    sizes: updated,
                  });
                }}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ddd", width: "120px" }}
              />

              <button
                type="button"
                onClick={() => {
                  setEditItem({
                    ...editItem,
                    sizes: editItem.sizes.filter(
                      (_, i) => i !== index
                    ),
                  });
                }}
                style={{
                  background: "#D32F2F",
                  color: "#fff",
                  border: "none",
                  padding: "10px 14px",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                🗑
              </button>
            </div>
          ))}
          <br />
          <br />

          <h3
            style={{
              marginTop: 30,
              marginBottom: 15,
              fontSize: "16px",
              color: "#3B1A08",
              fontFamily: "'Playfair Display', serif"
            }}
          >
            Milk Options
          </h3>
          <button
            type="button"
            onClick={() =>
              setEditItem({
                ...editItem,
                milkOptions: [
                  ...editItem.milkOptions,
                  {
                    name: "",
                    price: 0,
                    icon: "",
                  },
                ],
              })
            }
            style={{
              padding: "10px 18px",
              background: "#C4956A",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              marginBottom: 20,
              fontWeight: 600,
            }}
          >
            🥛 Add Milk Option
          </button>

          {editItem.milkOptions?.map((milk, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <input
                placeholder="Milk Name"
                value={milk.name}
                onChange={(e) => {
                  const updated = [...editItem.milkOptions];
                  updated[index].name = e.target.value;
                  setEditItem({
                    ...editItem,
                    milkOptions: updated,
                  });
                }}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ddd", flex: 1 }}
              />

              <input
                type="number"
                placeholder="Extra Price"
                value={milk.price}
                onChange={(e) => {
                  const updated = [...editItem.milkOptions];
                  updated[index].price = Number(e.target.value);

                  setEditItem({
                    ...editItem,
                    milkOptions: updated,
                  });
                }}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ddd", width: "120px" }}
              />

              <input
                placeholder="Icon (🥛 🌾 🫘 🥥 or image URL)"
                value={milk.icon}
                onChange={(e) => {
                  const updated = [...editItem.milkOptions];
                  updated[index].icon = e.target.value;

                  setEditItem({
                    ...editItem,
                    milkOptions: updated,
                  });
                }}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ddd", flex: 1 }}
              />
              <button
                type="button"
                onClick={() =>
                  setEditItem({
                    ...editItem,
                    milkOptions: editItem.milkOptions.filter(
                      (_, i) => i !== index
                    ),
                  })
                }
                style={{
                  background: "#D32F2F",
                  color: "#fff",
                  border: "none",
                  padding: "10px 14px",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                🗑
              </button>
            </div>
          ))}
          <br />
          <br />

          <h3
            style={{
              marginTop: 30,
              marginBottom: 15,
              fontSize: "16px",
              color: "#3B1A08",
              fontFamily: "'Playfair Display', serif"
            }}
          >
            Temperature Options
          </h3>
          <button
            type="button"
            onClick={() =>
              setEditItem({
                ...editItem,
                temperatureOptions: [
                  ...editItem.temperatureOptions,
                  {
                    name: "",
                    description: "",
                    icon: "",
                  },
                ],
              })
            }
            style={{
              padding: "10px 18px",
              background: "#C4956A",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              marginBottom: 20,
              fontWeight: 600,
            }}
          >
            🌡 Add Temperature
          </button>

          {editItem.temperatureOptions?.map((temp, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <input
                placeholder="Temperature Name"
                value={temp.name}
                onChange={(e) => {
                  const updated = [...editItem.temperatureOptions];
                  updated[index].name = e.target.value;
                  setEditItem({
                    ...editItem,
                    temperatureOptions: updated,
                  });
                }}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ddd", flex: 1 }}
              />

              <input
                placeholder="Description"
                value={temp.description}
                onChange={(e) => {
                  const updated = [...editItem.temperatureOptions];
                  updated[index].description = e.target.value;

                  setEditItem({
                    ...editItem,
                    temperatureOptions: updated,
                  });
                }}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ddd", flex: 1 }}
              />

              <input
                placeholder="Icon (🔥 ❄️ or image/SVG URL)"
                value={temp.icon}
                onChange={(e) => {
                  const updated = [...editItem.temperatureOptions];
                  updated[index].icon = e.target.value;

                  setEditItem({
                    ...editItem,
                    temperatureOptions: updated,
                  });
                }}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ddd", flex: 1 }}
              />

              <button
                type="button"
                onClick={() =>
                  setEditItem({
                    ...editItem,
                    temperatureOptions: editItem.temperatureOptions.filter(
                      (_, i) => i !== index
                    ),
                  })
                }
                style={{
                  background: "#D32F2F",
                  color: "#fff",
                  border: "none",
                  padding: "10px 14px",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                🗑
              </button>
            </div>
          ))}
          <br />
          <br />

          <h4
            style={{
              marginTop: 30,
              marginBottom: 10,
              fontSize: "14px",
              color: "#3B1A08",
              fontWeight: 700,
            }}
          >
            Maximum Extras Allowed
          </h4>
          <input
            type="number"
            min={1}
            value={editItem.customExtrasMaxSelection}
            onChange={(e) =>
              setEditItem({
                ...editItem,
                customExtrasMaxSelection: Math.max(
                  1,
                  Number(e.target.value)
                ),
              })
            }
            style={{
              width: 100,
              padding: 10,
              borderRadius: 10,
              border: "1px solid #ddd",
              marginBottom: 20,
            }}
          />

          <h3
            style={{
              marginTop: 30,
              marginBottom: 15,
              fontSize: "16px",
              color: "#3B1A08",
              fontFamily: "'Playfair Display', serif"
            }}
          >
            Custom Extras
          </h3>
          <button
            type="button"
            onClick={() =>
              setEditItem({
                ...editItem,
                customExtras: [
                  ...editItem.customExtras,
                  {
                    name: "",
                    description: "",
                    price: 0,
                    icon: "",
                  },
                ],
              })
            }
            style={{
              padding: "10px 18px",
              background: "#C4956A",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              marginBottom: 20,
              fontWeight: 600,
            }}
          >
            ➕ Add Extra
          </button>

          {editItem.customExtras?.map((extra, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <input
                placeholder="Extra Name"
                value={extra.name}
                onChange={(e) => {
                  const updated = [...editItem.customExtras];
                  updated[index].name = e.target.value;
                  setEditItem({
                    ...editItem,
                    customExtras: updated,
                  });
                }}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ddd", flex: 1 }}
              />

              <input
                placeholder="Description"
                value={extra.description}
                onChange={(e) => {
                  const updated = [...editItem.customExtras];
                  updated[index].description = e.target.value;

                  setEditItem({
                    ...editItem,
                    customExtras: updated,
                  });
                }}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ddd", flex: 1 }}
              />

              <input
                type="number"
                placeholder="Price"
                value={extra.price}
                onChange={(e) => {
                  const updated = [...editItem.customExtras];
                  updated[index].price = Number(e.target.value);

                  setEditItem({
                    ...editItem,
                    customExtras: updated,
                  });
                }}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ddd", width: "100px" }}
              />

              <input
                placeholder="Icon (🍫 or image/SVG URL)"
                value={extra.icon}
                onChange={(e) => {
                  const updated = [...editItem.customExtras];
                  updated[index].icon = e.target.value;

                  setEditItem({
                    ...editItem,
                    customExtras: updated,
                  });
                }}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ddd", flex: 1 }}
              />

              <button
                type="button"
                onClick={() =>
                  setEditItem({
                    ...editItem,
                    customExtras: editItem.customExtras.filter(
                      (_, i) => i !== index
                    ),
                  })
                }
                style={{
                  background: "#D32F2F",
                  color: "#fff",
                  border: "none",
                  padding: "10px 14px",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                🗑
              </button>
            </div>
          ))}
          <br />
          <br />

          <h3
            style={{
              marginTop: 30,
              marginBottom: 15,
              fontSize: "16px",
              color: "#3B1A08",
              fontFamily: "'Playfair Display', serif"
            }}
          >
            Sweetness Options
          </h3>
          <button
            type="button"
            onClick={() =>
              setEditItem({
                ...editItem,
                sweetnessOptions: [
                  ...(editItem.sweetnessOptions || []),
                  {
                    name: "",
                    description: "",
                    icon: "",
                  },
                ],
              })
            }
            style={{
              padding: "10px 18px",
              background: "#C4956A",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              marginBottom: 20,
              fontWeight: 600,
            }}
          >
            🍬 Add Sweetness
          </button>

          {editItem.sweetnessOptions?.map((sweet, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <input
                placeholder="Name"
                value={sweet.name}
                onChange={(e) => {
                  const updated = [...editItem.sweetnessOptions];
                  updated[index].name = e.target.value;
                  setEditItem({
                    ...editItem,
                    sweetnessOptions: updated,
                  });
                }}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ddd", flex: 1 }}
              />

              <input
                placeholder="Description"
                value={sweet.description}
                onChange={(e) => {
                  const updated = [...editItem.sweetnessOptions];
                  updated[index].description = e.target.value;

                  setEditItem({
                    ...editItem,
                    sweetnessOptions: updated,
                  });
                }}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ddd", flex: 1 }}
              />

              <input
                placeholder="Icon (🍬 or image/SVG URL)"
                value={sweet.icon}
                onChange={(e) => {
                  const updated = [...editItem.sweetnessOptions];
                  updated[index].icon = e.target.value;

                  setEditItem({
                    ...editItem,
                    sweetnessOptions: updated,
                  });
                }}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ddd", flex: 1 }}
              />

              <button
                type="button"
                onClick={() =>
                  setEditItem({
                    ...editItem,
                    sweetnessOptions:
                      editItem.sweetnessOptions.filter(
                        (_, i) => i !== index
                      ),
                  })
                }
                style={{
                  background: "#D32F2F",
                  color: "#fff",
                  border: "none",
                  padding: "10px 14px",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                🗑
              </button>
            </div>
          ))}
          <br />
          <br />

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 20,
              fontWeight: 600,
              color: "#3B1A08",
            }}
          >
            <input
              type="checkbox"
              checked={editItem.isFeatured}
              onChange={(e) =>
                setEditItem({
                  ...editItem,
                  isFeatured: e.target.checked,
                })
              }
              style={{ width: "18px", height: "18px", accentColor: "#3B1A08" }}
            />
            Featured Product
          </label>

          <br />
          <br />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "30px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#8C7A6B", marginBottom: "8px", textTransform: "uppercase" }}>Prep Time</label>
              <select
                value={editItem.prepTime}
                onChange={(e) =>
                  setEditItem({
                    ...editItem,
                    prepTime: e.target.value,
                  })
                }
                style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #E2D5C9", background: "#FAF7F2" }}
              >
                <option>2–4 mins</option>
                <option>5–8 mins</option>
                <option>8–12 mins</option>
                <option>10–15 mins</option>
                <option>Ready to Serve</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#8C7A6B", marginBottom: "8px", textTransform: "uppercase" }}>Served As</label>
              <select
                value={editItem.servedAs}
                onChange={(e) =>
                  setEditItem({
                    ...editItem,
                    servedAs: e.target.value,
                  })
                }
                style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #E2D5C9", background: "#FAF7F2" }}
              >
                <option>Hot</option>
                <option>Cold</option>
                <option>Hot / Cold</option>
                <option>Room Temperature</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#8C7A6B", marginBottom: "8px", textTransform: "uppercase" }}>Diet Type</label>
              <select
                value={editItem.dietType}
                onChange={(e) =>
                  setEditItem({
                    ...editItem,
                    dietType: e.target.value,
                  })
                }
                style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #E2D5C9", background: "#FAF7F2" }}
              >
                <option>Vegetarian</option>
                <option>Vegan</option>
                <option>Non-Vegetarian</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: "15px" }}>
            <button
              onClick={updateProduct}
              style={{
                background: "#2E7D32",
                color: "#FFF",
                border: "none",
                padding: "14px 28px",
                borderRadius: "12px",
                fontWeight: 600,
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              💾 Save Changes
            </button>
            <button 
              onClick={() => setEditing(null)}
              style={{
                background: "#E8DFD5",
                color: "#3B1A08",
                border: "none",
                padding: "14px 28px",
                borderRadius: "12px",
                fontWeight: 600,
                fontSize: "14px",
                cursor: "pointer",
              }}
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
              item.name.toLowerCase().includes(search.toLowerCase()) ||
              item.category.toLowerCase().includes(search.toLowerCase());
            const matchesCategory =
              categoryFilter === "All" ||
              item.category === categoryFilter;
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
                        {item.emoji} {item.name}
                      </h3>
                    </div>
                    <strong style={{ fontSize: "18px", color: "#C4956A", fontWeight: 800 }}>₹{item.price}</strong>
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
                      available: item.available,
                      sizes: item.sizes || [],
                      milkOptions: item.milkOptions || [],
                      temperatureOptions: item.temperatureOptions || [],
                      customExtras: item.customExtras || [],
                      customExtrasMaxSelection:
                        item.customExtrasMaxSelection || 3,
                      sweetnessOptions: item.sweetnessOptions || [],
                      prepTime: item.prepTime,
                      servedAs: item.servedAs,
                      dietType: item.dietType,
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
                  ✏ Edit
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
                <button
                  onClick={() => toggleAvailability(item)}
                  style={{
                    flex: 1.2,
                    background: item.available === false ? "#777777" : "#2E7D32",
                    color: "#fff",
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
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
