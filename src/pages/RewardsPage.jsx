import React from "react";

export default function RewardsPage({ setPage }) {
  const user = {
    name: "Sarah",
    points: 1250,
  };

  const getTier = (points) => {
    if (points >= 5000) return "Gold";
    if (points >= 1000) return "Silver";
    return "Bronze";
  };

  const tier = getTier(user.points);

  const nextTierPoints = tier === "Bronze" ? 1000 : 5000;
  const progress = Math.min(
    (user.points / nextTierPoints) * 100,
    100
  );

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
          gap:20px;
        }

        .reward-card {
          background:white;
          padding:25px;
          border-radius:20px;
        }

        .reward-card button {
          background:#C4956A;
          color:white;
          border:none;
          padding:12px 25px;
          border-radius:25px;
        }
      `}</style>

      <div className="rewards-page">

        <div className="rewards-header">

          <h1>
            {user.name}'s Rewards
          </h1>

          <div className="tier-card">

            <span className="tier-icon">
              {tier === "Gold" ? "👑" : tier === "Silver" ? "🥈" : "☕"}
            </span>

            <h2>
              {tier} Member
            </h2>

            <p>
              {user.points} Points
            </p>

            <small>
              ₹{Math.floor(user.points / 10)} Rewards Value
            </small>

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
              {nextTierPoints - user.points > 0
                ? `${nextTierPoints - user.points} points until next tier`
                : "Maximum tier reached 🎉"
              }
            </p>

          </div>

        </div>


        <section className="rewards-section">

          <h2>
            Available Rewards
          </h2>


          <div className="reward-grid">

            <div className="reward-card">

              <h3>
                ☕ Free Coffee
              </h3>

              <p>
                1000 Points
              </p>

              <button>
                Claim
              </button>

            </div>


            <div className="reward-card">

              <h3>
                🎁 ₹100 Discount
              </h3>

              <p>
                500 Points
              </p>

              <button>
                Claim
              </button>

            </div>


          </div>

        </section>


      </div>
    </>
  );
}

