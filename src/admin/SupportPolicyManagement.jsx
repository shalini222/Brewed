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
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

export default function SupportPolicyManagement() {
  const [policies, setPolicies] = useState([]);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("General");
  const [content, setContent] = useState("");
  const [version, setVersion] = useState("1.0");
  const [published, setPublished] = useState(false);

  const [visibility, setVisibility] = useState("Customer");
  const [required, setRequired] = useState(false);
  const [effectiveDate, setEffectiveDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  const [editingId, setEditingId] = useState(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [selectedPolicies, setSelectedPolicies] = useState([]);

  const [previewPolicy, setPreviewPolicy] = useState(null);
  const [historyModal, setHistoryModal] = useState(false);
  const [policyHistory, setPolicyHistory] = useState([]);

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
          snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              status: data.status || (data.published ? "Published" : "Draft"),
            };
          })
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
    setEditingId(null);
    setTitle("");
    setCategory("General");
    setContent("");
    setVersion("1.0");
    setPublished(false);
    setVisibility("Customer");
    setRequired(false);
    setEffectiveDate("");
    setExpiryDate("");
  };

  const savePolicy = async () => {
    if (!title.trim() || !content.trim()) return;

    try {
      const admin = getCurrentAdminName();
      const currentStatus = published ? "Published" : "Draft";

      if (editingId) {
        const existingPolicy = policies.find(p => p.id === editingId);

        if (existingPolicy) {
          await addDoc(
            collection(db, "supportPolicyHistory"),
            {
              policyId: editingId,
              title: existingPolicy.title,
              content: existingPolicy.content,
              category: existingPolicy.category,
              status: existingPolicy.status,
              visibility: existingPolicy.visibility || "Customer",
              editedBy: admin,
              editedAt: serverTimestamp(),
              action: "Updated"
            }
          );
        }

        await updateDoc(doc(db, "supportPolicies", editingId), {
          title,
          category,
          content,
          version,
          published,
          status: currentStatus,
          visibility,
          required,
          effectiveDate,
          expiryDate,
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
          published,
          status: currentStatus,
          visibility,
          required,
          effectiveDate,
          expiryDate,
          views: 0,
          pinned: false,
          sortOrder: policies.length + 1,
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
    setPublished(policy.status === "Published" || policy.published);
    setVisibility(policy.visibility || "Customer");
    setRequired(policy.required || false);
    setEffectiveDate(policy.effectiveDate || "");
    setExpiryDate(policy.expiryDate || "");
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  const openHistory = async (policy) => {
    try {
      const q = query(
        collection(db, "supportPolicyHistory"),
        where("policyId", "==", policy.id),
        orderBy("editedAt", "desc")
      );

      const snapshot = await getDocs(q);

      setPolicyHistory(
        snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      );

      setHistoryModal(true);
    } catch (err) {
      console.log(err);
      showToast("Could not load history.");
    }
  };

  const restoreVersion = async (versionData) => {
    try {
      await updateDoc(
        doc(db, "supportPolicies", versionData.policyId),
        {
          title: versionData.title,
          content: versionData.content,
          category: versionData.category,
          status: versionData.status,
          visibility: versionData.visibility,
          updatedAt: serverTimestamp(),
          updatedBy: getCurrentAdminName()
        }
      );

      showToast("Previous version restored.");
      setHistoryModal(false);
    } catch (err) {
      console.log(err);
      showToast("Failed to restore version.");
    }
  };

  const toggleStatus = async (policy) => {
    try {
      const nextStatus = policy.status === "Published" ? "Draft" : "Published";
      const nextPublished = nextStatus === "Published";

      await updateDoc(doc(db, "supportPolicies", policy.id), {
        status: nextStatus,
        published: nextPublished,
        updatedAt: serverTimestamp(),
        updatedBy: getCurrentAdminName()
      });

      showToast(
        policy.status === "Published"
          ? "Policy moved to Draft."
          : "Policy published successfully."
      );
    } catch (err) {
      console.log(err);
    }
  };

  const togglePinned = async (policy) => {
    try {
      await updateDoc(doc(db, "supportPolicies", policy.id), {
        pinned: !policy.pinned,
        updatedAt: serverTimestamp(),
        updatedBy: getCurrentAdminName()
      });
      showToast(
        policy.pinned ? "Policy unpinned." : "Policy pinned."
      );
    } catch (err) {
      console.log(err);
    }
  };

  const deletePolicy = async (id) => {
    const confirmed = window.confirm(
      "Delete this policy?"
    );

    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "supportPolicies", id));
      showToast("Policy deleted.");
    } catch (err) {
      console.log(err);
    }
  };

  const toggleSelection = (id) => {
    if (selectedPolicies.includes(id)) {
      setSelectedPolicies(
        selectedPolicies.filter(item => item !== id)
      );
    } else {
      setSelectedPolicies([
        ...selectedPolicies,
        id
      ]);
    }
  };

  const selectAll = () => {
    setSelectedPolicies(
      sortedPolicies.map(policy => policy.id)
    );
  };

  const clearSelection = () => {
    setSelectedPolicies([]);
  };

  const bulkPublish = async () => {
    const adminName = getCurrentAdminName();

    for (const id of selectedPolicies) {
      await updateDoc(doc(db, "supportPolicies", id), {
        status: "Published",
        published: true,
        updatedAt: serverTimestamp(),
        updatedBy: adminName
      });
    }

    showToast(`${selectedPolicies.length} policies published.`);
    setSelectedPolicies([]);
  };

  const bulkDraft = async () => {
    const adminName = getCurrentAdminName();

    for (const id of selectedPolicies) {
      await updateDoc(doc(db, "supportPolicies", id), {
        status: "Draft",
        published: false,
        updatedAt: serverTimestamp(),
        updatedBy: adminName
      });
    }

    showToast(`${selectedPolicies.length} policies moved to Draft.`);
    setSelectedPolicies([]);
  };

  const bulkDelete = async () => {
    if (!window.confirm(
      `Delete ${selectedPolicies.length} policies?`
    )) return;

    for (const id of selectedPolicies) {
      await deleteDoc(doc(db, "supportPolicies", id));
    }

    showToast(`${selectedPolicies.length} policies deleted.`);
    setSelectedPolicies([]);
  };

  const bulkPin = async (value) => {
    const adminName = getCurrentAdminName();

    for (const id of selectedPolicies) {
      await updateDoc(doc(db, "supportPolicies", id), {
        pinned: value,
        updatedAt: serverTimestamp(),
        updatedBy: adminName
      });
    }

    showToast(
      value
        ? "Policies pinned."
        : "Policies unpinned."
    );

    setSelectedPolicies([]);
  };

  const exportPolicies = () => {
    const cleanPolicies = policies.map(
      ({
        title,
        content,
        category,
        status,
        pinned,
        sortOrder,
        visibility,
        required,
        effectiveDate,
        expiryDate
      }) => ({
        title,
        content,
        category,
        status,
        pinned,
        sortOrder,
        visibility,
        required,
        effectiveDate,
        expiryDate
      })
    );

    const data =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(
        JSON.stringify(cleanPolicies, null, 2)
      );

    const link = document.createElement("a");

    link.href = data;
    link.download = "support-policies.json";

    document.body.appendChild(link);

    link.click();

    link.remove();

    showToast("Policies exported successfully.");
  };

  const importPolicies = (e) => {
    const reader = new FileReader();

    if (!e.target.files[0]) return;

    reader.readAsText(e.target.files[0]);

    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target.result);

        if (!Array.isArray(imported)) return;

        const admin = getCurrentAdminName();

        let index = 0;

        for (const item of imported) {
          const exists = policies.some(
            p =>
              p.title.trim().toLowerCase() ===
              item.title.trim().toLowerCase()
          );

          if (!exists) {
            await addDoc(
              collection(db, "supportPolicies"),
              {
                title: item.title,
                content: item.content,
                category: item.category || "General",
                status: item.status || "Draft",
                pinned: item.pinned || false,
                sortOrder:
                  policies.length + index + 1,
                visibility: item.visibility || "Customer",
                required: item.required || false,
                effectiveDate: item.effectiveDate || null,
                expiryDate: item.expiryDate || null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                updatedBy: admin
              }
            );

            index++;
          }
        }

        showToast("Policies imported successfully.");
      } catch (err) {
        console.log(err);
        alert("Invalid JSON file.");
      }
    };
  };

  const totalPolicies = policies.length;

  const publishedPolicies = policies.filter(
    p => p.status === "Published"
  ).length;

  const draftPolicies = policies.filter(
    p => p.status === "Draft"
  ).length;

  const totalCategories = [
    ...new Set(policies.map(p => p.category))
  ].length;

  const filteredPolicies = policies.filter(policy => {
    const matchesSearch =
      policy.title.toLowerCase().includes(search.toLowerCase()) ||
      policy.content.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      categoryFilter === "All" ||
      policy.category === categoryFilter;

    const matchesStatus =
      statusFilter === "All" ||
      policy.status === statusFilter;

    return (
      matchesSearch &&
      matchesCategory &&
      matchesStatus
    );
  });

  const sortedPolicies = [...filteredPolicies].sort((a, b) => {
    if (a.pinned === b.pinned) {
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    }
    return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
  });

  const moveUp = async (policy) => {
    const index = sortedPolicies.findIndex(
      p => p.id === policy.id
    );
    if (index === 0) return;
    const current = sortedPolicies[index];
    const previous = sortedPolicies[index - 1];
    await updateDoc(doc(db, "supportPolicies", current.id), {
      sortOrder: previous.sortOrder
    });
    await updateDoc(doc(db, "supportPolicies", previous.id), {
      sortOrder: current.sortOrder
    });
  };

  const moveDown = async (policy) => {
    const index = sortedPolicies.findIndex(
      p => p.id === policy.id
    );
    if (index === sortedPolicies.length - 1) return;
    const current = sortedPolicies[index];
    const next = sortedPolicies[index + 1];
    await updateDoc(doc(db, "supportPolicies", current.id), {
      sortOrder: next.sortOrder
    });
    await updateDoc(doc(db, "supportPolicies", next.id), {
      sortOrder: current.sortOrder
    });
  };

  const actionBtnStyle = {
    minWidth: "110px",
    height: "40px",
    padding: "0 14px",
    borderRadius: "10px",
    border: "1px solid #E8DED2",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 500,
    transition: "0.2s"
  };

  const actionDangerBtnStyle = {
    minWidth: "110px",
    height: "40px",
    padding: "0 14px",
    borderRadius: "10px",
    border: "1px solid #F5C2C2",
    background: "#FFEAEA",
    color: "#C62828",
    cursor: "pointer",
    fontWeight: 500,
    transition: "0.2s"
  };

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
          display: inline-flex;
          align-items: center;
          justify-content: center;
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

        /* ===== Modal ===== */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          zIndex: 1001;
          padding: 20px;
          box-sizing: border-box;
        }

        .modal-card {
          background: #fff;
          border: 1px solid #E8DED2;
          border-radius: 18px;
          padding: 24px;
          max-width: 600px;
          width: 100%;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 10px 25px rgba(0,0,0,.1);
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

        <div
          style={{
            display: "flex",
            gap: 10
          }}
        >
          <button
            className="btn btn-secondary"
            onClick={exportPolicies}
          >
            ⬇ Export JSON
          </button>

          <label className="btn btn-secondary" style={{ cursor: "pointer" }}>
            📂 Import JSON
            <input
              type="file"
              accept=".json"
              onChange={importPolicies}
              hidden
            />
          </label>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-title">📄 Total Policies</div>
          <div className="stat-value">{totalPolicies}</div>
        </div>

        <div className="stat-card">
          <div className="stat-title">🚀 Published</div>
          <div className="stat-value">{publishedPolicies}</div>
        </div>

        <div className="stat-card">
          <div className="stat-title">📝 Drafts</div>
          <div className="stat-value">{draftPolicies}</div>
        </div>

        <div className="stat-card">
          <div className="stat-title">📂 Categories</div>
          <div className="stat-value">{totalCategories}</div>
        </div>
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
            gridTemplateColumns: "1fr 1fr 120px",
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

          <select
            className="admin-select"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
          >
            <option>Customer</option>
            <option>Employee</option>
            <option>Rider</option>
            <option>Admin Only</option>
            <option>Everyone</option>
          </select>

          <input
            className="admin-input"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="1.0"
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
          }}
        >
          <div>
            <label style={{ fontSize: 12, color: "#8A7C72", display: "block", marginBottom: 4 }}>
              Effective Date
            </label>
            <input
              type="date"
              className="admin-input"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: "#8A7C72", display: "block", marginBottom: 4 }}>
              Expiry Date (Optional)
            </label>
            <input
              type="date"
              className="admin-input"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>
        </div>

        <textarea
          className="admin-textarea"
          rows={10}
          placeholder="Write policy..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          style={{ resize: "vertical" }}
        />

        <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
          <label style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            Published
          </label>

          <label
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              cursor: "pointer"
            }}
          >
            <input
              type="checkbox"
              checked={required}
              onChange={(e) =>
                setRequired(e.target.checked)
              }
            />
            Required Policy
          </label>
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button
            className="btn btn-primary"
            onClick={savePolicy}
          >
            {editingId ? "Update Policy" : "Create Policy"}
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
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 24
        }}
      >
        <input
          className="admin-input"
          placeholder="Search policies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, marginBottom: 0 }}
        />

        <select
          className="admin-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ width: 180, marginBottom: 0 }}
        >
          <option value="All">All Categories</option>

          {[...new Set(policies.map(p => p.category))].map(cat => (
            <option key={cat}>
              {cat}
            </option>
          ))}
        </select>

        <select
          className="admin-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ width: 170, marginBottom: 0 }}
        >
          <option value="All">All Status</option>
          <option value="Published">Published</option>
          <option value="Draft">Draft</option>
        </select>
      </div>

      {/* Bulk Actions Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12
        }}
      >
        <div>
          <button
            className="btn btn-secondary"
            onClick={selectAll}
          >
            Select All
          </button>

          <button
            className="btn btn-secondary"
            onClick={clearSelection}
            style={{ marginLeft: 8 }}
          >
            Clear
          </button>
        </div>

        {selectedPolicies.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap"
            }}
          >
            <button
              className="btn btn-primary"
              onClick={bulkPublish}
            >
              Publish
            </button>

            <button
              className="btn btn-secondary"
              onClick={bulkDraft}
            >
              Draft
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => bulkPin(true)}
            >
              Pin
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => bulkPin(false)}
            >
              Unpin
            </button>

            <button
              className="btn btn-danger"
              onClick={bulkDelete}
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Policies List Display */}
      <div className="admin-list">
        {loading ? (
          <div className="empty-state">Loading policies...</div>
        ) : sortedPolicies.length === 0 ? (
          <div className="empty-state">
            <h3>No Policies Yet</h3>
            <p>Create your first support policy above.</p>
          </div>
        ) : (
          sortedPolicies.map((policy) => (
            <div
              key={policy.id}
              className="list-item"
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 20,
                  flexWrap: "wrap"
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", paddingTop: 2 }}>
                  <input
                    type="checkbox"
                    checked={selectedPolicies.includes(policy.id)}
                    onChange={() => toggleSelection(policy.id)}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <h3
                    style={{
                      margin: 0,
                      color: "#2C221E"
                    }}
                  >
                    {policy.title}
                  </h3>

                  <div
                    style={{
                      marginTop: 8,
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap"
                    }}
                  >
                    <span className="badge badge-blue">
                      {policy.category}
                    </span>

                    <span className="badge badge-blue">
                      {policy.visibility}
                    </span>

                    <span
                      className={`badge ${
                        policy.status === "Published"
                          ? "badge-green"
                          : "badge-orange"
                      }`}
                    >
                      {policy.status}
                    </span>

                    {policy.required && (
                      <span className="badge badge-red">
                        Required
                      </span>
                    )}

                    {policy.pinned && (
                      <span className="badge badge-orange">
                        📌 Pinned
                      </span>
                    )}

                    {policy.expiryDate && (
                      <span className="badge badge-orange">
                        Expires {policy.expiryDate}
                      </span>
                    )}
                  </div>

                  <p
                    style={{
                      marginTop: 16,
                      color: "#6B5E55",
                      whiteSpace: "pre-wrap"
                    }}
                  >
                    {policy.content.length > 220
                      ? policy.content.substring(0, 220) + "..."
                      : policy.content}
                  </p>

                  <div
                    style={{
                      fontSize: 12,
                      color: "#9A8C82",
                      marginTop: 12
                    }}
                  >
                    Last Updated{" "}
                    {policy.updatedAt?.toDate?.().toLocaleDateString() ||
                      "Recently"}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  marginTop: "16px"
                }}
              >
                <button
                  style={actionBtnStyle}
                  onClick={() => moveUp(policy)}
                >
                  ⬆
                </button>

                <button
                  style={actionBtnStyle}
                  onClick={() => moveDown(policy)}
                >
                  ⬇
                </button>

                <button
                  style={actionBtnStyle}
                  onClick={() => togglePinned(policy)}
                >
                  {policy.pinned ? "📍 Unpin" : "📌 Pin"}
                </button>

                <button
                  style={actionBtnStyle}
                  onClick={() => setPreviewPolicy(policy)}
                >
                  👁 Preview
                </button>

                <button
                  style={actionBtnStyle}
                  onClick={() => openHistory(policy)}
                >
                  🕒 History
                </button>

                <button
                  style={actionBtnStyle}
                  onClick={() => editPolicy(policy)}
                >
                  ✏️ Edit
                </button>

                <button
                  style={actionBtnStyle}
                  onClick={() => toggleStatus(policy)}
                >
                  {policy.status === "Published"
                    ? "📄 Draft"
                    : "🚀 Publish"}
                </button>

                <button
                  style={actionDangerBtnStyle}
                  onClick={() => deletePolicy(policy.id)}
                >
                  🗑 Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Preview Modal */}
      {previewPolicy && (
        <div className="modal-overlay">
          <div className="modal-card">

            <h2>{previewPolicy.title}</h2>

            <div
              style={{
                marginBottom: 20,
                display: "flex",
                gap: 8,
                flexWrap: "wrap"
              }}
            >
              <span className="badge badge-blue">
                {previewPolicy.category}
              </span>

              <span className="badge badge-blue">
                {previewPolicy.visibility}
              </span>

              <span
                className={`badge ${
                  previewPolicy.status === "Published"
                    ? "badge-green"
                    : "badge-orange"
                }`}
              >
                {previewPolicy.status}
              </span>

              {previewPolicy.required && (
                <span className="badge badge-red">
                  Required
                </span>
              )}

              {previewPolicy.pinned && (
                <span className="badge badge-orange">
                  📌 Pinned
                </span>
              )}

              {previewPolicy.expiryDate && (
                <span className="badge badge-orange">
                  Expires {previewPolicy.expiryDate}
                </span>
              )}
            </div>

            <div
              style={{
                whiteSpace: "pre-wrap",
                lineHeight: 1.7,
                color: "#555",
                maxHeight: "60vh",
                overflowY: "auto"
              }}
            >
              {previewPolicy.content}
            </div>

            <div
              style={{
                marginTop: 25,
                textAlign: "right"
              }}
            >
              <button
                className="btn btn-primary"
                onClick={() => setPreviewPolicy(null)}
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* History Modal */}
      {historyModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2 style={{ marginTop: 0 }}>Policy History</h2>

            {policyHistory.length === 0 ? (
              <p style={{ color: "#8A7C72" }}>No version history available for this policy yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: "60vh", overflowY: "auto", marginBottom: 20 }}>
                {policyHistory.map(item => (
                  <div
                    key={item.id}
                    className="analytics-card"
                    style={{ marginBottom: 0, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 15 }}
                  >
                    <div>
                      <strong style={{ color: "#2C221E" }}>{item.action}</strong>
                      <p style={{ margin: "4px 0", color: "#6B5E55" }}>{item.title}</p>
                      <small style={{ color: "#9A8C82" }}>
                        {item.editedBy}
                        {" • "}
                        {item.editedAt?.toDate?.()?.toLocaleString() || "Recently"}
                      </small>
                    </div>

                    <button
                      style={actionBtnStyle}
                      onClick={() => restoreVersion(item)}
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ textAlign: "right" }}>
              <button
                className="btn btn-primary"
                onClick={() => setHistoryModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
