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
  <div style={{ padding: 20 }}>
    <h1>Orders</h1>
    <p>Loading: {String(orderLoading)}</p>
    <p>Total Orders: {orders.length}</p>
  </div>
);
    
}
