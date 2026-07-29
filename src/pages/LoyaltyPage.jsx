import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

const rewards = [
  {
    id: 1,
    title: "Free Espresso",
    icon: "☕",
    points: 200,
    color: "#F8F3ED",
  },
  {
    id: 2,
    title: "Free Croissant",
    icon: "🥐",
    points: 300,
    color: "#FFF5E8",
  },
  {
    id: 3,
    title: "Cheesecake Slice",
    icon: "🍰",
    points: 450,
    color: "#FFF2F2",
  },
  {
    id: 4,
    title: "₹100 Wallet Credit",
    icon: "💳",
    points: 1000,
    color: "#EEF8F0",
  },
];

export default function LoyaltyPage({ setPage }) {
  const [loading, setLoading] = useState(true);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [lifetimePoints, setLifetimePoints] = useState(0);
  const [loyaltyTier, setLoyaltyTier] = useState("Bronze");
  
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;

    async function loadLoyalty() {
      try {
        setLoading(true);

        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();

          setLoyaltyPoints(data.loyaltyPoints || 0);
          setLifetimePoints(data.lifetimePoints || 0);
          setLoyaltyTier(data.loyaltyTier || "Bronze");
        }
      } catch (err) {
        console.error("Error loading loyalty:", err);
      } finally {
        setLoading(false);
      }
    }

    loadLoyalty();
  }, [currentUser]);

  const TIERS = [
    {
      name: "Bronze",
      min: 0,
      max: 499,
    },
    {
      name: "Silver",
      min: 500,
      max: 1499,
    },
    {
      name: "Gold",
      min: 1500,
      max: 2999,
    },
    {
      name: "Platinum",
      min: 3000,
      max: Infinity,
    },
  ];

  const currentTier = TIERS.find(
    (tier) => tier.name === loyaltyTier
  );

  const nextTier = TIERS.find(
    (tier) => tier.min > loyaltyPoints
  );

  let progress = 100;
  let pointsToNext = 0;

  if (nextTier && currentTier) {
    progress =
      ((loyaltyPoints - currentTier.min) /
        (nextTier.min - currentTier.min)) *
      100;

    pointsToNext = nextTier.min - loyaltyPoints;
  }

  if (loading) {
    return <div style={{ textAlign: "center", padding: "40px" }}>Loading loyalty info...</div>;
  }

  return (
    <>
      <style>{`
        .loyalty-page-container {
          padding: 0 40px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .loyalty-hero {
          background: linear-gradient(135deg,#4A2C2A,#6D4434,#8A5A42);
          border-radius: 18px;
          color: white;
          overflow: hidden;
          margin: 20px auto;
          box-shadow: 0 10px 30px rgba(0,0,0,.15);
        }

        .hero-overlay {
          padding: 16px 22px;
        }

        .hero-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .hero-subtitle {
          font-size: 10px;
          letter-spacing: 2px;
          text-transform: uppercase;
          opacity: .8;
          margin-bottom: 2px;
        }

        .hero-title {
          font-size: 21px;
          margin: 0;
          font-family: "Playfair Display", serif;
        }

        .coffee-icon {
          font-size: 26px;
        }

        .hero-main-flex {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 10px;
        }

        .hero-points-group {
          display: flex;
          align-items: baseline;
          gap: 6px;
        }

        .hero-points {
          font-size: 32px;
          font-weight: 700;
          line-height: 1;
        }

        .hero-label {
          font-size: 13px;
          opacity: .85;
        }

        .progress-wrapper {
          flex: 1;
          margin-left: 24px;
        }

        .progress-track {
          width: 100%;
          height: 6px;
          background: rgba(255,255,255,.15);
          border-radius: 999px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg,#F7D774,#D4AF37);
          transition: .4s;
        }

        .progress-text {
          margin-top: 4px;
          font-size: 11px;
          color: #F6E9D5;
        }

        .stats-grid {
          margin-top: 14px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }

        .stat-card {
          background: rgba(255,255,255,.12);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255,255,255,.15);
          border-radius: 8px;
          padding: 8px 10px;
          text-align: center;
        }

        .stat-number {
          display: block;
          font-size: 16px;
          font-weight: 700;
        }

        .stat-title {
          display: block;
          margin-top: 2px;
          font-size: 10px;
          opacity: .8;
        }

        .membership-card {
          background: #fff;
          border-radius: 22px;
          padding: 30px;
          margin: 30px auto;
          box-shadow: 0 12px 30px rgba(0,0,0,.08);
        }

        .membership-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
        }

        .membership-header h2 {
          margin: 0;
          font-size: 28px;
          color: #3F2B22;
          font-family: "Playfair Display", serif;
        }

        .membership-header p {
          margin-top: 6px;
          color: #777;
        }

        .tier-badge {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: #F8F3ED;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 34px;
        }

        .benefits-list {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 18px;
        }

        .benefit-item {
          background: #FDFAF5;
          border: 1px solid #EFE6DA;
          border-radius: 16px;
          padding: 18px;
          font-size: 16px;
          color: #4A2C2A;
          transition: .25s;
        }

        .benefit-item:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(0,0,0,.08);
        }

        .rewards-section {
          margin: 40px auto;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .section-header h2 {
          font-family: "Playfair Display", serif;
          color: #3F2B22;
          margin: 0;
          font-size: 28px;
        }

        .view-all-btn {
          background: none;
          border: none;
          color: #8B5E3C;
          font-weight: 600;
          cursor: pointer;
        }

        .rewards-scroll {
          display: flex;
          gap: 20px;
          overflow-x: auto;
          padding-bottom: 10px;
          scrollbar-width: none;
        }

        .rewards-scroll::-webkit-scrollbar {
          display: none;
        }

        .reward-card {
          min-width: 240px;
          background: #fff;
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 10px 25px rgba(0,0,0,.08);
          transition: .3s;
          flex-shrink: 0;
          border: 1px solid #EFE6DA;
        }

        .reward-card:hover {
          transform: translateY(-5px);
        }

        .reward-icon {
          width: 70px;
          height: 70px;
          border-radius: 18px;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 34px;
          margin-bottom: 18px;
        }

        .reward-card h3 {
          margin-bottom: 10px;
          color: #3F2B22;
          margin-top: 0;
        }

        .reward-card p {
          color: #777;
          margin-bottom: 20px;
          margin-top: 0;
        }

        .redeem-btn {
          width: 100%;
          border: none;
          border-radius: 12px;
          padding: 12px;
          background: #6F4E37;
          color: white;
          cursor: pointer;
          font-weight: 600;
        }

        .redeem-btn:hover {
          background: #5C3E2C;
        }

        .redeem-btn.disabled {
          background: #D7D7D7;
          cursor: not-allowed;
          color: #666;
        }

        @media (max-width: 768px) {
          .loyalty-page-container {
            padding: 0 24px;
          }

          .hero-overlay {
            padding: 12px 14px;
          }

          .hero-title {
            font-size: 18px;
          }

          .hero-main-flex {
            flex-direction: column;
            align-items: flex-start;
          }

          .progress-wrapper {
            margin-left: 0;
            margin-top: 8px;
            width: 100%;
          }

          .hero-points {
            font-size: 28px;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .coffee-icon {
            display: none;
          }

          .membership-card {
            padding: 20px;
          }

          .membership-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 15px;
          }

          .benefits-list {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="loyalty-page-container">
        <div className="loyalty-hero">
          <div className="hero-overlay">

            <div className="hero-top">
              <div>
                <p className="hero-subtitle">Brewed Loyalty</p>
                <h1 className="hero-title">
                  {loyaltyTier === "Bronze" && "🥉"}
                  {loyaltyTier === "Silver" && "🥈"}
                  {loyaltyTier === "Gold" && "🥇"}
                  {loyaltyTier === "Platinum" && "💎"}{" "}
                  {loyaltyTier} Member
                </h1>
              </div>

              <div className="coffee-icon">☕</div>
            </div>

            <div className="hero-main-flex">
              <div>
                <div className="hero-points-group">
                  <span className="hero-points">{loyaltyPoints.toLocaleString()}</span>
                  <span className="hero-label">Points</span>
                </div>
              </div>

              <div className="progress-wrapper">
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min(progress, 100)}%`,
                    }}
                  />
                </div>

                <p className="progress-text">
                  {nextTier
                    ? `${pointsToNext} points until ${nextTier.name}`
                    : "Highest Tier Achieved 🎉"}
                </p>
              </div>
            </div>

            <div className="stats-grid">

              <div className="stat-card">
                <span className="stat-number">
                  {loyaltyPoints.toLocaleString()}
                </span>
                <span className="stat-title">
                  Current Points
                </span>
              </div>

              <div className="stat-card">
                <span className="stat-number">
                  {lifetimePoints.toLocaleString()}
                </span>
                <span className="stat-title">
                  Lifetime
                </span>
              </div>

              <div className="stat-card">
                <span className="stat-number">
                  {nextTier ? nextTier.name : "MAX"}
                </span>
                <span className="stat-title">
                  Next Tier
                </span>
              </div>

              <div className="stat-card">
                <span className="stat-number">
                  {pointsToNext.toLocaleString()}
                </span>
                <span className="stat-title">
                  Remaining
                </span>
              </div>

            </div>

          </div>
        </div>

        <div className="membership-card">

          <div className="membership-header">
            <div>
              <h2>Your Membership</h2>
              <p>{loyaltyTier} Member</p>
            </div>

            <div className="tier-badge">
              {loyaltyTier === "Bronze" && "🥉"}
              {loyaltyTier === "Silver" && "🥈"}
              {loyaltyTier === "Gold" && "🥇"}
              {loyaltyTier === "Platinum" && "💎"}
            </div>
          </div>

          <div className="benefits-list">

            <div className="benefit-item">
              ☕ Earn {loyaltyTier === "Bronze"
                ? "5"
                : loyaltyTier === "Silver"
                ? "10"
                : loyaltyTier === "Gold"
                ? "15"
                : "20"} points per ₹100 spent
            </div>

            <div className="benefit-item">
              🎂 Birthday Reward
            </div>

            <div className="benefit-item">
              🎁 Exclusive Member Offers
            </div>

            <div className="benefit-item">
              🚀 Early Access to Seasonal Drinks
            </div>

            {loyaltyTier === "Gold" || loyaltyTier === "Platinum" ? (
              <div className="benefit-item">
                🚚 Free Delivery Days
              </div>
            ) : null}

            {loyaltyTier === "Platinum" ? (
              <div className="benefit-item">
                💎 Platinum Exclusive Menu
              </div>
            ) : null}

          </div>

        </div>

        <div className="rewards-section">

          <div className="section-header">
            <h2>Available Rewards</h2>
            <button className="view-all-btn">
              View All →
            </button>
          </div>

          <div className="rewards-scroll">

            {rewards.map((reward) => {

              const canRedeem = loyaltyPoints >= reward.points;

              return (

                <div
                  key={reward.id}
                  className="reward-card"
                >

                  <div
                    className="reward-icon"
                    style={{ background: reward.color }}
                  >
                    {reward.icon}
                  </div>

                  <h3>{reward.title}</h3>

                  <p>{reward.points} Points</p>

                  <button
                    className={
                      canRedeem
                        ? "redeem-btn"
                        : "redeem-btn disabled"
                    }
                    disabled={!canRedeem}
                  >
                    {canRedeem
                      ? "Redeem"
                      : "Need More Points"}
                  </button>

                </div>

              );
            })}

          </div>

        </div>

      </div>
    </>
  );
}
