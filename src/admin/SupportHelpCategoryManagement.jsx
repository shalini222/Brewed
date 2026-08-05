import { useEffect, useState, useRef } from "react";
import { db, auth } from "../firebase";
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  serverTimestamp 
} from "firebase/firestore";
import { 
  Truck,
  CreditCard,
  Gift,
  ShieldCheck,
  HelpCircle,
  Coffee,
  CircleDollarSign,
  User,
  ShoppingBag,
  Clock,
  MessageCircle,
  Phone,
  Mail,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  GripVertical,
  Plus,
  Copy,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Check,
  Search,
  Activity,
  Layers,
  Settings,
  CheckCircle2,
  FileText
} from "lucide-react";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors 
} from "@dnd-kit/core";
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy, 
  useSortable 
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createPortal } from "react-dom";

function SortableCategoryItem({ category, index, categories, toggleStatus, openEdit, setDeleteTarget, duplicateCategory, expandCard, expandedId, iconMap, openMenuId, setOpenMenuId }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const Icon = iconMap[category.icon] || HelpCircle;
  const isActive = category.active !== false;
  const isExpanded = expandedId === category.id;
  const menuOpen = openMenuId === category.id;
  const btnRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });

  const updateDropdownPosition = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right
      });
    }
  };

  const handleToggleMenu = (e) => {
    e.stopPropagation();
    if (!menuOpen) {
      updateDropdownPosition();
      setOpenMenuId(category.id);
    } else {
      setOpenMenuId(null);
    }
  };

  useEffect(() => {
    if (!menuOpen) return;
    const handleScrollOrResize = () => {
      updateDropdownPosition();
    };
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [menuOpen]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`list-item ${isExpanded ? "expanded" : ""}`}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "flex-start", paddingTop: 2 }}>
          <div {...attributes} {...listeners} className="drag-handle" title="Drag to reorder" style={{ cursor: "grab", color: "#9E9085", display: "flex", alignItems: "center", justifyContent: "center", paddingRight: 8 }}>
            <GripVertical size={18} strokeWidth={1.8} />
          </div>
          <div className="icon-box" style={{ width: 48, height: 48, borderRadius: 14, background: "#FAF8F6", border: "1px solid #ECE8E3", display: "flex", alignItems: "center", justifyContent: "center", color: "#1A1614", flexShrink: 0 }}>
            <Icon size={22} strokeWidth={1.7} />
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, color: "#1A1614", fontSize: "18px", fontWeight: 600, display: "flex", alignItems: "center", gap: "10px" }}>
            {category.title}
            {category.updatedAt && (
              <span className="badge badge-pinned" style={{ fontSize: "11px" }}>Edited recently</span>
            )}
          </h3>

          <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span className={`badge ${isActive ? 'badge-green' : 'badge-orange'}`}>
              {isActive ? "Live" : "Hidden"}
            </span>
            <span className="badge badge-blue">Icon: {category.icon}</span>
          </div>

          <p style={{ marginTop: 14, color: "#7A6E65", whiteSpace: "pre-wrap", lineHeight: "1.5", fontSize: "14px" }}>
            {category.description}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="dropdown-container" style={{ position: "relative" }}>
            <button 
              ref={btnRef}
              className="btn btn-secondary"
              style={{ padding: "8px 12px", height: "38px" }}
              onClick={handleToggleMenu}
            >
              <MoreVertical size={16} strokeWidth={1.7} />
            </button>

            {menuOpen && createPortal(
              <div 
                className="action-dropdown" 
                style={{ 
                  position: "fixed", 
                  top: dropdownPos.top, 
                  right: dropdownPos.right, 
                  zIndex: 999999, 
                  minWidth: "180px", 
                  background: "white", 
                  borderRadius: "16px", 
                  boxShadow: "0 18px 45px rgba(0,0,0,.15)", 
                  border: "1px solid #ECE8E3", 
                  padding: "8px" 
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button 
                  style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "10px 12px", fontSize: "13px", fontWeight: 600, color: "#1A1614", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
                  onClick={() => { setOpenMenuId(null); openEdit(category); }}
                >
                  <Pencil size={14} /> Edit
                </button>
                <button 
                  style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "10px 12px", fontSize: "13px", fontWeight: 600, color: "#1A1614", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
                  onClick={() => { setOpenMenuId(null); toggleStatus(category); }}
                >
                  {isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                  {isActive ? "Hide" : "Show"}
                </button>
                <button 
                  style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "10px 12px", fontSize: "13px", fontWeight: 600, color: "#1A1614", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
                  onClick={() => { setOpenMenuId(null); duplicateCategory(category); }}
                >
                  <Copy size={14} /> Duplicate
                </button>
                <button 
                  style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "10px 12px", fontSize: "13px", fontWeight: 600, color: "#991B1B", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
                  onClick={() => { setOpenMenuId(null); setDeleteTarget(category); }}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>,
              document.body
            )}
          </div>

          <button 
            className="btn btn-secondary"
            style={{ padding: "8px 12px", height: "38px" }}
            onClick={() => expandCard(category.id)}
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #ECE8E3" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: "12px", fontSize: "13px", color: "#7A6E65" }}>
            <div><span>Icon:</span> <strong style={{ color: "#1A1614" }}>{category.icon}</strong></div>
            <div><span>Status:</span> <strong style={{ color: "#1A1614" }}>{isActive ? "Live" : "Hidden"}</strong></div>
            <div><span>Sort Order:</span> <strong style={{ color: "#1A1614" }}>{category.sortOrder || index + 1}</strong></div>
            <div><span>Created:</span> <strong style={{ color: "#1A1614" }}>{category.createdAt?.toDate ? category.createdAt.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "Just now"}</strong></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SupportHelpCategoryManagement() {
  const [categories, setCategories] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("Truck");
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [toastMessage, setToastMessage] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [saveState, setSaveState] = useState("idle");
  const [lastSynced, setLastSynced] = useState("Just now");
  const [openMenuId, setOpenMenuId] = useState(null);
  
  const [iconDropdownOpen, setIconDropdownOpen] = useState(false);
  const [recentActivities, setRecentActivities] = useState([]);

  const formRef = useRef(null);
  const titleInputRef = useRef(null);
  const iconDropdownRef = useRef(null);

  const icons = [
    "Truck", "CreditCard", "Gift", "ShieldCheck", "HelpCircle", 
    "Coffee", "CircleDollarSign", "User", "ShoppingBag", "Clock", 
    "MessageCircle", "Phone", "Mail"
  ];

  const iconMap = {
    Truck, CreditCard, Gift, ShieldCheck, HelpCircle, 
    Coffee, CircleDollarSign, User, ShoppingBag, Clock, 
    MessageCircle, Phone, Mail
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage("");
    }, 3000);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (openMenuId && !e.target.closest(".action-dropdown") && !e.target.closest(".action-btn")) {
        setOpenMenuId(null);
      }
      if (iconDropdownOpen && iconDropdownRef.current && !iconDropdownRef.current.contains(e.target)) {
        setIconDropdownOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [openMenuId, iconDropdownOpen]);

  useEffect(() => {
    const q = query(
      collection(db, "supportHelpCategories"),
      orderBy("sortOrder")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCategories(
        snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      );
      setLoading(false);
      setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const key = e => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveCategory();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [title, description, icon, editingId, categories]);

  const saveCategory = async () => {
    if (!title.trim()) return;
    
    setSaveState("saving");

    const data = {
      title,
      description,
      icon,
      active: true,
      updatedAt: serverTimestamp(),
      sortOrder: editingId 
        ? categories.find(c => c.id === editingId)?.sortOrder || categories.length + 1 
        : categories.length + 1
    };

    if (editingId) {
      await updateDoc(doc(db, "supportHelpCategories", editingId), data);
      setRecentActivities(prev => [{ id: Date.now(), text: `You updated ${title}`, time: "Just now" }, ...prev]);
    } else {
      await addDoc(collection(db, "supportHelpCategories"), {
        ...data,
        createdAt: serverTimestamp()
      });
      setRecentActivities(prev => [{ id: Date.now(), text: `You created ${title}`, time: "Just now" }, ...prev]);
    }
    
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 1200);
    showToast(editingId ? "Category updated" : "Category created");

    setEditingId(null);
    setTitle("");
    setDescription("");
    setIcon("Truck");
    setDirty(false);
  };

  const duplicateCategory = async (cat) => {
    const newTitle = `${cat.title} Copy`;
    await addDoc(collection(db, "supportHelpCategories"), {
      title: newTitle,
      description: cat.description,
      icon: cat.icon,
      active: cat.active,
      sortOrder: categories.length + 1,
      createdAt: serverTimestamp()
    });
    setRecentActivities(prev => [{ id: Date.now(), text: `You duplicated ${cat.title}`, time: "Just now" }, ...prev]);
    showToast("Category duplicated");
  };

  const toggleStatus = async (category) => {
    const newActiveState = category.active === false;
    await updateDoc(
      doc(db, "supportHelpCategories", category.id),
      {
        active: newActiveState
      }
    );
    setRecentActivities(prev => [{ id: Date.now(), text: `You ${newActiveState ? 'showed' : 'hid'} ${category.title}`, time: "Just now" }, ...prev]);
    showToast(category.active ? "Category hidden" : "Category is now live");
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex(c => c.id === active.id);
    const newIndex = categories.findIndex(c => c.id === over.id);

    const newItems = arrayMove(categories, oldIndex, newIndex);
    setCategories(newItems);

    for (let i = 0; i < newItems.length; i++) {
      await updateDoc(doc(db, "supportHelpCategories", newItems[i].id), {
        sortOrder: i + 1
      });
    }
    setRecentActivities(prev => [{ id: Date.now(), text: `You reordered categories`, time: "Just now" }, ...prev]);
    showToast("Order updated");
  };

  const confirmDelete = async () => { 
    if (!deleteTarget) return; 
    await deleteDoc(doc(db, "supportHelpCategories", deleteTarget.id)); 
    setRecentActivities(prev => [{ id: Date.now(), text: `You deleted ${deleteTarget.title}`, time: "Just now" }, ...prev]);
    showToast("Category deleted"); 
    setDeleteTarget(null); 
  };

  const isDuplicateTitle = categories.some(
    c => c.title.toLowerCase() === title.trim().toLowerCase() && c.id !== editingId
  );

  const filteredCategories = categories.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) || 
                          c.description.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "All" || 
                          (filter === "Active" && c.active !== false) || 
                          (filter === "Hidden" && c.active === false);
    return matchesSearch && matchesFilter;
  });

  const SelectedIconComponent = iconMap[icon] || HelpCircle;

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

        .empty-state {
          text-align: center;
          padding: 48px 20px;
          border: 2px dashed #ECE8E3;
          border-radius: 18px;
          color: #7A6E65;
          background: white;
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

      {deleteTarget && createPortal(
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: "420px" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "#FEF2F2", border: "1px solid #FEE2E2", display: "flex", alignItems: "center", justifyContent: "center", color: "#991B1B", marginBottom: "16px" }}>
              <Trash2 size={20} strokeWidth={1.8} />
            </div>
            <h2 style={{ fontSize: "20px", color: "#1A1614", margin: "0 0 10px" }}>Delete category</h2>
            <p style={{ color: "#7A6E65", margin: "0 0 24px", lineHeight: "1.5", fontSize: "14px" }}>
              <strong style={{ color: "#1A1614" }}>{deleteTarget.title}</strong> will be permanently removed from the Help Centre.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmDelete}>Delete Category</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Hero Header */}
      <div className="admin-hero">
        <div className="hero-top-row">
          <div className="hero-title-area">
            <h1>Support Help Categories</h1>
            <p>Manage help topics and customer support routing.</p>
          </div>
          <div style={{ fontSize: "13px", color: "#7A6E65", fontWeight: 500 }}>
            Last synced {lastSynced}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="hero-stats-grid">
          <div className="stat-card">
            <div className="stat-icon"><ShieldCheck size={22} /></div>
            <div className="stat-content">
              <div className="stat-label">Total Categories</div>
              <div className="stat-value">{categories.length}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><Layers size={22} /></div>
            <div className="stat-content">
              <div className="stat-label">Active</div>
              <div className="stat-value">{categories.filter(c => c.active !== false).length}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><FileText size={22} /></div>
            <div className="stat-content">
              <div className="stat-label">Hidden</div>
              <div className="stat-value">{categories.filter(c => c.active === false).length}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><Settings size={22} /></div>
            <div className="stat-content">
              <div className="stat-label">Icons Used</div>
              <div className="stat-value">{new Set(categories.map(c => c.icon)).size}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="dashboard-card">
        <h2 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "18px", marginBottom: "16px" }}>
          <Activity size={18} color="#1A1614" /> Recent Activity
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "220px", overflowY: "auto" }}>
          {recentActivities.length === 0 ? (
            <div style={{ color: "#7A6E65", fontSize: "14px", padding: "12px 0" }}>No recent activity yet. Actions will appear here as you manage categories.</div>
          ) : (
            recentActivities.map(act => (
              <div key={act.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "10px 0", borderBottom: "1px solid #ECE8E3" }}>
                <span style={{ color: "#1A1614", fontWeight: 500 }}>{act.text}</span>
                <span style={{ color: "#7A6E65", fontSize: "12px" }}>{act.time}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add / Edit Form Card */}
      <div className="dashboard-card" ref={formRef}>
        <h2>{editingId ? "Edit Category" : "New Category"}</h2>
        <p style={{ margin: "-12px 0 20px 0", color: "#7A6E65", fontSize: "14px" }}>Configure navigation routing for customers.</p>

        {dirty && (
          <div style={{ marginBottom: "20px", padding: "12px 16px", background: "#FAF8F6", border: "1px solid #ECE8E3", borderRadius: "12px", color: "#1A1614", fontSize: "13px", fontWeight: 600 }}>
            You have unsaved changes. (Ctrl + S)
          </div>
        )}

        <div>
          <input
            ref={titleInputRef}
            className="admin-input"
            value={title}
            maxLength={40}
            onChange={(e) => {
              setTitle(e.target.value);
              setDirty(true);
            }}
            placeholder="Category title"
          />
          <div style={{ textAlign: "right", fontSize: "12px", color: "#7A6E65", marginTop: "-10px", marginBottom: "16px" }}>{title.length}/40</div>
          {isDuplicateTitle && (
            <div style={{ color: "#991B1B", fontSize: "13px", marginTop: "-10px", marginBottom: "16px", fontWeight: 600 }}>Category already exists.</div>
          )}
        </div>

        {/* Icon Picker Dropdown */}
        <div style={{ position: "relative", marginBottom: "16px" }} ref={iconDropdownRef}>
          <div 
            className="admin-input"
            onClick={() => setIconDropdownOpen(!iconDropdownOpen)}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", marginBottom: 0 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <SelectedIconComponent size={18} color="#1A1614" />
              <span>{icon}</span>
            </div>
            <ChevronDown size={16} color="#7A6E65" />
          </div>

          {iconDropdownOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "white", border: "1px solid #ECE8E3", borderRadius: "14px", boxShadow: "0 10px 30px rgba(0,0,0,0.06)", padding: "8px", zIndex: 50, maxHeight: "220px", overflowY: "auto" }}>
              {icons.map(name => {
                const Icon = iconMap[name];
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setIcon(name);
                      setDirty(true);
                      setIconDropdownOpen(false);
                    }}
                    style={{ background: icon === name ? "#FAF8F6" : "white", border: "none", borderRadius: "10px", padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px", color: "#1A1614", width: "100%", textAlign: "left", fontWeight: icon === name ? 600 : 400 }}
                  >
                    <Icon size={18} strokeWidth={1.8} />
                    <span style={{ fontSize: "14px" }}>{name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <textarea
            className="admin-textarea"
            value={description}
            maxLength={120}
            onChange={(e) => {
              setDescription(e.target.value);
              setDirty(true);
            }}
            placeholder="Description"
            rows="3"
          />
          <div style={{ textAlign: "right", fontSize: "12px", color: "#7A6E65", marginTop: "-10px", marginBottom: "16px" }}>{description.length}/120</div>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button 
            className="btn btn-primary"
            onClick={saveCategory}
            style={{ padding: "12px 24px" }}
          >
            {saveState === "saving" ? "Saving..." : saveState === "saved" ? <><Check size={16} /> Saved</> : editingId ? "Update Category" : "Create Category"}
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => {
              setTitle("");
              setDescription("");
              setIcon("Truck");
              setEditingId(null);
              setDirty(false);
            }}
            style={{ padding: "12px 20px" }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Category List & Filter Toolbar */}
      <div className="dashboard-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "20px", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ margin: 0 }}>Manage Categories</h2>
            <p style={{ margin: "4px 0 0", color: "#7A6E65", fontSize: "14px" }}>Organise how support topics appear. Drag items to reorder.</p>
          </div>
          <span className="badge badge-blue">{categories.length} Categories</span>
        </div>

        <div style={{ position: "relative", marginBottom: "16px" }}>
          <input 
            className="admin-input" 
            placeholder="Search categories..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            style={{ marginBottom: 0, paddingLeft: "42px" }}
          />
          <Search size={16} style={{ position: "absolute", left: 15, top: 16, color: "#7A6E65" }} />
        </div>

        <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
          <button className={`btn ${filter === "All" ? "btn-primary" : "btn-secondary"}`} onClick={() => setFilter("All")}>All</button>
          <button className={`btn ${filter === "Active" ? "btn-primary" : "btn-secondary"}`} onClick={() => setFilter("Active")}>Active</button>
          <button className={`btn ${filter === "Hidden" ? "btn-primary" : "btn-secondary"}`} onClick={() => setFilter("Hidden")}>Hidden</button>
        </div>

        {loading ? (
          <div className="empty-state">Loading categories...</div>
        ) : filteredCategories.length === 0 ? (
          <div className="empty-state">
            <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", color: "#1A1614" }}>No matching categories</h3>
            <p style={{ margin: "0 0 16px 0", fontSize: "14px" }}>Try another keyword or search query.</p>
            <button className="btn btn-secondary" onClick={() => setSearch("")}>Clear Search</button>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filteredCategories.map(c => c.id)} strategy={verticalListSortingStrategy}>
              <div className="admin-list">
                {filteredCategories.map((category, index) => (
                  <SortableCategoryItem
                    key={category.id}
                    category={category}
                    index={index}
                    categories={categories}
                    toggleStatus={toggleStatus}
                    openEdit={(cat) => {
                      setEditingId(cat.id);
                      setTitle(cat.title);
                      setDescription(cat.description);
                      setIcon(cat.icon);
                      setDirty(false);
                      if (formRef.current) {
                        formRef.current.scrollIntoView({ behavior: "smooth" });
                      }
                      if (titleInputRef.current) {
                        titleInputRef.current.focus();
                      }
                    }}
                    setDeleteTarget={setDeleteTarget}
                    duplicateCategory={duplicateCategory}
                    expandCard={(id) => setExpandedId(expandedId === id ? null : id)}
                    expandedId={expandedId}
                    iconMap={iconMap}
                    openMenuId={openMenuId}
                    setOpenMenuId={setOpenMenuId}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Customer Preview Box */}
      <div className="dashboard-card" style={{ marginBottom: 0 }}>
        <h2 style={{ margin: "0 0 6px" }}>Customer Preview</h2>
        <p style={{ color: "#7A6E65", marginBottom: "20px", fontSize: "14px" }}>
          Live rendering inside the consumer Help Centre.
        </p>

        <div style={{ background: "#FAF8F6", color: "#1A1614", borderRadius: "16px", padding: "20px", border: "1px solid #ECE8E3", maxHeight: "430px", overflowY: "auto" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.04em", color: "#7A6E65", marginBottom: "16px", fontWeight: 600 }}>Support Centre</div>
          {categories.filter(c => c.active !== false).map(category => {
            const Icon = iconMap[category.icon] || HelpCircle;
            return (
              <div key={category.id} style={{ background: "white", border: "1px solid #ECE8E3", borderRadius: "14px", padding: "16px", display: "flex", gap: "16px", alignItems: "flex-start", marginBottom: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "#FAF8F6", border: "1px solid #ECE8E3", display: "flex", justifyContent: "center", alignItems: "center", flexShrink: 0, color: "#1A1614" }}>
                  <Icon size={18} strokeWidth={1.7} />
                </div>
                <div>
                  <h5 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 600, color: "#1A1614" }}>{category.title}</h5>
                  <p style={{ margin: 0, fontSize: "13px", color: "#7A6E65", lineHeight: "1.5" }}>{category.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
