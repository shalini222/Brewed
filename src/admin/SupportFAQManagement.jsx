import { useState, useEffect } from "react";
import { db, auth } from "../firebase";

import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "firebase/firestore";
import {
  HelpCircle,
  Plus,
  Search,
  FileText,
  ThumbsUp,
  Eye,
  Pin,
  Star,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit3,
  Copy,
  ArrowUpDown,
  Upload,
  Download,
  Layers,
  Sparkles
} from "lucide-react";

export default function SupportFAQManagement() {
  const [faqs, setFaqs] = useState([]);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState("General");

  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [previewFAQ, setPreviewFAQ] = useState(null);

  const [selectedFAQs, setSelectedFAQs] = useState([]);
  const [bulkCategory, setBulkCategory] = useState("General");
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage("");
    }, 3000);
  };

  useEffect(() => {
    const q = query(
      collection(db, "supportFAQs"),
      orderBy("sortOrder", "asc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setFaqs(
          snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
        );

        setLoading(false);
      },
      (error) => {
        console.error(error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (question.trim() || answer.trim() || editingId) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [question, answer, editingId]);

  const getCurrentAdminName = () => {
    return auth.currentUser?.displayName || auth.currentUser?.email || "Olivia";
  };

  const saveFAQ = async () => {
    if (!question.trim() || !answer.trim()) return;

    const normalizeText = (txt) => txt.trim().replace(/\s+/g, " ").toLowerCase();
    const normalizedQuestion = normalizeText(question);
    
    const duplicateExists = faqs.find(
      f => normalizeText(f.question) === normalizedQuestion && f.id !== editingId
    );

    if (duplicateExists) {
      const proceed = window.confirm("Similar FAQ already exists. Do you still want to save?");
      if (!proceed) return;
    }

    try {
      const adminName = getCurrentAdminName();
      if (editingId) {
        await updateDoc(doc(db, "supportFAQs", editingId), {
          question,
          answer,
          category,
          updatedAt: serverTimestamp(),
          updatedBy: adminName
        });
        showToast("FAQ updated successfully.");
      } else {
        await addDoc(collection(db, "supportFAQs"), {
          question,
          answer,
          category,
          active: true,
          pinned: false,
          featured: false,
          views: 0,
          helpful: 0,
          notHelpful: 0,
          sortOrder: faqs.length + 1,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          updatedBy: adminName
        });
        showToast("FAQ added successfully.");
      }

      setQuestion("");
      setAnswer("");
      setCategory("General");
      setEditingId(null);
    } catch (err) {
      console.log(err);
    }
  };

  const editFAQ = (faq) => {
    setEditingId(faq.id);
    setQuestion(faq.question);
    setAnswer(faq.answer);
    setCategory(faq.category);
    window.scrollTo({ top: 300, behavior: "smooth" });
  };

  const toggleFAQ = async (faq) => {
    try {
      await updateDoc(doc(db, "supportFAQs", faq.id), {
        active: !faq.active,
        updatedAt: serverTimestamp(),
        updatedBy: getCurrentAdminName()
      });
      showToast(`FAQ status updated to ${!faq.active ? "Active" : "Disabled"}.`);
    } catch (err) {
      console.log(err);
    }
  };

  const togglePinned = async (faq) => {
    try {
      await updateDoc(doc(db, "supportFAQs", faq.id), {
        pinned: !faq.pinned,
        updatedAt: serverTimestamp(),
        updatedBy: getCurrentAdminName()
      });
      showToast(`FAQ pin status updated.`);
    } catch (err) {
      console.log(err);
    }
  };

  const duplicateFAQ = async (faq) => {
    try {
      await addDoc(collection(db, "supportFAQs"), {
        question: faq.question + " (Copy)",
        answer: faq.answer,
        category: faq.category,
        active: false,
        pinned: false,
        featured: false,
        views: 0,
        helpful: 0,
        notHelpful: 0,
        sortOrder: faqs.length + 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: getCurrentAdminName()
      });
      showToast("FAQ duplicated successfully.");
    } catch (err) {
      console.log(err);
    }
  };

  const makeFeatured = async (faq) => {
    try {
      const currentFeatured = faqs.find(item => item.featured);
      if (currentFeatured && currentFeatured.id !== faq.id) {
        await updateDoc(doc(db, "supportFAQs", currentFeatured.id), {
          featured: false,
          updatedAt: serverTimestamp(),
          updatedBy: getCurrentAdminName()
        });
      }

      await updateDoc(doc(db, "supportFAQs", faq.id), {
        featured: !faq.featured,
        updatedAt: serverTimestamp(),
        updatedBy: getCurrentAdminName()
      });
      showToast("Featured FAQ updated.");
    } catch (err) {
      console.log(err);
    }
  };

  const deleteFAQ = async (id) => {
    const confirmed = window.confirm("Delete this FAQ?");
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "supportFAQs", id));
      setSelectedFAQs(selectedFAQs.filter(itemId => itemId !== id));
      showToast("FAQ deleted.");
    } catch (err) {
      console.log(err);
    }
  };

  const moveUp = async (faq) => {
    const index = sortedFaqs.findIndex(item => item.id === faq.id);
    if (index === 0) return;

    const current = sortedFaqs[index];
    const previous = sortedFaqs[index - 1];

    try {
      const adminName = getCurrentAdminName();
      await updateDoc(doc(db, "supportFAQs", current.id), {
        sortOrder: previous.sortOrder,
        updatedAt: serverTimestamp(),
        updatedBy: adminName
      });

      await updateDoc(doc(db, "supportFAQs", previous.id), {
        sortOrder: current.sortOrder,
        updatedAt: serverTimestamp(),
        updatedBy: adminName
      });
    } catch (err) {
      console.log(err);
    }
  };

  const moveDown = async (faq) => {
    const index = sortedFaqs.findIndex(item => item.id === faq.id);
    if (index === sortedFaqs.length - 1) return;

    const current = sortedFaqs[index];
    const next = sortedFaqs[index + 1];

    try {
      const adminName = getCurrentAdminName();
      await updateDoc(doc(db, "supportFAQs", current.id), {
        sortOrder: next.sortOrder,
        updatedAt: serverTimestamp(),
        updatedBy: adminName
      });

      await updateDoc(doc(db, "supportFAQs", next.id), {
        sortOrder: current.sortOrder,
        updatedAt: serverTimestamp(),
        updatedBy: adminName
      });
    } catch (err) {
      console.log(err);
    }
  };

  const toggleSelection = (id) => {
    if (selectedFAQs.includes(id)) {
      setSelectedFAQs(selectedFAQs.filter(x => x !== id));
    } else {
      setSelectedFAQs([...selectedFAQs, id]);
    }
  };

  const selectAll = () => {
    setSelectedFAQs(filteredFaqs.map(f => f.id));
  };

  const clearSelection = () => {
    setSelectedFAQs([]);
  };

  const bulkEnable = async () => {
    try {
      const adminName = getCurrentAdminName();
      for (const id of selectedFAQs) {
        await updateDoc(doc(db, "supportFAQs", id), {
          active: true,
          updatedAt: serverTimestamp(),
          updatedBy: adminName
        });
      }
      const count = selectedFAQs.length;
      setSelectedFAQs([]);
      showToast(`${count} FAQs enabled.`);
    } catch (err) {
      console.log(err);
    }
  };

  const bulkDisable = async () => {
    try {
      const adminName = getCurrentAdminName();
      for (const id of selectedFAQs) {
        await updateDoc(doc(db, "supportFAQs", id), {
          active: false,
          updatedAt: serverTimestamp(),
          updatedBy: adminName
        });
      }
      const count = selectedFAQs.length;
      setSelectedFAQs([]);
      showToast(`${count} FAQs disabled.`);
    } catch (err) {
      console.log(err);
    }
  };

  const bulkDelete = async () => {
    const confirmed = window.confirm(`Delete ${selectedFAQs.length} selected FAQs?`);
    if (!confirmed) return;

    try {
      const count = selectedFAQs.length;
      for (const id of selectedFAQs) {
        await deleteDoc(doc(db, "supportFAQs", id));
      }
      setSelectedFAQs([]);
      showToast(`${count} FAQs deleted.`);
    } catch (err) {
      console.log(err);
    }
  };

  const bulkCategoryChange = async () => {
    try {
      const adminName = getCurrentAdminName();
      for (const id of selectedFAQs) {
        await updateDoc(doc(db, "supportFAQs", id), {
          category: bulkCategory,
          updatedAt: serverTimestamp(),
          updatedBy: adminName
        });
      }
      const count = selectedFAQs.length;
      setSelectedFAQs([]);
      showToast(`${count} FAQs moved to ${bulkCategory}.`);
    } catch (err) {
      console.log(err);
    }
  };

  const bulkPin = async (pinnedState) => {
    try {
      const adminName = getCurrentAdminName();
      for (const id of selectedFAQs) {
        await updateDoc(doc(db, "supportFAQs", id), {
          pinned: pinnedState,
          updatedAt: serverTimestamp(),
          updatedBy: adminName
        });
      }
      const count = selectedFAQs.length;
      setSelectedFAQs([]);
      showToast(`${count} FAQs ${pinnedState ? "pinned" : "unpinned"}.`);
    } catch (err) {
      console.log(err);
    }
  };

  const exportFAQs = () => {
    const cleanFaqs = faqs.map(({ question, answer, category, active, pinned, featured, views, helpful, notHelpful, sortOrder }) => ({
      question,
      answer,
      category,
      active,
      pinned,
      featured,
      views,
      helpful,
      notHelpful,
      sortOrder
    }));

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cleanFaqs, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "support-faqs.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("FAQs exported successfully.");
  };

  const importFAQs = (e) => {
    const fileReader = new FileReader();
    if (e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = async (event) => {
        try {
          const imported = JSON.parse(event.target.result);
          if (Array.isArray(imported)) {
            const adminName = getCurrentAdminName();
            let index = 0;
            for (const item of imported) {
              const normalizeText = (txt) => (txt || "").trim().replace(/\s+/g, " ").toLowerCase();
              const exists = faqs.some(
                f => normalizeText(f.question) === normalizeText(item.question)
              );
              if (!exists) {
                await addDoc(collection(db, "supportFAQs"), {
                  question: item.question || "Untitled",
                  answer: item.answer || "",
                  category: item.category || "General",
                  active: item.active ?? false,
                  pinned: item.pinned ?? false,
                  featured: item.featured ?? false,
                  views: item.views || 0,
                  helpful: item.helpful || 0,
                  notHelpful: item.notHelpful || 0,
                  sortOrder: faqs.length + index + 1,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                  updatedBy: adminName
                });
                index++;
              }
            }
            showToast("FAQs imported successfully!");
          }
        } catch (err) {
          console.log(err);
          alert("Invalid JSON file");
        }
      };
    }
  };

  const totalFaqs = faqs.length;
  const pinnedFaqsCount = faqs.filter(faq => faq.pinned).length;
  const totalViews = faqs.reduce((sum, faq) => sum + (faq.views || 0), 0);
  const totalHelpful = faqs.reduce((sum, faq) => sum + (faq.helpful || 0), 0);
  const totalNotHelpful = faqs.reduce((sum, faq) => sum + (faq.notHelpful || 0), 0);
  const totalVotes = totalHelpful + totalNotHelpful;
  const helpfulPercentage = totalVotes > 0 ? Math.round((totalHelpful / totalVotes) * 100) : 0;

  const currentFeaturedFAQ = faqs.find(faq => faq.featured);
  const mostViewed = [...faqs].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
  const leastHelpful = [...faqs].sort((a, b) => (b.notHelpful || 0) - (a.notHelpful || 0)).slice(0, 5);

  const categoryStats = {};
  faqs.forEach(faq => {
    const cat = faq.category || "General";
    categoryStats[cat] = (categoryStats[cat] || 0) + 1;
  });

  const sortedFaqs = [...faqs].sort((a, b) => {
    if (a.pinned === b.pinned) {
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    }
    return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
  });

  const filteredFaqs = sortedFaqs.filter((faq) => {
    const text = search.toLowerCase();

    const matchesSearch =
      faq.question.toLowerCase().includes(text) ||
      faq.answer.toLowerCase().includes(text) ||
      faq.category.toLowerCase().includes(text);

    const matchesCategory =
      categoryFilter === "All" ||
      faq.category === categoryFilter;

    let matchesStatus = true;
    if (statusFilter === "Active") matchesStatus = faq.active;
    if (statusFilter === "Disabled") matchesStatus = !faq.active;
    if (statusFilter === "Pinned") matchesStatus = faq.pinned;
    if (statusFilter === "Featured") matchesStatus = faq.featured;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (loading) {
    return (
      <div className="admin-page">
        <div className="loading-card">
          <div className="spinner"></div>
          Loading FAQ management...
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        /* ===========================
           BREWED LUXURY ADMIN V1 DESIGN SYSTEM
        =========================== */

        .admin-page {
          padding: 32px;
          background: #F8F6F2;
          min-height: 100vh;
          font-family: inherit;
          color: #1A1614;
          box-sizing: border-box;
          position: relative;
        }

        /* HERO HEADER & STAT CARDS */
        .admin-hero {
          margin-bottom: 28px;
        }

        .hero-top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          background: white;
          padding: 24px 28px;
          border-radius: 20px;
          border: 1px solid #ECE8E3;
          box-shadow: 0 4px 20px rgba(44,34,30,0.02);
        }

        .hero-title-area h2 {
          margin: 0;
          font-size: 26px;
          color: #1A1614;
          font-weight: 600;
          letter-spacing: -0.02em;
        }

        .hero-title-area p {
          margin: 6px 0 0;
          color: #7A6E65;
          font-size: 15px;
        }

        .hero-action-slot {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .hero-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }

        .stat-card {
          background: white;
          border-radius: 18px;
          padding: 20px 24px;
          border: 1px solid #ECE8E3;
          box-shadow: 0 4px 20px rgba(44,34,30,0.02);
          display: flex;
          align-items: center;
          gap: 16px;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .stat-card:hover {
          border-color: #D8D0C7;
          transform: translateY(-2px);
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: #FAF8F6;
          border: 1px solid #ECE8E3;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1A1614;
          flex-shrink: 0;
        }

        .stat-content .stat-label {
          font-size: 13px;
          font-weight: 500;
          color: #7A6E65;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 4px;
        }

        .stat-content .stat-value {
          font-size: 20px;
          font-weight: 600;
          color: #1A1614;
          letter-spacing: -0.01em;
        }

        /* TOAST NOTIFICATION */
        .success-toast {
          position: fixed;
          bottom: 28px;
          right: 28px;
          background: #1A1614;
          color: white;
          padding: 14px 24px;
          border-radius: 14px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.15);
          z-index: 1000;
          font-weight: 500;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          animation: slideDown 0.3s ease;
        }

        /* DASHBOARD CARDS */
        .dashboard-card {
          background: white;
          border-radius: 20px;
          padding: 28px;
          margin-bottom: 24px;
          border: 1px solid #ECE8E3;
          box-shadow: 0 4px 24px rgba(44,34,30,0.03);
          transition: border-color 0.2s ease;
        }

        .dashboard-card:hover {
          border-color: #D8D0C7;
        }

        .dashboard-card h3 {
          margin: 0;
          color: #1A1614;
          font-size: 19px;
          font-weight: 600;
          letter-spacing: -0.01em;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .dashboard-card > p {
          margin: 6px 0 24px;
          color: #7A6E65;
          font-size: 14px;
          line-height: 1.5;
        }

        .card-subsection-title {
          font-size: 13px;
          font-weight: 600;
          color: #5A4E46;
          margin: 24px 0 14px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* GRIDS */
        .settings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }

        /* INPUTS */
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }

        .input-group:last-child {
          margin-bottom: 0;
        }

        .input-group label {
          font-size: 12px;
          font-weight: 600;
          color: #5A4E46;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .input-group input[type="text"],
        .input-group select,
        .input-group textarea {
          background: #FCFBF8;
          border: 1px solid #ECE8E3;
          border-radius: 14px;
          height: 48px;
          padding: 0 16px;
          font-size: 14px;
          transition: all 0.2s ease;
          outline: none;
          color: #1A1614;
          font-family: inherit;
          box-sizing: border-box;
          width: 100%;
        }

        .input-group textarea {
          height: auto;
          min-height: 110px;
          padding: 14px 16px;
          resize: vertical;
        }

        .input-group input:hover,
        .input-group select:hover,
        .input-group textarea:hover {
          border-color: #C8BFC5;
          background: white;
        }

        .input-group input:focus,
        .input-group select:focus,
        .input-group textarea:focus {
          border-color: #1A1614;
          background: white;
          box-shadow: 0 0 0 4px rgba(26,22,20,0.06);
        }

        /* BUTTONS */
        .save-btn {
          background: #1A1614;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 14px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: background 0.2s ease;
        }

        .save-btn:hover:not(:disabled) {
          background: #332C28;
        }

        .reset-btn {
          background: #FAF8F6;
          border: 1px solid #ECE8E3;
          padding: 12px 20px;
          border-radius: 14px;
          cursor: pointer;
          font-weight: 500;
          color: #1A1614;
          transition: all 0.2s ease;
          font-size: 14px;
        }

        .reset-btn:hover:not(:disabled) {
          background: white;
          border-color: #1A1614;
        }

        .action-btn {
          background: #FAF8F6;
          border: 1px solid #ECE8E3;
          border-radius: 12px;
          padding: 8px 14px;
          cursor: pointer;
          font-weight: 500;
          font-size: 13px;
          transition: all 0.2s ease;
          color: #1A1614;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .action-btn:hover {
          background: white;
          border-color: #1A1614;
        }

        .action-btn-danger {
          background: #FAF8F6;
          border: 1px solid #FEE2E2;
          color: #991B1B;
        }

        .action-btn-danger:hover {
          background: #FEF2F2;
          border-color: #F87171;
        }

        /* LOADING / SPINNER */
        .loading-card {
          background: white;
          padding: 60px;
          text-align: center;
          border-radius: 20px;
          border: 1px solid #ECE8E3;
          color: #7A6E65;
          font-weight: 500;
          font-size: 15px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #ECE8E3;
          border-top-color: #1A1614;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* RESPONSIVE */
        @media(max-width: 768px) {
          .admin-page {
            padding: 16px;
          }
          .hero-top-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
            padding: 20px;
          }
          .hero-action-slot {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>

      <div className="admin-page">
        {toastMessage && (
          <div className="success-toast">
            <CheckCircle2 size={18} color="#36543A" />
            {toastMessage}
          </div>
        )}

        {/* Preview Modal */}
        {previewFAQ && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              backgroundColor: "rgba(26, 22, 20, 0.4)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1100,
              backdropFilter: "blur(6px)"
            }}
            onClick={() => setPreviewFAQ(null)}
          >
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #ECE8E3",
                borderRadius: "24px",
                padding: "36px",
                width: "100%",
                maxWidth: "720px",
                boxShadow: "0 30px 80px rgba(26,22,20,.15)",
                margin: "20px"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                <span style={{ background: "#FAF8F6", border: "1px solid #ECE8E3", padding: "6px 14px", borderRadius: "999px", fontSize: "12px", fontWeight: 600, color: "#7A6E65" }}>
                  {previewFAQ.category}
                </span>
                <button
                  onClick={() => setPreviewFAQ(null)}
                  style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#7A6E65" }}
                >
                  ✕
                </button>
              </div>
              <h2 style={{ marginTop: 0, color: "#1A1614", fontSize: "22px", fontWeight: 600, marginBottom: "16px" }}>
                {previewFAQ.question}
              </h2>
              <p style={{ color: "#7A6E65", whiteSpace: "pre-wrap", fontSize: "15px", lineHeight: "1.7", marginBottom: "28px" }}>
                {previewFAQ.answer}
              </p>
              <button
                className="save-btn"
                onClick={() => setPreviewFAQ(null)}
              >
                Close Preview
              </button>
            </div>
          </div>
        )}

        {/* Hero Header */}
        <div className="admin-hero">
          <div className="hero-top-row">
            <div className="hero-title-area">
              <h2>FAQ Management</h2>
              <p>Maintain your customer knowledge base, organize categories and optimize support quality.</p>
            </div>
            <div className="hero-action-slot">
              <button
                className="reset-btn"
                onClick={exportFAQs}
              >
                <Download size={16} /> Export
              </button>
              <label className="reset-btn" style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                <Upload size={16} /> Import
                <input type="file" accept=".json" onChange={importFAQs} style={{ display: "none" }} />
              </label>
              <button
                className="save-btn"
                onClick={() => window.scrollTo({ top: 300, behavior: "smooth" })}
              >
                <Plus size={16} /> New FAQ
              </button>
            </div>
          </div>

          <div className="hero-stats-grid">
            <div className="stat-card">
              <div className="stat-icon"><FileText size={22} /></div>
              <div className="stat-content">
                <div className="stat-label">Total FAQs</div>
                <div className="stat-value">{totalFaqs}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon"><ThumbsUp size={22} /></div>
              <div className="stat-content">
                <div className="stat-label">Helpful Rate</div>
                <div className="stat-value">{helpfulPercentage}%</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon"><Eye size={22} /></div>
              <div className="stat-content">
                <div className="stat-label">Total Views</div>
                <div className="stat-value">{totalViews}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon"><Pin size={22} /></div>
              <div className="stat-content">
                <div className="stat-label">Pinned FAQs</div>
                <div className="stat-value">{pinnedFaqsCount}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Add / Edit Form */}
        <div className="dashboard-card">
          <h3>
            <Sparkles size={20} />
            {editingId ? "Edit FAQ Item" : "Create New FAQ Item"}
          </h3>
          <p>Fill out the question, clear answer copy, and assign the proper help category.</p>

          <div className="input-group" style={{ marginBottom: "20px" }}>
            <label>Question</label>
            <input
              type="text"
              placeholder="Type your question here..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </div>

          <div className="input-group" style={{ marginBottom: "20px" }}>
            <label>Answer</label>
            <textarea
              rows={4}
              placeholder="Answer (Supports line breaks & bullet lists)..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "16px", alignItems: "end" }}>
            <div className="input-group">
              <label>Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option>General</option>
                <option>Orders</option>
                <option>Delivery</option>
                <option>Payments</option>
                <option>Rewards</option>
                <option>Account</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              {editingId && (
                <button
                  className="reset-btn"
                  onClick={() => {
                    setEditingId(null);
                    setQuestion("");
                    setAnswer("");
                    setCategory("General");
                  }}
                >
                  Cancel
                </button>
              )}
              <button
                className="save-btn"
                onClick={saveFAQ}
              >
                {editingId ? "Update FAQ" : "Save FAQ"}
              </button>
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="dashboard-card">
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
            <div className="input-group" style={{ flex: "1", minWidth: "260px", margin: 0 }}>
              <input
                type="text"
                placeholder="Search FAQs by question or answer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="input-group" style={{ minWidth: "180px", margin: 0 }}>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="All">All Categories</option>
                {[...new Set(faqs.map(f => f.category))].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="input-group" style={{ minWidth: "160px", margin: 0 }}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Disabled">Disabled</option>
                <option value="Pinned">Pinned</option>
                <option value="Featured">Featured</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #ECE8E3" }}>
            <div style={{ display: "flex", gap: "12px", alignItems: "center", fontSize: "13px" }}>
              <button
                onClick={selectAll}
                style={{ background: "none", border: "none", color: "#1A1614", cursor: "pointer", fontWeight: 600, padding: 0 }}
              >
                Select All
              </button>
              <span style={{ color: "#D6CEC7" }}>|</span>
              <button
                onClick={clearSelection}
                style={{ background: "none", border: "none", color: "#7A6E65", cursor: "pointer", fontWeight: 500, padding: 0 }}
              >
                Clear Selection ({selectedFAQs.length})
              </button>
            </div>
            <div style={{ color: "#7A6E65", fontSize: "13px" }}>
              Showing {filteredFaqs.length} of {totalFaqs} items
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedFAQs.length > 0 && (
          <div className="dashboard-card" style={{ padding: "20px 28px", background: "#FAF8F6" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
              <div style={{ fontWeight: 600, fontSize: "14px", color: "#1A1614" }}>
                Bulk Actions ({selectedFAQs.length} selected)
              </div>

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                <button className="action-btn" onClick={bulkEnable}>Enable</button>
                <button className="action-btn" onClick={bulkDisable}>Disable</button>
                <button className="action-btn" onClick={() => bulkPin(true)}>Pin</button>
                <button className="action-btn" onClick={() => bulkPin(false)}>Unpin</button>
                <button className="action-btn action-btn-danger" onClick={bulkDelete}>Delete</button>

                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginLeft: "8px", borderLeft: "1px solid #ECE8E3", paddingLeft: "12px" }}>
                  <select
                    value={bulkCategory}
                    onChange={(e) => setBulkCategory(e.target.value)}
                    style={{ background: "white", border: "1px solid #ECE8E3", borderRadius: "10px", height: "38px", padding: "0 12px", fontSize: "13px" }}
                  >
                    <option>General</option>
                    <option>Orders</option>
                    <option>Delivery</option>
                    <option>Payments</option>
                    <option>Rewards</option>
                    <option>Account</option>
                  </select>
                  <button className="action-btn" onClick={bulkCategoryChange} style={{ background: "#1A1614", color: "white", border: "none" }}>
                    Move
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FAQ List */}
        {filteredFaqs.length === 0 ? (
          <div className="dashboard-card" style={{ textAlign: "center", padding: "60px" }}>
            <HelpCircle size={40} style={{ color: "#D6CEC7", marginBottom: "12px" }} />
            <h3 style={{ fontSize: "18px", marginBottom: "6px" }}>No FAQs found</h3>
            <p style={{ margin: 0, color: "#7A6E65" }}>Try adjusting your search criteria or filters.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "32px" }}>
            {filteredFaqs.map((faq) => (
              <div
                key={faq.id}
                className="dashboard-card"
                style={{
                  margin: 0,
                  opacity: faq.active ? 1 : 0.55
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "14px" }}>
                  <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={selectedFAQs.includes(faq.id)}
                      onChange={() => toggleSelection(faq.id)}
                      style={{ marginTop: "4px", cursor: "pointer", width: "16px", height: "16px", accentColor: "#1A1614" }}
                    />
                    <div>
                      <h3 style={{ fontSize: "17px", marginBottom: "10px" }}>{faq.question}</h3>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ background: "#FAF8F6", border: "1px solid #ECE8E3", borderRadius: "999px", padding: "3px 10px", fontSize: "11px", fontWeight: 600, color: "#5A4E46" }}>
                          {faq.category}
                        </span>
                        <span style={{ background: "#FAF8F6", border: "1px solid #ECE8E3", borderRadius: "999px", padding: "3px 10px", fontSize: "11px", fontWeight: 600, color: faq.active ? "#36543A" : "#7A6E65" }}>
                          {faq.active ? "Active" : "Disabled"}
                        </span>
                        {faq.pinned && (
                          <span style={{ background: "#FAF8F6", border: "1px solid #ECE8E3", borderRadius: "999px", padding: "3px 10px", fontSize: "11px", fontWeight: 600, color: "#8B6A2B" }}>
                            Pinned
                          </span>
                        )}
                        {faq.featured && (
                          <span style={{ background: "#FAF8F6", border: "1px solid #ECE8E3", borderRadius: "999px", padding: "3px 10px", fontSize: "11px", fontWeight: 600, color: "#8B6A2B" }}>
                            Featured
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: "12px", color: "#7A6E65", display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
                    <span>{faq.views || 0} views</span>
                    <span>•</span>
                    <span>{faq.updatedAt?.toDate?.().toLocaleDateString("en-US", { month: "short", day: "numeric" }) || "Recent"}</span>
                  </div>
                </div>

                <div style={{ paddingLeft: "28px", marginBottom: "16px" }}>
                  <p style={{ margin: 0, fontSize: "14px", color: "#7A6E65", lineHeight: "1.6", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {faq.answer}
                  </p>
                </div>

                <div style={{ borderTop: "1px solid #ECE8E3", paddingTop: "14px", marginLeft: "28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    <button className="action-btn" onClick={() => editFAQ(faq)}>
                      <Edit3 size={13} /> Edit
                    </button>
                    <button className="action-btn" onClick={() => setPreviewFAQ(faq)}>
                      <Eye size={13} /> Preview
                    </button>
                    <button className="action-btn" onClick={() => duplicateFAQ(faq)}>
                      <Copy size={13} /> Duplicate
                    </button>
                    <button className="action-btn" onClick={() => togglePinned(faq)}>
                      <Pin size={13} /> {faq.pinned ? "Unpin" : "Pin"}
                    </button>
                    <button className="action-btn" onClick={() => makeFeatured(faq)}>
                      <Star size={13} /> {faq.featured ? "Featured" : "Make Featured"}
                    </button>
                    <button className="action-btn" onClick={() => toggleFAQ(faq)}>
                      {faq.active ? "Disable" : "Enable"}
                    </button>
                    <button className="action-btn action-btn-danger" onClick={() => deleteFAQ(faq.id)}>
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>

                  <div style={{ display: "flex", gap: "4px" }}>
                    <button className="action-btn" onClick={() => moveUp(faq)} title="Move Up">↑</button>
                    <button className="action-btn" onClick={() => moveDown(faq)} title="Move Down">↓</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Analytics Section */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px" }}>
          <div className="dashboard-card" style={{ margin: 0, display: "flex", flexDirection: "column", height: "100%", boxSizing: "border-box" }}>
            <h3 style={{ fontSize: "16px", marginBottom: "14px" }}>Featured FAQ</h3>
            {currentFeaturedFAQ ? (
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
                <p style={{ fontSize: "14px", color: "#1A1614", fontWeight: 500, margin: "0 0 12px 0", lineHeight: "1.4" }}>
                  {currentFeaturedFAQ.question}
                </p>
                <span style={{ fontSize: "11px", background: "#FAF8F6", padding: "4px 10px", borderRadius: "999px", width: "fit-content", color: "#7A6E65", border: "1px solid #ECE8E3" }}>
                  {currentFeaturedFAQ.category}
                </span>
              </div>
            ) : (
              <p style={{ color: "#7A6E65", fontSize: "13px", fontStyle: "italic", margin: 0 }}>No FAQ currently featured.</p>
            )}
          </div>

          <div className="dashboard-card" style={{ margin: 0, display: "flex", flexDirection: "column", height: "100%", boxSizing: "border-box" }}>
            <h3 style={{ fontSize: "16px", marginBottom: "14px" }}>Most Viewed</h3>
            {mostViewed.length === 0 ? (
              <p style={{ color: "#7A6E65", fontSize: "13px", fontStyle: "italic", margin: 0 }}>No analytics yet.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
                {mostViewed.slice(0, 3).map((faq, idx) => (
                  <li key={faq.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "180px", color: "#1A1614" }}>
                      {idx + 1}. {faq.question}
                    </span>
                    <span style={{ color: "#7A6E65", fontWeight: 600 }}>{faq.views || 0}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="dashboard-card" style={{ margin: 0, display: "flex", flexDirection: "column", height: "100%", boxSizing: "border-box" }}>
            <h3 style={{ fontSize: "16px", marginBottom: "14px" }}>Needs Attention</h3>
            {leastHelpful.length === 0 ? (
              <p style={{ color: "#7A6E65", fontSize: "13px", fontStyle: "italic", margin: 0 }}>No analytics yet.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
                {leastHelpful.slice(0, 3).map((faq, idx) => (
                  <li key={faq.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "180px", color: "#1A1614" }}>
                      {idx + 1}. {faq.question}
                    </span>
                    <span style={{ color: "#991B1B", fontWeight: 600 }}>{faq.notHelpful || 0} flags</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="dashboard-card" style={{ margin: 0, display: "flex", flexDirection: "column", height: "100%", boxSizing: "border-box" }}>
            <h3 style={{ fontSize: "16px", marginBottom: "14px" }}>Categories Overview</h3>
            {Object.keys(categoryStats).length === 0 ? (
              <p style={{ color: "#7A6E65", fontSize: "13px", fontStyle: "italic", margin: 0 }}>No categories yet.</p>
            ) : (
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", flex: 1 }}>
                {Object.keys(categoryStats).map(cat => (
                  <span key={cat} style={{ background: "#FAF8F6", border: "1px solid #ECE8E3", color: "#7A6E65", padding: "4px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: 600, height: "fit-content" }}>
                    {cat} ({categoryStats[cat]})
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
