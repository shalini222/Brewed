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

      <h1
        style={{
          fontFamily: "Playfair Display",
          marginTop: 20,
          marginBottom: 40,
        }}
      >
        Brewed Admin
      </h1>


<button
  onClick={() => setPage("couponsadmin")}
>
  🎟 Manage Coupons
</button>


      <button
  onClick={() => setPage("customersadmin")}
>
  🎟 Manage Customers
</button>

<button
  onClick={() => setPage("settingsAdmin")}
>
  🎟 Manage Settings
</button>



      
      
<div
  style={{
    display: "flex",
    justifyContent: "flex-end",
    marginBottom: 20,
  }}
>
  <button
  onClick={() => setShowNotifications(!showNotifications)}
  style={{
    border: "none",
    background: "#fff",
    borderRadius: 999,
    padding: "12px 18px",
    fontSize: 18,
    cursor: "pointer",
    boxShadow: "0 8px 20px rgba(0,0,0,.08)",
  }}
>
  🔔 {notifications.length + userNotifications.length}
</button>
</div>

{showNotifications &&
  (notifications.length > 0 ||
    userNotifications.length > 0) && (
  <div
    style={{
      background: "#fff",
      borderRadius: 20,
      padding: 20,
      marginBottom: 30,
      boxShadow: "0 10px 30px rgba(0,0,0,.08)",
    }}
  >
    <h3>Notifications</h3>

    {[...userNotifications, ...notifications].map((n) => (
      <p key={n.id} style={{ marginBottom: 10 }}>
        {n.text}
      </p>
    ))}
  </div>
)}
      

<div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
    gap: 20,
    marginBottom: 40,
  }}
>
  {[
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
  ].map((card) => (
    <div
      key={card.title}
      style={{
        background: "#fff",
        borderRadius: 20,
        padding: 24,
        boxShadow: "0 10px 25px rgba(0,0,0,.08)",
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
          fontFamily: "Playfair Display",
          fontSize: 32,
        }}
      >
        {card.value}
      </h2>
    </div>
  ))}
</div>

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
display:"flex",
justifyContent:"space-between",
alignItems:"center",
marginBottom:25
}}
>

<h2
style={{
fontFamily:"Playfair Display",
margin:0
}}
>
📈 Sales Analytics
</h2>

  
  <p
  style={{
    color: "#8A7D73",
    marginTop: 6,
    marginBottom: 25,
  }}
>
Revenue and order trends over time
</p>

<select
value={range}
onChange={(e)=>setRange(Number(e.target.value))}
style={{
padding:"10px 14px",
borderRadius:12,
border:"1px solid #ddd"
}}
>
<option value={7}>Last 7 Days</option>
<option value={30}>Last 30 Days</option>
</select>

</div>

<div
style={{
display:"grid",
gridTemplateColumns:"1fr 1fr",
gap:30
}}
>

<div>

<h3>Revenue</h3>

<div style={{width:"100%",height:300}}>

<ResponsiveContainer>

<LineChart data={analytics}>

<CartesianGrid
  stroke="#F0E8E0"
  strokeDasharray="4 4"
/>

<XAxis dataKey="day"/>

<YAxis/>

<Tooltip/>



<Line
  type="monotone"
  dataKey="revenue"
  stroke="#C4956A"
  strokeWidth={4}
  dot={{ r: 5 }}
  activeDot={{ r: 7 }}
/>


  
</LineChart>

</ResponsiveContainer>

</div>

</div>

<div>

<h3>Orders</h3>

<div style={{width:"100%",height:300}}>

<ResponsiveContainer>

<BarChart
  data={analytics}
  style={{ outline: "none" }}
>

<CartesianGrid strokeDasharray="3 3"/>

<XAxis dataKey="day"/>

<YAxis/>

<Tooltip/>

<Bar
  dataKey="orders"
  fill="#3B1A08"
  radius={[12, 12, 0, 0]}
/>

</BarChart>

</ResponsiveContainer>

</div>

