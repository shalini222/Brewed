import { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot
} from "firebase/firestore";

export default function SupportAdminPage({ setPage, setActivePage }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "supportTickets"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setTickets(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
          }))
        );

        setLoading(false);
      },
      (err) => {
        console.log("Error loading support tickets:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const totalTickets = tickets.length;

  const openTickets = tickets.filter(
    (ticket) => ticket.status === "Open"
  ).length;

  const inProgressTickets = tickets.filter(
    (ticket) => ticket.status === "In Progress"
  ).length;

  const waitingTickets = tickets.filter(
    (ticket) => ticket.status === "Waiting for Customer"
  ).length;

  const resolvedTickets = tickets.filter(
    (ticket) => ticket.status === "Resolved"
  ).length;

  const closedTickets = tickets.filter(
    (ticket) => ticket.status === "Closed"
  ).length;

  const highPriorityTickets = tickets.filter(
    (ticket) => ticket.priority === "High"
  ).length;

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#FDFAF5",
          color: "#6B5E55",
          fontWeight: 600
        }}
      >
        Loading support tickets...
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#FDFAF5",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "24px"
        }}
      >
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E8DED2",
            borderRadius: "20px",
            padding: "40px",
            textAlign: "center",
            maxWidth: "420px",
            width: "100%"
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>
            🎫
          </div>

          <h2
            style={{
              color: "#2C221E",
              marginBottom: "10px"
            }}
          >
            No Support Tickets
          </h2>

          <p
            style={{
              color: "#6B5E55",
              fontSize: "14px",
              lineHeight: "1.6"
            }}
          >
            Customer support tickets will appear here once they are created.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FDFAF5",
        padding: "24px"
      }}
    >
      <h1
        style={{
          color: "#2C221E",
          fontFamily: "Playfair Display, serif",
          marginBottom: "8px"
        }}
      >
        Support Dashboard
      </h1>

      <p
        style={{
          color: "#6B5E55",
          marginBottom: "24px"
        }}
      >
        Manage customer support tickets.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "16px",
          marginBottom: "24px"
        }}
      >
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E8DED2",
            borderRadius: "18px",
            padding: "20px",
            boxShadow: "0 2px 10px rgba(44,34,30,0.03)"
          }}
        >
          <div
            style={{
              fontSize: "13px",
              color: "#9A8C82",
              marginBottom: "8px",
              fontWeight: 600
            }}
          >
            Total Tickets
          </div>

          <div
            style={{
              fontSize: "32px",
              fontWeight: 700,
              color: "#2C221E"
            }}
          >
            {totalTickets}
          </div>
        </div>

        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E8DED2",
            borderRadius: "18px",
            padding: "20px",
            boxShadow: "0 2px 10px rgba(44,34,30,0.03)"
          }}
        >
          <div
            style={{
              fontSize: "13px",
              color: "#9A8C82",
              marginBottom: "8px",
              fontWeight: 600
            }}
          >
            Open Tickets
          </div>

          <div
            style={{
              fontSize: "32px",
              fontWeight: 700,
              color: "#2E7D32"
            }}
          >
            {openTickets}
          </div>
        </div>

        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E8DED2",
            borderRadius: "18px",
            padding: "20px",
            boxShadow: "0 2px 10px rgba(44,34,30,0.03)"
          }}
        >
          <div
            style={{
              fontSize: "13px",
              color: "#9A8C82",
              marginBottom: "8px",
              fontWeight: 600
            }}
          >
            In Progress
          </div>

          <div
            style={{
              fontSize: "32px",
              fontWeight: 700,
              color: "#F57F17"
            }}
          >
            {inProgressTickets}
          </div>
        </div>

        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E8DED2",
            borderRadius: "18px",
            padding: "20px",
            boxShadow: "0 2px 10px rgba(44,34,30,0.03)"
          }}
        >
          <div
            style={{
              fontSize: "13px",
              color: "#9A8C82",
              marginBottom: "8px",
              fontWeight: 600
            }}
          >
            Waiting for Customer
          </div>

          <div
            style={{
              fontSize: "32px",
              fontWeight: 700,
              color: "#1565C0"
            }}
          >
            {waitingTickets}
          </div>
        </div>

        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E8DED2",
            borderRadius: "18px",
            padding: "20px",
            boxShadow: "0 2px 10px rgba(44,34,30,0.03)"
          }}
        >
          <div
            style={{
              fontSize: "13px",
              color: "#9A8C82",
              marginBottom: "8px",
              fontWeight: 600
            }}
          >
            Resolved
          </div>

          <div
            style={{
              fontSize: "32px",
              fontWeight: 700,
              color: "#00695C"
            }}
          >
            {resolvedTickets}
          </div>
        </div>

        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E8DED2",
            borderRadius: "18px",
            padding: "20px",
            boxShadow: "0 2px 10px rgba(44,34,30,0.03)"
          }}
        >
          <div
            style={{
              fontSize: "13px",
              color: "#9A8C82",
              marginBottom: "8px",
              fontWeight: 600
            }}
          >
            Closed
          </div>

          <div
            style={{
              fontSize: "32px",
              fontWeight: 700,
              color: "#37474F"
            }}
          >
            {closedTickets}
          </div>
        </div>

        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E8DED2",
            borderRadius: "18px",
            padding: "20px",
            boxShadow: "0 2px 10px rgba(44,34,30,0.03)"
          }}
        >
          <div
            style={{
              fontSize: "13px",
              color: "#9A8C82",
              marginBottom: "8px",
              fontWeight: 600
            }}
          >
            High Priority
          </div>

          <div
            style={{
              fontSize: "32px",
              fontWeight: 700,
              color: "#C62828"
            }}
          >
            {highPriorityTickets}
          </div>
        </div>
      </div>

      <div style={{ marginTop: "32px" }}>
        <h2
          style={{
            fontSize: "24px",
            fontWeight: 700,
            color: "#2C221E",
            marginBottom: "8px",
            fontFamily: "Playfair Display, serif"
          }}
        >
          Support Tickets
        </h2>

        <p
          style={{
            color: "#6B5E55",
            fontSize: "14px",
            marginBottom: "20px"
          }}
        >
          {tickets.length} ticket{tickets.length !== 1 ? "s" : ""} found
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {tickets.map((ticket) => (
          <div
            key={ticket.id}
            style={{
              background: "#FFFFFF",
              border: "1px solid #E8DED2",
              borderRadius: "18px",
              padding: "20px",
              boxShadow: "0 2px 10px rgba(44,34,30,0.03)",
              cursor: "pointer",
              transition: "all .2s ease"
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#9A8C82",
                    fontWeight: 600
                  }}
                >
                  Ticket #{ticket.ticketNumber || ticket.id.slice(0, 8)}
                </div>

                <h3
                  style={{
                    margin: "6px 0 0",
                    color: "#2C221E",
                    fontSize: "18px",
                    fontWeight: 700
                  }}
                >
                  {ticket.subject}
                </h3>

                <div
                  style={{
                    marginTop: "10px",
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "4px 10px",
                    borderRadius: "999px",
                    fontSize: "12px",
                    fontWeight: 600,
                    background:
                      ticket.priority === "High"
                        ? "#FDECEC"
                        : ticket.priority === "Medium"
                        ? "#FFF8E1"
                        : "#F5F5F5",
                    color:
                      ticket.priority === "High"
                        ? "#C62828"
                        : ticket.priority === "Medium"
                        ? "#F57F17"
                        : "#616161"
                  }}
                >
                  {ticket.priority || "Normal"} Priority
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px"
                }}
              >
                <span
                  style={{
                    padding: "6px 12px",
                    borderRadius: "999px",
                    fontSize: "12px",
                    fontWeight: 600,
                    background:
                      ticket.status === "Open"
                        ? "#E8F5E9"
                        : ticket.status === "In Progress"
                        ? "#FFF8E1"
                        : ticket.status === "Waiting for Customer"
                        ? "#E3F2FD"
                        : ticket.status === "Resolved"
                        ? "#E0F2F1"
                        : "#ECEFF1",
                    color:
                      ticket.status === "Open"
                        ? "#2E7D32"
                        : ticket.status === "In Progress"
                        ? "#F57F17"
                        : ticket.status === "Waiting for Customer"
                        ? "#1565C0"
                        : ticket.status === "Resolved"
                        ? "#00695C"
                        : "#37474F"
                  }}
                >
                  {ticket.status}
                </span>

                <div
                  style={{
                    fontSize: "13px",
                    color: "#9A8C82"
                  }}
                >
                  {ticket.createdAt?.toDate?.().toLocaleDateString() || "N/A"}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "4px"
              }}
            >
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#2C221E"
                }}
              >
                👤 {ticket.customerName || "Unknown Customer"}
              </span>

              <span
                style={{
                  fontSize: "13px",
                  color: "#6B5E55"
                }}
              >
                {ticket.customerEmail || "No email"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
