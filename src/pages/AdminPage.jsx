import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";

export default function AdminPage({ setPage }) {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [orders, setOrders] = useState([]);
const [orderLoading, setOrderLoading] = useState(true);
  const [orderFilter, setOrderFilter] = useState("All");

const [newItem, setNewItem] = useState({
  name: "",
  category: "Coffee",
  price: "",
  desc: "",
  emoji: "",
  img: "",
});

  const [editing, setEditing] = useState(null);

const [editItem, setEditItem] = useState({
  name: "",
  category: "Coffee",
  price: "",
  desc: "",
  emoji: "",
  img: "",
});

  useEffect(() => {
  loadMenu();

  const unsubscribe = onSnapshot(
    collection(db, "orders"),
    (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setOrders(data);
      setOrderLoading(false);
    }
  );

  return () => unsubscribe();

}, []);

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
    available: true,
  });

  setNewItem({
    name: "",
    category: "Coffee",
    price: "",
    desc: "",
    emoji: "",
    img: "",
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

  alert("Document ID = " + editing.id);

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

    <br /><br />

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

    <br /><br />

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
          key={item.forestoreId}
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


      
       
      
      
      <h1
style={{
fontFamily:"Playfair Display"
}}
>
📦 Orders
</h1>

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
.filter((order)=>{

if(orderFilter==="All") return true;

return order.status === orderFilter;

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


<h2>
Order #{order.id.slice(0,6)}
</h2>


<p>
<strong>
Customer:
</strong>{" "}
{order.customer?.name}
</p>


<p>
<strong>
Phone:
</strong>{" "}
{order.customer?.phone}
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



<div
style={{
display:"flex",
gap:10,
flexWrap:"wrap"
}}
>



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

<button
onClick={()=>updateOrderStatus(order.id,"Ready")}
>
✅ Ready
</button>


<button
onClick={()=>updateOrderStatus(order.id,"Delivered")}
>
🚚 Delivered
</button>


</div>


</div>

))

)}
      
    </div>
  );
}
