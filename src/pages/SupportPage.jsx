import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  updateDoc,
  increment
} from "firebase/firestore";
import { Send, CheckCheck, Eye, Lock, FileText, UserCheck, MessageSquarePlus } from "lucide-react";

export default function SupportPage({ setPage  }) {
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [activePage, setActivePage] = useState("menu");

  const containerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Smart auto-scroll: scroll if user is already near the bottom
  const scrollToBottom = (behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
  };

  // Mark messages as read for Customer when ticket opens
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

  // Realtime messages listener for Customer
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

  // Smart auto-scroll whenever messages change
  useEffect(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;

    if (isNearBottom || messages.length <= 5) {
      scrollToBottom();
    }
  }, [messages]);

  // Format timestamps nicely (Today, Yesterday, or Date)
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

    if (isToday) {
      return `Today • ${timeString}`;
    } else if (isYesterday) {
      return `Yesterday • ${timeString}`;
    } else {
      const dateString = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric"
      });
      return `${dateString} • ${timeString}`;
    }
  };

  // Send customer reply with validation & metadata updates
  const sendReply = async () => {
    if (!reply.trim() || sending || !selectedTicket?.id) return;

    try {
      setSending(true);

      const ticketRef = doc(db, "supportTickets", selectedTicket.id);
      const ticketSnap = await getDoc(ticketRef);

      if (!ticketSnap.exists()) {
        alert("This ticket no longer exists.");
        return;
      }

      // Add message as customer to subcollection
      await addDoc(
        collection(db, "supportTickets", selectedTicket.id, "messages"),
        {
          sender: "customer",
          senderName: selectedTicket.customerName || "Customer",
          message: reply,
          createdAt: serverTimestamp()
        }
      );

      // Track reply metadata & increment support unread counter for admin
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

  // Allow sending with Enter (excluding Shift+Enter)
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendReply();
    }
  };

  // If no ticket is selected, display an inviting empty state instead of breaking or showing blank text
  if (!selectedTicket) {
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
        <h3 style={{ margin: "0 0 8px", color: "#2C221E", fontSize: "18px" }}>No Support Ticket Selected</h3>
        <p style={{ margin: "0 0 20px", fontSize: "14px", color: "#9A8C82", maxWidth: "400px", marginLeft: "auto", marginRight: "auto" }}>
          You don't have an active ticket open right now. Choose an existing ticket from your history or create a new one to chat with our support team.
        </p>
        {setActivePage && (
          <button
            onClick={() => setActivePage("new-ticket")} // Adjust string depending on your app's router
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
              gap: "8px",
              transition: "background .2s"
            }}
          >
            <MessageSquarePlus size={16} /> Create New Ticket
          </button>
        )}
      </div>
    );
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
          box-shadow: 0 2px 10px rgba(44,34,30,0.02);
        }

        .customer-user-message {
          background: #C4956A;
          color: white;
          padding: 14px 18px;
          border-radius: 18px 18px 4px 18px;
          font-size: 14px;
          line-height: 1.5;
          box-shadow: 0 2px 10px rgba(196,149,106,0.15);
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
          transition: border-color .2s;
        }

        .customer-reply-box textarea:focus {
          border-color: #C4956A;
          background: #FFFFFF;
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
          transition: background .2s, transform .2s;
        }

        .customer-reply-btn:hover {
          background: #b38259;
          transform: translateY(-1px);
        }

        .customer-reply-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .customer-empty-chat {
          background: #FAF6F0;
          border: 1px dashed #E8DED2;
          border-radius: 14px;
          padding: 20px;
          text-align: center;
          color: #9A8C82;
          font-style: italic;
          font-size: 14px;
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
          font-weight: 500;
        }
      `}</style>

      {/* Header Info / Read Status Bar & Staff Assignment */}
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
        <div
          className="customer-conversation"
          ref={containerRef}
          onScroll={handleScroll}
        >
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

                  {/* Render attachments if available */}
                  {msg.attachmentUrl && (
                    <div style={{ marginTop: "10px" }}>
                      {msg.attachmentType?.startsWith("image/") ? (
                        <a
                          href={msg.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img
                            src={msg.attachmentUrl}
                            alt="attachment"
                            style={{
                              maxWidth: "100%",
                              maxHeight: "160px",
                              borderRadius: "8px",
                              border: "1px solid rgba(0,0,0,0.1)"
                            }}
                          />
                        </a>
                      ) : (
                        <a
                          href={msg.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            color: isCustomer ? "white" : "#2C221E",
                            textDecoration: "underline",
                            fontSize: "13px"
                          }}
                        >
                          <FileText size={16} /> View Attachment
                        </a>
                      )}
                    </div>
                  )}

                  <div
                    style={{
                      marginTop: "8px",
                      fontSize: "11px",
                      opacity: 0.8,
                      color: isCustomer ? "inherit" : "#9A8C82",
                      textAlign: isCustomer ? "right" : "left"
                    }}
                  >
                    {formatMessageTime(msg.createdAt)}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Sending / Typing Indicator */}
          {sending && (
            <div
              className="customer-message-wrapper customer-user-wrapper"
              style={{ opacity: 0.7 }}
            >
              <span className="customer-message-sender-label">
                <span className="avatar-badge">You</span>
                You
              </span>
              <div className="customer-user-message">
                <p style={{ margin: 0, fontStyle: "italic" }}>Sending...</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      ) : (
        <div className="customer-empty-chat">
          No conversation messages yet.
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Handle closed tickets */}
      {isClosed ? (
        <div className="closed-notice">
          <Lock size={18} />
          <div>
            <strong>This ticket is closed.</strong>
            <div style={{ fontSize: "12px", color: "#9A8C82" }}>
              New replies cannot be sent unless reopened.
            </div>
          </div>
        </div>
      ) : (
        /* CUSTOMER REPLY BOX */
        <div className="customer-reply-box">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message to support... (Press Enter to send)"
            disabled={sending}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <span style={{ fontSize: "11px", color: "#9A8C82" }}>
              Press Enter to send, Shift + Enter for new line
            </span>
            <button
              onClick={sendReply}
              className="customer-reply-btn"
              disabled={sending}
            >
              <Send size={16} />
              {sending ? "Sending..." : "Send Message"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
