import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";

export default function SupportAnalyticsManagement() {
  const [tickets, setTickets] = useState([]);

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

  // Calculate live statistics
  const totalTickets = tickets.length;
  const openTickets = tickets.filter((t) => t.status === "Open").length;
  const pendingTickets = tickets.filter((t) => t.status === "Pending").length;
  const closedTickets = tickets.filter((t) => t.status === "Closed").length;
  const resolvedTickets = tickets.filter((t) => t.status === "Resolved").length;
  
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
  tickets.forEach((ticket) => {
    const category = ticket.category || "Other";
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  });
  const categoryData = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
  const mostCommonCategory = categoryData.length > 0 ? categoryData[0][0] : "--";

  // Calculate Priority Analytics
  const highPriority = tickets.filter(t => (t.priority || "").toLowerCase() === "high").length;
  const normalPriority = tickets.filter(t => (t.priority || "").toLowerCase() === "normal").length;
  const lowPriority = tickets.filter(t => (t.priority || "").toLowerCase() === "low").length;
  const urgentPercent = totalTickets === 0 ? 0 : Math.round((highPriority / totalTickets) * 100);

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
      `}</style>

      <div className="support-analytics-page">
        <div className="analytics-header">
          <div>
            <h2>📊 Support Analytics</h2>
            <p>Monitor support performance and customer service metrics.</p>
          </div>
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
            <span className="analytics-icon">👥</span>
            <h3>--</h3>
            <p>Support Staff</p>
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
              categoryData.map(([category, count]) => (
                <div key={category} className="category-row">
                  <span>{category}</span>
                  <strong>{count}</strong>
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
      </div>
    </>
  );
}
