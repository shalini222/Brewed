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
          background: linear-gradient(135deg, #4A2C2A, #7B4F3A);
          color: white;
          padding: 30px;
          border-radius: 20px;
          margin-bottom: 24px;
          text-align: center;
        }

        .loyalty-title {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 12px;
        }

        .tier-name {
          font-size: 20px;
          margin-bottom: 10px;
        }

        .points {
          font-size: 40px;
          font-weight: bold;
          margin-bottom: 20px;
        }

        .progress-bar {
          width: 100%;
          height: 12px;
          background: rgba(255,255,255,0.2);
          border-radius: 999px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: #D4AF37;
          transition: width .4s ease;
        }

        .loyalty-hero p {
          margin-top: 12px;
          opacity: .9;
        }
      `}</style>

      <div className="loyalty-hero">
        <div className="loyalty-title">
          ☕ Brewed Loyalty
        </div>

        <div className="tier-name">
          {loyaltyTier} Member
        </div>

        <div className="points">
          {loyaltyPoints.toLocaleString()} Points
        </div>

        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${Math.min(progress, 100)}%`,
            }}
          />
        </div>

        {nextTier ? (
          <p>
            {pointsToNext} points until {nextTier.name}
          </p>
        ) : (
          <p>Highest Tier Achieved 🎉</p>
        )}
      </div>
    </>
  );
}
