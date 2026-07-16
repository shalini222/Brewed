import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export default function AdminPage({ setPage }) {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);

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

            <button>🗑 Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
