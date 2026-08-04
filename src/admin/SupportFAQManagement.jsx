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
      const proceed = window.confirm("⚠️ Similar FAQ already exists. Do you still want to save?");
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
  const activeFaqs = faqs.filter(faq => faq.active).length;
  const disabledFaqs = faqs.filter(faq => !faq.active).length;
  const pinnedFaqsCount = faqs.filter(faq => faq.pinned).length;
  const featuredFaqsCount = faqs.filter(faq => faq.featured).length;
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
    <div style={{ padding: "32px", maxWidth: "1300px", margin: "0 auto", position: "relative" }}>
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            background: "#2C221E",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: "10px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 1000,
            fontWeight: 600,
            fontSize: "14px"
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Preview Modal Overlay */}
      {previewFAQ && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1100
          }}
          onClick={() => setPreviewFAQ(null)}
        >
          <div
            style={{
              background: "#fff",
              border: "1px solid #E8DED2",
              borderRadius: "18px",
              padding: "32px",
              width: "100%",
              maxWidth: "600px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
              margin: "20px"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <span style={{ background: "#FAF6F0", padding: "4px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: 600, color: "#6B5E55" }}>
                {previewFAQ.category}
              </span>
              <button
                onClick={() => setPreviewFAQ(null)}
                style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#9A8C82" }}
              >
                ✕
              </button>
            </div>
            <h2 style={{ marginTop: 0, color: "#2C221E", fontSize: "20px", fontFamily: "Playfair Display, serif" }}>
              {previewFAQ.question}
            </h2>
            <p style={{ color: "#6B5E55", whiteSpace: "pre-wrap", fontSize: "15px", lineHeight: "1.6", marginBottom: "24px" }}>
              {previewFAQ.answer}
            </p>
            <button
              onClick={() => setPreviewFAQ(null)}
              style={{
                background: "#C4956A",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                padding: "10px 20px",
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

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "32px" }}>
        <h1 style={{ color: "#2C221E", fontFamily: "Playfair Display, serif", fontSize: "34px", margin: 0 }}>
          Admin FAQ Management
        </h1>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={exportFAQs}
            style={{
              background: "#fff",
              border: "1px solid #E8DED2",
              borderRadius: "10px",
              padding: "10px 16px",
              cursor: "pointer",
              fontWeight: 600,
              color: "#6B5E55"
            }}
          >
            ⬇ Export JSON
          </button>
          <label
            style={{
              background: "#fff",
              border: "1px solid #E8DED2",
              borderRadius: "10px",
              padding: "10px 16px",
              cursor: "pointer",
              fontWeight: 600,
              color: "#6B5E55",
              display: "inline-block"
            }}
          >
            📂 Import JSON
            <input type="file" accept=".json" onChange={importFAQs} style={{ display: "none" }} />
          </label>
        </div>
      </div>

      {/* Analytics Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: "20px",
          marginBottom: "28px"
        }}
      >
        {[
          ["📚", totalFaqs, "Total FAQs"],
          ["✅", activeFaqs, "Active"],
          ["🚫", disabledFaqs, "Disabled"],
          ["📌", pinnedFaqsCount, "Pinned"],
          ["⭐", featuredFaqsCount, "Featured"],
          ["👁", totalViews, "Total Views"],
          ["👍", `${helpfulPercentage}%`, "Helpful Rate"],
          ["💬", totalVotes, "Feedback Received"]
        ].map(([icon, value, title]) => (
          <div
            key={title}
            style={{
              background: "#fff",
              border: "1px solid #E8DED2",
              borderRadius: "18px",
              padding: "24px",
              boxShadow: "0 6px 16px rgba(0,0,0,0.04)",
              transition: "0.2s",
              cursor: "default"
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
          >
            <div style={{ fontSize: "24px", marginBottom: "12px" }}>{icon}</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#2C221E", marginBottom: "4px" }}>
              {value}
            </div>
            <div style={{ color: "#9A8C82", fontSize: "13px" }}>
              {title}
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Form */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #E8DED2",
          borderRadius: "18px",
          padding: "28px",
          marginBottom: "28px",
          boxShadow: "0 6px 16px rgba(0,0,0,0.04)"
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: "20px", color: "#2C221E", fontFamily: "Playfair Display, serif", fontSize: "24px" }}>
          {editingId ? "Edit FAQ" : "Add FAQ"}
        </h2>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#6B5E55", marginBottom: "6px" }}>Question</label>
          <input
            type="text"
            placeholder="Type your question here..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid #E8DED2",
              boxSizing: "border-box",
              fontSize: "15px"
            }}
          />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#6B5E55", marginBottom: "6px" }}>Answer</label>
          <textarea
            rows={5}
            placeholder="Answer (Supports line breaks & bullet lists)..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid #E8DED2",
              resize: "vertical",
              boxSizing: "border-box",
              fontSize: "15px"
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "16px", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: "1", minWidth: "250px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#6B5E55", marginBottom: "6px" }}>Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                border: "1px solid #E8DED2",
                backgroundColor: "#fff",
                fontSize: "15px"
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
              background: "#C4956A",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              padding: "12px 24px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "15px",
              height: "46px"
            }}
          >
            {editingId ? "Update FAQ" : "Save FAQ"}
          </button>
        </div>
      </div>

      {/* Search & Filter Section */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #E8DED2",
          borderRadius: "18px",
          padding: "24px",
          marginBottom: "28px",
          boxShadow: "0 6px 16px rgba(0,0,0,0.04)"
        }}
      >
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: "7", minWidth: "280px" }}>
            <input
              type="text"
              placeholder="Search FAQ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #E8DED2",
                borderRadius: "10px",
                boxSizing: "border-box",
                fontSize: "15px"
              }}
            />
          </div>

          <div style={{ flex: "2", minWidth: "160px" }}>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                border: "1px solid #E8DED2",
                backgroundColor: "#fff",
                fontSize: "14px"
              }}
            >
              <option value="All">Category ▼</option>
              {[...new Set(faqs.map(f => f.category))].map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: "2", minWidth: "160px" }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                border: "1px solid #E8DED2",
                backgroundColor: "#fff",
                fontSize: "14px"
              }}
            >
              <option value="All">Status ▼</option>
              <option value="Active">Active</option>
              <option value="Disabled">Disabled</option>
              <option value="Pinned">Pinned</option>
              <option value="Featured">Featured</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #E8DED2", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              onClick={selectAll}
              style={{ background: "none", border: "none", color: "#C4956A", cursor: "pointer", fontWeight: 600, padding: 0 }}
            >
              ☑ Select All
            </button>
            <span style={{ color: "#E8DED2" }}>|</span>
            <button
              onClick={clearSelection}
              style={{ background: "none", border: "none", color: "#9A8C82", cursor: "pointer", fontWeight: 600, padding: 0 }}
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
            background: "#FAF6F0",
            border: "1px solid #E8DED2",
            borderRadius: "18px",
            padding: "20px 24px",
            marginBottom: "28px",
            boxShadow: "0 6px 16px rgba(0,0,0,0.04)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <span style={{ fontWeight: 700, color: "#2C221E", fontSize: "15px" }}>Bulk Actions</span>
              <span style={{ color: "#9A8C82", fontSize: "13px", marginLeft: "12px" }}>Selected: {selectedFAQs.length} FAQs</span>
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
              <button
                onClick={bulkEnable}
                style={{ padding: "8px 14px", background: "#E8F5E9", color: "#2E7D32", border: "1px solid #c8e6c9", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}
              >
                Enable
              </button>
              <button
                onClick={bulkDisable}
                style={{ padding: "8px 14px", background: "#FDECEC", color: "#C62828", border: "1px solid #ffcdd2", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}
              >
                Disable
              </button>
              <button
                onClick={() => bulkPin(true)}
                style={{ padding: "8px 14px", background: "#FFF8E1", color: "#F57F17", border: "1px solid #ffe082", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}
              >
                Pin
              </button>
              <button
                onClick={() => bulkPin(false)}
                style={{ padding: "8px 14px", background: "#fff", color: "#6B5E55", border: "1px solid #E8DED2", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}
              >
                Unpin
              </button>
              <button
                onClick={bulkDelete}
                style={{ padding: "8px 14px", background: "#FFE8E8", color: "#c00", border: "1px solid #ff9999", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}
              >
                Delete
              </button>

              <div style={{ display: "flex", gap: "6px", alignItems: "center", marginLeft: "12px", borderLeft: "1px solid #E8DED2", paddingLeft: "16px" }}>
                <select
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #E8DED2", fontSize: "13px", backgroundColor: "#fff" }}
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
                  style={{ padding: "8px 14px", background: "#C4956A", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}
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
        <p>Loading FAQs...</p>
      ) : filteredFaqs.length === 0 ? (
        <div
          style={{
            background: "#fff",
            border: "1px solid #E8DED2",
            borderRadius: "18px",
            padding: "60px 20px",
            textAlign: "center",
            color: "#9A8C82",
            boxShadow: "0 6px 16px rgba(0,0,0,0.04)"
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📄</div>
          <h3 style={{ margin: "0 0 8px", color: "#2C221E", fontSize: "20px" }}>No FAQs Found</h3>
          <p style={{ margin: "0 0 20px", fontSize: "15px" }}>Try another search or create your first FAQ.</p>
          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            style={{
              background: "#C4956A",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              padding: "10px 20px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "14px"
            }}
          >
            Add FAQ
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            marginBottom: "40px"
          }}
        >
          {filteredFaqs.map((faq) => (
            <div
              key={faq.id}
              style={{
                background: "#fff",
                border: "1px solid #E8DED2",
                borderRadius: "18px",
                padding: "24px",
                opacity: faq.active ? 1 : 0.6,
                boxShadow: "0 6px 16px rgba(0,0,0,0.04)"
              }}
            >
              {/* Header Section */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "16px" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", flex: 1 }}>
                  <input
                    type="checkbox"
                    checked={selectedFAQs.includes(faq.id)}
                    onChange={() => toggleSelection(faq.id)}
                    style={{ marginTop: "6px", cursor: "pointer", width: "16px", height: "16px" }}
                  />
                  <div>
                    <h3
                      style={{
                        marginTop: 0,
                        marginBottom: "10px",
                        color: "#2C221E",
                        fontSize: "20px",
                        fontFamily: "Playfair Display, serif"
                      }}
                    >
                      {faq.question}
                    </h3>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                      <span
                        style={{
                          background: "#FAF6F0",
                          color: "#6B5E55",
                          padding: "4px 10px",
                          borderRadius: "999px",
                          fontSize: "12px",
                          fontWeight: 600
                        }}
                      >
                        {faq.category}
                      </span>
                      <span
                        style={{
                          background: faq.active ? "#E8F5E9" : "#FDECEC",
                          color: faq.active ? "#2E7D32" : "#C62828",
                          padding: "4px 10px",
                          borderRadius: "999px",
                          fontSize: "12px",
                          fontWeight: 600
                        }}
                      >
                        {faq.active ? "Active" : "Disabled"}
                      </span>
                      {faq.pinned && (
                        <span
                          style={{
                            background: "#FFF8E1",
                            color: "#F57F17",
                            padding: "4px 10px",
                            borderRadius: "999px",
                            fontSize: "12px",
                            fontWeight: 600
                          }}
                        >
                          Pinned
                        </span>
                      )}
                      {faq.featured && (
                        <span
                          style={{
                            background: "#E1F5FE",
                            color: "#0288D1",
                            padding: "4px 10px",
                            borderRadius: "999px",
                            fontSize: "12px",
                            fontWeight: 600
                          }}
                        >
                          Featured
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#9A8C82",
                      cursor: "pointer",
                      background: "#FAF6F0",
                      padding: "4px 8px",
                      borderRadius: "6px"
                    }}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(faq.id);
                        showToast("Copied FAQ ID to clipboard!");
                      } catch (e) {
                        console.log(e);
                      }
                    }}
                  >
                    ID: {faq.id.slice(0, 6)}... 📋
                  </span>
                </div>
              </div>

              {/* Body Section */}
              <div style={{ marginBottom: "16px", paddingLeft: "28px" }}>
                <p style={{ color: "#6B5E55", whiteSpace: "pre-wrap", fontSize: "15px", margin: 0, lineHeight: "1.6" }}>
                  {faq.answer}
                </p>
              </div>

              {/* Footer Section (Metadata) */}
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  marginBottom: "20px",
                  paddingLeft: "28px",
                  fontSize: "12px",
                  color: "#6B5E55",
                  flexWrap: "wrap",
                  alignItems: "center"
                }}
              >
                <span style={{ background: "#FAF6F0", border: "1px solid #E8DED2", padding: "4px 10px", borderRadius: "8px" }}>
                  👁 {faq.views || 0} Views
                </span>
                <span style={{ background: "#FAF6F0", border: "1px solid #E8DED2", padding: "4px 10px", borderRadius: "8px" }}>
                  👍 {faq.helpful || 0} Helpful
                </span>
                <span style={{ background: "#FAF6F0", border: "1px solid #E8DED2", padding: "4px 10px", borderRadius: "8px" }}>
                  👎 {faq.notHelpful || 0} Not Helpful
                </span>
                <span style={{ background: "#FAF6F0", border: "1px solid #E8DED2", padding: "4px 10px", borderRadius: "8px" }}>
                  🕒 {faq.updatedAt?.toDate?.().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) || "Recent"} by {faq.updatedBy || "Olivia"}
                </span>
              </div>

              {/* Actions Section */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderTop: "1px solid #E8DED2",
                  paddingTop: "16px",
                  paddingLeft: "28px",
                  flexWrap: "wrap",
                  gap: "12px"
                }}
              >
                {/* Row 1 & Row 2 actions grouped nicely with assigned button colors */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                  <button 
                    onClick={() => editFAQ(faq)}
                    style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid #E8DED2", background: "#FFF8E1", color: "#8D6E63", cursor: "pointer", fontWeight: 600, fontSize: "13px" }}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => setPreviewFAQ(faq)}
                    style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid #E8DED2", background: "#EDF5FF", color: "#1565C0", cursor: "pointer", fontWeight: 600, fontSize: "13px" }}
                  >
                    Preview
                  </button>
                  <button 
                    onClick={() => duplicateFAQ(faq)}
                    style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid #E8DED2", background: "#F5F3FF", color: "#5E35B1", cursor: "pointer", fontWeight: 600, fontSize: "13px" }}
                  >
                    Duplicate
                  </button>
                  <button 
                    onClick={() => togglePinned(faq)}
                    style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid #E8DED2", background: "#fff", color: "#6B5E55", cursor: "pointer", fontWeight: 600, fontSize: "13px" }}
                  >
                    {faq.pinned ? "Unpin" : "Pin"}
                  </button>
                  <button 
                    onClick={() => makeFeatured(faq)}
                    style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid #E8DED2", background: "#fff", color: "#6B5E55", cursor: "pointer", fontWeight: 600, fontSize: "13px" }}
                  >
                    {faq.featured ? "Featured" : "Make Featured"}
                  </button>
                  <button 
                    onClick={() => toggleFAQ(faq)}
                    style={{ 
                      padding: "8px 14px", 
                      borderRadius: "8px", 
                      border: "1px solid #E8DED2", 
                      background: faq.active ? "#FDECEC" : "#E8F5E9", 
                      color: faq.active ? "#C62828" : "#2E7D32", 
                      cursor: "pointer", 
                      fontWeight: 600, 
                      fontSize: "13px" 
                    }}
                  >
                    {faq.active ? "Disable" : "Enable"}
                  </button>
                  <button 
                    onClick={() => deleteFAQ(faq.id)}
                    style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid #ff9999", background: "#FFE8E8", color: "#c00", cursor: "pointer", fontWeight: 600, fontSize: "13px" }}
                  >
                    Delete
                  </button>
                </div>

                {/* Move arrows pushed to the far right */}
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    onClick={() => moveUp(faq)}
                    title="Move Up"
                    style={{
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid #E8DED2",
                      background: "#fff",
                      cursor: "pointer",
                      fontWeight: 600
                    }}
                  >
                    ⬆
                  </button>
                  <button
                    onClick={() => moveDown(faq)}
                    title="Move Down"
                    style={{
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid #E8DED2",
                      background: "#fff",
                      cursor: "pointer",
                      fontWeight: 600
                    }}
                  >
                    ⬇
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
          background: "#fff",
          border: "1px solid #E8DED2",
          borderRadius: "18px",
          padding: "28px",
          marginBottom: "40px",
          boxShadow: "0 6px 16px rgba(0,0,0,0.04)"
        }}
      >
        <h2 style={{ marginTop: 0, color: "#2C221E", fontFamily: "Playfair Display, serif", fontSize: "24px" }}>
          FAQ Analytics
        </h2>

        {totalFaqs === 0 ? (
          <p style={{ color: "#9A8C82", fontStyle: "italic", margin: 0, fontSize: "15px" }}>No analytics yet.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: "20px", marginTop: "20px" }}>
            
            {/* Card 1 */}
            <div style={{ background: "#FAF6F0", border: "1px solid #E8DED2", borderRadius: "16px", padding: "18px", minHeight: "260px" }}>
              <h3 style={{ marginTop: 0, marginBottom: "16px", color: "#2C221E", fontSize: "16px", fontWeight: 700, borderBottom: "1px solid #E8DED2", paddingBottom: "10px" }}>
                ⭐ Featured FAQ
              </h3>
              {currentFeaturedFAQ ? (
                <div style={{ background: "#fff", border: "1px solid #E8DED2", borderRadius: "12px", padding: "14px", marginBottom: "20px", boxShadow: "0 2px 6px rgba(0,0,0,0.05)" }}>
                  <div style={{ fontWeight: 600, color: "#2C221E", fontSize: "14px" }}>{currentFeaturedFAQ.question}</div>
                  <div style={{ fontSize: "12px", color: "#9A8C82", marginTop: "4px" }}>Category: {currentFeaturedFAQ.category}</div>
                </div>
              ) : (
                <p style={{ color: "#9A8C82", fontSize: "13px", fontStyle: "italic", marginBottom: "20px" }}>No FAQ is currently featured.</p>
              )}

              <h3 style={{ marginTop: 0, marginBottom: "16px", color: "#2C221E", fontSize: "16px", fontWeight: 700, borderBottom: "1px solid #E8DED2", paddingBottom: "10px" }}>
                🏆 Most Viewed FAQs
              </h3>
              {mostViewed.length === 0 ? (
                <p style={{ color: "#9A8C82", fontSize: "13px", fontStyle: "italic" }}>No analytics yet.</p>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {mostViewed.map(faq => (
                    <li key={faq.id} style={{ background: "#fff", border: "1px solid #E8DED2", borderRadius: "10px", padding: "10px", marginBottom: "10px" }}>
                      <span style={{ fontWeight: 600, color: "#2C221E", fontSize: "13px" }}>{faq.question}</span>
                      <div style={{ fontSize: "12px", color: "#9A8C82", marginTop: "2px" }}>👁 {faq.views || 0} views</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Card 2 */}
            <div style={{ background: "#FAF6F0", border: "1px solid #E8DED2", borderRadius: "16px", padding: "18px", minHeight: "260px" }}>
              <h3 style={{ marginTop: 0, marginBottom: "16px", color: "#2C221E", fontSize: "16px", fontWeight: 700, borderBottom: "1px solid #E8DED2", paddingBottom: "10px" }}>
                ⚠️ Needs Improvement (Most Not Helpful)
              </h3>
              {leastHelpful.length === 0 ? (
                <p style={{ color: "#9A8C82", fontSize: "13px", fontStyle: "italic" }}>No analytics yet.</p>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {leastHelpful.map(faq => (
                    <li key={faq.id} style={{ background: "#fff", border: "1px solid #F3D6D6", borderRadius: "10px", padding: "10px", marginBottom: "10px" }}>
                      <span style={{ fontWeight: 600, color: "#2C221E", fontSize: "13px" }}>{faq.question}</span>
                      <div style={{ fontSize: "12px", color: "#C62828", marginTop: "2px" }}>👎 {faq.notHelpful || 0} not helpful</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Card 3 */}
            <div style={{ background: "#FAF6F0", border: "1px solid #E8DED2", borderRadius: "16px", padding: "18px", minHeight: "260px" }}>
              <h3 style={{ marginTop: 0, marginBottom: "16px", color: "#2C221E", fontSize: "16px", fontWeight: 700, borderBottom: "1px solid #E8DED2", paddingBottom: "10px" }}>
                📂 Category Breakdown
              </h3>
              {Object.keys(categoryStats).length === 0 ? (
                <p style={{ color: "#9A8C82", fontSize: "13px", fontStyle: "italic" }}>No categories yet.</p>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {Object.entries(categoryStats).map(([cat, count]) => (
                    <li key={cat} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", padding: "10px 12px", borderRadius: "10px", marginBottom: "10px", border: "1px solid #E8DED2" }}>
                      <span style={{ fontWeight: 600, color: "#2C221E", fontSize: "13px" }}>{cat}</span>
                      <span style={{ background: "#C4956A", color: "#fff", padding: "4px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 600 }}>
                        {count}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
