import { useEffect, useState, useRef } from "react";
import {
  collection,
  getDocs,
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

export default function AdminDashboard({
  setPage,
  setActivePage,
}) {

  /* ===========================================
     STATE
  =========================================== */

  const [loading, setLoading] = useState(true);

  const [menu, setMenu] = useState([]);

  const [orders, setOrders] = useState([]);

  const [analytics, setAnalytics] = useState([]);

  const [topProducts, setTopProducts] = useState([]);

  const [range, setRange] = useState(7);

  const [notifications, setNotifications] =
    useState([]);

  const [userNotifications, setUserNotifications] =
    useState([]);

  const [showNotifications, setShowNotifications] =
    useState(false);



  /* ===========================================
     REFS
  =========================================== */

  const lastOrderId = useRef(null);

  const lastUserId = useRef(null);



  /* ===========================================
     LOAD MENU
  =========================================== */

  async function loadMenu() {
    try {

      const snapshot = await getDocs(
        collection(db, "menu")
      );

      const items = snapshot.docs.map((doc) => ({
        firestoreId: doc.id,
        ...doc.data(),
      }));

      setMenu(items);

    } catch (err) {

      console.error(
        "Failed to load menu:",
        err
      );

    } finally {

      setLoading(false);

    }
  }


  /* ===========================================
   FIREBASE LISTENERS
=========================================== */

useEffect(() => {
  loadMenu();

  // -----------------------------------------
  // Orders Listener
  // -----------------------------------------

  const unsubscribeOrders = onSnapshot(
    collection(db, "orders"),
    (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setOrders(data);

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
              text: `🛎️ New order from ${
                newest.customer?.name || "Customer"
              }`,
            },
            ...prev,
          ]);
        }

        lastOrderId.current = newest.id;
      }
    }
  );

  // -----------------------------------------
  // Users Listener
  // -----------------------------------------

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
            text: `👤 ${
              user.name || "New user"
            } has joined Brewed`,
          },
          ...prev,
        ]);
      }

      lastUserId.current = newest.id;
    }
  );

 /* ===========================================
     LOADING
  =========================================== */

 

  return () => {
    unsubscribeOrders();
    unsubscribeUsers();
  };
}, []);


/* ===========================================
   SALES ANALYTICS
=========================================== */

useEffect(() => {
  const today = new Date();

  const data = [];

  for (let i = range - 1; i >= 0; i--) {
    const date = new Date(today);

    date.setDate(today.getDate() - i);

    data.push({
      key: date.toDateString(),
      day: date.toLocaleDateString(
        "en-US",
        {
          weekday: "short",
        }
      ),
      revenue: 0,
      orders: 0,
    });
  }

  orders.forEach((order) => {
    if (!order.createdAt?.toDate) return;

    const orderDate =
      order.createdAt
        .toDate()
        .toDateString();

    const item = data.find(
      (d) => d.key === orderDate
    );

    if (!item) return;

    item.orders += 1;
    item.revenue += Number(
      order.total || 0
    );
  });

  setAnalytics(data);

}, [orders, range]);


/* ===========================================
   TOP SELLING PRODUCTS
=========================================== */

useEffect(() => {
  const stats = {};

  orders.forEach((order) => {
    order.items?.forEach((item) => {

      if (!stats[item.name]) {
        stats[item.name] = {
          name: item.name,
          img: item.img || "",
          sold: 0,
          revenue: 0,
        };
      }

      const qty =
        item.qty ||
        item.quantity ||
        1;

      stats[item.name].sold += qty;

      stats[item.name].revenue +=
        qty *
        Number(item.price || 0);
    });
  });

  const ranked = Object.values(stats)
    .sort(
      (a, b) => b.sold - a.sold
    )
    .slice(0, 3);

  setTopProducts(ranked);

}, [orders]);

/* ===========================================
   DASHBOARD METRICS
=========================================== */

const totalOrders = orders.length;

const pendingOrders = orders.filter(
  (order) =>
    order.status === "New" ||
    order.status === "Preparing" ||
    order.status === "Ready"
).length;

const completedOrders = orders.filter(
  (order) => order.status === "Delivered"
).length;

const cancelledOrders = orders.filter(
  (order) => order.status === "Cancelled"
).length;

const totalRevenue = orders
  .filter((order) => order.status === "Delivered")
  .reduce(
    (sum, order) =>
      sum + Number(order.total || 0),
    0
  );

const totalProducts = menu.length;

const availableProducts = menu.filter(
  (item) => item.available !== false
).length;

