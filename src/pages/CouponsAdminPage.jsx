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
  const [sortBy, setSortBy] = useState("newest");
  
  
  

 const [newCoupon, setNewCoupon] = useState({
  code: "",
  type: "percentage",
  category: "General",
  value: "",
  maxDiscount: "",
  minOrder: "",
  usageLimit: "",
  perUserLimit: 1,
  starts: "",
  expires: "",
  singleUse: false,
  active: true,
});

  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(null);

   const [editCoupon, setEditCoupon] = useState({
  code: "",
  type: "percentage",
  value: "",
  maxDiscount: "",
  minOrder: "",
  category: "General",
  starts: "",
  expires: "",
  usageLimit: "",
  perUserLimit: 1,
  singleUse: false,
});

const [search, setSearch] = useState("");
const [filter, setFilter] = useState("All");

const totalUses = coupons.reduce(
  (sum, c) => sum + (c.usageCount || 0),
  0
);

const totalDiscount = coupons.reduce(
  (sum, c) =>
    sum + (c.totalDiscountGiven || 0),
  0
);

const mostUsed =
  coupons.length > 0
    ? [...coupons].sort(
        (a, b) =>
          (b.usageCount || 0) -
          (a.usageCount || 0)
      )[0]
    : null;





  
  

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
  category: newCoupon.category,
  value: Number(newCoupon.value),
  maxDiscount: Number(newCoupon.maxDiscount || 0),
  minOrder: Number(newCoupon.minOrder),
  active: newCoupon.active,
  usageLimit: Number(newCoupon.usageLimit || 0),
  usageCount: 0,
  starts: newCoupon.starts,
  expires: newCoupon.expires,
  singleUse: newCoupon.singleUse,
  perUserLimit: Number(newCoupon.perUserLimit),
  createdAt: serverTimestamp(),
});

  setNewCoupon({
  code: "",
  type: "percentage",
  category: "General",
  value: "",
  maxDiscount: "",
  minOrder: "",
  usageLimit: "",
  starts: "",
  expires: "",
  singleUse: false,
  perUserLimit: 1,
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

async function updateCoupon() {
  if (!editing) return;

  await updateDoc(doc(db, "coupons", editing.id), {
  code: editCoupon.code.toUpperCase(),
  type: editCoupon.type,
  value: Number(editCoupon.value),
  maxDiscount: Number(editCoupon.maxDiscount),
  minOrder: Number(editCoupon.minOrder),
  category: editCoupon.category,
  starts: editCoupon.starts,
  expires: editCoupon.expires,
  usageLimit: Number(editCoupon.usageLimit),
  perUserLimit: Number(editCoupon.perUserLimit),
  singleUse: editCoupon.singleUse,
});

  alert("Coupon updated!");

  setEditing(null);

  loadCoupons();
}

function StatCard({
  title,
  value,
  color,
  icon,
}) {
  return (
    <div
      style={{
        background: "#fff",
        padding: 25,
        borderRadius: 20,
        boxShadow:
          "0 10px 25px rgba(0,0,0,.08)",
      }}
    >
      <div
        style={{
          fontSize: 32,
          marginBottom: 10,
        }}
      >
        {icon}
      </div>

      <p
        style={{
          color: "#777",
          margin: 0,
        }}
      >
        {title}
      </p>

      <h1
        style={{
          marginTop: 10,
          color,
        }}
      >
        {value}
      </h1>
    </div>
  );
}


function getCategoryColor(category) {
  switch (category) {
    case "New User":
      return {
        bg: "#E3F2FD",
        color: "#1565C0",
      };

    case "Festival":
      return {
        bg: "#FFF3E0",
        color: "#EF6C00",
      };

    case "Birthday":
      return {
        bg: "#FCE4EC",
        color: "#C2185B",
      };

    case "Referral":
      return {
        bg: "#E8F5E9",
        color: "#2E7D32",
      };

    case "Loyalty":
      return {
        bg: "#F3E5F5",
        color: "#6A1B9A",
      };

    default:
      return {
        bg: "#ECEFF1",
        color: "#455A64",
      };
  }
}


function getExpiryStatus(expires) {
  if (!expires) return "Never Expires";

  const today = new Date();
  const expiry = new Date(expires);

  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);

  const days = Math.ceil(
    (expiry - today) / (1000 * 60 * 60 * 24)
  );

  if (days < 0)
    return `❌ Expired ${Math.abs(days)} day${
      Math.abs(days) !== 1 ? "s" : ""
    } ago`;

  if (days === 0)
    return "⚠️ Expires Today";

  if (days === 1)
    return "⏳ Expires Tomorrow";

  return `⏳ Expires in ${days} days`;
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
    marginBottom: 40,
  }}
