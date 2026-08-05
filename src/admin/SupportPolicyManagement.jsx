import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import {
  FileText,
  Rocket,
  Edit3,
  Trash2,
  Eye,
  Clock,
  Pin,
  ArrowUp,
  ArrowDown,
  Download,
  Upload,
  Search as SearchIcon,
  Plus,
  X
} from "lucide-react";

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
        where("policyId", "==", policy.id)
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

  return (
    <div className="admin-page">
      <style>{`
        /* ===== Page ===== */
        .admin-page {
          max-width: 1240px;
          margin: auto;
          padding: 40px 24px;
          position: relative;
          background: #FCFAF7;
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
          color: #241C17;
        }

        .admin-title {
          font-family: "Playfair Display", serif;
          color: #241C17;
          font-size: 38px;
          font-weight: 600;
          margin-bottom: 8px;
          margin-top: 0;
          letter-spacing: -0.01em;
        }

        .admin-subtitle {
          color: #8A8B81;
          margin-bottom: 36px;
          margin-top: 0;
          font-size: 15px;
        }

        /* ===== Cards ===== */
        .admin-card {
          background: #FFFFFF;
          border: 1px solid #EFE7DD;
          border-radius: 24px;
          padding: 32px;
          margin-bottom: 28px;
          box-shadow: 0 8px 24px rgba(25,20,15,.04), 0 24px 60px rgba(25,20,15,.05);
          transition: .3s;
        }

        .admin-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(25,20,15,.06), 0 30px 70px rgba(25,20,15,.07);
        }

        /* ===== Stats ===== */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 24px;
          margin-bottom: 36px;
        }

        .stat-card {
          background: white;
          border-radius: 22px;
          border: 1px solid #EFE6DB;
          padding: 26px;
          transition: .3s;
          box-shadow: 0 4px 20px rgba(25,20,15,.02);
        }

        .stat-card:hover {
          border-color: #D8C4B3;
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(25,20,15,.04);
        }

        .stat-title {
          font-size: 12px;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: #9A8B81;
          font-weight: 600;
        }

        .stat-value {
          font-size: 42px;
          font-weight: 700;
          color: #241C17;
          margin-top: 8px;
          font-family: 'Inter', sans-serif;
        }

        /* ===== Inputs ===== */
        .admin-input,
        .admin-select,
        .admin-textarea {
          width: 100%;
          padding: 15px 18px;
          border-radius: 16px;
          border: 1px solid #ECE2D8;
          font-size: 14px;
          margin-bottom: 16px;
          transition: .2s;
          box-sizing: border-box;
          background: #FCFAF8;
          color: #241C17;
          font-family: 'Inter', sans-serif;
        }

        .admin-input {
          height: 52px;
        }

        .admin-input:focus,
        .admin-select:focus,
        .admin-textarea:focus {
          outline: none;
          border-color: #C4956A;
          box-shadow: 0 0 0 5px rgba(196,149,106,.12);
          background: #FFFFFF;
        }

        /* ===== Buttons ===== */
        .btn {
          padding: 13px 22px;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: .2s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-family: 'Inter', sans-serif;
        }

        .btn-primary {
          background: #C4956A;
          color: white;
        }

        .btn-primary:hover {
          background: #B7865E;
          transform: translateY(-2px);
        }

        .btn-secondary {
          background: white;
          border: 1px solid #E8DED2;
          color: #54463C;
        }

        .btn-secondary:hover {
          background: #FAF7F3;
          border-color: #D8C4B3;
        }

        .btn-danger {
          background: #FAECEB;
          color: #B55656;
          border: 1px solid #F5C2C2;
        }

        .btn-danger:hover {
          background: #F8D7D6;
        }

        /* ===== Table/List ===== */
        .admin-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .list-item {
          background: white;
          border: 1px solid #EEE4DA;
          border-radius: 24px;
          padding: 28px;
          transition: .25s;
          box-shadow: 0 4px 20px rgba(25,20,15,.02);
        }

        .list-item:hover {
          transform: translateY(-3px);
          box-shadow: 0 14px 40px rgba(0,0,0,.05);
          border-color: #D8C4B3;
        }

        /* ===== Chips / Badges ===== */
        .badge {
          display: inline-flex;
          align-items: center;
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
        }

        .badge-green {
          background: #EEF6EF;
          color: #5D7B64;
        }

        .badge-red {
          background: #FAECEB;
          color: #B55656;
        }

        .badge-orange {
          background: #F7F2EA;
          color: #8A735A;
        }

        .badge-blue {
          background: #F0F4F8;
          color: #4A607A;
        }

        .badge-pinned {
          background: #F6F1EA;
          color: #7B624C;
        }

        /* ===== Modal ===== */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(36, 28, 23, 0.4);
          backdrop-filter: blur(4px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1001;
          padding: 20px;
          box-sizing: border-box;
        }

        .modal-card {
          background: #fff;
          border: 1px solid #EEE5DB;
          border-radius: 26px;
          padding: 32px;
          max-width: 640px;
          width: 100%;
          max-height: 85vh;
          overflow-y: auto;
          box-shadow: 0 25px 80px rgba(0,0,0,.18);
        }

        /* ===== Analytics / History Cards ===== */
        .analytics-card {
          background: #FCFAF7;
          border: 1px solid #EFE6DB;
          border-radius: 18px;
          padding: 20px;
        }

        /* ===== Empty State ===== */
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          border: 2px dashed #EAE0D5;
          border-radius: 24px;
          color: #8A8B81;
          background: #FFFDFB;
        }

        /* ===== Responsive ===== */
        @media(max-width: 768px) {
          .admin-page {
            padding: 20px 16px;
          }
          .admin-title {
            font-size: 30px;
          }
          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "#FFFFFF",
            color: "#241C17",
            border: "1px solid #E8DED2",
            padding: "14px 22px",
            borderRadius: "16px",
            fontWeight: 600,
            fontSize: "14px",
            boxShadow: "0 20px 40px rgba(0,0,0,.08)",
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
          marginBottom: "32px",
          flexWrap: "wrap",
          gap: "20px",
        }}
      >
        <div>
          <h1 className="admin-title" style={{ fontFamily: "Playfair Display, serif" }}>Support Policy Management</h1>
          <p className="admin-subtitle">Manage all customer support policies with precision.</p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 12
          }}
        >
          <button
            className="btn btn-secondary"
            onClick={exportPolicies}
          >
            <Download size={16} /> Export
          </button>

          <label className="btn btn-secondary" style={{ cursor: "pointer" }}>
            <Upload size={16} /> Import
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
          <div className="stat-title">Total Policies</div>
          <div className="stat-value">{totalPolicies}</div>
        </div>

        <div className="stat-card">
          <div className="stat-title">Published</div>
          <div className="stat-value">{publishedPolicies}</div>
        </div>

        <div className="stat-card">
          <div className="stat-title">Drafts</div>
          <div className="stat-value">{draftPolicies}</div>
        </div>

        <div className="stat-card">
          <div className="stat-title">Categories</div>
          <div className="stat-value">{totalCategories}</div>
        </div>
      </div>

      {/* Form */}
      <div className="admin-card">
        <h2 style={{ marginTop: 0, marginBottom: 24, color: "#241C17", fontFamily: "Playfair Display, serif", fontSize: "24px" }}>
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
            gridTemplateColumns: "1fr 1fr 140px",
            gap: "16px",
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
            gap: "16px",
          }}
        >
          <div>
            <label style={{ fontSize: 13, color: "#8A8B81", display: "block", marginBottom: 6, fontWeight: 500 }}>
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
            <label style={{ fontSize: 13, color: "#8A8B81", display: "block", marginBottom: 6, fontWeight: 500 }}>
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
          placeholder="Write policy content..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          style={{ resize: "vertical", padding: "16px 18px" }}
        />

        <div style={{ display: "flex", gap: "28px", alignItems: "center", margin: "8px 0 24px 0" }}>
          <label style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer", fontSize: "14px", fontWeight: 500 }}>
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: "#C4956A" }}
            />
            Published
          </label>

          <label
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 500
            }}
          >
            <input
              type="checkbox"
              checked={required}
              onChange={(e) =>
                setRequired(e.target.checked)
              }
              style={{ width: 16, height: 16, accentColor: "#C4956A" }}
            />
            Required Policy
          </label>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            className="btn btn-primary"
            onClick={savePolicy}
          >
            <Plus size={16} /> {editingId ? "Update Policy" : "Create Policy"}
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
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 28
        }}
      >
        <div style={{ flex: 1, position: "relative", minWidth: "260px" }}>
          <input
            className="admin-input"
            placeholder="Search policies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ marginBottom: 0, paddingLeft: "46px" }}
          />
          <SearchIcon size={18} style={{ position: "absolute", left: 16, top: 17, color: "#8A8B81" }} />
        </div>

        <select
          className="admin-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ width: 180, marginBottom: 0, height: 52 }}
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
          style={{ width: 170, marginBottom: 0, height: 52 }}
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
          marginBottom: 24,
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
            <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: "20px", marginTop: 0 }}>No Policies Yet</h3>
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
                <div style={{ display: "flex", alignItems: "flex-start", paddingTop: 4 }}>
                  <input
                    type="checkbox"
                    checked={selectedPolicies.includes(policy.id)}
                    onChange={() => toggleSelection(policy.id)}
                    style={{ width: 16, height: 16, accentColor: "#C4956A", cursor: "pointer" }}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <h3
                    style={{
                      margin: 0,
                      color: "#241C17",
                      fontFamily: "Playfair Display, serif",
                      fontSize: "20px"
                    }}
                  >
                    {policy.title}
                  </h3>

                  <div
                    style={{
                      marginTop: 12,
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
                      <span className="badge badge-pinned">
                        Pinned
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
                      whiteSpace: "pre-wrap",
                      lineHeight: "1.6",
                      fontSize: "14px"
                    }}
                  >
                    {policy.content.length > 220
                      ? policy.content.substring(0, 220) + "..."
                      : policy.content}
                  </p>

                  <div
                    style={{
                      fontSize: 12,
                      color: "#9A8B81",
                      marginTop: 16
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
                  gap: "10px",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  marginTop: "20px",
                  paddingTop: "16px",
                  borderTop: "1px solid #F4EBE2"
                }}
              >
                <button
                  className="btn btn-secondary"
                  style={{ padding: "8px 14px", fontSize: "13px" }}
                  onClick={() => moveUp(policy)}
                  title="Move Up"
                >
                  <ArrowUp size={14} /> Up
                </button>

                <button
                  className="btn btn-secondary"
                  style={{ padding: "8px 14px", fontSize: "13px" }}
                  onClick={() => moveDown(policy)}
                  title="Move Down"
                >
                  <ArrowDown size={14} /> Down
                </button>

                <button
                  className="btn btn-secondary"
                  style={{ padding: "8px 14px", fontSize: "13px" }}
                  onClick={() => togglePinned(policy)}
                >
                  <Pin size={14} /> {policy.pinned ? "Unpin" : "Pin"}
                </button>

                <button
                  className="btn btn-secondary"
                  style={{ padding: "8px 14px", fontSize: "13px" }}
                  onClick={() => setPreviewPolicy(policy)}
                >
                  <Eye size={14} /> Preview
                </button>

                <button
                  className="btn btn-secondary"
                  style={{ padding: "8px 14px", fontSize: "13px" }}
                  onClick={() => openHistory(policy)}
                >
                  <Clock size={14} /> History
                </button>

                <button
                  className="btn btn-secondary"
                  style={{ padding: "8px 14px", fontSize: "13px" }}
                  onClick={() => editPolicy(policy)}
                >
                  <Edit3 size={14} /> Edit
                </button>

                <button
                  className="btn btn-secondary"
                  style={{ padding: "8px 14px", fontSize: "13px" }}
                  onClick={() => toggleStatus(policy)}
                >
                  {policy.status === "Published" ? <FileText size={14} /> : <Rocket size={14} />}
                  {policy.status === "Published" ? "Draft" : "Publish"}
                </button>

                <button
                  className="btn btn-danger"
                  style={{ padding: "8px 14px", fontSize: "13px" }}
                  onClick={() => deletePolicy(policy.id)}
                >
                  <Trash2 size={14} /> Delete
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

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontFamily: "Playfair Display, serif", fontSize: "24px", color: "#241C17" }}>{previewPolicy.title}</h2>
              <button onClick={() => setPreviewPolicy(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#8A8B81" }}>
                <X size={20} />
              </button>
            </div>

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
                <span className="badge badge-pinned">
                  Pinned
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
                color: "#54463C",
                maxHeight: "55vh",
                overflowY: "auto",
                fontSize: "14px"
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontFamily: "Playfair Display, serif", fontSize: "24px", color: "#241C17" }}>Policy History</h2>
              <button onClick={() => setHistoryModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#8A8B81" }}>
                <X size={20} />
              </button>
            </div>

            {policyHistory.length === 0 ? (
              <p style={{ color: "#8A8B81" }}>No version history available for this policy yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: "55vh", overflowY: "auto", marginBottom: 20 }}>
                {policyHistory.map(item => (
                  <div
                    key={item.id}
                    className="analytics-card"
                    style={{ marginBottom: 0, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 15 }}
                  >
                    <div>
                      <strong style={{ color: "#241C17", fontSize: "14px" }}>{item.action}</strong>
                      <p style={{ margin: "4px 0", color: "#6B5E55", fontSize: "13px" }}>{item.title}</p>
                      <small style={{ color: "#9A8B81", fontSize: "12px" }}>
                        {item.editedBy}
                        {" • "}
                        {item.editedAt?.toDate?.()?.toLocaleString() || "Recently"}
                      </small>
                    </div>

                    <button
                      className="btn btn-secondary"
                      style={{ padding: "8px 14px", fontSize: "13px" }}
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
