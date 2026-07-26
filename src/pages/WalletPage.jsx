import { useState, useEffect } from "react";
import { query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  addDoc,
  collection,
  serverTimestamp
} from "firebase/firestore";

export default function WalletPage({ setPage }) {
  const { currentUser } = useAuth();

  const [balance, setBalance] = useState(0);
  const [promoBalance, setPromoBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [amount, setAmount] = useState("");
  const [showTransactions, setShowTransactions] = useState(false);
  const [filter, setFilter] = useState("all");

  // Phase 5 Reward States
  const [rewardBalance, setRewardBalance] = useState(0);
  const [showRewards, setShowRewards] = useState(false);
  const [rewards, setRewards] = useState([]);

  useEffect(() => {
    if (!currentUser) return;

    loadWallet();
  }, [currentUser]);

  async function loadWallet() {
    try {
      setLoading(true);

      const walletRef = doc(db, "wallets", currentUser.uid);
      const walletSnap = await getDoc(walletRef);

      if (walletSnap.exists()) {
        const data = walletSnap.data();

        setBalance(data.balance || 0);
        setPromoBalance(data.promoBalance || 0);
      }

      const q = query(
        collection(db, "walletTransactions"),
        where("userId", "==", currentUser.uid),
        orderBy("createdAt", "desc"),
        limit(5)
      );

      const snapshot = await getDocs(q);

      setTransactions(
        snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }))
      );

      // Load Rewards From Firestore
      const rewardsRef = collection(db, "rewards");

      const rewardQuery = query(
        rewardsRef,
        where("userId", "==", currentUser.uid),
        orderBy("createdAt", "desc"),
        limit(10)
      );

      const rewardSnapshot = await getDocs(rewardQuery);

      const rewardData = rewardSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setRewards(rewardData);

      const totalRewards = rewardData.reduce(
        (total, item) => total + item.amount,
        0
      );

      setRewardBalance(totalRewards);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }
  
  const handleAddMoney = async () => {
    if (!amount || amount <= 0) {
      alert("Enter a valid amount");
      return;
    }

    try {
      const walletRef = doc(db, "wallets", currentUser.uid);

      const walletSnap = await getDoc(walletRef);

      let currentBalance = 0;

      if (walletSnap.exists()) {
        currentBalance = walletSnap.data().balance || 0;
      }

      const newBalance = currentBalance + Number(amount);

      // Update wallet balance
      await setDoc(
        walletRef,
        {
          balance: newBalance,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      // Create transaction
      await addDoc(
        collection(db, "walletTransactions"),
        {
          userId: currentUser.uid,
          type: "credit",
          title: "Wallet Top Up",
          amount: Number(amount),
          status: "completed",
          createdAt: serverTimestamp()
        }
      );

      setBalance(newBalance);
      setShowAddMoney(false);
      setAmount("");
      loadWallet();

      alert("Money added successfully");

    } catch (error) {
      console.error(error);
      alert("Something went wrong");
    }
  };

  const filteredTransactions =
    filter === "all"
      ? transactions
      : transactions.filter(
          (item) => item.type === filter
        );

  return (
    <div className="wallet-page">
      <style>{`
        .wallet-page {
          min-height: 100vh;
          background: #FDFAF5;
          padding: 24px;
        }

        .wallet-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 28px;
        }

        .wallet-back-button {
          width: 42px;
          height: 42px;
          border: none;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          font-size: 20px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          transition: 0.2s;
        }

        .wallet-back-button:hover {
          transform: translateY(-2px);
        }

        .wallet-heading {
          font-family: "Playfair Display", serif;
          font-size: 2rem;
          color: #2C2C2C;
          margin: 0;
        }

        .wallet-placeholder {
          width: 42px;
        }

        .wallet-card {
          background: linear-gradient(135deg, #C4956A, #A7774F);
          color: white;
          border-radius: 24px;
          padding: 24px;
          margin-bottom: 28px;
          box-shadow: 0 12px 30px rgba(0,0,0,0.12);
        }

        .wallet-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .wallet-label {
          font-size: 0.9rem;
          opacity: 0.9;
        }

        .wallet-chip {
          background: rgba(255,255,255,0.2);
          padding: 6px 12px;
          border-radius: 50px;
          font-size: 0.75rem;
        }

        .wallet-balance {
          font-size: 2.8rem;
          margin: 12px 0;
        }

        .wallet-description {
          opacity: 0.9;
          margin-bottom: 22px;
        }

        .wallet-button-group {
          display: flex;
          gap: 12px;
        }

        .wallet-primary-btn,
        .wallet-secondary-btn {
          flex: 1;
          padding: 14px;
          border-radius: 14px;
          border: none;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s;
        }

        .wallet-primary-btn {
          background: white;
          color: #A7774F;
        }

        .wallet-secondary-btn {
          background: rgba(255,255,255,0.15);
          color: white;
          border: 1px solid rgba(255,255,255,0.3);
        }

        .wallet-primary-btn:hover,
        .wallet-secondary-btn:hover {
          transform: translateY(-2px);
        }

        .wallet-actions {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 30px;
        }

        .wallet-action-card {
          background: #ffffff;
          border: 1px solid #eae3d9;
          padding: 20px 16px;
          border-radius: 18px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
          transition: 0.2s;
        }

        .wallet-action-card:hover {
          transform: translateY(-2px);
          border-color: #C4956A;
        }

        .wallet-action-icon {
          font-size: 24px;
        }

        .wallet-action-card span {
          font-size: 0.9rem;
          font-weight: 600;
          color: #2C2C2C;
        }

        .wallet-transactions {
          background: #ffffff;
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
          border: 1px solid #eae3d9;
        }

        .wallet-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .wallet-section-header h3,
        .wallet-section-header h2 {
          font-size: 1.1rem;
          color: #2C2C2C;
          margin: 0;
        }

        .wallet-view-all {
          background: none;
          border: none;
          color: #A7774F;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.9rem;
        }

        .wallet-view-all:hover {
          text-decoration: underline;
        }

        .wallet-empty-state {
          text-align: center;
          padding: 30px 20px;
        }

        .wallet-empty-icon {
          font-size: 36px;
          margin-bottom: 12px;
        }

        .wallet-empty-state h4 {
          color: #2C2C2C;
          margin: 0 0 8px 0;
          font-size: 1rem;
        }

        .wallet-empty-state p {
          color: #666;
          font-size: 0.85rem;
          margin: 0;
          line-height: 1.4;
        }

        .wallet-promo {
          opacity: 0.9;
          margin-top: -5px;
          margin-bottom: 20px;
        }

        .wallet-transaction-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .wallet-transaction-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 0;
          border-bottom: 1px solid #eee;
        }

        .wallet-transaction-item:last-child {
          border-bottom: none;
        }

        .wallet-transaction-item p {
          margin: 4px 0 0;
          color: #777;
          font-size: 0.85rem;
        }

        .wallet-transaction-item h4 {
          margin: 0;
        }

        .wallet-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.45);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .wallet-modal {
          background: white;
          width: 90%;
          max-width: 400px;
          border-radius: 24px;
          padding: 24px;
        }

        .amount-options {
          display: grid;
          grid-template-columns: repeat(2,1fr);
          gap: 12px;
          margin: 20px 0;
        }

        .amount-options button {
          padding: 14px;
          border-radius: 12px;
          border: 1px solid #eae3d9;
          background: #FDFAF5;
          cursor: pointer;
        }

        .wallet-modal input {
          width: 100%;
          padding: 14px;
          border-radius: 12px;
          border: 1px solid #ddd;
          margin-bottom: 15px;
        }

        .wallet-close-btn {
          width: 100%;
          margin-top: 12px;
          padding: 14px;
          border-radius: 12px;
          border: none;
          background: #eee;
          cursor: pointer;
        }

        .transaction-modal {
          max-height: 80vh;
          overflow-y: auto;
        }

        .transaction-filters {
          display: flex;
          gap: 10px;
          margin: 20px 0;
        }

        .transaction-filters button {
          padding: 8px 16px;
          border-radius: 20px;
          border: 1px solid #ddd;
          background: white;
          cursor: pointer;
          text-transform: capitalize;
        }

        .active-filter {
          background: #C4956A !important;
          color: white;
          border-color: #C4956A !important;
        }

        .reward-balance {
          background: #FDFAF5;
          padding: 20px;
          border-radius: 18px;
          text-align: center;
          margin-bottom: 20px;
        }

        .reward-balance p {
          color: #777;
          margin: 0;
        }

        .reward-balance h2 {
          color: #C4956A;
          font-size: 32px;
        }

        @media (max-width: 768px) {
          .wallet-actions {
            grid-template-columns: 1fr;
          }

          .wallet-button-group {
            flex-direction: column;
          }

          .wallet-balance {
            font-size: 2.2rem;
          }
        }
      `}</style>

      {/* Header */}
      <header className="wallet-header">
        <button
          className="wallet-back-button"
          onClick={() => setPage("menu")}
        >
          ←
        </button>

        <h1 className="wallet-heading">Wallet</h1>

        <div className="wallet-placeholder" />
      </header>

      {/* Wallet Card */}
      <section className="wallet-card">
        <div className="wallet-card-top">
          <p className="wallet-label">Available Balance</p>
          <span className="wallet-chip">Brewed Wallet</span>
        </div>

        <h2 className="wallet-balance">
          ₹{balance.toFixed(2)}
        </h2>
        <p className="wallet-promo">
          Promo Balance: ₹{promoBalance.toFixed(2)}
        </p>
        <p className="wallet-description">
          Pay faster, receive instant refunds and earn rewards.
        </p>

        <div className="wallet-button-group">
          <button
            className="wallet-primary-btn"
            onClick={() => setShowAddMoney(true)}
          >
            Add Money
          </button>

          <button
            className="wallet-secondary-btn"
            onClick={() => setShowRewards(true)}
          >
            Rewards
          </button>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="wallet-actions">
        <button 
          className="wallet-action-card"
          onClick={() => setShowTransactions(true)}
        >
          <div className="wallet-action-icon">📜</div>
          <span>Transactions</span>
        </button>

        <button className="wallet-action-card">
          <div className="wallet-action-icon">💳</div>
          <span>Payments</span>
        </button>

        <button className="wallet-action-card">
          <div className="wallet-action-icon">💸</div>
          <span>Refunds</span>
        </button>
      </section>

      {/* Recent Transactions Section */}
      <div className="wallet-transactions">
        <div className="wallet-section-header">
          <h3>Recent Transactions</h3>
          <button
            className="wallet-view-all"
            onClick={() => setShowTransactions(true)}
          >
            View All
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="wallet-empty-state">
            <div className="wallet-empty-icon">💰</div>
            <h4>No Transactions Yet</h4>
            <p>
              Add money or make your first purchase to
              see your wallet activity.
            </p>
          </div>
        ) : (
          <div className="wallet-transaction-list">
            {transactions.slice(0, 3).map((transaction) => (
              <div
                key={transaction.id}
                className="wallet-transaction-item"
              >
                <div>
                  <strong>{transaction.title}</strong>
                  <p>{transaction.status}</p>
                </div>

                <h4
                  style={{
                    color:
                      transaction.type === "credit"
                        ? "#2E7D32"
                        : "#C62828",
                  }}
                >
                  {transaction.type === "credit" ? "+" : "-"}₹
                  {transaction.amount}
                </h4>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Money Modal */}
      {showAddMoney && (
        <div className="wallet-modal-overlay">
          <div className="wallet-modal">
            <h2>Add Money</h2>

            <div className="amount-options">
              {[100, 250, 500, 1000].map((value) => (
                <button
                  key={value}
                  onClick={() => setAmount(value)}
                >
                  ₹{value}
                </button>
              ))}
            </div>

            <input
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            <button
              className="wallet-primary-btn"
              style={{ width: "100%" }}
              onClick={handleAddMoney}
            >
              Continue
            </button>

            <button
              className="wallet-close-btn"
              onClick={() => setShowAddMoney(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Transactions History Modal */}
      {showTransactions && (
        <div className="wallet-modal-overlay">
          <div className="wallet-modal transaction-modal">
            <div className="wallet-section-header">
              <h2>Transactions</h2>
              <button
                className="wallet-view-all"
                onClick={() => setShowTransactions(false)}
              >
                ✕
              </button>
            </div>

            <div className="transaction-filters">
              {["all", "credit", "debit"].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={
                    filter === type
                      ? "active-filter"
                      : ""
                  }
                >
                  {type}
                </button>
              ))}
            </div>

            {filteredTransactions.length === 0 ? (
              <p style={{ textAlign: "center", color: "#777", padding: "20px 0" }}>No transactions found</p>
            ) : (
              <div className="wallet-transaction-list">
                {filteredTransactions.map((item) => (
                  <div
                    key={item.id}
                    className="wallet-transaction-item"
                  >
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.status}</p>
                    </div>

                    <h4
                      style={{
                        color:
                          item.type === "credit"
                            ? "#2E7D32"
                            : "#C62828",
                      }}
                    >
                      {item.type === "credit" ? "+" : "-"}₹
                      {item.amount}
                    </h4>
                  </div>
                ))}
              </div>
            )}

            <button
              className="wallet-close-btn"
              style={{ marginTop: "20px" }}
              onClick={() => setShowTransactions(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Rewards Modal */}
      {showRewards && (
        <div className="wallet-modal-overlay">
          <div className="wallet-modal transaction-modal">
            <div className="wallet-section-header">
              <h2>Rewards 🎁</h2>
              <button
                className="wallet-view-all"
                onClick={() => setShowRewards(false)}
              >
                ✕
              </button>
            </div>

            <div className="reward-balance">
              <p>Available Rewards</p>
              <h2>₹{rewardBalance}</h2>
            </div>

            {rewards.length === 0 ? (
              <p style={{ textAlign: "center", color: "#777", padding: "20px 0" }}>
                No rewards yet.
              </p>
            ) : (
              <div className="wallet-transaction-list">
                {rewards.map((reward) => (
                  <div
                    key={reward.id}
                    className="wallet-transaction-item"
                  >
                    <div>
                      <strong>{reward.title}</strong>
                      <p>{reward.date}</p>
                    </div>

                    <h4 style={{ color: "#2E7D32" }}>
                      +₹{reward.amount}
                    </h4>
                  </div>
                ))}
              </div>
            )}

            <button
              className="wallet-close-btn"
              style={{ marginTop: "20px" }}
              onClick={() => setShowRewards(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
