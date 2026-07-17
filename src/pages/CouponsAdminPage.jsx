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
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

export default function CouponsAdminPage({ setPage }) {
  const [coupons, setCoupons] = useState([]);
  const [sortBy, setSortBy] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

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

  // --- LOGIC RUNNING CALCULATIONS ---
  const totalUses = coupons.reduce((sum, c) => sum + (c.usageCount || 0), 0);
  const totalPossibleUses = coupons.reduce((sum, c) => sum + (c.usageLimit || 0), 0);
  const redemptionRate = totalPossibleUses > 0 ? ((totalUses / totalPossibleUses) * 100).toFixed(1) : 0;
  const totalDiscount = coupons.reduce((sum, c) => sum + (c.totalDiscountGiven || 0), 0);
  const totalRevenue = coupons.reduce((sum, c) => sum + (c.totalRevenue || 0), 0);

  const mostUsed =
    coupons.length > 0
      ? [...coupons].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))[0]
      : null;

  const couponTypes = ["General", "New User", "Festival", "Birthday", "Referral", "Loyalty"];

  const categoryData = couponTypes.map((type) => ({
    name: type,
    value: coupons.filter((c) => (c.category || "General") === type).length,
  }));

  const usageData = [...coupons]
    .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))
    .map((coupon) => ({
      name: coupon.code,
      uses: coupon.usageCount || 0,
    }));

  // --- DATABASE OPERATIONS ---
  async function loadCoupons() {
    try {
      const snapshot = await getDocs(collection(db, "coupons"));
      setCoupons(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Error loading coupons:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCoupons();
  }, []);

  async function addCoupon() {
    if (!newCoupon.code || !newCoupon.value || !newCoupon.minOrder) {
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

  // --- SUB-DESIGN HELPER RENDERS ---
  function StatCard({ title, value, color, icon }) {
    return (
      <div
        style={{
          background: "#fff",
          padding: "24px",
          borderRadius: "16px",
          boxShadow: "0 4px 20px rgba(196, 149, 106, 0.05), 0 1px 3px rgba(0,0,0,0.02)",
          border: "1px solid rgba(230, 220, 210, 0.4)",
          display: "flex",
          alignItems: "center",
          gap: "20px",
        }}
      >
        <div style={{ fontSize: "36px", background: `${color}12`, padding: "12px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {icon}
        </div>
        <div>
          <p style={{ color: "#7A7570", margin: "0 0 4px 0", fontSize: "14px", fontWeight: "500", textTransform: "uppercase", letterSpacing: "0.5px" }}>{title}</p>
          <h2 style={{ margin: 0, color: "#2C2520", fontSize: "26px", fontWeight: "700" }}>{value}</h2>
        </div>
      </div>
    );
  }

  function getCategoryColor(category) {
    switch (category) {
      case "New User": return { bg: "#E3F2FD", color: "#1565C0" };
      case "Festival": return { bg: "#FFF3E0", color: "#EF6C00" };
      case "Birthday": return { bg: "#FCE4EC", color: "#C2185B" };
      case "Referral": return { bg: "#E8F5E9", color: "#2E7D32" };
      case "Loyalty": return { bg: "#F3E5F5", color: "#6A1B9A" };
      default: return { bg: "#ECEFF1", color: "#455A64" };
    }
  }

  function getExpiryStatus(expires) {
    if (!expires) return "Never Expires";
    const today = new Date();
    const expiry = new Date(expires);
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    const days = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

    if (days < 0) return `❌ Expired ${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} ago`;
    if (days === 0) return "⚠️ Expires Today";
    if (days === 1) return "⏳ Expires Tomorrow";
    return `⏳ Expires in ${days} days`;
  }

  const COLORS = ["#C4956A", "#4F46E5", "#2E7D32", "#F59E0B", "#EC4899", "#06B6D4"];

  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "10px",
    border: "1px solid #E6DCD2",
    background: "#FCFBFA",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    transition: "all 0.2s",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "6px",
    fontSize: "13px",
    fontWeight: "600",
    color: "#5C544E",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#FAF7F2", padding: "40px 4%", fontFamily: "system-ui, sans-serif" }}>
      
      {/* Top Header Row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "35px" }}>
        <div>
          <button 
            onClick={() => setPage("admin")}
            style={{ background: "#none", border: "1px solid #E6DCD2", background: "#fff", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: "500", color: "#5C544E", marginBottom: "12px" }}
          >
            ← Back to Dashboard
          </button>
          <h1 style={{ fontFamily: "Playfair Display, serif", margin: "10px 0 0 0", fontSize: "32px", color: "#2C2520" }}>
            🎟 Coupon Management
          </h1>
        </div>
      </div>

      {/* Analytics Dashboard Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px", marginBottom: "35px" }}>
        <StatCard title="Total Coupons" value={coupons.length} color="#3B1A08" icon="🎟" />
        <StatCard title="Active Coupons" value={coupons.filter(c => c.active).length} color="#2E7D32" icon="✅" />
        <StatCard title="Total Redemptions" value={totalUses} color="#C4956A" icon="🔥" />
        <StatCard title="Total Revenue" value={`₹${totalRevenue}`} color="#009688" icon="💰" />
        <StatCard title="Discount Distributed" value={`₹${totalDiscount}`} color="#4F46E5" icon="💸" />
        <StatCard title="Redemption Efficiency" value={`${redemptionRate}%`} color="#FF9800" icon="📈" />
      </div>

      {/* Top Insights & Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "25px", marginBottom: "40px" }}>
        
        {/* Most Used Banner / Quick Info */}
        {mostUsed ? (
          <div style={{ background: "linear-gradient(135deg, #3B1A08 0%, #2C1406 100%)", borderRadius: "20px", padding: "30px", color: "#fff", boxShadow: "0 10px 25px rgba(59,26,8,0.15)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <span style={{ textTransform: "uppercase", letterSpacing: "1.5px", fontSize: "12px", color: "#C4956A", fontWeight: "700" }}>🏆 Top Performing Campaign</span>
            <h1 style={{ fontSize: "42px", margin: "10px 0", letterSpacing: "1px", fontFamily: "monospace" }}>{mostUsed.code}</h1>
            <p style={{ margin: 0, fontSize: "16px", color: "#E6DCD2" }}>
              This coupon code has been redeemed <strong style={{ color: "#FFF", fontSize: "20px" }}>{mostUsed.usageCount || 0}</strong> times across transactions.
            </p>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "20px", padding: "30px", border: "1px solid #E6DCD2", display: "flex", alignItems: "center", justifyContent: "center", color: "#7A7570" }}>
            No campaign data available yet.
          </div>
        )}

        {/* Categories Pie Chart */}
        <div style={{ background: "#fff", borderRadius: "20px", padding: "24px", boxShadow: "0 4px 20px rgba(0,0,0,0.03)", border: "1px solid #E6DCD2" }}>
          <h3 style={{ margin: "0 0 15px 0", color: "#2C2520", fontSize: "18px" }}>🥧 Distribution by Category</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={categoryData} dataKey="value" nameKey="name" outerRadius={70} innerRadius={45} paddingAngle={4}>
                {categoryData.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend iconSize={8} layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: "12px" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Usage Trend Line Chart */}
        <div style={{ background: "#fff", borderRadius: "20px", padding: "24px", boxShadow: "0 4px 20px rgba(0,0,0,0.03)", border: "1px solid #E6DCD2" }}>
          <h3 style={{ margin: "0 0 15px 0", color: "#2C2520", fontSize: "18px" }}>📈 Volume Usage Curve</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={usageData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE4" />
              <XAxis dataKey="name" stroke="#A39C96" style={{ fontSize: "11px" }} />
              <YAxis stroke="#A39C96" style={{ fontSize: "11px" }} />
              <Tooltip />
              <Line type="monotone" dataKey="uses" stroke="#C4956A" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* Main Core Work Area */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "30px", alignItems: "start" }}>
        
        {/* Creator / Editor Column Forms */}
        <div>
          {/* Creator Form Panel */}
          <div style={{ background: "#fff", borderRadius: "20px", padding: "28px", boxShadow: "0 4px 25px rgba(0,0,0,0.03)", border: "1px solid #E6DCD2", marginBottom: "30px" }}>
            <h2 style={{ margin: "0 0 20px 0", fontFamily: "Playfair Display, serif", color: "#2C2520", borderBottom: "2px solid #FAF7F2", paddingBottom: "10px" }}>✨ Create New Coupon</h2>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
              <div>
                <label style={labelStyle}>Coupon Code *</label>
                <input style={inputStyle} placeholder="e.g. SUMMER50" value={newCoupon.code} onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={labelStyle}>Category</label>
                  <select style={inputStyle} value={newCoupon.category} onChange={(e) => setNewCoupon({ ...newCoupon, category: e.target.value })}>
                    <option value="General">🏷 General</option>
                    <option value="New User">👤 New User</option>
                    <option value="Festival">🎉 Festival</option>
                    <option value="Birthday">🎂 Birthday</option>
                    <option value="Referral">🤝 Referral</option>
                    <option value="Loyalty">💎 Loyalty</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Usage Allocation</label>
                  <select style={inputStyle} value={newCoupon.singleUse ? "single" : "multi"} onChange={(e) => setNewCoupon({ ...newCoupon, singleUse: e.target.value === "single" })}>
                    <option value="multi">🔄 Multi Use</option>
                    <option value="single">1️⃣ Single Use</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={labelStyle}>Discount Rules</label>
                  <select style={inputStyle} value={newCoupon.type} onChange={(e) => setNewCoupon({ ...newCoupon, type: e.target.value })}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Discount Value *</label>
                  <input type="number" style={inputStyle} placeholder={newCoupon.type === "percentage" ? "% Value" : "₹ Value"} value={newCoupon.value} onChange={(e) => setNewCoupon({ ...newCoupon, value: e.target.value })} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={labelStyle}>Min Order (₹) *</label>
                  <input type="number" style={inputStyle} placeholder="Minimum threshold" value={newCoupon.minOrder} onChange={(e) => setNewCoupon({ ...newCoupon, minOrder: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Max Discount (₹)</label>
                  <input type="number" style={inputStyle} placeholder="Cap value" value={newCoupon.maxDiscount} onChange={(e) => setNewCoupon({ ...newCoupon, maxDiscount: e.target.value })} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={labelStyle}>Total Cap Limit</label>
                  <input type="number" style={inputStyle} placeholder="Total uses (0 for ∞)" value={newCoupon.usageLimit} onChange={(e) => setNewCoupon({ ...newCoupon, usageLimit: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Per User Limit</label>
                  <input type="number" style={inputStyle} placeholder="Limit per account" value={newCoupon.perUserLimit} onChange={(e) => setNewCoupon({ ...newCoupon, perUserLimit: e.target.value })} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={labelStyle}>Starts From</label>
                  <input type="date" style={inputStyle} value={newCoupon.starts} onChange={(e) => setNewCoupon({ ...newCoupon, starts: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Expiry Date</label>
                  <input type="date" style={inputStyle} value={newCoupon.expires} onChange={(e) => setNewCoupon({ ...newCoupon, expires: e.target.value })} />
                </div>
              </div>

              <button
                onClick={addCoupon}
                style={{ background: "#3B1A08", color: "#fff", border: "none", padding: "14px", borderRadius: "10px", cursor: "pointer", fontWeight: "600", fontSize: "15px", marginTop: "10px", boxShadow: "0 4px 12px rgba(59,26,8,0.15)" }}
              >
                ➕ Create Campaign Coupon
              </button>
            </div>
          </div>

          {/* Editing Mode Panel */}
          {editing && (
            <div style={{ background: "#fff", borderRadius: "20px", padding: "28px", boxShadow: "0 10px 30px rgba(0,0,0,0.06)", border: "2px solid #C4956A" }}>
              <h2 style={{ margin: "0 0 20px 0", fontFamily: "Playfair Display, serif", color: "#2C2520" }}>✏️ Edit Campaign: {editing.code}</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
                
                <div>
                  <label style={labelStyle}>Coupon Code</label>
                  <input style={inputStyle} value={editCoupon.code} onChange={(e) => setEditCoupon({ ...editCoupon, code: e.target.value.toUpperCase() })} placeholder="Coupon Code" />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={labelStyle}>Type</label>
                    <select style={inputStyle} value={editCoupon.type} onChange={(e) => setEditCoupon({ ...editCoupon, type: e.target.value })}>
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Category</label>
                    <select style={inputStyle} value={editCoupon.category} onChange={(e) => setEditCoupon({ ...editCoupon, category: e.target.value })}>
                      <option value="General">General</option>
                      <option value="New User">New User</option>
                      <option value="Festival">Festival</option>
                      <option value="Birthday">Birthday</option>
                      <option value="Referral">Referral</option>
                      <option value="Loyalty">Loyalty</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={labelStyle}>Discount Value</label>
                    <input type="number" style={inputStyle} placeholder="Value" value={editCoupon.value} onChange={(e) => setEditCoupon({ ...editCoupon, value: e.target.value })} />
                  </div>
                  <div>
                    <label style={labelStyle}>Max Discount (₹)</label>
                    <input type="number" style={inputStyle} placeholder="Max Discount" value={editCoupon.maxDiscount} onChange={(e) => setEditCoupon({ ...editCoupon, maxDiscount: e.target.value })} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={labelStyle}>Min Order</label>
                    <input type="number" style={inputStyle} placeholder="Min Order" value={editCoupon.minOrder} onChange={(e) => setEditCoupon({ ...editCoupon, minOrder: e.target.value })} />
                  </div>
                  <div>
                    <label style={labelStyle}>Allocation</label>
                    <select style={inputStyle} value={editCoupon.singleUse ? "single" : "multi"} onChange={(e) => setEditCoupon({ ...editCoupon, singleUse: e.target.value === "single" })}>
                      <option value="multi">🔄 Multi Use</option>
                      <option value="single">1️⃣ Single Use</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={labelStyle}>Global Usage Cap</label>
                    <input type="number" style={inputStyle} placeholder="Usage Limit" value={editCoupon.usageLimit} onChange={(e) => setEditCoupon({ ...editCoupon, usageLimit: e.target.value })} />
                  </div>
                  <div>
                    <label style={labelStyle}>Per User Cap</label>
                    <input type="number" min="1" style={inputStyle} placeholder="Per User Limit" value={editCoupon.perUserLimit} onChange={(e) => setEditCoupon({ ...editCoupon, perUserLimit: e.target.value })} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={labelStyle}>Starts From</label>
                    <input type="date" style={inputStyle} value={editCoupon.starts} onChange={(e) => setEditCoupon({ ...editCoupon, starts: e.target.value })} />
                  </div>
                  <div>
                    <label style={labelStyle}>Expires</label>
                    <input type="date" style={inputStyle} value={editCoupon.expires} onChange={(e) => setEditCoupon({ ...editCoupon, expires: e.target.value })} />
                  </div>
                </div>

                <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
                  <button onClick={updateCoupon} style={{ flex: 1, background: "#2E7D32", color: "#fff", border: "none", padding: "12px", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}>
                    💾 Save Changes
                  </button>
                  <button onClick={() => setEditing(null)} style={{ flex: 1, background: "#FCFBFA", color: "#5C544E", border: "1px solid #E6DCD2", padding: "12px", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Display Coupons Section */}
        <div style={{ gridColumn: "span 2" }}>
          
          {/* Controls Hub Card (Search, Filters, Sorters) */}
          <div style={{ background: "#fff", borderRadius: "20px", padding: "20px", boxShadow: "0 4px 20px rgba(0,0,0,0.02)", border: "1px solid #E6DCD2", marginBottom: "25px", display: "flex", gap: "15px", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: "260px" }}>
              <input type="text" placeholder="🔍 Search coupon campaigns by code..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...inputStyle, background: "#FAF8F5", padding: "14px 18px" }} />
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ ...inputStyle, width: "140px", background: "#fff" }}>
                <option value="All">🌐 All States</option>
                <option value="Active">🟢 Active Only</option>
                <option value="Disabled">🔴 Disabled Only</option>
                <option value="Expired">⌛ Expired Only</option>
              </select>

              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ ...inputStyle, width: "180px", background: "#fff" }}>
                <option value="newest">📅 Newest Created</option>
                <option value="code">🔤 Code (A-Z)</option>
                <option value="used">🔥 Highest Usage</option>
                <option value="expiry">⏳ Expiring First</option>
              </select>
            </div>
          </div>

          {/* Cards Dynamic View Engine Container */}
          <h2 style={{ fontFamily: "Playfair Display, serif", marginBottom: "20px", color: "#2C2520", display: "flex", alignItems: "center", gap: "10px" }}>
            📋 Active Repository Portfolio 
            <span style={{ fontSize: "14px", background: "#E6DCD2", padding: "4px 10px", borderRadius: "20px", fontFamily: "sans-serif", color: "#5C544E" }}>
              {coupons.length} total
            </span>
          </h2>

          {loading ? (
            <div style={{ textAlign: "center", padding: "60px", color: "#7A7570" }}>
              <p style={{ fontSize: "18px", fontWeight: "500" }}>Synchronizing with database engine...</p>
            </div>
          ) : coupons.length === 0 ? (
            <div style={{ background: "#fff", padding: "50px", borderRadius: "20px", textAlign: "center", border: "1px solid #E6DCD2" }}>
              <h3 style={{ margin: "0 0 10px 0", color: "#2C2520" }}>No coupon configurations stored yet</h3>
              <p style={{ color: "#7A7570", margin: 0 }}>Deploy your tracking schema parameters using the creation board on the left.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: "20px" }}>
              {coupons
                .filter((coupon) => {
                  const matchesSearch = coupon.code.toLowerCase().includes(search.toLowerCase());
                  let matchesFilter = true;
                  if (filter === "Active") matchesFilter = coupon.active;
                  if (filter === "Disabled") matchesFilter = !coupon.active;
                  if (filter === "Expired") matchesFilter = coupon.expires && new Date(coupon.expires) < new Date();
                  return matchesSearch && matchesFilter;
                })
                .sort((a, b) => {
                  switch (sortBy) {
                    case "code": return a.code.localeCompare(b.code);
                    case "used": return (b.usageCount || 0) - (a.usageCount || 0);
                    case "expiry": return new Date(a.expires || "9999-12-31") - new Date(b.expires || "9999-12-31");
                    default: return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
                  }
                })
                .map((coupon) => {
                  const catBadge = getCategoryColor(coupon.category);
                  return (
                    <div
                      key={coupon.id}
                      style={{
                        background: "#fff",
                        borderRadius: "16px",
                        padding: "24px",
                        boxShadow: "0 4px 15px rgba(0,0,0,0.02)",
                        border: coupon.active ? "1px solid #E6DCD2" : "1px solid #F5ECEB",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        opacity: coupon.active ? 1 : 0.82,
                      }}
                    >
                      <div>
                        {/* Card Header row */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                          <div>
                            <h2 style={{ margin: "0 0 6px 0", fontFamily: "monospace", fontSize: "24px", color: "#2C2520", fontWeight: "700" }}>{coupon.code}</h2>
                            <span style={{ display: "inline-block", background: catBadge.bg, color: catBadge.color, padding: "3px 10px", borderRadius: "6px", fontWeight: "600", fontSize: "11px", textTransform: "uppercase" }}>
                              {coupon.category || "General"}
                            </span>
                          </div>

                          <span style={{ background: coupon.active ? "#E8F5E9" : "#FFEBEE", color: coupon.active ? "#2E7D32" : "#C62828", padding: "4px 10px", borderRadius: "20px", fontWeight: "700", fontSize: "12px" }}>
                            {coupon.active ? "● Active" : "○ Disabled"}
                          </span>
                        </div>

                        {/* Rules Metrics Fields */}
                        <div style={{ background: "#FCFBFA", padding: "12px 16px", borderRadius: "10px", margin: "14px 0", border: "1px solid #FAF7F2", fontSize: "14px" }}>
                          <p style={{ margin: "0 0 8px 0", color: "#5C544E" }}>
                            <strong>Benefit Matrix:</strong>{" "}
                            <span style={{ color: "#3B1A08", fontWeight: "600" }}>
                              {coupon.type === "percentage" ? `${coupon.value}% Off` : `₹${coupon.value} Off`}
                              {coupon.type === "percentage" && coupon.maxDiscount > 0 && ` (Max ₹${coupon.maxDiscount})`}
                            </span>
                          </p>
                          <p style={{ margin: "0 0 8px 0", color: "#5C544E" }}>
                            <strong>Min Order Requirement:</strong> ₹{coupon.minOrder}
                          </p>
                          <p style={{ margin: "0 0 8px 0", color: "#5C544E" }}>
                            <strong>Usage Vector Type:</strong> {coupon.singleUse ? "1️⃣ Single Global Use" : "🔄 Reusable Mechanism"}
                          </p>
                          <p style={{ margin: 0, color: "#5C544E" }}>
                            <strong>Identity Ceiling:</strong> {coupon.perUserLimit || 1} explicit redemption{coupon.perUserLimit > 1 ? "s" : ""} per user
                          </p>
                        </div>

                        {/* Usage Progression Tracking Bar */}
                        <div style={{ marginBottom: "16px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#7A7570", marginBottom: "4px" }}>
                            <span>Usage Volume Rate</span>
                            <strong>{coupon.usageCount || 0} / {coupon.usageLimit || "∞"}</strong>
                          </div>
                          <div style={{ width: "100%", height: "6px", background: "#ECEAE6", borderRadius: "10px", overflow: "hidden" }}>
                            <div 
                              style={{ 
                                height: "100%", 
                                background: coupon.active ? "#C4956A" : "#A39C96", 
                                width: coupon.usageLimit ? `${Math.min(((coupon.usageCount || 0) / coupon.usageLimit) * 100, 100)}%` : "4%" 
                              }} 
                            />
                          </div>
                        </div>

                        {/* Dates Area Footer */}
                        <div style={{ fontSize: "13px", color: "#5C544E", borderTop: "1px dashed #E6DCD2", paddingTop: "12px" }}>
                          <p style={{ margin: "0 0 4px 0" }}>📅 Start Window: <span style={{ color: "#2C2520" }}>{coupon.starts || "Immediate Activation"}</span></p>
                          <p style={{ margin: "0 0 8px 0" }}>📅 End Window: <span style={{ color: "#2C2520" }}>{coupon.expires || "Infinite Lifecycle"}</span></p>
                          <p style={{ margin: 0, fontWeight: "600", fontSize: "12px", color: coupon.expires && new Date(coupon.expires) < new Date() ? "#D32F2F" : "#7A5A3E" }}>
                            {getExpiryStatus(coupon.expires)}
                          </p>
                        </div>
                      </div>

                      {/* Control Operations Drawer Row */}
                      <div style={{ display: "flex", gap: "8px", marginTop: "20px", borderTop: "1px dashed #E6DCD2", paddingTop: "16px" }}>
                        <button
                          onClick={() => toggleCoupon(coupon)}
                          style={{ flex: 1, background: coupon.active ? "#F5A623" : "#2E7D32", color: "#fff", border: "none", padding: "10px", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}
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
                          style={{ flex: 1, background: "#FAF7F2", color: "#7A5A3E", border: "1px solid #E6DCD2", padding: "10px", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}
                        >
                          ✏️ Edit
                        </button>

                        <button
                          onClick={() => deleteCoupon(coupon.id)}
                          style={{ background: "#FFF0F0", color: "#D32F2F", border: "1px solid #FFD6D6", padding: "10px 14px", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}
                        >
                          🗑️
                        </button>
                      </div>

                    </div>
                  );
                })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
