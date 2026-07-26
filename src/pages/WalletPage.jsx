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
