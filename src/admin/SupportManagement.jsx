import { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot, doc, addDoc, updateDoc, serverTimestamp, increment } from "firebase/firestore";
import SupportFAQManagement from "./SupportFAQManagement";
import SupportPolicyManagement from "./SupportPolicyManagement";
import SupportSettingsManagement from "./SupportSettingsManagement";
import SupportHelpCategoryManagement from "./SupportHelpCategoryManagement";
import SupportAnalyticsManagement from "./SupportAnalyticsManagement";
import SupportReviewsManagement from "./SupportReviewsManagement";

const supportStaff = [
  "Unassigned",
  "Olivia",
  "Support Team",
  "Manager",
  "Senior Support"
];

// Helper to get initials for customer avatar
const getInitials = (name) => {
  if (!name) return "CS";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

// Helper to calculate SLA status based on creation time & priority
const getSlaStatus = (createdAt, priority) => {
  if (!createdAt || !createdAt.seconds) return { label: "On Time", color: "#177245", bg: "#ECF8F1", dot: "#177245" };
  const now = Date.now() / 1000;
  const diffHours = (now - createdAt.seconds) / 3600;
  
  // High priority SLA: 4 hours; Medium: 12 hours; Low: 24 hours
  let threshold = 24;
  if (priority === "High") threshold = 4;
  else if (priority === "Medium") threshold = 12;

  if (diffHours > threshold) {
    return { label: "Overdue", color: "#C62828", bg: "#FDECEC", dot: "#C62828" };
  } else if (diffHours > threshold * 0.75) {
    return { label: "Due Soon", color: "#B67A00", bg: "#FFF8EA", dot: "#B67A00" };
  }
  return { label: "On Time", color: "#177245", bg: "#ECF8F1", dot: "#177245" };
};

export default function SupportManagement({ setPage, setActivePage }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [assignedFilter, setAssignedFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Newest");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState("tickets");
  const [internalNotes, setInternalNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [reviews, setReviews] = useState([]);
const [loadingReviews, setLoadingReviews] = useState(true);
  
  const messagesEndRef = useRef(null);
  const typingTimeout = useRef(null);
  const adminTypingTimeout = useRef(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    const q = query(
      collection(db, "supportTickets"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setTickets(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
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

  // Cleanup effect for unmount safety
  useEffect(() => {
    return () => {
      clearTimeout(adminTypingTimeout.current);
      if (selectedTicket?.id) {
        updateAdminTypingStatus(selectedTicket.id, false);
      }
    };
  }, []);

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
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
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

useEffect(() => {
  const q = query(
    collection(db, "supportReviews"),
    orderBy("createdAt", "desc")
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    setReviews(data);
    setLoadingReviews(false);
  });

  return () => unsubscribe();
}, []);


  

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

  // Helper to update admin typing timestamp state
  const updateAdminTypingStatus = async (ticketId, isTyping) => {
    if (!ticketId) return;
    try {
      await updateDoc(doc(db, "supportTickets", ticketId), {
        adminTypingAt: isTyping ? serverTimestamp() : null
      });
    } catch (err) {
      console.log(err);
    }
  };

  // Optimized typing handler tied directly to text input changes
  const handleAdminReplyChange = (e) => {
    const value = e.target.value;
    setReply(value);

    if (!selectedTicket?.id) return;

    if (value.trim()) {
      if (!isTypingRef.current) {
        isTypingRef.current = true;
        updateAdminTypingStatus(selectedTicket.id, true);
      }
      clearTimeout(adminTypingTimeout.current);
      adminTypingTimeout.current = setTimeout(() => {
        isTypingRef.current = false;
        updateAdminTypingStatus(selectedTicket.id, false);
      }, 2500);
    } else {
      clearTimeout(adminTypingTimeout.current);
      isTypingRef.current = false;
      updateAdminTypingStatus(selectedTicket.id, false);
    }
  };

  // Helper to securely open a ticket while clearing old typing states
  const openTicket = async (ticket) => {
    clearTimeout(adminTypingTimeout.current);
    if (selectedTicket?.id) {
      isTypingRef.current = false;
      await updateAdminTypingStatus(selectedTicket.id, false);
    }
    setSelectedTicket(ticket);
  };

  // Helper to switch admin tabs safely
  const changeTab = async (tab) => {
    clearTimeout(adminTypingTimeout.current);
    if (selectedTicket?.id) {
      isTypingRef.current = false;
      await updateAdminTypingStatus(selectedTicket.id, false);
    }
    setActiveTab(tab);
  };

  const sendReply = async () => {
    const message = reply.trim();
    if (!message || !selectedTicket || sending) return;

    try {
      setSending(true);
      clearTimeout(adminTypingTimeout.current);

      // Stop typing indicator
      isTypingRef.current = false;
      await updateAdminTypingStatus(selectedTicket.id, false);

      await Promise.all([
        addDoc(
          collection(db, "supportTickets", selectedTicket.id, "messages"),
          {
            sender: "support",
            senderName: "Support Team",
            message,
            createdAt: serverTimestamp(),
            status: "sent"
          }
        ),

        updateDoc(doc(db, "supportTickets", selectedTicket.id), {
          updatedAt: serverTimestamp(),
          customerUnread: increment(1),
          lastReplyBy: "support",
          lastMessage: message,
          lastMessageAt: serverTimestamp(),
          adminTypingAt: null
        })
      ]);

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
      clearTimeout(adminTypingTimeout.current);
      isTypingRef.current = false;
      await updateAdminTypingStatus(selectedTicket.id, false);
      
      await updateDoc(doc(db, "supportTickets", selectedTicket.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
        adminTypingAt: null
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
      (ticket.customerEmail || "").toLowerCase().includes(search) ||
      (ticket.orderId || "").toLowerCase().includes(search) ||
      (ticket.assignedTo || "").toLowerCase().includes(search) ||
      ticket.id.toLowerCase().includes(search);
    const matchesStatus = statusFilter === "All" || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === "All" || ticket.priority === priorityFilter;
    const matchesAssigned = assignedFilter === "All" || (ticket.assignedTo || "Unassigned") === assignedFilter;
    const matchesCategory = categoryFilter === "All" || (ticket.category || "General") === categoryFilter;
    return matchesSearch && matchesStatus && matchesPriority && matchesAssigned && matchesCategory;
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



// Helper to format ticket ID cleanly without double "SUP-" prefixes
const formatTicketNumber = (ticket) => {
  if (!ticket) return "#SUP-000000";
  const num = ticket.ticketNumber || ticket.id.slice(0, 6);
  const cleanNum = num.toString().replace(/^#?SUP-?/i, "").toUpperCase();
  return `#SUP-${cleanNum}`;
};




  

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
            Support Management
          </h1>
          <p style={{ color: "#6B5E55", fontSize: "15px", margin: 0 }}>
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

      {/* Tabs - Segmented Control */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          padding: "8px",
          background: "#F4EFE8",
          border: "1px solid #E9DFD3",
          borderRadius: "18px",
          width: "fit-content",
          marginBottom: "28px"
        }}
      >
        {[
          { id: "tickets", label: "Tickets" },
          { id: "supportfaq", label: "FAQs" },
          { id: "supportpolicies", label: "Policies" },
          { id: "supportsettings", label: "Contact" },
          { id: "supporthelpdesk", label: "Help Desk" },
        { id:"supportreviews", label:"Reviews"},
          { id: "supportanalytics", label: "Analytics" }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => changeTab(tab.id)}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "#FAF8F5";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.transform = "translateY(0)";
                }
              }}
              style={
                isActive
                  ? {
                      padding: "12px 22px",
                      borderRadius: "14px",
                      border: "1px solid #DCCBB9",
                      background: "linear-gradient(180deg,#FFFFFF,#F8F3EC)",
                      color: "#2C221E",
                      fontWeight: 700,
                      fontSize: "14px",
                      boxShadow: "0 6px 18px rgba(196,149,106,.18), inset 0 1px 0 rgba(255,255,255,.9)",
                      transition: "background .25s ease, box-shadow .25s ease, transform .2s ease, color .2s ease",
                      cursor: "pointer"
                    }
                  : {
                      padding: "12px 22px",
                      borderRadius: "14px",
                      border: "1px solid transparent",
                      background: "transparent",
                      color: "#7A6E65",
                      fontWeight: 500,
                      fontSize: "14px",
                      transition: "background .25s ease, box-shadow .25s ease, transform .2s ease, color .2s ease",
                      cursor: "pointer"
                    }
              }
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
              { label: "High Priority", count: highPriorityTickets, color: "#C62828", dot: "#C62828" },
              
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
                  {kpi.dot && (
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: kpi.dot }}></span>
                  )}
                  {kpi.label}
                </div>
                <div style={{ fontSize: "28px", fontWeight: 700, color: kpi.color }}>
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
              flexWrap: "wrap",
              gap: "12px",
              alignItems: "center",
              marginBottom: "24px",
              boxShadow: "0 10px 30px rgba(28,25,23,.03)"
            }}
          >
            <input
              type="text"
              placeholder="Search by ticket ID, order ID, subject, customer, email, staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1,
                minWidth: "260px",
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
              value={assignedFilter}
              onChange={(e) => setAssignedFilter(e.target.value)}
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
              <option value="All">All Staff</option>
              {supportStaff.map((staff) => (
                <option key={staff} value={staff}>{staff}</option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
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
              <option value="All">All Categories</option>
              <option value="General">General</option>
              <option value="Payment">Payment</option>
              <option value="Delivery">Delivery</option>
              <option value="Rewards">Rewards</option>
              <option value="Account">Account</option>
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
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#2C221E", marginBottom: "6px" }}>
                  No support tickets found
                </div>
                <p style={{ margin: 0, fontSize: "14px", color: "#9A8C82" }}>
                  When customers contact support, their conversations will appear here.
                </p>
              </div>
            ) : (
              sortedTickets.map((ticket) => {
                const isSelected = selectedTicket?.id === ticket.id;
                const sla = getSlaStatus(ticket.createdAt, ticket.priority);
                return (
                  <div
                    key={ticket.id}
                    onClick={() => openTicket(ticket)}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 18px 36px rgba(0,0,0,.05)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 10px 30px rgba(28,25,23,.03)";
                      }
                    }}
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
                        marginBottom: "10px"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            background: "#F4EFE8",
                            color: "#7A6E65",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "12px",
                            fontWeight: 700
                          }}
                        >
                          {getInitials(ticket.customerName)}
                        </div>
                        <div>
                          <div style={{ fontSize: "12px", color: "#9A8C82", fontWeight: 600, marginBottom: "2px" }}>
  {formatTicketNumber(ticket)}
</div>

                          <h3 style={{ margin: 0, color: "#2C221E", fontSize: "17px", fontWeight: 700 }}>
                            {ticket.subject}
                          </h3>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span
                          style={{
                            fontSize: "12px",
                            padding: "4px 10px",
                            borderRadius: "999px",
                            background: sla.bg,
                            color: sla.color,
                            fontWeight: 600,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px"
                          }}
                        >
                          <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: sla.dot }}></span>
                          {sla.label}
                        </span>
                        {getStatusBadge(ticket.status)}
                      </div>
                    </div>

                    {/* Preview message line */}
                    {ticket.lastMessage && (
                      <div
                        style={{
                          fontSize: "13px",
                          color: "#6B5E55",
                          marginBottom: "12px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          background: "#F8F6F2",
                          padding: "8px 12px",
                          borderRadius: "10px"
                        }}
                      >
                        <span style={{ fontWeight: 600, color: "#2C221E" }}>Latest: </span>
                        {ticket.lastMessage}
                      </div>
                    )}

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: "13px",
                        color: "#6B5E55",
                        paddingTop: "12px",
                        borderTop: "1px solid #F8F6F2"
                      }}
                    >
                      <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 600, color: "#2C221E" }}>
                          {ticket.customerName || "Unknown Customer"}
                        </span>
                        <span style={{ color: "#9A8C82" }}>
                          {ticket.customerEmail || "No email"}
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
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
                          {ticket.priority || "Normal"} Priority
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#9A8C82" }}>
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
                  <h2 style={{ margin: 0, color: "#2C221E", fontFamily: "Playfair Display, serif", fontSize: "24px" }}>
  #{selectedTicket.ticketNumber || selectedTicket.id.slice(0, 6).toUpperCase()} — {selectedTicket.subject}
