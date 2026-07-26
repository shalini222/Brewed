import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

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
  // State
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Balance");

  // 6. Selected Wallet State for Phase 3
  const [selectedWallet, setSelectedWallet] = useState(null);

  // Load and Merge Data
  useEffect(() => {
    async function fetchAndMergeData() {
      try {
        setLoading(true);

        // Load both collections concurrently
        const [usersSnapshot, walletsSnapshot] = await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "wallets")),
        ]);

        // Map wallets by document ID (matching user ID)
        const walletsMap = {};
        walletsSnapshot.forEach((doc) => {
          walletsMap[doc.id] = doc.data();
        });

        // Merge users and wallets
        const mergedData = [];
        usersSnapshot.forEach((userDoc) => {
          const user = userDoc.data();
          const wallet = walletsMap[userDoc.id];

          // 2. Don't count users without wallets
          if (!wallet) return;

          mergedData.push({
            id: userDoc.id,
            name: user.name || user.displayName || "Customer",
            email: user.email || "No email",
            photoURL: user.photoURL || "",

            balance: wallet?.balance || 0,
            rewardBalance: wallet?.rewardBalance || wallet?.rewards || 0,
            transactionCount: wallet?.transactionCount || wallet?.transactions?.length || 0,
            
            // 7. Status consistency with Customer Management page
            status: user.active === false ? "Locked" : (wallet?.status || "Active"),
            
            // Extra tracked stats if present in wallet document
            moneyAdded: wallet?.moneyAdded || 0,
            moneySpent: wallet?.moneySpent || 0,
            refunds: wallet?.refunds || 0,
            
            // 4. updatedAt for Newest sort support
            updatedAt: wallet?.updatedAt?.toMillis?.() || wallet?.updatedAt || 0,
          });
        });

        setWallets(mergedData);
      } catch (error) {
        console.error("Error loading user wallets:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAndMergeData();
  }, []);

  // Dashboard Statistics Calculations from Merged Data
  const totalWalletUsers = wallets.length;
  const totalBalance = wallets.reduce((acc, curr) => acc + (Number(curr.balance) || 0), 0);
  const totalMoneyAdded = wallets.reduce((acc, curr) => acc + (Number(curr.moneyAdded) || 0), 0);
  const totalMoneySpent = wallets.reduce((acc, curr) => acc + (Number(curr.moneySpent) || 0), 0);
  const totalRefunds = wallets.reduce((acc, curr) => acc + (Number(curr.refunds) || 0), 0);
  const totalRewards = wallets.reduce((acc, curr) => acc + (Number(curr.rewardBalance) || 0), 0);

  // 3. Avoid mutating while sorting & 4. Newest sort support
  const filteredWallets = [...wallets]
    .filter((wallet) => {
      const matchesSearch =
        wallet.name.toLowerCase().includes(search.toLowerCase()) ||
        wallet.email.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "All" || wallet.status === statusFilter;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "Balance") return b.balance - a.balance;
      if (sortBy === "Transactions") return b.transactionCount - a.transactionCount;
      if (sortBy === "Newest") return b.updatedAt - a.updatedAt;
      return 0;
    });

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
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 20,
          marginBottom: 30,
        }}
      >
        <StatCard title="Wallet Users" value={totalWalletUsers} />
        <StatCard title="Total Balance" value={`₹${totalBalance.toLocaleString()}`} />
        <StatCard title="Money Added" value={`₹${totalMoneyAdded.toLocaleString()}`} />
        <StatCard title="Money Spent" value={`₹${totalMoneySpent.toLocaleString()}`} />
        <StatCard title="Refunds" value={`₹${totalRefunds.toLocaleString()}`} />
        <StatCard title="Rewards" value={`₹${totalRewards.toLocaleString()}`} />
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
            onChange={(e) => setSearch(e.target.value)}
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
            onChange={(e) => setStatusFilter(e.target.value)}
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
            onChange={(e) => setSortBy(e.target.value)}
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

      {/* Customer Wallets Section */}
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
            marginBottom: 20,
          }}
        >
          👥 Customer Wallets
        </h2>

        {loading ? (
          <p style={{ color: "#777" }}>Loading customer wallets...</p>
        ) : filteredWallets.length === 0 ? (
          // Empty State
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#777" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>💳</div>
            <h3 style={{ color: "#3B1A08", margin: "10px 0" }}>No Wallets Found</h3>
            <p style={{ margin: 0, fontSize: 14 }}>
              Customer wallets will appear here once users start using the Brewed Wallet.
            </p>
          </div>
        ) : (
          // Wallet Cards Grid Layout
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 20,
            }}
          >
            {filteredWallets.map((wallet) => (
              <div
                key={wallet.id}
                style={{
                  background: "#FAF6F0",
                  borderRadius: 14,
                  padding: 20,
                  border: "1px solid #e8dfd8",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontWeight: "bold", color: "#3B1A08", fontSize: 16, marginBottom: 4 }}>
                    👤 {wallet.name}
                  </div>
                  <div style={{ color: "#777", fontSize: 13, marginBottom: 15 }}>
                    📧 {wallet.email}
                  </div>

                  <div style={{ fontSize: 14, color: "#3B1A08", marginBottom: 6 }}>
                    💰 Balance: <b>₹{wallet.balance.toLocaleString()}</b>
                  </div>
                  <div style={{ fontSize: 14, color: "#3B1A08", marginBottom: 6 }}>
                    🎁 Rewards: <b>₹{wallet.rewardBalance.toLocaleString()}</b>
                  </div>
                  <div style={{ fontSize: 14, color: "#3B1A08", marginBottom: 15 }}>
                    📊 Transactions: <b>{wallet.transactionCount}</b>
                  </div>

                  <div style={{ marginBottom: 15, fontSize: 13, fontWeight: "500" }}>
                    {wallet.status === "Active" ? "🟢 Active" : "🔒 Locked"}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedWallet(wallet)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: 8,
                    border: "none",
                    background: "#3B1A08",
                    color: "#fff",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  View Wallet
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Recent Activity */}
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
          Recent wallet transactions will appear here.
        </p>
      </div>
    </div>
  );
}