</div>

</div>

</div>


<div
  style={{
    background: "#fff",
    borderRadius: 24,
    padding: 30,
    marginBottom: 40,
    boxShadow: "0 15px 40px rgba(0,0,0,.08)",
  }}
>
  <h2
    style={{
      fontFamily: "Playfair Display",
      marginBottom: 25,
    }}
  >
    🏆 Best Selling Products
  </h2>

  {topProducts.length === 0 ? (
    <p>No sales yet.</p>
  ) : (
    topProducts.map((product, index) => (
      <div
        key={product.name}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          padding: "18px 0",
          borderBottom:
            index !== topProducts.length - 1
              ? "1px solid #eee"
              : "none",
        }}
      >
        <div
          style={{
            fontSize: 34,
            width: 50,
            textAlign: "center",
          }}
        >
          {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
        </div>

        {product.img && (
          <img
            src={product.img}
            alt={product.name}
            style={{
              width: 70,
              height: 70,
              borderRadius: 16,
              objectFit: "cover",
            }}
          />
        )}

        <div style={{ flex: 1 }}>
          <h3
            style={{
              margin: 0,
              fontFamily: "Playfair Display",
            }}
          >
            {product.name}
          </h3>

          <p
            style={{
              margin: "6px 0",
              color: "#70645C",
            }}
          >
            {product.sold} sold
          </p>

          <div
            style={{
              height: 10,
              background: "#EFE5DB",
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${(product.sold / topProducts[0].sold) * 100}%`,
                height: "100%",
                background: "#C4956A",
              }}
            />
          </div>
        </div>

        <div
          style={{
            textAlign: "right",
          }}
        >
          <strong
            style={{
              fontSize: 20,
              color: "#2E7D32",
            }}
          >
            ₹{product.revenue}
          </strong>

          <p
            style={{
              margin: 0,
              color: "#70645C",
            }}
          >
            Revenue
          </p>
        </div>
      </div>
    ))
  )}
</div>

    <h2
  style={{
    marginTop: 40,
    marginBottom: 20,
    fontFamily: "Playfair Display",
  }}
>
  ⚡ Recent Activity
</h2>

<div
  style={{
    background: "#fff",
    borderRadius: 20,
    padding: 20,
    boxShadow: "0 10px 30px rgba(0,0,0,.08)",
  }}
>
  {orders
    .slice()
    .sort(
      (a, b) =>
        (b.createdAt?.seconds || 0) -
        (a.createdAt?.seconds || 0)
    )
    .slice(0, 5)
    .map((order) => (
      <div
        key={order.id}
        style={{
          padding: "14px 0",
          borderBottom: "1px solid #eee",
        }}
      >
        <strong>{order.customer?.name}</strong>

        <div
          style={{
            color: "#777",
            fontSize: 14,
            marginTop: 4,
          }}
        >
          {order.status} • ₹{order.total}
        </div>
      </div>
    ))}
</div>  
      <h2
  style={{
    marginTop: 40,
    marginBottom: 20,
    fontFamily: "Playfair Display",
  }}
>
  ⚠️ Low Stock / Out of Stock
</h2>

<div
  style={{
    background: "#fff",
    borderRadius: 20,
    padding: 20,
    boxShadow: "0 10px 30px rgba(0,0,0,.08)",
  }}
>
  {menu.filter(item => item.available === false).length === 0 ? (
    <p style={{ color: "#2E7D32", fontWeight: 600 }}>
      ✅ All products are currently available.
    </p>
  ) : (
    menu
      .filter(item => item.available === false)
      .map(item => (
        <div
          key={item.firestoreId}
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "12px 0",
            borderBottom: "1px solid #eee",
          }}
        >
          <span>{item.name}</span>

          <span
            style={{
              color: "#D32F2F",
              fontWeight: 700,
            }}
          >
            Out of Stock
          </span>
        </div>
      ))
  )}
</div>

<div
  style={{
    background: "#fff",
    borderRadius: 20,
    padding: 20,
    boxShadow: "0 10px 30px rgba(0,0,0,.08)",
  }}
>
  <h3>☀️ Today's Sales</h3>

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
      
<br /><br />
      
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

    <br /><br />

    

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

    <br /><br />

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

    <br /><br />

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

    <br /><br />

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

    <br /><br />

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

    <br /><br />

<h3
style={{
marginTop:30,
marginBottom:15
}}
>
Product Sizes
</h3>

<button
type="button"
onClick={()=>
setNewItem({
...newItem,
sizes:[
...newItem.sizes,
{
name:"",
volume:"",
price:0
}
]
})
}

style={{
padding:"10px 18px",
background:"#C4956A",
border:"none",
color:"#fff",
borderRadius:10,
cursor:"pointer",
marginBottom:20
}}
>
➕ Add Size
</button>


{newItem.sizes.map((size,index)=>(
<div
key={index}
style={{
display:"flex",
gap:10,
alignItems:"center",
marginBottom:12
}}
>

<input
placeholder="Size Name"
value={size.name}
onChange={(e)=>{

const updated=[...newItem.sizes];

updated[index].name=e.target.value;

setNewItem({
...newItem,
sizes:updated
});

}}
/>

<input
placeholder="Volume"

value={size.volume}

onChange={(e)=>{

const updated=[...newItem.sizes];

updated[index].volume=e.target.value;

setNewItem({

...newItem,

sizes:updated

});

}}
/>

<input
type="number"

placeholder="Price Difference"

value={size.price}

onChange={(e)=>{

const updated=[...newItem.sizes];

updated[index].price=Number(e.target.value);

setNewItem({

...newItem,

sizes:updated

});

}}
/>

<button
type="button"

onClick={()=>{

setNewItem({

...newItem,

sizes:newItem.sizes.filter((_,i)=>i!==index)

});

}}

style={{

background:"#D32F2F",

color:"#fff",

border:"none",

padding:"10px 14px",

borderRadius:8,

cursor:"pointer"

}}
>
🗑
</button>


  
</div>
))}




    



    

<label style={{
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
<br/><br/>
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

<br/><br/>

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


    <br/><br/>

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

    

    



    

<select
value={newItem.prepTime}
onChange={(e)=>
setNewItem({
...newItem,
prepTime:e.target.value
})
}
>

<option>2–4 mins</option>
<option>5–8 mins</option>
<option>8–12 mins</option>
<option>10–15 mins</option>
<option>Ready to Serve</option>

</select>

<br/><br/>

    <select
value={newItem.servedAs}
onChange={(e)=>
setNewItem({
...newItem,
servedAs:e.target.value
})
}
>

<option>Hot</option>
<option>Cold</option>
<option>Hot / Cold</option>
<option>Room Temperature</option>

</select>

    <br/><br/>

    <select
value={newItem.dietType}
onChange={(e)=>
setNewItem({
...newItem,
dietType:e.target.value
})
}
>

<option>Vegetarian</option>
<option>Vegan</option>
<option>Non-Vegetarian</option>

</select>

    

    

    <button onClick={addProduct}>
      Save Product
    </button>
  </div>
)}
     <h2>
  Editing: {editing ? editing.name : "Nothing"}
</h2>
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

    <br /><br />

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

    <br /><br />

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

    <br /><br />

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

    <br /><br />

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

    <br/><br/>

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

<h3
style={{
marginTop:30,
marginBottom:15
}}
>
Product Sizes
</h3>

<button
type="button"
onClick={()=>
setEditItem({
...editItem,
sizes:[
...editItem.sizes,
{
name:"",
volume:"",
price:0
}
]
})
}
style={{
padding:"10px 18px",
background:"#C4956A",
color:"#fff",
border:"none",
borderRadius:10,
cursor:"pointer",
marginBottom:20
}}
>
➕ Add Size
</button>

{editItem.sizes.map((size,index)=>(
<div
key={index}
style={{
display:"flex",
gap:10,
alignItems:"center",
marginBottom:12
}}
>

<input
placeholder="Size Name"
value={size.name}
onChange={(e)=>{
const updated=[...editItem.sizes];
updated[index].name=e.target.value;
setEditItem({
...editItem,
sizes:updated
});
}}
/>

<input
placeholder="Volume"
value={size.volume}
onChange={(e)=>{
const updated=[...editItem.sizes];
updated[index].volume=e.target.value;
setEditItem({
...editItem,
sizes:updated
});
}}
/>

<input
type="number"
placeholder="Price Difference"
value={size.price}
onChange={(e)=>{
const updated=[...editItem.sizes];
updated[index].price=Number(e.target.value);
setEditItem({
...editItem,
sizes:updated
});
}}
/>

<button
type="button"
onClick={()=>{
setEditItem({
...editItem,
sizes:editItem.sizes.filter((_,i)=>i!==index)
});
}}
style={{
background:"#D32F2F",
color:"#fff",
border:"none",
padding:"10px 14px",
borderRadius:8,
cursor:"pointer"
}}
>
🗑
</button>

</div>
))}
    <br/><br/>


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
    


    <br/><br/>
    

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


<br/><br/>
    
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

    

<br/><br/>

<select
value={editItem.prepTime}
onChange={(e)=>
setEditItem({
...editItem,
prepTime:e.target.value
})
}
>

<option>2–4 mins</option>
<option>5–8 mins</option>
<option>8–12 mins</option>
<option>10–15 mins</option>
<option>Ready to Serve</option>

</select>

<br/><br/>

    <select
value={editItem.servedAs}
onChange={(e)=>
setEditItem({
...editItem,
servedAs:e.target.value
})
}
>

<option>Hot</option>
<option>Cold</option>
<option>Hot / Cold</option>
<option>Room Temperature</option>

</select>

    <br/><br/>

    <select
value={editItem.dietType}
onChange={(e)=>
setEditItem({
...editItem,
dietType:e.target.value
})
}
>

<option>Vegetarian</option>
<option>Vegan</option>
<option>Non-Vegetarian</option>

</select>


    <br/><br/>


    

    <button
      onClick={updateProduct}
      style={{
        marginRight: 10,
      }}
    >
      💾 Save
    </button>

    <button
      onClick={() => setEditing(null)}
    >
      Cancel
    </button>
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
  }).map((item) => (
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


<hr style={{margin:"60px 0"}} />


      
  
          
       
      
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
onChange={(e)=>setOrderSearch(e.target.value)}
style={{
width:"100%",
maxWidth:450,
padding:"14px 18px",
borderRadius:14,
border:"1px solid #ddd",
fontSize:16,
marginBottom:20,
outline:"none",
background:"#fff"
}}
/>



      

<div
  style={{
    display:"flex",
    gap:10,
    flexWrap:"wrap",
    marginBottom:30
  }}
>

{["All","New","Preparing","Ready","Delivered","Cancelled"].map((status)=>(
  
<button
  key={status}
  onClick={()=>setOrderFilter(status)}
  style={{
    padding:"10px 18px",
    borderRadius:999,
    border:"none",
    cursor:"pointer",
    background:
      orderFilter === status
      ? "#3B1A08"
      : "#F2ECE5",
    color:
      orderFilter === status
      ? "white"
      : "#3B1A08",
    fontWeight:600
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
.sort((a,b)=>
(b.createdAt?.seconds || 0) -
(a.createdAt?.seconds || 0)
)
.filter((order)=>{

const matchesStatus =
orderFilter === "All" ||
order.status === orderFilter;


const searchText =
orderSearch.toLowerCase();


const matchesSearch =
order.customer?.name
?.toLowerCase()
.includes(searchText)
||
order.id
.toLowerCase()
.includes(searchText);


return matchesStatus && matchesSearch;

})
.map((order)=>(

<div
key={order.id}
style={{
background:"#fff",
borderRadius:20,
padding:25,
marginBottom:20,
boxShadow:"0 10px 30px rgba(0,0,0,.08)"
}}
>


<p
style={{
color:"#70645C",
fontSize:14
}}
>
Placed:{" "}
{order.createdAt?.toDate
  ? order.createdAt.toDate().toLocaleString()
  : "Just now"}
</p>


<p>
<strong>
Customer:
</strong>{" "}
{order.customer?.name}
</p>


<p>
<strong>Phone:</strong> {order.customer?.phone}
</p>


<p>
<strong>
Address:
</strong>{" "}
{order.customer?.address}
</p>

{order.customer?.instructions && (
<p>
<strong>
Instructions:
</strong>{" "}
{order.customer.instructions}
</p>
)}


<p>
<strong>
Payment:
</strong>{" "}

<span
style={{
background:
order.paymentMethod === "COD"
? "#FFF3CD"
: "#D4EDDA",
padding:"5px 10px",
borderRadius:999,
fontSize:14,
fontWeight:600
}}
>
{order.paymentMethod}
</span>

</p>


  
<h3>
Items
</h3>


{order.items?.map((item,index)=>(

<div
key={index}
style={{
display:"flex",
gap:15,
padding:"15px 0",
borderBottom:"1px solid #eee"
}}
>

{item.img && (
<img
src={item.img}
alt={item.name}
style={{
width:80,
height:80,
borderRadius:14,
objectFit:"cover"
}}
/>
)}


<div>

<h3
style={{
margin:"0 0 8px",
fontFamily:"Playfair Display"
}}
>
☕ {item.name}
</h3>


<p style={{margin:0}}>
<strong>
{item.qty || item.quantity || 1} ×
</strong>{" "}
₹{item.price}
</p>


<p
style={{
marginTop:8,
fontSize:14,
color:"#70645C"
}}
>

{item.size && (
<>
Size: {item.size}
<br/>
</>
)}


{item.milk && (
<>
Milk: {item.milk}
<br/>
</>
)}


{item.toppings?.length > 0 && (
<>
Toppings:{" "}
{item.toppings.map((t) =>
  typeof t === "string" ? t : t.name
).join(", ")}
<br/>
</>
)}

{item.temperature && (
<>
Temperature: {item.temperature}
<br/>
</>
)}


{item.iceLevel && (
<>
Ice: {item.iceLevel}
<br/>
</>
)}


{item.sweetness !== undefined && (
<>
Sweetness: {item.sweetness}%
<br/>
</>
)}


{item.instructions && (
<>
Note: {item.instructions}
</>
)}

</p>


</div>

</div>

))}


  <div
style={{
background:"#F8F3ED",
padding:15,
borderRadius:12,
marginTop:20
}}
>

<p>
Subtotal: ₹{order.subtotal}
</p>

<p>
Tax: ₹{order.tax}
</p>

<p>
Delivery: ₹{order.delivery}
</p>

<hr />

<h3>
Total: ₹{order.total}
</h3>

</div>


<p>
Status: 
<strong>
{" "}
{order.status}
</strong>
</p>



{order.status === "New" && (
<button
onClick={()=>updateOrderStatus(order.id,"Preparing")}
style={{
background:"#C4956A",
color:"white",
border:"none",
padding:"10px 16px",
borderRadius:10,
cursor:"pointer"
}}
>
✅ Accept Order
</button>
)}


{order.status === "Preparing" && (
<button
onClick={()=>updateOrderStatus(order.id,"Ready")}
>
☕ Ready
</button>
)}


{order.status === "Ready" && (
<button
onClick={()=>updateOrderStatus(order.id,"Delivered")}
>
🚚 Delivered
</button>
)}


{order.status !== "Delivered" &&
order.status !== "Cancelled" && (
<button
onClick={()=>updateOrderStatus(order.id,"Cancelled")}
style={{
background:"#DE6B48",
color:"white",
border:"none",
padding:"10px 16px",
borderRadius:10,
cursor:"pointer"
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
