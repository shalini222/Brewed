
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export default function LoyaltyAnalyticsPage({
  setPage,
  setActivePage,
}) {
  const [loading, setLoading] = useState(true);

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

  async function loadAnalytics() {
    setLoading(true);

    try {
      const [
        usersSnapshot,
        transactionsSnapshot,
        redemptionsSnapshot,
      ] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "loyaltyTransactions")),
        getDocs(collection(db, "rewardRedemptions")),
      ]);

      const stats = {
        totalMembers: usersSnapshot.size,
        bronze: 0,
        silver: 0,
        gold: 0,
        platinum: 0,
        rewardsRedeemed: redemptionsSnapshot.size,
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

        if (tx.type === "earned") {
          stats.pointsIssued += tx.points || 0;
        }

        if (tx.type === "redeem") {
          stats.pointsRedeemed += Math.abs(tx.points || 0);
        }
      });

      setAnalytics(stats);
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadAnalytics();
  }, []);

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
          </div>
        </>
      )}
    </div>
  );
}
