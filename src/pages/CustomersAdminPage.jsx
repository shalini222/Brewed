import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";

export default function CustomersAdminPage({ setPage }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Newest");

  async function loadCustomers() {
    try {
      const snapshot = await getDocs(collection(db, "users"));

      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setCustomers(list);
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  async function toggleAccount(customer) {
    try {
      await updateDoc(doc(db, "users", customer.id), {
        active: !(customer.active ?? true),
      });

      loadCustomers();
    } catch (err) {
      console.error(err);
    }
  }

  const filteredCustomers = customers
    .filter((customer) => {
      const matchesSearch =
        (customer.name || "")
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        (customer.email || "")
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesTier =
        tierFilter === "All" ||
        (customer.tier || "Bronze") === tierFilter;

      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Active"
          ? (customer.active ?? true)
          : !(customer.active ?? true));

      return matchesSearch && matchesTier && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "Orders":
          return (b.totalOrders || 0) - (a.totalOrders || 0);

        case "Spent":
          return (b.totalSpent || 0) - (a.totalSpent || 0);

        case "Points":
          return (b.rewardPoints || 0) - (a.rewardPoints || 0);

        default:
          return (
            (b.createdAt?.seconds || 0) -
            (a.createdAt?.seconds || 0)
          );
      }
    });

  const totalCustomers = customers.length;

  const bronze = customers.filter(
    (c) => (c.tier || "Bronze") === "Bronze"
  ).length;

  const silver = customers.filter(
    (c) => c.tier === "Silver"
  ).length;

  const gold = customers.filter(
    (c) => c.tier === "Gold"
  ).length;

  const disabled = customers.filter(
    (c) => !(c.active ?? true)
  ).length;

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

  return (
    <div
      style={{
        background: "#FAF6F0",
        minHeight: "100vh",
        padding: 40,
      }}
    >
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

      <h1
        style={{
          fontFamily: "Playfair Display",
          color: "#3B1A08",
          marginBottom: 30,
        }}
      >
        👥 Customer Management
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(220px,1fr))",
          gap: 20,
          marginBottom: 35,
        }}
      >
        <StatCard
          title="Total Customers"
          value={totalCustomers}
        />

        <StatCard
          title="Bronze Members"
          value={bronze}
        />

        <StatCard
          title="Silver Members"
          value={silver}
        />

        <StatCard
          title="Gold Members"
          value={gold}
        />

        <StatCard
          title="Disabled Accounts"
          value={disabled}
        />
      </div>

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
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            style={{
              padding: 12,
              borderRadius: 10,
              border: "1px solid #ddd",
            }}
          >
            <option value="All">All Tiers</option>
            <option value="Bronze">Bronze</option>
            <option value="Silver">Silver</option>
            <option value="Gold">Gold</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: 12,
              borderRadius: 10,
              border: "1px solid #ddd",
            }}
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Disabled">Disabled</option>
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
            <option value="Newest">Newest</option>
            <option value="Orders">Most Orders</option>
            <option value="Spent">Highest Spending</option>
            <option value="Points">Reward Points</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p style={{ textAlign: "center" }}>Loading customers...</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(330px,1fr))",
            gap: 20,
          }}
        >
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              style={{
                background: "#fff",
                borderRadius: 16,
                padding: 24,
                border: "1px solid #eee",
                boxShadow: "0 8px 20px rgba(0,0,0,.05)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 15,
                  marginBottom: 20,
                }}
              >
                <img
                  src={
                    customer.photoURL ||
                    "https://ui-avatars.com/api/?background=C4956A&color=fff&name=" +
                      encodeURIComponent(customer.name || "User")
                  }
                  alt=""
                  style={{
                    width: 65,
                    height: 65,
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />

                <div>
                  <h3
                    style={{
                      margin: 0,
                      color: "#3B1A08",
                    }}
                  >
                    {customer.name || "Unknown User"}
                  </h3>

                  <p
                    style={{
                      marginTop: 5,
                      color: "#777",
                      fontSize: 14,
                    }}
                  >
                    {customer.email}
                  </p>
                </div>
              </div>

                            <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginBottom: 18,
                }}
              >
                <span
                  style={{
                    background:
                      customer.tier === "Gold"
                        ? "#FFD700"
                        : customer.tier === "Silver"
                        ? "#E0E0E0"
                        : "#D6A46A",
                    color: "#3B1A08",
                    padding: "5px 12px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {customer.tier || "Bronze"}
                </span>

                <span
                  style={{
                    background:
                      (customer.active ?? true)
                        ? "#E8F5E9"
                        : "#FFEBEE",
                    color:
                      (customer.active ?? true)
                        ? "#2E7D32"
                        : "#C62828",
                    padding: "5px 12px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {(customer.active ?? true)
                    ? "Active"
                    : "Disabled"}
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <div>
                  <strong>Orders</strong>
                  <br />
                  {customer.totalOrders || 0}
                </div>

                <div>
                  <strong>Total Spent</strong>
                  <br />
                  ₹{customer.totalSpent || 0}
                </div>

                <div>
                  <strong>Reward Points</strong>
                  <br />
                  {customer.rewardPoints || 0}
                </div>

                <div>
                  <strong>Birthday</strong>
                  <br />
                  {customer.birthday || "-"}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                }}
              >
                <button
                  onClick={() => toggleAccount(customer)}
                  style={{
                    flex: 1,
                    padding: 12,
                    border: "none",
                    borderRadius: 10,
                    cursor: "pointer",
                    background:
                      (customer.active ?? true)
                        ? "#F5B942"
                        : "#2E7D32",
                    color: "#fff",
                    fontWeight: 600,
                  }}
                >
                  {(customer.active ?? true)
                    ? "Disable"
                    : "Enable"}
                </button>

                <button
                  style={{
                    flex: 1,
                    padding: 12,
                    border: "none",
                    borderRadius: 10,
                    background: "#3B1A08",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  View Profile
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