>
  <StatCard
    title="Coupons"
    value={coupons.length}
    color="#3B1A08"
    icon="🎟"
  />

  <StatCard
    title="Active"
    value={coupons.filter(c => c.active).length}
    color="#2E7D32"
    icon="✅"
  />

  <StatCard
    title="Total Uses"
    value={totalUses}
    color="#C4956A"
    icon="🔥"
  />

  <StatCard
    title="Discount Given"
    value={`₹${totalDiscount}`}
    color="#4F46E5"
    icon="💸"
  />
</div>

    {mostUsed && (
  <div
    style={{
      background: "#fff",
      borderRadius: 20,
      padding: 25,
      marginBottom: 35,
      boxShadow:
        "0 10px 25px rgba(0,0,0,.08)",
    }}
  >
    <h2
      style={{
        fontFamily: "Playfair Display",
      }}
    >
      🏆 Most Used Coupon
    </h2>

    <h1>{mostUsed.code}</h1>

    <p>
      Used {mostUsed.usageCount || 0} times
    </p>
  </div>
)}

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
  value={newCoupon.category}
  onChange={(e) =>
    setNewCoupon({
      ...newCoupon,
      category: e.target.value,
    })
  }
>
  <option value="General">🏷 General</option>
  <option value="New User">👤 New User</option>
  <option value="Festival">🎉 Festival</option>
  <option value="Birthday">🎂 Birthday</option>
  <option value="Referral">🤝 Referral</option>
  <option value="Loyalty">💎 Loyalty</option>
</select>

<br /><br />

<select
  value={newCoupon.singleUse ? "single" : "multi"}
  onChange={(e) =>
    setNewCoupon({
      ...newCoupon,
      singleUse: e.target.value === "single",
    })
  }
