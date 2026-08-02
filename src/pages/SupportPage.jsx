import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import {
  doc,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  updateDoc,
  increment
} from "firebase/firestore";
import { Send } from "lucide-react";

export default function AdminTicketConversation({ selectedTicket }) {
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
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

  // Scroll whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send support reply with increment and lastReplyBy support
  const sendReply = async () => {
    if (!reply.trim() || sending || !selectedTicket?.id) return;

    try {
      setSending(true);

      await addDoc(
        collection(db, "supportTickets", selectedTicket.id, "messages"),
        {
          sender: "support",
          senderName: "Support Team",
          message: reply,
          createdAt: serverTimestamp()
        }
      );

      await updateDoc(doc(db, "supportTickets", selectedTicket.id), {
        updatedAt: serverTimestamp(),
        customerUnread: increment(1),
        lastReplyBy: "support"
      });

      setReply("");
    } catch (err) {
      console.log("Error sending admin reply:", err);
    } finally {
      setSending(false);
    }
  };

  // Message Timestamps Helper
  const formatMessageTime = (timestamp) => {
    if (!timestamp?.toDate) return "Sending...";

    return timestamp.toDate().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
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
          gap: 4px;
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
      `}</style>

      {messages.length > 0 ? (
        <div className="admin-conversation">
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
                  {isCustomer ? msg.senderName || "Customer" : "☕ Support Team"}
                </span>

                <div
                  className={
                    isCustomer
                      ? "admin-customer-message"
                      : "admin-support-message"
                  }
                >
                  <p style={{ margin: 0 }}>{msg.message}</p>

                  {isCustomer ? (
                    <div
                      style={{
                        marginTop: "8px",
                        fontSize: "11px",
                        color: "#9A8C82"
                      }}
                    >
                      {formatMessageTime(msg.createdAt)}
                    </div>
                  ) : (
                    <div
                      style={{
                        marginTop: "8px",
                        fontSize: "11px",
                        opacity: 0.8,
                        textAlign: "right"
                      }}
                    >
                      {formatMessageTime(msg.createdAt)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      ) : (
        <div className="admin-empty-chat">
          No conversation messages yet.
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* ADMIN REPLY BOX */}
      <div className="admin-reply-box">
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder={
            selectedTicket.status === "Closed"
              ? "This ticket is closed."
              : "Type a support reply..."
          }
          disabled={sending || selectedTicket.status === "Closed"}
        />

        <button
          onClick={sendReply}
          className="admin-reply-btn"
          disabled={sending || selectedTicket.status === "Closed"}
        >
          <Send size={16} />
          {sending ? "Sending..." : "Send Reply"}
        </button>
      </div>
    </div>
  );
}
