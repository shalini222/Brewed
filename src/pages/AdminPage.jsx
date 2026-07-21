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
      <div style={{ padding: 100 }}>
        Loading...
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
  customExtrasMaxSelection:
  Number(newItem.customExtrasMaxSelection),
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
  const confirmed = window.confirm(
    "Delete this product?"
  );

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
    customExtrasMaxSelection:
  Number(editItem.customExtrasMaxSelection),
    sweetnessOptions: editItem.sweetnessOptions,

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
  <div
    style={{
      minHeight: "100vh",
      background: "#FDFAF5",
      padding: "100px 30px",
    }}
  >
    <button onClick={() => setPage("menu")}>
      ← Back
    </button>

    <h1>Brewed Admin</h1>
  </div>
);
}