const unavailableProducts = menu.filter(
  (item) => item.available === false
).length;


/* ===========================================
   TODAY'S METRICS
=========================================== */

const today = new Date().toDateString();

const todayOrdersList = orders.filter(
  (order) =>
    order.createdAt?.toDate &&
    order.createdAt
      .toDate()
      .toDateString() === today
);

const todayOrders = todayOrdersList.filter(
  (order) => order.status !== "Cancelled"
).length;

const todaySales = todayOrdersList
  .filter(
    (order) => order.status !== "Cancelled"
  )
  .reduce(
    (sum, order) =>
      sum + Number(order.total || 0),
    0
  );


/* ===========================================
   NOTIFICATIONS
=========================================== */

const totalNotifications =
  notifications.length +
  userNotifications.length;


/* ===========================================
   QUICK STATS
=========================================== */

const dashboardCards = [
  {
    icon: "📦",
    title: "Orders",
    value: totalOrders,
    color: "#4F46E5",
  },
  {
    icon: "💰",
    title: "Revenue",
    value: `₹${totalRevenue}`,
    color: "#2E7D32",
  },
  {
    icon: "⏳",
    title: "Pending",
    value: pendingOrders,
    color: "#E67E22",
  },
  {
    icon: "☕",
    title: "Products",
    value: totalProducts,
    color: "#C4956A",
  },
];






    if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#FDFAF5",
          fontFamily: "Inter",
          fontSize: 18,
        }}
      >
        Loading Admin Dashboard...
      </div>
    );
    }

  /* ===========================================
   RENDER
=========================================== */

