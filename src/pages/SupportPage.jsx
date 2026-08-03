import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  updateDoc,
  increment,
  doc
} from "firebase/firestore";
import { Send, CheckCheck, Eye, Lock, UserCheck, MessageSquarePlus } from "lucide-react";

export default function SupportPage({ setPage, setActivePage, selectedTicket: propSelectedTicket, setSelectedTicket }) {
  const [tickets, setTickets] = useState([]);
  const [internalSelectedTicket, setInternalSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const containerRef = useRef(null);
  const messagesEndRef = useRef(null);

  const selectedTicket = propSelectedTicket || internalSelectedTicket;

  // Real-time listener for tickets with loading safety
  useEffect(() => {
    try {
      const q = query(collection(db, "supportTickets"), orderBy("createdAt", "desc"));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const fetchedTickets = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setTickets(fetchedTickets);
          setLoading(false);

          if (!selectedTicket && fetchedTickets.length > 0) {
            if (setSelectedTicket) {
              setSelectedTicket(fetchedTickets[0]);
            } else {
              setInternalSelectedTicket(fetchedTickets[0]);
            }
          }
        },
        (err) => {
          console.log("Firestore permission or query error:", err);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.log("Error setting up ticket listener:", err);
      setLoading(false);
    }
  }, []);

  // Realtime messages listener
  useEffect(() => {
    if (!selectedTicket?.id) return;

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
        console.log("Error listening to customer messages:", err);
      }
    );

    return () => unsubscribe();
  }, [selectedTicket?.id]);

  const sendReply = async () => {
    if (!reply.trim() || sending || !selectedTicket?.id) return;

    try {
      setSending(true);
      const ticketRef = doc(db, "supportTickets", selectedTicket.id);

      await addDoc(
        collection(db, "supportTickets", selectedTicket.id, "messages"),
        {
          sender: "customer",
          senderName: selectedTicket.customerName || "Customer",
          message: reply,
          createdAt: serverTimestamp()
        }
      );

      await updateDoc(ticketRef, {
        updatedAt: serverTimestamp(),
        supportUnread: increment(1),
        lastReplyBy: "customer",
        lastMessage: reply,
        lastMessageAt: serverTimestamp()
      });

      setReply("");
    } catch (err) {
      console.log("Error sending customer reply:", err);
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

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#9A8C82", fontSize: "14px" }}>
        Loading support conversation...
      </div>
    );
  }

  if (!selectedTicket && tickets.length === 0) {
    return (
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E8DED2",
          borderRadius: "18px",
          padding: "40px 20px",
          textAlign: "center",
          color: "#6B5E55",
          boxShadow: "0 2px 10px rgba(44,34,30,0.02)"
        }}
      >
        <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎫</div>
        <h3 style={{ margin: "0 0 8px", color: "#2C221E", fontSize: "18px" }}>No Support Tickets</h3>
        <p style={{ margin: "0 0 20px", fontSize: "14px", color: "#9A8C82", maxWidth: "400px", marginLeft: "auto", marginRight: "auto" }}>
          You haven't created any support tickets yet. Click below to start a new conversation.
        </p>
        <button
          onClick={() => {
            if (setPage) setPage("new-ticket");
            if (setActivePage) setActivePage("new-ticket");
          }}
          style={{
            background: "#C4956A",
            color: "white",
            border: "none",
            borderRadius: "12px",
            padding: "10px 20px",
            fontWeight: "600",
            fontSize: "14px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <MessageSquarePlus size={16} /> Create New Ticket
        </button>
      </div>
    );
  }

  if (!selectedTicket) {
    return <div style={{ padding: "20px", textAlign: "center", color: "#9A8C82" }}>Please select a ticket.</div>;
  }

  const isClosed = selectedTicket.status === "Closed";
  const staffName = selectedTicket.assignedTo || "Support Team";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <style>{`
        .customer-conversation {
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-height: 400px;
          overflow-y: auto;
          padding-right: 4px;
        }
        .customer-message-wrapper {
          display: flex;
          flex-direction: column;
          max-width: 75%;
        }
        .customer-support-wrapper {
          align-self: flex-start;
          align-items: flex-start;
        }
        .customer-user-wrapper {
          align-self: flex-end;
          align-items: flex-end;
        }
        .customer-message-sender-label {
          font-size: 12px;
          color: #9A8C82;
          margin-bottom: 4px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .avatar-badge {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #E8DED2;
          color: #2C221E;
          font-size: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
        }
        .customer-support-message {
          background: white;
          border: 1px solid #E8DED2;
          color: #2C221E;
          padding: 14px 18px;
          border-radius: 18px 18px 18px 4px;
          font-size: 14px;
          line-height: 1.5;
        }
        .customer-user-message {
          background: #C4956A;
          color: white;
          padding: 14px 18px;
          border-radius: 18px 18px 4px 18px;
          font-size: 14px;
          line-height: 1.5;
        }
        .customer-reply-box {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 10px;
        }
        .customer-reply-box textarea {
          width: 100%;
          padding: 14px;
          border: 1px solid #E8DED2;
          border-radius: 14px;
          background: #FDFAF5;
          outline: none;
          font-family: inherit;
          color: #2C221E;
          font-size: 14px;
          resize: vertical;
          min-height: 80px;
        }
        .customer-reply-btn {
          background: #C4956A;
          color: white;
          border: none;
          border-radius: 14px;
          padding: 10px 18px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          align-self: flex-end;
        }
        .closed-notice {
          background: #FAF6F0;
          border: 1px solid #E8DED2;
          border-radius: 12px;
          padding: 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          color: #6E5E53;
          font-size: 14px;
        }
      `}</style>

      {tickets.length > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#FAF6F0", padding: "8px 12px", borderRadius: "10px" }}>
          <span style={{ fontSize: "12px", color: "#9A8C82", fontWeight: "600" }}>Switch Ticket:</span>
          <select 
            value={selectedTicket.id} 
            onChange={(e) => {
              const found = tickets.find(t => t.id === e.target.value);
              if (setSelectedTicket) setSelectedTicket(found);
              else setInternalSelectedTicket(found);
            }}
            style={{ padding: "4px 8px", borderRadius: "8px", border: "1px solid #E8DED2", background: "white", fontSize: "12px", outline: "none" }}
          >
            {tickets.map(t => (
              <option key={t.id} value={t.id}>
                {t.id.slice(0, 8)}... - {t.status}
              </option>
            ))}
          </select>
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "12px",
          color: "#9A8C82",
          background: "#FAF6F0",
          padding: "8px 12px",
          borderRadius: "10px",
          flexWrap: "wrap",
          gap: "8px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span>Ticket ID: {selectedTicket.id.slice(0, 8)}...</span>
          <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#6E5E53", fontWeight: "500" }}>
            <UserCheck size={13} /> Support Staff: {staffName}
          </span>
        </div>

        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {selectedTicket.supportUnread > 0 ? (
            <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#9A8C82" }}>
              Sent <CheckCheck size={14} />
            </span>
          ) : (
            <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#10B981", fontWeight: "500" }}>
              <Eye size={13} /> Seen by support
            </span>
          )}
        </span>
      </div>

      {messages.length > 0 ? (
        <div className="customer-conversation" ref={containerRef}>
          {messages.map((msg) => {
            const isCustomer = msg.sender === "customer";
            return (
              <div
                key={msg.id}
                className={`customer-message-wrapper ${
                  isCustomer ? "customer-user-wrapper" : "customer-support-wrapper"
                }`}
              >
                <span className="customer-message-sender-label">
                  {isCustomer ? (
                    <>
                      <span className="avatar-badge">You</span>
                      {msg.senderName || "You"}
                    </>
                  ) : (
                    <>
                      <span
                        className="avatar-badge"
                        style={{ background: "#C4956A", color: "white" }}
                      >
                        ☕
                      </span>
                      {msg.senderName || staffName}
                    </>
                  )}
                </span>

                <div
                  className={
                    isCustomer
                      ? "customer-user-message"
                      : "customer-support-message"
                  }
                >
                  <p style={{ margin: 0 }}>{msg.message}</p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      ) : (
        <div style={{ background: "#FAF6F0", border: "1px dashed #E8DED2", borderRadius: "14px", padding: "20px", textAlign: "center", color: "#9A8C82", fontSize: "14px" }}>
          No conversation messages yet.
          <div ref={messagesEndRef} />
        </div>
      )}

      {isClosed ? (
        <div className="closed-notice">
          <Lock size={18} />
          <div>
            <strong>This ticket is closed.</strong>
            <div style={{ fontSize: "12px", color: "#9A8C82" }}>New replies cannot be sent unless reopened.</div>
          </div>
        </div>
      ) : (
        <div className="customer-reply-box">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message to support... (Press Enter to send)"
            disabled={sending}
          />
          <button
            onClick={sendReply}
            className="customer-reply-btn"
            disabled={sending}
          >
            <Send size={16} />
            {sending ? "Sending..." : "Send Message"}
          </button>
        </div>
      )}
    </div>
  );
}
