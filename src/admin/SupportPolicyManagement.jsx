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
  X,
  CheckCircle2,
  ShieldCheck,
  Layers,
  AlertCircle,
  Settings
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

  // Delete Modal State (Supports single or bulk)
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [isBulkDelete, setIsBulkDelete] = useState(false);

  const [toastMessage, setToastMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

    // Duplicate title validation
    const exists = policies.some(
      p => p.title.trim().toLowerCase() === title.trim().toLowerCase() && p.id !== editingId
    );
    if (exists) {
      showToast("Policy already exists.");
      return;
    }

    // Effective/Expiry validation
    if (
      effectiveDate &&
      expiryDate &&
      new Date(expiryDate) < new Date(effectiveDate)
    ) {
      showToast("Expiry date cannot be before effective date.");
      return;
    }

    setSaving(true);

    try {
      const admin = getCurrentAdminName();
      const currentStatus = published ? "Published" : "Draft";

      if (editingId) {
        const existingPolicy = policies.find(p => p.id === editingId);
        
        // Automatic Versioning Increment
        const nextVersion = (parseFloat(existingPolicy?.version || "1.0") + 0.1).toFixed(1);

        if (existingPolicy) {
          // Save comprehensive version history fields
          await addDoc(
            collection(db, "supportPolicyHistory"),
            {
              policyId: editingId,
              title: existingPolicy.title,
              content: existingPolicy.content,
              category: existingPolicy.category,
              version: existingPolicy.version || "1.0",
              status: existingPolicy.status,
              published: existingPolicy.published || false,
              required: existingPolicy.required || false,
              visibility: existingPolicy.visibility || "Customer",
              effectiveDate: existingPolicy.effectiveDate || "",
              expiryDate: existingPolicy.expiryDate || "",
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
          version: version !== existingPolicy?.version ? version : nextVersion,
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
          version: "1.0",
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
    } finally {
      setSaving(false);
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
      const admin = getCurrentAdminName();
      const existingPolicy = policies.find(p => p.id === versionData.policyId);

      // Preserve current version to history before overwriting with the restored version
      if (existingPolicy) {
        await addDoc(
          collection(db, "supportPolicyHistory"),
          {
            policyId: versionData.policyId,
            title: existingPolicy.title,
            content: existingPolicy.content,
            category: existingPolicy.category,
            version: existingPolicy.version || "1.0",
            status: existingPolicy.status,
            published: existingPolicy.published || false,
            required: existingPolicy.required || false,
            visibility: existingPolicy.visibility || "Customer",
            effectiveDate: existingPolicy.effectiveDate || "",
            expiryDate: existingPolicy.expiryDate || "",
            editedBy: admin,
            editedAt: serverTimestamp(),
            action: "Pre-Restore Snapshot"
          }
        );
      }

      // Restore all comprehensive fields
      await updateDoc(
        doc(db, "supportPolicies", versionData.policyId),
        {
          title: versionData.title,
          content: versionData.content,
          category: versionData.category,
          version: versionData.version || "1.0",
          status: versionData.status,
          published: versionData.published || false,
          required: versionData.required || false,
          visibility: versionData.visibility,
          effectiveDate: versionData.effectiveDate || "",
          expiryDate: versionData.expiryDate || "",
          updatedAt: serverTimestamp(),
          updatedBy: admin
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

  const confirmDelete = async () => {
    try {
      const admin = getCurrentAdminName();

      if (isBulkDelete) {
        for (const id of selectedPolicies) {
          const policyToDelete = policies.find(p => p.id === id);
          if (policyToDelete) {
            // Archive to history collection before deletion
            await addDoc(collection(db, "supportPolicyHistory"), {
              policyId: id,
              title: policyToDelete.title,
              content: policyToDelete.content,
              category: policyToDelete.category,
              version: policyToDelete.version || "1.0",
              status: policyToDelete.status,
              published: policyToDelete.published || false,
              required: policyToDelete.required || false,
              visibility: policyToDelete.visibility || "Customer",
              effectiveDate: policyToDelete.effectiveDate || "",
              expiryDate: policyToDelete.expiryDate || "",
              editedBy: admin,
              editedAt: serverTimestamp(),
              action: "Archived / Deleted"
            });
          }
          await deleteDoc(doc(db, "supportPolicies", id));
        }
        showToast(`${selectedPolicies.length} policies deleted.`);
        setSelectedPolicies([]);
      } else if (deleteId) {
        const policyToDelete = policies.find(p => p.id === deleteId);
        if (policyToDelete) {
          // Archive to history collection before deletion
          await addDoc(collection(db, "supportPolicyHistory"), {
            policyId: deleteId,
            title: policyToDelete.title,
            content: policyToDelete.content,
            category: policyToDelete.category,
            version: policyToDelete.version || "1.0",
            status: policyToDelete.status,
            published: policyToDelete.published || false,
            required: policyToDelete.required || false,
            visibility: policyToDelete.visibility || "Customer",
            effectiveDate: policyToDelete.effectiveDate || "",
            expiryDate: policyToDelete.expiryDate || "",
            editedBy: admin,
            editedAt: serverTimestamp(),
            action: "Archived / Deleted"
          });
        }
        await deleteDoc(doc(db, "supportPolicies", deleteId));
        showToast("Policy deleted.");
      }

      setDeleteModal(false);
      setDeleteId(null);
      setIsBulkDelete(false);
    } catch (err) {
      console.log(err);
      showToast("Failed to delete policy.");
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
        expiryDate,
        version,
        published
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
        expiryDate,
        version,
        published
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
        let importedCount = 0;
        let skippedCount = 0;

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
              version: item.version || "1.0",
              published: item.published ?? (item.status === "Published"),
              pinned: item.pinned || false,
              sortOrder: policies.length + importedCount + 1,
              visibility: item.visibility || "Customer",
              required: item.required || false,
              effectiveDate: item.effectiveDate || null,
              expiryDate: item.expiryDate || null,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              updatedBy: admin
            });
            importedCount++;
          } else {
            skippedCount++;
          }
        }
        showToast(`Imported ${importedCount}, Skipped ${skippedCount} duplicates.`);
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

    const matchesCategory =
      categoryFilter === "All" || policy.category === categoryFilter;

    const matchesStatus =
      statusFilter === "All" || policy.status === statusFilter;

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
    <div className="admin-page">
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
          max-width: 1240px;
          margin: 0 auto;
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

        .hero-title-area h1 {
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
          font-size: 12px;
          font-weight: 600;
          color: #7A6E65;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 4px;
        }

        .stat-content .stat-value {
          font-size: 24px;
          font-weight: 600;
          color: #1A1614;
          letter-spacing: -0.01em;
        }

        /* TOAST NOTIFICATION */
        .success-toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: #EEF5EF;
          border: 1px solid #D8E6D8;
          padding: 14px 20px;
          border-radius: 14px;
          color: #36543A;
          font-weight: 500;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.06);
          z-index: 1000;
          animation: slideDown 0.3s ease;
        }

        /* DASHBOARD CARDS & FORM */
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

        .dashboard-card h2 {
          margin: 0 0 20px 0;
          color: #1A1614;
          font-size: 19px;
          font-weight: 600;
          letter-spacing: -0.01em;
        }

        /* INPUTS & SELECTS */
        .admin-input,
        .admin-select,
        .admin-textarea {
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
          margin-bottom: 16px;
        }

        .admin-textarea {
          height: auto;
          min-height: 130px;
          padding: 14px 16px;
          resize: vertical;
        }

        .admin-input:hover,
        .admin-select:hover,
        .admin-textarea:hover {
          border-color: #C8BFC5;
          background: white;
        }

        .admin-input:focus,
        .admin-select:focus,
        .admin-textarea:focus {
          border-color: #1A1614;
          background: white;
          box-shadow: 0 0 0 4px rgba(26,22,20,0.06);
        }

        /* BUTTONS */
        .btn {
          padding: 10px 18px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          font-weight: 500;
          font-size: 13px;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-decoration: none;
        }

        .btn-primary {
          background: #1A1614;
          color: white;
        }

        .btn-primary:hover {
          background: #332C28;
        }

        .btn-primary:disabled {
          background: #C8C2BE;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #FAF8F6;
          border: 1px solid #ECE8E3;
          color: #1A1614;
        }

        .btn-secondary:hover {
          background: white;
          border-color: #1A1614;
        }

        .btn-danger {
          background: #FEF2F2;
          color: #991B1B;
          border: 1px solid #FEE2E2;
        }

        .btn-danger:hover {
          background: #FEE2E2;
        }

        /* LIST & ITEMS */
        .admin-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .list-item {
          background: white;
          border: 1px solid #ECE8E3;
          border-radius: 18px;
          padding: 24px;
          transition: border-color 0.2s ease, transform 0.2s ease;
          box-shadow: 0 4px 16px rgba(44,34,30,0.02);
        }

        .list-item:hover {
          border-color: #D8D0C7;
          transform: translateY(-2px);
        }

        /* BADGES */
        .badge {
          display: inline-flex;
          align-items: center;
          padding: 5px 12px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.02em;
        }

        .badge-green { background: #EEF5EF; color: #36543A; border: 1px solid #D8E6D8; }
        .badge-red { background: #FEF2F2; color: #991B1B; border: 1px solid #FEE2E2; }
        .badge-orange { background: #F8F3E8; color: #8B6A2B; border: 1px solid #E7D9B5; }
        .badge-blue { background: #F0F4F8; color: #3B5998; border: 1px solid #D9E2EC; }
        .badge-pinned { background: #FAF8F6; color: #1A1614; border: 1px solid #ECE8E3; }

        /* MODALS */
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(26, 22, 20, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1001;
          padding: 20px;
          box-sizing: border-box;
        }

        .modal-card {
          background: white;
          border: 1px solid #ECE8E3;
          border-radius: 20px;
          padding: 28px;
          max-width: 640px;
          width: 100%;
          max-height: 85vh;
          overflow-y: auto;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
        }

        .empty-state {
          text-align: center;
          padding: 48px 20px;
          border: 2px dashed #ECE8E3;
          border-radius: 18px;
          color: #7A6E65;
          background: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        /* TOOLBAR CARD STYLES */
        .toolbar-card {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .toolbar-top {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        .toolbar-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        /* POLICY META */
        .policy-meta {
          display: flex;
          gap: 18px;
          margin-top: 16px;
          font-size: 12px;
          color: #8B8179;
          flex-wrap: wrap;
          align-items: center;
        }

        /* SKELETON LOADING STYLES */
        .skeleton-card {
          height: 180px;
          border-radius: 18px;
          background: linear-gradient(
            90deg,
            #f5f3ef,
            #ffffff,
            #f5f3ef
          );
          background-size: 200% 100%;
          animation: loading 1.2s infinite;
          border: 1px solid #ECE8E3;
        }

        @keyframes loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media(max-width: 768px) {
          .admin-page { padding: 16px; }
          .hero-top-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
            padding: 20px;
          }
        }
      `}</style>

      {toastMessage && (
        <div className="success-toast">
          <CheckCircle2 size={16} />
          {toastMessage}
        </div>
      )}

      {/* Hero Header */}
      <div className="admin-hero">
        <div className="hero-top-row">
          <div className="hero-title-area">
            <h1>Support Policy Management</h1>
            <p>Create, manage, and publish customer support policies seamlessly.</p>
          </div>
          <div className="hero-action-slot">
            <button className="btn btn-secondary" onClick={exportPolicies} style={{ height: "42px" }}>
              <Download size={15} /> Export
            </button>
            <label className="btn btn-secondary" style={{ cursor: "pointer", height: "42px", display: "inline-flex", alignItems: "center" }}>
              <Upload size={15} /> Import
              <input type="file" accept=".json" onChange={importPolicies} hidden />
            </label>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="hero-stats-grid">
          <div className="stat-card">
            <div className="stat-icon"><ShieldCheck size={22} /></div>
            <div className="stat-content">
              <div className="stat-label">Total Policies</div>
              <div className="stat-value">{totalPolicies}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><Layers size={22} /></div>
            <div className="stat-content">
              <div className="stat-label">Published</div>
              <div className="stat-value">{publishedPolicies}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><FileText size={22} /></div>
            <div className="stat-content">
              <div className="stat-label">Drafts</div>
              <div className="stat-value">{draftPolicies}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><Settings size={22} /></div>
            <div className="stat-content">
              <div className="stat-label">Categories</div>
              <div className="stat-value">{totalCategories}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="dashboard-card">
        <h2>{editingId ? "Edit Policy" : "Add New Policy"}</h2>

        <input
          className="admin-input"
          placeholder="Policy Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 140px", gap: "16px" }}>
          <select className="admin-select" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option>General</option>
            <option>Delivery</option>
            <option>Refunds</option>
            <option>Payments</option>
            <option>Privacy</option>
            <option>Terms</option>
            <option>Rewards</option>
          </select>

          <select className="admin-select" value={visibility} onChange={(e) => setVisibility(e.target.value)}>
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
            placeholder="Version (1.0)"
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#7A6E65', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>
              Effective Date
            </label>
            <input type="date" className="admin-input" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#7A6E65', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>
              Expiry Date (Optional)
            </label>
            <input type="date" className="admin-input" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          </div>
        </div>

        <textarea
          className="admin-textarea"
          placeholder="Write policy content..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        <div style={{ display: "flex", gap: "24px", alignItems: "center", margin: "4px 0 20px 0" }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer", fontSize: "14px", fontWeight: 500, color: '#5A4E46' }}>
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: "#1A1614" }}
            />
            Published
          </label>

          <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer", fontSize: "14px", fontWeight: 500, color: '#5A4E46' }}>
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: "#1A1614" }}
            />
            Required Policy
          </label>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            className="btn btn-primary"
            onClick={savePolicy}
            disabled={!title.trim() || !content.trim() || saving}
            style={{ padding: "12px 24px" }}
          >
            <Plus size={16} /> {saving ? "Saving..." : (editingId ? "Update Policy" : "Create Policy")}
          </button>
          {editingId && (
            <button className="btn btn-secondary" onClick={resetForm} style={{ padding: "12px 20px" }}>
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Toolbar Card */}
      <div className="dashboard-card toolbar-card">
        <div className="toolbar-top">
          <div style={{ flex: 1, position: "relative", minWidth: "260px" }}>
            <input
              className="admin-input"
              placeholder="Search policies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ marginBottom: 0, paddingLeft: "42px" }}
            />
            <SearchIcon size={16} style={{ position: "absolute", left: 15, top: 16, color: "#7A6E65" }} />
          </div>

          <select
            className="admin-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ width: 180, marginBottom: 0 }}
          >
            <option value="All">All Categories</option>
            {[...new Set(policies.map(p => p.category))].map(cat => (
              <option key={cat}>{cat}</option>
            ))}
          </select>

          <select
            className="admin-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 160, marginBottom: 0 }}
          >
            <option value="All">All Status</option>
            <option value="Published">Published</option>
            <option value="Draft">Draft</option>
          </select>
        </div>

        <div className="toolbar-bottom">
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-secondary" onClick={selectAll}>Select All</button>
            <button className="btn btn-secondary" onClick={clearSelection}>Clear</button>
          </div>

          {selectedPolicies.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn btn-primary" onClick={bulkPublish}>Publish</button>
              <button className="btn btn-secondary" onClick={bulkDraft}>Draft</button>
              <button className="btn btn-secondary" onClick={() => bulkPin(true)}>Pin</button>
              <button className="btn btn-secondary" onClick={() => bulkPin(false)}>Unpin</button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  setIsBulkDelete(true);
                  setDeleteModal(true);
                }}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Policies List */}
      <div className="admin-list">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-card" />
          ))
        ) : sortedPolicies.length === 0 ? (
          <div className="empty-state">
            <FileText size={52} />
            <h3>No Policies Found</h3>
            <p style={{ margin: 0, fontSize: "14px" }}>Create your first policy to get started.</p>
            <button
              className="btn btn-primary"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              style={{ marginTop: 8 }}
            >
              Create Policy
            </button>
          </div>
        ) : (
          sortedPolicies.map((policy) => (
            <div key={policy.id} className="list-item">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "flex-start", paddingTop: 4 }}>
                  <input
                    type="checkbox"
                    checked={selectedPolicies.includes(policy.id)}
                    onChange={() => toggleSelection(policy.id)}
                    style={{ width: 16, height: 16, accentColor: "#1A1614", cursor: "pointer" }}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, color: "#1A1614", fontSize: "18px", fontWeight: 600 }}>
                    {policy.title}
                  </h3>

                  <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span className="badge badge-blue">{policy.category}</span>
                    <span className="badge badge-blue">{policy.visibility}</span>
                    <span className={`badge ${policy.status === "Published" ? "badge-green" : "badge-orange"}`}>
                      {policy.status}
                    </span>
                    {policy.required && <span className="badge badge-red">Required</span>}
                    {policy.pinned && <span className="badge badge-pinned">Pinned</span>}
                    {policy.effectiveDate && (
                      <span className="badge badge-blue">Effective {policy.effectiveDate}</span>
                    )}
                    {policy.expiryDate && <span className="badge badge-orange">Expires {policy.expiryDate}</span>}
                  </div>

                  <p style={{ marginTop: 14, color: "#7A6E65", whiteSpace: "pre-wrap", lineHeight: "1.5", fontSize: "14px" }}>
                    {policy.content.length > 200 ? policy.content.substring(0, 200) + "..." : policy.content}
                  </p>

                  <div className="policy-meta">
                    <span>Version {policy.version || "1.0"}</span>
                    <span>Updated by {policy.updatedBy || "System"}</span>
                    <span>{policy.updatedAt?.toDate?.().toLocaleDateString() || "Recently"}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Eye size={14} /> {policy.views || 0}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "flex-end", alignItems: "center", marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #ECE8E3" }}>
                <button className="btn btn-secondary" onClick={() => moveUp(policy)} title="Move Up">
                  <ArrowUp size={13} /> Up
                </button>
                <button className="btn btn-secondary" onClick={() => moveDown(policy)} title="Move Down">
                  <ArrowDown size={13} /> Down
                </button>
                <button className="btn btn-secondary" onClick={() => togglePinned(policy)}>
                  <Pin size={13} /> {policy.pinned ? "Unpin" : "Pin"}
                </button>
                <button className="btn btn-secondary" onClick={() => setPreviewPolicy(policy)}>
                  <Eye size={13} /> Preview
                </button>
                <button className="btn btn-secondary" onClick={() => openHistory(policy)}>
                  <Clock size={13} /> History
                </button>
                <button className="btn btn-secondary" onClick={() => editPolicy(policy)}>
                  <Edit3 size={13} /> Edit
                </button>
                <button className="btn btn-secondary" onClick={() => toggleStatus(policy)}>
                  {policy.status === "Published" ? <FileText size={13} /> : <Rocket size={13} />}
                  {policy.status === "Published" ? "Draft" : "Publish"}
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    setDeleteId(policy.id);
                    setIsBulkDelete(false);
                    setDeleteModal(true);
                  }}
                >
                  <Trash2 size={13} /> Delete
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
              <h2 style={{ margin: 0, fontSize: "20px", color: "#1A1614" }}>{previewPolicy.title}</h2>
              <button onClick={() => setPreviewPolicy(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#7A6E65" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: 16, display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span className="badge badge-blue">{previewPolicy.category}</span>
              <span className="badge badge-blue">{previewPolicy.visibility}</span>
              <span className={`badge ${previewPolicy.status === "Published" ? "badge-green" : "badge-orange"}`}>
                {previewPolicy.status}
              </span>
              {previewPolicy.required && <span className="badge badge-red">Required</span>}
              {previewPolicy.pinned && <span className="badge badge-pinned">Pinned</span>}
            </div>

            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, color: "#5A4E46", maxHeight: "50vh", overflowY: "auto", fontSize: "14px" }}>
              {previewPolicy.content}
            </div>

            <div style={{ marginTop: 24, textAlign: "right" }}>
              <button className="btn btn-primary" onClick={() => setPreviewPolicy(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: "20px", color: "#1A1614" }}>Policy History</h2>
              <button onClick={() => setHistoryModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#7A6E65" }}>
                <X size={18} />
              </button>
            </div>

            {policyHistory.length === 0 ? (
              <p style={{ color: "#7A6E65", fontSize: "14px" }}>No version history available for this policy yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: "50vh", overflowY: "auto", marginBottom: 20 }}>
                {policyHistory.map(item => (
                  <div key={item.id} style={{ background: "#FAF8F6", border: "1px solid #ECE8E3", borderRadius: "14px", padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div>
                      <strong style={{ color: "#1A1614", fontSize: "13px" }}>{item.action} (v{item.version || "1.0"})</strong>
                      <p style={{ margin: "4px 0", color: "#7A6E65", fontSize: "13px" }}>{item.title}</p>
                      <small style={{ color: "#9E9085", fontSize: "11px" }}>
                        {item.editedBy} • {item.editedAt?.toDate?.()?.toLocaleString() || "Recently"}
                      </small>
                    </div>
                    <button className="btn btn-secondary" onClick={() => restoreVersion(item)}>
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ textAlign: "right" }}>
              <button className="btn btn-primary" onClick={() => setHistoryModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>{isBulkDelete ? `Delete ${selectedPolicies.length} Policies?` : "Delete Policy?"}</h2>
            <p style={{ color: "#7A6E65", fontSize: "14px", margin: "8px 0 0" }}>
              This action cannot be undone. Are you sure you want to permanently delete {isBulkDelete ? "these selected support policies" : "this support policy"}?
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => { setDeleteModal(false); setIsBulkDelete(false); }}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