return (
  <div
    style={{
      minHeight: "100vh",
      background: "#FDFAF5",
      padding: "100px 30px",
    }}
  >

    {/* ===========================================
        HEADER
    =========================================== */}

    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 20,
        marginBottom: 35,
      }}
    >
      <div>

        <button
          onClick={() => setPage("menu")}
          style={{
            marginBottom: 18,
          }}
        >
          ← Back
        </button>

        <h1
          style={{
            margin: 0,
            fontFamily: "Playfair Display",
            fontSize: 40,
          }}
        >
          Brewed Admin Dashboard
        </h1>

        <p
          style={{
            marginTop: 8,
            color: "#7A6E66",
          }}
        >
          Monitor your café in real time.
        </p>

      </div>

      <button
        onClick={() =>
          setShowNotifications(
            !showNotifications
          )
        }
        style={{
          padding: "12px 20px",
          border: "none",
          borderRadius: 14,
          background: "#fff",
          cursor: "pointer",
          fontSize: 18,
          boxShadow:
            "0 8px 20px rgba(0,0,0,.08)",
        }}
      >
        🔔 {totalNotifications}
      </button>
    </div>



    {/* ===========================================
        NOTIFICATIONS
    =========================================== */}

    {showNotifications &&
      totalNotifications > 0 && (

      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: 24,
          marginBottom: 35,
          boxShadow:
            "0 10px 30px rgba(0,0,0,.08)",
        }}
      >

        <h3
          style={{
            marginTop: 0,
            fontFamily:
              "Playfair Display",
          }}
        >
          Notifications
        </h3>

        {[...userNotifications, ...notifications]
          .map((notification) => (

            <div
              key={notification.id}
              style={{
                padding: "12px 0",
                borderBottom:
                  "1px solid #eee",
              }}
            >
              {notification.text}
            </div>

          ))}

      </div>

    )}



    {/* ===========================================
        QUICK ACTIONS
    =========================================== */}

    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(auto-fit,minmax(180px,1fr))",
        gap: 18,
        marginBottom: 35,
      }}
    >

      {[
        {
          title: "🍽 Menu",
          page: "menuadmin",
        },
        {
          title: "📦 Orders",
          page: "ordersadmin",
        },
        {
          title: "👥 Customers",
          page: "customersadmin",
        },
        {
          title: "🎟 Coupons",
          page: "couponsadmin",
        },
        {
          title: "🔔 Notifications",
          page: "notificationsadmin",
        },
        {
          title: "⚙ Settings",
          page: "settingsadmin",
        },
      ].map((item) => (

        <button
          key={item.title}
          onClick={() => setActivePage(item.page)}
          style={{
            padding: 20,
            background: "#fff",
            border: "none",
            borderRadius: 18,
            cursor: "pointer",
            fontSize: 16,
            fontWeight: 600,
            boxShadow:
              "0 10px 25px rgba(0,0,0,.08)",
          }}
        >
          {item.title}
        </button>

      ))}

    </div>



    {/* ===========================================
        DASHBOARD CARDS
    =========================================== */}

    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(auto-fit,minmax(220px,1fr))",
        gap: 20,
        marginBottom: 40,
      }}
    >

      {dashboardCards.map((card) => (

        <div
          key={card.title}
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: 24,
            boxShadow:
              "0 10px 25px rgba(0,0,0,.08)",
          }}
        >

          <div
            style={{
              fontSize: 36,
              marginBottom: 12,
            }}
          >
            {card.icon}
          </div>

          <div
            style={{
              color: "#70645C",
              fontSize: 15,
            }}
          >
            {card.title}
          </div>

          <h2
            style={{
              margin: "8px 0 0",
              color: card.color,
              fontFamily:
                "Playfair Display",
              fontSize: 32,
            }}
          >
            {card.value}
          </h2>

        </div>

      ))}

    </div>
        {/* ===========================================
        SALES ANALYTICS
    =========================================== */}

    <div
      style={{
        background: "#fff",
        borderRadius: 24,
        padding: 30,
        marginBottom: 40,
        boxShadow: "0 15px 40px rgba(0,0,0,.08)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 20,
          marginBottom: 30,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontFamily: "Playfair Display",
            }}
          >
            📈 Sales Analytics
          </h2>

          <p
            style={{
              marginTop: 8,
              color: "#8A7D73",
            }}
          >
            Revenue & order performance
          </p>
        </div>

        <select
          value={range}
          onChange={(e) =>
            setRange(Number(e.target.value))
          }
          style={{
            padding: "12px 18px",
            borderRadius: 12,
            border: "1px solid #ddd",
            background: "#fff",
          }}
        >
          <option value={7}>
            Last 7 Days
          </option>

          <option value={30}>
            Last 30 Days
          </option>
        </select>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(420px,1fr))",
          gap: 25,
        }}
      >

        {/* ===========================================
            REVENUE CHART
        =========================================== */}

        <div
          style={{
            background: "#FAF7F3",
            borderRadius: 18,
            padding: 20,
          }}
        >
          <h3
            style={{
              marginTop: 0,
              marginBottom: 18,
              fontFamily: "Playfair Display",
            }}
          >
            💰 Revenue
          </h3>

          <ResponsiveContainer
            width="100%"
            height={300}
          >
            <LineChart data={analytics}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="day" />

              <YAxis />

              <Tooltip />

              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#C4956A"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* ===========================================
            ORDERS CHART
        =========================================== */}

        <div
          style={{
            background: "#FAF7F3",
            borderRadius: 18,
            padding: 20,
          }}
        >
          <h3
            style={{
              marginTop: 0,
              marginBottom: 18,
              fontFamily: "Playfair Display",
            }}
          >
            📦 Orders
          </h3>

          <ResponsiveContainer
            width="100%"
            height={300}
          >
            <BarChart data={analytics}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="day" />

              <YAxis />

              <Tooltip />

              <Bar
                dataKey="orders"
                fill="#C4956A"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* ===========================================
          ANALYTICS SUMMARY
      =========================================== */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(180px,1fr))",
          gap: 18,
          marginTop: 30,
        }}
      >
        <div
          style={{
            background: "#FAF7F3",
            borderRadius: 16,
            padding: 18,
          }}
        >
          <div style={{ color: "#777" }}>
            Today's Revenue
          </div>

          <h2
            style={{
              color: "#C4956A",
              margin: "8px 0 0",
              fontFamily: "Playfair Display",
            }}
          >
            ₹{todaySales}
          </h2>
        </div>

        <div
          style={{
            background: "#FAF7F3",
            borderRadius: 16,
            padding: 18,
          }}
        >
          <div style={{ color: "#777" }}>
            Today's Orders
          </div>

          <h2
            style={{
              margin: "8px 0 0",
              fontFamily: "Playfair Display",
            }}
          >
            {todayOrders}
          </h2>
        </div>

        <div
          style={{
            background: "#FAF7F3",
            borderRadius: 16,
            padding: 18,
          }}
        >
          <div style={{ color: "#777" }}>
            Completed Orders
          </div>

          <h2
            style={{
              margin: "8px 0 0",
              color: "#2E7D32",
              fontFamily: "Playfair Display",
            }}
          >
            {completedOrders}
          </h2>
        </div>

        <div
          style={{
            background: "#FAF7F3",
            borderRadius: 16,
            padding: 18,
          }}
        >
          <div style={{ color: "#777" }}>
            Cancelled Orders
          </div>

          <h2
            style={{
              margin: "8px 0 0",
              color: "#D32F2F",
              fontFamily: "Playfair Display",
            }}
          >
            {cancelledOrders}
          </h2>
        </div>
      </div>
    </div>

        {/* ===========================================
        TOP SELLING PRODUCTS
    =========================================== */}

    <div
      style={{
        background: "#fff",
        borderRadius: 24,
        padding: 30,
        marginBottom: 35,
        boxShadow: "0 15px 40px rgba(0,0,0,.08)",
      }}
    >
      <h2
        style={{
          marginTop: 0,
          marginBottom: 25,
          fontFamily: "Playfair Display",
        }}
      >
        🏆 Top Selling Products
      </h2>

      {topProducts.length === 0 ? (
        <p
          style={{
            color: "#777",
          }}
        >
          No products sold yet.
        </p>
      ) : (
        topProducts.map((product) => (
          <div
            key={product.name}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "18px 0",
              borderBottom: "1px solid #eee",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              {product.img ? (
                <img
                  src={product.img}
                  alt={product.name}
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 14,
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 14,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    background: "#FAF7F3",
                    fontSize: 28,
                  }}
                >
                  ☕
                </div>
              )}

              <div>
                <h3
                  style={{
                    margin: 0,
                  }}
                >
                  {product.name}
                </h3>

                <p
                  style={{
                    marginTop: 6,
                    color: "#777",
                  }}
                >
                  {product.sold} sold
                </p>
              </div>
            </div>

            <h3
              style={{
                color: "#C4956A",
                fontFamily: "Playfair Display",
              }}
            >
              ₹{product.revenue}
            </h3>
          </div>
        ))
      )}
    </div>


    {/* ===========================================
        LOWER DASHBOARD
    =========================================== */}

    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(auto-fit,minmax(340px,1fr))",
        gap: 25,
        marginBottom: 40,
      }}
    >

      {/* ===========================================
          LOW STOCK
      =========================================== */}

      <div
        style={{
          background: "#fff",
          borderRadius: 24,
          padding: 25,
          boxShadow: "0 10px 30px rgba(0,0,0,.08)",
        }}
      >
        <h2
          style={{
            marginTop: 0,
            fontFamily: "Playfair Display",
          }}
        >
          ⚠️ Stock Status
        </h2>

        {unavailableProducts === 0 ? (
          <p
            style={{
              color: "#2E7D32",
              fontWeight: 600,
            }}
          >
            ✅ Everything is currently available.
          </p>
        ) : (
          menu
            .filter(
              (item) =>
                item.available === false
            )
            .map((item) => (
              <div
                key={item.firestoreId}
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  padding: "12px 0",
                  borderBottom:
                    "1px solid #eee",
                }}
              >
                <span>{item.name}</span>

                <strong
                  style={{
                    color: "#D32F2F",
                  }}
                >
                  Out of Stock
                </strong>
              </div>
            ))
        )}
      </div>

      {/* ===========================================
          TODAY'S OVERVIEW
      =========================================== */}

      <div
        style={{
          background: "#fff",
          borderRadius: 24,
          padding: 25,
          boxShadow: "0 10px 30px rgba(0,0,0,.08)",
        }}
      >
        <h2
          style={{
            marginTop: 0,
            fontFamily: "Playfair Display",
          }}
        >
          ☀️ Today's Overview
        </h2>

        <div
          style={{
            marginTop: 25,
          }}
        >
          <p
            style={{
              color: "#777",
              marginBottom: 6,
            }}
          >
            Revenue
          </p>

          <h1
            style={{
              color: "#C4956A",
              margin: 0,
              fontFamily:
                "Playfair Display",
            }}
          >
            ₹{todaySales}
          </h1>
        </div>

        <div
          style={{
            marginTop: 30,
          }}
        >
          <p
            style={{
              color: "#777",
              marginBottom: 6,
            }}
          >
            Orders
          </p>

          <h2
            style={{
              margin: 0,
            }}
          >
            {todayOrders}
          </h2>
        </div>

        <div
          style={{
            marginTop: 30,
          }}
        >
          <p
            style={{
              color: "#777",
              marginBottom: 6,
            }}
          >
            Available Products
          </p>

          <h2
            style={{
              margin: 0,
              color: "#2E7D32",
            }}
          >
            {availableProducts}
          </h2>
        </div>
      </div>

    </div>

  </div>
);
}
    
  
