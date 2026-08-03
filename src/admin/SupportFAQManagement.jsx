import { useState, useEffect } from "react";
import { db } from "../firebase";

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

  const saveFAQ = async () => {
    if (!question.trim() || !answer.trim()) return;

    try {
      if (editingId) {
        await updateDoc(doc(db, "supportFAQs", editingId), {
          question,
          answer,
          category,
          updatedAt: serverTimestamp()
        });
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
          updatedAt: serverTimestamp()
        });
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
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.log(err);
    }
  };

  const togglePinned = async (faq) => {
    try {
      await updateDoc(doc(db, "supportFAQs", faq.id), {
        pinned: !faq.pinned,
        updatedAt: serverTimestamp()
      });
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
        updatedAt: serverTimestamp()
      });
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
          updatedAt: serverTimestamp()
        });
      }

      await updateDoc(doc(db, "supportFAQs", faq.id), {
        featured: !faq.featured,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.log(err);
    }
  };

  const deleteFAQ = async (id) => {
    const confirmed = window.confirm("Delete this FAQ?");
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "supportFAQs", id));
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
      await updateDoc(doc(db, "supportFAQs", current.id), {
        sortOrder: previous.sortOrder,
        updatedAt: serverTimestamp()
      });

      await updateDoc(doc(db, "supportFAQs", previous.id), {
        sortOrder: current.sortOrder,
        updatedAt: serverTimestamp()
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
      await updateDoc(doc(db, "supportFAQs", current.id), {
        sortOrder: next.sortOrder,
        updatedAt: serverTimestamp()
      });

      await updateDoc(doc(db, "supportFAQs", next.id), {
        sortOrder: current.sortOrder,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.log(err);
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
  const totalCategories = [...new Set(faqs.map(faq => faq.category))].length;

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
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ color: "#2C221E", fontFamily: "Playfair Display, serif" }}>
        Admin FAQ Management
      </h1>

      {previewFAQ && (
        <div
          style={{
            background: "#FAF6F0",
            border: "1px solid #E8DED2",
            borderRadius: "16px",
            padding: "24px",
            marginBottom: "24px"
          }}
        >
          <h2 style={{ marginTop: 0, color: "#2C221E" }}>{previewFAQ.question}</h2>
          <p style={{ color: "#6B5E55", whiteSpace: "pre-wrap" }}>{previewFAQ.answer}</p>

          <button
            onClick={() => setPreviewFAQ(null)}
            style={{
              background: "#C4956A",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              padding: "10px 18px",
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            Close Preview
          </button>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
          gap: "16px",
          marginBottom: "24px"
        }}
      >
        {[
          ["📚 Total FAQs", totalFaqs],
          ["✅ Active", activeFaqs],
          ["🚫 Disabled", disabledFaqs],
          ["📌 Pinned", pinnedFaqsCount],
          ["⭐ Featured", featuredFaqsCount],
          ["👁 Total Views", totalViews],
          ["👍 Helpful Rate", `${helpfulPercentage}%`],
          ["📂 Categories", totalCategories]
        ].map(([title, value]) => (
          <div
            key={title}
            style={{
              background: "#fff",
              border: "1px solid #E8DED2",
              borderRadius: "16px",
              padding: "20px"
            }}
          >
            <div
              style={{
                color: "#9A8C82",
                fontSize: "13px",
                marginBottom: "8px"
              }}
            >
              {title}
            </div>

            <div
              style={{
                fontSize: "26px",
                fontWeight: 700,
                color: "#2C221E"
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #E8DED2",
          borderRadius: "18px",
          padding: "20px",
          marginBottom: "24px"
        }}
      >
        <h2
          style={{
            marginTop: 0,
            color: "#2C221E",
            fontFamily: "Playfair Display, serif"
          }}
        >
          {editingId ? "Edit FAQ" : "Add FAQ"}
        </h2>

        <input
          type="text"
          placeholder="Question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "12px",
            borderRadius: "10px",
            border: "1px solid #E8DED2",
            boxSizing: "border-box"
          }}
        />

        <textarea
          rows={5}
          placeholder="Answer (Supports line breaks & bullet lists)"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "12px",
            borderRadius: "10px",
            border: "1px solid #E8DED2",
            resize: "vertical",
            boxSizing: "border-box"
          }}
        />

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "10px",
            border: "1px solid #E8DED2",
            marginBottom: "16px"
          }}
        >
          <option>General</option>
          <option>Orders</option>
          <option>Delivery</option>
          <option>Payments</option>
          <option>Rewards</option>
          <option>Account</option>
        </select>

        <button
          onClick={saveFAQ}
          style={{
            background: "#C4956A",
            color: "#fff",
            border: "none",
            borderRadius: "10px",
            padding: "12px 22px",
            cursor: "pointer",
            fontWeight: 600
          }}
        >
          {editingId ? "Update FAQ" : "Add FAQ"}
        </button>
      </div>

      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search FAQs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: "200px",
            padding: "12px",
            border: "1px solid #E8DED2",
            borderRadius: "10px",
            boxSizing: "border-box"
          }}
        />

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{
            padding: "12px",
            borderRadius: "10px",
            border: "1px solid #E8DED2"
          }}
        >
          <option value="All">All Categories</option>
          {[...new Set(faqs.map(f => f.category))].map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: "12px",
            borderRadius: "10px",
            border: "1px solid #E8DED2"
          }}
        >
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="Disabled">Disabled</option>
          <option value="Pinned">Pinned</option>
          <option value="Featured">Featured</option>
        </select>
      </div>

      {loading ? (
        <p>Loading FAQs...</p>
      ) : filteredFaqs.length === 0 ? (
        <div
          style={{
            background: "#fff",
            border: "1px solid #E8DED2",
            borderRadius: "16px",
            padding: "40px",
            textAlign: "center",
            color: "#9A8C82"
          }}
        >
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>🔍</div>
          <h3 style={{ margin: "0 0 8px", color: "#2C221E" }}>No FAQs found</h3>
          <p style={{ margin: 0 }}>Try another search or filter.</p>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px"
          }}
        >
          {filteredFaqs.map((faq) => (
            <div
              key={faq.id}
              style={{
                background: "#fff",
                border: "1px solid #E8DED2",
                borderRadius: "16px",
                padding: "18px",
                opacity: faq.active ? 1 : 0.6
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <h3
                  style={{
                    marginTop: 0,
                    color: "#2C221E"
                  }}
                >
                  {faq.question}
                </h3>
                <span
                  style={{
                    fontSize: "11px",
                    color: "#9A8C82",
                    cursor: "pointer"
                  }}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(faq.id);
                      alert("Copied FAQ ID: " + faq.id);
                    } catch (e) {
                      console.log(e);
                    }
                  }}
                >
                  ID: {faq.id.slice(0, 6)}... 📋
                </span>
              </div>

              <p style={{ color: "#6B5E55", whiteSpace: "pre-wrap" }}>
                {faq.answer}
              </p>

              <div
                style={{
                  display: "flex",
                  gap: "16px",
                  marginTop: "12px",
                  fontSize: "12px",
                  color: "#9A8C82",
                  flexWrap: "wrap"
                }}
              >
                <span>Updated: {faq.updatedAt?.toDate?.().toLocaleString() || "Never"}</span>
                <span>👁 {faq.views || 0} Views</span>
                <span>👍 {faq.helpful || 0} Helpful</span>
                <span>👎 {faq.notHelpful || 0} Not Helpful</span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "16px",
                  flexWrap: "wrap",
                  gap: "10px"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    alignItems: "center",
                    flexWrap: "wrap"
                  }}
                >
                  <span
                    style={{
                      background: "#FAF6F0",
                      padding: "6px 12px",
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
                      padding: "6px 12px",
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
                        padding: "6px 12px",
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
                        padding: "6px 12px",
                        borderRadius: "999px",
                        fontSize: "12px",
                        fontWeight: 600
                      }}
                    >
                      Featured
                    </span>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    flexWrap: "wrap"
                  }}
                >
                  <button
                    onClick={() => moveUp(faq)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "6px",
                      border: "1px solid #E8DED2",
                      background: "#fff",
                      cursor: "pointer"
                    }}
                  >
                    ⬆
                  </button>

                  <button
                    onClick={() => moveDown(faq)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "6px",
                      border: "1px solid #E8DED2",
                      background: "#fff",
                      cursor: "pointer"
                    }}
                  >
                    ⬇
                  </button>

                  <button 
                    onClick={() => togglePinned(faq)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "1px solid #E8DED2",
                      background: "#fff",
                      cursor: "pointer"
                    }}
                  >
                    {faq.pinned ? "⭐ Unpin" : "📌 Pin"}
                  </button>

                  <button 
                    onClick={() => makeFeatured(faq)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "1px solid #E8DED2",
                      background: "#fff",
                      cursor: "pointer"
                    }}
                  >
                    {faq.featured ? "★ Featured" : "☆ Make Featured"}
                  </button>

                  <button 
                    onClick={() => duplicateFAQ(faq)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "1px solid #E8DED2",
                      background: "#fff",
                      cursor: "pointer"
                    }}
                  >
                    📋 Duplicate
                  </button>

                  <button 
                    onClick={() => setPreviewFAQ(faq)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "1px solid #E8DED2",
                      background: "#fff",
                      cursor: "pointer"
                    }}
                  >
                    👁 Preview
                  </button>

                  <button 
                    onClick={() => editFAQ(faq)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "1px solid #E8DED2",
                      background: "#fff",
                      cursor: "pointer"
                    }}
                  >
                    Edit
                  </button>

                  <button 
                    onClick={() => toggleFAQ(faq)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "1px solid #E8DED2",
                      background: "#fff",
                      cursor: "pointer"
                    }}
                  >
                    {faq.active ? "Disable" : "Enable"}
                  </button>

                  <button 
                    onClick={() => deleteFAQ(faq.id)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "1px solid #ffcccc",
                      background: "#fff0f0",
                      color: "#c00",
                      cursor: "pointer"
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
