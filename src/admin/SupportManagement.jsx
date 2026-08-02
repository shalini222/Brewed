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
    </div>
  );
}
