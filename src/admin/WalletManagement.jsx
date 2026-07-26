
import { useState } from "react";

function StatCard({ title, value }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: 22,
        boxShadow: "0 8px 25px rgba(0,0,0,.05)",
        border: "1px solid #eee",
      }}
    >
      <div
        style={{
          color: "#888",
          fontSize: 13,
          marginBottom: 8,
        }}
      >
        {title}
      </div>

      <h2
        style={{
          margin: 0,
          color: "#3B1A08",
        }}
      >
        {value}
      </h2>
    </div>
  );
}

export default function WalletManagement({ setPage }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Balance");

  return (
    <div
      style={{
        background: "#FAF6F0",
        minHeight: "100vh",
        padding: 40,
        fontFamily: "sans-serif",
      }}
    >
      {/* Back Button */}

      <button
        onClick={() => setPage("admin")}
        style={{
          padding: "10px 18px",
          borderRadius: 10,
          border: "none",
          background: "#3B1A08",
          color: "#fff",
          cursor: "pointer",
          marginBottom: 20,
        }}
      >
        ← Back
      </button>

      {/* Title */}

      <h1
        style={{
          fontFamily: "Playfair Display",
          color: "#3B1A08",
          marginBottom: 30,
        }}
      >
        💳 Wallet Management
      </h1>

      {/* Dashboard Stats */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(220px,1fr))",
          gap: 20,
          marginBottom: 30,
        }}
      >
        <StatCard title="Wallet Users" value="0" />
        <StatCard title="Total Balance" value="₹0" />
        <StatCard title="Money Added" value="₹0" />
        <StatCard title="Money Spent" value="₹0" />
        <StatCard title="Refunds" value="₹0" />
        <StatCard title="Rewards" value="₹0" />
      </div>

      {/* Search & Filters */}

      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: 24,
          marginBottom: 30,
          boxShadow: "0 8px 25px rgba(0,0,0,.05)",
          border: "1px solid #eee",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 15,
            flexWrap: "wrap",
          }}
        >
          <input
            type="text"
            placeholder="🔍 Search customer..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            style={{
              flex: 1,
              minWidth: 250,
              padding: 12,
              borderRadius: 10,
              border: "1px solid #ddd",
            }}
          />

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value)
            }
            style={{
              padding: 12,
              borderRadius: 10,
              border: "1px solid #ddd",
            }}
          >
            <option>All</option>
            <option>Active</option>
            <option>Locked</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value)
            }
            style={{
              padding: 12,
              borderRadius: 10,
              border: "1px solid #ddd",
            }}
          >
            <option>Balance</option>
            <option>Transactions</option>
            <option>Newest</option>
          </select>
        </div>
      </div>

      {/* Customer Wallets */}

      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: 25,
          marginBottom: 30,
          border: "1px solid #eee",
          boxShadow: "0 8px 25px rgba(0,0,0,.05)",
        }}
      >
        <h2
          style={{
            marginTop: 0,
            color: "#3B1A08",
          }}
        >
          👥 Customer Wallets
        </h2>

        <p
          style={{
            color: "#777",
          }}
        >
          Wallets will appear here after
          connecting Firestore.
        </p>
      </div>

      {/* Recent Activity */}

      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: 25,
          border: "1px solid #eee",
          boxShadow: "0 8px 25px rgba(0,0,0,.05)",
        }}
      >
        <h2
          style={{
            marginTop: 0,
            color: "#3B1A08",
          }}
        >
          📋 Recent Wallet Activity
        </h2>

        <p
          style={{
            color: "#777",
          }}
        >
          Recent wallet transactions will
          appear here.
        </p>
      </div>
    </div>
  );
}
