import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from "firebase/firestore";
import {
  ArrowLeft,
  Search,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  MessageCircle,
  Clock,
  ShieldCheck,
  Truck,
  Gift,
  CreditCard,
  Send,
  CheckCircle2,
  RefreshCw,
  Filter,
  ArrowRight,
  HelpCircle
} from "lucide-react";

export default function SupportPage({ setPage }) {

  const [search, setSearch] = useState("");
  const [openFaq, setOpenFaq] = useState(null);
  const [faqs, setFaqs] = useState([]);
  const [supportSettings, setSupportSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [ticket, setTicket] = useState({
    category: "Order Issue",
    orderId: "",
    subject: "",
    message: "",
    attachment: null
  });

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Phase 2.2 States
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [ticketSearch, setTicketSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const categories = [
    {
      title: "Orders",
      icon: Truck,
      description: "Track orders, cancellations and issues"
    },
    {
      title: "Payments",
      icon: CreditCard,
      description: "Payments, refunds and coupons"
    },
    {
      title: "Rewards",
      icon: Gift,
      description: "Points and loyalty questions"
    },
    {
      title: "Account",
      icon: ShieldCheck,
      description: "Profile and account help"
    }
  ];

  const ticketCategories = [
    "Order Issue",
    "Payment",
    "Refund",
    "Delivery",
    "Rewards",
    "Account",
    "Other"
  ];

  const statuses = [
    "All",
    "Open",
    "In Progress",
    "Waiting for Customer",
    "Resolved",
    "Closed"
  ];

  const policies = [
    {
      title:"Refund Policy",
      text:"Refunds are processed after verification and may take time depending on the payment provider."
    },
    {
      title:"Delivery Policy",
      text:"Delivery availability depends on location and operating hours."
    },
    {
      title:"Loyalty Policy",
      text:"Points and rewards follow Brewed loyalty rules and expiry settings."
    }
  ];

  const fetchTickets = async () => {
    try {
      setTicketsLoading(true);
      const user = auth.currentUser;
      if (!user) {
        setTickets([]);
        setTicketsLoading(false);
        return;
      }

      const q = query(
        collection(db, "supportTickets"),
        where("uid", "==", user.uid),
        orderBy("createdAt", "desc")
      );

      const querySnapshot = await getDocs(q);
      const fetchedTickets = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));

      setTickets(fetchedTickets);
    } catch (err) {
      console.log("Error fetching tickets:", err);
    } finally {
      setTicketsLoading(false);
    }
  };

  useEffect(()=>{
    const loadSupportData = async()=>{
      try{
        const faqSnap = await getDocs(
          collection(db,"faqs")
        );

        const faqData = faqSnap.docs
        .map(doc=>({
          id:doc.id,
          ...doc.data()
        }))
        .filter(faq=>faq.active);

        setFaqs(faqData);

        const settingsRef = doc(
          db,
          "supportSettings",
          "main"
        );

        const settingsSnap =
          await getDoc(settingsRef);

        if(settingsSnap.exists()){
          setSupportSettings(
            settingsSnap.data()
          );
        }

        await fetchTickets();
      }
      catch(error){
        console.log(
          "Support loading error:",
          error
        );
        setError(
          "Unable to load support information."
        );
      }
      finally{
        setLoading(false);
      }
    };

    loadSupportData();
  },[]);

  const submitTicket = async(e)=>{
    e.preventDefault();

    if (!ticket.subject || !ticket.message) {
      alert("Please fill in all required fields.");
      return;
    }

    try{
      setSubmitting(true);
      const user = auth.currentUser;

      const ticketNumber = `BRW-${Math.floor(100000 + Math.random() * 900000)}`;

      await addDoc(
        collection(db,"supportTickets"),
        {
          uid: user ? user.uid : "anonymous",
          customerName: user?.displayName || "Guest",
          email: user?.email || "",
          ticketNumber,
          ...ticket,
          status: "Open",
          priority: "Normal",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
      );

      setSuccess(true);
      setTicket({
        category: "Order Issue",
        orderId: "",
        subject: "",
        message: "",
        attachment: null
      });

      // Refresh tickets list
      await fetchTickets();

      setTimeout(() => {
        setSuccess(false);
      }, 5000);
    }
    catch(err){
      console.log(
        "Ticket error",
        err
      );
    }
    finally{
      setSubmitting(false);
    }
  };

  const filteredFaqs = faqs.filter((faq)=>
    faq.question.toLowerCase().includes(search.toLowerCase()) ||
    faq.answer.toLowerCase().includes(search.toLowerCase())
  );

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch = 
      (t.ticketNumber && t.ticketNumber.toLowerCase().includes(ticketSearch.toLowerCase())) ||
      (t.subject && t.subject.toLowerCase().includes(ticketSearch.toLowerCase())) ||
      (t.orderId && t.orderId.toLowerCase().includes(ticketSearch.toLowerCase()));

    const matchesStatus = statusFilter === "All" || t.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case "Open":
        return { background: "#E8F5E9", color: "#2E7D32", border: "1px solid #C8E6C9" };
      case "In Progress":
        return { background: "#FFF8E1", color: "#F57F17", border: "1px solid #FFE082" };
      case "Waiting for Customer":
        return { background: "#E3F2FD", color: "#1565C0", border: "1px solid #BBDEFB" };
      case "Resolved":
        return { background: "#E0F2F1", color: "#00695C", border: "1px solid #B2DFDB" };
      case "Closed":
        return { background: "#ECEFF1", color: "#37474F", border: "1px solid #CFD8DC" };
      default:
        return { background: "#F5F5F5", color: "#616161", border: "1px solid #E0E0E0" };
    }
  };

  const getStatusEmoji = (status) => {
    switch (status) {
      case "Open": return "🟢";
      case "In Progress": return "🟡";
      case "Waiting for Customer": return "🔵";
      case "Resolved": return "✅";
      case "Closed": return "⚫";
      default: return "⚪";
    }
  };

  if(loading){
    return(
      <div className="support-loader">
        <div className="coffee-loader">
          ☕
        </div>
        <p>
          Brewing support...
        </p>
      </div>
    )
  }

  if(error){
    return(
      <div className="support-loader">
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight:"100vh",
        background:"#FDFAF5",
        color:"#2C221E",
        paddingBottom:"40px"
      }}
    >
      <style>{`
        /* ==========================
           BREWED SUPPORT PAGE
        ========================== */

        .support-heading {
          font-family: "Playfair Display", serif;
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 18px;
          color: #2C221E;
        }

        /* GRID */
        .support-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
        }

        .tickets-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 18px;
        }

        /* CARDS */
        .support-card {
          background: #FFFFFF;
          border: 1px solid #E8DED2;
          border-radius: 22px;
          padding: 22px;
          transition: all .25s ease;
          cursor: pointer;
        }

        .support-card:hover {
          transform: translateY(-4px);
          border-color: #C4956A;
          box-shadow: 0 12px 30px rgba(44,34,30,0.08);
        }

        .support-card h3 {
          margin-top: 14px;
          font-size: 17px;
          font-weight: 700;
          color:#2C221E;
        }

        .support-card p {
          margin-top:8px;
          color:#6B5E55;
          font-size:14px;
          line-height:1.5;
        }

        .support-card a {
          color: inherit;
          text-decoration: none;
          display: block;
        }

        /* TICKET CARD */
        .ticket-card {
          background: #FFFFFF;
          border: 1px solid #E8DED2;
          border-radius: 20px;
          padding: 22px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: all .25s ease;
        }

        .ticket-card:hover {
          box-shadow: 0 8px 25px rgba(44,34,30,0.06);
          border-color: #C4956A;
        }

        .ticket-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .ticket-number {
          font-weight: 700;
          font-size: 16px;
          color: #2C221E;
        }

        .ticket-category-tag {
          font-size: 12px;
          color: #6B5E55;
          background: #FAF6F0;
          padding: 4px 10px;
          border-radius: 8px;
          display: inline-block;
          margin-bottom: 8px;
        }

        .ticket-status-badge {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .ticket-meta-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin: 15px 0;
          font-size: 13px;
          color: #6B5E55;
          background: #FDFAF5;
          padding: 12px;
          border-radius: 12px;
        }

        .ticket-meta-item span {
          display: block;
          font-size: 11px;
          color: #9A8C82;
          margin-bottom: 2px;
        }

        .ticket-action-row {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          margin-top: 10px;
          padding-top: 12px;
          border-top: 1px solid #F4EFE6;
        }

        .view-details-btn {
          background: transparent;
          border: none;
          color: #C4956A;
          font-weight: 600;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          padding: 0;
          transition: gap .2s;
        }

        .view-details-btn:hover {
          gap: 10px;
        }

        /* TICKET FORM */
        .ticket-form-card {
          background: #FFFFFF;
          border: 1px solid #E8DED2;
          border-radius: 22px;
          padding: 30px;
          box-shadow: 0 4px 20px rgba(44,34,30,0.03);
        }

        .form-group {
          margin-bottom: 18px;
        }

        .form-group label {
          display: block;
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 8px;
          color: #2C221E;
        }

        .form-control {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid #E8DED2;
          border-radius: 14px;
          background: #FDFAF5;
          outline: none;
          font-family: inherit;
          color: #2C221E;
          font-size: 14px;
          transition: border-color .2s;
        }

        .form-control:focus {
          border-color: #C4956A;
          background: #FFFFFF;
        }

        textarea.form-control {
          resize: vertical;
          min-height: 120px;
        }

        .submit-btn {
          background: #C4956A;
          color: white;
          border: none;
          border-radius: 14px;
          padding: 14px 24px;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          transition: background .2s, transform .2s;
        }

        .submit-btn:hover {
          background: #b38259;
          transform: translateY(-2px);
        }

        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .success-banner {
          background: #E8F5E9;
          border: 1px solid #C8E6C9;
          border-radius: 14px;
          padding: 16px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 12px;
          color: #2E7D32;
        }

        /* FAQ */
        .faq-card {
          background:white;
          border:1px solid #E8DED2;
          border-radius:18px;
          margin-bottom:12px;
          overflow:hidden;
          transition: .25s ease;
        }

        .faq-card:hover {
          box-shadow: 0 8px 25px rgba(44,34,30,.08);
        }

        .faq-card button {
          width:100%;
          padding:18px;
          display:flex;
          justify-content:space-between;
          align-items:center;
          background:white;
          border:none;
          cursor:pointer;
          font-weight:600;
          color:#2C221E;
        }

        .faq-card button:hover {
          background:#FAF6F0;
        }

        .faq-card p {
          padding:0 18px 18px;
          color:#6B5E55;
          font-size:14px;
          line-height:1.6;
          animation:faqOpen .25s ease;
        }

        @keyframes faqOpen {
          from{
            opacity:0;
            transform:translateY(-5px);
          }
          to{
            opacity:1;
            transform:translateY(0);
          }
        }

        /* LOADER */
        .support-loader {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          background: #FDFAF5;
          color: #6B5E55;
        }

        .coffee-loader {
          font-size: 45px;
          animation: bounce 1s infinite;
        }

        @keyframes bounce {
          50% {
            transform: translateY(-10px);
          }
        }

        /* EMPTY STATE */
        .empty-state {
          background: white;
          border: 1px solid #E8DED2;
          border-radius: 20px;
          padding: 35px;
          text-align: center;
          color: #6B5E55;
        }

        .empty-state h3 {
          color: #2C221E;
          margin-top: 10px;
        }

        /* HEADER */
        .support-header {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 20px;
        }

        /* INPUT */
        input::placeholder {
          color:#9A8C82;
        }

        /* MOBILE */
        @media(max-width:900px){
          .support-grid{
            grid-template-columns:repeat(2,1fr);
          }
          .tickets-grid{
            grid-template-columns:1fr;
          }
        }

        @media(max-width:600px){
          .support-grid{
            grid-template-columns:1fr;
          }

          .support-heading{
            font-size:21px;
          }

          h1{
            font-size:26px !important;
          }
        }
      `}</style>

      {/* HEADER */}
      <header className="support-header">
        <button onClick={()=>setPage("menu")}>
          <ArrowLeft />
        </button>

        <div>
          <h1
            style={{
              fontFamily:"Playfair Display",
              fontSize:"32px"
            }}
          >
            How can we help?
          </h1>

          <p style={{color:"#6B5E55"}}>
            Find answers or contact Brewed support.
          </p>
        </div>
      </header>

      {/* SEARCH */}
      <section style={{padding:"20px"}}>
        <div
          style={{
            background:"#fff",
            border:"1px solid #E8DED2",
            borderRadius:"16px",
            display:"flex",
            alignItems:"center",
            padding:"12px 16px"
          }}
        >
          <Search color="#C4956A"/>

          <input
            placeholder="Search FAQs..."
            value={search}
            onChange={(e)=>setSearch(e.target.value)}
            style={{
              border:"none",
              outline:"none",
              flex:1,
              marginLeft:"10px",
              background:"transparent"
            }}
          />
        </div>
      </section>

      {/* CATEGORIES */}
      <section style={{padding:"20px"}}>
        <h2 className="support-heading">
          Browse Help
        </h2>

        <div className="support-grid">
          {categories.map((item,index)=>{
            const Icon=item.icon;
            return(
              <div className="support-card" key={index}>
                <Icon size={28} color="#C4956A"/>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* FAQ */}
      <section style={{padding:"20px"}}>
        <h2 className="support-heading">
          Frequently Asked Questions
        </h2>

        {filteredFaqs.length > 0 ? (
          filteredFaqs.map((faq,index)=>(
            <div
              className="faq-card"
              key={faq.id || index}
            >
              <button
                onClick={()=>
                  setOpenFaq(
                    openFaq===index ? null:index
                  )
                }
              >
                <span>{faq.question}</span>
                {
                  openFaq===index
                  ? <ChevronUp/>
                  : <ChevronDown/>
                }
              </button>

              {
                openFaq===index &&
                <p>
                  {faq.answer}
                </p>
              }
            </div>
          ))
        ) : (
          <div className="empty-state">
            ❓
            <h3>No answers found</h3>
            <p>Try another search or contact Brewed support.</p>
          </div>
        )}
      </section>

      {/* MY TICKETS SECTION (PHASE 2.2) */}
      <section style={{padding:"20px"}}>
        <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px"}}>
          <h2 className="support-heading" style={{margin: 0}}>
            My Tickets
          </h2>
          <button 
            onClick={fetchTickets}
            style={{
              background: "white",
              border: "1px solid #E8DED2",
              borderRadius: "12px",
              padding: "8px 12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              color: "#6B5E55",
              fontSize: "13px",
              fontWeight: 600
            }}
          >
            <RefreshCw size={14} className={ticketsLoading ? "spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Search & Filter controls */}
        <div style={{display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap"}}>
          <div
            style={{
              background:"#fff",
              border:"1px solid #E8DED2",
              borderRadius:"14px",
              display:"flex",
              alignItems:"center",
              padding:"10px 14px",
              flex: 1,
              minWidth: "200px"
            }}
          >
            <Search size={16} color="#C4956A"/>
            <input
              placeholder="Search tickets by ID, subject, order..."
              value={ticketSearch}
              onChange={(e)=>setTicketSearch(e.target.value)}
              style={{
                border:"none",
                outline:"none",
                flex:1,
                marginLeft:"10px",
                background:"transparent",
                fontSize: "14px"
              }}
            />
          </div>

          <div
            style={{
              background:"#fff",
              border:"1px solid #E8DED2",
              borderRadius:"14px",
              display:"flex",
              alignItems:"center",
              padding:"10px 14px",
              minWidth: "160px"
            }}
          >
            <Filter size={16} color="#C4956A" style={{marginRight: "8px"}}/>
            <select
              value={statusFilter}
              onChange={(e)=>setStatusFilter(e.target.value)}
              style={{
                border:"none",
                outline:"none",
                background:"transparent",
                fontFamily: "inherit",
                fontSize: "14px",
                color: "#2C221E",
                width: "100%",
                cursor: "pointer"
              }}
            >
              {statuses.map((status, idx) => (
                <option key={idx} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tickets Grid or Empty State */}
        {ticketsLoading ? (
          <div className="empty-state" style={{padding: "25px"}}>
            <p>Loading your tickets...</p>
          </div>
        ) : filteredTickets.length > 0 ? (
          <div className="tickets-grid">
            {filteredTickets.map((t) => {
              const createdDate = t.createdAt?.toDate 
                ? t.createdAt.toDate().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : "Just now";
              const updatedDate = t.updatedAt?.toDate 
                ? t.updatedAt.toDate().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : "Just now";

              return (
                <div className="ticket-card" key={t.id}>
                  <div>
                    <div className="ticket-header-row">
                      <span className="ticket-number">Ticket #{t.ticketNumber || "BRW-000000"}</span>
                      <span className="ticket-status-badge" style={getStatusBadgeStyle(t.status)}>
                        {getStatusEmoji(t.status)} {t.status}
                      </span>
                    </div>

                    <span className="ticket-category-tag">{t.category}</span>
                    <h3 style={{fontSize: "16px", fontWeight: 700, margin: "6px 0 8px 0", color: "#2C221E"}}>{t.subject}</h3>
                    
                    <div className="ticket-meta-grid">
                      <div className="ticket-meta-item">
                        <span>Created</span>
                        {createdDate}
                      </div>
                      <div className="ticket-meta-item">
                        <span>Order ID</span>
                        {t.orderId || "None"}
                      </div>
                      <div className="ticket-meta-item" style={{gridColumn: "span 2", marginTop: "2px"}}>
                        <span>Last Updated</span>
                        {updatedDate}
                      </div>
                    </div>
                  </div>

                  <div className="ticket-action-row">
                    <button className="view-details-btn">
                      View Details <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <span style={{fontSize: "30px"}}>📭</span>
            <h3>No support tickets yet</h3>
            <p>Need help? Create your first support request below.</p>
          </div>
        )}
      </section>

      {/* CREATE SUPPORT TICKET */}
      <section style={{padding:"20px"}}>
        <h2 className="support-heading">
          Create Support Ticket
        </h2>

        <div className="ticket-form-card">
          {success && (
            <div className="success-banner">
              <CheckCircle2 size={24} />
              <div>
                <strong>Ticket created successfully</strong>
                <p style={{margin: "4px 0 0 0", fontSize: "13px"}}>Our team will review your request.</p>
              </div>
            </div>
          )}

          <form onSubmit={submitTicket}>
            <div className="form-group">
              <label>Category</label>
              <select
                className="form-control"
                value={ticket.category}
                onChange={(e) => setTicket({...ticket, category: e.target.value})}
              >
                {ticketCategories.map((cat, idx) => (
                  <option key={idx} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Order ID (optional)</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. BRW12345"
                value={ticket.orderId}
                onChange={(e) => setTicket({...ticket, orderId: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>Subject *</label>
              <input
                type="text"
                className="form-control"
                placeholder="Brief summary of your issue"
                value={ticket.subject}
                onChange={(e) => setTicket({...ticket, subject: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label>Message *</label>
              <textarea
                className="form-control"
                placeholder="Describe your issue in detail..."
                value={ticket.message}
                onChange={(e) => setTicket({...ticket, message: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label>Screenshot (optional)</label>
              <input
                type="file"
                className="form-control"
                style={{padding: "9px 16px"}}
                onChange={(e) => setTicket({...ticket, attachment: e.target.files[0]})}
              />
            </div>

            <button
              type="submit"
              className="submit-btn"
              disabled={submitting}
            >
              <Send size={18} />
              {submitting ? "Submitting..." : "Submit Ticket"}
            </button>
          </form>
        </div>
      </section>

      {/* CONTACT */}
      <section style={{padding:"20px"}}>
        <h2 className="support-heading">
          Contact Support
        </h2>

        <div className="support-grid">
          <div className="support-card">
            <a href={`tel:${supportSettings?.phone}`}>
              <Phone color="#C4956A"/>
              <h3>Call Us</h3>
              <p>
                {supportSettings?.phone || "Loading..."}
              </p>
            </a>
          </div>

          <div className="support-card">
            <a href={`mailto:${supportSettings?.email}`}>
              <Mail color="#C4956A"/>
              <h3>Email</h3>
              <p>
                {supportSettings?.email || "Loading..."}
              </p>
            </a>
          </div>

          <div className="support-card">
            <a href={`https://wa.me/${supportSettings?.whatsapp}`} target="_blank" rel="noopener noreferrer">
              <MessageCircle color="#C4956A"/>
              <h3>WhatsApp</h3>
              <p>
                {supportSettings?.whatsapp ? "Chat with us" : "Loading..."}
              </p>
            </a>
          </div>
        </div>
      </section>

      {/* HOURS */}
      <section style={{padding:"20px"}}>
        <div className="support-card">
          <Clock color="#C4956A"/>

          <h3>Business Hours</h3>

          <p>
            Monday:
            <br/>
            {supportSettings?.hours?.monday || "9 AM - 10 PM"}
          </p>
        </div>
      </section>

      {/* POLICIES */}
      <section style={{padding:"20px"}}>
        <h2 className="support-heading">
          Support Policies
        </h2>

        {policies.map((policy,index)=>(
          <div className="support-card" key={index}>
            <h3>{policy.title}</h3>
            <p>{policy.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
