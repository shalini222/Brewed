import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  updateDoc,
  increment,
  limit
} from "firebase/firestore";
import { 
  Send, 
  Lock, 
  PlusCircle, 
  ArrowLeft, 
  LifeBuoy,
  Search,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  MessageCircle,
  Camera,
  Clock,
  ShieldCheck,
  Truck,
  Gift,
  CreditCard
} from "lucide-react";

// Map icon names from Firestore to Lucide components
const iconMap = { Truck, CreditCard, Gift, ShieldCheck };

export default function SupportPage({ setPage }) {
  const { currentUser } = useAuth();
  
  // Navigation states ("home", "list", "create", "conversation")
  const [activePage, setActivePage] = useState("home");
  
  // FAQ state
  const [openFaq, setOpenFaq] = useState(null);
  const [search, setSearch] = useState("");
  const [faqVotes, setFaqVotes] = useState({});
  const [selectedCategory, setSelectedCategory] = useState("All");
  
  // Ticket states
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Form states for creating a ticket
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("General");
  const [initialMessage, setInitialMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Chat conversation states
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);

  // Support Settings state
  const [supportSettings, setSupportSettings] = useState({
    phone: "",
    email: "",
    whatsapp: "",
    instagram: "",
    callDescription: "",
    emailDescription: "",
    whatsappDescription: "",
    instagramDescription: "",
    mondayFriday: "",
    saturday: "",
    sunday: "",
    businessHoursTitle: "",
    businessHoursDescription: ""
  });

  const containerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // FAQ 
  const [faqs, setFaqs] = useState([]);

  // Help Categories state
  const [helpCategories, setHelpCategories] = useState([]);

  // Support Policies state
  const [policies, setPolicies] = useState([]);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [openPolicy, setOpenPolicy] = useState(null);
  const [selectedPolicyCategory, setSelectedPolicyCategory] = useState("All");
  const [policySearch, setPolicySearch] = useState("");

  const filteredPolicies = policies.filter((policy) => {
    const matchesCategory = selectedPolicyCategory === "All" || policy.category === selectedPolicyCategory;
    const matchesSearch =
      (policy.title || "").toLowerCase().includes(policySearch.toLowerCase()) ||
      (policy.content || "").toLowerCase().includes(policySearch.toLowerCase()) ||
      (policy.category || "").toLowerCase().includes(policySearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const policyCategories = [
    "All",
    ...new Set(policies.map((policy) => policy.category))
  ];

  // Filter FAQs by question, answer, or category
  const filteredFaqs = faqs.filter((faq) => {
    const matchesSearch =
      (faq.question || "").toLowerCase().includes(search.toLowerCase()) ||
      (faq.answer || "").toLowerCase().includes(search.toLowerCase()) ||
      (faq.category || "").toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      selectedCategory === "All" ||
      faq.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const featuredFaq = faqs.find(faq => faq.featured);
  const regularFaqs = filteredFaqs.filter(
    faq => !faq.featured
  );

  // Auto-scroll logic
  const scrollToBottom = (behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const nearBottom = scrollHeight - scrollTop - clientHeight < 150;
    setIsNearBottom(nearBottom);
  };

  // Fetch customer's tickets in real-time
  useEffect(() => {
    if (!currentUser?.uid) {
      setLoadingTickets(false);
      return;
    }

    setLoadingTickets(true);
    const q = query(
      collection(db, "supportTickets"),
      where("customerId", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedTickets = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        setTickets(fetchedTickets);
        setLoadingTickets(false);
      },
      (err) => {
        console.log("Error fetching customer tickets:", err);
        setLoadingTickets(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Mark messages as read for Customer when viewing a ticket
  useEffect(() => {
    if (!selectedTicket?.id) return;

    const markAsRead = async () => {
      try {
        if (selectedTicket.customerUnread > 0) {
          await updateDoc(doc(db, "supportTickets", selectedTicket.id), {
            customerUnread: 0
          });
        }
      } catch (err) {
        console.log("Error marking ticket as read for customer:", err);
      }
    };

    markAsRead();
  }, [selectedTicket?.id, selectedTicket?.customerUnread]);

  // Real-time messages listener for the active ticket
  useEffect(() => {
    if (!selectedTicket?.id) return;

    setLoadingMessages(true);
    setMessages([]);

    const q = query(
      collection(db, "supportTickets", selectedTicket.id, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setMessages(
          snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data()
          }))
        );
        setLoadingMessages(false);
      },
      (err) => {
        console.log("Error listening to ticket messages:", err);
        setLoadingMessages(false);
      }
    );

    return () => unsubscribe();
  }, [selectedTicket?.id]);

  useEffect(() => {
    const q = query(
      collection(db, "supportFAQs"),
      where("active", "==", true),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      data.sort((a, b) => {
        if (a.pinned === b.pinned) {
          return (a.sortOrder || 0) - (b.sortOrder || 0);
        }
        return b.pinned - a.pinned;
      });
      setFaqs(data);
    });

    return unsubscribe;
  }, []);

  // Load categories from Firestore
  useEffect(() => {
    const q = query(
      collection(db, "supportHelpCategories"),
      where("active", "==", true),
      orderBy("sortOrder", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setHelpCategories(data);
    });
    return unsubscribe;
  }, []);

  // Fetch support settings in real-time
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "supportSettings", "general"),
      (snapshot) => {
        if (snapshot.exists()) {
          setSupportSettings(snapshot.data());
        }
      }
    );
    return unsubscribe;
  }, []);

  // Fetch published policies
  useEffect(() => {
    const q = query(
      collection(db, "supportPolicies"),
      where("status", "==", "Published")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      data.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

      setPolicies(data);
    });

    return unsubscribe;
  }, []);

  // Auto-scroll when messages update
  useEffect(() => {
    if (isNearBottom || messages.length <= 5) {
      scrollToBottom();
    }
  }, [messages, isNearBottom]);

  // Create a new support ticket
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !initialMessage.trim() || submitting || !currentUser?.uid) return;

    try {
      setSubmitting(true);

      const ticketRef = await addDoc(collection(db, "supportTickets"), {
        customerId: currentUser.uid,
        customerName: currentUser.displayName || currentUser.email || "Customer",
        customerEmail: currentUser.email || "",
        subject: subject.trim(),
        category: category,
        status: "Open",
        priority: "Normal",
        customerUnread: 0,
        supportUnread: 1,
        lastReplyBy: "customer",
        lastMessage: initialMessage.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessageAt: serverTimestamp()
      });

      await addDoc(collection(db, "supportTickets", ticketRef.id, "messages"), {
        sender: "customer",
        senderName: currentUser.displayName || currentUser.email || "Customer",
        message: initialMessage.trim(),
        createdAt: serverTimestamp()
      });

      const snap = await getDoc(ticketRef);
      setSelectedTicket({ id: ticketRef.id, ...snap.data() });
      
      setSubject("");
      setCategory("General");
      setInitialMessage("");
      setActivePage("conversation");
    } catch (err) {
      console.log("Error creating support ticket:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Send a message reply
  const sendReply = async () => {
    if (!reply.trim() || sending || !selectedTicket?.id || !currentUser?.uid) return;

    try {
      setSending(true);
      const ticketRef = doc(db, "supportTickets", selectedTicket.id);
      const ticketSnap = await getDoc(ticketRef);

      if (!ticketSnap.exists()) {
        alert("This ticket no longer exists.");
        setActivePage("list");
        return;
      }

      await addDoc(collection(db, "supportTickets", selectedTicket.id, "messages"), {
        sender: "customer",
        senderName: currentUser.displayName || currentUser.email || "Customer",
        message: reply.trim(),
        createdAt: serverTimestamp()
      });

      await updateDoc(ticketRef, {
        updatedAt: serverTimestamp(),
        supportUnread: increment(1),
        lastReplyBy: "customer",
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

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendReply();
    }
  };

  const formatMessageTime = (timestamp) => {
    if (!timestamp?.toDate) return "Sending...";
    const date = timestamp.toDate();
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeString = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });

    if (isToday) return `Today • ${timeString}`;
    if (isYesterday) return `Yesterday • ${timeString}`;
    return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} • ${timeString}`;
  };

  const openFAQ = async (faq, index) => {
    if (openFaq === index) {
      setOpenFaq(null);
      return;
    }

    setOpenFaq(index);

    try {
      await updateDoc(doc(db, "supportFAQs", faq.id), {
        views: increment(1)
      });
    } catch (err) {
      console.log("Error updating FAQ views:", err);
    }
  };

  const voteFAQ = async (faqId, type) => {
    if (faqVotes[faqId]) return;

    try {
      await updateDoc(doc(db, "supportFAQs", faqId), {
        [type]: increment(1)
      });

      setFaqVotes((prev) => ({
        ...prev,
        [faqId]: type
      }));
    } catch (err) {
      console.log("Error voting:", err);
    }
  };

  const isClosed = selectedTicket?.status === "Closed";

  const recentTickets = [...tickets]
    .sort((a, b) => {
      const aTime = a.updatedAt?.seconds || 0;
      const bTime = b.updatedAt?.seconds || 0;
      return bTime - aTime;
    })
    .slice(0, 3);

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto", fontFamily: "inherit" }}>
      <style>{`
        .support-container { display: flex; flex-direction: column; gap: 16px; }
        .support-card { background: white; border: 1px solid #E8DED2; border-radius: 14px; padding: 24px; box-shadow: 0 2px 10px rgba(44,34,30,0.02); margin-bottom: 12px; }
        .support-btn { background: #C4956A; color: white; border: none; border-radius: 12px; padding: 10px 18px; font-weight: 600; font-size: 14px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: background .2s; }
        .support-btn:hover { background: #b38259; }
        .support-btn-secondary { background: #FAF6F0; color: #2C221E; border: 1px solid #E8DED2; }
        .support-btn-secondary:hover { background: #E8DED2; }
        .ticket-item { display: flex; justify-content: space-between; align-items: center; padding: 16px; border: 1px solid #E8DED2; border-radius: 12px; background: #FDFAF5; cursor: pointer; transition: all .2s; margin-bottom: 10px; }
        .ticket-item:hover { border-color: #C4956A; background: #FFFFFF; }
        .badge { font-size: 11px; padding: 4px 8px; border-radius: 6px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; }
        .badge-open { background: #FEF3C7; color: #D97706; }
        .badge-closed { background: #F3F4F6; color: #4B5563; }
        .conversation-box { display: flex; flex-direction: column; gap: 16px; max-height: 400px; overflow-y: auto; padding-right: 4px; }
        .message-wrapper { display: flex; flex-direction: column; max-width: 75%; }
        .customer-message-wrapper { align-self: flex-end; align-items: flex-end; }
        .support-message-wrapper { align-self: flex-start; align-items: flex-start; }
        .message-sender-label { font-size: 12px; color: #9A8C82; margin-bottom: 4px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
        .avatar-badge { width: 20px; height: 20px; border-radius: 50%; background: #E8DED2; color: #2C221E; font-size: 10px; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; }
        .customer-msg { background: #C4956A; color: white; padding: 14px 18px; border-radius: 18px 18px 4px 18px; font-size: 14px; line-height: 1.5; }
        .support-msg { background: white; border: 1px solid #E8DED2; color: #2C221E; padding: 14px 18px; border-radius: 18px 18px 18px 4px; font-size: 14px; line-height: 1.5; }
        .support-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
        .help-card { background: white; border: 1px solid #E8DED2; border-radius: 16px; padding: 18px; cursor: pointer; transition: .2s; }
        .help-card:hover { transform: translateY(-2px); border-color: #C4956A; }
        .help-card h3 { margin: 12px 0 6px; color: #2C221E; }
        .help-card p { margin: 0; color: #9A8C82; font-size: 13px; line-height: 1.5; }
        .support-heading { font-size: 18px; color: #2C221E; margin-bottom: 12px; font-weight: 700; }
        .faq-card { background: white; border: 1px solid #E8DED2; border-radius: 14px; margin-bottom: 12px; overflow: hidden; }
        .faq-btn { width: 100%; background: white; border: none; padding: 18px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; font-size: 14px; font-weight: 600; color: #2C221E; }
        .faq-btn:hover { background: #FAF6F0; }
        .faq-answer { padding: 0 18px 18px; color: #6E5E53; line-height: 1.6; font-size: 14px; }
      `}</style>

      {/* Navigation Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {activePage !== "home" && (
            <button
              onClick={() => setActivePage("home")}
              className="support-btn support-btn-secondary"
              style={{ padding: "8px 12px" }}
            >
              <ArrowLeft size={16} /> Back
            </button>
          )}
          <h2 style={{ margin: 0, color: "#2C221E", fontSize: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
            <LifeBuoy size={22} color="#C4956A" /> Customer Support
          </h2>
        </div>
        {activePage === "home" && (
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => setActivePage("list")} className="support-btn support-btn-secondary">
              My Tickets ({tickets.length})
            </button>
            <button onClick={() => setActivePage("create")} className="support-btn">
              <PlusCircle size={16} /> New Ticket
            </button>
          </div>
        )}
      </div>

      {/* HOME PAGE VIEW */}
      {activePage === "home" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* SEARCH FAQS SECTION */}
          <section>
            <h2 className="support-heading">
              🔍 Search FAQs
            </h2>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "white",
                border: "1px solid #E8DED2",
                borderRadius: "14px",
                padding: "12px 16px"
              }}
            >
              <Search
                size={18}
                color="#C4956A"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search FAQs by question, answer, or category..."
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  marginLeft: "10px",
                  fontSize: "14px",
                  color: "#2C221E"
                }}
              />
            </div>

            {search.trim() !== "" && (
              <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {filteredFaqs.length === 0 ? (
                  <div className="support-card" style={{ padding: "16px", color: "#9A8C82", fontSize: "14px" }}>
                    No matching FAQs found.
                  </div>
                ) : (
                  filteredFaqs.map((faq, idx) => (
                    <div key={idx} className="support-card" style={{ padding: "16px" }}>
                      <div style={{ display: "inline-block", background: "#FAF6F0", color: "#C4956A", padding: "2px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: "600", marginBottom: "8px" }}>
                        {faq.category || "General"}
                      </div>
                      <div style={{ fontWeight: 600, color: "#2C221E", fontSize: "14px", marginBottom: "6px" }}>
                        {faq.question}
                      </div>
                      <div style={{ color: "#6E5E53", fontSize: "13px", lineHeight: "1.4" }}>
                        {faq.answer}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </section>

          {/* BROWSE HELP SECTION */}
          <section>
            <h2 className="support-heading">
              📦 Browse Help
            </h2>
            <div className="support-grid">
              {helpCategories.map((item) => {
                const Icon = iconMap[item.icon] || LifeBuoy;

                return (
                  <div
                    key={item.id}
                    className="help-card"
                    onClick={() => {
                      setSelectedCategory(item.title);
                      setSearch("");
                    }}
                    style={{
                      border:
                        selectedCategory === item.title
                          ? "2px solid #C4956A"
                          : undefined
                    }}
                  >
                    <Icon
                      size={28}
                      color="#C4956A"
                    />

                    <h3>{item.title}</h3>

                    <p>{item.description}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* SUPPORT TICKETS SECTION */}
          <section style={{ padding: "0px" }}>
            <h2 className="support-heading">
              Support Tickets
            </h2>
            <div className="support-grid">
              <div
                className="support-card"
                style={{ cursor: "pointer", padding: "20px" }}
                onClick={() => setActivePage("create")}
              >
                <PlusCircle size={28} color="#C4956A" />
                <h3 style={{ margin: "12px 0 6px 0", color: "#2C221E", fontSize: "16px" }}>Create New Ticket</h3>
                <p style={{ margin: 0, color: "#9A8C82", fontSize: "13px", lineHeight: "1.4" }}>
                  Report an issue or ask our support team for help.
                </p>
              </div>

              <div
                className="support-card"
                style={{ cursor: "pointer", padding: "20px" }}
                onClick={() => setActivePage("list")}
              >
                <LifeBuoy size={28} color="#C4956A" />
                <h3 style={{ margin: "12px 0 6px 0", color: "#2C221E", fontSize: "16px" }}>My Tickets</h3>
                <p style={{ margin: 0, color: "#9A8C82", fontSize: "13px", lineHeight: "1.4" }}>
                  View your support conversations and ticket status. ({tickets.length})
                </p>
              </div>
            </div>
          </section>

          {/* RECENT TICKETS SECTION */}
          <section style={{ marginTop: "0px" }}>
            <h2 className="support-heading">
              🕒 Recent Tickets
            </h2>

            {loadingTickets ? (
              <div className="support-card" style={{ padding: "20px", textAlign: "center", color: "#9A8C82" }}>
                Loading recent tickets...
              </div>
            ) : recentTickets.length === 0 ? (
              <div className="support-card" style={{ padding: "20px" }}>
                <p style={{ margin: 0, color: "#9A8C82" }}>
                  No recent tickets.
                </p>
              </div>
            ) : (
              recentTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="ticket-item"
                  onClick={() => {
                    setSelectedTicket(ticket);
                    setActivePage("conversation");
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        color: "#2C221E"
                      }}
                    >
                      ☕ {ticket.subject}
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        color: "#9A8C82",
                        marginTop: 4
                      }}
                    >
                      {ticket.lastMessage || "No messages yet"}
                    </div>
                  </div>

                  <span
                    className={`badge ${
                      ticket.status === "Closed"
                        ? "badge-closed"
                        : "badge-open"
                    }`}
                  >
                    {ticket.status}
                  </span>
                </div>
              ))
            )}
          </section>

          {/* FREQUENTLY ASKED QUESTIONS SECTION */}
          <section style={{ marginTop: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="support-heading" style={{ margin: 0 }}>
                ❓ Frequently Asked Questions {selectedCategory !== "All" && `(${selectedCategory})`}
              </h2>
              {selectedCategory !== "All" && (
                <button
                  className="support-btn support-btn-secondary"
                  onClick={() => setSelectedCategory("All")}
                  style={{ marginBottom: "0px", padding: "6px 12px", fontSize: "12px" }}
                >
                  Show All FAQs
                </button>
              )}
            </div>

            <div style={{ marginTop: "16px" }}>
              {featuredFaq && search.trim() === "" && selectedCategory === "All" && (
                <div className="support-card" style={{ background: "#FFF8E8", border: "2px solid #F4D27A", marginBottom: "18px" }}>
                  <div style={{ color: "#B8860B", fontWeight: 700, marginBottom: "8px" }}>
                    ⭐ Featured FAQ
                  </div>
                  <h3 style={{ marginTop: 0, color: "#2C221E" }}>
                    {featuredFaq.question}
                  </h3>
                  <p style={{ color: "#6E5E53", whiteSpace: "pre-wrap" }}>
                    {featuredFaq.answer}
                  </p>
                </div>
              )}

              {regularFaqs.length === 0 ? (
                <div className="support-card">
                  <p
                    style={{
                      margin: 0,
                      color: "#9A8C82"
                    }}
                  >
                    No FAQs found for this category.
                  </p>
                </div>
              ) : (
                regularFaqs.map((faq, index) => (
                  <div
                    key={index}
                    className="faq-card"
                  >
                    <div
                      style={{
                        display: "inline-block",
                        background: "#FAF6F0",
                        color: "#C4956A",
                        padding: "4px 10px",
                        borderRadius: "999px",
                        fontSize: "11px",
                        fontWeight: "600",
                        margin: "12px 18px 0"
                      }}
                    >
                      {faq.category || "General"}
                    </div>
                    <button
                      className="faq-btn"
                      onClick={() => openFAQ(faq, index)}
                    >
                      <span>{faq.question}</span>

                      {openFaq === index ? (
                        <ChevronUp size={18} />
                      ) : (
                        <ChevronDown size={18} />
                      )}
                    </button>

                    {openFaq === index && (
                      <div className="faq-answer">
                        <div style={{ whiteSpace: "pre-wrap" }}>
                          {faq.answer}
                        </div>

                        <div
                          style={{
                            marginTop: "18px",
                            paddingTop: "14px",
                            borderTop: "1px solid #E8DED2"
                          }}
                        >
                          <div
                            style={{
                              fontSize: "13px",
                              color: "#6E5E53",
                              marginBottom: "10px"
                            }}
                          >
                            Was this helpful?
                          </div>

                          <div
                            style={{
                              display: "flex",
                              gap: "10px"
                            }}
                          >
                            <button
                              disabled={faqVotes[faq.id]}
                              onClick={() => voteFAQ(faq.id, "helpful")}
                              className="support-btn support-btn-secondary"
                            >
                              👍 Yes
                            </button>

                            <button
                              disabled={faqVotes[faq.id]}
                              onClick={() => voteFAQ(faq.id, "notHelpful")}
                              className="support-btn support-btn-secondary"
                            >
                              👎 No
                            </button>
                          </div>

                          {faqVotes[faq.id] && (
                            <div
                              style={{
                                marginTop: "10px",
                                fontSize: "12px",
                                color: "#9A8C82"
                              }}
                            >
                              Thanks for your feedback!
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          {/* CONTACT SUPPORT SECTION */}
          <section style={{ marginTop: "28px" }}>
            <h2 className="support-heading">Contact Support</h2>

            <div className="support-grid">
              <div className="support-card" style={{ marginBottom: 0 }}>
                <Phone size={28} color="#C4956A" />
                <h3 style={{ marginTop: "12px", marginBottom: "6px" }}>Call Us</h3>
                <p>{supportSettings.phone}</p>
                <p style={{ fontSize: "12px", color: "#9A8C82", marginTop: "8px" }}>
                  {supportSettings.callDescription}
                </p>
              </div>

              <div className="support-card" style={{ marginBottom: 0 }}>
                <Mail size={28} color="#C4956A" />
                <h3 style={{ marginTop: "12px", marginBottom: "6px" }}>Email</h3>
                <p>{supportSettings.email}</p>
                <p style={{ fontSize: "12px", color: "#9A8C82", marginTop: "8px" }}>
                  {supportSettings.emailDescription}
                </p>
              </div>

              <div className="support-card" style={{ marginBottom: 0 }}>
                <MessageCircle size={28} color="#C4956A" />
                <h3 style={{ marginTop: "12px", marginBottom: "6px" }}>WhatsApp</h3>
                <p>{supportSettings.whatsapp}</p>
                <p style={{ fontSize: "12px", color: "#9A8C82", marginTop: "8px" }}>
                  {supportSettings.whatsappDescription}
                </p>
              </div>

              <div className="support-card" style={{ marginBottom: 0 }}>
                <Camera size={28} color="#C4956A" />
                <h3 style={{ marginTop: "12px", marginBottom: "6px" }}>Instagram</h3>
                <p>{supportSettings.instagram}</p>
                <p style={{ fontSize: "12px", color: "#9A8C82", marginTop: "8px" }}>
                  {supportSettings.instagramDescription}
                </p>
              </div>
            </div>
          </section>

          {/* BUSINESS HOURS SECTION */}
          <section style={{ marginTop: "28px" }}>
            <h2 className="support-heading">Business Hours</h2>

            <div className="support-card" style={{ marginBottom: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  marginBottom: "14px"
                }}
              >
                <Clock size={28} color="#C4956A" />
                <div>
                  <h3 style={{ margin: 0, color: "#2C221E" }}>{supportSettings.businessHoursTitle}</h3>
                  <p style={{ marginTop: "4px", color: "#9A8C82", fontSize: "13px" }}>
                    {supportSettings.businessHoursDescription}
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  color: "#2C221E"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #F2ECE5", paddingBottom: "10px" }}>
                  <span>Monday – Friday</span>
                  <strong>{supportSettings.mondayFriday}</strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #F2ECE5", paddingBottom: "10px" }}>
                  <span>Saturday</span>
                  <strong>{supportSettings.saturday}</strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Sunday</span>
                  <strong>{supportSettings.sunday}</strong>
                </div>
              </div>
            </div>
          </section>

          {/* SUPPORT POLICIES SECTION */}
          <section style={{ marginTop: "28px" }}>
            <h2 className="support-heading">
              📜 Support Policies
            </h2>

            <div
              style={{
                display: "flex",
                gap: "10px",
                overflowX: "auto",
                margin: "16px 0 20px"
              }}
            >
              {policyCategories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedPolicyCategory(category)}
                  className="support-btn support-btn-secondary"
                  style={{
                    background:
                      selectedPolicyCategory === category
                        ? "#C4956A"
                        : "#FAF6F0",
                    color:
                      selectedPolicyCategory === category
                        ? "#fff"
                        : "#2C221E",
                    whiteSpace: "nowrap"
                  }}
                >
                  {category}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", background: "#fff", border: "1px solid #E8DED2", borderRadius: "14px", padding: "12px 16px", marginBottom: "20px" }}>
              <Search size={18} color="#C4956A" />
              <input
                type="text"
                value={policySearch}
                onChange={(e) => setPolicySearch(e.target.value)}
                placeholder="Search policies..."
                style={{ flex: 1, border: "none", outline: "none", marginLeft: "10px", background: "transparent", fontSize: "14px" }}
              />
            </div>

            {filteredPolicies.length === 0 ? (
              <div className="support-card" style={{ textAlign: "center", padding: "35px" }}>
                <ShieldCheck size={42} color="#C4956A" />
                <h3 style={{ marginTop: "14px", color: "#2C221E" }}>
                  No policies found
                </h3>
                <p style={{ color: "#9A8C82" }}>
                  Try another keyword or category.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px"
                }}
              >
                {filteredPolicies.map((policy) => {
                  const relatedPolicies = policies
                    .filter((p) => p.id !== policy.id && p.category === policy.category)
                    .slice(0, 3);

                  return (
                    <div
                      id={`policy-${policy.id}`}
                      key={policy.id}
                      className="faq-card"
                    >
                      <button
                        className="faq-btn"
                        onClick={() =>
                          setOpenPolicy(
                            openPolicy === policy.id ? null : policy.id
                          )
                        }
                      >
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-start",
                            gap: "6px"
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 700,
                              color: "#2C221E"
                            }}
                          >
                            {policy.title}
                          </span>

                          <span
                            style={{
                              background: "#FAF6F0",
                              color: "#C4956A",
                              padding: "3px 10px",
                              borderRadius: "999px",
                              fontSize: "11px",
                              fontWeight: 600
                            }}
                          >
                            {policy.category}
                          </span>
                        </div>

                        {openPolicy === policy.id ? (
                          <ChevronUp size={18} />
                        ) : (
                          <ChevronDown size={18} />
                        )}
                      </button>

                      {openPolicy === policy.id && (
                        <div className="faq-answer">

                          <div
                            style={{
                              whiteSpace: "pre-wrap",
                              lineHeight: "1.8"
                            }}
                          >
                            {policy.content}
                          </div>

                          {relatedPolicies.length > 0 && (
                            <div
                              style={{
                                marginTop: "24px",
                                borderTop: "1px solid #E8DED2",
                                paddingTop: "18px"
                              }}
                            >
                              <div
                                style={{
                                  fontWeight: 600,
                                  color: "#2C221E",
                                  marginBottom: "12px"
                                }}
                              >
                                Related Policies
                              </div>

                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "10px"
                                }}
                              >
                                {relatedPolicies.map((related) => (
                                  <button
                                    key={related.id}
                                    onClick={() => {
                                      setOpenPolicy(related.id);
                                      setTimeout(() => {
                                        document
                                          .getElementById(`policy-${related.id}`)
                                          ?.scrollIntoView({ behavior: "smooth", block: "start" });
                                      }, 100);
                                    }}
                                    style={{
                                      background: "#FAF6F0",
                                      border: "1px solid #E8DED2",
                                      borderRadius: "10px",
                                      padding: "12px 14px",
                                      textAlign: "left",
                                      cursor: "pointer"
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontWeight: 600,
                                        color: "#2C221E"
                                      }}
                                    >
                                      {related.title}
                                    </div>

                                    <div
                                      style={{
                                        fontSize: "12px",
                                        color: "#9A8C82",
                                        marginTop: "4px"
                                      }}
                                    >
                                      {related.category}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <div
                            style={{
                              marginTop: "18px",
                              paddingTop: "14px",
                              borderTop: "1px solid #E8DED2",
                              fontSize: "12px",
                              color: "#9A8C82",
                              display: "flex",
                              justifyContent: "space-between"
                            }}
                          >
                            <span>
                              Category: {policy.category}
                            </span>

                            <span>
                              Updated by {policy.editedBy || "Admin"}
                            </span>
                          </div>

                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </div>
      )}

      {/* TICKET LIST VIEW */}
      {activePage === "list" && (
        <div className="support-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, color: "#2C221E", fontSize: "16px" }}>Your Support Requests</h3>
            <button onClick={() => setActivePage("create")} className="support-btn" style={{ padding: "6px 12px", fontSize: "13px" }}>
              <PlusCircle size={14} /> New Ticket
            </button>
          </div>

          {loadingTickets ? (
            <div style={{ textAlign: "center", padding: "30px", color: "#9A8C82" }}>Loading your tickets...</div>
          ) : tickets.length === 0 ? (
            <div style={{ background: "#FAF6F0", border: "1px dashed #E8DED2", borderRadius: "12px", padding: "30px", textAlign: "center", color: "#9A8C82" }}>
              You haven't created any support tickets yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {tickets.map((t) => (
                <div
                  key={t.id}
                  className="ticket-item"
                  style={{ marginBottom: 0 }}
                  onClick={() => {
                    setSelectedTicket(t);
                    setActivePage("conversation");
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontWeight: "600", color: "#2C221E", fontSize: "14px" }}>{t.subject}</span>
                      <span style={{ fontSize: "11px", color: "#9A8C82" }}>Ticket #CS{t.id.slice(-6).toUpperCase()}</span>
                    </div>
                    <span style={{ fontSize: "12px", color: "#6E5E53" }}>{t.lastMessage || "No messages yet"}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {t.customerUnread > 0 && (
                      <span style={{ background: "#D97706", color: "white", fontSize: "10px", padding: "2px 6px", borderRadius: "10px", fontWeight: "700" }}>
                        {t.customerUnread} Unread
                      </span>
                    )}
                    <span className={`badge ${t.status === "Closed" ? "badge-closed" : "badge-open"}`}>
                      {t.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE TICKET VIEW */}
      {activePage === "create" && (
        <div className="support-card">
          <h3 style={{ margin: "0 0 16px 0", color: "#2C221E", fontSize: "16px" }}>Create New Support Ticket</h3>
          <form onSubmit={handleCreateTicket} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#6E5E53" }}>Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ padding: "12px", border: "1px solid #E8DED2", borderRadius: "10px", background: "#FDFAF5", color: "#2C221E", outline: "none" }}
              >
                <option value="General">General Inquiry</option>
                <option value="Order">Order Issue</option>
                <option value="Account">Account & Login</option>
                <option value="Billing">Billing & Payment</option>
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#6E5E53" }}>Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of your issue"
                required
                style={{ padding: "12px", border: "1px solid #E8DED2", borderRadius: "10px", background: "#FDFAF5", color: "#2C221E", outline: "none" }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#6E5E53" }}>Message</label>
              <textarea
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
                placeholder="Describe your issue in detail..."
                required
                rows={5}
                style={{ padding: "12px", border: "1px solid #E8DED2", borderRadius: "10px", background: "#FDFAF5", color: "#2C221E", outline: "none", resize: "vertical" }}
              />
            </div>

            <button type="submit" className="support-btn" disabled={submitting} style={{ alignSelf: "flex-end" }}>
              {submitting ? "Submitting..." : "Submit Ticket"}
            </button>
          </form>
        </div>
      )}

      {/* CONVERSATION VIEW */}
      {activePage === "conversation" && selectedTicket && (
        <div className="support-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "#9A8C82", background: "#FAF6F0", padding: "10px 14px", borderRadius: "10px", border: "1px solid #E8DED2" }}>
            <div>
              <strong style={{ color: "#2C221E" }}>{selectedTicket.subject}</strong>
              <div style={{ fontSize: "11px", marginTop: "2px" }}>Ticket #CS{selectedTicket.id.slice(-6).toUpperCase()} • Category: {selectedTicket.category}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span className={`badge ${isClosed ? "badge-closed" : "badge-open"}`}>{selectedTicket.status}</span>
              <div style={{ fontSize: "11px", marginTop: "4px" }}>Priority: {selectedTicket.priority || "Normal"}</div>
            </div>
          </div>

          {loadingMessages ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#9A8C82" }}>Loading conversation...</div>
          ) : messages.length === 0 ? (
            <div style={{ background: "#FAF6F0", border: "1px dashed #E8DED2", borderRadius: "12px", padding: "30px", textAlign: "center", color: "#9A8C82" }}>
              👋 Your conversation with our support team will appear here once messages are sent.
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="conversation-box" ref={containerRef} onScroll={handleScroll}>
              {messages.map((msg) => {
                const isCustomer = msg.sender === "customer";
                return (
                  <div key={msg.id} className={`message-wrapper ${isCustomer ? "customer-message-wrapper" : "support-message-wrapper"}`}>
                    <span className="message-sender-label">
                      {isCustomer ? (
                        <>
                          You
                          <span className="avatar-badge" style={{ background: "#C4956A", color: "white" }}>Me</span>
                        </>
                      ) : (
                        <>
                          <span className="avatar-badge">☕</span>
                          Support Team
                        </>
                      )}
                    </span>
                    <div className={isCustomer ? "customer-msg" : "support-msg"}>
                      <p style={{ margin: 0 }}>{msg.message}</p>
                      <div style={{ marginTop: "6px", fontSize: "11px", opacity: 0.8, textAlign: isCustomer ? "right" : "left" }}>
                        {formatMessageTime(msg.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}

          {isClosed ? (
            <div style={{ background: "#FAF6F0", border: "1px solid #E8DED2", borderRadius: "12px", padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#6E5E53", fontSize: "14px" }}>
                <Lock size={18} />
                <div>
                  <strong>This ticket is closed.</strong>
                  <div style={{ fontSize: "12px", color: "#9A8C82" }}>New replies cannot be sent unless a new ticket is opened.</div>
                </div>
              </div>
              <button onClick={() => setActivePage("create")} className="support-btn" style={{ fontSize: "13px", padding: "8px 14px" }}>
                Create New Ticket
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message... (Press Enter to send)"
                disabled={sending}
                rows={3}
                style={{ width: "100%", padding: "12px", border: "1px solid #E8DED2", borderRadius: "12px", background: "#FDFAF5", outline: "none", color: "#2C221E", fontSize: "14px", resize: "vertical" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "#9A8C82" }}>Press Enter to send, Shift + Enter for new line</span>
                <button onClick={sendReply} className="support-btn" disabled={sending}>
                  <Send size={16} /> {sending ? "Sending..." : "Send Reply"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* POLICY VIEWER MODAL */}
      {showPolicyModal && selectedPolicy && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999, padding: "20px" }}>
          <div style={{ width: "100%", maxWidth: "700px", maxHeight: "85vh", overflowY: "auto", background: "#fff", borderRadius: "18px", padding: "28px", boxShadow: "0 25px 60px rgba(0,0,0,.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h2 style={{ margin: 0, color: "#2C221E" }}>
                  📄 {selectedPolicy.title}
                </h2>
                <div style={{ color: "#9A8C82", fontSize: "13px", marginTop: "6px" }}>
                  {selectedPolicy.category}
                </div>
              </div>
              <button className="support-btn support-btn-secondary" onClick={() => { setShowPolicyModal(false); setSelectedPolicy(null); }}>
                Close
              </button>
            </div>
            <div style={{ whiteSpace: "pre-wrap", lineHeight: "1.8", color: "#4B3B33", fontSize: "15px" }}>
              {selectedPolicy.content}
            </div>
            {selectedPolicy.editedAt && (
              <div style={{ marginTop: "24px", borderTop: "1px solid #E8DED2", paddingTop: "16px", fontSize: "13px", color: "#9A8C82" }}>
                Last updated{" "}
                {selectedPolicy.editedAt.toDate().toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
