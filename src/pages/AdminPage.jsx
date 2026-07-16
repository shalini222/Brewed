import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";

export default function AdminPage({ setPage }) {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

const [newItem, setNewItem] = useState({
  name: "",
  category: "Coffee",
  price: "",
  desc: "",
  emoji: "",
  img: "",
});

  useEffect(() => {
    loadMenu();
  }, []);

  async function loadMenu() {
    const snapshot = await getDocs(collection(db, "menu"));

    const items = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
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
      {menu.map((item) => (
        <div
          key={item.id}
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
            <button>✏ Edit</button>

            <button
  onClick={() => deleteProduct(item.id)}
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
          </div>
        </div>
      ))}
    </div>
  );
}
