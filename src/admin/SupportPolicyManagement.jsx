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
  serverTimestamp,
} from "firebase/firestore";

export default function SupportPolicyManagement() {
  const [policies, setPolicies] = useState([]);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("General");
  const [content, setContent] = useState("");
  const [version, setVersion] = useState("1.0");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [published, setPublished] = useState(false);

  const [editingId, setEditingId] = useState(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [previewPolicy, setPreviewPolicy] = useState(null);
  const [toastMessage, setToastMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage("");
    }, 3000);
  };

  const getCurrentAdminName = () => {
    return (
      auth.currentUser?.displayName ||
      auth.currentUser?.email ||
      "Olivia"
    );
  };

  useEffect(() => {
    const q = query(
      collection(db, "supportPolicies"),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setPolicies(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
        );
        setLoading(false);
      },
      (err) => {
        console.log(err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const resetForm = () => {
    setTitle("");
    setCategory("General");
    setContent("");
    setVersion("1.0");
    setEffectiveDate("");
    setPublished(false);
    setEditingId(null);
  };

  const savePolicy = async () => {
    if (!title.trim() || !content.trim()) return;

    try {
      const admin = getCurrentAdminName();

      if (editingId) {
        await updateDoc(doc(db, "supportPolicies", editingId), {
          title,
          category,
          content,
          version,
          effectiveDate,
          published,
          updatedAt: serverTimestamp(),
          updatedBy: admin,
        });

        showToast("Policy updated.");
      } else {
        await addDoc(collection(db, "supportPolicies"), {
          title,
          category,
          content,
          version,
          effectiveDate,
          published,
          views: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          updatedBy: admin,
        });

        showToast("Policy created.");
      }

      resetForm();
    } catch (err) {
      console.log(err);
    }
  };

  const editPolicy = (policy) => {
    setEditingId(policy.id);
    setTitle(policy.title);
    setCategory(policy.category);
    setContent(policy.content);
    setVersion(policy.version || "1.0");
    setEffectiveDate(policy.effectiveDate || "");
    setPublished(policy.published);
    window.scrollTo({ top: 400, behavior: "smooth" });
  };

  const deletePolicy = async (id) => {
    if (!window.confirm("Delete this policy?")) return;

    try {
      await deleteDoc(doc(db, "supportPolicies", id));
      showToast("Policy deleted.");
    } catch (err) {
      console.log(err);
    }
  };

  const togglePublished = async (policy) => {
    try {
      await updateDoc(doc(db, "supportPolicies", policy.id), {
        published: !policy.published,
        updatedAt: serverTimestamp(),
        updatedBy: getCurrentAdminName(),
      });

      showToast(
        !policy.published
          ? "Policy published."
          : "Policy moved to draft."
      );
    } catch (err) {
      console.log(err);
    }
  };

  const totalPolicies = policies.length;
  const publishedPolicies = policies.filter((p) => p.published).length;
  const draftPolicies = policies.filter((p) => !p.published).length;
  const totalViews = policies.reduce((sum, p) => sum + (p.views || 0), 0);

  const filteredPolicies = policies.filter((policy) => {
    const text = search.toLowerCase();
    const matchesSearch =
      policy.title?.toLowerCase().includes(text) ||
      policy.content?.toLowerCase().includes(text) ||
      policy.category?.toLowerCase().includes(text);

    const matchesCategory =
      categoryFilter === "All" || policy.category === categoryFilter;

    let matchesStatus = true;
    if (statusFilter === "Published") matchesStatus = policy.published;
    if (statusFilter === "Draft") matchesStatus = !policy.published;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="admin-page">
      <style>{`
        /* ===== Page ===== */
        .admin-page {
          max-width: 1200px;
          margin: auto;
          padding: 28px;
          position: relative;
        }

        .admin-title {
          font-family: "Playfair Display", serif;
          color: #2C221E;
          font-size: 34px;
          margin-bottom: 6px;
          margin-top: 0;
        }

        .admin-subtitle {
          color: #8A7C72;
          margin-bottom: 30px;
          margin-top: 0;
        }

        /* ===== Cards ===== */
        .admin-card {
          background: #fff;
          border: 1px solid #E8DED2;
          border-radius: 18px;
          padding: 22px;
          margin-bottom: 24px;
          transition: .25s;
        }

        .admin-card:hover {
          box-shadow: 0 10px 25px rgba(0,0,0,.05);
        }

        /* ===== Stats ===== */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit,minmax(180px,1fr));
          gap: 18px;
          margin-bottom: 30px;
        }

        .stat-card {
          background: white;
          border: 1px solid #E8DED2;
          border-radius: 18px;
          padding: 22px;
        }

        .stat-title {
          font-size: 13px;
          color: #9A8C82;
          margin-bottom: 8px;
        }

        .stat-value {
          font-size: 30px;
          font-weight: 700;
          color: #2C221E;
        }

        /* ===== Inputs ===== */
        .admin-input,
        .admin-select,
        .admin-textarea {
          width: 100%;
          padding: 13px 15px;
          border-radius: 12px;
          border: 1px solid #E8DED2;
          font-size: 14px;
          margin-bottom: 14px;
          transition: .2s;
          box-sizing: border-box;
          background: #FAFAFA;
          color: #2C221E;
        }

        .admin-input:focus,
        .admin-select:focus,
        .admin-textarea:focus {
          outline: none;
          border-color: #C4956A;
          box-shadow: 0 0 0 3px rgba(196,149,106,.15);
        }

        /* ===== Buttons ===== */
        .btn {
          padding: 11px 18px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          font-weight: 600;
          transition: .2s;
        }

        .btn-primary {
          background: #C4956A;
          color: white;
        }

        .btn-primary:hover {
          background: #b8885d;
        }

        .btn-secondary {
          background: white;
          border: 1px solid #E8DED2;
          color: #6B5E55;
        }

        .btn-secondary:hover {
          background: #FAF6F0;
        }

        .btn-danger {
          background: #FFEAEA;
          color: #C62828;
          border: 1px solid #F5C2C2;
        }

        /* ===== Table/List ===== */
        .admin-list {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .list-item {
          background: white;
          border: 1px solid #E8DED2;
          border-radius: 16px;
          padding: 20px;
          transition: .25s;
        }

        .list-item:hover {
          box-shadow: 0 8px 20px rgba(0,0,0,.05);
        }

        /* ===== Chips ===== */
        .badge {
          display: inline-flex;
          align-items: center;
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
        }

        .badge-green {
          background: #E8F5E9;
          color: #2E7D32;
        }

        .badge-red {
          background: #FDECEC;
          color: #C62828;
        }

        .badge-orange {
          background: #FFF8E1;
          color: #F57F17;
        }

        .badge-blue {
          background: #E1F5FE;
          color: #0288D1;
        }

        /* ===== Analytics ===== */
        .analytics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit,minmax(300px,1fr));
          gap: 20px;
        }

        .analytics-card {
          background: #FCFAF7;
          border: 1px solid #EFE6DB;
          border-radius: 16px;
          padding: 20px;
        }

        .analytics-title {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 18px;
          color: #2C221E;
        }

        /* ===== Empty State ===== */
        .empty-state {
          text-align: center;
          padding: 50px;
          border: 2px dashed #E8DED2;
          border-radius: 18px;
          color: #8A7C72;
          background: #FFFDFB;
        }

        /* ===== Responsive ===== */
        @media(max-width: 768px) {
          .admin-page {
            padding: 16px;
          }
          .admin-title {
            font-size: 28px;
          }
          .stats-grid {
            grid-template-columns: 1fr;
          }
          .analytics-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            right: 20,
            background: "#2C221E",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: "12px",
            fontWeight: 600,
            zIndex: 1000,
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "28px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h1 className="admin-title">Support Policy Management</h1>
          <p className="admin-subtitle">Manage all customer support policies.</p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => showToast("Exporting policies...")}
        >
          📄 Export
        </button>
      </div>

      {/* Analytics / Stats */}
      <div className="stats-grid">
        {[
          ["📄 Total Policies", totalPolicies],
          ["✅ Published", publishedPolicies],
          ["📝 Drafts", draftPolicies],
          ["👁 Total Views", totalViews],
        ].map(([titleText, value]) => (
          <div key={titleText} className="stat-card">
            <div className="stat-title">{titleText}</div>
            <div className="stat-value">{value}</div>
          </div>
        ))}
      </div>

      {/* Form */}
      <div className="admin-card">
        <h2 style={{ marginTop: 0, color: "#2C221E", fontFamily: "Playfair Display, serif" }}>
          {editingId ? "Edit Policy" : "Add Policy"}
        </h2>

        <input
          className="admin-input"
          placeholder="Policy Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 140px 180px",
            gap: "12px",
          }}
        >
          <select
            className="admin-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option>General</option>
            <option>Delivery</option>
            <option>Refunds</option>
            <option>Payments</option>
            <option>Privacy</option>
            <option>Terms</option>
            <option>Rewards</option>
          </select>

          <input
            className="admin-input"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="1.0"
          />

          <input
            className="admin-input"
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
          />
        </div>

        <textarea
          className="admin-textarea"
          rows={10}
          placeholder="Write policy..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          style={{ resize: "vertical" }}
        />

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <label style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            Published
          </label>
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button className="btn btn-primary" onClick={savePolicy}>
            {editingId ? "Update Policy" : "Save Policy"}
          </button>

          {editingId && (
            <button className="btn btn-secondary" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Search & Filters */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "24px",
          flexWrap: "wrap",
        }}
      >
        <input
          className="admin-input"
          placeholder="Search policies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: "200px", margin: 0 }}
        />

        <select
          className="admin-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ width: "auto", margin: 0 }}
        >
          <option value="All">All Categories</option>
          <option>General</option>
          <option>Delivery</option>
          <option>Refunds</option>
          <option>Payments</option>
          <option>Privacy</option>
          <option>Terms</option>
          <option>Rewards</option>
        </select>

        <select
          className="admin-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ width: "auto", margin: 0 }}
        >
          <option value="All">All Status</option>
          <option value="Published">Published</option>
          <option value="Draft">Draft</option>
        </select>
      </div>

      {/* Policies List Display */}
      <div className="admin-list">
        {loading ? (
          <div className="empty-state">Loading policies...</div>
        ) : filteredPolicies.length === 0 ? (
          <div className="empty-state">No policies found.</div>
        ) : (
          filteredPolicies.map((policy) => (
            <div key={policy.id} className="list-item">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "16px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h3 style={{ margin: "0 0 6px 0", color: "#2C221E" }}>{policy.title}</h3>
                  <div style={{ display: "flex", gap: "12px", fontSize: "13px", color: "#9A8C82" }}>
                    <span>Category: <strong>{policy.category}</strong></span>
                    <span>•</span>
                    <span>Version: <strong>v{policy.version || "1.0"}</strong></span>
                    <span>•</span>
                    <span>Views: <strong>{policy.views || 0}</strong></span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span
                    className={`badge ${
                      policy.published ? "badge-blue" : "badge-orange"
                    }`}
                  >
                    {policy.published ? "Published" : "Draft"}
                  </span>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setPreviewPolicy(policy)}
                      style={{ padding: "6px 10px" }}
                      title="Preview"
                    >
                      👁️
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => togglePublished(policy)}
                      style={{ padding: "6px 10px" }}
                      title="Toggle Publish Status"
                    >
                      🔄
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => editPolicy(policy)}
                      style={{ padding: "6px 10px" }}
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => deletePolicy(policy.id)}
                      style={{ padding: "6px 10px" }}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Preview Modal */}
      {previewPolicy && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1001,
            padding: "20px",
          }}
        >
          <div
            className="admin-card"
            style={{
              maxWidth: "600px",
              width: "100%",
              maxHeight: "80vh",
              overflowY: "auto",
              margin: 0,
            }}
          >
            <h2 style={{ marginTop: 0, color: "#2C221E", fontFamily: "Playfair Display, serif" }}>
              {previewPolicy.title}
            </h2>
            <div style={{ display: "flex", gap: "10px", marginBottom: "16px", fontSize: "13px", color: "#9A8C82" }}>
              <span>Category: {previewPolicy.category}</span>
              <span>•</span>
              <span>Version: {previewPolicy.version}</span>
              <span>•</span>
              <span>Effective: {previewPolicy.effectiveDate || "N/A"}</span>
            </div>
            <div style={{ whiteSpace: "pre-wrap", color: "#2C221E", lineHeight: "1.6", marginBottom: "24px" }}>
              {previewPolicy.content}
            </div>
            <button
              className="btn btn-primary"
              onClick={() => setPreviewPolicy(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

