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
  BarChart,
  Bar,
} from "recharts";

export default function CouponsAdminPage({ setPage }) {
  const [coupons, setCoupons] = useState([]);
  const [orders, setOrders] = useState([]); // Base repository for sales records
  const [sortBy, setSortBy] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  
  // Custom interactive interval switcher state for the sales chart
  const [revenueTimeframe, setRevenueTimeframe] = useState("30days");

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

  // --- 100% PRESERVED RETROACTIVE COUPON LOGIC ---
  const totalUses = coupons.reduce((sum, c) => sum + (c.usageCount || 0), 0);
  const totalPossibleUses = coupons.reduce((sum, c) => sum + (c.usageLimit || 0), 0);
  const redemptionRate = totalPossibleUses > 0 ? ((totalUses / totalPossibleUses) * 100).toFixed(1) : 0;
  const totalDiscount = coupons.reduce((sum, c) => sum + (c.totalDiscountGiven || 0), 0);
  const totalRevenueAttribute = coupons.reduce((sum, c) => sum + (c.totalRevenue || 0), 0);

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

  // --- NEW SALES ENGINE LOGIC ---
  // Calculates live "Sales Happened Today" count and total revenue generated today
  const salesTodayStats = orders.reduce(
    (stats, order) => {
      const orderDate = order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000) : null;
      if (orderDate) {
        const today = new Date();
        if (
          orderDate.getDate() === today.getDate() &&
          orderDate.getMonth() === today.getMonth() &&
          orderDate.getFullYear() === today.getFullYear()
        ) {
          stats.count += 1;
          stats.revenue += Number(order.totalPrice || 0);
        }
      }
      return stats;
    },
    { count: 0, revenue: 0 }
  );

  // Computes the dynamic filtered time series for revenue analytics chart
  const getFilteredRevenueData = () => {
    const now = new Date();
    let cutoffLimitMs = 30 * 24 * 60 * 60 * 1000; // default 30 days
    let groupingKey = "date"; // 'date' string or 'hour' tracker

    if (revenueTimeframe === "14days") cutoffLimitMs = 14 * 24 * 60 * 60 * 1000;
    else if (revenueTimeframe === "7days") cutoffLimitMs = 7 * 24 * 60 * 60 * 1000;
    else if (revenueTimeframe === "3days") cutoffLimitMs = 3 * 24 * 60 * 60 * 1000;
    else if (revenueTimeframe === "48hrs") { cutoffLimitMs = 48 * 60 * 60 * 1000; groupingKey = "hour"; }
    else if (revenueTimeframe === "24hrs") { cutoffLimitMs = 24 * 60 * 60 * 1000; groupingKey = "hour"; }

    const cutoffDate = new Date(now.getTime() - cutoffLimitMs);

    // Map-reduce filter logs
    const filtered = orders.filter((o) => {
      const oDate = o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000) : null;
      return oDate && oDate >= cutoffDate;
    });

    // Grouping by date/hour structure aggregates
    const aggregations = {};
    filtered.forEach((order) => {
      const oDate = new Date(order.createdAt.seconds * 1000);
      const key = groupingKey === "date" 
        ? oDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })
        : `${oDate.getHours()}:00`;

      aggregations[key] = (aggregations[key] || 0) + Number(order.totalPrice || 0);
    });

    return Object.keys(aggregations).map((key) => ({
      label: key,
      amount: aggregations[key],
    }));
  };

  const revenueDataTimeline = getFilteredRevenueData();

  // Combined calculations for the total historical sales record collection revenue
  const totalSalesRevenueCollection = orders.reduce((sum, o) => sum + Number(o.totalPrice || 0), 0);

  // --- UNTOUCHED INITIAL LIFECYCLE AND DB ENGINE DEPENDENCIES ---
  async function loadData() {
    try {
      // Pull configurations
      const couponSnapshot = await getDocs(collection(db, "coupons"));
      setCoupons(couponSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      
      // Pull dynamic checkout records tracking collection
      const orderSnapshot = await getDocs(collection(db, "orders"));
      setOrders(orderSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Critical dashboard sync compilation crash:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
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

    loadData();
    alert("Coupon created successfully!");
  }

  async function deleteCoupon(id) {
    if (!window.confirm("Delete this coupon?")) return;
    await deleteDoc(doc(db, "coupons", id));
    loadData();
  }

  async function toggleCoupon(coupon) {
    await updateDoc(doc(db, "coupons", coupon.id), {
      active: !coupon.active,
    });
    loadData();
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
    loadData();
  }

  // --- RENDER DESIGN SHEETS ---
  function StatCard({ title, value, color, icon, highlight }) {
    return (
      <div
        style={{
          background: highlight ? "linear-gradient(135deg, #3B1A08 0%, #522711 100%)" : "#fff",
          padding: "24px",
          borderRadius: "16px",
          boxShadow: "0 4px 20px rgba(196, 149, 106, 0.05)",
          border: highlight ? "none" : "1px solid rgba(230, 220, 210, 0.4)",
          display: "flex",
          alignItems: "center",
          gap: "20px",
        }}
      >
        <div style={{ fontSize: "32px", background: highlight ? "rgba(255,255,255,0.12)" : `${color}12`, padding: "12px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {icon}
        </div>
        <div>
          <p style={{ color: highlight ? "#C4956A" : "#7A7570", margin: "0 0 4px 0", fontSize: "13px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>{title}</p>
          <h2 style={{ margin: 0, color: highlight ? "#fff" : "#2C2520", fontSize: "24px", fontWeight: "700" }}>{value}</h2>
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
      
      {/* Header Row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "35px" }}>
        <div>
          <button 
            onClick={() => setPage("admin")}
            style={{ border: "1px solid #E6DCD2", background: "#fff", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: "500", color: "#5C544E" }}
          >
            ← Back to Dashboard
          </button>
          <h1 style={{ fontFamily: "Playfair Display, serif", margin: "14px 0 0 0", fontSize: "32px", color: "#2C2520" }}>
            📊 Enterprise Operations Panel
          </h1>
        </div>
      </div>

      {/* CORE LIVE TRANSACTIONAL SALES HUD */}
      <h3 style={{ margin: "0 0 15px 0", color: "#7A5A3E", textTransform: "uppercase", letterSpacing: "1px", fontSize: "14px", fontWeight: "700" }}>
        ⚡ Live Sales Engine Dashboard
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px", marginBottom: "35px" }}>
        <StatCard title="Sales Confirmed Today" value={`${salesTodayStats.count} Orders`} color="#4F46E5" icon="🛍️" highlight={true} />
        <StatCard title="Revenue Captured Today" value={`₹${salesTodayStats.revenue}`} color="#009688" icon="⚡" />
        <StatCard title="All-Time Total Revenue" value={`₹${totalSalesRevenueCollection}`} color="#2E7D32" icon="💼" />
        <StatCard title="System Active Coupons" value={coupons.filter(c => c.active).length} color="#C4956A" icon="🎟️" />
      </div>

      {/* REVENUE GRAPH AND BREAKDOWNS MATRIX CHART ROW */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: "25px", marginBottom: "40px" }}>
        
        {/* Dynamic Interval Revenue Track Card */}
        <div style={{ background: "#fff", borderRadius: "20px", padding: "24px", boxShadow: "0 4px 20px rgba(0,0,0,0.03)", border: "1px solid #E6DCD2" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
            <h3 style={{ margin: 0, color: "#2C2520", fontSize: "18px" }}>💰 Gross Revenue Distribution</h3>
            
            <select 
              value={revenueTimeframe} 
              onChange={(e) => setRevenueTimeframe(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #E6DCD2", fontSize: "13px", background: "#FCFBFA", fontWeight: "600", color: "#3B1A08", cursor: "pointer" }}
            >
              <option value="30days">📅 Last 30 Days</option>
              <option value="14days">📅 Last 14 Days</option>
              <option value="7days">📅 Last 7 Days</option>
              <option value="3days">📆 Last 3 Days</option>
              <option value="48hrs">⏳ Last 48 Hours</option>
              <option value="24hrs">⏳ Last 24 Hours</option>
            </select>
          </div>

          {revenueDataTimeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={revenueDataTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE4" />
                <XAxis dataKey="label" stroke="#A39C96" style={{ fontSize: "11px" }} />
                <YAxis stroke="#A39C96" style={{ fontSize: "11px" }} />
                <Tooltip formatter={(value) => [`₹${value}`, "Revenue"]} />
                <Bar dataKey="amount" fill="#3B1A08" borderRadius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: "240px", display: "flex", alignItems: "center", justifyContent: "center", color: "#A39C96", fontSize: "14px" }}>
              No sales logged within selected interval window parameters.
            </div>
          )}
        </div>

        {/* Existing Coupon Category Allocation Chart */}
        <div style={{ background: "#fff", borderRadius: "20px", padding: "24px", boxShadow: "0 4px 20px rgba(0,0,0,0.03)", border: "1px solid #E6DCD2" }}>
          <h3 style={{ margin: "0 0 15px 0", color: "#2C2520", fontSize: "18px" }}>🎟️ Coupon Allocation Mix</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={categoryData} dataKey="value" nameKey="name" outerRadius={80} innerRadius={55} paddingAngle={4}>
                {categoryData.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend iconSize={8} layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: "12px" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* RETROACTIVE SECONDARY METRICS SUB-DRAWER HUD */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "35px" }}>
        <StatCard title="Redemptions Total" value={totalUses} color="#C4956A" icon="🔥" />
        <StatCard title="Coupon Discounts Given" value={`₹${totalDiscount}`} color="#4F46E5" icon="💸" />
        <StatCard title="Redemption Efficiency" value={`${redemptionRate}%`} color="#FF9800" icon="📈" />
        <StatCard title="Attached Coupon Value" value={`₹${totalRevenueAttribute}`} color="#009688" icon="🏷️" />
      </div>

      {/* Main Form Fields Core Area Split Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "30px", alignItems: "start" }}>
        
        <div>
          {/* Create Card Form */}
          <div style={{ background: "#fff", borderRadius: "20px", padding: "28px", border: "1px solid #E6DCD2", marginBottom: "30px" }}>
            <h2 style={{ margin: "0 0 20px 0", fontFamily: "Playfair Display, serif", color: "#2C2520", borderBottom: "2px solid #FAF7F2", paddingBottom: "10px" }}>✨ Create New Coupon</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
              <div>
                <label style={labelStyle}>Coupon Code *</label>
                <input style={inputStyle} placeholder="SUMMER50" value={newCoupon.code} onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })} />
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
                  <label style={labelStyle}>Usage Setup</label>
                  <select style={inputStyle} value={newCoupon.singleUse ? "single" : "multi"} onChange={(e) => setNewCoupon({ ...newCoupon, singleUse: e.target.value === "single" })}>
                    <option value="multi">🔄 Multi Use</option>
                    <option value="single">1️⃣ Single Use</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={labelStyle}>Discount Type</label>
                  <select style={inputStyle} value={newCoupon.type} onChange={(e) => setNewCoupon({ ...newCoupon, type: e.target.value })}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Discount Value *</label>
                  <input type="number" style={inputStyle} value={newCoupon.value} onChange={(e) => setNewCoupon({ ...newCoupon, value: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={labelStyle}>Min Order (₹) *</label>
                  <input type="number" style={inputStyle} value={newCoupon.minOrder} onChange={(e) => setNewCoupon({ ...newCoupon, minOrder: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Max Discount (₹)</label>
                  <input type="number" style={inputStyle} value={newCoupon.maxDiscount} onChange={(e) => setNewCoupon({ ...newCoupon, maxDiscount: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={labelStyle}>Global Cap</label>
                  <input type="number" style={inputStyle} value={newCoupon.usageLimit} onChange={(e) => setNewCoupon({ ...newCoupon, usageLimit: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Per User Limit</label>
                  <input type="number" style={inputStyle} value={newCoupon.perUserLimit} onChange={(e) => setNewCoupon({ ...newCoupon, perUserLimit: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={labelStyle}>Valid From</label>
                  <input type="date" style={inputStyle} value={newCoupon.starts} onChange={(e) => setNewCoupon({ ...newCoupon, starts: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Expiry Date</label>
                  <input type="date" style={inputStyle} value={newCoupon.expires} onChange={(e) => setNewCoupon({ ...newCoupon, expires: e.target.value })} />
                </div>
              </div>
              <button onClick={addCoupon} style={{ background: "#3B1A08", color: "#fff", border: "none", padding: "14px", borderRadius: "10px", cursor: "pointer", fontWeight: "600", fontSize: "14px", marginTop: "10px" }}>
                ➕ Create Coupon Rule
              </button>
            </div>
          </div>

          {/* Edit Card Form */}
          {editing && (
            <div style={{ background: "#fff", borderRadius: "20px", padding: "28px", border: "2px solid #C4956A" }}>
              <h2 style={{ margin: "0 0 20px 0", fontFamily: "Playfair Display, serif" }}>✏️ Edit Code: {editing.code}</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
                <input style={inputStyle} value={editCoupon.code} onChange={(e) => setEditCoupon({ ...editCoupon, code: e.target.value.toUpperCase() })} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <select style={inputStyle} value={editCoupon.type} onChange={(e) => setEditCoupon({ ...editCoupon, type: e.target.value })}>
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                  <select style={inputStyle} value={editCoupon.category} onChange={(e) => setEditCoupon({ ...editCoupon, category: e.target.value })}>
                    <option value="General">General</option>
                    <option value="New User">New User</option>
                    <option value="Festival">Festival</option>
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <input type="number" style={inputStyle} value={editCoupon.value} onChange={(e) => setEditCoupon({ ...editCoupon, value: e.target.value })} />
                  <input type="number" style={inputStyle} value={editCoupon.maxDiscount} onChange={(e) => setEditCoupon({ ...editCoupon, maxDiscount: e.target.value })} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <input type="number" style={inputStyle} value={editCoupon.minOrder} onChange={(e) => setEditCoupon({ ...editCoupon, minOrder: e.target.value })} />
                  <select style={inputStyle} value={editCoupon.singleUse ? "single" : "multi"} onChange={(e) => setEditCoupon({ ...editCoupon, singleUse: e.target.value === "single" })}>
                    <option value="multi">Multi Use</option>
                    <option value="single">Single Use</option>
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <input type="number" style={inputStyle} value={editCoupon.usageLimit} onChange={(e) => setEditCoupon({ ...editCoupon, usageLimit: e.target.value })} />
                  <input type="number" style={inputStyle} value={editCoupon.perUserLimit} onChange={(e) => setEditCoupon({ ...editCoupon, perUserLimit: e.target.value })} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <input type="date" style={inputStyle} value={editCoupon.starts} onChange={(e) => setEditCoupon({ ...editCoupon, starts: e.target.value })} />
                  <input type="date" style={inputStyle} value={editCoupon.expires} onChange={(e) => setEditCoupon({ ...editCoupon, expires: e.target.value })} />
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                  <button onClick={updateCoupon} style={{ flex: 1, background: "#2E7D32", color: "#fff", border: "none", padding: "12px", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}>💾 Save</button>
                  <button onClick={() => setEditing(null)} style={{ flex: 1, background: "#fff", border: "1px solid #E6DCD2", borderRadius: "8px", cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Coupon Render Output Grid Array */}
        <div style={{ gridColumn: "span 2" }}>
          <div style={{ background: "#fff", borderRadius: "20px", padding: "20px", border: "1px solid #E6DCD2", marginBottom: "25px", display: "flex", gap: "15px", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "260px" }}>
              <input type="text" placeholder="🔍 Search matching criteria code indexes..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...inputStyle, background: "#FAF8F5" }} />
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ ...inputStyle, width: "140px" }}>
                <option value="All">All States</option>
                <option value="Active">Active Only</option>
                <option value="Disabled">Disabled Only</option>
              </select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ ...inputStyle, width: "160px" }}>
                <option value="newest">Newest Created</option>
                <option value="code">Code (A-Z)</option>
                <option value="used">Highest Usage</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: "20px" }}>
            {coupons
              .filter((c) => c.code.toLowerCase().includes(search.toLowerCase()) && (filter === "All" || (filter === "Active" ? c.active : !c.active)))
              .sort((a, b) => sortBy === "code" ? a.code.localeCompare(b.code) : sortBy === "used" ? (b.usageCount || 0) - (a.usageCount || 0) : (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
              .map((coupon) => (
                <div key={coupon.id} style={{ background: "#fff", borderRadius: "16px", padding: "24px", border: "1px solid #E6DCD2", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px" }}>
                      <h2 style={{ margin: 0, fontFamily: "monospace", fontSize: "22px", color: "#2C2520" }}>{coupon.code}</h2>
                      <span style={{ background: coupon.active ? "#E8F5E9" : "#FFEBEE", color: coupon.active ? "#2E7D32" : "#C62828", padding: "4px 10px", borderRadius: "20px", fontWeight: "700", fontSize: "12px" }}>
                        {coupon.active ? "Active" : "Disabled"}
                      </span>
                    </div>
                    <p style={{ fontSize: "14px", margin: "4px 0" }}><strong>Discount Matrix:</strong> {coupon.type === "percentage" ? `${coupon.value}%` : `₹${coupon.value}`}</p>
                    <p style={{ fontSize: "14px", margin: "4px 0" }}><strong>Min Threshold:</strong> ₹{coupon.minOrder}</p>
                    <p style={{ fontSize: "14px", margin: "4px 0" }}><strong>Usage Capacity:</strong> {coupon.usageCount || 0} / {coupon.usageLimit || "∞"}</p>
                    <p style={{ fontSize: "12px", color: "#7A7570", margin: "12px 0 0 0" }}>{getExpiryStatus(coupon.expires)}</p>
                  </div>
                  <div style={{ display: "flex", gap: "8px", marginTop: "20px", borderTop: "1px dashed #E6DCD2", paddingTop: "16px" }}>
                    <button onClick={() => toggleCoupon(coupon)} style={{ flex: 1, background: coupon.active ? "#F5A623" : "#2E7D32", color: "#fff", border: "none", padding: "8px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>{coupon.active ? "Disable" : "Enable"}</button>
                    <button onClick={() => { setEditing(coupon); setEditCoupon(coupon); }} style={{ flex: 1, background: "#FAF7F2", border: "1px solid #E6DCD2", padding: "8px", borderRadius: "6px", cursor: "pointer" }}>Edit</button>
                    <button onClick={() => deleteCoupon(coupon.id)} style={{ background: "#FFF0F0", color: "#D32F2F", border: "none", padding: "8px 12px", borderRadius: "6px", cursor: "pointer" }}>🗑️</button>
                  </div>
                </div>
              ))}
          </div>
        </div>

      </div>
    </div>
  );
}
