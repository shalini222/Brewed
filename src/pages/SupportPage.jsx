import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
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
  increment,
  where,
  getDocs
} from "firebase/firestore";
import { Send, CheckCheck, Eye, Lock, FileText, UserCheck, MessageSquarePlus, ArrowLeft, Ticket } from "lucide-react";

export default function SupportPage() {
  const { currentUser } = useAuth();
  
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [activePage, setActivePage] = useState("menu");

  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [submittingTicket, setSubmittingTicket] = useState(false);

  const [myTickets, setMyTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  const containerRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = (behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
  };

  useEffect(() => {
    if (activePage !== "tickets") return;

    const fetchTickets = async () => {
      setLoadingTickets(true);
      try {
        const userId = currentUser?.uid || "anonymous_user";
        const q = query(
          collection(db, "supportTickets"),
          where("customerId", "==", userId),
          orderBy("updatedAt", "desc")
        );
        const snapshot = await getDocs(q);
        setMyTickets(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
          }))
        );
      } catch (err) {
        console.log("Error fetching user tickets:", err);
      } finally {
        setLoadingTickets(false);
      }
    };

    fetchTickets();
  }, [activePage, currentUser]);

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

  useEffect(() => {
    if (!selectedTicket?.id || activePage !== "conversation") return;

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
  }, [selectedTicket?.id, activePage]);

  useEffect(() => {
    if (!containerRef.current || activePage !== "conversation") return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;

    if (isNearBottom || messages.length <= 5) {
      scrollToBottom();
    }
  }, [messages, activePage]);

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

      await addDoc(
        collection(db, "supportTickets", selectedTicket.id, "messages"),
        {
          sender: "customer",
          senderName: selectedTicket.customerName || currentUser?.displayName || "Customer",
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

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!newSubject.trim() || !newMessage.trim() || submittingTicket) return;

    try {
      setSubmittingTicket(true);
      const userId = currentUser?.uid || "anonymous_user";
      const customerName = currentUser?.displayName || "Valued Customer";

      const ticketData = {
        subject: newSubject,
        customerId: userId,
        customerName: customerName,
        status: "Open",
        assignedTo: "Unassigned",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        supportUnread: 0,
        customerUnread: 0,
        lastReplyBy: "customer",
        lastMessage: newMessage,
        lastMessageAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, "supportTickets"), ticketData);

      await addDoc(collection(db, "supportTickets", docRef.id, "messages"), {
        sender: "customer",
        senderName: customerName,
        message: newMessage,
        createdAt: serverTimestamp()
      });

      setNewSubject("");
      setNewMessage("");
      setSelectedTicket({ id: docRef.id, ...ticketData });
      setActivePage("conversation");
    } catch (err) {
      console.log("Error creating ticket:", err);
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendReply();
    }
  };

  if (activePage === "menu") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E8DED2",
            borderRadius: "18px",
            padding: "30px 20px",
            textAlign: "center",
            color: "#6B5E55",
            boxShadow: "0 2px 10px rgba(44,34,30,0.02)"
          }}
        >
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎧</div>
          <h3 style={{ margin: "0 0 8px", color: "#2C221E", fontSize: "20px" }}>How can we help you today?</h3>
          <p style={{ margin: "0 0 24px", fontSize: "14px", color: "#9A8C82", maxWidth: "420px", marginLeft: "auto", marginRight: "auto" }}>
            Reach out to our support team with questions, feedback, or issues. We're always here to assist you.
          </p>

          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => setActivePage("new-ticket")}
              style={{
                background: "#C4956A",
                color: "white",
                border: "none",
                borderRadius: "12px",
                padding: "12px 20px",
                fontWeight: "600",
                fontSize: "14px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                transition: "background .2s"
              }}
            >
              <MessageSquarePlus size={18} /> Create New Ticket
            </button>

            <button
              onClick={() => setActivePage("tickets")}
              style={{
                background: "#FAF6F0",
                color: "#2C221E",
                border: "1px solid #E8DED2",
                borderRadius: "12px",
                padding: "12px 20px",
                fontWeight: "600",
                fontSize: "14px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                transition: "background .2s"
              }}
            >
              <Ticket size={18} /> My Support Tickets
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activePage === "new-ticket") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <button
          onClick={() => setActivePage("menu")}
          style={{
            background: "none",
            border: "none",
            color: "#C4956A",
            fontWeight: "600",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: 0,
            fontSize: "14px",
            width: "fit-content"
          }}
        >
          <ArrowLeft size={16} /> Back to Support Menu
        </button>

        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E8DED2",
            borderRadius: "18px",
            padding: "24px",
            boxShadow: "0 2px 10px rgba(44,34,30,0.02)"
          }}
        >
          <h3 style={{ margin: "0 0 6px", color: "#2C221E", fontSize: "18px" }}>Create New Support Ticket</h3>
          <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#9A8C82" }}>
            Fill out the details below and our support staff will get back to you shortly.
          </p>

          <form onSubmit={handleCreateTicket} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#2C221E", marginBottom: "6px" }}>
                Subject / Issue Title
              </label>
              <input
                type="text"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="e.g., Issue with recent order shipment"
                required
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #E8DED2",
                  borderRadius: "12px",
                  background: "#FDFAF5",
                  outline: "none",
                  fontSize: "14px",
                  color: "#2C221E"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#2C221E", marginBottom: "6px" }}>
                Describe Your Issue
              </label>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Provide as much detail as possible..."
                rows={5}
                required
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #E8DED2",
                  borderRadius: "12px",
                  background: "#FDFAF5",
                  outline: "none",
                  fontSize: "14px",
                  color: "#2C221E",
                  resize: "vertical"
                }}
              />
            </div>

            <button
              type="submit"
              disabled={submittingTicket}
              style={{
                background: "#C4956A",
                color: "white",
                border: "none",
                borderRadius: "12px",
                padding: "12px 20px",
                fontWeight: "600",
                fontSize: "14px",
                cursor: "pointer",
                alignSelf: "flex-end",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <Send size={16} /> {submittingTicket ? "Submitting..." : "Submit Ticket"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (activePage === "tickets") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <button
          onClick={() => setActivePage("menu")}
          style={{
            background: "none",
            border: "none",
            color: "#C4956A",
            fontWeight: "600",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: 0,
            fontSize: "14px",
            width: "fit-content"
          }}
        >
          <ArrowLeft size={16} /> Back to Support Menu
        </button>

        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E8DED2",
            borderRadius: "18px",
            padding: "24px",
            boxShadow: "0 2px 10px rgba(44,34,30,0.02)"
          }}
        >
          <h3 style={{ margin: "0 0 16px", color: "#2C221E", fontSize: "18px" }}>My Support Tickets</h3>

          {loadingTickets ? (
            <p style={{ color: "#9A8C82", fontSize: "14px", textAlign: "center", padding: "20px 0" }}>Loading tickets...</p>
          ) : myTickets.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "#9A8C82", fontSize: "14px" }}>
              <p>You haven't submitted any support tickets yet.</p>
              <button
                onClick={() => setActivePage("new-ticket")}
                style={{
                  background: "#C4956A",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  padding: "8px 16px",
                  fontWeight: "600",
                  cursor: "pointer",
                  marginTop: "8px"
                }}
              >
                Create First Ticket
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {myTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => {
                    setSelectedTicket(ticket);
                    setActivePage("conversation");
                  }}
                  style={{
                    padding: "14px 16px",
                    border: "1px solid #E8DED2",
                    borderRadius: "12px",
                    background: "#FDFAF5",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    transition: "border-color 0.2s"
                  }}
                >
                  <div>
                    <div style={{ fontWeight: "600", fontSize: "14px", color: "#2C221E", marginBottom: "4px" }}>
                      {ticket.subject}
                    </div>
                    <div style={{ fontSize: "12px", color: "#9A8C82" }}>
                      {ticket.lastMessage || "No messages yet"}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "600",
                        padding: "4px 8px",
                        borderRadius: "6px",
                        background: ticket.status === "Closed" ? "#E8DED2" : "#E6F4EA",
                        color: ticket.status === "Closed" ? "#6B5E55" : "#137333"
                      }}
                    >
                      {ticket.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (activePage === "conversation" && !selectedTicket) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: "#6B5E55" }}>
        <p>No ticket selected.</p>
        <button onClick={() => setActivePage("menu")} style={{ background: "#C4956A", color: "white", border: "none", padding: "8px 16px", borderRadius: "8px", cursor: "pointer" }}>
          Return to Menu
        </button>
      </div>
    );
  }

  const isClosed = selectedTicket?.status === "Closed";
  const staffName = selectedTicket?.assignedTo || "Support Team";

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

      <button
        onClick={() => setActivePage("tickets")}
        style={{
          background: "none",
          border: "none",
          color: "#C4956A",
          fontWeight: "600",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: 0,
          fontSize: "14px",
          width: "fit-content"
        }}
      >
        <ArrowLeft size={16} /> Back to My Tickets
      </button>

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
