import { useEffect, useState, useMemo } from "react";
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

// Custom hook for animated counting numbers
function useCountUp(end, duration = 1000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (typeof end !== "number" || isNaN(end)) {
      setCount(end);
      return;
    }
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [end, duration]);

  return count;
}

export default function SupportAnalyticsManagement() {
  const [tickets, setTickets] = useState([]);
  const [dateFilter, setDateFilter] = useState("7days");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [lastUpdatedTime, setLastUpdatedTime] = useState(new Date());

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
        setLastUpdatedTime(new Date());
      }
    );
    return unsubscribe;
  }, []);

  // Filter Tickets by Date Range
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
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
  }, [tickets, dateFilter, customStart, customEnd]);

  // Calculate live statistics using filteredTickets
  const totalTickets = filteredTickets.length;
  const openTickets = filteredTickets.filter((t) => t.status === "Open").length;
  const pendingTickets = filteredTickets.filter((t) => t.status === "Pending").length;
  const closedTickets = filteredTickets.filter((t) => t.status === "Closed").length;
  const resolvedTickets = filteredTickets.filter((t) => t.status === "Resolved").length;
  const totalResolvedAndClosed = resolvedTickets + closedTickets;
  
  const resolutionRate =
    totalTickets === 0
      ? 0
      : Math.round((totalResolvedAndClosed / totalTickets) * 100);

  // Animated values
  const animatedTotal = useCountUp(totalTickets);
  const animatedOpen = useCountUp(openTickets);
  const animatedPending = useCountUp(pendingTickets);
  const animatedResolved = useCountUp(totalResolvedAndClosed);
  const animatedRate = useCountUp(resolutionRate);

  // Calculate percentages for breakdown
  const openPercent = totalTickets === 0 ? 0 : Math.round((openTickets / totalTickets) * 100);
  const pendingPercent = totalTickets === 0 ? 0 : Math.round((pendingTickets / totalTickets) * 100);
  const resolvedPercent = totalTickets === 0 ? 0 : Math.round((totalResolvedAndClosed / totalTickets) * 100);

  // Calculate Category Analytics
  const categoryData = useMemo(() => {
    const categoryCounts = {};
    filteredTickets.forEach((ticket) => {
      const category = ticket.category || "Other";
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
    return Object.entries(categoryCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTickets]);

  const mostCommonCategory = categoryData.length > 0 ? categoryData[0].name : "--";
  const maxCategoryValue = categoryData.length > 0 ? Math.max(...categoryData.map(c => c.value), 1) : 1;

  // Calculate Priority Analytics
  const highPriority = filteredTickets.filter(t => (t.priority || "").toLowerCase() === "high").length;
  const normalPriority = filteredTickets.filter(t => (t.priority || "").toLowerCase() === "normal").length;
  const lowPriority = filteredTickets.filter(t => (t.priority || "").toLowerCase() === "low").length;
  const urgentPercent = totalTickets === 0 ? 0 : Math.round((highPriority / totalTickets) * 100);

  const priorityData = [
    { name: "High", value: highPriority },
    { name: "Normal", value: normalPriority },
    { name: "Low", value: lowPriority }
  ];

  // Calculate Response Time Analytics
  const responseTimes = useMemo(() => {
    const respondedTickets = filteredTickets.filter(t => t.createdAt && t.firstResponseAt);
    return respondedTickets.map(ticket => {
      const created = ticket.createdAt.toDate();
      const replied = ticket.firstResponseAt.toDate();
      return (replied - created) / 60000;
    });
  }, [filteredTickets]);

  const averageResponse = responseTimes.length ? (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(1) : "--";
  const fastestResponse = responseTimes.length ? Math.min(...responseTimes).toFixed(1) : "--";
  const slowestResponse = responseTimes.length ? Math.max(...responseTimes).toFixed(1) : "--";

  // Calculate Daily Ticket Trend (Using ISO date keys for robust sorting)
  const { trendData, maxTrendTotal } = useMemo(() => {
    const dailyData = {};
    filteredTickets.forEach(ticket => {
      if (!ticket.createdAt) return;
      const key = ticket.createdAt.toDate().toISOString().split("T")[0];
      dailyData[key] = (dailyData[key] || 0) + 1;
    });
    const sortedDailyEntries = Object.entries(dailyData).sort((a, b) => new Date(a[0]) - new Date(b[0]));
    const trend = sortedDailyEntries.map(([dateKey, total]) => ({
      day: new Date(dateKey).toLocaleDateString(),
      total
    }));
    const maxTotal = Math.max(...trend.map(t => t.total), 1);
    return { trendData: trend, maxTrendTotal: maxTotal };
  }, [filteredTickets]);

  // Chart Status Data
  const statusData = [
    { name: "Open", value: openTickets },
    { name: "Pending", value: pendingTickets },
    { name: "Resolved/Closed", value: totalResolvedAndClosed }
  ];

  // Brewed Theme Palette Colors
  const BREWED_COLORS = {
    open: "#E7B46A",
    pending: "#7FA8D9",
    resolved: "#6CBF84",
    closed: "#2C221E",
    high: "#D9534F"
  };

  const COLORS = [BREWED_COLORS.open, BREWED_COLORS.pending, BREWED_COLORS.resolved, BREWED_COLORS.closed];

  // Calculate Customer Analytics
  const { customerCounts, topCustomers, repeatCustomers } = useMemo(() => {
    const counts = {};
    filteredTickets.forEach(ticket => {
      const name = ticket.customerName || ticket.customerEmail || "Unknown";
      counts[name] = (counts[name] || 0) + 1;
    });
    const top = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const repeats = Object.values(counts)
      .filter(count => count > 1)
      .length;
    return { customerCounts: counts, topCustomers: top, repeatCustomers: repeats };
  }, [filteredTickets]);

  // Calculate Staff Performance
  const staffStats = useMemo(() => {
    const stats = {};
    filteredTickets.forEach(ticket => {
      const staff = ticket.assignedTo || "Unassigned";
      if (!stats[staff]) {
        stats[staff] = { total: 0, open: 0, closed: 0 };
      }
      stats[staff].total++;
      if (ticket.status === "Closed" || ticket.status === "Resolved") {
        stats[staff].closed++;
      } else {
        stats[staff].open++;
      }
    });
    return stats;
  }, [filteredTickets]);

  // Top Agent based on effectiveness
  const topStaff = useMemo(() => {
    return Object.entries(staffStats).sort((a, b) => b[1].closed - a[1].closed)[0];
  }, [staffStats]);

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
      { Metric: "Resolved / Closed", Value: totalResolvedAndClosed },
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
        .support-analytics-container {
          position: relative;
          min-height: 100vh;
          background: #F8F4EF;
          overflow: hidden;
          font-family: inherit;
        }
        /* Background Blobs */
        .support-analytics-container::before {
          content: '';
          position: absolute;
          top: -100px;
          right: -100px;
          width: 500px;
          height: 500px;
          background: rgba(196, 149, 106, 0.12);
          filter: blur(80px);
          border-radius: 50%;
          z-index: 0;
          pointer-events: none;
        }
        .support-analytics-container::after {
          content: '';
          position: absolute;
          bottom: -100px;
          left: -100px;
          width: 500px;
          height: 500px;
          background: rgba(217, 119, 6, 0.08);
          filter: blur(80px);
          border-radius: 50%;
          z-index: 0;
          pointer-events: none;
        }
        .support-analytics-page {
          position: relative;
          max-width: 1200px;
          margin: auto;
          padding: 28px;
          z-index: 1;
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
          font-size: 32px;
          color: #2C221E;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .analytics-header p {
          margin-top: 6px;
          color: #8B7B70;
          font-size: 15px;
        }
        .header-subinfo {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 6px;
          font-size: 13px;
          color: #A39385;
          font-weight: 500;
        }
        .export-btn {
          background: #2C221E;
          color: white;
          border: none;
          padding: 14px 24px;
          border-radius: 16px;
          cursor: pointer;
          font-weight: 700;
          transition: all 0.25s ease;
          box-shadow: 0 4px 14px rgba(44,34,30,0.15);
        }
        .export-btn:hover {
          background: #1E1714;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(44,34,30,0.25);
        }
        .filter-bar {
          display: flex;
          gap: 14px;
          align-items: center;
          margin-bottom: 28px;
          flex-wrap: wrap;
        }
        .filter-bar select, .filter-bar input {
          padding: 12px 18px;
          border-radius: 14px;
          border: 1px solid rgba(232, 222, 210, 0.8);
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(8px);
          font-size: 14px;
          color: #2C221E;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(44,34,30,0.03);
          transition: all 0.2s;
        }
        .filter-bar select:focus, .filter-bar input:focus {
          outline: none;
          border-color: #C4956A;
          box-shadow: 0 0 0 3px rgba(196,149,106,.15);
          background: #FFFFFF;
        }
        .analytics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
        }
        .analytics-card {
          background: linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.65) 100%);
          backdrop-filter: blur(12px);
          border-radius: 22px;
          padding: 24px;
          border: 1px solid rgba(255,255,255,0.8);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 10px 30px rgba(44,34,30,0.04);
        }
        .analytics-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 18px 40px rgba(44,34,30,0.08);
          border-color: rgba(196,149,106,0.3);
        }
        .analytics-icon {
          width: 54px;
          height: 54px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #FAF6F0 0%, #F2ECE5 100%);
          border-radius: 16px;
          font-size: 24px;
          margin-bottom: 18px;
          box-shadow: inset 0 2px 4px rgba(255,255,255,0.8);
        }
        .analytics-card h3 {
          margin: 0;
          font-size: 34px;
          color: #2C221E;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .analytics-card p {
          margin-top: 6px;
          color: #8B7B70;
          font-size: 15px;
          font-weight: 600;
        }
        .analytics-card .trend-subtext {
          margin-top: 4px;
          font-size: 12px;
          color: #C4956A;
          font-weight: 700;
        }
        .analytics-section {
          margin-top: 38px;
        }
        .analytics-section h3 {
          margin-bottom: 20px;
          color: #2C221E;
          font-size: 22px;
          font-weight: 700;
        }
        /* Glassmorphism Charts Grid Layout */
        .chart-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }
        @media(max-width: 900px) {
          .chart-grid {
            grid-template-columns: 1fr;
          }
        }
        .chart-card-full {
          grid-column: 1 / -1;
        }
        .chart-card {
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(12px);
          padding: 26px;
          border-radius: 24px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.6);
          transition: all 0.3s ease;
        }
        .chart-card:hover {
          box-shadow: 0 24px 50px rgba(0, 0, 0, 0.07);
          border-color: rgba(196,149,106,0.25);
        }
        .chart-header {
          margin-bottom: 20px;
        }
        .chart-header h3 {
          margin: 0;
          color: #2C221E;
          font-size: 18px;
          font-weight: 700;
        }
        .chart-header p {
          margin: 4px 0 0;
          color: #8B7B70;
          font-size: 13px;
          font-weight: 500;
        }
        .status-card {
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(12px);
          border-radius: 24px;
          padding: 28px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.6);
        }
        .status-row-custom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          font-weight: 700;
          color: #2C221E;
          font-size: 14px;
        }
        .progress-pill-wrapper {
          height: 14px;
          background: #F2ECE5;
          border-radius: 999px;
          overflow: hidden;
          margin-bottom: 22px;
          padding: 2px;
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.06);
        }
        .progress-pill-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .category-card {
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(12px);
          border-radius: 24px;
          padding: 28px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.6);
        }
        .top-category {
          background: linear-gradient(135deg, #FAF6F0 0%, #F2ECE5 100%);
          border-radius: 18px;
          padding: 22px;
          margin-bottom: 24px;
          border: 1px solid rgba(232, 222, 210, 0.5);
        }
        .top-category h4 {
          margin: 0;
          color: #8B7B70;
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .top-category h2 {
          margin: 8px 0 0;
          color: #C4956A;
          font-size: 32px;
          font-weight: 800;
        }
        .category-pill-row {
          margin-bottom: 16px;
        }
        .category-pill-header {
          display: flex;
          justify-content: space-between;
          font-weight: 700;
          color: #2C221E;
          font-size: 14px;
          margin-bottom: 6px;
        }
        .priority-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 18px;
          margin-bottom: 22px;
        }
        .priority-box {
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(12px);
          border-radius: 20px;
          padding: 24px;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.6);
        }
        .priority-box h2 {
          margin: 0;
          font-size: 38px;
          color: #2C221E;
          font-weight: 800;
        }
        .priority-box p {
          margin-top: 8px;
          color: #8B7B70;
          font-weight: 700;
          font-size: 14px;
        }
        .priority-box.high {
          border-top: 5px solid #D9534F;
        }
        .priority-box.normal {
          border-top: 5px solid #E7B46A;
        }
        .priority-box.low {
          border-top: 5px solid #6CBF84;
        }
        .urgent-card {
          background: linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%);
          border-left: 6px solid #EA580C;
          border-radius: 20px;
          padding: 24px;
          border-top: 1px solid #FFEDD5;
          border-right: 1px solid #FFEDD5;
          border-bottom: 1px solid #FFEDD5;
          box-shadow: 0 10px 30px rgba(234, 88, 12, 0.05);
        }
        .urgent-card h4 {
          margin: 0;
          color: #9A3412;
          font-weight: 700;
        }
        .urgent-card h2 {
          margin: 10px 0;
          font-size: 40px;
          color: #EA580C;
          font-weight: 800;
        }
        .urgent-card p {
          margin: 0;
          color: #7C2D12;
          font-weight: 500;
        }
        .response-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
        }
        .response-card {
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(12px);
          padding: 28px;
          border-radius: 20px;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.6);
        }
        .response-card h2 {
          margin: 0;
          font-size: 40px;
          color: #C4956A;
          font-weight: 800;
        }
        .response-card p {
          margin-top: 8px;
          color: #8B7B70;
          font-weight: 700;
          font-size: 14px;
        }
        .trend-card {
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(12px);
          padding: 28px;
          border-radius: 24px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.6);
        }
        .trend-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 0;
          border-bottom: 1px solid rgba(242, 236, 229, 0.8);
          color: #2C221E;
        }
        .trend-row:last-child {
          border-bottom: none;
        }
        .trend-right {
          display: flex;
          align-items: center;
          gap: 18px;
          flex: 1;
          max-width: 400px;
          justify-content: flex-end;
        }
        .trend-bar-wrapper {
          flex: 1;
          background: #F2ECE5;
          border-radius: 999px;
          overflow: hidden;
          height: 12px;
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);
        }
        .trend-bar {
          height: 100%;
          background: #C4956A;
          border-radius: 999px;
          transition: width 0.5s ease;
        }
        .customer-card {
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(12px);
          padding: 28px;
          border-radius: 24px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.6);
        }
        .customer-summary {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
        }
        .customer-summary div {
          background: linear-gradient(135deg, #FAF6F0 0%, #F2ECE5 100%);
          padding: 20px;
          border-radius: 18px;
          text-align: center;
          border: 1px solid rgba(232, 222, 210, 0.5);
        }
        .customer-summary h2 {
          margin: 0;
          font-size: 34px;
          color: #C4956A;
          font-weight: 800;
        }
        .customer-summary p {
          margin-top: 6px;
          color: #8B7B70;
          font-weight: 700;
          font-size: 14px;
        }
        .customer-row {
          display: flex;
          justify-content: space-between;
          padding: 14px 0;
          border-bottom: 1px solid rgba(242, 236, 229, 0.8);
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
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(12px);
          padding: 28px;
          border-radius: 24px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.04);
          transition: all 0.25s ease;
          border: 1px solid rgba(255, 255, 255, 0.6);
        }
        .staff-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 24px 50px rgba(0, 0, 0, 0.07);
        }
        .staff-card h4 {
          margin: 0;
          font-size: 20px;
          color: #2C221E;
          font-weight: 700;
        }
        .staff-card p {
          margin: 8px 0;
          color: #8B7B70;
          font-weight: 600;
          font-size: 14px;
        }
        .staff-card h2 {
          margin: 0;
          font-size: 40px;
          color: #C4956A;
          font-weight: 800;
        }
        .staff-footer {
          margin-top: 20px;
          display: flex;
          justify-content: space-between;
          font-weight: 700;
          color: #2C221E;
          font-size: 14px;
        }
      `}</style>

      <div className="support-analytics-container">
        <div className="support-analytics-page">
          <div className="analytics-header">
            <div>
              <h2>☕ Brewed Support Analytics</h2>
              <p>Real-time support insights for your café.</p>
              <div className="header-subinfo">
                <span>🟢 Live Sync Active</span>
                <span>•</span>
                <span>Last Updated {Math.floor((new Date() - lastUpdatedTime) / 1000)} seconds ago</span>
              </div>
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
              <h3>{animatedTotal}</h3>
              <p>Total Tickets</p>
              <div className="trend-subtext">↗ Live stream updated</div>
            </div>
            <div className="analytics-card">
              <span className="analytics-icon">📂</span>
              <h3>{animatedOpen}</h3>
              <p>Open Tickets</p>
              <div className="trend-subtext">Requires attention</div>
            </div>
            <div className="analytics-card">
              <span className="analytics-icon">⏳</span>
              <h3>{animatedPending}</h3>
              <p>Pending Tickets</p>
              <div className="trend-subtext">Waiting on reply</div>
            </div>
            <div className="analytics-card">
              <span className="analytics-icon">✅</span>
              <h3>{animatedResolved}</h3>
              <p>Resolved / Closed</p>
              <div className="trend-subtext">Successfully completed</div>
            </div>
            <div className="analytics-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
              <div style={{ position: "relative", width: "70px", height: "70px", marginBottom: "8px" }}>
                <svg width="70" height="70" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="35" cy="35" r="28" stroke="#E8DED2" strokeWidth="6" fill="transparent" />
                  <circle 
                    cx="35" 
                    cy="35" 
                    r="28" 
                    stroke="#6CBF84" 
                    strokeWidth="6" 
                    fill="transparent" 
                    strokeDasharray={2 * Math.PI * 28}
                    strokeDashoffset={2 * Math.PI * 28 * (1 - resolutionRate / 100)}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 0.8s ease" }}
                  />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "800", color: "#2C221E" }}>
                  {animatedRate}%
                </div>
              </div>
              <p style={{ margin: 0, fontSize: "15px", fontWeight: "700" }}>Resolution Rate</p>
            </div>
            <div className="analytics-card">
              <span className="analytics-icon">👑</span>
              <h3 style={{ fontSize: "24px" }}>{topStaff ? topStaff[0] : "--"}</h3>
              <p>Top Performer</p>
              <div className="trend-subtext">✔ {topStaff ? topStaff[1].closed : 0} Tickets Resolved ⭐⭐⭐⭐⭐</div>
            </div>
          </div>

          <div className="analytics-section">
            <h3>📊 Interactive Visualizations</h3>
            <div className="chart-grid">
              
              {/* Status Pie Chart - Larger Full Width */}
              <div className="chart-card chart-card-full">
                <div className="chart-header">
                  <h3>Ticket Status</h3>
                  <p>Distribution of current support workloads across all statuses</p>
                </div>
                {statusData.every(item => item.value === 0) ? (
                  <p style={{ color: "#8B7B70", textAlign: "center", padding: "40px 0" }}>No analytics available.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={340}>
                    <PieChart>
                      <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={120} label>
                        <Cell fill={BREWED_COLORS.open} />
                        <Cell fill={BREWED_COLORS.pending} />
                        <Cell fill={BREWED_COLORS.resolved} />
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Category Bar Chart */}
              <div className="chart-card">
                <div className="chart-header">
                  <h3>Tickets by Category</h3>
                  <p>Issue taxonomy breakdown</p>
                </div>
                {categoryData.every(item => item.value === 0) ? (
                  <p style={{ color: "#8B7B70", textAlign: "center", padding: "40px 0" }}>No analytics available.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={categoryData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                      <XAxis dataKey="name" tick={{ fill: '#8B7B70', fontSize: 12 }} />
                      <YAxis tick={{ fill: '#8B7B70', fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#C4956A" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Priority Distribution Pie Chart */}
              <div className="chart-card">
                <div className="chart-header">
                  <h3>Priority Breakdown</h3>
                  <p>Urgency distribution analysis</p>
                </div>
                {priorityData.every(item => item.value === 0) ? (
                  <p style={{ color: "#8B7B70", textAlign: "center", padding: "40px 0" }}>No analytics available.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={priorityData} dataKey="value" nameKey="name" outerRadius={100} label>
                        <Cell fill={BREWED_COLORS.high} />
                        <Cell fill={BREWED_COLORS.open} />
                        <Cell fill={BREWED_COLORS.resolved} />
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Daily Trend Line Chart - Full Width */}
              <div className="chart-card chart-card-full">
                <div className="chart-header">
                  <h3>Daily Trend</h3>
                  <p>Ticket intake volume over the selected timeframe</p>
                </div>
                {trendData.every(item => item.total === 0) ? (
                  <p style={{ color: "#8B7B70", textAlign: "center", padding: "40px 0" }}>No analytics available.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={340}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                      <XAxis dataKey="day" tick={{ fill: '#8B7B70', fontSize: 12 }} />
                      <YAxis tick={{ fill: '#8B7B70', fontSize: 12 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="total" stroke="#C4956A" strokeWidth={3} dot={{ fill: '#C4956A', r: 4 }} activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

            </div>
          </div>

          <div className="analytics-section">
            <h3>🎫 Ticket Status Breakdown</h3>
            <div className="status-card">
              <div className="status-row-custom">
                <span>Open</span>
                <span>{openTickets} ({openPercent}%)</span>
              </div>
              <div className="progress-pill-wrapper">
                <div className="progress-pill-fill" style={{ width: `${openPercent}%`, background: BREWED_COLORS.open }} />
              </div>

              <div className="status-row-custom">
                <span>Pending</span>
                <span>{pendingTickets} ({pendingPercent}%)</span>
              </div>
              <div className="progress-pill-wrapper">
                <div className="progress-pill-fill" style={{ width: `${pendingPercent}%`, background: BREWED_COLORS.pending }} />
              </div>

              <div className="status-row-custom">
                <span>Resolved / Closed</span>
                <span>{totalResolvedAndClosed} ({resolvedPercent}%)</span>
              </div>
              <div className="progress-pill-wrapper">
                <div className="progress-pill-fill" style={{ width: `${resolvedPercent}%`, background: BREWED_COLORS.resolved }} />
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
                categoryData.map((item) => {
                  const percent = Math.round((item.value / maxCategoryValue) * 100);
                  return (
                    <div key={item.name} className="category-pill-row">
                      <div className="category-pill-header">
                        <span>{item.name}</span>
                        <strong>{item.value}</strong>
                      </div>
                      <div className="progress-pill-wrapper" style={{ margin: 0 }}>
                        <div className="progress-pill-fill" style={{ width: `${percent}%`, background: "#C4956A" }} />
                      </div>
                    </div>
                  );
                })
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
                      <div className="trend-bar-wrapper">
                        <div className="trend-bar" style={{ width: `${(item.total / maxTrendTotal) * 100}%` }} />
                      </div>
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
              <h4 style={{ marginTop: "30px", marginBottom: "15px", color: "#2C221E", fontWeight: "700" }}>🏆 Top Support Users</h4>
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
                      <span>🟢 {data.open} Open</span>
                      <span>✅ {data.closed} Closed</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
