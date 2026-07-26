export default function WalletPage({ setPage }) {
  return (
    <div className="wallet-page">
      {/* Header */}
      <header className="wallet-header">
        <button
          className="wallet-back-button"
          onClick={() => setPage("profile")}
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

        <h2 className="wallet-balance">₹0.00</h2>

        <p className="wallet-description">
          Pay faster, receive instant refunds and earn rewards.
        </p>

        <div className="wallet-button-group">
          <button className="wallet-primary-btn">
            Add Money
          </button>

          <button className="wallet-secondary-btn">
            Rewards
          </button>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="wallet-actions">
        <button className="wallet-action-card">
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

      {/* Recent Transactions */}
      <section className="wallet-transactions">
        <div className="wallet-section-header">
          <h3>Recent Transactions</h3>

          <button className="wallet-view-all">
            View All
          </button>
        </div>

        <div className="wallet-empty-state">
          <div className="wallet-empty-icon">💰</div>

          <h4>No Transactions Yet</h4>

          <p>
            Add money or make your first purchase to
            see your wallet activity.
          </p>
        </div>
      </section>
    </div>
  );
}


/* ===========================
   WALLET PAGE
=========================== */

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
