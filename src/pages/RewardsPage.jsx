import React, { useEffect, useState } from "react";
import { doc, getDoc, runTransaction, addDoc, collection, query, where, getDocs, orderBy, serverTimestamp, Timestamp } from "firebase/firestore";

import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function RewardsPage({ setPage }) {
  const { currentUser } = useAuth();

  const [points, setPoints] = useState(0);
  const [lifetimePoints, setLifetimePoints] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [redemptions, setRedemptions] = useState([]);

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

        const rewardsQuery = query(
          collection(db, "rewards"),
          where("active", "==", true)
        );
        const rewardsSnap = await getDocs(rewardsQuery);
        setRewards(
          rewardsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
        );

        const redemptionsQuery = query(
          collection(db, "redemptions"),
          where("userId", "==", currentUser.uid)
        );
        const redemptionsSnap = await getDocs(redemptionsQuery);
        setRedemptions(
          redemptionsSnap.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              // Check and update local status if expired
              isExpired: data.expiresAt && data.expiresAt.toDate() < new Date()
            };
          })
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

  const claimReward = async (reward) => {
    try {
      if (points < reward.pointsRequired) {
        alert("Not enough points");
        return;
      }

      const userRef = doc(db, "users", currentUser.uid);
      const codeValue = "BREW" + Math.floor(Math.random() * 100000);
      
      // Calculate expiry date: 30 days from now
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);

      let updatedPoints = 0;

      // Firestore Transaction for atomic safety preventing race conditions
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
          throw "User does not exist!";
        }

        const currentPoints = userDoc.data().rewardPoints || 0;
        if (currentPoints < reward.pointsRequired) {
          throw "Not enough points!";
        }

        updatedPoints = currentPoints - reward.pointsRequired;
        transaction.update(userRef, { rewardPoints: updatedPoints });
      });

      // Create redemption record
      const redemptionData = {
        userId: currentUser.uid,
        rewardId: reward.id,
        rewardTitle: reward.title,
        pointsUsed: reward.pointsRequired,
        status: "active",
        code: codeValue,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(expiryDate)
      };

      const docRef = await addDoc(
        collection(db, "redemptions"),
        redemptionData
      );
      
      setPoints(updatedPoints);
      setRedemptions(prev => [{ 
        id: docRef.id, 
        ...redemptionData, 
        createdAt: new Date(), 
        expiresAt: expiryDate,
        isExpired: false 
      }, ...prev]);

      alert("Reward claimed successfully 🎉");
    } catch (error) {
      console.log("Claim reward error:", error);
      alert(typeof error === "string" ? error : "Failed to claim reward");
    }
  };

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

        .rewards-section {
          margin-top: 40px;
        }

        .rewards-section h2 {
          margin-bottom: 20px;
          font-family: "Playfair Display", serif;
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
          box-shadow: 0 4px 15px rgba(0,0,0,0.04);
        }

        .reward-card button {
          background: #C4956A;
          color: white;
          border: none;
          padding: 12px 25px;
          border-radius: 25px;
          cursor: pointer;
          margin-top: 15px;
        }

        .reward-card button:disabled {
          background: #ccc;
          cursor: not-allowed;
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
            My Active Rewards
          </h2>

          {
            redemptions.length === 0
            ? (
              <p>
                No active rewards yet. Claim some below!
              </p>
            )
            : (
              <div className="reward-grid">
                {
                  redemptions.map(item => {
                    const expiryDateFormatted = item.expiresAt?.toDate 
                      ? item.expiresAt.toDate().toLocaleDateString() 
                      : (item.expiresAt instanceof Date ? item.expiresAt.toLocaleDateString() : "30 days");
                    
                    return (
                      <div
                        className="reward-card"
                        key={item.id}
                      >
                        <h3>
                          ☕ {item.rewardTitle}
                        </h3>

                        <p>
                          Code: <strong>{item.code}</strong>
                        </p>

                        <p>
                          Status: <span style={{ textTransform: "capitalize", color: item.isExpired ? "#999" : "#C4956A", fontWeight: "bold" }}>
                            {item.isExpired ? "Expired" : item.status}
                          </span>
                        </p>

                        <p style={{ fontSize: "12px", color: "#666" }}>
                          Expires: {expiryDateFormatted}
                        </p>

                        <button 
                          disabled={item.isExpired || item.status !== "active"}
                          onClick={() => {
                            if (setPage) {
                              setPage("checkout");
                            } else {
                              alert(`Apply code: ${item.code} at checkout!`);
                            }
                          }}
                        >
                          {item.isExpired ? "Expired" : "Use Reward"}
                        </button>
                      </div>
                    );
                  })
                }
              </div>
            )
          }

        </section>

        <section className="rewards-section">

          <h2>
            Available Rewards
          </h2>

          <div className="reward-grid">
            {
              rewards.map(reward => (
                <div
                  className="reward-card"
                  key={reward.id}
                >
                  <h3>
                    {reward.icon} {reward.title}
                  </h3>

                  <p>
                    {reward.description}
                  </p>

                  <strong>
                    {reward.pointsRequired} Points
                  </strong>

                  <div>
                    <button
                      disabled={points < reward.pointsRequired}
                      onClick={() => claimReward(reward)}
                    >
                      {
                        points >= reward.pointsRequired
                        ? "Claim Reward"
                        : "Need More Points"
                      }
                    </button>
                  </div>
                </div>
              ))
            }
          </div>

        </section>

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
                  style={{ marginTop: "15px" }}
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
