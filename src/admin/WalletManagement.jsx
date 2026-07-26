import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
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

export default function WalletManagement({ setPage, db }) {
  // Phase 2.1: State
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Balance");

  // Phase 2.2: Load Wallets from Firestore
  useEffect(() => {
    async function fetchWallets() {
      try {
        setLoading(true);
        
        // Fetch users and wallet subcollections or collections
        // Adjust collection names according to your Firestore database structure
        const usersSnapshot = await getDocs(collection(db, "users"));
        const walletsSnapshot = await getDocs(collection(db, "wallets"));

        // Map wallets by userId for easy merging
        const walletsMap = {};
        walletsSnapshot.forEach((doc) => {
          const data = doc.data();
          walletsMap[data.userId || doc.id] = data;
        });

        const mergedData = [];
        usersSnapshot.forEach((userDoc) => {
          userData = userDoc.id;
          const uData = userDoc.data();
          const wData = walletsMap[userDoc.id] || {};

          mergedData.push({
            id: userDoc.id,
            name: uData.name || uData.displayName || "Customer",
            email: uData.email || "No email",
            balance: wData.balance || 0,
            rewardBalance: wData.rewardBalance || wData.rewards || 0,
            transactionCount: wData.transactionCount || wData.transactions?.length || 0,
            status: wData.status || (uData.isLocked ? "Locked" : "Active"),
          });
        });

        setWallets(mergedData);
      } catch (error) {
        console.error("Error fetching wallets:", error);
      } finally {
        setLoading(false);
      }
    }

    if (db) {
      fetchWallets();
    } else {
      setLoading(false);
    }
  }, [db]);

  // Phase 2.3: Dynamic Statistics Calculations
  const totalUsersCount = wallets.length;
  const totalBalanceSum = wallets.reduce((acc, curr) => acc + (Number(curr.balance) || 0), totalUsersCount ? 0 : 0);
  
  // These can be tied to dynamic transaction history logs if available, default to 0 or derived fields
  const moneyAddedSum = wallets.reduce((acc, curr) => acc + (Number(curr.moneyAdded) || 0), 0);
  const moneySpentSum = wallets.reduce((acc, curr) => acc + (Number(curr.moneySpent) || 0), 0);
  const refundsSum = wallets.reduce((acc, curr) => acc + (Number(curr.refunds) || 0), 0);
  const rewardsSum = wallets.reduce((acc, curr) => acc + (Number(curr.rewardBalance) || 0), 0);

  // Filtering & Sorting Logic
  const filteredWallets = wallets
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
      return 0; // Default/Newest
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

      {/* Phase 2.3: Dynamic Dashboard Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: 20,
          marginBottom: 30,
        }}
      >
        <StatCard title="Wallet Users" value={totalUsersCount} />
        <StatCard title="Total Balance" value={`₹${totalBalanceSum.toLocaleString()}`} />
        <StatCard title="Money Added" value={`₹${moneyAddedSum.toLocaleString()}`} />
        <StatCard title="Money Spent" value={`₹${moneySpentSum.toLocaleString()}`} />
        <StatCard title="Refunds" value={`₹${refundsSum.toLocaleString()}`} />
        <StatCard title="Rewards" value={`₹${rewardsSum.toLocaleString()}`} />
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

      {/* Phase 2.4 & 2.5: Customer Wallets Grid / Cards or Empty State */}
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
          /* Phase 2.5: Empty State */
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#777" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>💳</div>
            <h3 style={{ color: "#3B1A08", margin: "10px 0" }}>No Wallets Found</h3>
            <p style={{ margin: 0, fontSize: 14 }}>
              Customer wallets will appear here once users start using the Brewed Wallet.
            </p>
          </div>
        ) : (
          /* Phase 2.4: Responsive Wallet Cards Grid */
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
                  borderRadius: 12,
                  padding: 20,
                  border: "1px solid #e8dfd8",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontWeight: "bold", color: "#3B1A08", fontSize: 16 }}>
                    👤 {wallet.name}
                  </div>
                  <div style={{ color: "#777", fontSize: 13, marginBottom: 15 }}>
                    {wallet.email}
                  </div>

                  <hr style={{ border: "none", borderTop: "1px solid #e8dfd8", margin: "10px 0" }} />

                  <div style={{ display: "flex", justifyContent: "space-between", margin: "10px 0" }}>
                    <div>
                      <div style={{ fontSize: 12, color: "#888" }}>Wallet Balance</div>
                      <div style={{ fontWeight: "bold", color: "#3B1A08", fontSize: 16 }}>
                        ₹{wallet.balance.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: "#888" }}>Reward Balance</div>
                      <div style={{ fontWeight: "bold", color: "#3B1A08", fontSize: 16 }}>
                        ₹{wallet.rewardBalance.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", margin: "10px 0 15px 0", fontSize: 13 }}>
                    <span style={{ color: "#666" }}>Transactions: <b>{wallet.transactionCount}</b></span>
                    <span style={{ color: "#666" }}>
                      Status: <b>{wallet.status === "Active" ? "🟢 Active" : "🔒 Locked"}</b>
                    </span>
                  </div>

                  <hr style={{ border: "none", borderTop: "1px solid #e8dfd8", margin: "10px 0 15px 0" }} />
                </div>

                <button
                  onClick={() => {
                    // Transition to Phase 3 view details view if needed, e.g. setPage("wallet-detail", wallet.id)
                    if (typeof setPage === "function") {
                      // setPage("walletDetail", wallet.id);
                    }
                  }}
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
          Recent wallet transactions will appear here.
        </p>
      </div>
    </div>
  );
}
