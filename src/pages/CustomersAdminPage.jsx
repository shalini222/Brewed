import { useState, useEffect, useMemo } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";

// Moved outside to prevent forced re-mounting and component flickering
function StatCard({ title, value }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: 22,
        boxShadow: "0 8px 25px rgba(0,0,0,.05)",
        border: "1px solid #eee",
      }}
    >
      <div style={{ color: "#888", fontSize: 13, marginBottom: 8 }}>
        {title}
      </div>
      <h2 style={{ margin: 0, color: "#3B1A08" }}>{value}</h2>
    </div>
  );
}

export default function CustomersAdminPage({ setPage }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Newest");

  // Selected Customer for Side Drawer Panel
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [activeTab, setActiveTab] = useState("orders"); // orders | rewards | coupons

  // Editing Sub-States
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", address: "", favDrink: "" });

  async function loadCustomers() {
    try {
      const snapshot = await getDocs(collection(db, "users"));
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setCustomers(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  // Update a user locally and remotely without reloading the database
  async function updateCustomerState(customerId, updatedFields) {
    setCustomers((prev) =>
      prev.map((c) => (c.id === customerId ? { ...c, ...updatedFields } : c))
    );
    if (selectedCustomer && selectedCustomer.id === customerId) {
      setSelectedCustomer((prev) => ({ ...prev, ...updatedFields }));
    }
    try {
      await updateDoc(doc(db, "users", customerId), updatedFields);
    } catch (err) {
      console.error(err);
      loadCustomers(); // rollback on safety fail
    }
  }

  async function toggleAccount(customer) {
    const nextStatus = !(customer.active ?? true);
    await updateCustomerState(customer.id, { active: nextStatus });
  }

  async function handleResetPoints(customer) {
    if (window.confirm(`Are you sure you want to reset rewards points for ${customer.name || "this user"}?`)) {
      await updateCustomerState(customer.id, { rewardPoints: 0 });
    }
  }

  async function handleChangeTier(customer, newTier) {
    await updateCustomerState(customer.id, { tier: newTier });
  }

  async function handleSaveEdit() {
    if (!selectedCustomer) return;
    await updateCustomerState(selectedCustomer.id, editForm);
    setIsEditing(false);
  }

  async function handleDeleteCustomer(customer) {
    if (window.confirm(`CRITICAL ACTION: Are you sure you want to permanently delete ${customer.name || "this user"}?`)) {
      try {
        await deleteDoc(doc(db, "users", customer.id));
        setCustomers((prev) => prev.filter((c) => c.id !== customer.id));
        setSelectedCustomer(null);
      } catch (err) {
        console.error(err);
      }
    }
  }

  // Analytics & Filtering Calculations
  const { filteredCustomers, stats, analytics } = useMemo(() => {
    const counts = { total: 0, bronze: 0, silver: 0, gold: 0, disabled: 0 };
    let highestSpender = { name: "-", amount: 0 };
    let highestOrderCount = { name: "-", count: 0 };
    let newThisMonth = 0;
    let returning = 0;

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    customers.forEach((c) => {
      const tier = c.tier || "Bronze";
      const isActive = c.active ?? true;
      const spent = c.totalSpent || 0;
      const orders = c.totalOrders || 0;

      counts.total++;
      if (tier === "Bronze") counts.bronze++;
      if (tier === "Silver") counts.silver++;
      if (tier === "Gold") counts.gold++;
      if (!isActive) counts.disabled++;

      if (spent > highestSpender.amount) {
        highestSpender = { name: c.name || "Unknown User", amount: spent };
      }
      if (orders > highestOrderCount.count) {
        highestOrderCount = { name: c.name || "Unknown User", count: orders };
      }
      if (orders > 1) {
        returning++;
      }

      if (c.createdAt?.seconds) {
        const date = new Date(c.createdAt.seconds * 1000);
        if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
          newThisMonth++;
        }
      }
    });

    const filtered = customers.filter((customer) => {
      const tier = customer.tier || "Bronze";
      const isActive = customer.active ?? true;

      const matchesSearch =
        (customer.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (customer.email || "").toLowerCase().includes(search.toLowerCase());
      const matchesTier = tierFilter === "All" || tier === tierFilter;
      const matchesStatus =
        statusFilter === "All" || (statusFilter === "Active" ? isActive : !isActive);

      return matchesSearch && matchesTier && matchesStatus;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "Orders": return (b.totalOrders || 0) - (a.totalOrders || 0);
        case "Spent": return (b.totalSpent || 0) - (a.totalSpent || 0);
        case "Points": return (b.rewardPoints || 0) - (a.rewardPoints || 0);
        default: return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      }
    });

    return {
      filteredCustomers: filtered,
      stats: counts,
      analytics: { highestSpender, highestOrderCount, newThisMonth, returning },
    };
  }, [customers, search, tierFilter, statusFilter, sortBy]);

  return (
    <div style={{ background: "#FAF6F0", minHeight: "100vh", padding: 40, fontFamily: "sans-serif" }}>
      <button
        onClick={() => setPage("admin")}
        style={{
          padding: "10px 18px",
          borderRadius: 10,
          border: "none",
          background: "#3B1A08",
          color: "#fff",
          cursor: "pointer",
          marginBottom: 20,
        }}
      >
        ← Back
      </button>

      <h1 style={{ fontFamily: "Playfair Display", color: "#3B1A08", marginBottom: 30 }}>
        👥 Customer Management
      </h1>

      {/* Stats Cards Section */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: 20,
          marginBottom: 20,
        }}
      >
        <StatCard title="Total Customers" value={stats.total} />
        <StatCard title="Bronze Members" value={stats.bronze} />
        <StatCard title="Silver Members" value={stats.silver} />
        <StatCard title="Gold Members" value={stats.gold} />
        <StatCard title="Disabled Accounts" value={stats.disabled} />
      </div>

      {/* Phase 6.7 — Customer Analytics Row */}
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: 24,
          marginBottom: 35,
          border: "1px solid #eee",
          boxShadow: "0 8px 25px rgba(0,0,0,.05)",
        }}
      >
        <h3 style={{ color: "#3B1A08", margin: "0 0 15px 0", fontSize: 16 }}>📊 Customer Analytics Summary</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
          <div>
            <span style={{ fontSize: 12, color: "#888" }}>Highest Spender</span>
            <div style={{ fontWeight: "bold", color: "#3B1A08", marginTop: 4 }}>{analytics.highestSpender.name} (₹{analytics.highestSpender.amount})</div>
          </div>
          <div>
            <span style={{ fontSize: 12, color: "#888" }}>Most Orders placed</span>
            <div style={{ fontWeight: "bold", color: "#3B1A08", marginTop: 4 }}>{analytics.highestOrderCount.name} ({analytics.highestOrderCount.count} orders)</div>
          </div>
          <div>
            <span style={{ fontSize: 12, color: "#888" }}>New Customers This Month</span>
            <div style={{ fontWeight: "bold", color: "#3B1A08", marginTop: 4 }}>{analytics.newThisMonth} users</div>
          </div>
          <div>
            <span style={{ fontSize: 12, color: "#888" }}>Returning Customer Rate</span>
            <div style={{ fontWeight: "bold", color: "#3B1A08", marginTop: 4 }}>
              {stats.total ? Math.round((analytics.returning / stats.total) * 100) : 0}% ({analytics.returning} users)
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: 24,
          marginBottom: 30,
          boxShadow: "0 8px 25px rgba(0,0,0,.05)",
          border: "1px solid #eee",
        }}
      >
        <div style={{ display: "flex", gap: 15, flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="🔍 Search customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 250, padding: 12, borderRadius: 10, border: "1px solid #ddd" }}
          />

          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            style={{ padding: 12, borderRadius: 10, border: "1px solid #ddd" }}
          >
            <option value="All">All Tiers</option>
            <option value="Bronze">Bronze</option>
            <option value="Silver">Silver</option>
            <option value="Gold">Gold</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: 12, borderRadius: 10, border: "1px solid #ddd" }}
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Disabled">Disabled</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ padding: 12, borderRadius: 10, border: "1px solid #ddd" }}
          >
            <option value="Newest">Newest</option>
            <option value="Orders">Most Orders</option>
            <option value="Spent">Highest Spending</option>
            <option value="Points">Reward Points</option>
          </select>
        </div>
      </div>

      {/* Grid of Customer Cards */}
      {loading ? (
        <p style={{ textAlign: "center" }}>Loading customers...</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(330px,1fr))", gap: 20 }}>
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              style={{
                background: "#fff",
                borderRadius: 16,
                padding: 24,
                border: "1px solid #eee",
                boxShadow: "0 8px 20px rgba(0,0,0,.05)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 15, marginBottom: 20 }}>
                <img
                  src={
                    customer.photoURL ||
                    "https://ui-avatars.com/api/?background=C4956A&color=fff&name=" +
                      encodeURIComponent(customer.name || "User")
                  }
                  alt=""
                  style={{ width: 65, height: 65, borderRadius: "50%", objectFit: "cover" }}
                />
                <div>
                  <h3 style={{ margin: 0, color: "#3B1A08" }}>{customer.name || "Unknown User"}</h3>
                  <p style={{ marginTop: 5, color: "#777", fontSize: 14 }}>{customer.email}</p>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
                <span
                  style={{
                    background: customer.tier === "Gold" ? "#FFD700" : customer.tier === "Silver" ? "#E0E0E0" : "#D6A46A",
                    color: "#3B1A08",
                    padding: "5px 12px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {customer.tier || "Bronze"}
                </span>

                <span
                  style={{
                    background: (customer.active ?? true) ? "#E8F5E9" : "#FFEBEE",
                    color: (customer.active ?? true) ? "#2E7D32" : "#C62828",
                    padding: "5px 12px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {(customer.active ?? true) ? "Active" : "Disabled"}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                <div><strong>Orders</strong><br />{customer.totalOrders || 0}</div>
                <div><strong>Total Spent</strong><br />₹{customer.totalSpent || 0}</div>
                <div><strong>Reward Points</strong><br />{customer.rewardPoints || 0}</div>
                <div><strong>Birthday</strong><br />{customer.birthday || "-"}</div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => toggleAccount(customer)}
                  style={{
                    flex: 1,
                    padding: 12,
                    border: "none",
                    borderRadius: 10,
                    cursor: "pointer",
                    background: (customer.active ?? true) ? "#F5B942" : "#2E7D32",
                    color: "#fff",
                    fontWeight: 600,
                  }}
                >
                  {(customer.active ?? true) ? "Disable" : "Enable"}
                </button>

                <button
                  onClick={() => {
                    setSelectedCustomer(customer);
                    setEditForm({
                      name: customer.name || "",
                      email: customer.email || "",
                      phone: customer.phone || "",
                      address: customer.address || "",
                      favDrink: customer.favDrink || "",
                    });
                    setIsEditing(false);
                    setActiveTab("orders");
                  }}
                  style={{
                    flex: 1,
                    padding: 12,
                    border: "none",
                    borderRadius: 10,
                    background: "#3B1A08",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  View Profile
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- SIDE PROFILE DRAWER MODAL PANEL --- */}
      {selectedCustomer && (
        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            width: "100%",
            maxWidth: "550px",
            height: "100vh",
            background: "#fff",
            boxShadow: "-10px 0 40px rgba(0,0,0,0.15)",
            zIndex: 1000,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Drawer Header */}
          <div style={{ padding: 24, borderBottom: "1px solid #eee", display: "flex", justifyContent: "between", alignItems: "center", background: "#3B1A08", color: "#fff" }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0, fontFamily: "Playfair Display" }}>Customer Profile</h2>
            </div>
            <button
              onClick={() => setSelectedCustomer(null)}
              style={{ background: "transparent", border: "none", color: "#fff", fontSize: 24, cursor: "pointer" }}
            >
              ✕
            </button>
          </div>

          {/* Drawer Content */}
          <div style={{ padding: 24, flex: 1 }}>
            {/* Upper Metadata Block */}
            <div style={{ display: "flex", gap: 20, marginBottom: 25, alignItems: "center" }}>
              <img
                src={selectedCustomer.photoURL || "https://ui-avatars.com/api/?background=C4956A&color=fff&name=" + encodeURIComponent(selectedCustomer.name || "User")}
                alt=""
                style={{ width: 80, height: 80, borderRadius: "50%" }}
              />
              <div style={{ flex: 1 }}>
                {!isEditing ? (
                  <>
                    <h3 style={{ margin: 0, color: "#3B1A08", fontSize: 22 }}>{selectedCustomer.name || "Unknown User"}</h3>
                    <p style={{ margin: "5px 0", color: "#666" }}>{selectedCustomer.email}</p>
                  </>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      style={{ padding: 8, borderRadius: 6, border: "1px solid #ddd" }}
                      placeholder="Name"
                    />
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      style={{ padding: 8, borderRadius: 6, border: "1px solid #ddd" }}
                      placeholder="Email"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Phase 6.6 Management Action Quick Options */}
            <div style={{ background: "#FAF6F0", borderRadius: 12, padding: 15, marginBottom: 25 }}>
              <span style={{ fontSize: 12, fontWeight: "bold", color: "#3B1A08", display: "block", marginBottom: 10 }}>⚙️ ADMINISTRATIVE OPERATIONS</span>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {!isEditing ? (
                  <button onClick={() => setIsEditing(true)} style={{ background: "#3B1A08", color: "#fff", border: "none", borderRadius: 6, padding: "8px 12px", cursor: "pointer", fontSize: 12 }}>Edit Data</button>
                ) : (
                  <>
                    <button onClick={handleSaveEdit} style={{ background: "#2E7D32", color: "#fff", border: "none", borderRadius: 6, padding: "8px 12px", cursor: "pointer", fontSize: 12 }}>Save</button>
                    <button onClick={() => setIsEditing(false)} style={{ background: "#777", color: "#fff", border: "none", borderRadius: 6, padding: "8px 12px", cursor: "pointer", fontSize: 12 }}>Cancel</button>
                  </>
                )}
                <button onClick={() => handleResetPoints(selectedCustomer)} style={{ background: "#F5B942", color: "#3B1A08", border: "none", borderRadius: 6, padding: "8px 12px", cursor: "pointer", fontSize: 12, fontWeight: "bold" }}>Reset Points</button>
                
                <select
                  value={selectedCustomer.tier || "Bronze"}
                  onChange={(e) => handleChangeTier(selectedCustomer, e.target.value)}
                  style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd", fontSize: 12 }}
                >
                  <option value="Bronze">Change to Bronze</option>
                  <option value="Silver">Change to Silver</option>
                  <option value="Gold">Change to Gold</option>
                </select>

                <button onClick={() => handleDeleteCustomer(selectedCustomer)} style={{ background: "#C62828", color: "#fff", border: "none", borderRadius: 6, padding: "8px 12px", cursor: "pointer", fontSize: 12, marginLeft: "auto" }}>Delete</button>
              </div>
            </div>

            {/* Profile Extended Information */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15, marginBottom: 30, fontSize: 14 }}>
              <div>
                <strong>Phone Number:</strong>
                {isEditing ? (
                  <input type="text" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} style={{ width: "100%", padding: 6, marginTop: 4 }} />
                ) : (
                  <p style={{ margin: "4px 0 text", color: "#555" }}>{selectedCustomer.phone || "Not Provided"}</p>
                )}
              </div>
              <div>
                <strong>Favorite Drink:</strong>
                {isEditing ? (
                  <input type="text" value={editForm.favDrink} onChange={(e) => setEditForm({ ...editForm, favDrink: e.target.value })} style={{ width: "100%", padding: 6, marginTop: 4 }} />
                ) : (
                  <p style={{ margin: "4px 0", color: "#555" }}>{selectedCustomer.favDrink || "None Listed"}</p>
                )}
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <strong>Address:</strong>
                {isEditing ? (
                  <input type="text" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} style={{ width: "100%", padding: 6, marginTop: 4 }} />
                ) : (
                  <p style={{ margin: "4px 0", color: "#555" }}>{selectedCustomer.address || "No saved address found"}</p>
                )}
              </div>
              <div>
                <strong>Joined Date:</strong>
                <p style={{ margin: "4px 0", color: "#555" }}>
                  {selectedCustomer.createdAt?.seconds ? new Date(selectedCustomer.createdAt.seconds * 1000).toLocaleDateString() : "Historical Account"}
                </p>
              </div>
              <div>
                <strong>Last Login Active:</strong>
                <p style={{ margin: "4px 0", color: "#555" }}>
                  {selectedCustomer.lastLogin?.seconds ? new Date(selectedCustomer.lastLogin.seconds * 1000).toLocaleString() : "Not Tracked"}
                </p>
              </div>
            </div>

            {/* Tabbed Navigation Structure */}
            <div style={{ display: "flex", borderBottom: "2px solid #eee", marginBottom: 15 }}>
              {["orders", "rewards", "coupons"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    flex: 1,
                    padding: 12,
                    background: "none",
                    border: "none",
                    borderBottom: activeTab === tab ? "3px solid #3B1A08" : "none",
                    color: activeTab === tab ? "#3B1A08" : "#888",
                    fontWeight: activeTab === tab ? "bold" : "normal",
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {tab === "orders" ? "Recent Orders" : tab === "rewards" ? "Reward History" : "Coupon History"}
                </button>
              ))}
            </div>

            {/* Dynamic Tab Sub-Display Elements */}
            <div style={{ fontSize: 14, color: "#555", minHeight: 150 }}>
              {activeTab === "orders" && (
                <div>
                  {selectedCustomer.recentOrders && selectedCustomer.recentOrders.length > 0 ? (
                    selectedCustomer.recentOrders.map((order, idx) => (
                      <div key={idx} style={{ padding: "10px 0", borderBottom: "1px solid #f5f5f5" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                          <span>Order #{order.id || idx + 1001}</span>
                          <span>₹{order.amount || 0}</span>
                        </div>
                        <div style={{ fontSize: 12, color: "#888" }}>{order.items || "Beverage items custom batch"} • {order.date || "Just recently"}</div>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: "#aaa", fontStyle: "italic" }}>No orders logged for this user yet.</p>
                  )}
                </div>
              )}

              {activeTab === "rewards" && (
                <div>
                  {selectedCustomer.rewardHistory && selectedCustomer.rewardHistory.length > 0 ? (
                    selectedCustomer.rewardHistory.map((log, idx) => (
                      <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f5f5f5" }}>
                        <span>{log.reason || "Points Accumulation Log"}</span>
                        <span style={{ color: log.points >= 0 ? "green" : "red", fontWeight: "bold" }}>{log.points >= 0 ? `+${log.points}` : log.points} pts</span>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: "#aaa", fontStyle: "italic" }}>No rewards point transactional logs found.</p>
                  )}
                </div>
              )}

              {activeTab === "coupons" && (
                <div>
                  {selectedCustomer.couponHistory && selectedCustomer.couponHistory.length > 0 ? (
                    selectedCustomer.couponHistory.map((coupon, idx) => (
                      <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f5f5f5" }}>
                        <span>Code: <strong style={{ color: "#3B1A08" }}>{coupon.code || "CAFE50"}</strong></span>
                        <span style={{ fontSize: 12, color: coupon.used ? "#C62828" : "#2E7D32" }}>{coupon.used ? "Redeemed" : "Available"}</span>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: "#aaa", fontStyle: "italic" }}>No issued discount profile codes assigned.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
