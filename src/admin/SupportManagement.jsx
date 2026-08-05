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
import SupportHelpCategoryManagement from "./SupportHelpCategoryManagement";
import SupportAnalyticsManagement from "./SupportAnalyticsManagement";

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
  const [priorityFilter, setPriorityFilter] = useState("All");
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
    const updated = tickets.find((t) => t.id === selectedTicket.id);
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
      setSelectedTicket((prev) => ({ ...prev, priority: newPriority }));
    } catch (err) {
      console.log("Error updating priority:", err);
    }
  };

  const assignStaff = async (staff) => {
    if (!selectedTicket) return;
    try {
      await updateDoc(doc(db, "supportTickets", selectedTicket.id), {
        assignedTo: staff,
        updatedAt: serverTimestamp()
      });
      setSelectedTicket((prev) => ({ ...prev, assignedTo: staff }));
    } catch (err) {
      console.log("Error assigning staff:", err);
    }
  };

  const sendReply = async () => {
    if (!reply.trim() || !selectedTicket || sending) return;
    try {
      setSending(true);
      await addDoc(
        collection(db, "supportTickets", selectedTicket.id, "messages"),
        {
          sender: "support",
          senderName: "Support Team",
          message: reply.trim(),
          createdAt: serverTimestamp()
        }
      );

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
      await updateDoc(doc(db, "supportTickets", selectedTicket.id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      setSelectedTicket((prev) => ({ ...prev, status: newStatus }));
    } catch (err) {
      console.log("Error updating status:", err);
    }
  };

  const saveInternalNotes = async () => {
    if (!selectedTicket) return;
    try {
      setSavingNotes(true);
      await updateDoc(doc(db, "supportTickets", selectedTicket.id), {
        internalNotes,
        updatedAt: serverTimestamp()
      });
      setSelectedTicket((prev) => ({ ...prev, internalNotes }));
    } catch (err) {
      console.log("Error saving notes:", err);
    } finally {
      setSavingNotes(false);
    }
  };

  const totalTickets = tickets.length;
  const openTickets = tickets.filter((t) => t.status === "Open").length;
  const inProgressTickets = tickets.filter((t) => t.status === "In Progress").length;
  const waitingTickets = tickets.filter((t) => t.status === "Waiting for Customer").length;
  const resolvedTickets = tickets.filter((t) => t.status === "Resolved").length;
  const closedTickets = tickets.filter((t) => t.status === "Closed").length;
  const highPriorityTickets = tickets.filter((t) => t.priority === "High").length;

  const filteredTickets = tickets.filter((ticket) => {
    const search = searchTerm.toLowerCase().trim();
    const matchesSearch =
      (ticket.ticketNumber || "").toLowerCase().includes(search) ||
      (ticket.subject || "").toLowerCase().includes(search) ||
      (ticket.customerName || "").toLowerCase().includes(search) ||
      (ticket.customerEmail || "").toLowerCase().includes(search);

    const matchesStatus = statusFilter === "All" || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === "All" || ticket.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const sortedTickets = [...filteredTickets].sort((a, b) => {
    switch (sortBy) {
      case "Oldest":
        return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
      case "Priority": {
        const priorityOrder = { High: 3, Medium: 2, Low: 1 };
        return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      }
      case "Recently Updated":
        return (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0);
      case "Newest":
      default:
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
    }
  });

  const getStatusBadge = (status) => {
    let bg = "#F3F4F6";
    let color = "#5E6572";
    if (status === "Open") {
      bg = "#ECF8F1";
      color = "#177245";
    } else if (status === "In Progress") {
      bg = "#FFF8EA";
      color = "#B67A00";
    } else if (status === "Waiting for Customer") {
      bg = "#EEF5FF";
      color = "#2F6ACD";
    } else if (status === "Resolved") {
      bg = "#E9F9F4";
      color = "#007C63";
    } else if (status === "Closed") {
      bg = "#F3F4F6";
      color = "#5E6572";
    }
    return (
      <span
        style={{
          fontSize: "12px",
          padding: "6px 12px",
          borderRadius: "999px",
          background: bg,
          color: color,
          fontWeight: 600,
          display: "inline-flex",
          alignItems: "center",
          gap: "6px"
        }}
      >
        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: color }}></span>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#F8F6F2",
          color: "#6B5E55",
          fontFamily: "Inter, sans-serif",
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
        background: "#F8F6F2",
        padding: "32px",
        fontFamily: "Inter, sans-serif",
        color: "#2C221E"
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "28px"
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "Playfair Display, serif",
              fontSize: "32px",
              fontWeight: 700,
              color: "#2C221E",
              margin: "0 0 6px 0"
            }}
          >
            Support Operations
          </h1>
          <p
            style={{
              color: "#6B5E55",
              fontSize: "15px",
              margin: 0
            }}
          >
            Customer Support Center — Manage tickets, conversations, help articles and support performance.
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={() => setActiveTab("supportfaq")}
            style={{
              background: "#FFFFFF",
              border: "1px solid #EFE8DF",
              padding: "10px 18px",
              borderRadius: "14px",
              fontSize: "14px",
              fontWeight: 600,
              color: "#2C221E",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(28,25,23,0.02)"
            }}
          >
            + New FAQ
          </button>
          <button
            onClick={() => setActiveTab("supportanalytics")}
            style={{
              background: "linear-gradient(135deg, #C89B6D, #B68658)",
              border: "none",
              padding: "10px 18px",
              borderRadius: "14px",
              fontSize: "14px",
              fontWeight: 600,
              color: "#FFFFFF",
              cursor: "pointer",
              boxShadow: "0 10px 24px rgba(196,149,106,.28)"
            }}
          >
            Support Analytics
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "28px",
          borderBottom: "1px solid #EFE8DF",
          paddingBottom: "12px"
        }}
      >
        {[
          { id: "tickets", label: "Tickets" },
          { id: "supportfaq", label: "FAQs" },
          { id: "supportpolicies", label: "Policies" },
          { id: "supportsettings", label: "Contact Settings" },
          { id: "supporthelpdesk", label: "Help Desk" },
          { id: "supportanalytics", label: "Analytics" }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "10px 20px",
                borderRadius: "12px",
                border: "none",
                cursor: "pointer",
                background: isActive ? "#F5EFE7" : "transparent",
                color: "#2C221E",
                fontWeight: isActive ? 700 : 500,
                fontSize: "14px",
                transition: "all 0.2s ease"
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "tickets" && (
        <>
          {/* KPI Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "16px",
              marginBottom: "28px"
            }}
          >
            {[
              { label: "Total Tickets", count: totalTickets, color: "#2C221E" },
              { label: "Open Tickets", count: openTickets, color: "#177245", dot: "#177245" },
              { label: "In Progress", count: inProgressTickets, color: "#B67A00", dot: "#B67A00" },
              { label: "Waiting", count: waitingTickets, color: "#2F6ACD", dot: "#2F6ACD" },
              { label: "Resolved", count: resolvedTickets, color: "#007C63", dot: "#007C63" },
              { label: "Closed", count: closedTickets, color: "#5E6572" },
              { label: "High Priority", count: highPriorityTickets, color: "#C62828", dot: "#C62828" }
            ].map((kpi, idx) => (
              <div
                key={idx}
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #EFE8DF",
                  borderRadius: "22px",
                  padding: "20px",
                  boxShadow: "0 10px 30px rgba(28,25,23,.03)"
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    color: "#9A8C82",
                    marginBottom: "8px",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}
                >
                  {kpi.dot && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: kpi.dot }}></span>}
                  {kpi.label}
                </div>
                <div
                  style={{
                    fontSize: "28px",
                    fontWeight: 700,
                    color: kpi.color
                  }}
                >
                  {kpi.count}
                </div>
              </div>
            ))}
          </div>

          {/* Search + Filters Toolbar */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #EFE8DF",
              borderRadius: "22px",
              padding: "16px",
              display: "flex",
              gap: "12px",
              alignItems: "center",
              marginBottom: "24px",
              boxShadow: "0 10px 30px rgba(28,25,23,.03)"
            }}
          >
            <input
              type="text"
              placeholder="Search tickets by number, customer, email or subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1,
                padding: "12px 16px",
                border: "1px solid #EFE8DF",
                borderRadius: "14px",
                background: "#F8F6F2",
                color: "#2C221E",
                fontSize: "14px",
                outline: "none"
              }}
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: "12px 16px",
                border: "1px solid #EFE8DF",
                borderRadius: "14px",
                background: "#F8F6F2",
                color: "#2C221E",
                fontSize: "14px",
                outline: "none",
                cursor: "pointer"
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
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              style={{
                padding: "12px 16px",
                border: "1px solid #EFE8DF",
                borderRadius: "14px",
                background: "#F8F6F2",
                color: "#2C221E",
                fontSize: "14px",
                outline: "none",
                cursor: "pointer"
              }}
            >
              <option value="All">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: "12px 16px",
                border: "1px solid #EFE8DF",
                borderRadius: "14px",
                background: "#F8F6F2",
                color: "#2C221E",
                fontSize: "14px",
                outline: "none",
                cursor: "pointer"
              }}
            >
              <option value="Newest">Newest</option>
              <option value="Oldest">Oldest</option>
              <option value="Priority">Priority</option>
              <option value="Recently Updated">Recently Updated</option>
            </select>
          </div>

          {/* Ticket List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {sortedTickets.length === 0 ? (
              <div
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #EFE8DF",
                  borderRadius: "22px",
                  padding: "60px 20px",
                  textAlign: "center",
                  color: "#6B5E55",
                  boxShadow: "0 10px 30px rgba(28,25,23,.03)"
                }}
              >
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>📭</div>
                <h3 style={{ margin: "0 0 6px", color: "#2C221E", fontSize: "18px", fontWeight: 700 }}>
                  No support tickets yet
                </h3>
                <p style={{ margin: 0, fontSize: "14px", color: "#9A8C82" }}>
                  When customers contact support, their conversations will appear here.
                </p>
              </div>
            ) : (
              sortedTickets.map((ticket) => {
                const isSelected = selectedTicket?.id === ticket.id;
                return (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    style={{
                      background: "#FFFFFF",
                      border: isSelected ? "2px solid #C89B6D" : "1px solid #EFE8DF",
                      borderRadius: "22px",
                      padding: "22px",
                      boxShadow: isSelected
                        ? "0 18px 40px rgba(0,0,0,.08)"
                        : "0 10px 30px rgba(28,25,23,.03)",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      transform: isSelected ? "translateY(-3px)" : "none"
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "12px"
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#9A8C82",
                            fontWeight: 600,
                            marginBottom: "4px"
                          }}
                        >
                          #{ticket.ticketNumber || ticket.id.slice(0, 8)}
                        </div>
                        <h3
                          style={{
                            margin: 0,
                            color: "#2C221E",
                            fontSize: "18px",
                            fontWeight: 700
                          }}
                        >
                          {ticket.subject}
                        </h3>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        {getStatusBadge(ticket.status)}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: "14px",
                        color: "#6B5E55",
                        paddingTop: "12px",
                        borderTop: "1px solid #F8F6F2"
                      }}
                    >
                      <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                        <span style={{ fontWeight: 600, color: "#2C221E" }}>
                          {ticket.customerName || "Unknown Customer"}
                        </span>
                        <span style={{ color: "#9A8C82", fontSize: "13px" }}>
                          {ticket.customerEmail || "No email"}
                        </span>
                        <span
                          style={{
                            fontSize: "12px",
                            padding: "3px 10px",
                            borderRadius: "99px",
                            background:
                              ticket.priority === "High"
                                ? "#FDECEC"
                                : ticket.priority === "Medium"
                                ? "#FFF8EA"
                                : "#F3F4F6",
                            color:
                              ticket.priority === "High"
                                ? "#C62828"
                                : ticket.priority === "Medium"
                                ? "#B67A00"
                                : "#5E6572",
                            fontWeight: 600
                          }}
                        >
                          {ticket.priority || "Normal"}
                        </span>
                      </div>

                      <div style={{ fontSize: "13px", color: "#9A8C82" }}>
                        Assigned: <strong style={{ color: "#2C221E" }}>{ticket.assignedTo || "Unassigned"}</strong>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Ticket Details Panel */}
          {selectedTicket && (
            <div
              style={{
                marginTop: "32px",
                background: "#FFFFFF",
                border: "1px solid #EFE8DF",
                borderRadius: "22px",
                padding: "28px",
                boxShadow: "0 10px 30px rgba(28,25,23,.03)"
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "24px",
                  borderBottom: "1px solid #F8F6F2",
                  paddingBottom: "16px"
                }}
              >
                <div>
                  <div style={{ fontSize: "12px", color: "#9A8C82", fontWeight: 600, marginBottom: "4px" }}>
                    TICKET DETAILS MANAGEMENT
                  </div>
                  <h2
                    style={{
                      margin: 0,
                      color: "#2C221E",
                      fontFamily: "Playfair Display, serif",
                      fontSize: "24px"
                    }}
                  >
                    #{selectedTicket.ticketNumber} — {selectedTicket.subject}
                  </h2>
                </div>

                <button
                  onClick={() => setSelectedTicket(null)}
                  style={{
                    background: "#F8F6F2",
                    border: "1px solid #EFE8DF",
                    borderRadius: "12px",
                    padding: "8px 16px",
                    cursor: "pointer",
                    fontWeight: 600,
                    color: "#6B5E55",
                    fontSize: "14px"
                  }}
                >
                  ✕ Close
                </button>
              </div>

              {/* Grid sections resembling Salesforce */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
                <div style={{ background: "#F8F6F2", padding: "20px", borderRadius: "18px" }}>
                  <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: 700, color: "#2C221E" }}>
                    Ticket Information
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#9A8C82" }}>Status</span>
                      <select
                        value={selectedTicket.status}
                        onChange={(e) => updateTicketStatus(e.target.value)}
                        style={{ padding: "4px 8px", borderRadius: "8px", border: "1px solid #EFE8DF", background: "#FFFFFF" }}
                      >
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Waiting for Customer">Waiting for Customer</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#9A8C82" }}>Priority</span>
                      <select
                        value={selectedTicket.priority || "Low"}
                        onChange={(e) => updatePriority(e.target.value)}
                        style={{ padding: "4px 8px", borderRadius: "8px", border: "1px solid #EFE8DF", background: "#FFFFFF" }}
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#9A8C82" }}>Category</span>
                      <span style={{ fontWeight: 600 }}>{selectedTicket.category || "General"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#9A8C82" }}>Linked Order</span>
                      <span style={{ fontWeight: 600 }}>{selectedTicket.orderId || "Not Linked"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#9A8C82" }}>Assigned Staff</span>
                      <select
                        value={selectedTicket.assignedTo || "Unassigned"}
                        onChange={(e) => assignStaff(e.target.value)}
                        style={{ padding: "4px 8px", borderRadius: "8px", border: "1px solid #EFE8DF", background: "#FFFFFF" }}
                      >
                        {supportStaff.map((staff) => (
                          <option key={staff} value={staff}>{staff}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div style={{ background: "#F8F6F2", padding: "20px", borderRadius: "18px" }}>
                  <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: 700, color: "#2C221E" }}>
                    Customer Details
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#9A8C82" }}>Name</span>
                      <span style={{ fontWeight: 600 }}>{selectedTicket.customerName || "Unknown"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#9A8C82" }}>Email</span>
                      <span style={{ fontWeight: 600 }}>{selectedTicket.customerEmail || "No email"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description Container */}
              <div style={{ background: "#F8F6F2", padding: "20px", borderRadius: "18px", marginBottom: "24px" }}>
                <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: 700, color: "#2C221E" }}>
                  Initial Description
                </h4>
                <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.6, color: "#6B5E55" }}>
                  {selectedTicket.description}
                </p>
              </div>

              {/* Chat Conversation UI */}
              <div style={{ marginBottom: "24px", borderTop: "1px solid #EFE8DF", paddingTop: "24px" }}>
                <h3 style={{ margin: "0 0 16px 0", fontFamily: "Playfair Display, serif", fontSize: "20px" }}>
                  Conversation
                </h3>

                {messages.length === 0 ? (
                  <div
                    style={{
                      background: "#F8F6F2",
                      border: "1px dashed #EFE8DF",
                      borderRadius: "14px",
                      padding: "20px",
                      textAlign: "center",
                      color: "#9A8C82",
                      fontSize: "14px"
                    }}
                  >
                    No messages in this conversation yet.
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "16px",
                      maxHeight: "450px",
                      overflowY: "auto",
                      paddingRight: "8px"
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
                              marginBottom: "4px",
                              fontWeight: 600
                            }}
                          >
                            {isCustomer ? msg.senderName || "Customer" : "Support Team"}
                          </div>
                          <div
                            style={{
                              maxWidth: "70%",
                              background: isCustomer ? "#FFFFFF" : "#C89B6D",
                              color: isCustomer ? "#2C221E" : "#FFFFFF",
                              border: isCustomer ? "1px solid #EFE8DF" : "none",
                              borderRadius: isCustomer ? "18px 18px 18px 4px" : "18px 18px 4px 18px",
                              padding: "14px 18px",
                              lineHeight: 1.5,
                              fontSize: "14px",
                              boxShadow: "0 4px 12px rgba(28,25,23,0.02)"
                            }}
                          >
                            <div>{msg.message}</div>
                            <div
                              style={{
                                marginTop: "6px",
                                fontSize: "11px",
                                opacity: 0.75,
                                textAlign: "right"
                              }}
                            >
                              {msg.createdAt?.toDate?.().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || "Sending..."}
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
              <div style={{ marginBottom: "24px", borderTop: "1px solid #EFE8DF", paddingTop: "24px" }}>
                <h3 style={{ margin: "0 0 12px 0", fontFamily: "Playfair Display, serif", fontSize: "18px" }}>
                  Write a Reply
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
                  placeholder="Write a reply... (Ctrl + Enter to send)"
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "14px",
                    border: "1px solid #EFE8DF",
                    borderRadius: "14px",
                    background: "#F8F6F2",
                    fontSize: "14px",
                    outline: "none",
                    resize: "vertical",
                    boxSizing: "border-box"
                  }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
                  <button
                    onClick={sendReply}
                    disabled={sending || !reply.trim()}
                    style={{
                      background: "linear-gradient(135deg, #C89B6D, #B68658)",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: "12px",
                      padding: "12px 24px",
                      fontWeight: 600,
                      cursor: sending ? "not-allowed" : "pointer",
                      opacity: sending ? 0.7 : 1,
                      boxShadow: "0 10px 24px rgba(196,149,106,.28)"
                    }}
                  >
                    {sending ? "Sending..." : "Send Reply →"}
                  </button>
                </div>
              </div>

              {/* Internal Notes */}
              <div
                style={{
                  background: "#FFF9EE",
                  border: "1px solid #F3EAD3",
                  borderRadius: "18px",
                  padding: "20px"
                }}
              >
                <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: 700, color: "#2C221E" }}>
                  Internal Notes
                </h3>
                <p style={{ margin: "0 0 12px 0", fontSize: "13px", color: "#9A8C82" }}>
                  Only visible to support staff.
                </p>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Add internal notes..."
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #EFE8DF",
                    borderRadius: "12px",
                    background: "#FFFFFF",
                    fontSize: "14px",
                    outline: "none",
                    resize: "vertical",
                    boxSizing: "border-box"
                  }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
                  <button
                    onClick={saveInternalNotes}
                    disabled={savingNotes}
                    style={{
                      background: "#2C221E",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: "10px",
                      padding: "10px 18px",
                      fontWeight: 600,
                      fontSize: "13px",
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
      {activeTab === "supporthelpdesk" && <SupportHelpCategoryManagement />}
      {activeTab === "supportanalytics" && <SupportAnalyticsManagement />}
      {activeTab === "supportpolicies" && <SupportPolicyManagement />}
    </div>
  );
}
