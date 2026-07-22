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

export default function MenuManagement({ setPage , setActivePage }) {
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
    return <div style={{ padding: 100 }}>Loading...</div>;
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
    alert("Document ID = " + editing.firestoreId);
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
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      {/* Header Section */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
          borderBottom: "1px solid #eaeaea",
          paddingBottom: "20px",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "28px", color: "#333" }}>
            ☕ Brewed Admin Dashboard
          </h1>
          <p style={{ margin: "5px 0 0 0", color: "#666" }}>
            Manage your cafe menu, orders, and view real-time sales performance.
          </p>
        </div>
        <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            style={{
              position: "relative",
              padding: "10px 15px",
              backgroundColor: "#f5f5f5",
              border: "1px solid #ddd",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            🔔 Notifications
            {(notifications.length > 0 || userNotifications.length > 0) && (
              <span
                style={{
                  position: "absolute",
                  top: "-5px",
                  right: "-5px",
                  background: "red",
                  color: "white",
                  borderRadius: "50%",
                  padding: "2px 6px",
                  fontSize: "12px",
                }}
              >
                {notifications.length + userNotifications.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setPage("home")}
            style={{
              padding: "10px 20px",
              backgroundColor: "#333",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Exit to Store
          </button>
        </div>
      </header>

      <div>
        <h1
          style={{
            color: "#C4956A",
            margin: "10px 0",
          }}
        >
          ₹{todaySales}
        </h1>
        <p>{todayOrders} Orders Today</p>
      </div>

      <button
        onClick={() => setShowAdd(true)}
        style={{
          background: "#3B1A08",
          color: "white",
          border: "none",
          padding: "12px 20px",
          borderRadius: 12,
          cursor: "pointer",
          marginBottom: 30,
        }}
      >
        ➕ Add Product
      </button>

      <br />
      <br />

      <input
        type="text"
        placeholder="🔍 Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%",
          maxWidth: 450,
          padding: "14px 18px",
          borderRadius: 14,
          border: "1px solid #ddd",
          fontSize: 16,
          marginBottom: 30,
          outline: "none",
          background: "#fff",
        }}
      />

      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 30,
          flexWrap: "wrap",
        }}
      >
        {["All", "Coffee", "Non-Coffee", "Food"].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            style={{
              padding: "10px 18px",
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              background:
                categoryFilter === cat ? "#3B1A08" : "#F2ECE5",
              color:
                categoryFilter === cat ? "#fff" : "#3B1A08",
              fontWeight: 600,
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {showAdd && (
        <div
          style={{
            background: "white",
            padding: 25,
            borderRadius: 20,
            marginBottom: 30,
            boxShadow: "0 10px 30px rgba(0,0,0,.08)",
          }}
        >
          <input
            placeholder="Name"
            value={newItem.name}
            onChange={(e) =>
              setNewItem({ ...newItem, name: e.target.value })
            }
          />
          <br />
          <br />
          <select
            value={newItem.category}
            onChange={(e) =>
              setNewItem({
                ...newItem,
                category: e.target.value,
              })
            }
          >
            <option>Coffee</option>
            <option>Non-Coffee</option>
            <option>Food</option>
          </select>
          <br />
          <br />

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
          />

          <br />
          <br />

          <textarea
            placeholder="Description"
            value={newItem.desc}
            onChange={(e) =>
              setNewItem({
                ...newItem,
                desc: e.target.value,
              })
            }
          />

          <br />
          <br />

          <input
            placeholder="Emoji (optional)"
            value={newItem.emoji}
            onChange={(e) =>
              setNewItem({
                ...newItem,
                emoji: e.target.value,
              })
            }
          />

          <br />
          <br />

          <input
            placeholder="Cloudinary Image URL"
            value={newItem.img}
            onChange={(e) =>
              setNewItem({
                ...newItem,
                img: e.target.value,
              })
            }
          />

          <br />
          <br />

          <h3
            style={{
              marginTop: 30,
              marginBottom: 15,
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
              marginTop: 12,
              fontWeight: 600,
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
            />
            Featured Product
          </label>
          <br />
          <br />
          <h3
            style={{
              marginTop: 30,
              marginBottom: 15,
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

          <select
            value={newItem.prepTime}
            onChange={(e) =>
              setNewItem({
                ...newItem,
                prepTime: e.target.value,
              })
            }
          >
            <option>2–4 mins</option>
            <option>5–8 mins</option>
            <option>8–12 mins</option>
            <option>10–15 mins</option>
            <option>Ready to Serve</option>
          </select>
          <br />
          <br />

          <select
            value={newItem.servedAs}
            onChange={(e) =>
              setNewItem({
                ...newItem,
                servedAs: e.target.value,
              })
            }
          >
            <option>Hot</option>
            <option>Cold</option>
            <option>Hot / Cold</option>
            <option>Room Temperature</option>
          </select>
          <br />
          <br />

          <select
            value={newItem.dietType}
            onChange={(e) =>
              setNewItem({
                ...newItem,
                dietType: e.target.value,
              })
            }
          >
            <option>Vegetarian</option>
            <option>Vegan</option>
            <option>Non-Vegetarian</option>
          </select>
          <br />
          <br />

          <button onClick={addProduct}>Save Product</button>
        </div>
      )}

      <h2>Editing: {editing ? editing.name : "Nothing"}</h2>

      {editing && (
        <div
          style={{
            background: "#fff",
            padding: 25,
            borderRadius: 20,
            marginBottom: 30,
            boxShadow: "0 15px 40px rgba(0,0,0,.1)",
          }}
        >
          <h2>Edit Product</h2>
          <input
            placeholder="Name"
            value={editItem.name}
            onChange={(e) =>
              setEditItem({
                ...editItem,
                name: e.target.value,
              })
            }
          />

          <br />
          <br />

          <select
            value={editItem.category}
            onChange={(e) =>
              setEditItem({
                ...editItem,
                category: e.target.value,
              })
            }
          >
            <option>Coffee</option>
            <option>Non-Coffee</option>
            <option>Food</option>
          </select>

          <br />
          <br />

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
          />

          <br />
          <br />

          <textarea
            placeholder="Description"
            value={editItem.desc}
            onChange={(e) =>
              setEditItem({
                ...editItem,
                desc: e.target.value,
              })
            }
          />

          <br />
          <br />

          <input
            placeholder="Emoji"
            value={editItem.emoji}
            onChange={(e) =>
              setEditItem({
                ...editItem,
                emoji: e.target.value,
              })
            }
          />

          <br />
          <br />

          <input
            placeholder="Cloudinary URL"
            value={editItem.img}
            onChange={(e) =>
              setEditItem({
                ...editItem,
                img: e.target.value,
              })
            }
          />

          <br />
          <br />

          <h3
            style={{
              marginTop: 30,
              marginBottom: 15,
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
              marginTop: 12,
              fontWeight: 600,
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
            />
            Featured Product
          </label>

          <br />
          <br />

          <select
            value={editItem.prepTime}
            onChange={(e) =>
              setEditItem({
                ...editItem,
                prepTime: e.target.value,
              })
            }
          >
            <option>2–4 mins</option>
            <option>5–8 mins</option>
            <option>8–12 mins</option>
            <option>10–15 mins</option>
            <option>Ready to Serve</option>
          </select>
          <br />
          <br />
          <select
            value={editItem.servedAs}
            onChange={(e) =>
              setEditItem({
                ...editItem,
                servedAs: e.target.value,
              })
            }
          >
            <option>Hot</option>
            <option>Cold</option>
            <option>Hot / Cold</option>
            <option>Room Temperature</option>
          </select>
          <br />
          <br />
          <select
            value={editItem.dietType}
            onChange={(e) =>
              setEditItem({
                ...editItem,
                dietType: e.target.value,
              })
            }
          >
            <option>Vegetarian</option>
            <option>Vegan</option>
            <option>Non-Vegetarian</option>
          </select>
          <br />
          <br />
          <button
            onClick={updateProduct}
            style={{
              marginRight: 10,
            }}
          >
            💾 Save
          </button>
          <button onClick={() => setEditing(null)}>Cancel</button>
        </div>
      )}

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
              background: "white",
              borderRadius: 18,
              padding: 20,
              marginBottom: 20,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              boxShadow: "0 10px 30px rgba(0,0,0,.08)",
            }}
          >
            <div>
              <h3>{item.name}</h3>
              <p>{item.category}</p>
              <strong>₹{item.price}</strong>
            </div>
            <div
              style={{
                display: "flex",
                gap: 10,
              }}
            >
              <button
                onClick={() => {
                  alert("Edit clicked!");
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
                  background: "#C4956A",
                  color: "#fff",
                  border: "none",
                  padding: "10px 16px",
                  borderRadius: 10,
                  cursor: "pointer",
                }}
              >
                ✏ Edit
              </button>
              <button
                onClick={() => deleteProduct(item.firestoreId)}
                style={{
                  background: "#b3261e",
                  color: "white",
                  border: "none",
                  padding: "10px 16px",
                  borderRadius: 10,
                  cursor: "pointer",
                }}
              >
                🗑 Delete
              </button>
              <button
                onClick={() => toggleAvailability(item)}
                style={{
                  background: item.available === false ? "#777" : "#2E7D32",
                  color: "#fff",
                  border: "none",
                  padding: "10px 16px",
                  borderRadius: 10,
                  cursor: "pointer",
                }}
              >
                {item.available === false ? "🚫 Out of Stock" : "✅ In Stock"}
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}
