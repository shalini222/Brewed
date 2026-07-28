import React, { useEffect, useState } from "react";
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";

import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function RewardsPage({ setPage }) {
  const { currentUser } = useAuth();

  const [points, setPoints] = useState(0);
  const [lifetimePoints, setLifetimePoints] = useState(0);
  const [transactions, setTransactions] = useState([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    async function loadRewards() {
      try {
        const userRef = doc(
          db,
          "users",
          currentUser.uid
        );

        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();

          setPoints(data.rewardPoints || 0);
          setLifetimePoints(data.lifetimePoints || 0);
        }

        const transactionQuery = query(
          collection(db, "rewardTransactions"),
          where(
            "userId",
            "==",
            currentUser.uid
          ),
          orderBy(
            "createdAt",
            "desc"
          )
        );

        const transactionSnap = await getDocs(transactionQuery);

        setTransactions(
          transactionSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
        );
      }
      catch (error) {
        console.log(
          "Rewards error:",
          error
        );
      }
      finally {
        setLoading(false);
      }
    }

    loadRewards();
  }, [currentUser]);

  const getTier = (points) => {
    if (points >= 5000)
      return "Gold";

    if (points >= 1000)
      return "Silver";

    return "Bronze";
  };

  const tier = getTier(lifetimePoints);

  const nextTier =
    tier === "Bronze"
      ? 1000
      : tier === "Silver"
      ? 5000
      : lifetimePoints;

  const progress =
    tier === "Gold"
      ? 100
      : Math.min(
          (lifetimePoints / nextTier) * 100,
          100
        );

  if (loading) {
    return (
      <>
        <style>{`
          .rewards-page {
            min-height: 100vh;
            background: #FDFAF5;
            padding: 40px;
            font-family: "Inter", sans-serif;
          }
          .rewards-header {
            text-align: center;
          }
          .rewards-header h1 {
            font-family: "Playfair Display", serif;
            font-size: 42px;
          }
          .tier-card {
            background: white;
            border-radius: 24px;
            padding: 30px;
            max-width: 400px;
            margin: 30px auto;
            box-shadow: 0 10px 30px rgba(0,0,0,0.08);
          }
          .tier-icon {
            font-size: 45px;
          }
          .tier-card h2 {
            color: #C4956A;
          }
          .progress-section {
            max-width: 500px;
            margin: auto;
          }
          .progress-bar {
            height: 12px;
            background: #eee;
            border-radius: 20px;
            overflow: hidden;
          }
          .progress-fill {
            height: 100%;
            background: #C4956A;
          }
          .reward-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit,minmax(220px,1fr));
            gap: 20px;
          }
          .reward-card {
            background: white;
            padding: 25px;
            border-radius: 20px;
          }
          .reward-card button {
            background: #C4956A;
            color: white;
            border: none;
            padding: 12px 25px;
            border-radius: 25px;
          }
        `}</style>
        <div className="rewards-page">
          <h2>
            Loading rewards...
          </h2>
        </div>
      </>
    );
  }

  if (!currentUser) {
    return (
      <>
        <style>{`
          .rewards-page {
            min-height: 100vh;
            background: #FDFAF5;
            padding: 40px;
            font-family: "Inter", sans-serif;
          }
          .rewards-header {
            text-align: center;
          }
          .rewards-header h1 {
            font-family: "Playfair Display", serif;
            font-size: 42px;
          }
          .tier-card {
            background: white;
            border-radius: 24px;
            padding: 30px;
            max-width: 400px;
            margin: 30px auto;
            box-shadow: 0 10px 30px rgba(0,0,0,0.08);
          }
          .tier-icon {
            font-size: 45px;
          }
          .tier-card h2 {
            color: #C4956A;
          }
          .progress-section {
            max-width: 500px;
            margin: auto;
          }
          .progress-bar {
            height: 12px;
            background: #eee;
            border-radius: 20px;
            overflow: hidden;
          }
          .progress-fill {
            height: 100%;
            background: #C4956A;
          }
          .reward-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit,minmax(220px,1fr));
            gap: 20px;
          }
          .reward-card {
            background: white;
            padding: 25px;
            border-radius: 20px;
          }
          .reward-card button {
            background: #C4956A;
            color: white;
            border: none;
            padding: 12px 25px;
            border-radius: 25px;
          }
        `}</style>
        <div className="rewards-page">
          <h2>
            Login to view rewards
          </h2>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        .rewards-page {
          min-height: 100vh;
          background: #FDFAF5;
          padding: 40px;
          font-family: "Inter", sans-serif;
        }

        .rewards-header {
          text-align: center;
        }

        .rewards-header h1 {
          font-family: "Playfair Display", serif;
          font-size: 42px;
        }

        .tier-card {
          background: white;
          border-radius: 24px;
          padding: 30px;
          max-width: 400px;
          margin: 30px auto;
          box-shadow: 0 10px 30px rgba(0,0,0,0.08);
        }

        .tier-icon {
          font-size: 45px;
        }

        .tier-card h2 {
          color: #C4956A;
        }

        .progress-section {
          max-width: 500px;
          margin: auto;
        }

        .progress-bar {
          height: 12px;
          background: #eee;
          border-radius: 20px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: #C4956A;
        }

        .reward-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit,minmax(220px,1fr));
          gap: 20px;
        }

        .reward-card {
          background: white;
          padding: 25px;
          border-radius: 20px;
        }

        .reward-card button {
          background: #C4956A;
          color: white;
          border: none;
          padding: 12px 25px;
          border-radius: 25px;
        }
      `}</style>

      <div className="rewards-page">

        <div className="rewards-header">

          <h1>
            {currentUser.displayName || "Coffee Lover"}'s Rewards
          </h1>

          <div className="tier-card">

            <span className="tier-icon">
              {
                tier === "Gold"
                ? "👑"
                : tier === "Silver"
                ? "🥈"
                : "☕"
              }
            </span>

            <h2>
              {tier} Member
            </h2>

            <h3>
              {points} Points
            </h3>

            <p>
              ₹{Math.floor(points / 10)} Reward Value
            </p>

          </div>

          <div className="progress-section">

            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${progress}%`
                }}
              />
            </div>

            <p>
              {
                tier === "Gold"
                ? "You reached the highest tier 🎉"
                : `${nextTier - lifetimePoints} points until next tier`
              }
            </p>

          </div>

        </div>

        <section className="rewards-section">

          <h2>
            Reward History
          </h2>

          {
            transactions.length === 0
            ? (
              <p>
                No reward activity yet
              </p>
            )
            : (
              transactions.map(item => (
                <div
                  className="reward-card"
                  key={item.id}
                >
                  <h3>
                    {item.reason}
                  </h3>

                  <p>
                    {item.type === "earned" ? "+" : "-"}
                    {item.points} points
                  </p>
                </div>
              ))
            )
          }

        </section>

      </div>
    </>
  );
}
