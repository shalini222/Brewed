import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function RewardsPage({ setPage }) {

  const { currentUser } = useAuth();

const [user, setUser] = useState({
  name: "",
  beans: 0,
  tier: "Bronze",
  nextTier: "Silver",
  birthday: "",
});

  useEffect(() => {
  if (!currentUser) return;

  const loadRewards = async () => {
    try {
      const snap = await getDoc(doc(db, "users", currentUser.uid));

      if (!snap.exists()) return;

      const data = snap.data();

      const beans = data.rewards?.beans ?? 0;

      let tier = "Bronze";
      let nextTier = "Silver";

      if (beans >= 1000) {
        tier = "Gold";
        nextTier = "Max";
      } else if (beans >= 250) {
        tier = "Silver";
        nextTier = "Gold";
      }

      setUser({
        name: data.name || currentUser.displayName || "Guest",
        beans,
        tier,
        nextTier,
        birthday: data.birthday || "",
      });

    } catch (err) {
      console.error(err);
    }
  };

  loadRewards();
}, [currentUser]);

  const target =
  user.tier === "Bronze"
    ? 250
    : user.tier === "Silver"
    ? 1000
    : 1000;

const progress = (user.beans / target) * 100;

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');

*{
  box-sizing:border-box;
}

body{
  margin:0;
  background:#FDFAF5;
  font-family:'Inter',sans-serif;
}

.rewards-page{
  min-height:100vh;
  background:#FDFAF5;
  padding:110px 20px 60px;
  display:flex;
  justify-content:center;
}

.rewards-container{
  width:100%;
  max-width:820px;
}

.back-button{
  background:none;
  border:none;
  color:#3B1A08;
  font-size:16px;
  font-weight:600;
  cursor:pointer;
  margin-bottom:30px;
  padding:0;
  transition:.3s;
}

.back-button:hover{
  color:#C4956A;
  transform:translateX(-4px);
}

.greeting{
  font-family:'Playfair Display',serif;
  color:#3B1A08;
  font-size:2.6rem;
  margin-bottom:10px;
}

.subtitle{
  color:#7A675C;
  margin-bottom:35px;
}

.reward-card{
  background:white;
  border-radius:24px;
  padding:30px;
  box-shadow:0 12px 35px rgba(0,0,0,.08);
  margin-bottom:24px;
}

.beans{
  font-size:3rem;
  font-weight:700;
  color:#C4956A;
}

.beans-label{
  color:#7A675C;
  margin-top:6px;
  margin-bottom:25px;
}

.progress-track{
  width:100%;
  height:14px;
  background:#EFE5DB;
  border-radius:999px;
  overflow:hidden;
}

.progress-fill{
  height:100%;
  background:linear-gradient(90deg,#C4956A,#E6C08D);
  border-radius:999px;
}

.progress-text{
  margin-top:12px;
  color:#6B5C53;
  font-weight:500;
}

.tier-card{
  display:flex;
  justify-content:space-between;
  align-items:center;
  background:#FFF8F1;
  border-radius:18px;
  padding:22px;
  margin-top:30px;
}

.tier-title{
  font-size:1.2rem;
  font-weight:700;
  color:#3B1A08;
}

.tier-sub{
  color:#7A675C;
  margin-top:4px;
}

.tier-badge{
  background:#3B1A08;
  color:white;
  padding:10px 20px;
  border-radius:999px;
  font-weight:600;
}

.birthday-card{
  background:linear-gradient(135deg,#3B1A08,#5A2A12);
  color:white;
  border-radius:22px;
  padding:30px;
  margin-bottom:24px;
}

.birthday-title{
  font-family:'Playfair Display',serif;
  font-size:2rem;
  margin-bottom:10px;
}

.birthday-text{
  opacity:.9;
  line-height:1.6;
}

.reward-history{
  background:white;
  border-radius:22px;
  padding:28px;
  box-shadow:0 12px 35px rgba(0,0,0,.08);
}

.history-title{
  font-family:'Playfair Display',serif;
  font-size:2rem;
  color:#3B1A08;
  margin-bottom:20px;
}

.history-item{
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:18px 0;
  border-bottom:1px solid #EEE;
}

.history-item:last-child{
  border-bottom:none;
}

.history-name{
  font-weight:600;
  color:#3B1A08;
}

.history-date{
  color:#8B7B70;
  font-size:.9rem;
  margin-top:4px;
}

.history-beans{
  color:#C4956A;
  font-weight:700;
}

.claim-btn{
  margin-top:22px;
  background:white;
  color:#3B1A08;
  border:none;
  border-radius:12px;
  padding:14px 24px;
  font-weight:700;
  cursor:pointer;
  transition:.3s;
}

.claim-btn:hover{
  background:#C4956A;
  color:white;
}

@media(max-width:768px){

.rewards-page{
padding:90px 18px 50px;
}

.greeting{
font-size:2.1rem;
}

.beans{
font-size:2.4rem;
}

.tier-card{
flex-direction:column;
align-items:flex-start;
gap:18px;
}

.history-item{
flex-direction:column;
align-items:flex-start;
gap:8px;
}

.claim-btn{
width:100%;
}

}`}</style>
      
<div className="rewards-page">

  <div className="rewards-container">

    <button
      className="back-button"
      onClick={() => setPage("menu")}
    >
      ← Back
    </button>

    <h1 className="greeting">
      Good Afternoon, {user.name} ☕
    </h1>

    <p className="subtitle">
      Every coffee brings you closer to your next reward.
    </p>

    <div className="reward-card">

      <div className="beans">
        ⭐ {user.beans}
      </div>

      <div className="beans-label">
        Brewed Beans
      </div>

      <div className="progress-track">

        <div
          className="progress-fill"
          style={{
            width: `${Math.min(progress,100)}%`
          }}
        />

      </div>

      <div className="progress-text">
        {250 - user.beans} Beans until {user.nextTier} Member
      </div>

      <div className="tier-card">

        <div>

          <div className="tier-title">
            Current Membership
          </div>

          <div className="tier-sub">
            Earn more Beans to unlock exclusive rewards.
          </div>

        </div>

        <div className="tier-badge">
          🥉 {user.tier}
        </div>

      </div>

    </div>

    <div className="birthday-card">

      <div className="birthday-title">
        🎂 Birthday Reward
      </div>

      {user.tier === "Bronze" ? (

        <>
          <div className="birthday-text">
            Reach <strong>Silver Member</strong> before your birthday
            to unlock a FREE handcrafted coffee every year.
          </div>

          <button className="claim-btn">
            View Benefits
          </button>
        </>

      ) : (

        <>
          <div className="birthday-text">
            Happy Birthday! Your complimentary handcrafted coffee
            is waiting for you.
          </div>

          <button className="claim-btn">
            Claim Free Coffee
          </button>
        </>

      )}

    </div>

    <div className="reward-history">

      <div className="history-title">
        Recent Bean Activity
      </div>

      {history.map((item,index)=>(

        <div
          className="history-item"
          key={index}
        >

          <div>

            <div className="history-name">
              {item.title}
            </div>

            <div className="history-date">
              {item.date}
            </div>

          </div>

          <div className="history-beans">
            {item.beans}
          </div>

        </div>

      ))}

    </div>

  </div>

</div>

</>
);
}
