import { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
  increment
} from "firebase/firestore";

import SupportFAQManagement from "./SupportFAQManagement";
import SupportPolicyManagement from "./SupportPolicyManagement";
import SupportSettingsManagement from "./SupportSettingsManagement";

const supportStaff = [
  "Unassigned",
  "Olivia",
  "Support Team",
  "Manager",
  "Senior Support"
];

export default function SupportManagement({ setPage, setActivePage }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Newest");

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState("tickets");

  const [internalNotes, setInternalNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const messagesEndRef = useRef(null);

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

  useEffect(() => {
    if (!selectedTicket) return;

    const updated = tickets.find(
      (t) => t.id === selectedTicket.id
    );

    if (updated) {
      setSelectedTicket(updated);
    }
  }, [tickets]);

  useEffect(() => {
    if (!selectedTicket) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, "supportTickets", selectedTicket.id, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setMessages(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
          }))
        );
      },
      (err) => {
        console.log("Error loading conversation:", err);
      }
    );

    return () => unsubscribe();
  }, [selectedTicket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!selectedTicket) {
      setInternalNotes("");
      return;
    }

    setInternalNotes(selectedTicket.internalNotes || "");
  }, [selectedTicket]);

  const updatePriority = async (newPriority) => {
    if (!selectedTicket) return;

    try {
      await updateDoc(doc(db, "supportTickets", selectedTicket.id), {
        priority: newPriority,
        updatedAt: serverTimestamp()
      });

      setSelectedTicket((prev) => ({
        ...prev,
        priority: newPriority
      }));
    } catch (err) {
      console.log("Error updating priority:", err);
    }
  };

  const assignStaff = async (staff) => {
    if (!selectedTicket) return;

    try {
      await updateDoc(
        doc(db, "supportTickets", selectedTicket.id),
        {
          assignedTo: staff,
          updatedAt: serverTimestamp()
        }
      );

      setSelectedTicket((prev) => ({
        ...prev,
        assignedTo: staff
      }));
    } catch (err) {
      console.log("Error assigning staff:", err);
    }
  };

  const sendReply = async () => {
    if (!reply.trim() || !selectedTicket || sending) return;

    try {
      setSending(true);

      // Add message to conversation
      await addDoc(
        collection(db, "supportTickets", selectedTicket.id, "messages"),
        {
          sender: "support",
          senderName: "Support Team",
          message: reply.trim(),
          createdAt: serverTimestamp()
        }
      );

      // Update parent ticket
      await updateDoc(doc(db, "supportTickets", selectedTicket.id), {
        updatedAt: serverTimestamp(),
        customerUnread: increment(1),
        lastReplyBy: "support",
        lastMessage: reply.trim(),
        lastMessageAt: serverTimestamp()
      });

      setReply("");
    } catch (err) {
      console.log("Error sending reply:", err);
    } finally {
      setSending(false);
    }
  };

  const updateTicketStatus = async (newStatus) => {
    if (!selectedTicket) return;

    try {
      await updateDoc(
        doc(db, "supportTickets", selectedTicket.id),
        {
          status: newStatus,
          updatedAt: serverTimestamp()
        }
      );

      setSelectedTicket((prev) => ({
        ...prev,
        status: newStatus
      }));
    } catch (err) {
      console.log("Error updating status:", err);
    }
  };

  const saveInternalNotes = async () => {
    if (!selectedTicket) return;

    try {
      setSavingNotes(true);

      await updateDoc(
        doc(db, "supportTickets", selectedTicket.id),
        {
          internalNotes,
          updatedAt: serverTimestamp()
        }
      );

      setSelectedTicket((prev) => ({
        ...prev,
        internalNotes
      }));
    } catch (err) {
      console.log("Error saving notes:", err);
    } finally {
      setSavingNotes(false);
    }
  };

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

  const filteredTickets = tickets.filter((ticket) => {
    const search = searchTerm.toLowerCase().trim();

    const matchesSearch =
      (ticket.ticketNumber || "").toLowerCase().includes(search) ||
      (ticket.subject || "").toLowerCase().includes(search) ||
      (ticket.customerName || "").toLowerCase().includes(search) ||
      (ticket.customerEmail || "").toLowerCase().includes(search);

    const matchesStatus =
      statusFilter === "All" || ticket.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const sortedTickets = [...filteredTickets].sort((a, b) => {
    switch (sortBy) {
      case "Oldest":
        return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);

      case "Priority": {
        const priorityOrder = {
          High: 3,
          Medium: 2,
          Low: 1
        };

        return (
          (priorityOrder[b.priority] || 0) -
          (priorityOrder[a.priority] || 0)
        );
      }

      case "Recently Updated":
        return (
          (b.updatedAt?.seconds || 0) -
          (a.updatedAt?.seconds || 0)
        );

      case "Newest":
      default:
        return (
          (b.createdAt?.seconds || 0) -
          (a.createdAt?.seconds || 0)
        );
    }
  });

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
        Support Management 
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
          display: "flex",
          gap: "12px",
          marginBottom: "24px"
        }}
      >
        <button
          onClick={() => setActiveTab("tickets")}
          style={{
            padding: "10px 18px",
            borderRadius: "12px",
            border: "none",
            cursor: "pointer",
            background: activeTab === "tickets" ? "#C4956A" : "#fff",
            color: activeTab === "tickets" ? "#fff" : "#2C221E"
          }}
        >
          🎫 Tickets
        </button>

        <button
          onClick={() => setActiveTab("supportfaq")}
          style={{
            padding: "10px 18px",
            borderRadius: "12px",
            border: "none",
            cursor: "pointer",
            background: activeTab === "supportfaq" ? "#C4956A" : "#fff",
            color: activeTab === "supportfaq" ? "#fff" : "#2C221E"
          }}
        >
          ❓ FAQs
        </button>

        <button
          onClick={() => setActiveTab("supportpolicies")}
          style={{
            padding: "10px 18px",
            borderRadius: "12px",
            border: "none",
            cursor: "pointer",
            background: activeTab === "supportpolicies" ? "#C4956A" : "#fff",
            color: activeTab === "supportpolicies" ? "#fff" : "#2C221E"
          }}
        >
          📜 Policies
        </button>
         <button
          onClick={() => setActiveTab("supportsettings")}
          style={{
            padding: "10px 18px",
            borderRadius: "12px",
            border: "none",
            cursor: "pointer",
            background: activeTab === "supportsettings" ? "#C4956A" : "#fff",
            color: activeTab === "supportsettings" ? "#fff" : "#2C221E"
          }}
        >
          ⚙️Settings
        </button>
      </div>

      {activeTab === "tickets" && (
        <>
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
              {filteredTickets.length} ticket{filteredTickets.length !== 1 ? "s" : ""} found
            </p>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "12px 14px",
              border: "1px solid #E8DED2",
              borderRadius: "12px",
              background: "#FFFFFF",
              color: "#2C221E",
              fontSize: "14px",
              outline: "none",
              marginBottom: "16px"
            }}
          >
            <option value="All">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Waiting for Customer">Waiting for Customer</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: "12px 14px",
              border: "1px solid #E8DED2",
              borderRadius: "12px",
              background: "#FFFFFF",
              color: "#2C221E",
              fontSize: "14px",
              outline: "none",
              marginBottom: "16px",
              marginLeft: "12px"
            }}
          >
            <option value="Newest">Newest</option>
            <option value="Oldest">Oldest</option>
            <option value="Priority">Priority</option>
            <option value="Recently Updated">Recently Updated</option>
          </select>

          <div
            style={{
              marginBottom: "20px"
            }}
          >
            <input
              type="text"
              placeholder="Search by ticket number, customer, email or subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "14px 16px",
                border: "1px solid #E8DED2",
                borderRadius: "14px",
                background: "#FFFFFF",
                color: "#2C221E",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box"
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {sortedTickets.length === 0 ? (
              <div
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E8DED2",
                  borderRadius: "18px",
                  padding: "40px",
                  textAlign: "center",
                  color: "#6B5E55"
                }}
              >
                <div style={{ fontSize: "36px", marginBottom: "12px" }}>🎫</div>
                <h3 style={{ margin: "0 0 8px", color: "#2C221E" }}>No Support Tickets Found</h3>
                <p style={{ margin: 0, fontSize: "14px" }}>Customer support tickets will appear here once they are created.</p>
              </div>
            ) : (
              sortedTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  style={{
                    background: "#FFFFFF",
                    border:
                      selectedTicket?.id === ticket.id
                        ? "2px solid #C4956A"
                        : "1px solid #E8DED2",
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

                    <span
                      style={{
                        fontSize: "12px",
                        color: "#C4956A",
                        fontWeight: 600,
                        marginTop: "2px"
                      }}
                    >
                      Assigned: {ticket.assignedTo || "Unassigned"}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "16px",
                      paddingTop: "16px",
                      borderTop: "1px solid #F4EFE6"
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#9A8C82",
                          textTransform: "uppercase",
                          fontWeight: 600
                        }}
                      >
                        Category
                      </div>

                      <div
                        style={{
                          fontSize: "14px",
                          color: "#2C221E",
                          fontWeight: 600,
                          marginTop: "2px"
                        }}
                      >
                        {ticket.category || "General"}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#9A8C82",
                          textTransform: "uppercase",
                          fontWeight: 600
                        }}
                      >
                        Order
                      </div>

                      <div
                        style={{
                          fontSize: "14px",
                          color: "#2C221E",
                          fontWeight: 600,
                          marginTop: "2px"
                        }}
                      >
                        {ticket.orderId || "Not Linked"}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "16px",
                      paddingTop: "16px",
                      borderTop: "1px solid #F4EFE6"
                    }}
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#9A8C82"
                      }}
                    >
                      Last updated:{" "}
                      {ticket.updatedAt?.toDate?.().toLocaleString() || "N/A"}
                    </div>

                    {ticket.supportUnread > 0 && (
                      <div
                        style={{
                          background: "#D32F2F",
                          color: "white",
                          padding: "4px 10px",
                          borderRadius: "999px",
                          fontSize: "12px",
                          fontWeight: 600
                        }}
                      >
                        {ticket.supportUnread} New
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {selectedTicket && (
            <div
              style={{
                marginTop: "24px",
                background: "#FFFFFF",
                border: "1px solid #E8DED2",
                borderRadius: "18px",
                padding: "24px",
                boxShadow: "0 2px 10px rgba(44,34,30,0.03)"
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px"
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    color: "#2C221E",
                    fontFamily: "Playfair Display, serif"
                  }}
                >
                  Ticket Details
                </h2>

                <button
                  onClick={() => setSelectedTicket(null)}
                  style={{
                    background: "#FAF6F0",
                    border: "1px solid #E8DED2",
                    borderRadius: "10px",
                    padding: "8px 14px",
                    cursor: "pointer",
                    fontWeight: 600,
                    color: "#6B5E55",
                    fontSize: "14px"
                  }}
                >
                  ✕ Close
                </button>
              </div>

              <p><strong>Ticket:</strong> {selectedTicket.ticketNumber}</p>
              <p><strong>Subject:</strong> {selectedTicket.subject}</p>
              <p><strong>Customer:</strong> {selectedTicket.customerName}</p>
              <p><strong>Email:</strong> {selectedTicket.customerEmail}</p>
              
              <div style={{ marginBottom: "16px" }}>
                <strong>Status</strong>

                <select
                  value={selectedTicket.status}
                  onChange={(e) => updateTicketStatus(e.target.value)}
                  style={{
                    display: "block",
                    marginTop: "8px",
                    padding: "10px 12px",
                    border: "1px solid #E8DED2",
                    borderRadius: "10px",
                    background: "#FFFFFF",
                    fontSize: "14px"
                  }}
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Waiting for Customer">Waiting for Customer</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <strong>Priority:</strong>

                <select
                  value={selectedTicket.priority || "Low"}
                  onChange={(e) => updatePriority(e.target.value)}
                  style={{
                    marginLeft: "10px",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    border: "1px solid #E8DED2",
                    background: "#FFFFFF"
                  }}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div style={{ marginTop: "18px" }}>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#9A8C82",
                    marginBottom: "8px",
                    fontWeight: 600
                  }}
                >
                  Assigned Staff
                </div>

                <select
                  value={selectedTicket.assignedTo || "Unassigned"}
                  onChange={(e) => assignStaff(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #E8DED2",
                    borderRadius: "12px",
                    background: "#FFFFFF",
                    fontSize: "14px"
                  }}
                >
                  {supportStaff.map((staff) => (
                    <option key={staff} value={staff}>
                      {staff}
                    </option>
                  ))}
                </select>
              </div>

              <p style={{ marginTop: "16px" }}><strong>Category:</strong> {selectedTicket.category}</p>
              <p><strong>Order:</strong> {selectedTicket.orderId || "Not Linked"}</p>
              <p><strong>Description:</strong></p>

              <div
                style={{
                  background: "#FAF6F0",
                  padding: "16px",
                  borderRadius: "12px",
                  marginTop: "8px"
                }}
              >
                {selectedTicket.description}
              </div>

              {/* Conversation */}
              <div
                style={{
                  marginTop: "24px",
                  borderTop: "1px solid #E8DED2",
                  paddingTop: "24px"
                }}
              >
                <h3
                  style={{
                    marginBottom: "18px",
                    color: "#2C221E",
                    fontFamily: "Playfair Display, serif"
                  }}
                >
                  Conversation
                </h3>

                {messages.length === 0 ? (
                  <div
                    style={{
                      background: "#FAF6F0",
                      border: "1px dashed #E8DED2",
                      borderRadius: "14px",
                      padding: "20px",
                      textAlign: "center",
                      color: "#9A8C82"
                    }}
                  >
                    No conversation yet.
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "16px",
                      maxHeight: "500px",
                      overflowY: "auto"
                    }}
                  >
                    {messages.map((msg) => {
                      const isCustomer = msg.sender === "customer";

                      return (
                        <div
                          key={msg.id}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: isCustomer ? "flex-start" : "flex-end"
                          }}
                        >
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#9A8C82",
                              marginBottom: "6px",
                              fontWeight: 600
                            }}
                          >
                            {isCustomer
                              ? msg.senderName || "Customer"
                              : "☕ Support Team"}
                          </div>

                          <div
                            style={{
                              maxWidth: "75%",
                              background: isCustomer ? "#FFFFFF" : "#C4956A",
                              color: isCustomer ? "#2C221E" : "#FFFFFF",
                              border: isCustomer
                                ? "1px solid #E8DED2"
                                : "none",
                              borderRadius: isCustomer
                                ? "18px 18px 18px 4px"
                                : "18px 18px 4px 18px",
                              padding: "14px 18px",
                              lineHeight: 1.5
                            }}
                          >
                            <div>{msg.message}</div>

                            <div
                              style={{
                                marginTop: "8px",
                                fontSize: "11px",
                                opacity: 0.75
                              }}
                            >
                              {msg.createdAt?.toDate?.().toLocaleString() ||
                                "Sending..."}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Reply Box */}
              <div
                style={{
                  marginTop: "24px",
                  borderTop: "1px solid #E8DED2",
                  paddingTop: "24px"
                }}
              >
                <h3
                  style={{
                    marginBottom: "16px",
                    color: "#2C221E",
                    fontFamily: "Playfair Display, serif"
                  }}
                >
                  Reply to Customer
                </h3>

                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                      e.preventDefault();
                      sendReply();
                    }
                  }}
                  placeholder="Type your reply... (Ctrl + Enter to send)"
                  rows={5}
                  style={{
                    width: "100%",
                    padding: "14px",
                    border: "1px solid #E8DED2",
                    borderRadius: "14px",
                    background: "#FFFFFF",
                    fontSize: "14px",
                    outline: "none",
                    resize: "vertical",
                    boxSizing: "border-box"
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: "16px"
                  }}
                >
                  <button
                    onClick={sendReply}
                    disabled={sending || !reply.trim()}
                    style={{
                      background: "#C4956A",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: "12px",
                      padding: "12px 22px",
                      fontWeight: 600,
                      cursor: sending ? "not-allowed" : "pointer",
                      opacity: sending ? 0.7 : 1
                    }}
                  >
                    {sending ? "Sending..." : "Send Reply"}
                  </button>
                </div>
              </div>

              {/* Internal Notes */}
              <div
                style={{
                  marginTop: "24px",
                  background: "#FFFFFF",
                  border: "1px solid #E8DED2",
                  borderRadius: "16px",
                  padding: "20px"
                }}
              >
                <h3
                  style={{
                    margin: "0 0 16px",
                    color: "#2C221E",
                    fontFamily: "Playfair Display, serif"
                  }}
                >
                  Internal Notes
                </h3>

                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Only admins can see these notes..."
                  rows={5}
                  style={{
                    width: "100%",
                    padding: "14px",
                    border: "1px solid #E8DED2",
                    borderRadius: "12px",
                    resize: "vertical",
                    boxSizing: "border-box",
                    outline: "none"
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: "16px"
                  }}
                >
                  <button
                    onClick={saveInternalNotes}
                    disabled={savingNotes}
                    style={{
                      background: "#C4956A",
                      color: "#fff",
                      border: "none",
                      borderRadius: "12px",
                      padding: "10px 20px",
                      cursor: "pointer"
                    }}
                  >
                    {savingNotes ? "Saving..." : "Save Notes"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === "supportfaq" && <SupportFAQManagement />}
    {activeTab === "supportsettings" && <SupportSettingsManagement />}
      {activeTab === "supportpolicies" && <SupportPolicyManagement />}
    </div>
  );
}
