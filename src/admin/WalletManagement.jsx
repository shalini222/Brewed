import { useState, useEffect, useMemo } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  increment,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  where,
} from "firebase/firestore";
import { db } from "../firebase";

const actionButtonStyle = {
  padding: 12,
  borderRadius: 10,
  border: "none",
  background: "#3B1A08",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 600,
};

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

  // Selected Wallet State for Phase 3 Drawer
  const [selectedWallet, setSelectedWallet] = useState(null);

  // Modal & Action States for Phase 4.1
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  // Recent Transactions State for Phase 4.5
  const [recentTransactions, setRecentTransactions] = useState([]);

  // Wallet Details Transaction History States for Phase 5.1, 5.2 & 5.3
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [transactionSearch, setTransactionSearch] = useState("");
  const [transactionFilter, setTransactionFilter] = useState("All");
  const [visibleTransactions, setVisibleTransactions] = useState(20);

  // Transaction Details Modal State for Phase 5.4
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  // Reset pagination when search or filter changes
  useEffect(() => {
    setVisibleTransactions(20);
  }, [transactionSearch, transactionFilter]);

  // Load and Merge Data
  useEffect(() => {
    async function fetchAndMergeData() {
      try {
        setLoading(true);

        // Load both collections concurrently along with recent transactions
        const [usersSnapshot, walletsSnapshot, transactionSnapshot] = await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "wallets")),
          getDocs(query(collection(db, "walletTransactions"), orderBy("createdAt", "desc"), limit(10))),
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

          // Don't count users without wallets
          if (!wallet) return;

          mergedData.push({
            id: userDoc.id,
            name: user.name || user.displayName || "Customer",
            email: user.email || "No email",
            photoURL: user.photoURL || "",

            balance: wallet?.balance || 0,
            rewardBalance: wallet?.rewardBalance || wallet?.rewards || 0,
            transactionCount: wallet?.transactionCount || wallet?.transactions?.length || 0,
            
            // Status consistency with Customer Management page
            status: user.active === false ? "Locked" : (wallet?.status || "Active"),
            
            // Extra tracked stats if present in wallet document
            moneyAdded: wallet?.moneyAdded || 0,
            moneySpent: wallet?.moneySpent || 0,
            refunds: wallet?.refunds || 0,
            
            // updatedAt for Newest sort support
            updatedAt: wallet?.updatedAt?.toMillis?.() || wallet?.updatedAt || 0,
          });
        });

        setWallets(mergedData);

        const transactions = transactionSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setRecentTransactions(transactions);
      } catch (error) {
        console.error("Error loading user wallets:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAndMergeData();
  }, []);

  async function loadWalletTransactions(walletId) {
    try {
      setLoadingTransactions(true);

      const q = query(
        collection(db, "walletTransactions"),
        where("walletId", "==", walletId),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);

      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setWalletTransactions(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTransactions(false);
    }
  }

  async function handleWalletAction() {
    if (!selectedWallet) return;

    const value = Number(amount);

    if (!value || value <= 0) {
      alert("Enter a valid amount.");
      return;
    }

    try {
      const walletRef = doc(db, "wallets", selectedWallet.id);

      if (actionType === "credit") {
        await updateDoc(walletRef, {
          balance: increment(value),
          moneyAdded: increment(value),
          updatedAt: serverTimestamp(),
        });
      }

      if (actionType === "debit") {
        await updateDoc(walletRef, {
          balance: increment(-value),
          moneySpent: increment(value),
          updatedAt: serverTimestamp(),
        });
      }

      if (actionType === "reward") {
        await updateDoc(walletRef, {
          rewardBalance: increment(value),
          updatedAt: serverTimestamp(),
        });
      }

      if (actionType === "refund") {
        await updateDoc(walletRef, {
          balance: increment(value),
          refunds: increment(value),
          updatedAt: serverTimestamp(),
        });
      }

      await addDoc(collection(db, "walletTransactions"), {
        walletId: selectedWallet.id,
        customerName: selectedWallet.name,
        customerEmail: selectedWallet.email,
        type: actionType,
        amount: value,
        reason: reason,
        adminAction: true,
        createdAt: serverTimestamp(),
      });

      setWallets((prev) =>
        prev.map((wallet) => {
          if (wallet.id !== selectedWallet.id) return wallet;

          const updatedWallet = { ...wallet };

          switch (actionType) {
            case "credit":
              updatedWallet.balance += value;
              updatedWallet.moneyAdded += value;
              break;

            case "debit":
              updatedWallet.balance -= value;
              updatedWallet.moneySpent += value;
              break;

            case "reward":
              updatedWallet.rewardBalance += value;
              break;

            case "refund":
              updatedWallet.balance += value;
              updatedWallet.refunds += value;
              break;

            default:
              break;
          }

          return updatedWallet;
        })
      );

      if (selectedWallet) {
        const updated = { ...selectedWallet };

        switch (actionType) {
          case "credit":
            updated.balance += value;
            updated.moneyAdded += value;
            break;

          case "debit":
            updated.balance -= value;
            updated.moneySpent += value;
            break;

          case "reward":
            updated.rewardBalance += value;
            break;

          case "refund":
            updated.balance += value;
            updated.refunds += value;
            break;

          default:
            break;
        }

        setSelectedWallet(updated);
        loadWalletTransactions(selectedWallet.id);
      }

      alert("Wallet updated successfully.");

      setShowActionModal(false);
      setAmount("");
      setReason("");

    } catch (err) {
      console.error(err);
      alert("Failed to update wallet.");
    }
  }

  // Dashboard Statistics Calculations from Merged Data
  const totalWalletUsers = wallets.length;
  const totalBalance = wallets.reduce((acc, curr) => acc + (Number(curr.balance) || 0), 0);
  const totalMoneyAdded = wallets.reduce((acc, curr) => acc + (Number(curr.moneyAdded) || 0), 0);
  const totalMoneySpent = wallets.reduce((acc, curr) => acc + (Number(curr.moneySpent) || 0), 0);
  const totalRefunds = wallets.reduce((acc, curr) => acc + (Number(curr.refunds) || 0), 0);
  const totalRewards = wallets.reduce((acc, curr) => acc + (Number(curr.rewardBalance) || 0), 0);

  // Filtered and Sorted Wallets using useMemo
  const filteredWallets = useMemo(() => {
    return [...wallets]
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
  }, [wallets, search, statusFilter, sortBy]);

  // Filtered Transactions inside Drawer for Phase 5.2
  const filteredTransactions = walletTransactions.filter((transaction) => {
    const matchesSearch =
      (transaction.reason || "")
        .toLowerCase()
        .includes(transactionSearch.toLowerCase()) ||
      transaction.type
        .toLowerCase()
        .includes(transactionSearch.toLowerCase());

    const matchesFilter =
      transactionFilter === "All" ||
      transaction.type === transactionFilter;

    return matchesSearch && matchesFilter;
  });

  // Paginated Data for Phase 5.3
  const displayedTransactions = filteredTransactions.slice(
    0,
    visibleTransactions
  );

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
                  {/* User Profile Info with Photo Avatar */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 15 }}>
                    {wallet.photoURL ? (
                      <img
                        src={wallet.photoURL}
                        alt={wallet.name}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          objectFit: "cover",
                          border: "1px solid #e8dfd8",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          background: "#e8dfd8",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 18,
                        }}
                      >
                        👤
                      </div>
                    )}
                    <div style={{ overflow: "hidden" }}>
                      <div style={{ fontWeight: "bold", color: "#3B1A08", fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {wallet.name}
                      </div>
                      <div style={{ color: "#777", fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        📧 {wallet.email}
                      </div>
                    </div>
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
                  onClick={() => {
                    setSelectedWallet(wallet);
                    loadWalletTransactions(wallet.id);
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

        {recentTransactions.length === 0 ? (
          <p style={{ color: "#777" }}>
            No wallet activity yet.
          </p>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {recentTransactions.map((transaction) => (
              <div
                key={transaction.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: 16,
                  border: "1px solid #eee",
                  borderRadius: 12,
                  background: "#FAF6F0",
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      color: "#3B1A08",
                    }}
                  >
                    {transaction.customerName}
                  </div>

                  <div
                    style={{
                      fontSize: 13,
                      color: "#777",
                    }}
                  >
                    {transaction.type.toUpperCase()}
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      color: "#999",
                    }}
                  >
                    {transaction.reason || "No reason"}
                  </div>
                </div>

                <div
                  style={{
                    fontWeight: "bold",
                    color:
                      transaction.type === "debit"
                        ? "#C62828"
                        : "#2E7D32",
                  }}
                >
                  ₹{transaction.amount}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Slide-in Wallet Drawer */}
      {selectedWallet && (
        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            width: "100%",
            maxWidth: 520,
            height: "100vh",
            background: "#fff",
            boxShadow: "-10px 0 40px rgba(0,0,0,.15)",
            zIndex: 1000,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div
            style={{
              background: "#3B1A08",
              color: "#fff",
              padding: 24,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontFamily: "Playfair Display",
              }}
            >
              Wallet Details
            </h2>

            <button
              onClick={() => setSelectedWallet(null)}
              style={{
                background: "transparent",
                border: "none",
                color: "#fff",
                fontSize: 24,
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ padding: 24 }}>
            {/* Customer Profile */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginBottom: 25,
                borderBottom: "1px solid #eee",
                paddingBottom: 20,
              }}
            >
              <img
                src={
                  selectedWallet.photoURL ||
                  `https://ui-avatars.com/api/?background=C4956A&color=fff&name=${encodeURIComponent(
                    selectedWallet.name
                  )}`
                }
                alt={selectedWallet.name}
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />

              <div style={{ flex: 1 }}>
                <h3
                  style={{
                    margin: 0,
                    color: "#3B1A08",
                    fontSize: 22,
                  }}
                >
                  {selectedWallet.name}
                </h3>

                <p
                  style={{
                    margin: "6px 0",
                    color: "#777",
                  }}
                >
                  {selectedWallet.email}
                </p>

                <span
                  style={{
                    display: "inline-block",
                    padding: "6px 12px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: "bold",
                    background:
                      selectedWallet.status === "Active"
                        ? "#E8F5E9"
                        : "#FFEBEE",
                    color:
                      selectedWallet.status === "Active"
                        ? "#2E7D32"
                        : "#C62828",
                  }}
                >
                  {selectedWallet.status}
                </span>
              </div>
            </div>

            {/* Wallet Summary */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: 15,
              }}
            >
              <div
                style={{
                  background: "#FAF6F0",
                  borderRadius: 12,
                  padding: 18,
                }}
              >
                <div style={{ color: "#777", fontSize: 13 }}>
                  Wallet Balance
                </div>

                <h2
                  style={{
                    margin: "8px 0 0",
                    color: "#3B1A08",
                  }}
                >
                  ₹{selectedWallet.balance.toLocaleString()}
                </h2>
              </div>

              <div
                style={{
                  background: "#FAF6F0",
                  borderRadius: 12,
                  padding: 18,
                }}
              >
                <div style={{ color: "#777", fontSize: 13 }}>
                  Rewards Balance
                </div>

                <h2
                  style={{
                    margin: "8px 0 0",
                    color: "#3B1A08",
                  }}
                >
                  ₹{selectedWallet.rewardBalance.toLocaleString()}
                </h2>
              </div>

              <div
                style={{
                  background: "#FAF6F0",
                  borderRadius: 12,
                  padding: 18,
                }}
              >
                <div style={{ color: "#777", fontSize: 13 }}>
                  Total Transactions
                </div>

                <h2
                  style={{
                    margin: "8px 0 0",
                    color: "#3B1A08",
                  }}
                >
                  {selectedWallet.transactionCount}
                </h2>
              </div>
            </div>

            {/* Admin Actions */}
            <div
              style={{
                marginTop: 30,
              }}
            >
              <h3
                style={{
                  color: "#3B1A08",
                  marginBottom: 15,
                }}
              >
                ⚙️ Wallet Actions
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginTop: 25,
                }}
              >
                <button
                  onClick={() => {
                    setActionType("credit");
                    setShowActionModal(true);
                  }}
                  style={actionButtonStyle}
                >
                  ➕ Credit Money
                </button>

                <button
                  onClick={() => {
                    setActionType("debit");
                    setShowActionModal(true);
                  }}
                  style={actionButtonStyle}
                >
                  ➖ Debit Money
                </button>

                <button
                  onClick={() => {
                    setActionType("reward");
                    setShowActionModal(true);
                  }}
                  style={actionButtonStyle}
                >
                  🎁 Reward
                </button>

                <button
                  onClick={() => {
                    setActionType("refund");
                    setShowActionModal(true);
                  }}
                  style={actionButtonStyle}
                >
                  💸 Refund
                </button>

                <button
                  style={{
                    gridColumn: "1 / -1",
                    padding: 14,
                    border: "none",
                    borderRadius: 10,
                    background:
                      selectedWallet.status === "Active"
                        ? "#444"
                        : "#2E7D32",
                    color: "#fff",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {selectedWallet.status === "Active"
                    ? "🔒 Lock Wallet"
                    : "🔓 Unlock Wallet"}
                </button>
              </div>
            </div>

            {/* Wallet Analytics */}
            <div
              style={{
                marginTop: 35,
              }}
            >
              <h3
                style={{
                  color: "#3B1A08",
                  marginBottom: 15,
                }}
              >
                📊 Wallet Analytics
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 15,
                }}
              >
                <div
                  style={{
                    background: "#FAF6F0",
                    padding: 18,
                    borderRadius: 12,
                    textAlign: "center",
                  }}
                >
                  <div style={{ color: "#777", fontSize: 13 }}>
                    Money Added
                  </div>

                  <h3
                    style={{
                      margin: "10px 0 0",
                      color: "#2E7D32",
                    }}
                  >
                    ₹{selectedWallet.moneyAdded.toLocaleString()}
                  </h3>
                </div>

                <div
                  style={{
                    background: "#FAF6F0",
                    padding: 18,
                    borderRadius: 12,
                    textAlign: "center",
                  }}
                >
                  <div style={{ color: "#777", fontSize: 13 }}>
                    Money Spent
                  </div>

                  <h3
                    style={{
                      margin: "10px 0 0",
                      color: "#C62828",
                    }}
                  >
                    ₹{selectedWallet.moneySpent.toLocaleString()}
                  </h3>
                </div>

                <div
                  style={{
                    background: "#FAF6F0",
                    padding: 18,
                    borderRadius: 12,
                    textAlign: "center",
                  }}
                >
                  <div style={{ color: "#777", fontSize: 13 }}>
                    Refunds
                  </div>

                  <h3
                    style={{
                      margin: "10px 0 0",
                      color: "#1976D2",
                    }}
                  >
                    ₹{selectedWallet.refunds.toLocaleString()}
                  </h3>
                </div>

                <div
                  style={{
                    background: "#FAF6F0",
                    padding: 18,
                    borderRadius: 12,
                    textAlign: "center",
                  }}
                >
                  <div style={{ color: "#777", fontSize: 13 }}>
                    Reward Balance
                  </div>

                  <h3
                    style={{
                      margin: "10px 0 0",
                      color: "#F5B942",
                    }}
                  >
                    ₹{selectedWallet.rewardBalance.toLocaleString()}
                  </h3>
                </div>
              </div>
            </div>

            {/* Transaction History */}
            <div style={{ marginTop: 30 }}>
              <h3 style={{ color: "#3B1A08" }}>
                📜 Complete Transaction History
              </h3>

              {/* Phase 5.2 Search & Filter Controls */}
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  margin: "20px 0",
                  flexWrap: "wrap",
                }}
              >
                <input
                  type="text"
                  placeholder="🔍 Search transactions..."
                  value={transactionSearch}
                  onChange={(e) => setTransactionSearch(e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: 220,
                    padding: 12,
                    borderRadius: 10,
                    border: "1px solid #ddd",
                  }}
                />

                <select
                  value={transactionFilter}
                  onChange={(e) => setTransactionFilter(e.target.value)}
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    border: "1px solid #ddd",
                  }}
                >
                  <option value="All">All</option>
                  <option value="credit">Credit</option>
                  <option value="debit">Debit</option>
                  <option value="reward">Reward</option>
                  <option value="refund">Refund</option>
                </select>
              </div>

              {loadingTransactions ? (
                <p>Loading...</p>
              ) : filteredTransactions.length === 0 ? (
                <p style={{ color: "#777" }}>
                  No matching transactions found.
                </p>
              ) : (
                <>
                  <div
                    style={{
                      marginBottom: 15,
                      color: "#777",
                      fontSize: 14,
                    }}
                  >
                    Showing {displayedTransactions.length} of {filteredTransactions.length} transactions
                  </div>

                  {displayedTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      onClick={() => setSelectedTransaction(transaction)}
                      style={{
                        cursor: "pointer",
                        padding: 15,
                        border: "1px solid #eee",
                        borderRadius: 10,
                        marginBottom: 12,
                        background: "#FAF6F0",
                        transition: ".2s",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <strong>{transaction.type.toUpperCase()}</strong>

                        <strong>₹{transaction.amount}</strong>
                      </div>

                      <div
                        style={{
                          marginTop: 6,
                          color: "#666",
                        }}
                      >
                        {transaction.reason || "No reason provided"}
                      </div>
                    </div>
                  ))}

                  {displayedTransactions.length < filteredTransactions.length && (
                    <button
                      onClick={() =>
                        setVisibleTransactions((prev) => prev + 20)
                      }
                      style={{
                        width: "100%",
                        padding: 12,
                        marginTop: 20,
                        borderRadius: 10,
                        border: "none",
                        background: "#3B1A08",
                        color: "#fff",
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      Load More Transactions
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.45)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 3000,
          }}
        >
          <div
            style={{
              width: "95%",
              maxWidth: 500,
              background: "#fff",
              borderRadius: 18,
              padding: 25,
            }}
          >
            <h2
              style={{
                marginTop: 0,
                color: "#3B1A08",
              }}
            >
              💳 Transaction Details
            </h2>

            <div style={{ lineHeight: 2 }}>
              <div>
                <strong>ID:</strong> {selectedTransaction.id}
              </div>

              <div>
                <strong>Customer:</strong> {selectedTransaction.customerName}
              </div>

              <div>
                <strong>Email:</strong> {selectedTransaction.customerEmail}
              </div>

              <div>
                <strong>Type:</strong> {selectedTransaction.type}
              </div>

              <div>
                <strong>Amount:</strong> ₹{selectedTransaction.amount}
              </div>

              <div>
                <strong>Reason:</strong>{" "}
                {selectedTransaction.reason || "No reason"}
              </div>

              <div>
                <strong>Admin Action:</strong>{" "}
                {selectedTransaction.adminAction ? "Yes" : "No"}
              </div>

              <div>
                <strong>Date:</strong>{" "}
                {selectedTransaction.createdAt?.toDate?.().toLocaleString() ||
                  "Unknown"}
              </div>
            </div>

            <button
              onClick={() => setSelectedTransaction(null)}
              style={{
                width: "100%",
                marginTop: 25,
                padding: 12,
                borderRadius: 10,
                border: "none",
                background: "#3B1A08",
                color: "#fff",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Wallet Action Modal */}
      {showActionModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.45)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 2000,
          }}
        >
          <div
            style={{
              width: 420,
              background: "#fff",
              borderRadius: 18,
              padding: 25,
            }}
          >
            <h2 style={{ marginTop: 0 }}>
              {actionType.toUpperCase()}
            </h2>

            <input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                marginBottom: 15,
                boxSizing: "border-box",
                borderRadius: 8,
                border: "1px solid #ccc",
              }}
            />

            <textarea
              placeholder="Reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{
                width: "100%",
                height: 100,
                padding: 12,
                marginBottom: 20,
                boxSizing: "border-box",
                borderRadius: 8,
                border: "1px solid #ccc",
                fontFamily: "sans-serif",
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <button
                onClick={() => {
                  setShowActionModal(false);
                  setAmount("");
                  setReason("");
                }}
                style={{
                  padding: "10px 18px",
                  borderRadius: 8,
                  border: "1px solid #ccc",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                onClick={handleWalletAction}
                style={{
                  padding: "10px 18px",
                  borderRadius: 8,
                  border: "none",
                  background: "#3B1A08",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
