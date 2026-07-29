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
        .loyalty-hero {
          background: linear-gradient(135deg,#4A2C2A,#6D4434,#8A5A42);
          border-radius: 20px;
          color: white;
          overflow: hidden;
          margin: 25px auto;
          max-width: 1200px;
          box-shadow: 0 12px 35px rgba(0,0,0,.15);
        }

        .hero-overlay {
          padding: 20px 22px;
        }

        .hero-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .hero-subtitle {
          font-size: 11px;
          letter-spacing: 2px;
          text-transform: uppercase;
          opacity: .8;
          margin-bottom: 3px;
        }

        .hero-title {
          font-size: 24px;
          margin: 0;
          font-family: "Playfair Display", serif;
        }

        .coffee-icon {
          font-size: 30px;
        }

        .hero-main-flex {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 12px;
        }

        .hero-points-group {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }

        .hero-points {
          font-size: 38px;
          font-weight: 700;
          line-height: 1;
        }

        .hero-label {
          font-size: 14px;
          opacity: .85;
        }

        .progress-wrapper {
          flex: 1;
          margin-left: 30px;
        }

        .progress-track {
          width: 100%;
          height: 7px;
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
          margin-top: 5px;
          font-size: 12px;
          color: #F6E9D5;
        }

        .stats-grid {
          margin-top: 16px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }

        .stat-card {
          background: rgba(255,255,255,.12);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255,255,255,.15);
          border-radius: 10px;
          padding: 10px 12px;
          text-align: center;
        }

        .stat-number {
          display: block;
          font-size: 18px;
          font-weight: 700;
        }

        .stat-title {
          display: block;
          margin-top: 3px;
          font-size: 11px;
          opacity: .8;
        }

        @media (max-width: 768px) {
          .hero-overlay {
            padding: 14px 16px;
          }

          .hero-title {
            font-size: 20px;
          }

          .hero-main-flex {
            flex-direction: column;
            align-items: flex-start;
          }

          .progress-wrapper {
            margin-left: 0;
            margin-top: 10px;
            width: 100%;
          }

          .hero-points {
            font-size: 32px;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .coffee-icon {
            display: none;
          }
        }
      `}</style>

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
    </>
  );
}
