import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";
import * as XLSX from "xlsx";
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  LineChart, 
  Line 
} from "recharts";

export default function SupportAnalyticsManagement() {
  const [tickets, setTickets] = useState([]);
  const [dateFilter, setDateFilter] = useState("7days");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Listen to live updates from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "supportTickets"),
      (snapshot) => {
        setTickets(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
        );
      }
    );
    return unsubscribe;
  }, []);

  // Filter Tickets by Date Range
  const filteredTickets = tickets.filter(ticket => {
    if (!ticket.createdAt?.toDate) return false;
    const created = ticket.createdAt.toDate();
    const now = new Date();
    switch (dateFilter) {
      case "today":
        return created.toDateString() === now.toDateString();
      case "7days":
        return created >= new Date(now - 7 * 24 * 60 * 60 * 1000);
      case "30days":
        return created >= new Date(now - 30 * 24 * 60 * 60 * 1000);
      case "custom":
        if (!customStart || !customEnd) return true;
        const start = new Date(customStart);
        const end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
        return created >= start && created <= end;
      default:
        return true;
    }
  });

  // Calculate live statistics using filteredTickets
  const totalTickets = filteredTickets.length;
  const openTickets = filteredTickets.filter((t) => t.status === "Open").length;
  const pendingTickets = filteredTickets.filter((t) => t.status === "Pending").length;
  const closedTickets = filteredTickets.filter((t) => t.status === "Closed").length;
  const resolvedTickets = filteredTickets.filter((t) => t.status === "Resolved").length;
  
  const resolutionRate =
    totalTickets === 0
      ? 0
      : Math.round(((closedTickets + resolvedTickets) / totalTickets) * 100);

  // Calculate percentages for breakdown
  const openPercent = totalTickets === 0 ? 0 : Math.round((openTickets / totalTickets) * 100);
  const pendingPercent = totalTickets === 0 ? 0 : Math.round((pendingTickets / totalTickets) * 100);
  const resolvedPercent = totalTickets === 0 ? 0 : Math.round(((resolvedTickets + closedTickets) / totalTickets) * 100);

  // Calculate Category Analytics
  const categoryCounts = {};
  filteredTickets.forEach((ticket) => {
    const category = ticket.category || "Other";
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  });
  const categoryData = Object.entries(categoryCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const mostCommonCategory = categoryData.length > 0 ? categoryData[0].name : "--";

  // Calculate Priority Analytics
  const highPriority = filteredTickets.filter(t => (t.priority || "").toLowerCase() === "high").length;
  const normalPriority = filteredTickets.filter(t => (t.priority || "").toLowerCase() === "normal").length;
  const lowPriority = filteredTickets.filter(t => (t.priority || "").toLowerCase() === "low").length;
  const urgentPercent = totalTickets === 0 ? 0 : Math.round((highPriority / totalTickets) * 100);

  const priorityStats = {
    High: highPriority,
    Normal: normalPriority,
    Low: lowPriority
  };
  const priorityData = Object.entries(priorityStats).map(([name, value]) => ({ name, value }));

  // Calculate Response Time Analytics
  const respondedTickets = filteredTickets.filter(t => t.createdAt && t.firstResponseAt);
  const responseTimes = respondedTickets.map(ticket => {
    const created = ticket.createdAt.toDate();
    const replied = ticket.firstResponseAt.toDate();
    return (replied - created) / 60000;
  });

  const averageResponse = responseTimes.length ? (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(1) : "--";
  const fastestResponse = responseTimes.length ? Math.min(...responseTimes).toFixed(1) : "--";
  const slowestResponse = responseTimes.length ? Math.max(...responseTimes).toFixed(1) : "--";

  // Calculate Daily Ticket Trend (Using ISO date keys for robust sorting)
  const dailyData = {};
  filteredTickets.forEach(ticket => {
    if (!ticket.createdAt) return;
    const key = ticket.createdAt.toDate().toISOString().split("T")[0];
    dailyData[key] = (dailyData[key] || 0) + 1;
  });
  const sortedDailyEntries = Object.entries(dailyData).sort((a, b) => new Date(a[0]) - new Date(b[0]));
  const trendData = sortedDailyEntries.map(([dateKey, total]) => ({
    day: new Date(dateKey).toLocaleDateString(),
    total
  }));

  // Chart Status Data
  const statusData = [
    { name: "Open", value: openTickets },
    { name: "Pending", value: pendingTickets },
    { name: "Resolved/Closed", value: resolvedTickets + closedTickets }
  ];

  // Colors for Charts
  const COLORS = ["#C4956A", "#8B5E3C", "#E8DED2", "#2C221E", "#D97706"];

  // Calculate Customer Analytics
  const customerCounts = {};
  filteredTickets.forEach(ticket => {
    const name = ticket.customerName || ticket.customerEmail || "Unknown";
    customerCounts[name] = (customerCounts[name] || 0) + 1;
  });
  const topCustomers = Object.entries(customerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const repeatCustomers = Object.values(customerCounts)
    .filter(count => count > 1)
    .length;

  // Calculate Staff Performance
  const staffStats = {};
  filteredTickets.forEach(ticket => {
    const staff = ticket.assignedTo || "Unassigned";
    if (!staffStats[staff]) {
      staffStats[staff] = { total: 0, open: 0, closed: 0 };
    }
    staffStats[staff].total++;
    if (ticket.status === "Closed" || ticket.status === "Resolved") {
      staffStats[staff].closed++;
    } else {
      staffStats[staff].open++;
    }
  });

  // Top Agent based on effectiveness (closed/resolved count) rather than sheer volume
  const topStaff = Object.entries(staffStats).sort((a, b) => b[1].closed - a[1].closed)[0];

  // Export to Excel Function
  const exportToExcel = () => {
    const report = filteredTickets.map(ticket => ({
      TicketID: ticket.id,
      Subject: ticket.subject,
      Customer: ticket.customerName,
      Email: ticket.customerEmail,
      Category: ticket.category,
      Priority: ticket.priority,
      Status: ticket.status,
      AssignedTo: ticket.assignedTo || "Unassigned",
      Created: ticket.createdAt?.toDate().toLocaleString(),
      Updated: ticket.updatedAt?.toDate().toLocaleString(),
      LastReplyBy: ticket.lastReplyBy,
      SupportUnread: ticket.supportUnread,
      CustomerUnread: ticket.customerUnread
    }));

    const summary = [
      { Metric: "Total Tickets", Value: filteredTickets.length },
      { Metric: "Open", Value: openTickets },
      { Metric: "Closed", Value: closedTickets },
      { Metric: "Average Response (min)", Value: averageResponse },
      { Metric: "Repeat Customers", Value: repeatCustomers }
    ];

    const workbook = XLSX.utils.book_new();

    const summarySheet = XLSX.utils.json_to_sheet(summary);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    const worksheet = XLSX.utils.json_to_sheet(report);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Support Report");

    const catSheetData = categoryData.map(item => ({ Category: item.name, Tickets: item.value }));
    const categorySheet = XLSX.utils.json_to_sheet(catSheetData);
    XLSX.utils.book_append_sheet(workbook, categorySheet, "Categories");

    const staffSheetData = Object.entries(staffStats).map(([staff, data]) => ({
      Staff: staff,
      Total: data.total,
      Open: data.open,
      Closed: data.closed
    }));
    const staffSheet = XLSX.utils.json_to_sheet(staffSheetData);
    XLSX.utils.book_append_sheet(workbook, staffSheet, "Staff Performance");

    const customerSheetData = Object.entries(customerCounts).map(([customer, count]) => ({
      Customer: customer,
      Tickets: count
    }));
    const customerSheet = XLSX.utils.json_to_sheet(customerSheetData);
    XLSX.utils.book_append_sheet(workbook, customerSheet, "Customer Analytics");

    const trendSheet = XLSX.utils.json_to_sheet(trendData);
    XLSX.utils.book_append_sheet(workbook, trendSheet, "Daily Trend");

    const dateStr = new Date().toISOString().split("T")[0];
    XLSX.writeFile(
      workbook,
      `Support_Report_${dateStr}.xlsx`
    );
  };

  return (
    <>
      <style>{`
        .support-analytics-page {
          max-width: 1200px;
          margin: auto;
          padding: 28px;
        }
        .analytics-header {
          margin-bottom: 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 20px;
        }
        .analytics-header h2 {
          margin: 0;
          font-size: 30px;
          color: #2C221E;
        }
        .analytics-header p {
          margin-top: 8px;
          color: #8B7B70;
        }
        .export-btn {
          background: #2C221E;
          color: white;
          border: none;
          padding: 14px 22px;
          border-radius: 14px;
          cursor: pointer;
          font-weight: 700;
          transition: .25s;
        }
        .export-btn:hover {
          background: #1E1714;
          transform: translateY(-2px);
        }
        .filter-bar {
          display: flex;
          gap: 14px;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .filter-bar select, .filter-bar input {
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid #E8DED2;
          background: white;
          font-size: 14px;
          color: #2C221E;
        }
        .filter-bar select:focus, .filter-bar input:focus {
          outline: none;
          border-color: #C4956A;
          box-shadow: 0 0 0 3px rgba(196,149,106,.15);
        }
        .analytics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
        }
        .analytics-card {
          background: white;
          border-radius: 22px;
          padding: 24px;
          border: 1px solid #EFE5DA;
          transition: .25s;
          box-shadow: 0 8px 22px rgba(44,34,30,.04);
        }
        .analytics-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 15px 35px rgba(44,34,30,.08);
        }
        .analytics-icon {
          width: 54px;
          height: 54px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #FAF6F0;
          border-radius: 16px;
          font-size: 24px;
          margin-bottom: 18px;
        }
        .analytics-card h3 {
          margin: 0;
          font-size: 34px;
          color: #2C221E;
        }
        .analytics-card p {
          margin-top: 8px;
          color: #8B7B70;
          font-size: 15px;
        }
        .analytics-section {
          margin-top: 35px;
        }
        .analytics-section h3 {
          margin-bottom: 20px;
          color: #2C221E;
          font-size: 22px;
        }
        .chart-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
          gap: 24px;
        }
        .chart-card {
          background: white;
          padding: 24px;
          border-radius: 22px;
          box-shadow: 0 8px 24px rgba(44,34,30,.05);
          border: 1px solid #EFE5DA;
        }
        .chart-card h3 {
          margin-bottom: 20px;
          color: #2C221E;
        }
        .status-card {
          background: white;
          border-radius: 22px;
          padding: 28px;
          box-shadow: 0 8px 22px rgba(44,34,30,.05);
          border: 1px solid #EFE5DA;
        }
        .status-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          font-weight: 600;
          color: #2C221E;
        }
        .progress {
          height: 10px;
          background: #F2ECE5;
          border-radius: 999px;
          overflow: hidden;
          margin-bottom: 22px;
        }
        .progress-fill {
          height: 100%;
          border-radius: 999px;
          transition: .4s;
        }
        .open-fill {
          background: #F59E0B;
        }
        .pending-fill {
          background: #3B82F6;
        }
        .resolved-fill {
          background: #22C55E;
        }
        .category-card {
          background: white;
          border-radius: 22px;
          padding: 28px;
          box-shadow: 0 8px 22px rgba(44,34,30,.05);
          border: 1px solid #EFE5DA;
        }
        .top-category {
          background: #FAF6F0;
          border-radius: 18px;
          padding: 22px;
          margin-bottom: 22px;
        }
        .top-category h4 {
          margin: 0;
          color: #8B7B70;
        }
        .top-category h2 {
          margin: 10px 0 0;
          color: #C4956A;
          font-size: 34px;
        }
        .category-row {
          display: flex;
          justify-content: space-between;
          padding: 14px 0;
          border-bottom: 1px solid #F2ECE5;
          color: #2C221E;
        }
        .category-row:last-child {
          border-bottom: none;
        }
        .priority-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 18px;
          margin-bottom: 22px;
        }
        .priority-box {
          background: white;
          border-radius: 20px;
          padding: 24px;
          text-align: center;
          box-shadow: 0 8px 22px rgba(44,34,30,.05);
          border: 1px solid #EFE5DA;
        }
        .priority-box h2 {
          margin: 0;
          font-size: 38px;
          color: #2C221E;
        }
        .priority-box p {
          margin-top: 10px;
          color: #8B7B70;
          font-weight: 600;
        }
        .priority-box.high {
          border-top: 5px solid #EF4444;
        }
        .priority-box.normal {
          border-top: 5px solid #F59E0B;
        }
        .priority-box.low {
          border-top: 5px solid #22C55E;
        }
        .urgent-card {
          background: #FFF7ED;
          border-left: 6px solid #F97316;
          border-radius: 20px;
          padding: 24px;
          border-top: 1px solid #FFEDD5;
          border-right: 1px solid #FFEDD5;
          border-bottom: 1px solid #FFEDD5;
        }
        .urgent-card h4 {
          margin: 0;
          color: #9A3412;
        }
        .urgent-card h2 {
          margin: 12px 0;
          font-size: 42px;
          color: #EA580C;
        }
        .urgent-card p {
          margin: 0;
          color: #7C2D12;
        }
        .response-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
        }
        .response-card {
          background: white;
          padding: 28px;
          border-radius: 20px;
          text-align: center;
          box-shadow: 0 8px 22px rgba(44,34,30,.05);
          border: 1px solid #EFE5DA;
        }
        .response-card h2 {
          margin: 0;
          font-size: 42px;
          color: #C4956A;
        }
        .response-card p {
          margin-top: 10px;
          color: #8B7B70;
          font-weight: 600;
        }
        .trend-card {
          background: white;
          padding: 28px;
          border-radius: 22px;
          box-shadow: 0 8px 22px rgba(44,34,30,.05);
          border: 1px solid #EFE5DA;
        }
        .trend-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 0;
          border-bottom: 1px solid #F2ECE5;
          color: #2C221E;
        }
        .trend-row:last-child {
          border-bottom: none;
        }
        .trend-right {
          display: flex;
          align-items: center;
          gap: 18px;
        }
        .trend-bar {
          height: 12px;
          background: #C4956A;
          border-radius: 999px;
          transition: .3s;
        }
        .customer-card {
          background: white;
          padding: 28px;
          border-radius: 22px;
          box-shadow: 0 8px 22px rgba(44,34,30,.05);
          border: 1px solid #EFE5DA;
        }
        .customer-summary {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
        }
        .customer-summary div {
          background: #FAF6F0;
          padding: 20px;
          border-radius: 18px;
          text-align: center;
        }
        .customer-summary h2 {
          margin: 0;
          font-size: 36px;
          color: #C4956A;
        }
        .customer-summary p {
          margin-top: 8px;
          color: #8B7B70;
        }
        .customer-row {
          display: flex;
          justify-content: space-between;
          padding: 14px 0;
          border-bottom: 1px solid #F2ECE5;
          color: #2C221E;
        }
        .customer-row:last-child {
          border-bottom: none;
        }
        .staff-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 22px;
        }
        .staff-card {
          background: white;
          padding: 28px;
          border-radius: 22px;
          box-shadow: 0 8px 22px rgba(44,34,30,.05);
          transition: .25s;
          border: 1px solid #EFE5DA;
        }
        .staff-card:hover {
          transform: translateY(-4px);
        }
        .staff-card h4 {
          margin: 0;
          font-size: 20px;
          color: #2C221E;
        }
        .staff-card p {
          margin: 10px 0;
          color: #8B7B70;
        }
        .staff-card h2 {
          margin: 0;
          font-size: 42px;
          color: #C4956A;
        }
        .staff-footer {
          margin-top: 20px;
          display: flex;
          justify-content: space-between;
          font-weight: 600;
          color: #2C221E;
        }
      `}</style>

      <div className="support-analytics-page">
        <div className="analytics-header">
          <div>
            <h2>📊 Support Analytics</h2>
            <p>Monitor support performance and customer service metrics.</p>
          </div>
          <button className="export-btn" onClick={exportToExcel}>
            📄 Export Excel
          </button>
        </div>

        <div className="filter-bar">
          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="custom">Custom Range</option>
            <option value="all">All Time</option>
          </select>
          {dateFilter === "custom" && (
            <>
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
            </>
          )}
        </div>

        <div className="analytics-grid">
          <div className="analytics-card">
            <span className="analytics-icon">🎫</span>
            <h3>{totalTickets}</h3>
            <p>Total Tickets</p>
          </div>
          <div className="analytics-card">
            <span className="analytics-icon">📂</span>
            <h3>{openTickets}</h3>
            <p>Open Tickets</p>
          </div>
          <div className="analytics-card">
            <span className="analytics-icon">⏳</span>
            <h3>{pendingTickets}</h3>
            <p>Pending Tickets</p>
          </div>
          <div className="analytics-card">
            <span className="analytics-icon">✅</span>
            <h3>{resolvedTickets + closedTickets}</h3>
            <p>Resolved / Closed</p>
          </div>
          <div className="analytics-card">
            <span className="analytics-icon">📈</span>
            <h3>{resolutionRate}%</h3>
            <p>Resolution Rate</p>
          </div>
          <div className="analytics-card">
            <span className="analytics-icon">🏆</span>
            <h3>{topStaff ? topStaff[1].closed : 0}</h3>
            <p>Top Agent: {topStaff ? topStaff[0] : "--"}</p>
          </div>
        </div>

        <div className="analytics-section">
          <h3>📊 Interactive Visualizations</h3>
          <div className="chart-grid">
            <div className="chart-card">
              <h3>Ticket Status</h3>
              {statusData.every(item => item.value === 0) ? (
                <p style={{ color: "#8B7B70", textAlign: "center", padding: "40px 0" }}>No analytics available.</p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={110} label>
                      {statusData.map((entry, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="chart-card">
              <h3>Tickets by Category</h3>
              {categoryData.every(item => item.value === 0) ? (
                <p style={{ color: "#8B7B70", textAlign: "center", padding: "40px 0" }}>No analytics available.</p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#C4956A" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="chart-card">
              <h3>Daily Ticket Trend</h3>
              {trendData.every(item => item.total === 0) ? (
                <p style={{ color: "#8B7B70", textAlign: "center", padding: "40px 0" }}>No analytics available.</p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="total" stroke="#C4956A" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        <div className="analytics-section">
          <h3>🎫 Ticket Status Breakdown</h3>
          <div className="status-card">
            <div className="status-row">
              <span>📂 Open</span>
              <span>{openTickets}</span>
            </div>
            <div className="progress">
              <div className="progress-fill open-fill" style={{ width: `${openPercent}%` }} />
            </div>

            <div className="status-row">
              <span>⏳ Pending</span>
              <span>{pendingTickets}</span>
            </div>
            <div className="progress">
              <div className="progress-fill pending-fill" style={{ width: `${pendingPercent}%` }} />
            </div>

            <div className="status-row">
              <span>✅ Resolved / Closed</span>
              <span>{resolvedTickets + closedTickets}</span>
            </div>
            <div className="progress">
              <div className="progress-fill resolved-fill" style={{ width: `${resolvedPercent}%` }} />
            </div>
          </div>
        </div>

        <div className="analytics-section">
          <h3>📂 Ticket Categories</h3>
          <div className="category-card">
            <div className="top-category">
              <h4>🔥 Most Common Issue</h4>
              <h2>{mostCommonCategory}</h2>
            </div>
            {categoryData.length === 0 ? (
              <p className="text-gray-500">No categories found</p>
            ) : (
              categoryData.map((item) => (
                <div key={item.name} className="category-row">
                  <span>{item.name}</span>
                  <strong>{item.value}</strong>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="analytics-section">
          <h3>🚨 Priority Analytics</h3>
          <div className="priority-grid">
            <div className="priority-box high">
              <h2>{highPriority}</h2>
              <p>High Priority</p>
            </div>
            <div className="priority-box normal">
              <h2>{normalPriority}</h2>
              <p>Normal Priority</p>
            </div>
            <div className="priority-box low">
              <h2>{lowPriority}</h2>
              <p>Low Priority</p>
            </div>
          </div>
          <div className="urgent-card">
            <h4>🚨 Urgent Ticket Ratio</h4>
            <h2>{urgentPercent}%</h2>
            <p>of all support tickets are marked as High Priority.</p>
          </div>
        </div>

        <div className="analytics-section">
          <h3>⏱ Response Performance</h3>
          <div className="response-grid">
            <div className="response-card">
              <h2>{averageResponse}</h2>
              <p>Average Minutes</p>
            </div>
            <div className="response-card">
              <h2>{fastestResponse}</h2>
              <p>Fastest Reply</p>
            </div>
            <div className="response-card">
              <h2>{slowestResponse}</h2>
              <p>Slowest Reply</p>
            </div>
          </div>
        </div>

        <div className="analytics-section">
          <h3>📈 Daily Ticket Trend List</h3>
          <div className="trend-card">
            {trendData.length === 0 ? (
              <p className="text-gray-500">No ticket history.</p>
            ) : (
              trendData.map((item) => (
                <div key={item.day} className="trend-row">
                  <span>{item.day}</span>
                  <div className="trend-right">
                    <strong>{item.total}</strong>
                    <div className="trend-bar" style={{ width: `${item.total * 20}px` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="analytics-section">
          <h3>👥 Customer Analytics</h3>
          <div className="customer-card">
            <div className="customer-summary">
              <div>
                <h2>{repeatCustomers}</h2>
                <p>Repeat Customers</p>
              </div>
              <div>
                <h2>{Object.keys(customerCounts).length}</h2>
                <p>Total Customers</p>
              </div>
            </div>
            <h4 style={{ marginTop: "30px", color: "#2C221E" }}>🏆 Top Support Users</h4>
            {topCustomers.length === 0 ? (
              <p className="text-gray-500">No customer records found</p>
            ) : (
              topCustomers.map(([customer, count]) => (
                <div key={customer} className="customer-row">
                  <span>{customer}</span>
                  <strong>{count} tickets</strong>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="analytics-section">
          <h3>👨‍💼 Staff Performance</h3>
          <div className="staff-grid">
            {Object.entries(staffStats).length === 0 ? (
              <p className="text-gray-500">No staff assignment data found.</p>
            ) : (
              Object.entries(staffStats).map(([staff, data]) => (
                <div key={staff} className="staff-card">
                  <h4>{staff}</h4>
                  <p>Total Tickets</p>
                  <h2>{data.total}</h2>
                  <div className="staff-footer">
                    <span>🟢 {data.open}</span>
                    <span>✅ {data.closed}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