>
  <option value="multi">🔄 Multi Use</option>
  <option value="single">1️⃣ Single Use</option>
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
    {editing && (
  <div
    style={{
      background: "#fff",
      padding: 30,
      borderRadius: 20,
      marginBottom: 40,
      boxShadow: "0 10px 30px rgba(0,0,0,.08)",
    }}
  >
    <h2>Edit Coupon</h2>

    <input
      value={editCoupon.code}
      onChange={(e) =>
        setEditCoupon({
          ...editCoupon,
          code: e.target.value.toUpperCase(),
        })
      }
      placeholder="Coupon Code"
    />

    <br /><br />

    <select
      value={editCoupon.type}
      onChange={(e) =>
        setEditCoupon({
          ...editCoupon,
          type: e.target.value,
        })
      }
    >
      <option value="percentage">Percentage</option>
      <option value="fixed">Fixed Amount</option>
    </select>

    <br /><br />

    <input
      type="number"
      placeholder="Discount"
      value={editCoupon.value}
      onChange={(e) =>
        setEditCoupon({
          ...editCoupon,
          value: e.target.value,
        })
      }
    />

    <br /><br />


  <br /><br />

<input
  type="number"
  placeholder="Maximum Discount (₹)"
  value={editCoupon.maxDiscount}
  onChange={(e) =>
    setEditCoupon({
      ...editCoupon,
      maxDiscount: e.target.value,
    })
  }
/>


    
    <input
      type="number"
      placeholder="Minimum Order"
      value={editCoupon.minOrder}
      onChange={(e) =>
        setEditCoupon({
          ...editCoupon,
          minOrder: e.target.value,
        })
      }
    />

    <br /><br />
    

<input
  type="number"
  min="1"
  placeholder="Per User Usage Limit"
  value={editCoupon.perUserLimit}
  onChange={(e) =>
    setEditCoupon({
      ...editCoupon,
      perUserLimit: e.target.value,
    })
  }
/>

    <input
      type="number"
      placeholder="Usage Limit"
      value={editCoupon.usageLimit}
      onChange={(e) =>
        setEditCoupon({
          ...editCoupon,
          usageLimit: e.target.value,
        })
      }
    />
    

    <br /><br />

<input
  type="date"
  value={editCoupon.starts}
  onChange={(e) =>
    setEditCoupon({
  ...editCoupon,
  starts: e.target.value,
})
  }
/>



<br /><br />
    

    <input
      type="date"
      value={editCoupon.expires}
      onChange={(e) =>
        setEditCoupon({
          ...editCoupon,
          expires: e.target.value,
        })
      }
    />

    <br /><br />

    <button
      onClick={updateCoupon}
      style={{
        background: "#2E7D32",
        color: "#fff",
        border: "none",
        padding: "12px 20px",
        borderRadius: 10,
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


<div
  style={{
    display: "flex",
    gap: 15,
    marginBottom: 25,
    flexWrap: "wrap",
  }}
>
  <input
    type="text"
    placeholder="🔍 Search coupon..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    style={{
      flex: 1,
      minWidth: 250,
      padding: "12px 16px",
      borderRadius: 12,
      border: "1px solid #ddd",
    }}
  />

  <select
    value={filter}
    onChange={(e) => setFilter(e.target.value)}
    style={{
      padding: "12px 16px",
      borderRadius: 12,
      border: "1px solid #ddd",
    }}
  >
    <option>All</option>
    <option>Active</option>
    <option>Disabled</option>
    <option>Expired</option>
  </select>
</div>



    <div
  style={{
    display: "flex",
    justifyContent: "flex-end",
    marginBottom: 20,
  }}
>
  <select
    value={sortBy}
    onChange={(e) => setSortBy(e.target.value)}
    style={{
      padding: "10px 14px",
      borderRadius: 12,
      border: "1px solid #ddd",
      background: "#fff",
      cursor: "pointer",
    }}
  >
    <option value="newest">Newest</option>
    <option value="code">Coupon Code (A-Z)</option>
    <option value="used">Most Used</option>
    <option value="expiry">Expiring Soon</option>
  </select>
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
    {coupons
  .filter((coupon) => {
    const matchesSearch =
      coupon.code
        .toLowerCase()
        .includes(search.toLowerCase());

    let matchesFilter = true;

    if (filter === "Active")
      matchesFilter = coupon.active;

    if (filter === "Disabled")
      matchesFilter = !coupon.active;

    if (filter === "Expired")
      matchesFilter =
        coupon.expires &&
        new Date(coupon.expires) < new Date();

    return matchesSearch && matchesFilter;
  })

  .sort((a, b) => {
    switch (sortBy) {
      case "code":
        return a.code.localeCompare(b.code);

      case "used":
        return (b.usageCount || 0) - (a.usageCount || 0);

      case "expiry":
        return new Date(a.expires || "9999-12-31") -
               new Date(b.expires || "9999-12-31");

      default:
        return (
          (b.createdAt?.seconds || 0) -
          (a.createdAt?.seconds || 0)
        );
    }
  })

  .map((coupon) => (
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
    display: "inline-block",
    marginTop: 8,
    marginBottom: 12,
    padding: "6px 12px",
    borderRadius: 999,
    fontWeight: 600,
    fontSize: 13,
    background:
      getCategoryColor(coupon.category).bg,
    color:
      getCategoryColor(coupon.category).color,
  }}
>
  {coupon.category || "General"}
</span>

<p>
  <strong>Usage Type:</strong>{" "}
  {coupon.singleUse ? "1️⃣ Single Use" : "🔄 Multi Use"}
</p>


          
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

  {coupon.type === "percentage" &&
    coupon.maxDiscount > 0 &&
    ` (Up to ₹${coupon.maxDiscount})`}
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
  <strong>Per User:</strong>{" "}
  {coupon.perUserLimit || 1} use
  {coupon.perUserLimit > 1 ? "s" : ""}
</p>
         <p>
  <strong>Valid From:</strong>{" "}
  {coupon.starts || "Immediately"}
</p>
        <p>
  <strong>Expires:</strong>{" "}
  {coupon.expires || "Never"}
</p>

<p
  style={{
    fontWeight: 600,
    color:
      coupon.expires &&
      new Date(coupon.expires) < new Date()
        ? "#D32F2F"
        : "#C4956A",
  }}
>
  {getExpiryStatus(coupon.expires)}
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
  onClick={() => {
    setEditing(coupon);

    setEditCoupon({
  code: coupon.code,
  type: coupon.type,
  value: coupon.value,
  maxDiscount: coupon.maxDiscount || "",
  minOrder: coupon.minOrder,
  category: coupon.category || "General",
  starts: coupon.starts || "",
  expires: coupon.expires || "",
  usageLimit: coupon.usageLimit || "",
  perUserLimit: coupon.perUserLimit || 1,
  singleUse: coupon.singleUse || false,
});
  }}
  style={{
    flex: 1,
    background: "#C4956A",
    color: "#fff",
    border: "none",
    padding: 10,
    borderRadius: 10,
    cursor: "pointer",
  }}
>
  ✏ Edit
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
