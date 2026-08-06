Import React, { useState, useEffect, useRef } from "react";
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
  increment
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
  CreditCard,
  Package,
  HelpCircle,
  FileText,
  Clock3,
  ExternalLink,
  MessageSquare
} from "lucide-react";

// Map icon names from Firestore to Lucide components
const iconMap = { Truck, CreditCard, Gift, ShieldCheck, Package, HelpCircle };

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

  // Success Modal States
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdTicket, setCreatedTicket] = useState(null);

  // Help Categories state
  const [helpCategories, setHelpCategories] = useState([]);

  // Form states for creating a ticket
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("");
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

  // Support Policies state
  const [policies, setPolicies] = useState([]);
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

  // Load categories from Firestore (Moved up so it's ready for useEffect category sync)
  useEffect(() => {
    const q = query(
      collection(db, "supportHelpCategories"),
      where("active", "==", true)
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

  // Sync category default state when helpCategories load
  useEffect(() => {
    if (helpCategories.length > 0 && !helpCategories.some(c => c.title === category)) {
      setCategory(helpCategories[0].title);
    }
  }, [helpCategories]);

  // Fetch customer's tickets in real-time
  useEffect(() => {
    if (!currentUser?.uid) {
      setLoadingTickets(false);
      return;
    }

    setLoadingTickets(true);
    const q = query(
      collection(db, "supportTickets"),
      where("customerId", "==", currentUser.uid),
      orderBy("updatedAt", "desc")
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
      where("active", "==", true)
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

      // Using serverTimestamp() for the initial message document in the subcollection
      await addDoc(collection(db, "supportTickets", ticketRef.id, "messages"), {
        sender: "customer",
        senderName: currentUser.displayName || currentUser.email || "Customer",
        message: initialMessage.trim(),
        createdAt: serverTimestamp()
      });

      const snap = await getDoc(ticketRef);
      const newTicket = { id: ticketRef.id, ...snap.data() };
      setCreatedTicket(newTicket);
      setSelectedTicket(newTicket);
      
      setSubject("");
      setCategory(helpCategories.length > 0 ? helpCategories[0].title : "General");
      setInitialMessage("");
      setShowSuccessModal(true);
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

      // Using serverTimestamp() for the reply message document in the subcollection
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

  const getRelativeTime = (timestamp) => {
    if (!timestamp?.toDate) return "Recently";
    const date = timestamp.toDate();
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return `${Math.floor(interval)}y ago`;
    interval = seconds / 2592000;
    if (interval > 1) return `${Math.floor(interval)}mo ago`;
    interval = seconds / 86400;
    if (interval > 1) return `${Math.floor(interval)}d ago`;
    interval = seconds / 3600;
    if (interval > 1) return `${Math.floor(interval)}h ago`;
    interval = seconds / 60;
    if (interval > 1) return `${Math.floor(interval)}m ago`;
    return "Just now";
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

  const sortedTickets = [...tickets].sort((a, b) => { const aTime = a.updatedAt?.seconds || 0; const bTime = b.updatedAt?.seconds || 0; return bTime - aTime; });

  const recentTickets = [...sortedTickets].slice(0, 3);

  // Dynamic Open/Closed business check
  const checkIsBusinessOpen = () => {
    const now = new Date();
    const day = now.getDay(); // 0 is Sunday, 6 is Saturday
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTimeVal = hours * 60 + minutes;

    const parseTimeRange = (rangeStr) => {
      if (!rangeStr || rangeStr.toLowerCase().includes("closed")) return null;
      try {
        const parts = rangeStr.split("-");
        if (parts.length !== 2) return null;
        
        const parse12h = (str) => {
          const [time, modifier] = str.trim().split(" ");
          let [h, m] = time.split(":").map(Number);
          if (modifier?.toUpperCase() === "PM" && h < 12) h += 12;
          if (modifier?.toUpperCase() === "AM" && h === 12) h = 0;
          return h * 60 + (m || 0);
        };

        return { start: parse12h(parts[0]), end: parse12h(parts[1]) };
      } catch {
        return null;
      }
    };

    let todayRangeStr = "";
    if (day >= 1 && day <= 5) todayRangeStr = supportSettings.mondayFriday;
    else if (day === 6) todayRangeStr = supportSettings.saturday;
    else todayRangeStr = supportSettings.sunday;

    const range = parseTimeRange(todayRangeStr);
    if (!range) return false;
    return currentTimeVal >= range.start && currentTimeVal <= range.end;
  };

  const isBusinessOpen = checkIsBusinessOpen();

  const getStatusBadgeClass = (status) => {
    switch(status) {
      case "Open": return "badge-open";
      case "In Progress": return "badge-progress";
      case "Waiting for Customer": return "badge-waiting";
      case "Resolved": return "badge-resolved";
      case "Closed": return "badge-closed";
      default: return "badge-open";
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "840px", margin: "0 auto", fontFamily: "inherit" }}>
      <style>{`
        .support-container { display: flex; flex-direction: column; gap: 20px; }
        .support-card { background: white; border: 1px solid #E8DED2; border-radius: 16px; padding: 24px; box-shadow: 0 4px 20px rgba(44,34,30,0.03); margin-bottom: 16px; transition: all 0.2s ease; }
        .support-btn { background: #C4956A; color: white; border: none; border-radius: 12px; padding: 10px 18px; font-weight: 600; font-size: 14px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: background .2s, transform 0.1s; }
        .support-btn:hover { background: #b38259; }
        .support-btn:active { transform: scale(0.98); }
        .support-btn-secondary { background: #FAF6F0; color: #2C221E; border: 1px solid #E8DED2; }
        .support-btn-secondary:hover { background: #E8DED2; }
        .ticket-item { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border: 1px solid #E8DED2; border-radius: 14px; background: #FDFAF5; cursor: pointer; transition: all .2s; margin-bottom: 12px; }
        .ticket-item:hover { border-color: #C4956A; background: #FFFFFF; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(44,34,30,0.04); }
        
        .badge { font-size: 11px; padding: 5px 10px; border-radius: 8px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
        .badge-open { background: #FEF3C7; color: #D97706; border: 1px solid #FDE68A; }
        .badge-progress { background: #E0F2FE; color: #0284C7; border: 1px solid #BAE6FD; }
        .badge-waiting { background: #FEE2E2; color: #DC2626; border: 1px solid #FECACA; }
        .badge-resolved { background: #DCFCE7; color: #16A34A; border: 1px solid #BBF7D0; }
        .badge-closed { background: #F3F4F6; color: #4B5563; border: 1px solid #E5E7EB; }

        .conversation-box { display: flex; flex-direction: column; gap: 16px; max-height: 420px; overflow-y: auto; padding-right: 6px; }
        .message-wrapper { display: flex; flex-direction: column; max-width: 80%; }
        .customer-message-wrapper { align-self: flex-end; align-items: flex-end; }
        .support-message-wrapper { align-self: flex-start; align-items: flex-start; }
        .message-sender-label { font-size: 12px; color: #9A8C82; margin-bottom: 4px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
        .avatar-badge { width: 22px; height: 22px; border-radius: 50%; background: #E8DED2; color: #2C221E; font-size: 10px; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; }
        .customer-msg { background: #C4956A; color: white; padding: 14px 18px; border-radius: 18px 18px 4px 18px; font-size: 14px; line-height: 1.5; }
        .support-msg { background: white; border: 1px solid #E8DED2; color: #2C221E; padding: 14px 18px; border-radius: 18px 18px 18px 4px; font-size: 14px; line-height: 1.5; }
        
        .support-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
        .help-card { background: white; border: 1px solid #E8DED2; border-radius: 16px; padding: 20px; cursor: pointer; transition: all 0.2s ease; }
        .help-card:hover { transform: translateY(-2px); border-color: #C4956A; box-shadow: 0 6px 16px rgba(44,34,30,0.06); }
        .help-card h3 { margin: 12px 0 6px; color: #2C221E; font-size: 16px; }
        .help-card p { margin: 0; color: #9A8C82; font-size: 13px; line-height: 1.5; }
        
        .support-heading { font-size: 18px; color: #2C221E; margin-bottom: 14px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
        .faq-card { background: white; border: 1px solid #E8DED2; border-radius: 14px; margin-bottom: 12px; overflow: hidden; transition: border-color 0.2s; }
        .faq-card:hover { border-color: #D4B294; }
        .faq-btn { width: 100%; background: white; border: none; padding: 18px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; font-size: 14px; font-weight: 600; color: #2C221E; text-align: left; }
        .faq-btn:hover { background: #FAF6F0; }
        .faq-answer { padding: 0 18px 18px; color: #6E5E53; line-height: 1.6; font-size: 14px; }
        
        .contact-card-link { text-decoration: none; color: inherit; display: block; height: 100%; }
        .empty-state { background: #FAF6F0; border: 1px dashed #E8DED2; border-radius: 16px; padding: 40px 20px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; }
        .empty-state h3 { margin: 0; color: #2C221E; font-size: 16px; font-weight: 650; }
        .empty-state p { margin: 0; color: #9A8C82; font-size: 13px; max-width: 320px; line-height: 1.5; }
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
        </div>
      </div>

      {/* HOME PAGE VIEW */}
      {activePage === "home" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* HERO HEADER SECTION */}
          <div 
            style={{ 
              background: "#FFFFFF", 
              border: "1px solid #E8DED2", 
              borderRadius: "24px", 
              padding: "36px", 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center", 
              gap: "28px", 
              flexWrap: "wrap", 
              boxShadow: "0 8px 24px rgba(44,34,30,0.04)" 
            }}
          >
            <div style={{ flex: 1, minWidth: "260px" }}>
              <div 
                style={{ 
                  display: "inline-flex", 
                  alignItems: "center", 
                  gap: "8px", 
                  padding: "8px 14px", 
                  borderRadius: "999px", 
                  background: "#FAF6F0", 
                  color: "#C4956A", 
                  fontWeight: 600, 
                  fontSize: "12px", 
                  marginBottom: "18px" 
                }}
              >
                <LifeBuoy size={15} /> Customer Support
              </div>
              
              <h1 
                style={{ 
                  margin: 0, 
                  fontSize: "34px", 
                  fontWeight: 750, 
                  color: "#2C221E", 
                  letterSpacing: "-1px", 
                  lineHeight: 1.1 
                }}
              >
                How can we help?
              </h1>
              
              <p 
                style={{ 
                  marginTop: "14px", 
                  maxWidth: "520px", 
                  color: "#75685F", 
                  lineHeight: 1.7, 
                  fontSize: "15px" 
                }}
              >
                Search our knowledge base, browse help articles, or contact our support team whenever you need assistance.
              </p>
              
              <div style={{ display: "flex", gap: "12px", marginTop: "26px", flexWrap: "wrap" }}>
                <button className="support-btn" onClick={() => setActivePage("create")}>
                  <PlusCircle size={16} /> New Ticket
                </button>
                <button className="support-btn support-btn-secondary" onClick={() => setActivePage("list")}>
                  <MessageSquare size={16} /> My Tickets
                </button>
              </div>
            </div>
          </div>

          {/* SEARCH FAQS SECTION */}
          <section>
            <h2 className="support-heading">
              <Search size={20} color="#C4956A" /> Search FAQs
            </h2>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "white",
                border: "1px solid #E8DED2",
                borderRadius: "14px",
                padding: "14px 18px",
                boxShadow: "0 2px 8px rgba(44,34,30,0.02)"
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
                  marginLeft: "12px",
                  fontSize: "14px",
                  color: "#2C221E"
                }}
              />
            </div>

            {search.trim() !== "" && (
              <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {filteredFaqs.length === 0 ? (
                  <div className="empty-state" style={{ padding: "24px" }}>
                    <HelpCircle size={32} color="#C4956A" />
                    <h3>No matching FAQs found</h3>
                    <p>Try searching with another keyword or browse our help categories below.</p>
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
              <Package size={20} color="#C4956A" /> Browse Help Categories
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
                      size={26}
                      color="#C4956A"
                    />

                    <h3>{item.title}</h3>

                    <p>{item.description}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* SUPPORT TICKETS ACTION SECTION */}
          <section>
            <h2 className="support-heading">
              <MessageSquare size={20} color="#C4956A" /> Support Tickets
            </h2>
            <div className="support-grid">
              <div
                className="support-card"
                style={{ cursor: "pointer", padding: "22px", marginBottom: 0 }}
                onClick={() => setActivePage("create")}
              >
                <PlusCircle size={26} color="#C4956A" />
                <h3 style={{ margin: "12px 0 6px 0", color: "#2C221E", fontSize: "16px" }}>Create New Ticket</h3>
                <p style={{ margin: 0, color: "#9A8C82", fontSize: "13px", lineHeight: "1.4" }}>
                  Report an issue or ask our support team for help.
                </p>
              </div>

              <div
                className="support-card"
                style={{ cursor: "pointer", padding: "22px", marginBottom: 0 }}
                onClick={() => setActivePage("list")}
              >
                <LifeBuoy size={26} color="#C4956A" />
                <h3 style={{ margin: "12px 0 6px 0", color: "#2C221E", fontSize: "16px" }}>My Tickets</h3>
                <p style={{ margin: 0, color: "#9A8C82", fontSize: "13px", lineHeight: "1.4" }}>
                  View your support conversations and ticket status. ({tickets.length})
                </p>
              </div>
            </div>
          </section>

          {/* RECENT TICKETS SECTION */}
          <section>
            <h2 className="support-heading">
              <Clock3 size={20} color="#C4956A" /> Recent Tickets
            </h2>

            {loadingTickets ? (
              <div className="support-card" style={{ padding: "20px", textAlign: "center", color: "#9A8C82" }}>
                Loading recent tickets...
              </div>
            ) : recentTickets.length === 0 ? (
              <div className="empty-state">
                <MessageSquare size={36} color="#C4956A" />
                <h3>No recent tickets</h3>
                <p>When you create support requests, they will appear right here for quick tracking.</p>
                <button onClick={() => setActivePage("create")} className="support-btn" style={{ marginTop: "4px" }}>
                  <PlusCircle size={16} /> Create Ticket
                </button>
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
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontWeight: 650, color: "#2C221E", fontSize: "14px" }}>
                        {ticket.subject}
                      </span>
                      <span style={{ fontSize: "11px", color: "#9A8C82" }}>#BRW-{ticket.id.slice(-6).toUpperCase()}</span>
                    </div>

                    <div style={{ fontSize: "12px", color: "#9A8C82" }}>
                      {ticket.lastMessage || "No messages yet"} • Updated {getRelativeTime(ticket.updatedAt)}
                    </div>
                  </div>

                  <span className={`badge ${getStatusBadgeClass(ticket.status)}`}>
                    {ticket.status}
                  </span>
                </div>
              ))
            )}
          </section>

          {/* FREQUENTLY ASKED QUESTIONS SECTION */}
          <section>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h2 className="support-heading" style={{ margin: 0 }}>
                <HelpCircle size={20} color="#C4956A" /> Frequently Asked Questions {selectedCategory !== "All" && `(${selectedCategory})`}
              </h2>
              {selectedCategory !== "All" && (
                <button
                  className="support-btn support-btn-secondary"
                  onClick={() => setSelectedCategory("All")}
                  style={{ padding: "6px 12px", fontSize: "12px" }}
                >
                  Show All FAQs
                </button>
              )}
            </div>

            <div>
              {featuredFaq && search.trim() === "" && selectedCategory === "All" && (
                <div className="support-card" style={{ background: "linear-gradient(135deg, #FFFDF9 0%, #FFF8E8 100%)", border: "1px solid #F4D27A", marginBottom: "16px" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#B8860B", fontWeight: 700, fontSize: "12px", marginBottom: "8px", background: "#FEF3C7", padding: "3px 10px", borderRadius: "999px" }}>
                    ⭐ Featured FAQ
                  </div>
                  <h3 style={{ marginTop: 0, color: "#2C221E", fontSize: "16px" }}>
                    {featuredFaq.question}
                  </h3>
                  <p style={{ color: "#6E5E53", whiteSpace: "pre-wrap", fontSize: "14px", margin: 0, lineHeight: "1.6" }}>
                    {featuredFaq.answer}
                  </p>
                </div>
              )}

              {regularFaqs.length === 0 ? (
                <div className="empty-state">
                  <HelpCircle size={36} color="#C4956A" />
                  <h3>No FAQs found</h3>
                  <p>There are no FAQs available matching your current category selection.</p>
                </div>
              ) : (
                regularFaqs.map((faq, index) => (
                  <div key={index} className="faq-card">
                    <div style={{ display: "inline-block", background: "#FAF6F0", color: "#C4956A", padding: "3px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: "600", margin: "14px 18px 0" }}>
                      {faq.category || "General"}
                    </div>
                    <button className="faq-btn" onClick={() => openFAQ(faq, index)}>
                      <span>{faq.question}</span>
                      {openFaq === index ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>

                    {openFaq === index && (
                      <div className="faq-answer">
                        <div style={{ whiteSpace: "pre-wrap" }}>
                          {faq.answer}
                        </div>

                        <div style={{ marginTop: "18px", paddingTop: "14px", borderTop: "1px solid #E8DED2" }}>
                          <div style={{ fontSize: "13px", color: "#6E5E53", marginBottom: "10px" }}>
                            Was this helpful?
                          </div>
                          <div style={{ display: "flex", gap: "10px" }}>
                            <button disabled={faqVotes[faq.id]} onClick={() => voteFAQ(faq.id, "helpful")} className="support-btn support-btn-secondary">
                              👍 Yes
                            </button>
                            <button disabled={faqVotes[faq.id]} onClick={() => voteFAQ(faq.id, "notHelpful")} className="support-btn support-btn-secondary">
                              👎 No
                            </button>
                          </div>
                          {faqVotes[faq.id] && (
                            <div style={{ marginTop: "10px", fontSize: "12px", color: "#9A8C82" }}>
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
          <section>
            <h2 className="support-heading">
              <Phone size={20} color="#C4956A" /> Contact Support
            </h2>

            <div className="support-grid">
              {/* Call Us */}
              <div className="support-card" style={{ marginBottom: 0, padding: 0 }}>
                <a href={`tel:${supportSettings.phone}`} className="contact-card-link" style={{ padding: "22px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Phone size={26} color="#C4956A" />
                    <ExternalLink size={16} color="#B5A69B" />
                  </div>
                  <h3 style={{ marginTop: "14px", marginBottom: "4px", color: "#2C221E", fontSize: "16px" }}>Call Us</h3>
                  <p style={{ fontWeight: 600, color: "#C4956A", fontSize: "15px" }}>{supportSettings.phone || "Not available"}</p>
                  <p style={{ fontSize: "12px", color: "#9A8C82", marginTop: "6px", lineHeight: "1.4" }}>
                    {supportSettings.callDescription || "Direct telephone support line."}
                  </p>
                </a>
              </div>

              {/* Email */}
              <div className="support-card" style={{ marginBottom: 0, padding: 0 }}>
                <a href={`mailto:${supportSettings.email}`} className="contact-card-link" style={{ padding: "22px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Mail size={26} color="#C4956A" />
                    <ExternalLink size={16} color="#B5A69B" />
                  </div>
                  <h3 style={{ marginTop: "14px", marginBottom: "4px", color: "#2C221E", fontSize: "16px" }}>Email</h3>
                  <p style={{ fontWeight: 600, color: "#C4956A", fontSize: "15px", wordBreak: "break-all" }}>{supportSettings.email || "Not available"}</p>
                  <p style={{ fontSize: "12px", color: "#9A8C82", marginTop: "6px", lineHeight: "1.4" }}>
                    {supportSettings.emailDescription || "Send us an email anytime."}
                  </p>
                </a>
              </div>

              {/* WhatsApp */}
              <div className="support-card" style={{ marginBottom: 0, padding: 0 }}>
                <a href={`https://wa.me/${supportSettings.whatsapp?.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="contact-card-link" style={{ padding: "22px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <MessageCircle size={26} color="#C4956A" />
                    <ExternalLink size={16} color="#B5A69B" />
                  </div>
                  <h3 style={{ marginTop: "14px", marginBottom: "4px", color: "#2C221E", fontSize: "16px" }}>WhatsApp</h3>
                  <p style={{ fontWeight: 600, color: "#C4956A", fontSize: "15px" }}>{supportSettings.whatsapp || "Not available"}</p>
                  <p style={{ fontSize: "12px", color: "#9A8C82", marginTop: "6px", lineHeight: "1.4" }}>
                    {supportSettings.whatsappDescription || "Chat instantly via WhatsApp."}
                  </p>
                </a>
              </div>

              {/* Instagram */}
              <div className="support-card" style={{ marginBottom: 0, padding: 0 }}>
                <a href={`https://instagram.com/${supportSettings.instagram?.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="contact-card-link" style={{ padding: "22px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Camera size={26} color="#C4956A" />
                    <ExternalLink size={16} color="#B5A69B" />
                  </div>
                  <h3 style={{ marginTop: "14px", marginBottom: "4px", color: "#2C221E", fontSize: "16px" }}>Instagram</h3>
                  <p style={{ fontWeight: 600, color: "#C4956A", fontSize: "15px" }}>{supportSettings.instagram || "Not available"}</p>
                  <p style={{ fontSize: "12px", color: "#9A8C82", marginTop: "6px", lineHeight: "1.4" }}>
                    {supportSettings.instagramDescription || "Follow our profile for updates."}
                  </p>
                </a>
              </div>
            </div>
          </section>

          {/* BUSINESS HOURS SECTION */}
          <section>
            <h2 className="support-heading">
              <Clock size={20} color="#C4956A" /> Business Hours
            </h2>

            <div className="support-card" style={{ marginBottom: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", paddingBottom: "14px", borderBottom: "1px solid #F2ECE5", flexWrap: "wrap", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <Clock size={24} color="#C4956A" />
                  <div>
                    <h3 style={{ margin: 0, color: "#2C221E", fontSize: "16px" }}>{supportSettings.businessHoursTitle || "Operating Hours"}</h3>
                    <p style={{ margin: "2px 0 0 0", color: "#9A8C82", fontSize: "13px" }}>
                      {supportSettings.businessHoursDescription || "Our team is available during the hours below."}
                    </p>
                  </div>
                </div>

                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: isBusinessOpen ? "#DCFCE7" : "#FEE2E2", color: isBusinessOpen ? "#16A34A" : "#DC2626", padding: "6px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: "700" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: isBusinessOpen ? "#16A34A" : "#DC2626", display: "inline-block" }}></span>
                  {isBusinessOpen ? "Open Now" : "Closed Now"}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", color: "#2C221E" }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #F2ECE5", paddingBottom: "10px", fontSize: "14px" }}>
                  <span>Monday – Friday</span>
                  <strong>{supportSettings.mondayFriday || "Closed"}</strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #F2ECE5", paddingBottom: "10px", fontSize: "14px" }}>
                  <span>Saturday</span>
                  <strong>{supportSettings.saturday || "Closed"}</strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                  <span>Sunday</span>
                  <strong>{supportSettings.sunday || "Closed"}</strong>
                </div>
              </div>
            </div>
          </section>

          {/* SUPPORT POLICIES SECTION */}
          <section>
            <h2 className="support-heading">
              <FileText size={20} color="#C4956A" /> Support Policies
            </h2>

            <div style={{ display: "flex", gap: "8px", overflowX: "auto", margin: "14px 0 16px", paddingBottom: "4px" }}>
              {policyCategories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedPolicyCategory(category)}
                  className="support-btn support-btn-secondary"
                  style={{
                    background: selectedPolicyCategory === category ? "#C4956A" : "#FAF6F0",
                    color: selectedPolicyCategory === category ? "#fff" : "#2C221E",
                    whiteSpace: "nowrap"
                  }}
                >
                  {category}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", background: "#fff", border: "1px solid #E8DED2", borderRadius: "14px", padding: "12px 16px", marginBottom: "16px" }}>
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
              <div className="empty-state">
                <ShieldCheck size={36} color="#C4956A" />
                <h3>No policies found</h3>
                <p>Try searching with another keyword or category.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {filteredPolicies.map((policy) => {
                  const relatedPolicies = policies
                    .filter((p) => p.id !== policy.id && p.category === policy.category)
                    .slice(0, 3);

                  return (
                    <div id={`policy-${policy.id}`} key={policy.id} className="faq-card">
                      <button className="faq-btn" onClick={() => setOpenPolicy(openPolicy === policy.id ? null : policy.id)}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "6px" }}>
                          <span style={{ fontWeight: 700, color: "#2C221E", fontSize: "15px" }}>
                            {policy.title}
                          </span>
                          <span style={{ background: "#FAF6F0", color: "#C4956A", padding: "2px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: 600 }}>
                            {policy.category}
                          </span>
                        </div>
                        {openPolicy === policy.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>

                      {openPolicy === policy.id && (
                        <div className="faq-answer">
                          <div style={{ whiteSpace: "pre-wrap", lineHeight: "1.8" }}>
                            {policy.content}
                          </div>

                          {relatedPolicies.length > 0 && (
                            <div style={{ marginTop: "20px", borderTop: "1px solid #E8DED2", paddingTop: "16px" }}>
                              <div style={{ fontWeight: 650, color: "#2C221E", marginBottom: "10px", fontSize: "13px" }}>
                                Related Policies
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {relatedPolicies.map((related) => (
                                  <button
                                    key={related.id}
                                    onClick={() => {
                                      setOpenPolicy(related.id);
                                      setTimeout(() => {
                                        document.getElementById(`policy-${related.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                                      }, 100);
                                    }}
                                    style={{ background: "#FAF6F0", border: "1px solid #E8DED2", borderRadius: "10px", padding: "10px 14px", textAlign: "left", cursor: "pointer" }}
                                  >
                                    <div style={{ fontWeight: 600, color: "#2C221E", fontSize: "13px" }}>{related.title}</div>
                                    <div style={{ fontSize: "11px", color: "#9A8C82", marginTop: "2px" }}>{related.category}</div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid #E8DED2", fontSize: "12px", color: "#9A8C82", display: "flex", justifyContent: "space-between" }}>
                            <span>Category: {policy.category}</span>
                            <span>Updated by {policy.editedBy || "Admin"}</span>
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
            <h3 style={{ margin: 0, color: "#2C221E", fontSize: "18px", fontWeight: "700" }}>Your Support Requests</h3>
            <button onClick={() => setActivePage("create")} className="support-btn" style={{ padding: "6px 12px", fontSize: "13px" }}>
              <PlusCircle size={14} /> New Ticket
            </button>
          </div>

          {loadingTickets ? (
            <div style={{ textAlign: "center", padding: "30px", color: "#9A8C82" }}>Loading your tickets...</div>
          ) : sortedTickets.length === 0 ? (
            <div className="empty-state">
              <MessageSquare size={36} color="#C4956A" />
              <h3>No support tickets yet</h3>
              <p>You haven't created any support tickets. Start a new ticket if you need assistance.</p>
              <button onClick={() => setActivePage("create")} className="support-btn" style={{ marginTop: "4px" }}>
                <PlusCircle size={16} /> Create Ticket
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {sortedTickets.map((t) => (
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
                      <span style={{ fontWeight: "650", color: "#2C221E", fontSize: "14px" }}>{t.subject}</span>
                      <span style={{ fontSize: "11px", color: "#9A8C82" }}>#BRW-{t.id.slice(-6).toUpperCase()}</span>
                    </div>
                    <span style={{ fontSize: "12px", color: "#6E5E53" }}>{t.lastMessage || "No messages yet"}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {t.customerUnread > 0 && (
                      <span style={{ background: "#D97706", color: "white", fontSize: "10px", padding: "2px 6px", borderRadius: "10px", fontWeight: "700" }}>
                        {t.customerUnread} Unread
                      </span>
                    )}
                    <span className={`badge ${getStatusBadgeClass(t.status)}`}>
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
          <h3 style={{ margin: "0 0 16px 0", color: "#2C221E", fontSize: "18px", fontWeight: "700" }}>Create New Support Ticket</h3>
          <form onSubmit={handleCreateTicket} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#6E5E53" }}>Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                style={{ padding: "12px", border: "1px solid #E8DED2", borderRadius: "10px", background: "#FDFAF5", color: "#2C221E", outline: "none", fontSize: "14px" }}
              >
                {helpCategories.length > 0 ? (
                  helpCategories.map((item) => (
                    <option key={item.id} value={item.title}>
                      {item.title}
                    </option>
                  ))
                ) : (
                  <option value="" disabled> No categories available </option>
                )}
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
                style={{ padding: "12px", border: "1px solid #E8DED2", borderRadius: "10px", background: "#FDFAF5", color: "#2C221E", outline: "none", fontSize: "14px" }}
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
                style={{ padding: "12px", border: "1px solid #E8DED2", borderRadius: "10px", background: "#FDFAF5", color: "#2C221E", outline: "none", resize: "vertical", fontSize: "14px" }}
              />
            </div>

            <button type="submit" className="support-btn" disabled={submitting || helpCategories.length === 0} style={{ alignSelf: "flex-end" }}>
              {submitting ? "Submitting..." : helpCategories.length === 0 ? "No Categories Available" : "Submit Ticket"}
            </button>
          </form>
        </div>
      )}

      {/* CONVERSATION VIEW */}
      {activePage === "conversation" && selectedTicket && (
        <div className="support-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "#9A8C82", background: "#FAF6F0", padding: "12px 16px", borderRadius: "12px", border: "1px solid #E8DED2", flexWrap: "wrap", gap: "8px" }}>
            <div>
              <strong style={{ color: "#2C221E", fontSize: "14px" }}>{selectedTicket.subject}</strong>
              <div style={{ fontSize: "11px", marginTop: "2px" }}>Ticket #BRW-{selectedTicket.id.slice(-6).toUpperCase()} • Category: {selectedTicket.category}</div>
            </div>
            <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: "8px" }}>
              <span className={`badge ${getStatusBadgeClass(selectedTicket.status)}`}>{selectedTicket.status}</span>
            </div>
          </div>

          {loadingMessages ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#9A8C82" }}>Loading conversation...</div>
          ) : messages.length === 0 ? (
            <div className="empty-state">
              <MessageSquare size={36} color="#C4956A" />
              <h3>No messages yet</h3>
              <p>Your conversation with our support team will appear here once messages are sent.</p>
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
            <div style={{ background: "#FAF6F0", border: "1px solid #E8DED2", borderRadius: "12px", padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                <span style={{ fontSize: "11px", color: "#9A8C82" }}>Press Enter to send, Shift + Enter for new line</span>
                <button onClick={sendReply} className="support-btn" disabled={sending}>
                  <Send size={16} /> {sending ? "Sending..." : "Send Reply"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUCCESS MODAL */}
      {showSuccessModal && createdTicket && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 }}>
          <div style={{ width: "420px", maxWidth: "92%", background: "#fff", borderRadius: "20px", padding: "32px", textAlign: "center", border: "1px solid #E8DED2", boxShadow: "0 20px 60px rgba(0,0,0,.15)" }}>
            <div style={{ width: 70, height: 70, margin: "0 auto 20px", borderRadius: "50%", background: "#F4F8F2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34 }}>
              ✅
            </div>
            <h2 style={{ margin: 0, color: "#2C221E", fontSize: "24px", fontWeight: 700 }}>
              Ticket Submitted
            </h2>
            <p style={{ marginTop: "14px", color: "#6E5E53", lineHeight: 1.6 }}>
              Your support request has been received successfully.
            </p>
            <div style={{ marginTop: "22px", padding: "14px", background: "#FAF6F0", borderRadius: "12px", fontWeight: 700, color: "#C4956A", fontSize: "17px" }}>
              Ticket ID
              <div style={{ marginTop: "6px", color: "#2C221E", letterSpacing: 1 }}>
                BRW-{createdTicket.id.slice(-6).toUpperCase()}
              </div>
            </div>
            <div style={{ display: "flex", gap: "12px", marginTop: "28px" }}>
              <button 
                className="support-btn support-btn-secondary" 
                style={{ flex: 1 }} 
                onClick={() => { 
                  setShowSuccessModal(false); 
                  setActivePage("home"); 
                }}
              >
                Back Home
              </button>
              <button 
                className="support-btn" 
                style={{ flex: 1 }} 
                onClick={() => { 
                  setShowSuccessModal(false);
                  setSelectedTicket(createdTicket);
                  setActivePage("conversation"); 
                }}
              >
                View Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
