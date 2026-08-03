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
import { Send, CheckCheck, Eye, Lock, Paperclip, FileText, Image as ImageIcon } from "lucide-react";

export default function SupportPage({ setPage}) {
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const containerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Smart auto-scroll: scroll if user is already near the bottom
  const scrollToBottom = (behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    // We can store this or handle condition in messages effect
  };

  // Mark messages as read for Admin when ticket opens
  useEffect(() => {
    if (!selectedTicket?.id) return;

    const markAsRead = async () => {
      try {
        if (selectedTicket.supportUnread > 0) {
          await updateDoc(doc(db, "supportTickets", selectedTicket.id), {
            supportUnread: 0
          });
        }
      } catch (err) {
        console.log("Error marking ticket as read for admin:", err);
      }
    };

    markAsRead();
  }, [selectedTicket?.id, selectedTicket?.supportUnread]);

  // Realtime messages listener for Admin
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
        console.log("Error listening to admin messages:", err);
      }
    );

    return () => unsubscribe();
  }, [selectedTicket?.id]);

  // Smart auto-scroll whenever messages change
  useEffect(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;

    // If it's the initial load or user was already near bottom, scroll down
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

  // Send support reply with validation & metadata updates
  const sendReply = async () => {
    if (!reply.trim() || sending || !selectedTicket?.id) return;

    try {
      setSending(true);

      // ✅ 1. Verify ticket still exists before sending
      const ticketRef = doc(db, "supportTickets", selectedTicket.id);
      const ticketSnap = await getDoc(ticketRef);

      if (!ticketSnap.exists()) {
        alert("This ticket no longer exists.");
        return;
      }

      // Add message to subcollection
      await addDoc(
        collection(db, "supportTickets", selectedTicket.id, "messages"),
        {
          sender: "support",
          senderName: "Support Team",
          message: reply,
          createdAt: serverTimestamp()
        }
      );

      // ✅ 10. Track reply metadata & unread counters on the parent ticket
      await updateDoc(ticketRef, {
        updatedAt: serverTimestamp(),
        customerUnread: increment(1),
        lastReplyBy: "support",
        lastMessage: reply,
        lastMessageAt: serverTimestamp()
      });

      setReply("");
    } catch (err) {
      console.log("Error sending admin reply:", err);
    } finally {
      setSending(false);
    }
  };

  // ✅ 2. Allow sending with Enter (excluding Shift+Enter)
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendReply();
    }
  };

  if (!selectedTicket) {
    return (
      <div
        style={{
          background: "#FAF6F0",
          border: "1px dashed #E8DED2",
          borderRadius: "14px",
          padding: "30px",
          textAlign: "center",
          color: "#9A8C82",
          fontStyle: "italic",
          fontSize: "14px"
        }}
      >
        Select a ticket to view the conversation.
      </div>
    );
  }

  const isClosed = selectedTicket.status === "Closed";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <style>{`
        .admin-conversation {
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-height: 400px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .admin-message-wrapper {
          display: flex;
          flex-direction: column;
          max-width: 75%;
        }

        /* In admin view, customer is left-aligned and support is right-aligned */
        .admin-customer-wrapper {
          align-self: flex-start;
          align-items: flex-start;
        }

        .admin-support-wrapper {
          align-self: flex-end;
          align-items: flex-end;
        }

        .admin-message-sender-label {
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

        .admin-customer-message {
          background: white;
          border: 1px solid #E8DED2;
          color: #2C221E;
          padding: 14px 18px;
          border-radius: 18px 18px 18px 4px;
          font-size: 14px;
          line-height: 1.5;
          box-shadow: 0 2px 10px rgba(44,34,30,0.02);
        }

        .admin-support-message {
          background: #C4956A;
          color: white;
          padding: 14px 18px;
          border-radius: 18px 18px 4px 18px;
          font-size: 14px;
          line-height: 1.5;
          box-shadow: 0 2px 10px rgba(196,149,106,0.15);
        }

        .admin-reply-box {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 10px;
        }

        .admin-reply-box textarea {
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

        .admin-reply-box textarea:focus {
          border-color: #C4956A;
          background: #FFFFFF;
        }

        .admin-reply-btn {
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

        .admin-reply-btn:hover {
          background: #b38259;
          transform: translateY(-1px);
        }

        .admin-reply-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .admin-empty-chat {
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

        .read-status-indicator {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: #9A8C82;
          margin-top: 4px;
          align-self: flex-end;
        }
      `}</style>

      {/* Header Info / Read Status Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "12px",
          color: "#9A8C82",
          background: "#FAF6F0",
          padding: "8px 12px",
          borderRadius: "10px"
        }}
      >
        <span>Ticket ID: {selectedTicket.id.slice(0, 8)}...</span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {selectedTicket.customerUnread > 0 ? (
            <>
              <span style={{ color: "#D97706", fontWeight: "600" }}>
                Unread by customer ({selectedTicket.customerUnread})
              </span>
            </>
          ) : (
            <>
              <Eye size={13} /> Seen by customer
            </>
          )}
        </span>
      </div>

      {messages.length > 0 ? (
        <div
          className="admin-conversation"
          ref={containerRef}
          onScroll={handleScroll}
        >
          {messages.map((msg) => {
            const isCustomer = msg.sender === "customer";
            return (
              <div
                key={msg.id}
                className={`admin-message-wrapper ${
                  isCustomer ? "admin-customer-wrapper" : "admin-support-wrapper"
                }`}
              >
                <span className="admin-message-sender-label">
                  {isCustomer ? (
                    <>
                      <span className="avatar-badge">
                        {msg.senderName ? msg.senderName[0].toUpperCase() : "C"}
                      </span>
                      {msg.senderName || "Customer"}
                    </>
                  ) : (
                    <>
                      <span
                        className="avatar-badge"
                        style={{ background: "#C4956A", color: "white" }}
                      >
                        ☕
                      </span>
                      Support Team
                    </>
                  )}
                </span>

                <div
                  className={
                    isCustomer
                      ? "admin-customer-message"
                      : "admin-support-message"
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
                            color: isCustomer ? "#2C221E" : "white",
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
                      opacity: isCustomer ? 1 : 0.8,
                      color: isCustomer ? "#9A8C82" : "inherit",
                      textAlign: isCustomer ? "left" : "right"
                    }}
                  >
                    {formatMessageTime(msg.createdAt)}
                  </div>
                </div>
              </div>
            );
          })}

          {/* ✅ 4. Sending / Typing Indicator */}
          {sending && (
            <div
              className="admin-message-wrapper admin-support-wrapper"
              style={{ opacity: 0.7 }}
            >
              <span className="admin-message-sender-label">
                <span
                  className="avatar-badge"
                  style={{ background: "#C4956A", color: "white" }}
                >
                  ☕
                </span>
                Support Team
              </span>
              <div className="admin-support-message">
                <p style={{ margin: 0, fontStyle: "italic" }}>Typing...</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      ) : (
        <div className="admin-empty-chat">
          No conversation messages yet.
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* ✅ 6. Handle closed tickets better */}
      {isClosed ? (
        <div className="closed-notice">
          <Lock size={18} />
          <div>
            <strong>This ticket is closed.</strong>
            <div style={{ fontSize: "12px", color: "#9A8C82" }}>
              New replies cannot be sent unless the ticket is reopened.
            </div>
          </div>
        </div>
      ) : (
        /* ADMIN REPLY BOX */
        <div className="admin-reply-box">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a support reply... (Press Enter to send)"
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
              className="admin-reply-btn"
              disabled={sending}
            >
              <Send size={16} />
              {sending ? "Sending..." : "Send Reply"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
