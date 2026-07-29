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
          border-radius: 24px;
          color: white;
          overflow: hidden;
          margin: 40px auto;
          max-width: 1200px;
          box-shadow: 0 18px 45px rgba(0,0,0,.18);
        }

        .hero-overlay {
          padding: 40px;
        }

        .hero-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .hero-subtitle {
          font-size: 14px;
          letter-spacing: 3px;
          text-transform: uppercase;
          opacity: .8;
          margin-bottom: 8px;
        }

        .hero-title {
          font-size: 40px;
          margin: 0;
          font-family: "Playfair Display", serif;
        }

        .coffee-icon {
          font-size: 46px;
        }

        .hero-points {
          margin-top: 35px;
          font-size: 64px;
          font-weight: 700;
          line-height: 1;
        }

        .hero-label {
          font-size: 18px;
          opacity: .85;
          margin-top: 8px;
        }

        .progress-wrapper {
          margin-top: 30px;
        }

        .progress-track {
          width: 100%;
          height: 12px;
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
          margin-top: 10px;
          color: #F6E9D5;
        }

        .stats-grid {
          margin-top: 35px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
        }

        .stat-card {
          background: rgba(255,255,255,.12);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255,255,255,.15);
          border-radius: 18px;
          padding: 20px;
          text-align: center;
        }

        .stat-number {
          display: block;
          font-size: 28px;
          font-weight: 700;
        }

        .stat-title {
          display: block;
          margin-top: 8px;
          font-size: 14px;
          opacity: .8;
        }

        @media (max-width: 768px) {
          .hero-overlay {
            padding: 24px;
          }

          .hero-title {
            font-size: 28px;
          }

          .hero-points {
            font-size: 48px;
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

          <div className="hero-points">
            {loyaltyPoints.toLocaleString()}
          </div>

          <div className="hero-label">
            Loyalty Points
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
