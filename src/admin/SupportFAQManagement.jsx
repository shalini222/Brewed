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

  return (
    <div style={{ padding: "48px 56px", maxWidth: "1360px", margin: "0 auto", position: "relative", fontFamily: "Inter, system-ui, -apple-system, sans-serif", background: "#F8F6F2", minHeight: "100vh", color: "#2C221E" }}>
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "28px",
            right: "28px",
            background: "#2C221E",
            color: "#fff",
            padding: "12px 24px",
            borderRadius: "16px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
            zIndex: 1000,
            fontWeight: 500,
            fontSize: "14px"
          }}
        >
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
            backgroundColor: "rgba(0, 0, 0, 0.4)",
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
              border: "1px solid #ECE7E1",
              borderRadius: "24px",
              padding: "40px",
              width: "100%",
              maxWidth: "760px",
              boxShadow: "0 30px 80px rgba(0,0,0,.18)",
              margin: "20px"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <span style={{ background: "#F8F6F2", border: "1px solid #ECE7E1", padding: "6px 14px", borderRadius: "999px", fontSize: "12px", fontWeight: 500, color: "#6A5E57" }}>
                {previewFAQ.category}
              </span>
              <button
                onClick={() => setPreviewFAQ(null)}
                style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#6A5E57" }}
              >
                ✕
              </button>
            </div>
            <h2 style={{ marginTop: 0, color: "#2C221E", fontSize: "24px", fontFamily: "Playfair Display, serif", fontWeight: 600, marginBottom: "16px" }}>
              {previewFAQ.question}
            </h2>
            <p style={{ color: "#6A5E57", whiteSpace: "pre-wrap", fontSize: "15px", lineHeight: "1.8", marginBottom: "32px" }}>
              {previewFAQ.answer}
            </p>
            <button
              onClick={() => setPreviewFAQ(null)}
              style={{
                height: "44px",
                padding: "0 22px",
                borderRadius: "14px",
                background: "#A97A52",
                color: "#FFFFFF",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "14px"
              }}
            >
              Close Preview
            </button>
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "20px", marginBottom: "48px" }}>
        <div>
          <h1 style={{ color: "#2C221E", fontFamily: "Playfair Display, serif", fontSize: "38px", fontWeight: 600, margin: "0 0 8px 0", letterSpacing: "-0.01em" }}>
            FAQ Management
          </h1>
          <p style={{ color: "#6A5E57", fontSize: "15px", margin: 0, fontWeight: 500 }}>
            Maintain your customer knowledge base, organize categories and optimize support quality.
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button
            onClick={exportFAQs}
            style={{
              height: "44px",
              padding: "0 20px",
              borderRadius: "14px",
              background: "#FFFFFF",
              border: "1px solid #ECE7E1",
              cursor: "pointer",
              fontWeight: 600,
              color: "#2C221E",
              fontSize: "14px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
              transition: "transform .18s ease"
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = "translateY(1px)"}
            onMouseUp={(e) => e.currentTarget.style.transform = "translateY(0)"}
          >
            Export
          </button>
          <label
            style={{
              height: "44px",
              padding: "0 20px",
              borderRadius: "14px",
              background: "#FFFFFF",
              border: "1px solid #ECE7E1",
              cursor: "pointer",
              fontWeight: 600,
              color: "#2C221E",
              fontSize: "14px",
              display: "inline-flex",
              alignItems: "center",
              boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
              transition: "transform .18s ease"
            }}
          >
            Import
            <input type="file" accept=".json" onChange={importFAQs} style={{ display: "none" }} />
          </label>
          <button
            onClick={() => window.scrollTo({ top: 300, behavior: "smooth" })}
            style={{
              height: "44px",
              padding: "0 22px",
              borderRadius: "14px",
              background: "#A97A52",
              color: "#FFFFFF",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "14px",
              boxShadow: "0 4px 12px rgba(169,122,82,0.2)",
              transition: "transform .18s ease"
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = "translateY(1px)"}
            onMouseUp={(e) => e.currentTarget.style.transform = "translateY(0)"}
          >
            + New FAQ
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
          gap: "24px",
          marginBottom: "40px"
        }}
      >
        {[
          [totalFaqs, "Total FAQs", "+12 this month", "📄"],
          [`${helpfulPercentage}%`, "Helpful Rate", "Customer satisfaction", "👍"],
          [totalViews, "Total Views", "Last 30 days", "👁"],
          [pinnedFaqsCount, "Pinned FAQs", "Prioritized visibility", "📌"]
        ].map(([value, title, subtext, icon]) => (
          <div
            key={title}
            style={{
              background: "#FFFFFF",
              border: "1px solid #ECE7E1",
              borderRadius: "24px",
              padding: "28px 32px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.02), 0 16px 40px rgba(0,0,0,0.035)",
              transition: "all .22s cubic-bezier(.2,.8,.2,1)",
              cursor: "default",
              position: "relative",
              overflow: "hidden"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.borderColor = "#DCC8B5";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.06)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.borderColor = "#ECE7E1";
              e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.02), 0 16px 40px rgba(0,0,0,0.035)";
            }}
          >
            <div style={{ position: "absolute", top: "24px", right: "24px", fontSize: "20px", opacity: 0.6 }}>
              {icon}
            </div>
            <div style={{ fontSize: "12px", letterSpacing: ".08em", textTransform: "uppercase", color: "#6A5E57", marginBottom: "10px", fontWeight: 600 }}>
              {title}
            </div>
            <div style={{ fontSize: "34px", fontWeight: 700, color: "#2C221E", marginBottom: "4px", lineHeight: 1.1 }}>
              {value}
            </div>
            <div style={{ color: "#6A5E57", fontSize: "13px", fontWeight: 500 }}>
              {subtext}
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Form */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #ECE7E1",
          borderRadius: "24px",
          padding: "36px",
          marginBottom: "40px",
          boxShadow: "0 2px 6px rgba(0,0,0,0.02), 0 16px 40px rgba(0,0,0,0.035)"
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: "28px", color: "#2C221E", fontFamily: "Playfair Display, serif", fontSize: "24px", fontWeight: 600 }}>
          {editingId ? "Edit FAQ" : "New FAQ"}
        </h2>

        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#6A5E57", marginBottom: "8px" }}>Question</label>
          <input
            type="text"
            placeholder="Type your question here..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            style={{
              width: "100%",
              height: "50px",
              padding: "0 18px",
              borderRadius: "16px",
              background: "#F8F6F2",
              border: "1px solid #ECE7E1",
              boxSizing: "border-box",
              fontSize: "15px",
              color: "#2C221E",
              outline: "none",
              transition: ".2s"
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#A97A52";
              e.target.style.boxShadow = "0 0 0 4px rgba(169,122,82,.08)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#ECE7E1";
              e.target.style.boxShadow = "none";
            }}
          />
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#6A5E57", marginBottom: "8px" }}>Answer</label>
          <textarea
            rows={5}
            placeholder="Answer (Supports line breaks & bullet lists)..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            style={{
              width: "100%",
              padding: "18px",
              borderRadius: "16px",
              background: "#F8F6F2",
              border: "1px solid #ECE7E1",
              resize: "vertical",
              boxSizing: "border-box",
              fontSize: "15px",
              color: "#2C221E",
              lineHeight: "1.8",
              outline: "none",
              transition: ".2s"
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#A97A52";
              e.target.style.boxShadow = "0 0 0 4px rgba(169,122,82,.08)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#ECE7E1";
              e.target.style.boxShadow = "none";
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "20px", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: "1", minWidth: "260px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#6A5E57", marginBottom: "8px" }}>Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                width: "100%",
                height: "50px",
                padding: "0 18px",
                borderRadius: "16px",
                background: "#F8F6F2",
                border: "1px solid #ECE7E1",
                fontSize: "15px",
                color: "#2C221E",
                outline: "none"
              }}
            >
              <option>General</option>
              <option>Orders</option>
              <option>Delivery</option>
              <option>Payments</option>
              <option>Rewards</option>
              <option>Account</option>
            </select>
          </div>

          <button
            onClick={saveFAQ}
            style={{
              height: "46px",
              padding: "0 24px",
              borderRadius: "14px",
              background: "#A97A52",
              color: "#FFFFFF",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "14px",
              boxShadow: "0 4px 12px rgba(169,122,82,0.2)",
              transition: "transform .18s ease"
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = "translateY(1px)"}
            onMouseUp={(e) => e.currentTarget.style.transform = "translateY(0)"}
          >
            {editingId ? "Update FAQ" : "Save FAQ"}
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #ECE7E1",
          borderRadius: "24px",
          padding: "28px",
          marginBottom: "32px",
          boxShadow: "0 2px 6px rgba(0,0,0,0.02), 0 16px 40px rgba(0,0,0,0.035)"
        }}
      >
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: "1", minWidth: "260px" }}>
            <input
              type="text"
              placeholder="Search FAQs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                height: "44px",
                padding: "0 16px",
                border: "1px solid #ECE7E1",
                borderRadius: "16px",
                background: "#F8F6F2",
                boxSizing: "border-box",
                fontSize: "14px",
                color: "#2C221E",
                outline: "none"
              }}
            />
          </div>

          <div style={{ minWidth: "160px" }}>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                width: "100%",
                height: "44px",
                padding: "0 16px",
                borderRadius: "16px",
                border: "1px solid #ECE7E1",
                background: "#F8F6F2",
                fontSize: "14px",
                color: "#2C221E",
                outline: "none"
              }}
            >
              <option value="All">Category ▼</option>
              {[...new Set(faqs.map(f => f.category))].map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div style={{ minWidth: "160px" }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                width: "100%",
                height: "44px",
                padding: "0 16px",
                borderRadius: "16px",
                border: "1px solid #ECE7E1",
                background: "#F8F6F2",
                fontSize: "14px",
                color: "#2C221E",
                outline: "none"
              }}
            >
              <option value="All">Status ▼</option>
              <option value="Active">Active</option>
              <option value="Disabled">Disabled</option>
              <option value="Pinned">Pinned</option>
              <option value="Featured">Featured</option>
            </select>
          </div>

          <button
            onClick={() => window.scrollTo({ top: 300, behavior: "smooth" })}
            style={{
              height: "44px",
              padding: "0 22px",
              borderRadius: "14px",
              background: "#A97A52",
              color: "#FFFFFF",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "14px",
              boxShadow: "0 4px 12px rgba(169,122,82,0.2)",
              transition: "transform .18s ease"
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = "translateY(1px)"}
            onMouseUp={(e) => e.currentTarget.style.transform = "translateY(0)"}
          >
            + New FAQ
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "18px", paddingTop: "18px", borderTop: "1px solid #ECE7E1", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <button
              onClick={selectAll}
              style={{ background: "none", border: "none", color: "#A97A52", cursor: "pointer", fontWeight: 600, padding: 0, fontSize: "13px" }}
            >
              Select All
            </button>
            <span style={{ color: "#ECE7E1" }}>|</span>
            <button
              onClick={clearSelection}
              style={{ background: "none", border: "none", color: "#6A5E57", cursor: "pointer", fontWeight: 600, padding: 0, fontSize: "13px" }}
            >
              Clear Selection ({selectedFAQs.length})
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions Card */}
      {selectedFAQs.length > 0 && (
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #ECE7E1",
            borderRadius: "24px",
            padding: "22px 28px",
            marginBottom: "32px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.02), 0 16px 40px rgba(0,0,0,0.035)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <span style={{ fontWeight: 600, color: "#2C221E", fontSize: "14px" }}>Bulk Actions</span>
              <span style={{ color: "#6A5E57", fontSize: "13px", marginLeft: "12px" }}>Selected: {selectedFAQs.length} FAQs</span>
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
              <button
                onClick={bulkEnable}
                style={{ height: "42px", padding: "0 16px", background: "#FFFFFF", color: "#2C221E", border: "1px solid #ECE7E1", borderRadius: "14px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}
              >
                Enable
              </button>
              <button
                onClick={bulkDisable}
                style={{ height: "42px", padding: "0 16px", background: "#FFFFFF", color: "#2C221E", border: "1px solid #ECE7E1", borderRadius: "14px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}
              >
                Disable
              </button>
              <button
                onClick={() => bulkPin(true)}
                style={{ height: "42px", padding: "0 16px", background: "#FFFFFF", color: "#2C221E", border: "1px solid #ECE7E1", borderRadius: "14px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}
              >
                Pin
              </button>
              <button
                onClick={() => bulkPin(false)}
                style={{ height: "42px", padding: "0 16px", background: "#FFFFFF", color: "#2C221E", border: "1px solid #ECE7E1", borderRadius: "14px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}
              >
                Unpin
              </button>
              <button
                onClick={bulkDelete}
                style={{ height: "42px", padding: "0 16px", background: "#FFF7F7", color: "#A64A4A", border: "1px solid #ECE7E1", borderRadius: "14px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}
              >
                Delete
              </button>

              <div style={{ display: "flex", gap: "6px", alignItems: "center", marginLeft: "12px", borderLeft: "1px solid #ECE7E1", paddingLeft: "16px" }}>
                <select
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value)}
                  style={{ height: "42px", padding: "0 14px", borderRadius: "14px", border: "1px solid #ECE7E1", fontSize: "13px", backgroundColor: "#F8F6F2", color: "#2C221E" }}
                >
                  <option>General</option>
                  <option>Orders</option>
                  <option>Delivery</option>
                  <option>Payments</option>
                  <option>Rewards</option>
                  <option>Account</option>
                </select>
                <button
                  onClick={bulkCategoryChange}
                  style={{ height: "42px", padding: "0 18px", background: "#A97A52", color: "#FFFFFF", border: "none", borderRadius: "14px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main List Section */}
      {loading ? (
        <p style={{ color: "#6A5E57" }}>Loading FAQs...</p>
      ) : filteredFaqs.length === 0 ? (
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #ECE7E1",
            borderRadius: "24px",
            padding: "90px 20px",
            textAlign: "center",
            color: "#6A5E57",
            boxShadow: "0 2px 6px rgba(0,0,0,0.02), 0 16px 40px rgba(0,0,0,0.035)"
          }}
        >
          <div style={{ fontSize: "36px", marginBottom: "16px" }}>📖</div>
          <h3 style={{ margin: "0 0 8px", color: "#2C221E", fontSize: "20px", fontWeight: 600 }}>No FAQs yet</h3>
          <p style={{ margin: "0 0 24px", fontSize: "15px" }}>Start building your knowledge base.</p>
          <button
            onClick={() => {
              window.scrollTo({ top: 300, behavior: "smooth" });
            }}
            style={{
              height: "44px",
              padding: "0 22px",
              borderRadius: "14px",
              background: "#A97A52",
              color: "#FFFFFF",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "14px"
            }}
          >
            Create FAQ
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            marginBottom: "48px"
          }}
        >
          {filteredFaqs.map((faq) => (
            <div
              key={faq.id}
              style={{
                background: "#FFFFFF",
                border: "1px solid #ECE7E1",
                borderRadius: "24px",
                padding: "32px",
                opacity: faq.active ? 1 : 0.6,
                boxShadow: "0 2px 6px rgba(0,0,0,0.02), 0 16px 40px rgba(0,0,0,0.035)",
                transition: "all .22s cubic-bezier(.2,.8,.2,1)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.borderColor = "#DCC8B5";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.06)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = "#ECE7E1";
                e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.02), 0 16px 40px rgba(0,0,0,0.035)";
              }}
            >
              {/* Header Section */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "16px" }}>
                <div style={{ display: "flex", gap: "14px", alignItems: "flex-start", flex: 1 }}>
                  <input
                    type="checkbox"
                    checked={selectedFAQs.includes(faq.id)}
                    onChange={() => toggleSelection(faq.id)}
                    style={{ marginTop: "5px", cursor: "pointer", width: "16px", height: "16px", accentColor: "#A97A52" }}
                  />
                  <div>
                    <h3
                      style={{
                        marginTop: 0,
                        marginBottom: "10px",
                        color: "#2C221E",
                        fontSize: "18px",
                        fontWeight: 600
                      }}
                    >
                      {faq.question}
                    </h3>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", fontSize: "12px", color: "#6A5E57" }}>
                      <span style={{ fontWeight: 500, color: "#2C221E" }}>{faq.category}</span>
                      <span>•</span>
                      <span>{faq.active ? "Active" : "Disabled"}</span>
                      {faq.pinned && (
                        <>
                          <span>•</span>
                          <span style={{ color: "#A97A52", fontWeight: 500 }}>Pinned</span>
                        </>
                      )}
                      {faq.featured && (
                        <>
                          <span>•</span>
                          <span style={{ color: "#A97A52", fontWeight: 500 }}>Featured</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "13px", color: "#6A5E57", fontWeight: 500, textAlign: "right" }}>
                  <span>{faq.views || 0} views</span>
                  <span>•</span>
                  <span>{faq.updatedAt?.toDate?.().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) || "Recent"}</span>
                </div>
              </div>

              {/* Body Section */}
              <div style={{ marginBottom: "20px", paddingLeft: "30px" }}>
                <p style={{ color: "#6A5E57", whiteSpace: "pre-wrap", fontSize: "14px", margin: 0, lineHeight: "1.8", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                  {faq.answer}
                </p>
              </div>

              <div style={{ borderTop: "1px solid #ECE7E1", marginBottom: "18px", marginLeft: "30px" }} />

              {/* Actions Section */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingLeft: "30px",
                  flexWrap: "wrap",
                  gap: "12px"
                }}
              >
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                  <button 
                    onClick={() => editFAQ(faq)}
                    style={{ height: "40px", padding: "0 16px", borderRadius: "12px", border: "1px solid #ECE7E1", background: "#FFFFFF", color: "#2C221E", cursor: "pointer", fontWeight: 600, fontSize: "13px", transition: "transform .18s ease" }}
                    onMouseDown={(e) => e.currentTarget.style.transform = "translateY(1px)"}
                    onMouseUp={(e) => e.currentTarget.style.transform = "translateY(0)"}
                  >
                    ✏ Edit
                  </button>
                  <button 
                    onClick={() => setPreviewFAQ(faq)}
                    style={{ height: "40px", padding: "0 16px", borderRadius: "12px", border: "1px solid #ECE7E1", background: "#FFFFFF", color: "#2C221E", cursor: "pointer", fontWeight: 600, fontSize: "13px", transition: "transform .18s ease" }}
                    onMouseDown={(e) => e.currentTarget.style.transform = "translateY(1px)"}
                    onMouseUp={(e) => e.currentTarget.style.transform = "translateY(0)"}
                  >
                    👁 Preview
                  </button>
                  <button 
                    onClick={() => duplicateFAQ(faq)}
                    style={{ height: "40px", padding: "0 16px", borderRadius: "12px", border: "1px solid #ECE7E1", background: "#FFFFFF", color: "#2C221E", cursor: "pointer", fontWeight: 600, fontSize: "13px", transition: "transform .18s ease" }}
                    onMouseDown={(e) => e.currentTarget.style.transform = "translateY(1px)"}
                    onMouseUp={(e) => e.currentTarget.style.transform = "translateY(0)"}
                  >
                    📄 Duplicate
                  </button>
                  <button 
                    onClick={() => togglePinned(faq)}
                    style={{ height: "40px", padding: "0 16px", borderRadius: "12px", border: "1px solid #ECE7E1", background: "#FFFFFF", color: "#2C221E", cursor: "pointer", fontWeight: 600, fontSize: "13px", transition: "transform .18s ease" }}
                    onMouseDown={(e) => e.currentTarget.style.transform = "translateY(1px)"}
                    onMouseUp={(e) => e.currentTarget.style.transform = "translateY(0)"}
                  >
                    📌 {faq.pinned ? "Unpin" : "Pin"}
                  </button>
                  <button 
                    onClick={() => makeFeatured(faq)}
                    style={{ height: "40px", padding: "0 16px", borderRadius: "12px", border: "1px solid #ECE7E1", background: "#FFFFFF", color: "#2C221E", cursor: "pointer", fontWeight: 600, fontSize: "13px", transition: "transform .18s ease" }}
                    onMouseDown={(e) => e.currentTarget.style.transform = "translateY(1px)"}
                    onMouseUp={(e) => e.currentTarget.style.transform = "translateY(0)"}
                  >
                    ⭐ {faq.featured ? "Featured" : "Make Featured"}
                  </button>
                  <button 
                    onClick={() => toggleFAQ(faq)}
                    style={{ height: "40px", padding: "0 16px", borderRadius: "12px", border: "1px solid #ECE7E1", background: "#FFFFFF", color: "#2C221E", cursor: "pointer", fontWeight: 600, fontSize: "13px", transition: "transform .18s ease" }}
                    onMouseDown={(e) => e.currentTarget.style.transform = "translateY(1px)"}
                    onMouseUp={(e) => e.currentTarget.style.transform = "translateY(0)"}
                  >
                    ⏸ {faq.active ? "Disable" : "Enable"}
                  </button>
                  <button 
                    onClick={() => deleteFAQ(faq.id)}
                    style={{ height: "40px", padding: "0 16px", borderRadius: "12px", border: "1px solid #ECE7E1", background: "#FFF7F7", color: "#A64A4A", cursor: "pointer", fontWeight: 600, fontSize: "13px", transition: "transform .18s ease" }}
                    onMouseDown={(e) => e.currentTarget.style.transform = "translateY(1px)"}
                    onMouseUp={(e) => e.currentTarget.style.transform = "translateY(0)"}
                  >
                    🗑 Delete
                  </button>
                </div>

                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    onClick={() => moveUp(faq)}
                    title="Move Up"
                    style={{
                      height: "40px",
                      padding: "0 14px",
                      borderRadius: "12px",
                      border: "1px solid #ECE7E1",
                      background: "#FFFFFF",
                      cursor: "pointer",
                      fontWeight: 600,
                      color: "#6A5E57"
                    }}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveDown(faq)}
                    title="Move Down"
                    style={{
                      height: "40px",
                      padding: "0 14px",
                      borderRadius: "12px",
                      border: "1px solid #ECE7E1",
                      background: "#FFFFFF",
                      cursor: "pointer",
                      fontWeight: 600,
                      color: "#6A5E57"
                    }}
                  >
                    ↓
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Analytics Section */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "24px",
          marginBottom: "48px"
        }}
      >
        {/* Panel 1: Featured FAQ */}
        <div style={{ background: "#FFFFFF", border: "1px solid #ECE7E1", borderRadius: "24px", padding: "32px", boxShadow: "0 2px 6px rgba(0,0,0,0.02), 0 16px 40px rgba(0,0,0,0.035)", display: "flex", flexDirection: "column", height: "100%", boxSizing: "border-box" }}>
          <h3 style={{ marginTop: 0, marginBottom: "16px", color: "#2C221E", fontSize: "16px", fontWeight: 600 }}>
            Featured FAQ
          </h3>
          {currentFeaturedFAQ ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 500, color: "#2C221E", fontSize: "14px", marginBottom: "12px", lineHeight: "1.5" }}>{currentFeaturedFAQ.question}</div>
              <div style={{ fontSize: "12px", background: "#F8F6F2", padding: "4px 10px", borderRadius: "999px", display: "inline-block", width: "fit-content", color: "#6A5E57", border: "1px solid #ECE7E1" }}>{currentFeaturedFAQ.category}</div>
            </div>
          ) : (
            <p style={{ color: "#6A5E57", fontSize: "13px", fontStyle: "italic", margin: 0 }}>No FAQ is currently featured.</p>
          )}
        </div>

        {/* Panel 2: Most Viewed */}
        <div style={{ background: "#FFFFFF", border: "1px solid #ECE7E1", borderRadius: "24px", padding: "32px", boxShadow: "0 2px 6px rgba(0,0,0,0.02), 0 16px 40px rgba(0,0,0,0.035)", display: "flex", flexDirection: "column", height: "100%", boxSizing: "border-box" }}>
          <h3 style={{ marginTop: 0, marginBottom: "16px", color: "#2C221E", fontSize: "16px", fontWeight: 600 }}>
            Most Viewed
          </h3>
          {mostViewed.length === 0 ? (
            <p style={{ color: "#6A5E57", fontSize: "13px", fontStyle: "italic", margin: 0 }}>No analytics yet.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
              {mostViewed.slice(0, 3).map((faq, idx) => (
                <li key={faq.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", color: "#2C221E" }}>
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "170px" }}>{idx + 1}. {faq.question}</span>
                  <span style={{ color: "#6A5E57", fontWeight: 500 }}>{faq.views || 0}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Panel 3: Needs Attention */}
        <div style={{ background: "#FFFFFF", border: "1px solid #ECE7E1", borderRadius: "24px", padding: "32px", boxShadow: "0 2px 6px rgba(0,0,0,0.02), 0 16px 40px rgba(0,0,0,0.035)", display: "flex", flexDirection: "column", height: "100%", boxSizing: "border-box" }}>
          <h3 style={{ marginTop: 0, marginBottom: "16px", color: "#2C221E", fontSize: "16px", fontWeight: 600 }}>
            Needs Attention
          </h3>
          {leastHelpful.length === 0 ? (
            <p style={{ color: "#6A5E57", fontSize: "13px", fontStyle: "italic", margin: 0 }}>No analytics yet.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
              {leastHelpful.slice(0, 3).map((faq, idx) => (
                <li key={faq.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", color: "#2C221E" }}>
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "170px" }}>{idx + 1}. {faq.question}</span>
                  <span style={{ color: "#A64A4A", fontWeight: 500 }}>{faq.notHelpful || 0} negative</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Panel 4: Categories */}
        <div style={{ background: "#FFFFFF", border: "1px solid #ECE7E1", borderRadius: "24px", padding: "32px", boxShadow: "0 2px 6px rgba(0,0,0,0.02), 0 16px 40px rgba(0,0,0,0.035)", display: "flex", flexDirection: "column", height: "100%", boxSizing: "border-box" }}>
          <h3 style={{ marginTop: 0, marginBottom: "16px", color: "#2C221E", fontSize: "16px", fontWeight: 600 }}>
            Categories
          </h3>
          {Object.keys(categoryStats).length === 0 ? (
            <p style={{ color: "#6A5E57", fontSize: "13px", fontStyle: "italic", margin: 0 }}>No categories yet.</p>
          ) : (
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {Object.keys(categoryStats).map(cat => (
                <span key={cat} style={{ background: "#F8F6F2", border: "1px solid #ECE7E1", color: "#6A5E57", padding: "6px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: 500 }}>
                  {cat} ({categoryStats[cat]})
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
