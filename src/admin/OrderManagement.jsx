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

export default function OrderManagement({ setPage, setActivePage }) {
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
  const [specialRequests, setSpecialRequests] = useState([]);
  const [newRequest, setNewRequest] = useState("");
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
    specialInstructions: true,
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
    specialInstructions: true,
  });

  useEffect(() => {
    loadMenu();

    // Orders listener
    const unsubscribe = onSnapshot(
      collection(db, "orders"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setOrders(data);
        setOrderLoading(false);

        if (data.length > 0) {
          const newest = [...data].sort(
            (a, b) =>
              (b.createdAt?.seconds || 0) -
              (a.createdAt?.seconds || 0)
          )[0];

          if (
            lastOrderId.current &&
            newest.id !== lastOrderId.current
          ) {
            setNotifications((prev) => [
              {
                id: newest.id,
                text: `🛎️ New order from ${newest.customer?.name}`,
              },
              ...prev,
            ]);
          }

          lastOrderId.current = newest.id;
        }
      },
      (error) => {
        console.error("Orders listener error:", error);
        setOrderLoading(false);
      }
    );

    // User registration listener
    const unsubscribeUsers = onSnapshot(
      query(
        collection(db, "users"),
        orderBy("createdAt", "desc")
      ),
      (snapshot) => {
        if (snapshot.empty) return;

        const newest = snapshot.docs[0];
        const user = newest.data();

        if (
          lastUserId.current &&
          newest.id !== lastUserId.current
        ) {
          setUserNotifications((prev) => [
            {
              id: newest.id,
              text: `👤 ${user.name || "New user"} has joined Brewed`,
            },
            ...prev,
          ]);
        }

        lastUserId.current = newest.id;
      },
      (error) => {
        console.error("Users listener error:", error);
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

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const snapshot = await getDocs(
          collection(db, "specialRequests")
        );

        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setSpecialRequests(data);
      } catch (error) {
        console.error("Error fetching special requests:", error);
      }
    };

    fetchRequests();
  }, []);

  async function loadMenu() {
    try {
      const snapshot = await getDocs(collection(db, "menu"));

      const items = snapshot.docs.map((doc) => ({
        ...doc.data(),
        firestoreId: doc.id,
      }));

      setMenu(items);
    } catch (error) {
      console.error("Error loading menu:", error);
    } finally {
      setLoading(false);
    }
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
      specialInstructions: newItem.specialInstructions,
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
    await updateDoc(
      doc(db, "menu", item.firestoreId),
      {
        available: item.available === false ? true : false,
      }
    );

    loadMenu();
  }
  
  async function updateProduct() {
    if (!editing) return;

    alert("Document ID = " + editing.firestoreId);

    try {
      await updateDoc(
        doc(db, "menu", editing.firestoreId),
        {
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
          specialInstructions: editItem.specialInstructions,
          prepTime: editItem.prepTime,
          servedAs: editItem.servedAs,
          dietType: editItem.dietType,
        }
      );

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

    await updateDoc(
      doc(db, "orders", id),
      {
        status,
      }
    );
  }

  const defaultSpecialRequests = [
    "Less Ice",
    "Extra Hot",
    "No Sugar",
    "Extra Shot",
    "Less Foam",
    "Extra Caramel",
  ];

  const createSpecialRequests = async () => {
    try {
      for (const request of defaultSpecialRequests) {
        await addDoc(
          collection(db, "specialRequests"),
          {
            name: request,
            active: true,
            order: defaultSpecialRequests.indexOf(request) + 1,
          }
        );
      }

      alert("Special requests added!");
    } catch (error) {
      console.log(error);
    }
  };

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

  const addSpecialRequest = async () => {
    if (!newRequest.trim()) return;

    await addDoc(
      collection(db, "specialRequests"),
      {
        name: newRequest,
        active: true,
        order: specialRequests.length + 1,
      }
    );

    setNewRequest("");
  };

  // Safety fallback: If loading takes more than 3 seconds, force it to render anyway
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) setLoading(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [loading]);

  if (loading) {
    return (
      <div style={{ padding: 100 }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      {orderLoading ? (
        <p>Loading orders...</p>
      ) : (
        <>
          <h1
            style={{
              marginBottom: 10,
              fontFamily: "Playfair Display",
            }}
          >
            📦 Orders ({orders.length})
          </h1>

          <input
            type="text"
            placeholder="🔍 Search orders..."
            value={orderSearch}
            onChange={(e) => setOrderSearch(e.target.value)}
            style={{
              width: "100%",
              maxWidth: 450,
              padding: "14px 18px",
              borderRadius: 14,
              border: "1px solid #ddd",
              fontSize: 16,
              marginBottom: 20,
              outline: "none",
              background: "#fff",
            }}
          />

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginBottom: 30,
            }}
          >
            {["All", "New", "Preparing", "Ready", "Delivered", "Cancelled"].map((status) => (
              <button
                key={status}
                onClick={() => setOrderFilter(status)}
                style={{
                  padding: "10px 18px",
                  borderRadius: 999,
                  border: "none",
                  cursor: "pointer",
                  background:
                    orderFilter === status
                    ? "#3B1A08"
                    : "#F2ECE5",
                  color:
                    orderFilter === status
                    ? "white"
                    : "#3B1A08",
                  fontWeight: 600,
                }}
              >
                {status}
              </button>
            ))}
          </div>

          {orders.length === 0 ? (
            <p>No orders yet.</p>
          ) : (
            orders
              .sort((a, b) =>
                (b.createdAt?.seconds || 0) -
                (a.createdAt?.seconds || 0)
              )
              .filter((order) => {
                const matchesStatus =
                  orderFilter === "All" ||
                  order.status === orderFilter;

                const searchText = orderSearch.toLowerCase();

                const matchesSearch =
                  order.customer?.name
                    ?.toLowerCase()
                    .includes(searchText) ||
                  order.id.toLowerCase().includes(searchText);

                return matchesStatus && matchesSearch;
              })
              .map((order) => (
                <div
                  key={order.id}
                  style={{
                    background: "#fff",
                    borderRadius: 20,
                    padding: 25,
                    marginBottom: 20,
                    boxShadow: "0 10px 30px rgba(0,0,0,.08)",
                  }}
                >
                  <p
                    style={{
                      color: "#70645C",
                      fontSize: 14,
                    }}
                  >
                    Placed:{" "}
                    {order.createdAt?.toDate
                      ? order.createdAt.toDate().toLocaleString()
                      : "Just now"}
                  </p>

                  <p>
                    <strong>Customer:</strong> {order.customer?.name}
                  </p>

                  <p>
                    <strong>Phone:</strong> {order.customer?.phone}
                  </p>

                  <p>
                    <strong>Address:</strong> {order.customer?.address}
                  </p>

                  {order.customer?.instructions && (
                    <p>
                      <strong>Instructions:</strong>{" "}
                      {order.customer.instructions}
                    </p>
                  )}

                  <p>
                    <strong>Payment:</strong>{" "}
                    <span
                      style={{
                        background:
                          order.paymentMethod === "COD"
                          ? "#FFF3CD"
                          : "#D4EDDA",
                        padding: "5px 10px",
                        borderRadius: 999,
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      {order.paymentMethod}
                    </span>
                  </p>

                  <h3>Items</h3>

                  {order.items?.map((item, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        gap: 15,
                        padding: "15px 0",
                        borderBottom: "1px solid #eee",
                      }}
                    >
                      {item.img && (
                        <img
                          src={item.img}
                          alt={item.name}
                          style={{
                            width: 80,
                            height: 80,
                            borderRadius: 14,
                            objectFit: "cover",
                          }}
                        />
                      )}

                      <div>
                        <h3
                          style={{
                            margin: "0 0 8px",
                            fontFamily: "Playfair Display",
                          }}
                        >
                          ☕ {item.name}
                        </h3>

                        <p style={{ margin: 0 }}>
                          <strong>
                            {item.qty || item.quantity || 1} ×
                          </strong>{" "}
                          ₹{item.price}
                        </p>

                        <p
                          style={{
                            marginTop: 8,
                            fontSize: 14,
                            color: "#70645C",
                          }}
                        >
                          {item.size && (
                            <>
                              Size: {item.size}
                              <br />
                            </>
                          )}

                          {item.milk && (
                            <>
                              Milk: {item.milk}
                              <br />
                            </>
                          )}

                          {item.toppings?.length > 0 && (
                            <>
                              Toppings:{" "}
                              {item.toppings
                                .map((t) =>
                                  typeof t === "string" ? t : t.name
                                )
                                .join(", ")}
                              <br />
                            </>
                          )}

                          {item.temperature && (
                            <>
                              Temperature: {item.temperature}
                              <br />
                            </>
                          )}

                          {item.iceLevel && (
                            <>
                              Ice: {item.iceLevel}
                              <br />
                            </>
                          )}

                          {item.sweetness !== undefined && (
                            <>
                              Sweetness: {item.sweetness}%
                              <br />
                            </>
                          )}

                          {item.instructions && (
                            <>Note: {item.instructions}</>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}

                  <div
                    style={{
                      background: "#F8F3ED",
                      padding: 15,
                      borderRadius: 12,
                      marginTop: 20,
                    }}
                  >
                    <p>Subtotal: ₹{order.subtotal}</p>
                    <p>Tax: ₹{order.tax}</p>
                    <p>Delivery: ₹{order.delivery}</p>
                    <hr />
                    <h3>Total: ₹{order.total}</h3>
                  </div>

                  <p>
                    Status:{" "}
                    <strong>{order.status}</strong>
                  </p>

                  {order.status === "New" && (
                    <button
                      onClick={() => updateOrderStatus(order.id, "Preparing")}
                      style={{
                        background: "#C4956A",
                        color: "white",
                        border: "none",
                        padding: "10px 16px",
                        borderRadius: 10,
                        cursor: "pointer",
                      }}
                    >
                      ✅ Accept Order
                    </button>
                  )}

                  {order.status === "Preparing" && (
                    <button onClick={() => updateOrderStatus(order.id, "Ready")}>
                      ☕ Ready
                    </button>
                  )}

                  {order.status === "Ready" && (
                    <button onClick={() => updateOrderStatus(order.id, "Delivered")}>
                      🚚 Delivered
                    </button>
                  )}

                  {order.status !== "Delivered" &&
                    order.status !== "Cancelled" && (
                      <button
                        onClick={() => updateOrderStatus(order.id, "Cancelled")}
                        style={{
                          background: "#DE6B48",
                          color: "white",
                          border: "none",
                          padding: "10px 16px",
                          borderRadius: 10,
                          cursor: "pointer",
                        }}
                      >
                        ❌ Cancel
                      </button>
                    )}
                </div>
              ))
          )}
        </>
      )}
    </div>
  );
}
