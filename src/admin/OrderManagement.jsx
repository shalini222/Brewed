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

  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

export default function OrderManagement({ setPage, setActivePage }) {
  
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

  

  useEffect(() => {
    

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

  

  // Safety fallback: If loading takes more than 3 seconds, force it to render anyway
             
        return (
    <div style={{ padding: "30px 20px", background: "#F7F4EF", minHeight: "100vh" }}>
      {orderLoading ? (
        <p style={{ textAlign: "center", color: "#70645C", fontSize: 16 }}>Loading orders...</p>
      ) : (
        <>
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <h1
              style={{
                marginBottom: 16,
                fontFamily: "Playfair Display",
                fontSize: 28,
                color: "#3B1A08",
              }}
            >
              📦 Orders ({orders.length})
            </h1>

            <input
              type="text"
              placeholder="🔍 Search by customer name or order ID..."
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "16px 20px",
                borderRadius: 16,
                border: "1px solid #E6DDD5",
                fontSize: 16,
                marginBottom: 24,
                outline: "none",
                background: "#FFFFFF",
                boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
                color: "#3B1A08",
              }}
            />

            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 32,
              }}
            >
              {["All", "New", "Preparing", "Ready", "Delivered", "Cancelled"].map((status) => (
                <button
                  key={status}
                  onClick={() => setOrderFilter(status)}
                  style={{
                    padding: "12px 22px",
                    borderRadius: 999,
                    border: "none",
                    cursor: "pointer",
                    background:
                      orderFilter === status
                      ? "#3B1A08"
                      : "#FFFFFF",
                    color:
                      orderFilter === status
                      ? "white"
                      : "#3B1A08",
                    fontWeight: 600,
                    fontSize: 14,
                    boxShadow: orderFilter === status ? "0 4px 12px rgba(59,26,8,0.2)" : "0 2px 6px rgba(0,0,0,0.04)",
                    transition: "all 0.2s ease",
                  }}
                >
                  {status}
                </button>
              ))}
            </div>

            {orders.length === 0 ? (
              <p style={{ textAlign: "center", color: "#70645C", padding: 40 }}>No orders yet.</p>
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
                .map((order) => {
                  const getStatusColor = (status) => {
                    switch (status) {
                      case "New": return { bg: "#FFF3CD", color: "#856404" };
                      case "Preparing": return { bg: "#FFE5D0", color: "#A04000" };
                      case "Ready": return { bg: "#D1ECF1", color: "#0C5460" };
                      case "Delivered": return { bg: "#D4EDDA", color: "#155724" };
                      case "Cancelled": return { bg: "#F8D7DA", color: "#721C24" };
                      default: return { bg: "#E2E3E5", color: "#383D41" };
                    }
                  };
                  const statusStyle = getStatusColor(order.status);

                  return (
                    <div
                      key={order.id}
                      style={{
                        background: "#FFFFFF",
                        borderRadius: 24,
                        padding: 28,
                        marginBottom: 24,
                        border: "1px solid #EEE6DD",
                        boxShadow: "0 8px 24px rgba(0,0,0,.06)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                        <div>
                          <span style={{ fontSize: 13, color: "#9E8E85", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            Order #{order.id.slice(0, 8)}
                          </span>
                          <p style={{ color: "#70645C", fontSize: 13, marginTop: 4 }}>
                            {order.createdAt?.toDate
                              ? order.createdAt.toDate().toLocaleString()
                              : "Just now"}
                          </p>
                        </div>

                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <span
                            style={{
                              background: statusStyle.bg,
                              color: statusStyle.color,
                              padding: "6px 14px",
                              borderRadius: 999,
                              fontSize: 13,
                              fontWeight: 700,
                            }}
                          >
                            {order.status}
                          </span>
                          <span
                            style={{
                              background: order.paymentMethod === "COD" ? "#FFF9E6" : "#E8F5E9",
                              color: order.paymentMethod === "COD" ? "#8A6D3B" : "#2E7D32",
                              padding: "6px 14px",
                              borderRadius: 999,
                              fontSize: 13,
                              fontWeight: 700,
                            }}
                          >
                            {order.paymentMethod}
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          background: "#FCF8F3",
                          borderRadius: 16,
                          padding: 18,
                          marginBottom: 24,
                          border: "1px solid #F2ECE5",
                        }}
                      >
                        <p style={{ margin: "0 0 6px", fontSize: 15, color: "#3B1A08" }}>
                          👤 <strong>{order.customer?.name}</strong>
                        </p>
                        <p style={{ margin: "0 0 6px", fontSize: 14, color: "#5C4F47" }}>
                          📞 {order.customer?.phone}
                        </p>
                        <p style={{ margin: "0 0 6px", fontSize: 14, color: "#5C4F47" }}>
                          📍 {order.customer?.address}
                        </p>
                        {order.customer?.instructions && (
                          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#8C7B70", fontStyle: "italic" }}>
                            💬 Note: {order.customer.instructions}
                          </p>
                        )}
                      </div>

                      <h3 style={{ fontSize: 16, color: "#3B1A08", marginBottom: 16, fontFamily: "Playfair Display" }}>Items</h3>

                      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
                        {order.items?.map((item, index) => (
                          <div
                            key={index}
                            style={{
                              display: "flex",
                              gap: 16,
                              paddingBottom: 16,
                              borderBottom: index === order.items.length - 1 ? "none" : "1px solid #F2ECE5",
                              alignItems: "center",
                            }}
                          >
                            {item.img && (
                              <img
                                src={item.img}
                                alt={item.name}
                                style={{
                                  width: 70,
                                  height: 70,
                                  borderRadius: 12,
                                  objectFit: "cover",
                                  flexShrink: 0,
                                }}
                              />
                            )}

                            <div style={{ flex: 1 }}>
                              <h4
                                style={{
                                  margin: "0 0 4px",
                                  fontFamily: "Playfair Display",
                                  fontSize: 16,
                                  color: "#3B1A08",
                                }}
                              >
                                ☕ {item.name}
                              </h4>

                              <p style={{ margin: "0 0 6px", fontSize: 14, color: "#70645C" }}>
                                <strong>{item.qty || item.quantity || 1}</strong> × ₹{item.price}
                              </p>

                              {item.size && (
                                <span style={{ fontSize: 12, background: "#F2ECE5", padding: "2px 8px", borderRadius: 6, color: "#5C4F47", marginRight: 6 }}>
                                  Size: {item.size}
                                </span>
                              )}
                              {item.milk && (
                                <span style={{ fontSize: 12, background: "#F2ECE5", padding: "2px 8px", borderRadius: 6, color: "#5C4F47", marginRight: 6 }}>
                                  Milk: {item.milk}
                                </span>
                              )}
                            </div>
                            
                            <div style={{ fontWeight: 600, color: "#3B1A08", fontSize: 15 }}>
                              ₹{(item.qty || item.quantity || 1) * item.price}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div
                        style={{
                          background: "#F8F3ED",
                          padding: 20,
                          borderRadius: 16,
                          marginBottom: 24,
                          fontSize: 14,
                          color: "#5C4F47",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                          <span>Subtotal</span>
                          <span>₹{order.subtotal}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                          <span>Tax</span>
                          <span>₹{order.tax}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                          <span>Delivery Fee</span>
                          <span>₹{order.delivery}</span>
                        </div>
                        {order.walletUsed > 0 && (
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, color: "#C0392B" }}>
                            <span>Wallet Used</span>
                            <span>-₹{order.walletUsed}</span>
                          </div>
                        )}
                        <hr style={{ border: "none", borderTop: "1px solid #E6DDD5", margin: "12px 0" }} />
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 16, fontWeight: 700, color: "#3B1A08" }}>Amount Paid</span>
                          <span style={{ fontSize: 18, fontWeight: 700, color: "#3B1A08" }}>₹{order.total}</span>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 12 }}>
                        {order.status === "New" && (
                          <button
                            onClick={() => updateOrderStatus(order.id, "Preparing")}
                            style={{
                              flex: 1,
                              background: "#3B1A08",
                              color: "white",
                              border: "none",
                              padding: "14px 20px",
                              borderRadius: 12,
                              cursor: "pointer",
                              fontWeight: 600,
                              fontSize: 15,
                              boxShadow: "0 4px 12px rgba(59,26,8,0.2)",
                            }}
                          >
                            🟤 Accept Order
                          </button>
                        )}

                        {order.status === "Preparing" && (
                          <button
                            onClick={() => updateOrderStatus(order.id, "Ready")}
                            style={{
                              flex: 1,
                              background: "#3B1A08",
                              color: "white",
                              border: "none",
                              padding: "14px 20px",
                              borderRadius: 12,
                              cursor: "pointer",
                              fontWeight: 600,
                              fontSize: 15,
                            }}
                          >
                            ☕ Mark Ready
                          </button>
                        )}

                        {order.status === "Ready" && (
                          <button
                            onClick={() => updateOrderStatus(order.id, "Delivered")}
                            style={{
                              flex: 1,
                              background: "#27AE60",
                              color: "white",
                              border: "none",
                              padding: "14px 20px",
                              borderRadius: 12,
                              cursor: "pointer",
                              fontWeight: 600,
                              fontSize: 15,
                            }}
                          >
                            🚚 Mark Delivered
                          </button>
                        )}

                        {order.status !== "Delivered" &&
                          order.status !== "Cancelled" && (
                            <button
                              onClick={() => updateOrderStatus(order.id, "Cancelled")}
                              style={{
                                flex: 1,
                                background: "#FFFFFF",
                                color: "#C0392B",
                                border: "1px solid #F5C6CB",
                                padding: "14px 20px",
                                borderRadius: 12,
                                cursor: "pointer",
                                fontWeight: 600,
                                fontSize: 15,
                              }}
                            >
                              ❌ Cancel Order
                            </button>
                          )}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </>
      )}
    </div>
  );
}
