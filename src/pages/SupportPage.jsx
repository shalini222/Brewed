import React, { useState, useEffect, useRef } from "react";
import { db, storage } from "../firebase";
import { useAuth } from "../context/AuthContext";
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL
} from "firebase/storage";
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
  getDocs,
  writeBatch
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
  MessageSquare,
  X,
  Star,
  AlertCircle,
  Paperclip
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

  // Error Modal State
  const [errorModal, setErrorModal] = useState({ open: false, title: "", message: "" });

  // Help Categories state
  const [helpCategories, setHelpCategories] = useState([]);

  // Form states for creating a ticket
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("");
  const [initialMessage, setInitialMessage] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Upload Tasks Ref for cancellation on unmount
  const uploadTasksRef = useRef([]);

  // Duplicate submission prevention refs
  const creatingTicketRef = useRef(false);
  const sendingReplyRef = useRef(false);

  // Chat conversation states
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [replyAttachments, setReplyAttachments] = useState([]);
  const [sending, setSending] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [adminTyping, setAdminTyping] = useState(false);
  const [lastAdminTyping, setLastAdminTyping] = useState(null);

  // Failed Messages state
  const [failedMessages, setFailedMessages] = useState([]);

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
  const typingTimeout = useRef(null);

  // Cancel pending upload tasks on unmount
  useEffect(() => {
    return () => {
      uploadTasksRef.current.forEach(task => {
        try {
          task.cancel();
        } catch {}
      });
      uploadTasksRef.current = [];
    };
  }, []);

  // FAQ 
  const [faqs, setFaqs] = useState([]);

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

  // Helper function to update customer typing status in Firestore using server timestamp
  const updateTypingStatus = async () => {
    if (!selectedTicket?.id) return;
    try {
      await updateDoc(
        doc(db, "supportTickets", selectedTicket.id),
        { customerTypingAt: serverTimestamp() }
      );
    } catch (err) {
      console.log(err);
    }
  };

  // Typing change handler with optimized writes and safe timeouts
  const handleReplyChange = (e) => {
    const value = e.target.value;
    setReply(value);

    if (!value.trim()) {
      clearTimeout(typingTimeout.current);
      typingTimeout.current = null;
      if (selectedTicket?.id) {
        updateDoc(
          doc(db, "supportTickets", selectedTicket.id),
          { customerTypingAt: null }
        ).catch(() => {});
      }
      return;
    }

    if (!typingTimeout.current) {
      updateTypingStatus();
    }

    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(async () => {
      typingTimeout.current = null;
      if (!selectedTicket?.id) return;
      try {
        await updateDoc(
          doc(db, "supportTickets", selectedTicket.id),
          { customerTypingAt: null }
        );
      } catch (err) {
        console.log(err);
      }
    }, 2500);
  };

  // Clean up typing timeout on component unmount
  useEffect(() => {
    return () => {
      clearTimeout(typingTimeout.current);
    };
  }, []);

  // Clean up customer typing when switching tickets or unmounting
  useEffect(() => {
    return () => {
      if (selectedTicket?.id) {
        updateDoc(
          doc(db, "supportTickets", selectedTicket.id),
          { customerTypingAt: null }
        ).catch(() => {});
      }
    };
  }, [selectedTicket?.id]);

  // Load categories from Firestore
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

          const messagesRef = collection(db, "supportTickets", selectedTicket.id, "messages");
          const q = query(messagesRef, where("sender", "==", "customer"), where("status", "==", "sent"));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const batch = writeBatch(db);
            querySnapshot.forEach((document) => {
              batch.update(document.ref, {
                status: "read",
                readAt: serverTimestamp()
              });
            });
            await batch.commit();
          }
        }
      } catch (err) {
        console.log("Error marking ticket as read for customer:", err);
      }
    };

    markAsRead();
  }, [selectedTicket?.id, selectedTicket?.customerUnread]);

  // Listen to the active ticket document for live updates & support typing
  useEffect(() => {
    if (!selectedTicket?.id) return;

    const unsubscribe = onSnapshot(
      doc(db, "supportTickets", selectedTicket.id),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setLastAdminTyping(data.adminTypingAt || null);
          setSelectedTicket((prev) => prev ? { ...prev, ...data } : null);
        }
      }
    );
    return () => unsubscribe();
  }, [selectedTicket?.id]);

  // Admin typing status timer interval
  useEffect(() => {
    const interval = setInterval(() => {
      if (!lastAdminTyping?.seconds) {
        setAdminTyping(false);
        return;
      }
      const diff = Date.now() / 1000 - lastAdminTyping.seconds;
      setAdminTyping(diff < 3);
    }, 500);
    return () => clearInterval(interval);
  }, [lastAdminTyping]);

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

  // Auto-scroll when messages update or admin typing status changes
  useEffect(() => {
    if (isNearBottom || messages.length <= 5) {
      scrollToBottom();
    }
  }, [messages, adminTyping, isNearBottom]);

  // Helper to upload attachments with tracking and filtering
  const uploadAttachments = async (filesToUpload, onProgress) => {
    if (!filesToUpload.length) return [];
    const totalBytes = filesToUpload.reduce((sum, file) => sum + file.size, 0) || 1;
    let transferredBytes = 0;
    
    const uploads = filesToUpload.map((file) => {
      return new Promise((resolve, reject) => {
        const fileRef = storageRef(
          storage,
          `support/${currentUser.uid}/${Date.now()}-${file.name}`
        );
        const uploadTask = uploadBytesResumable(fileRef, file);
        uploadTasksRef.current.push(uploadTask);

        let previousTransferred = 0;
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            transferredBytes += snapshot.bytesTransferred - previousTransferred;
            previousTransferred = snapshot.bytesTransferred;
            if (onProgress) {
              onProgress(
                Math.round((transferredBytes / totalBytes) * 100)
              );
            }
          },
          reject,
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            uploadTasksRef.current = uploadTasksRef.current.filter(
              task => task !== uploadTask
            );
            resolve({ name: file.name, url, type: file.type, size: file.size });
          }
        );
      });
    });
    return Promise.all(uploads);
  };

  // Handle file selection with validation for ticket creation
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const MAX_ATTACHMENTS = 5;
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf"
    ];

    if (files.length > MAX_ATTACHMENTS) {
      setErrorModal({
        open: true,
        title: "Too Many Files",
        message: `You can only attach up to ${MAX_ATTACHMENTS} files.`
      });
      return;
    }

    const validFiles = [];
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        setErrorModal({
          open: true,
          title: "Unsupported File Type",
          message: `${file.name} is not supported. Please upload images or PDFs.`
        });
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setErrorModal({
          open: true,
          title: "File Too Large",
          message: `${file.name} exceeds the 10MB limit.`
        });
        return;
      }
      validFiles.push(file);
    }

    setAttachments(validFiles);
  };

  // Handle file selection for ongoing conversation replies
  const handleReplyFileChange = (e) => {
    const files = Array.from(e.target.files);
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

    const validFiles = [];
    for (const file of files) {
      if (!allowedTypes.includes(file.type) || file.size > MAX_FILE_SIZE) {
        continue;
      }
      validFiles.push(file);
    }
    setReplyAttachments(prev => [...prev, ...validFiles]);
  };

  // Create a new support ticket with duplicate protection
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (
      !subject.trim() ||
      !initialMessage.trim() ||
      !currentUser?.uid ||
      creatingTicketRef.current
    ) {
      return;
    }
    creatingTicketRef.current = true;

    const existingOpenTicket = tickets.find(
      (ticket) =>
        ticket.subject.trim().toLowerCase() === subject.trim().toLowerCase() &&
        ticket.category === category &&
        ["Open", "In Progress", "Waiting for Customer"].includes(ticket.status)
    );
    if (existingOpenTicket) {
      creatingTicketRef.current = false;
      setErrorModal({
        open: true,
        title: "Active Ticket Exists",
        message: `You already have an open ${category} support ticket with this subject.`
      });
      return;
    }

    try {
      setSubmitting(true);
      setUploadProgress(0);

      const uploadedFiles = await uploadAttachments(attachments, (progress) => {
        setUploadProgress(progress);
      });

      const ticketNumber = "SUP-" + Math.floor(100000 + Math.random() * 900000);

      const ticketRef = await addDoc(collection(db, "supportTickets"), {
        ticketNumber,
        customerId: currentUser.uid,
        customerName: currentUser.displayName || currentUser.email || "Customer",
        customerEmail: currentUser.email || "",
        subject: subject.trim(),
        category: category,
        status: "Open",
        priority: "Medium",
        customerUnread: 0,
        supportUnread: 1,
        lastReplyBy: "customer",
        lastMessage: initialMessage.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
        lastCustomerReplyAt: serverTimestamp(),
        slaStatus: "On Time",
        firstResponseAt: null,
        resolvedAt: null,
        attachments: uploadedFiles,
        adminTypingAt: null,
        customerTypingAt: null
      });

      await addDoc(collection(db, "supportTickets", ticketRef.id, "messages"), {
        sender: "customer",
        senderName: currentUser.displayName || currentUser.email || "Customer",
        message: initialMessage.trim(),
        createdAt: serverTimestamp(),
        attachments: uploadedFiles,
        status: "sent"
      });

      const snap = await getDoc(ticketRef);
      const newTicket = { id: ticketRef.id, ...snap.data() };
      setCreatedTicket(newTicket);
      setSelectedTicket(newTicket);
      
      setSubject("");
      setCategory(helpCategories.length > 0 ? helpCategories[0].title : "General");
      setInitialMessage("");
      setAttachments([]);
      setShowSuccessModal(true);
    } catch (err) {
      console.error("Error creating support ticket:", err);
      setErrorModal({
        open: true,
        title: "Upload Failed",
        message: "We couldn't create your support ticket. Please try again."
      });
    } finally {
      creatingTicketRef.current = false;
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  // Send a message reply with duplicate protection
  const sendReply = async () => {
    if (
      sendingReplyRef.current ||
      (!reply.trim() && replyAttachments.length === 0) ||
      !selectedTicket?.id ||
      !currentUser?.uid
    ) {
      return;
    }
    sendingReplyRef.current = true;

    const tempId = `temp-${Date.now()}`;
    const messageText = reply.trim();
    const currentReplyAttachments = [...replyAttachments];

    const optimisticMessage = {
      id: tempId,
      sender: "customer",
      senderName: currentUser.displayName || currentUser.email || "Customer",
      message: messageText,
      attachments: currentReplyAttachments.map(f => ({ name: f.name, type: f.type, size: f.size, url: "" })),
      createdAt: { toDate: () => new Date() },
      sending: true,
      status: "sending"
    };

    setMessages(prev => [...prev, optimisticMessage]);

    try {
      setSending(true);
      clearTimeout(typingTimeout.current);

      const ticketRef = doc(db, "supportTickets", selectedTicket.id);
      const ticketSnap = await getDoc(ticketRef);

      if (!ticketSnap.exists()) {
        setErrorModal({
          open: true,
          title: "Ticket Unavailable",
          message: "This ticket no longer exists."
        });
        setMessages(prev => prev.filter(msg => msg.id !== tempId));
        setActivePage("list");
        return;
      }

      const uploadedReplyFiles = await uploadAttachments(currentReplyAttachments);

      await addDoc(collection(db, "supportTickets", selectedTicket.id, "messages"), {
        sender: "customer",
        senderName: currentUser.displayName || currentUser.email || "Customer",
        message: messageText,
        createdAt: serverTimestamp(),
        attachments: uploadedReplyFiles,
        status: "sent"
      });

      await updateDoc(ticketRef, {
        updatedAt: serverTimestamp(),
        supportUnread: increment(1),
        lastReplyBy: "customer",
        lastMessage: messageText || "[Attachment]",
        lastMessageAt: serverTimestamp(),
        lastCustomerReplyAt: serverTimestamp(),
        customerTypingAt: null
      });

      setReply("");
      setReplyAttachments([]);

    } catch (err) {
      console.error("Error sending reply:", err);
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      
      setFailedMessages(prev => [
        ...prev,
        { id: Date.now(), text: messageText, attachments: currentReplyAttachments }
      ]);

      setErrorModal({
        open: true,
        title: "Failed to Send",
        message: "Could not send your message. You can retry below."
      });
    } finally {
      sendingReplyRef.current = false;
      setSending(false);
    }
  };

  const isClosed = selectedTicket?.status === "Closed";

  const sortedTickets = [...tickets].sort((a, b) => { 
    const aTime = a.updatedAt?.seconds || 0; 
    const bTime = b.updatedAt?.seconds || 0; 
    return bTime - aTime; 
  });

  const recentTickets = [...sortedTickets].slice(0, 3);

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

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendReply();
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
        .customer-msg { background: #C4956A; color: white; padding: 14px 18px; border-radius: 18px 18px 4px 18px; font-size: 14px; line-height: 1.5; }
        .support-msg { background: #FFFFFF; border: 1px solid #E8DED2; color: #2C221E; padding: 14px 18px; border-radius: 18px 18px 18px 4px; font-size: 14px; line-height: 1.5; }
        
        .support-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
        .help-card { background: white; border: 1px solid #E8DED2; border-radius: 16px; padding: 20px; cursor: pointer; transition: all 0.2s ease; }
        .help-card:hover { transform: translateY(-2px); border-color: #C4956A; box-shadow: 0 6px 16px rgba(44,34,30,0.06); }
        .help-card h3 { margin: 12px 0 6px; color: #2C221E; font-size: 16px; }
        .help-card p { margin: 0; color: #9A8C82; font-size: 13px; line-height: 1.5; }
        
        .support-heading { font-size: 18px; color: #2C221E; margin-bottom: 14px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
        .empty-state { background: #FAF6F0; border: 1px dashed #E8DED2; border-radius: 16px; padding: 40px 20px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; }
        .empty-state h3 { margin: 0; color: #2C221E; font-size: 16px; font-weight: 650; }
        .empty-state p { margin: 0; color: #9A8C82; font-size: 13px; max-width: 320px; line-height: 1.5; }

        .support-typing { display: flex; align-items: center; gap: 8px; margin: 8px 0; }
        .typing-bubble { background: #FAF6F0; border-radius: 14px; padding: 8px 12px; display: flex; align-items: center; gap: 6px; border: 1px solid #E8DED2; }
        .typing-bubble span { font-size: 12px; color: #6B635C; }
        .typing-dots { display: flex; gap: 3px; }
        .typing-dots span { width: 5px; height: 5px; background: #8A8178; border-radius: 50%; animation: typingBounce 1.2s infinite; }
        .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
        .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typingBounce {
          0%, 80%, 100% { opacity: 0.3; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-3px); }
        }
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
              <Search size={18} color="#C4956A" />
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
          </section>

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
                      border: selectedCategory === item.title ? "2px solid #C4956A" : undefined
                    }}
                  >
                    <Icon size={26} color="#C4956A" />
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                );
              })}
            </div>
          </section>

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

        </div>
      )}

      {/* TICKET LIST VIEW (MY TICKETS) */}
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

      {/* CREATE TICKET VIEW (WITH ATTACHMENT UPLOAD OPTION) */}
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

            {/* File Upload Option */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#6E5E53" }}>Attachments (Optional - up to 5 files, max 10MB each)</label>
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                accept="image/jpeg,image/png,image/webp,application/pdf"
                style={{ fontSize: "13px", color: "#6E5E53" }}
              />
              {attachments.length > 0 && (
                <div style={{ fontSize: "12px", color: "#C4956A", marginTop: "4px" }}>
                  {attachments.length} file(s) selected
                </div>
              )}
            </div>

            <button type="submit" className="support-btn" disabled={submitting || helpCategories.length === 0} style={{ alignSelf: "flex-end" }}>
              {submitting ? `Uploading... ${uploadProgress}%` : helpCategories.length === 0 ? "No Categories Available" : "Submit Ticket"}
            </button>
          </form>
        </div>
      )}

      {/* CONVERSATION VIEW (WITH SUPPORT TYPING INDICATOR & ATTACHMENTS) */}
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
              {messages.map((msg, index) => {
                const previousMessage = messages[index - 1];
                const sender = (msg.sender || "").toLowerCase();
                const previousSender = (previousMessage?.sender || "").toLowerCase();
                const showSender = index === 0 || sender !== previousSender;
                const isCustomer = sender === "customer";

                return (
                  <div key={msg.id} className={`message-wrapper ${isCustomer ? "customer-message-wrapper" : "support-message-wrapper"}`}>
                    {showSender && (
                      <span className="message-sender-label">
                        {isCustomer ? "You" : "Support Team"}
                      </span>
                    )}
                    <div className={isCustomer ? "customer-msg" : "support-msg"}>
                      <p style={{ margin: 0 }}>{msg.message}</p>
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {msg.attachments.map((file, fIdx) => (
                            <a
                              key={fIdx}
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: "11px", background: "rgba(0,0,0,0.06)", padding: "4px 8px", borderRadius: "6px", textDecoration: "none", color: "inherit", display: "inline-flex", alignItems: "center", gap: "4px" }}
                            >
                              <Paperclip size={12} /> {file.name || "Attachment"}
                            </a>
                          ))}
                        </div>
                      )}
                      <div style={{ marginTop: "6px", fontSize: "11px", opacity: 0.8, textAlign: isCustomer ? "right" : "left" }}>
                        {formatMessageTime(msg.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Support Team Typing Indicator */}
              {adminTyping && (
                <div className="support-typing">
                  <div className="typing-bubble">
                    <span>Support team is typing</span>
                    <div className="typing-dots">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

          {!isClosed && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
              <textarea
                value={reply}
                onChange={handleReplyChange}
                onKeyDown={handleKeyDown}
                placeholder="Type your message... (Press Enter to send)"
                disabled={sending}
                rows={3}
                style={{ width: "100%", padding: "12px", border: "1px solid #E8DED2", borderRadius: "12px", background: "#FDFAF5", outline: "none", color: "#2C221E", fontSize: "14px", resize: "vertical" }}
              />
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <label style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#C4956A", fontWeight: 600 }}>
                    <Paperclip size={15} /> Add File
                    <input
                      type="file"
                      multiple
                      onChange={handleReplyFileChange}
                      style={{ display: "none" }}
                    />
                  </label>
                  {replyAttachments.length > 0 && (
                    <span style={{ fontSize: "12px", color: "#6E5E53" }}>{replyAttachments.length} file(s) attached</span>
                  )}
                </div>

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
            <h2 style={{ margin: 0, color: "#2C221E", fontSize: "24px", fontWeight: 700 }}>
              Ticket Submitted
            </h2>
            <p style={{ marginTop: "14px", color: "#6E5E53", lineHeight: 1.6 }}>
              Your support request has been received successfully.
            </p>
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
