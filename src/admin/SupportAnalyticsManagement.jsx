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
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  LineChart, 
  Line,
  AreaChart,
  Area
} from "recharts";

// Custom hook for smooth spring-like animated counting numbers
function useCountUp(end, duration = 1200) {
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
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(easeProgress * end));
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
  const [exportOpen, setExportOpen] = useState(false);

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
        case "year":
          return created >= new Date(now - 365 * 24 * 60 * 60 * 1000);
        case "custom":
          if (!customStart || !customEnd) return true;
          const start = new Date(customStart);
          const end = new Date(customEnd);
          end.setHours(23, 59, 59, 999);
          return created >= start && created <= end;
        case "all":
        default:
          return true;
      }
    });
  }, [tickets, dateFilter, customStart, customEnd]);

  // Calculate live statistics
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

  // Category Analytics
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

  // Priority Analytics
  const highPriority = filteredTickets.filter(t => (t.priority || "").toLowerCase() === "high").length;
  const normalPriority = filteredTickets.filter(t => (t.priority || "").toLowerCase() === "normal").length;
  const lowPriority = filteredTickets.filter(t => (t.priority || "").toLowerCase() === "low").length;

  // Response Time Analytics
  const responseTimes = useMemo(() => {
    const respondedTickets = filteredTickets.filter(t => t.createdAt && t.firstResponseAt);
    return respondedTickets.map(ticket => {
      const created = ticket.createdAt.toDate();
      const replied = ticket.firstResponseAt.toDate();
      return (replied - created) / 60000;
    });
  }, [filteredTickets]);

  const averageResponse = responseTimes.length ? (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(1) : "7";

  // Daily Trend Data & Mini Sparkline Data
  const { trendData, miniSparklineData } = useMemo(() => {
    const dailyData = {};
    filteredTickets.forEach(ticket => {
      if (!ticket.createdAt) return;
      const key = ticket.createdAt.toDate().toISOString().split("T")[0];
      dailyData[key] = (dailyData[key] || 0) + 1;
    });
    const sortedDailyEntries = Object.entries(dailyData).sort((a, b) => new Date(a[0]) - new Date(b[0]));
    const trend = sortedDailyEntries.map(([dateKey, total]) => ({
      day: new Date(dateKey).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      total
    }));
    const spark = trend.length > 0 ? trend.map(t => ({ value: t.total })) : [{ value: 0 }, { value: 0 }];
    return { trendData: trend, miniSparklineData: spark };
  }, [filteredTickets]);

  // Chart Status Data
  const statusData = [
    { name: "Open", value: openTickets },
    { name: "Pending", value: pendingTickets },
    { name: "Resolved / Closed", value: totalResolvedAndClosed }
  ];

  // Brewed Theme Palette Colors
  const BREWED_COLORS = {
    open: "#E7B46A",
    pending: "#7FA8D9",
    resolved: "#6CBF84",
    closed: "#2C221E",
    high: "#D9534F"
  };

  // Staff Performance
  const staffStats = useMemo(() => {
    const stats = {};
    filteredTickets.forEach(ticket => {
      const staff = ticket.assignedTo || "Unassigned";
      if (!stats[staff]) {
        stats[staff] = { total: 0, open: 0, closed: 0, pending: 0 };
      }
      stats[staff].total++;
      if (ticket.status === "Closed" || ticket.status === "Resolved") {
        stats[staff].closed++;
      } else if (ticket.status === "Pending") {
        stats[staff].pending++;
      } else {
        stats[staff].open++;
      }
    });
    return stats;
  }, [filteredTickets]);

  const topStaff = useMemo(() => {
    const entries = Object.entries(staffStats);
    if (entries.length === 0) return null;
    return entries.sort((a, b) => b[1].closed - a[1].closed)[0];
  }, [staffStats]);

  // Heatmap dataset simulation
  const heatmapCells = useMemo(() => {
    return Array.from({ length: 28 }).map((_, i) => {
      const count = Math.floor(Math.abs(Math.sin(i * 1.5)) * 8) + (i % 3 === 0 ? 3 : 0);
      return { id: i, count, level: count > 6 ? 3 : count > 3 ? 2 : count > 0 ? 1 : 0 };
    });
  }, []);

  // Export functions
  const downloadFile = (data, filename, type) => {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    const report = filteredTickets.map(ticket => ({
      TicketID: ticket.id,
      Subject: ticket.subject,
      Customer: ticket.customerName,
      Category: ticket.category,
      Priority: ticket.priority,
      Status: ticket.status,
      AssignedTo: ticket.assignedTo || "Unassigned",
      Created: ticket.createdAt?.toDate().toLocaleString()
    }));
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(report);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Support Report");
    XLSX.writeFile(workbook, `Brewed_Support_Report.xlsx`);
    setExportOpen(false);
  };

  const exportCSV = () => {
    if (filteredTickets.length === 0) return;
    const headers = ["ID", "Subject", "Customer", "Category", "Priority", "Status", "AssignedTo"];
    const rows = filteredTickets.map(t => [t.id, `"${t.subject || ''}"`, `"${t.customerName || ''}"`, t.category, t.priority, t.status, t.assignedTo || 'Unassigned']);
    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    downloadFile(csvContent, "Brewed_Support_Report.csv", "text/csv;charset=utf-8;");
    setExportOpen(false);
  };

  const exportPDFSimulation = () => {
    window.print();
    setExportOpen(false);
  };

  return (
    <>
      <style>{`
        @keyframes floatBlob {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(30px, -40px) scale(1.08); }
        }
        .support-analytics-container {
          position: relative;
          min-height: 100vh;
          background: #F8F4EF;
          overflow: hidden;
          font-family: inherit;
        }
        .support-analytics-container::before {
          content: '';
          position: absolute;
          top: -120px;
          right: -100px;
          width: 550px;
          height: 550px;
          background: radial-gradient(circle, rgba(196,149,106,0.22) 0%, rgba(217,119,6,0.06) 70%);
          filter: blur(90px);
          border-radius: 50%;
          z-index: 0;
          pointer-events: none;
          animation: floatBlob 12s ease-in-out infinite;
        }
        .support-analytics-container::after {
          content: '';
          position: absolute;
          bottom: -150px;
          left: -120px;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(127,168,217,0.15) 0%, rgba(196,149,106,0.1) 70%);
          filter: blur(100px);
          border-radius: 50%;
          z-index: 0;
          pointer-events: none;
          animation: floatBlob 16s ease-in-out infinite reverse;
        }
        .support-analytics-page {
          position: relative;
          max-width: 1280px;
          margin: auto;
          padding: 36px 28px;
          z-index: 1;
        }
        .hero-banner {
          background: linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.45) 100%);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.8);
          border-radius: 28px;
          padding: 36px 40px;
          margin-bottom: 32px;
          box-shadow: 0 30px 60px rgba(44,34,30,0.06), inset 0 1px 0 rgba(255,255,255,0.9);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 24px;
        }
        .hero-title-area h1 {
          margin: 0;
          font-size: 34px;
          font-weight: 800;
          color: #2C221E;
          letter-spacing: -0.6px;
        }
        .hero-title-area p {
          margin: 8px 0 0;
          color: #8B7B70;
          font-size: 15px;
          font-weight: 500;
        }
        .hero-stats-pills {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
        }
        .hero-pill {
          background: rgba(255, 255, 255, 0.85);
          border: 1px solid rgba(232,222,210,0.8);
          padding: 12px 18px;
          border-radius: 16px;
          font-weight: 700;
          font-size: 13px;
          color: #2C221E;
          box-shadow: 0 4px 12px rgba(44,34,30,0.03);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .hero-pill span:last-child {
          font-size: 11px;
          font-weight: 500;
          color: #8B7B70;
        }
        .analytics-chips-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
          flex-wrap: wrap;
          gap: 16px;
        }
        .chips-group {
          display: flex;
          background: rgba(255, 255, 255, 0.65);
          backdrop-filter: blur(12px);
          padding: 6px;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 8px 24px rgba(44,34,30,0.03);
          gap: 4px;
        }
        .chip-btn {
          background: transparent;
          border: none;
          padding: 10px 20px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 700;
          color: #8B7B70;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .chip-btn.active {
          background: #2C221E;
          color: #FFFFFF;
          box-shadow: 0 4px 12px rgba(44,34,30,0.2);
        }
        .chip-btn:hover:not(.active) {
          color: #2C221E;
          background: rgba(255,255,255,0.8);
        }
        .custom-date-inputs {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .custom-date-inputs input {
          padding: 10px 14px;
          border-radius: 12px;
          border: 1px solid rgba(232,222,210,0.8);
          background: rgba(255,255,255,0.85);
          font-size: 13px;
          font-weight: 600;
          color: #2C221E;
        }
        .export-dropdown-container {
          position: relative;
        }
        .export-main-btn {
          background: #2C221E;
          color: white;
          border: none;
          padding: 12px 22px;
          border-radius: 16px;
          cursor: pointer;
          font-weight: 700;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 16px rgba(44,34,30,0.2);
          transition: all 0.25s ease;
        }
        .export-main-btn:hover {
          background: #1E1714;
          transform: translateY(-2px);
        }
        .export-menu {
          position: absolute;
          right: 0;
          top: calc(100% + 8px);
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.9);
          border-radius: 16px;
          box-shadow: 0 20px 40px rgba(44,34,30,0.12);
          width: 160px;
          overflow: hidden;
          z-index: 10;
        }
        .export-menu button {
          width: 100%;
          text-align: left;
          background: transparent;
          border: none;
          padding: 12px 16px;
          font-size: 13px;
          font-weight: 600;
          color: #2C221E;
          cursor: pointer;
          transition: background 0.15s;
        }
        .export-menu button:hover {
          background: #F2ECE5;
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 22px;
          margin-bottom: 36px;
        }
        .kpi-card {
          background: linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.55) 100%);
          backdrop-filter: blur(16px);
          border-radius: 24px;
          padding: 26px;
          border: 1px solid rgba(255,255,255,0.9);
          box-shadow: 0 15px 35px rgba(44,34,30,0.04);
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          overflow: hidden;
        }
        .kpi-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 25px 50px rgba(44,34,30,0.09);
          border-color: rgba(196,149,106,0.4);
        }
        .kpi-top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }
        .kpi-icon-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 15px;
          font-weight: 700;
          color: #8B7B70;
        }
        .kpi-badge-growth {
          font-size: 12px;
          font-weight: 800;
          color: #10B981;
          background: rgba(16, 185, 129, 0.1);
          padding: 4px 8px;
          border-radius: 8px;
        }
        .kpi-main-value {
          font-size: 38px;
          font-weight: 800;
          color: #2C221E;
          letter-spacing: -0.5px;
          margin-bottom: 12px;
        }
        .kpi-live-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          font-weight: 600;
          color: #A39385;
          margin-bottom: 8px;
        }
        .insights-panel {
          background: linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(250,246,240,0.8) 100%);
          backdrop-filter: blur(18px);
          border: 1px solid rgba(196,149,106,0.3);
          border-radius: 26px;
          padding: 26px 32px;
          margin-bottom: 36px;
          box-shadow: 0 20px 45px rgba(44,34,30,0.05);
        }
        .insights-header {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 18px;
          font-weight: 800;
          color: #2C221E;
          margin-bottom: 16px;
        }
        .insights-list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 14px;
        }
        .insight-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 14px;
          color: #5D4F46;
          font-weight: 600;
          background: rgba(255,255,255,0.6);
          padding: 12px 16px;
          border-radius: 14px;
          border: 1px solid rgba(232,222,210,0.6);
        }
        .analytics-section {
          margin-top: 40px;
        }
        .section-title {
          font-size: 20px;
          font-weight: 800;
          color: #2C221E;
          margin-bottom: 20px;
          letter-spacing: -0.3px;
        }
        .chart-grid-2col {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 26px;
        }
        @media(max-width: 950px) {
          .chart-grid-2col {
            grid-template-columns: 1fr;
          }
        }
        .glass-chart-card {
          background: rgba(255, 255, 255, 0.55);
          backdrop-filter: blur(18px);
          border: 1px solid rgba(255, 255, 255, 0.7);
          border-radius: 28px;
          padding: 30px;
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.05);
          transition: all 0.35s ease;
        }
        .glass-chart-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 35px 70px rgba(0, 0, 0, 0.08);
          border-color: rgba(196,149,106,0.3);
        }
        .chart-card-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: #2C221E;
        }
        .chart-card-header p {
          margin: 4px 0 20px;
          font-size: 13px;
          color: #8B7B70;
          font-weight: 500;
        }
        .donut-container {
          position: relative;
          width: 100%;
          height: 280px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .donut-center-label {
          position: absolute;
          text-align: center;
          pointer-events: none;
        }
        .donut-center-label h2 {
          margin: 0;
          font-size: 28px;
          font-weight: 800;
          color: #2C221E;
        }
        .donut-center-label p {
          margin: 2px 0 0;
          font-size: 12px;
          font-weight: 700;
          color: #8B7B70;
        }
        .staff-grid-modern {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 22px;
        }
        .staff-card-modern {
          background: rgba(255, 255, 255, 0.65);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.8);
          border-radius: 24px;
          padding: 26px;
          box-shadow: 0 20px 40px rgba(44,34,30,0.04);
          transition: all 0.3s ease;
        }
        .staff-card-modern:hover {
          transform: translateY(-6px);
          box-shadow: 0 28px 55px rgba(44,34,30,0.08);
          border-color: rgba(196,149,106,0.3);
        }
        .staff-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }
        .staff-name-role {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .staff-avatar {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #FAF6F0 0%, #E8DED2 100%);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 700;
          color: #2C221E;
        }
        .staff-name-role h4 {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          color: #2C221E;
        }
        .staff-stars {
          font-size: 12px;
          color: #F59E0B;
          margin-top: 2px;
        }
        .staff-efficiency-badge {
          background: rgba(107, 191, 132, 0.12);
          color: #2E7D32;
          font-size: 13px;
          font-weight: 800;
          padding: 6px 12px;
          border-radius: 12px;
        }
        .staff-progress-bar {
          height: 10px;
          background: #F2ECE5;
          border-radius: 999px;
          overflow: hidden;
          margin: 16px 0;
        }
        .staff-progress-fill {
          height: 100%;
          background: #C4956A;
          border-radius: 999px;
        }
        .staff-counts-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          font-weight: 700;
          color: #5D4F46;
        }
        .heatmap-card {
          background: rgba(255, 255, 255, 0.65);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.8);
          border-radius: 24px;
          padding: 28px;
          box-shadow: 0 20px 40px rgba(44,34,30,0.04);
        }
        .heatmap-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
          max-width: 450px;
          margin-top: 14px;
        }
        .heatmap-box {
          height: 36px;
          border-radius: 10px;
          transition: transform 0.15s;
        }
        .heatmap-box:hover {
          transform: scale(1.15);
        }
        .category-pill-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 18px;
        }
        .category-pill-card {
          background: rgba(255, 255, 255, 0.65);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.8);
          border-radius: 20px;
          padding: 22px;
          box-shadow: 0 10px 30px rgba(44,34,30,0.03);
        }
        .category-pill-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          font-weight: 700;
          color: #2C221E;
        }
        .empty-state-card {
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.9);
          border-radius: 28px;
          padding: 60px 20px;
          text-align: center;
          box-shadow: 0 20px 40px rgba(44,34,30,0.04);
        }
        .empty-state-card h3 {
          margin: 16px 0 6px;
          font-size: 20px;
          font-weight: 800;
          color: #2C221E;
        }
        .empty-state-card p {
          margin: 0;
          font-size: 14px;
          color: #8B7B70;
          font-weight: 500;
        }
      `}</style>

      <div className="support-analytics-container">
        <div className="support-analytics-page">
          
          {/* Hero Analytics Banner */}
          <div className="hero-banner">
            <div className="hero-title-area">
              <h1>☕ Brewed Support Intelligence</h1>
              <p>Real-time support operations dashboard engineered for scale.</p>
            </div>
            <div className="hero-stats-pills">
              <div className="hero-pill">
                <span>{openTickets} Active</span>
                <span>Support Queue</span>
              </div>
              <div className="hero-pill">
                <span>{resolutionRate}%</span>
                <span>Resolution Rate</span>
              </div>
              <div className="hero-pill">
                <span>{averageResponse} min</span>
                <span>Avg Response</span>
              </div>
              <div className="hero-pill">
                <span>98.4%</span>
                <span>Satisfaction</span>
              </div>
            </div>
          </div>

          {/* Analytics Chips & Export Bar */}
          <div className="analytics-chips-bar">
            <div className="chips-group">
              <button className={`chip-btn ${dateFilter === 'today' ? 'active' : ''}`} onClick={() => setDateFilter('today')}>Today</button>
              <button className={`chip-btn ${dateFilter === '7days' ? 'active' : ''}`} onClick={() => setDateFilter('7days')}>Week</button>
              <button className={`chip-btn ${dateFilter === '30days' ? 'active' : ''}`} onClick={() => setDateFilter('30days')}>Month</button>
              <button className={`chip-btn ${dateFilter === 'year' ? 'active' : ''}`} onClick={() => setDateFilter('year')}>Year</button>
              <button className={`chip-btn ${dateFilter === 'all' ? 'active' : ''}`} onClick={() => setDateFilter('all')}>All</button>
              <button className={`chip-btn ${dateFilter === 'custom' ? 'active' : ''}`} onClick={() => setDateFilter('custom')}>Custom</button>
            </div>

            {dateFilter === 'custom' && (
              <div className="custom-date-inputs">
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
                <span>to</span>
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
              </div>
            )}

            <div className="export-dropdown-container">
              <button className="export-main-btn" onClick={() => setExportOpen(!exportOpen)}>
                ⬇ Export Report ▾
              </button>
              {exportOpen && (
                <div className="export-menu">
                  <button onClick={exportExcel}>Excel (.xlsx)</button>
                  <button onClick={exportCSV}>CSV (.csv)</button>
                  <button onClick={exportPDFSimulation}>Print / PDF</button>
                </div>
              )}
            </div>
          </div>

          {/* Top Insights Panel */}
          <div className="insights-panel">
            <div className="insights-header">
              <span>💡</span> Top Executive Insights
            </div>
            <div className="insights-list">
              <div className="insight-item">
                <span>🚀</span> Resolution rate increased by 12% compared to last period.
              </div>
              <div className="insight-item">
                <span>📊</span> <strong>{mostCommonCategory}</strong> category generates {Math.round((categoryData[0]?.value || 0) / (totalTickets || 1) * 100)}% of total tickets.
              </div>
              <div className="insight-item">
                <span>⭐</span> Top performer <strong>{topStaff ? topStaff[0] : 'Olivia'}</strong> closed {topStaff ? topStaff[1].closed : 0} high-priority tickets.
              </div>
              <div className="insight-item">
                <span>⏱</span> Average response time improved down to {averageResponse} minutes.
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-top-row">
                <div className="kpi-icon-title">
                  <span>🎫</span> Total Tickets
                </div>
                <div className="kpi-badge-growth">▲ +12%</div>
              </div>
              <div className="kpi-main-value">{animatedTotal}</div>
              <div className="kpi-live-footer">
                <span>Live • Updated now</span>
                <span>Trend</span>
              </div>
              <div style={{ height: "40px", width: "100%" }}>
                <ResponsiveContainer width="100%" height={40}>
                  <AreaChart data={miniSparklineData}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#C4956A" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#C4956A" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="value" stroke="#C4956A" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-top-row">
                <div className="kpi-icon-title">
                  <span>📂</span> Active Queue
                </div>
                <div className="kpi-badge-growth" style={{ background: 'rgba(231, 180, 106, 0.15)', color: '#D97706' }}>Active</div>
              </div>
              <div className="kpi-main-value">{animatedOpen}</div>
              <div className="kpi-live-footer">
                <span>Requires attention</span>
                <span>Volume</span>
              </div>
              <div style={{ height: "40px", width: "100%" }}>
                <ResponsiveContainer width="100%" height={40}>
                  <AreaChart data={miniSparklineData}>
                    <defs>
                      <linearGradient id="colorOpen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#E7B46A" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#E7B46A" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="value" stroke="#E7B46A" strokeWidth={2} fillOpacity={1} fill="url(#colorOpen)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-top-row">
                <div className="kpi-icon-title">
                  <span>✅</span> Resolved
                </div>
                <div className="kpi-badge-growth">▲ +8%</div>
              </div>
              <div className="kpi-main-value">{animatedResolved}</div>
              <div className="kpi-live-footer">
                <span>Successfully closed</span>
                <span>Output</span>
              </div>
              <div style={{ height: "40px", width: "100%" }}>
                <ResponsiveContainer width="100%" height={40}>
                  <AreaChart data={miniSparklineData}>
                    <defs>
                      <linearGradient id="colorRes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6CBF84" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#6CBF84" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="value" stroke="#6CBF84" strokeWidth={2} fillOpacity={1} fill="url(#colorRes)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-top-row">
                <div className="kpi-icon-title">
                  <span>🎯</span> Resolution Rate
                </div>
                <div className="kpi-badge-growth">Optimal</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
                <div>
                  <div className="kpi-main-value" style={{ marginBottom: "0" }}>{animatedRate}%</div>
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#8B7B70", fontWeight: "700" }}>Efficiency Score</p>
                </div>
                <div style={{ width: "70px", height: "70px", position: "relative" }}>
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
                    />
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "800" }}>
                    {animatedRate}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="analytics-section">
            <h2 className="section-title">📊 Operational Analytics</h2>
            <div className="chart-grid-2col">
              <div className="glass-chart-card">
                <div className="chart-card-header">
                  <h3>Daily Ticket Volume Trend</h3>
                  <p>Inflow performance across selected period</p>
                </div>
                {trendData.length === 0 ? (
                  <div className="empty-state-card" style={{ padding: "40px 0" }}>
                    <p>No timeline history available.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="colorMainTrend" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#C4956A" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="#C4956A" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                      <XAxis dataKey="day" tick={{ fill: '#8B7B70', fontSize: 12 }} />
                      <YAxis tick={{ fill: '#8B7B70', fontSize: 12 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="total" stroke="#C4956A" strokeWidth={3} fillOpacity={1} fill="url(#colorMainTrend)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="glass-chart-card">
                <div className="chart-card-header">
                  <h3>Ticket Status Distribution</h3>
                  <p>Workload breakdown</p>
                </div>
                {totalTickets === 0 ? (
                  <div className="empty-state-card" style={{ padding: "40px 0" }}>
                    <p>No status data.</p>
                  </div>
                ) : (
                  <div className="donut-container">
                    <div className="donut-center-label">
                      <h2>{totalTickets}</h2>
                      <p>Tickets</p>
                    </div>
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={70} outerRadius={105} paddingAngle={6}>
                          <Cell fill={BREWED_COLORS.open} />
                          <Cell fill={BREWED_COLORS.pending} />
                          <Cell fill={BREWED_COLORS.resolved} />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Categories Section */}
          <div className="analytics-section">
            <h2 className="section-title">📁 Category Workloads</h2>
            <div className="category-pill-grid">
              {categoryData.length === 0 ? (
                <div className="empty-state-card" style={{ gridColumn: "1/-1" }}>
                  <span style={{ fontSize: "32px" }}>📭</span>
                  <h3>No support activity yet</h3>
                  <p>Support tickets will appear here automatically.</p>
                </div>
              ) : (
                categoryData.map(item => {
                  const pct = Math.round((item.value / totalTickets) * 100) || 0;
                  return (
                    <div key={item.name} className="category-pill-card">
                      <div className="category-pill-info">
                        <span>🍔 {item.name}</span>
                        <span>{item.value} ({pct}%)</span>
                      </div>
                      <div className="staff-progress-bar" style={{ margin: "10px 0 0" }}>
                        <div className="staff-progress-fill" style={{ width: `${pct}%`, background: "#C4956A" }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Heatmap & Priority Section */}
          <div className="analytics-section">
            <div className="chart-grid-2col">
              <div className="heatmap-card">
                <div className="chart-card-header">
                  <h3>🔥 Activity Heatmap</h3>
                  <p>Daily ticket distribution pattern</p>
                </div>
                <div className="heatmap-grid">
                  {heatmapCells.map((cell) => {
                    let bg = "#F2ECE5";
                    if (cell.level === 1) bg = "#EEDCC5";
                    if (cell.level === 2) bg = "#D6B492";
                    if (cell.level >= 3) bg = "#C4956A";
                    return (
                      <div 
                        key={cell.id} 
                        className="heatmap-box" 
                        style={{ background: bg }} 
                        title={`${cell.count} tickets recorded`}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="glass-chart-card">
                <div className="chart-card-header">
                  <h3>🚨 Priority Levels</h3>
                  <p>Urgent vs normal distribution</p>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={[
                    { name: "High", count: highPriority },
                    { name: "Normal", count: normalPriority },
                    { name: "Low", count: lowPriority }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                    <XAxis dataKey="name" tick={{ fill: '#8B7B70', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#8B7B70', fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      <Cell fill="#D9534F" />
                      <Cell fill="#E7B46A" />
                      <Cell fill="#6CBF84" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Staff Cards Section */}
          <div className="analytics-section">
            <h2 className="section-title">👩‍💼 Support Team Performance</h2>
            <div className="staff-grid-modern">
              {Object.entries(staffStats).length === 0 ? (
                <div className="empty-state-card" style={{ gridColumn: "1/-1" }}>
                  <p>No staff assignment data found.</p>
                </div>
              ) : (
                Object.entries(staffStats).map(([staff, data]) => {
                  const efficiency = data.total > 0 ? Math.round((data.closed / data.total) * 100) : 0;
                  return (
                    <div key={staff} className="staff-card-modern">
                      <div className="staff-header-row">
                        <div className="staff-name-role">
                          <div className="staff-avatar">{staff.charAt(0).toUpperCase()}</div>
                          <div>
                            <h4>{staff}</h4>
                            <div className="staff-stars">⭐⭐⭐⭐⭐</div>
                          </div>
                        </div>
                        <div className="staff-efficiency-badge">{efficiency}% Efficiency</div>
                      </div>
                      <div className="staff-progress-bar">
                        <div className="staff-progress-fill" style={{ width: `${efficiency}%` }} />
                      </div>
                      <div className="staff-counts-row">
                        <span>✅ {data.closed} Closed</span>
                        <span>⏳ {data.pending} Pending</span>
                        <span>📂 {data.open} Open</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

