import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

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
      </div>
    </>
  );
}
