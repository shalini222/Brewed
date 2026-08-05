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

        showToast("Policy updated successfully.");
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

        showToast("Policy created successfully.");
      }

      resetForm();
    } catch (err) {
      console.log(err);
      showToast("Error saving policy.");
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
    const confirmed = window.confirm("Are you sure you want to delete this policy?");
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
      setSelectedPolicies(selectedPolicies.filter(item => item !== id));
    } else {
      setSelectedPolicies([...selectedPolicies, id]);
    }
  };

  const selectAll = () => {
    setSelectedPolicies(sortedPolicies.map(policy => policy.id));
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
    if (!window.confirm(`Delete ${selectedPolicies.length} policies?`)) return;
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
    showToast(value ? "Policies pinned." : "Policies unpinned.");
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

    const data = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cleanPolicies, null, 2));
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
            p => p.title.trim().toLowerCase() === item.title.trim().toLowerCase()
          );

          if (!exists) {
            await addDoc(collection(db, "supportPolicies"), {
              title: item.title,
              content: item.content,
              category: item.category || "General",
              status: item.status || "Draft",
              pinned: item.pinned || false,
              sortOrder: policies.length + index + 1,
              visibility: item.visibility || "Customer",
              required: item.required || false,
              effectiveDate: item.effectiveDate || null,
              expiryDate: item.expiryDate || null,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              updatedBy: admin
            });
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
  const publishedPolicies = policies.filter(p => p.status === "Published").length;
  const draftPolicies = policies.filter(p => p.status === "Draft").length;
  const totalCategories = [...new Set(policies.map(p => p.category))].length;

  const filteredPolicies = policies.filter(policy => {
    const matchesSearch =
      policy.title.toLowerCase().includes(search.toLowerCase()) ||
      policy.content.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = categoryFilter === "All" || policy.category === categoryFilter;
    const matchesStatus = statusFilter === "All" || policy.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const sortedPolicies = [...filteredPolicies].sort((a, b) => {
    if (a.pinned === b.pinned) {
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    }
    return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
  });

  const moveUp = async (policy) => {
    const index = sortedPolicies.findIndex(p => p.id === policy.id);
    if (index === 0) return;
    const current = sortedPolicies[index];
    const previous = sortedPolicies[index - 1];
    await updateDoc(doc(db, "supportPolicies", current.id), { sortOrder: previous.sortOrder });
    await updateDoc(doc(db, "supportPolicies", previous.id), { sortOrder: current.sortOrder });
  };

  const moveDown = async (policy) => {
    const index = sortedPolicies.findIndex(p => p.id === policy.id);
    if (index === sortedPolicies.length - 1) return;
    const current = sortedPolicies[index];
    const next = sortedPolicies[index + 1];
    await updateDoc(doc(db, "supportPolicies", current.id), { sortOrder: next.sortOrder });
    await updateDoc(doc(db, "supportPolicies", next.id), { sortOrder: current.sortOrder });
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 bg-slate-50/50 min-h-screen text-slate-900 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-3 rounded-xl font-medium text-sm shadow-xl z-50 animate-fade-in border border-slate-800">
          {toastMessage}
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            Support Policy Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage terms, conditions, and customer guidelines efficiently.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportPolicies}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-sm"
          >
            <Download size={16} /> Export
          </button>

          <label className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-sm cursor-pointer">
            <Upload size={16} /> Import
            <input type="file" accept=".json" onChange={importPolicies} hidden />
          </label>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Policies</span>
          <div className="text-3xl font-bold text-slate-900 mt-2">{totalPolicies}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Published</span>
          <div className="text-3xl font-bold text-emerald-600 mt-2">{publishedPolicies}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Drafts</span>
          <div className="text-3xl font-bold text-amber-600 mt-2">{draftPolicies}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Categories</span>
          <div className="text-3xl font-bold text-indigo-600 mt-2">{totalCategories}</div>
        </div>
      </div>

      {/* Main Creation / Edit Form Card */}
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        <h2 className="text-xl font-bold text-slate-900">
          {editingId ? "Edit Policy" : "Create New Policy"}
        </h2>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Title</label>
          <input
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            placeholder="e.g., Refund & Return Policy"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Category</label>
            <select
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
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
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Visibility</label>
            <select
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
            >
              <option>Customer</option>
              <option>Employee</option>
              <option>Rider</option>
              <option>Admin Only</option>
              <option>Everyone</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Version</label>
            <input
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="1.0"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Effective Date</label>
            <input
              type="date"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Expiry Date (Optional)</label>
            <input
              type="date"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Policy Content</label>
          <textarea
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            rows={8}
            placeholder="Write detailed policy text..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{ resize: "vertical" }}
          />
        </div>

        <div className="flex items-center gap-6 pt-2">
          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
            Published
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
            Required Policy (Must accept)
          </label>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
          <button
            onClick={savePolicy}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-medium text-sm rounded-xl hover:bg-indigo-700 transition shadow-sm shadow-indigo-200"
          >
            <Plus size={16} /> {editingId ? "Update Policy" : "Create Policy"}
          </button>

          {editingId && (
            <button
              onClick={resetForm}
              className="px-5 py-2.5 bg-slate-100 text-slate-700 font-medium text-sm rounded-xl hover:bg-slate-200 transition"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Filtering & Search Bar */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative flex-1 w-full">
          <SearchIcon size={18} className="absolute left-4 top-3.5 text-slate-400" />
          <input
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            placeholder="Search policies by title or content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="w-full md:w-48 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="All">All Categories</option>
          {[...new Set(policies.map(p => p.category))].map(cat => (
            <option key={cat}>{cat}</option>
          ))}
        </select>

        <select
          className="w-full md:w-44 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="All">All Statuses</option>
          <option value="Published">Published</option>
          <option value="Draft">Draft</option>
        </select>
      </div>

      {/* Bulk Action Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4 px-2">
        <div className="flex items-center gap-2">
          <button
            onClick={selectAll}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-xs"
          >
            Select All
          </button>
          <button
            onClick={clearSelection}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-xs"
          >
            Clear Selection
          </button>
        </div>

        {selectedPolicies.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-slate-500 mr-2">{selectedPolicies.length} selected:</span>
            <button onClick={bulkPublish} className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition">
              Publish
            </button>
            <button onClick={bulkDraft} className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition">
              Draft
            </button>
            <button onClick={() => bulkPin(true)} className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition">
              Pin
            </button>
            <button onClick={() => bulkPin(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition">
              Unpin
            </button>
            <button onClick={bulkDelete} className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition">
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Policies Stack */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 text-slate-400 text-sm">
            Loading policies...
          </div>
        ) : sortedPolicies.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 text-slate-400 space-y-2">
            <h3 className="font-bold text-slate-700 text-base">No Policies Found</h3>
            <p className="text-sm">Create your first entry above or adjust filters.</p>
          </div>
        ) : (
          sortedPolicies.map((policy) => (
            <div
              key={policy.id}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedPolicies.includes(policy.id)}
                    onChange={() => toggleSelection(policy.id)}
                    className="mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div className="space-y-2 flex-1">
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                      {policy.title}
                    </h3>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">
                        {policy.category}
                      </span>
                      <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700">
                        {policy.visibility}
                      </span>
                      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                        policy.status === "Published" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                      }`}>
                        {policy.status}
                      </span>
                      {policy.required && (
                        <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-rose-50 text-rose-700">
                          Required
                        </span>
                      )}
                      {policy.pinned && (
                        <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-50 text-purple-700">
                          Pinned
                        </span>
                      )}
                      {policy.expiryDate && (
                        <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-orange-50 text-orange-700">
                          Expires {policy.expiryDate}
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap pt-1">
                      {policy.content.length > 200
                        ? policy.content.substring(0, 200) + "..."
                        : policy.content}
                    </p>

                    <div className="text-xs text-slate-400 pt-1">
                      Updated {policy.updatedAt?.toDate?.().toLocaleDateString() || "Recently"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 flex-wrap">
                <button onClick={() => moveUp(policy)} className="p-2 text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition text-xs font-medium flex items-center gap-1">
                  <ArrowUp size={14} /> Up
                </button>
                <button onClick={() => moveDown(policy)} className="p-2 text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition text-xs font-medium flex items-center gap-1">
                  <ArrowDown size={14} /> Down
                </button>
                <button onClick={() => togglePinned(policy)} className="p-2 text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition text-xs font-medium flex items-center gap-1">
                  <Pin size={14} /> {policy.pinned ? "Unpin" : "Pin"}
                </button>
                <button onClick={() => setPreviewPolicy(policy)} className="p-2 text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition text-xs font-medium flex items-center gap-1">
                  <Eye size={14} /> Preview
                </button>
                <button onClick={() => openHistory(policy)} className="p-2 text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition text-xs font-medium flex items-center gap-1">
                  <Clock size={14} /> History
                </button>
                <button onClick={() => editPolicy(policy)} className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition text-xs font-medium flex items-center gap-1">
                  <Edit3 size={14} /> Edit
                </button>
                <button onClick={() => toggleStatus(policy)} className="p-2 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-xl transition text-xs font-medium flex items-center gap-1">
                  {policy.status === "Published" ? <FileText size={14} /> : <Rocket size={14} />}
                  {policy.status === "Published" ? "Draft" : "Publish"}
                </button>
                <button onClick={() => deletePolicy(policy.id)} className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition text-xs font-medium flex items-center gap-1">
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Preview Modal */}
      {previewPolicy && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 md:p-8 space-y-4 shadow-2xl border border-slate-100 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">{previewPolicy.title}</h2>
              <button onClick={() => setPreviewPolicy(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={20} />
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">
                {previewPolicy.category}
              </span>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700">
                {previewPolicy.visibility}
              </span>
              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                previewPolicy.status === "Published" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
              }`}>
                {previewPolicy.status}
              </span>
            </div>

            <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap py-2 border-y border-slate-100 max-h-[50vh] overflow-y-auto">
              {previewPolicy.content}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPreviewPolicy(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 md:p-8 space-y-4 shadow-2xl border border-slate-100 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Policy Revision History</h2>
              <button onClick={() => setHistoryModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={20} />
              </button>
            </div>

            {policyHistory.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">No recorded history updates found for this policy.</p>
            ) : (
              <div className="space-y-3 max-h-[50vh] overflow-y-auto py-1">
                {policyHistory.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 gap-4">
                    <div>
                      <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">{item.action}</span>
                      <p className="text-sm font-medium text-slate-700 mt-0.5">{item.title}</p>
                      <span className="text-xs text-slate-400 mt-1 block">
                        By {item.editedBy} • {item.editedAt?.toDate?.()?.toLocaleString() || "Recently"}
                      </span>
                    </div>
                    <button
                      onClick={() => restoreVersion(item)}
                      className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition shadow-xs text-slate-700"
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setHistoryModal(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition"
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
