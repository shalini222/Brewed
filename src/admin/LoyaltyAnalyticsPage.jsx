import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function LoyaltyAnalyticsPage({
  setPage,
  setActivePage,
}) {
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("all");

  const [analytics, setAnalytics] = useState({
    totalMembers: 0,
    bronze: 0,
    silver: 0,
    gold: 0,
    platinum: 0,
    rewardsRedeemed: 0,
    pointsIssued: 0,
    pointsRedeemed: 0,
  });

  const [revenueStats, setRevenueStats] = useState({
    rewardOrders: 0,
    discountGiven: 0,
    loyaltyRevenue: 0,
    averageOrderValue: 0,
  });

  const [retentionStats, setRetentionStats] = useState({
    newMembers: 0,
    returningCustomers: 0,
    activeUsers: [],
    nearTierCustomers: [],
  });

  const [mostRedeemedReward, setMostRedeemedReward] = useState(null);
  const [topMembers, setTopMembers] = useState([]);
  const [monthlyRedemptions, setMonthlyRedemptions] = useState([]);
  const [pointsTrend, setPointsTrend] = useState([]);

  function isWithinFilter(date) {
    if (dateFilter === "all") return true;

    const now = new Date();
    const target = new Date(date);

    const difference = now - target;

    if (dateFilter === "24hrs") {
      return difference <= 24 * 60 * 60 * 1000;
    }

    if (dateFilter === "48hrs") {
      return difference <= 48 * 60 * 60 * 1000;
    }

    if (dateFilter === "3days") {
      return difference <= 3 * 24 * 60 * 60 * 1000;
    }

    return true;
  }

  async function loadAnalytics() {
    setLoading(true);

    try {
      const [
        usersSnapshot,
        transactionsSnapshot,
        redemptionsSnapshot,
        ordersSnapshot,
      ] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "loyaltyTransactions")),
        getDocs(collection(db, "rewardRedemptions")),
        getDocs(collection(db, "orders")),
      ]);

      const stats = {
        totalMembers: usersSnapshot.size,
        bronze: 0,
        silver: 0,
        gold: 0,
        platinum: 0,
        rewardsRedeemed: 0,
        pointsIssued: 0,
        pointsRedeemed: 0,
      };

      usersSnapshot.forEach((doc) => {
        const user = doc.data();

        switch (user.loyaltyTier) {
          case "Silver":
            stats.silver++;
            break;

          case "Gold":
            stats.gold++;
            break;

          case "Platinum":
            stats.platinum++;
            break;

          default:
            stats.bronze++;
        }
      });

      transactionsSnapshot.forEach((doc) => {
        const tx = doc.data();

        if (
          tx.createdAt &&
          !isWithinFilter(tx.createdAt.toDate())
        ) {
          return;
        }

        if (tx.type === "earned") {
          stats.pointsIssued += tx.points || 0;
        }

        if (tx.type === "redeem") {
          stats.pointsRedeemed += Math.abs(tx.points || 0);
        }
      });

      const rewardCounts = {};

      redemptionsSnapshot.forEach((doc) => {
        const reward = doc.data();

        if (
          reward.redeemedAt &&
          !isWithinFilter(reward.redeemedAt.toDate())
        ) {
          return;
        }

        stats.rewardsRedeemed++;

        const title = reward.rewardTitle || "Unknown Reward";
        rewardCounts[title] = (rewardCounts[title] || 0) + 1;
      });

      let topReward = null;
      let highestCount = 0;

      Object.entries(rewardCounts).forEach(([title, count]) => {
        if (count > highestCount) {
          highestCount = count;
          topReward = {
            title,
            count,
          };
        }
      });

      const revenue = {
        rewardOrders: 0,
        discountGiven: 0,
        loyaltyRevenue: 0,
        averageOrderValue: 0,
      };

      let totalRewardOrderValue = 0;

      ordersSnapshot.forEach((doc) => {
        const order = doc.data();

        if (
          order.createdAt &&
          !isWithinFilter(order.createdAt.toDate())
        ) {
          return;
        }

        if (
          order.rewardId ||
          order.rewardUsed ||
          order.redeemedRewardId
        ) {
          revenue.rewardOrders++;

          revenue.discountGiven +=
            order.rewardDiscount || 0;

          totalRewardOrderValue +=
            order.total || 0;
        }
      });

      revenue.loyaltyRevenue = totalRewardOrderValue;

      if (revenue.rewardOrders > 0) {
        revenue.averageOrderValue =
          Math.round(
            totalRewardOrderValue /
            revenue.rewardOrders
          );
      }

      setRevenueStats(revenue);

      const retention = {
        newMembers: 0,
        returningCustomers: 0,
        activeUsers: [],
        nearTierCustomers: [],
      };

      const now = new Date();

      usersSnapshot.forEach((doc) => {
        const user = doc.data();

        if (user.createdAt?.toDate) {
          const joined = user.createdAt.toDate();
          const diff = now - joined;

          if (diff <= 30 * 24 * 60 * 60 * 1000) {
            retention.newMembers++;
          }
        }

        if ((user.totalOrders || 0) > 1) {
          retention.returningCustomers++;
        }

        const points = user.lifetimePoints || 0;

        if (
          (points >= 400 && points < 500) ||
          (points >= 1400 && points < 1500) ||
          (points >= 2900 && points < 3000)
        ) {
          retention.nearTierCustomers.push({
            name: user.name || "Customer",
            points,
            tier: user.loyaltyTier || "Bronze",
          });
        }
      });

      const activeUsers = usersSnapshot.docs
        .map((doc) => {
          const user = doc.data();

          return {
            name: user.name || "Customer",
            points: user.lifetimePoints || 0,
            tier: user.loyaltyTier || "Bronze",
          };
        })
        .sort((a, b) => b.points - a.points)
        .slice(0, 5);

      retention.activeUsers = activeUsers;
      setRetentionStats(retention);

      const leaderboard = usersSnapshot.docs
        .map((doc) => {
          const user = doc.data();

          return {
            id: doc.id,
            name: user.name || "Customer",
            email: user.email || "",
            tier: user.loyaltyTier || "Bronze",
            lifetimePoints: user.lifetimePoints || 0,
            currentPoints: user.loyaltyPoints || 0,
            rewardsRedeemed: user.totalRewardsRedeemed || 0,
          };
        })
        .sort((a, b) => b.lifetimePoints - a.lifetimePoints)
        .slice(0, 5);

      const months = {};

      redemptionsSnapshot.forEach((doc) => {
        const reward = doc.data();

        if (!reward.redeemedAt) return;

        const date = reward.redeemedAt.toDate();

        if (!isWithinFilter(date)) return;

        const month = date.toLocaleString("default", {
          month: "short",
        });

        months[month] = (months[month] || 0) + 1;
      });

      const pointsByMonth = {};

      transactionsSnapshot.forEach((doc) => {
        const tx = doc.data();

        if (!tx.createdAt) return;

        const date = tx.createdAt.toDate();

        if (!isWithinFilter(date)) return;

        const month = date.toLocaleString("default", {
          month: "short",
        });

        if (!pointsByMonth[month]) {
          pointsByMonth[month] = {
            month,
            issued: 0,
            redeemed: 0,
          };
        }

        if (tx.type === "earned") {
          pointsByMonth[month].issued += tx.points || 0;
        }

        if (tx.type === "redeem") {
          pointsByMonth[month].redeemed += Math.abs(tx.points || 0);
        }
      });

      setAnalytics(stats);
      setMostRedeemedReward(topReward);
      setTopMembers(leaderboard);
      setMonthlyRedemptions(
        Object.entries(months).map(([month, total]) => ({
          month,
          total,
        }))
      );
      setPointsTrend(Object.values(pointsByMonth));
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadAnalytics();
  }, [dateFilter]);

  return (
    <div className="admin-page">
      <div className="loyalty-admin-header">
        <button
          className="back-btn"
          onClick={() => setActivePage("loyalty")}
        >
          ← Back
        </button>

        <h1>📊 Loyalty Analytics</h1>
      </div>

      <div style={{ marginBottom: 25 }}>
        <label
          style={{
            marginRight: 10,
            fontWeight: 600,
            color: "#3B1A08",
          }}
        >
          Activity Range:
        </label>

        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          <option value="all">All Time</option>
          <option value="24hrs">Last 24 Hours</option>
          <option value="48hrs">Last 48 Hours</option>
          <option value="3days">Last 3 Days</option>
        </select>
      </div>

      {loading ? (
        <p>Loading analytics...</p>
      ) : (
        <>
          <div className="analytics-grid">
            <div className="analytics-card">
              <h4>Total Members</h4>
              <h2>{analytics.totalMembers}</h2>
            </div>

            <div className="analytics-card">
              <h4>Bronze</h4>
              <h2>{analytics.bronze}</h2>
            </div>

            <div className="analytics-card">
              <h4>Silver</h4>
              <h2>{analytics.silver}</h2>
            </div>

            <div className="analytics-card">
              <h4>Gold</h4>
              <h2>{analytics.gold}</h2>
            </div>

            <div className="analytics-card">
              <h4>Platinum</h4>
              <h2>{analytics.platinum}</h2>
            </div>

            <div className="analytics-card">
              <h4>Rewards Redeemed</h4>
              <h2>{analytics.rewardsRedeemed}</h2>
            </div>

            <div className="analytics-card">
              <h4>Points Issued</h4>
              <h2>{analytics.pointsIssued}</h2>
            </div>

            <div className="analytics-card">
              <h4>Points Redeemed</h4>
              <h2>{analytics.pointsRedeemed}</h2>
            </div>

            <div className="analytics-card">
              <h4>🎟 Reward Orders</h4>
              <h2>{revenueStats.rewardOrders}</h2>
            </div>

            <div className="analytics-card">
              <h4>💸 Discounts Given</h4>
              <h2>₹{revenueStats.discountGiven}</h2>
            </div>

            <div className="analytics-card">
              <h4>☕ Loyalty Revenue</h4>
              <h2>₹{revenueStats.loyaltyRevenue}</h2>
            </div>

            <div className="analytics-card">
              <h4>📦 Avg Reward Order</h4>
              <h2>₹{revenueStats.averageOrderValue}</h2>
            </div>

            <div className="analytics-card">
              <h4>🆕 New Members (30 Days)</h4>
              <h2>{retentionStats.newMembers}</h2>
            </div>

            <div className="analytics-card">
              <h4>🔁 Returning Customers</h4>
              <h2>{retentionStats.returningCustomers}</h2>
            </div>

            <div className="analytics-card featured">
              <h3>🏆 Most Redeemed Reward</h3>

              {mostRedeemedReward ? (
                <>
                  <h2>{mostRedeemedReward.title}</h2>
                  <p>{mostRedeemedReward.count} redemptions</p>
                </>
              ) : (
                <p>No rewards redeemed yet.</p>
              )}
            </div>
          </div>

          <div className="analytics-section">
            <h2>🎁 Rewards Redeemed by Month</h2>

            <div className="analytics-chart">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={monthlyRedemptions}>
                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis dataKey="month" />

                  <YAxis />

                  <Tooltip />

                  <Bar
                    dataKey="total"
                    fill="#C4956A"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="analytics-section">
            <h2>⭐ Points Activity</h2>

            <div className="analytics-chart">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={pointsTrend}>
                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis dataKey="month" />

                  <YAxis />

                  <Tooltip />

                  <Line
                    type="monotone"
                    dataKey="issued"
                    stroke="#2E7D32"
                    strokeWidth={3}
                    name="Points Issued"
                  />

                  <Line
                    type="monotone"
                    dataKey="redeemed"
                    stroke="#C62828"
                    strokeWidth={3}
                    name="Points Redeemed"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="analytics-section">
            <h2>👑 Top Loyalty Members</h2>

            {topMembers.map((member, index) => (
              <div key={member.id} className="leaderboard-card">
                <div>
                  <strong>
                    #{index + 1} {member.name}
                  </strong>
                  <div>{member.email}</div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div>⭐ {member.lifetimePoints} Lifetime Points</div>
                  <div>🎖 {member.tier}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="analytics-section">
            <h2>🔥 Most Active Loyalty Members</h2>

            {retentionStats.activeUsers.map((user, index) => (
              <div className="leaderboard-card" key={index}>
                <span>
                  #{index + 1} {user.name}
                </span>

                <span>
                  ⭐ {user.points} pts
                  <br />
                  🎖 {user.tier}
                </span>
              </div>
            ))}
          </div>

          <div className="analytics-section">
            <h2>🚀 Close to Next Tier</h2>

            {retentionStats.nearTierCustomers.length === 0 ? (
              <p>No customers close to upgrade.</p>
            ) : (
              retentionStats.nearTierCustomers.map((user, index) => (
                <div className="leaderboard-card" key={index}>
                  {user.name}
                  <br />
                  ⭐ {user.points} points
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