</h2>

                </div>
                <button
                  onClick={() => openTicket(null)}
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

              {/* Timestamps & Quick Info */}
              <div
                style={{
                  display: "flex",
                  gap: "20px",
                  fontSize: "12px",
                  color: "#9A8C82",
                  marginBottom: "20px",
                  background: "#F8F6F2",
                  padding: "12px 16px",
                  borderRadius: "14px",
                  flexWrap: "wrap"
                }}
              >
                <div>
                  Created: <strong style={{ color: "#2C221E" }}>{selectedTicket.createdAt?.toDate?.().toLocaleString() || "N/A"}</strong>
                </div>
                <div>
                  Last Updated: <strong style={{ color: "#2C221E" }}>{selectedTicket.updatedAt?.toDate?.().toLocaleString() || "N/A"}</strong>
                </div>
                <div>
                  First Response: <strong style={{ color: "#2C221E" }}>{selectedTicket.firstResponseAt?.toDate?.().toLocaleString() || "Pending"}</strong>
                </div>
              </div>

              {/* Responsive Grid sections */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px", marginBottom: "24px" }}>
                <div style={{ background: "#FFFFFF", border: "1px solid #ECE8E1", padding: "20px", borderRadius: "18px", boxShadow: "0 4px 12px rgba(28,25,23,0.02)" }}>
                  <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: 700, color: "#2C221E" }}>
                    Ticket Information
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#9A8C82" }}>Category</span>
                      <span style={{ fontWeight: 600 }}>{selectedTicket.category || "General"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#9A8C82" }}>Linked Order</span>
                      <span style={{ fontWeight: 600 }}>{selectedTicket.orderId || "Not Linked"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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

                <div style={{ background: "#FFFFFF", border: "1px solid #ECE8E1", padding: "20px", borderRadius: "18px", boxShadow: "0 4px 12px rgba(28,25,23,0.02)" }}>
                  <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: 700, color: "#2C221E" }}>
                    Customer Details
                  </h4>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "50%",
                        background: "#F4EFE8",
                        color: "#7A6E65",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "14px",
                        fontWeight: 700
                      }}
                    >
                      {getInitials(selectedTicket.customerName)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "15px", color: "#2C221E" }}>
                        {selectedTicket.customerName || "Unknown Customer"}
                      </div>
                      <div style={{ fontSize: "13px", color: "#9A8C82" }}>
                        {selectedTicket.customerEmail || "No email provided"}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px", borderTop: "1px solid #F8F6F2", paddingTop: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#9A8C82" }}>Lifetime Spend:</span>
                      <span style={{ fontWeight: 600 }}>$342.00</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#9A8C82" }}>Loyalty Tier:</span>
                      <span style={{ fontWeight: 600 }}>Gold Member</span>
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
                          <div style={{ fontSize: "12px", color: "#9A8C82", marginBottom: "4px", fontWeight: 600 }}>
                            {isCustomer ? msg.senderName || "Customer" : "Support Team"}
                          </div>
                          <div
                            style={{
                              maxWidth: "70%",
                              background: isCustomer ? "#FFFFFF" : "#B68658",
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
                            {/* Attachment */}
{msg.attachmentUrl && (
  <div style={{ marginTop: "10px" }}>
    {msg.attachmentType?.startsWith("image/") ? (
      <img
        src={msg.attachmentUrl}
        alt={msg.attachmentName}
        style={{
          maxWidth: "220px",
          borderRadius: "10px"
        }}
      />
    ) : (
      <a
        href={msg.attachmentUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        📎 {msg.attachmentName || "View Attachment"}
      </a>
    )}
  </div>
)}
                            <div style={{ marginTop: "6px", fontSize: "11px", opacity: 0.75, textAlign: "right" }}>
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
              <div style={{ marginBottom: "24px", borderTop: "1px solid #EFE8DF", paddingTop: "24px", background: "#FCFAF7", padding: "20px", borderRadius: "18px", border: "1px solid #EFE8DF" }}>
                <h3 style={{ margin: "0 0 12px 0", fontFamily: "Playfair Display, serif", fontSize: "18px" }}>
                  Write a Reply
                </h3>
   <textarea
  value={reply}
  onChange={handleAdminReplyChange}

  onKeyDown={(e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      sendReply();
    }
  }}
  placeholder="Write a reply..."
  rows={4}
  style={{
    width: "100%",
    padding: "14px",
    border: "1px solid #EFE8DF",
    borderRadius: "14px",
    background: "#FFFFFF",
    fontSize: "14px",
    outline: "none",
    resize: "vertical",
    boxSizing: "border-box"
  }}
/>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
                  <span style={{ fontSize: "12px", color: "#9A8C82" }}>
                    Tip: Press <kbd style={{ background: "#EFE8DF", padding: "2px 6px", borderRadius: "4px" }}>Ctrl + Enter</kbd> to send quickly
                  </span>
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
              <div style={{ background: "#FFF9EE", border: "1px solid #F3EAD3", borderRadius: "18px", padding: "20px" }}>
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
      {activeTab === "supportreviews" && (
  <SupportReviewsManagement
    setActiveTab={setActiveTab}
    setSelectedTicket={setSelectedTicket}
  />
)}
    </div>
  );
}
