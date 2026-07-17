import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export default function CouponsAdminPage({ setPage }) {
  const [coupons, setCoupons] = useState([]);

  const [newCoupon, setNewCoupon] = useState({
  code: "",
  type: "percentage",
  value: "",
  minOrder: "",
  usageLimit: "",
  expires: "",
  active: true,
});

  const [loading, setLoading] = useState(true);

  async function loadCoupons() {
    const snapshot = await getDocs(collection(db, "coupons"));

    setCoupons(
      snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    );

    setLoading(false);
  }

  useEffect(() => {
    loadCoupons();
  }, []);


  async function addCoupon() {
  if (
    !newCoupon.code ||
    !newCoupon.value ||
    !newCoupon.minOrder
  ) {
    alert("Please complete all required fields.");
    return;
  }

  await addDoc(collection(db, "coupons"), {
    code: newCoupon.code.toUpperCase(),
    type: newCoupon.type,
    value: Number(newCoupon.value),
    minOrder: Number(newCoupon.minOrder),
    active: newCoupon.active,
    usageLimit: Number(newCoupon.usageLimit || 0),
    usageCount: 0,
    expires: newCoupon.expires,
    createdAt: serverTimestamp(),
  });

  setNewCoupon({
    code: "",
    type: "percentage",
    value: "",
    minOrder: "",
    usageLimit: "",
    expires: "",
    active: true,
  });

  loadCoupons();

  alert("Coupon created successfully!");
}

async function deleteCoupon(id) {
  if (!window.confirm("Delete this coupon?")) return;

  await deleteDoc(doc(db, "coupons", id));

  loadCoupons();
}

async function toggleCoupon(coupon) {
  await updateDoc(doc(db, "coupons", coupon.id), {
    active: !coupon.active,
  });

  loadCoupons();
}



return (
  <div
    style={{
      minHeight: "100vh",
      background: "#FDFAF5",
      padding: "100px 30px",
    }}
  >
    <button onClick={() => setPage("admin")}>
      ← Back
    </button>

    <h1
      style={{
        fontFamily: "Playfair Display",
        marginTop: 20,
        marginBottom: 35,
      }}
    >
      🎟 Coupon Management
    </h1>

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
        gap: 20,
        marginBottom: 35,
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: 25,
          borderRadius: 20,
          boxShadow: "0 10px 25px rgba(0,0,0,.08)",
        }}
      >
        <h3>Total Coupons</h3>
        <h1>{coupons.length}</h1>
      </div>

      <div
        style={{
          background: "#fff",
          padding: 25,
          borderRadius: 20,
          boxShadow: "0 10px 25px rgba(0,0,0,.08)",
        }}
      >
        <h3>Active</h3>
        <h1>
          {coupons.filter(c => c.active).length}
        </h1>
      </div>

      <div
        style={{
          background: "#fff",
          padding: 25,
          borderRadius: 20,
          boxShadow: "0 10px 25px rgba(0,0,0,.08)",
        }}
      >
        <h3>Disabled</h3>
        <h1>
          {coupons.filter(c => !c.active).length}
        </h1>
      </div>
    </div>

    <div
      style={{
        background: "#fff",
        borderRadius: 22,
        padding: 30,
        boxShadow: "0 10px 30px rgba(0,0,0,.08)",
        marginBottom: 40,
      }}
    >
      <h2>Create Coupon</h2>

      <input
        placeholder="Coupon Code"
        value={newCoupon.code}
        onChange={(e) =>
          setNewCoupon({
            ...newCoupon,
            code: e.target.value.toUpperCase(),
          })
        }
      />

      <br /><br />

      <select
        value={newCoupon.type}
        onChange={(e) =>
          setNewCoupon({
            ...newCoupon,
            type: e.target.value,
          })
        }
      >
        <option value="percentage">Percentage (%)</option>
        <option value="fixed">Fixed Amount (₹)</option>
      </select>

      <br /><br />

      <input
        type="number"
        placeholder="Discount Value"
        value={newCoupon.value}
        onChange={(e) =>
          setNewCoupon({
            ...newCoupon,
            value: e.target.value,
          })
        }
      />

      <br /><br />

      <input
        type="number"
        placeholder="Minimum Order"
        value={newCoupon.minOrder}
        onChange={(e) =>
          setNewCoupon({
            ...newCoupon,
            minOrder: e.target.value,
          })
        }
      />

      <br /><br />

      <input
        type="number"
        placeholder="Usage Limit"
        value={newCoupon.usageLimit}
        onChange={(e) =>
          setNewCoupon({
            ...newCoupon,
            usageLimit: e.target.value,
          })
        }
      />

      <br /><br />

      <input
        type="date"
        value={newCoupon.expires}
        onChange={(e) =>
          setNewCoupon({
            ...newCoupon,
            expires: e.target.value,
          })
        }
      />

      <br /><br />

      <button
        onClick={addCoupon}
        style={{
          background: "#3B1A08",
          color: "#fff",
          border: "none",
          padding: "12px 24px",
          borderRadius: 12,
          cursor: "pointer",
        }}
      >
        ➕ Create Coupon
      </button>
    </div>


    <h2
  style={{
    fontFamily: "Playfair Display",
    marginBottom: 20,
  }}
>
  🎟 All Coupons
</h2>

{loading ? (
  <p>Loading...</p>
) : coupons.length === 0 ? (
  <div
    style={{
      background: "#fff",
      padding: 40,
      borderRadius: 20,
      textAlign: "center",
      boxShadow: "0 10px 30px rgba(0,0,0,.08)",
    }}
  >
    <h3>No coupons created yet.</h3>
    <p>Create your first coupon above.</p>
  </div>
) : (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
      gap: 20,
    }}
  >
    {coupons.map((coupon) => (
      <div
        key={coupon.id}
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: 24,
          boxShadow: "0 10px 25px rgba(0,0,0,.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 15,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontFamily: "Playfair Display",
            }}
          >
            {coupon.code}
          </h2>

          <span
            style={{
              background: coupon.active
                ? "#E8F5E9"
                : "#FFEBEE",
              color: coupon.active
                ? "#2E7D32"
                : "#C62828",
              padding: "6px 12px",
              borderRadius: 999,
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            {coupon.active ? "Active" : "Disabled"}
          </span>
        </div>

        <p>
          <strong>Discount:</strong>{" "}
          {coupon.type === "percentage"
            ? `${coupon.value}%`
            : `₹${coupon.value}`}
        </p>

        <p>
          <strong>Minimum Order:</strong> ₹
          {coupon.minOrder}
        </p>

        <p>
          <strong>Usage:</strong>{" "}
          {coupon.usageCount || 0} /{" "}
          {coupon.usageLimit || "∞"}
        </p>

        <p>
          <strong>Expires:</strong>{" "}
          {coupon.expires || "Never"}
        </p>

        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 20,
          }}
        >
          <button
            onClick={() => toggleCoupon(coupon)}
            style={{
              flex: 1,
              background: coupon.active
                ? "#F5B942"
                : "#2E7D32",
              color: "#fff",
              border: "none",
              padding: 10,
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            {coupon.active ? "Disable" : "Enable"}
          </button>

          <button
            onClick={() => deleteCoupon(coupon.id)}
            style={{
              flex: 1,
              background: "#D32F2F",
              color: "#fff",
              border: "none",
              padding: 10,
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            Delete
          </button>
        </div>
      </div>
    ))}
    </div>
)}

</div>
);
}
