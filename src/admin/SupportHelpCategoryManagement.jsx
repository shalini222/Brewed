import { useEffect, useState, useRef } from "react";
import { db } from "../firebase";
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
  Activity
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

  // Keep dropdown pinned and dynamically update its position as the user scrolls
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
      className={`category-item ${isExpanded ? "expanded" : ""}`}
    >
      <div className="category-main-row">
        <div className="category-left">
          <div {...attributes} {...listeners} className="drag-handle" title="Drag to reorder">
            <GripVertical size={18} strokeWidth={1.8} />
          </div>
          <div className="icon-box">
            <Icon size={24} strokeWidth={1.7} color="#C4956A" />
          </div>
          <div>
            <div className="category-title">
              {category.title}
              {category.updatedAt && (
                <span className="recent-badge">Edited recently</span>
              )}
            </div>
            <div className="category-desc">{category.description}</div>
          </div>
        </div>

        <div className="category-right-actions">
          <span className={`status-badge ${isActive ? 'status-active' : 'status-disabled'}`}>
            {isActive ? "Live" : "Hidden"}
          </span>

          <div className="dropdown-container">
            <button 
              ref={btnRef}
              className="action-btn"
              onClick={handleToggleMenu}
            >
              <MoreVertical size={16} strokeWidth={1.7} />
            </button>

            {menuOpen && createPortal(
              <div 
                className="action-dropdown" 
                style={{ top: dropdownPos.top, right: dropdownPos.right }}
                onClick={(e) => e.stopPropagation()}
              >
                <button onClick={() => { setOpenMenuId(null); openEdit(category); }}>
                  <Pencil size={14} /> Edit
                </button>
                <button onClick={() => { setOpenMenuId(null); toggleStatus(category); }}>
                  {isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                  {isActive ? "Hide" : "Show"}
                </button>
                <button onClick={() => { setOpenMenuId(null); duplicateCategory(category); }}>
                  <Copy size={14} /> Duplicate
                </button>
                <button className="danger-text" onClick={() => { setOpenMenuId(null); setDeleteTarget(category); }}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>,
              document.body
            )}
          </div>

          <button 
            className="action-btn"
            onClick={() => expandCard(category.id)}
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="category-expanded-details">
          <div className="detail-grid">
            <div><span>Icon:</span> <strong>{category.icon}</strong></div>
            <div><span>Status:</span> <strong>{isActive ? "Live" : "Hidden"}</strong></div>
            <div><span>Sort Order:</span> <strong>{category.sortOrder || index + 1}</strong></div>
            <div><span>Created:</span> <strong>{category.createdAt?.toDate ? category.createdAt.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "Just now"}</strong></div>
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
  const [toast, setToast] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [saveState, setSaveState] = useState("idle");
  const [lastSynced, setLastSynced] = useState("Just now");
  const [openMenuId, setOpenMenuId] = useState(null);
  
  // Icon dropdown accordion state
  const [iconDropdownOpen, setIconDropdownOpen] = useState(false);

  // Real data only: initialized as an empty array
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

  const showToast = (message, type = 'success') => { 
    setToast({ message, type }); 
    setTimeout(() => { 
      setToast(null); 
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
    <>
      <style>{`
        .help-page{
            max-width:1450px;
            margin:auto;
            padding:40px;
            min-height:100vh;
            background: radial-gradient(circle at top right, rgba(196,149,106,.08), transparent 32%), radial-gradient(circle at bottom left, rgba(44,34,30,.05), transparent 35%), #F8F6F2;
            font-family: inherit;
        }
        .toast{
            position:fixed; top:24px; right:24px; z-index:999999;
            display:flex; align-items:center; gap:12px; padding:16px 18px;
            border-radius:18px; background:rgba(36,28,24,.96); color:white;
            font-size:14px; font-weight:600; backdrop-filter:blur(16px);
            box-shadow:0 18px 40px rgba(0,0,0,.18); animation:toastIn .28s ease;
        }
        .toast-dot{ width:8px; height:8px; border-radius:999px; background:#C4956A; }
        @keyframes toastIn{
            from{ opacity:0; transform:translateY(-10px) scale(.98); }
            to{ opacity:1; transform:translateY(0) scale(1); }
        }
        .modal-overlay{
            position:fixed; inset:0; background:rgba(18,14,12,.45);
            backdrop-filter:blur(8px); display:flex; align-items:center;
            justify-content:center; z-index:999999; animation:fadeIn .22s ease;
        }
        .modal-card{
            width:min(420px,92vw); background:white; border-radius:28px;
            padding:28px; border:1px solid #EEE6DD; box-shadow:0 24px 64px rgba(0,0,0,.16);
            animation:modalIn .24s ease;
        }
        .modal-icon{
            width:52px; height:52px; border-radius:16px; background:#FAF3F2;
            border:1px solid #F1D8D5; display:flex; align-items:center;
            justify-content:center; color:#A15B55; margin-bottom:18px;
        }
        .modal-card h3{ margin:0 0 10px; font-size:22px; color:#221A16; }
        .modal-card p{ margin:0; color:#6E5E53; line-height:1.7; font-size:14px; }
        .modal-actions{ display:flex; justify-content:flex-end; gap:12px; margin-top:26px; }
        .danger-btn{
            background:#241C18; color:white; border:none; border-radius:16px;
            padding:13px 18px; font-weight:700; cursor:pointer; transition:.25s;
        }
        .danger-btn:hover{ transform:translateY(-1px); box-shadow:0 12px 24px rgba(36,28,24,.18); }
        @keyframes fadeIn{ from{opacity:0} to{opacity:1} }
        @keyframes modalIn{ from{ opacity:0; transform:translateY(8px) scale(.98); } to{ opacity:1; transform:translateY(0) scale(1); } }

        .help-header{
            display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:40px;
        }
        .help-header h2{ margin:0; font-size:34px; font-weight:800; letter-spacing:-1px; color:#221A16; }
        .help-header p{ margin-top:10px; color:#8C7C72; font-size:15px; line-height:1.7; }
        .sync-info{ font-size:13px; color:#9B8C82; font-weight:500; }

        .help-stats{
            display:grid; grid-template-columns:repeat(4,1fr); gap:20px; margin-bottom:34px;
        }
        @media(max-width: 900px){ .help-stats{ grid-template-columns:repeat(2,1fr); } }
        .stat-card{
            background:rgba(255,255,255,.82); backdrop-filter:blur(18px);
            border:1px solid rgba(255,255,255,.75); border-radius:24px; padding:24px;
            transition:.3s; box-shadow:0 8px 28px rgba(30,22,18,.05);
            min-height:120px; display:flex; flex-direction:column; justify-content:center;
        }
        .stat-card:hover{ transform:translateY(-4px); box-shadow:0 18px 40px rgba(30,22,18,.08); }
        .stat-card span{ display:block; font-size:13px; font-weight:600; color:#8B7C72; margin-bottom:8px; }
        .stat-card h2{ margin:0; font-size:34px; color:#241C18; font-weight:800; letter-spacing:-1px; }

        .dashboard-grid{ display:block; }

        .help-card{
            background:rgba(255,255,255,.82); backdrop-filter:blur(18px);
            border-radius:24px; padding:28px; margin-bottom:36px;
            border:1px solid rgba(255,255,255,.8); box-shadow: 0 12px 40px rgba(30,22,18,.05);
        }

        .help-form{ display:flex; flex-direction:column; gap:24px; }
        .help-form input, .help-form textarea{
            width:100%; background:white; border:1px solid #ECE6DE;
            border-radius:18px; padding:16px 18px; font-size:15px; transition:.25s; outline:none;
        }
        .help-form input:focus, .help-form textarea:focus{
            border-color:#C4956A; box-shadow: 0 0 0 4px rgba(196,149,106,.12);
        }
        .form-subtitle{ margin-top:6px; margin-bottom:24px; font-size:14px; color:#8C7C72; line-height:1.6; }

        /* Icon Picker Dropdown Accordion */
        .icon-dropdown-container{ position:relative; }
        .icon-dropdown-toggle{
            width:100%; background:white; border:1px solid #ECE6DE; border-radius:18px;
            padding:14px 18px; display:flex; align-items:center; justify-content:space-between;
            cursor:pointer; transition:.25s; font-size:15px; color:#221A16; font-weight:600;
        }
        .icon-dropdown-toggle:hover{ border-color:#C4956A; }
        .icon-dropdown-menu{
            position:absolute; top:calc(100% + 8px); left:0; right:0; background:white;
            border:1px solid #ECE6DE; border-radius:18px; box-shadow:0 18px 40px rgba(0,0,0,.1);
            padding:16px; z-index:50;
        }
        .icon-picker{ 
            display:grid; 
            grid-template-columns:repeat(auto-fill,minmax(90px,1fr)); 
            gap:12px; 
            max-height:220px; 
            overflow-y:auto; 
            padding-right:4px; 
        }
        .icon-option{
            background:white; border:1px solid #ECE6DE; border-radius:14px;
            padding:12px; cursor:pointer; transition:.28s; display:flex;
            flex-direction:column; align-items:center; gap:8px; color:#6E5E53;
        }
        .icon-option:hover{ transform:translateY(-3px); border-color:#C4956A; box-shadow:0 12px 24px rgba(0,0,0,.05); }
        .icon-option.active{ background:#241C18; color:white; border-color:#241C18; box-shadow:0 18px 40px rgba(36,28,24,.18); }
        .icon-option span{ font-size:12px; font-weight:600; }

        .field-counter{ margin-top:8px; font-size:12px; color:#9B8C82; text-align:right; }
        .unsaved-banner{
            margin-bottom:20px; padding:14px 18px; background:#FFF9F1;
            border:1px solid #F2DEC1; border-radius:16px; color:#9A6A2C; font-size:14px; font-weight:600;
        }
        .warning-text{ color:#C25E38; font-size:13px; margin-top:6px; font-weight:600; }

        .search-input{
            width:100%; padding:16px 20px; border-radius:18px; border:1px solid #E8DED2;
            background:white; font-size:15px; margin-bottom:20px; transition:.25s;
        }
        .search-input:focus{ outline:none; border-color:#C4956A; box-shadow:0 0 0 4px rgba(196,149,106,.12); }

        .filter-row{ display:flex; gap:12px; margin-bottom:24px; }
        .filter-btn, .filter-active{
            padding:11px 20px; border-radius:999px; font-size:14px; font-weight:600; cursor:pointer; transition:.25s;
        }
        .filter-btn{ background:white; border:1px solid #E7DED5; color:#6E5E53; }
        .filter-btn:hover{ border-color:#C4956A; }
        .filter-active{ background:#241C18; color:white; border:1px solid #241C18; box-shadow:0 10px 24px rgba(36,28,24,.18); }

        .primary-btn{
            background:#241C18; color:white; border:none; border-radius:16px;
            padding:15px 26px; font-weight:700; cursor:pointer; transition:.3s; display:flex; align-items:center; gap:8px; justify-content:center;
        }
        .primary-btn:hover{ transform:translateY(-2px); background:#17120F; box-shadow: 0 12px 24px rgba(0,0,0,.15); }
        .secondary-btn{
            background:white; border:1px solid #E7DED5; border-radius:16px;
            padding:14px 22px; font-weight:600; cursor:pointer; transition:.25s;
        }
        .secondary-btn:hover{ border-color:#C4956A; background:#FAF8F5; }

        .section-header{ 
            display:flex; justify-content:space-between; align-items:flex-end; 
            margin-bottom:24px; padding-bottom:18px; border-bottom:1px solid #EEE6DD; 
        }
        .section-header h3{ margin:0; font-size:24px; font-weight:700; color:#221A16; }
        .section-header p{ margin-top:8px; color:#8C7C72; font-size:14px; }
        .section-count{ background:#F5EFE8; padding:10px 16px; border-radius:999px; font-weight:600; font-size:13px; color:#6E5E53; }

        /* Category Item Card */
        .category-grid{ display:flex; flex-direction:column; gap:22px; overflow:visible; }
        .category-item{
            background:rgba(255,255,255,.92); backdrop-filter:blur(14px);
            border-radius:22px; border:1px solid rgba(255,255,255,.8);
            padding:18px 22px; transition: transform .25s, box-shadow .25s, border-color .25s;
            position:relative; overflow:visible; z-index:1;
        }
        .category-item:hover{
            transform: translateY(-4px) scale(1.005);
            border-color:#D3B08B; box-shadow: 0 18px 38px rgba(0,0,0,.06);
            z-index:20;
        }
        .category-main-row{ display:flex; justify-content:space-between; align-items:center; }
        .category-left{ 
            display:grid; 
            grid-template-columns:28px 56px 1fr; 
            align-items:center; 
            gap:18px; 
        }
        .drag-handle{ cursor:grab; color:#B5A89E; padding:4px; display:flex; align-items:center; justify-content:center; }
        .drag-handle:active{ cursor:grabbing; }

        .icon-box{
            width:48px; height:48px; border-radius:16px;
            background: linear-gradient(180deg, #FBF9F6, #F2ECE5);
            border:1px solid #ECE3DA; display:flex; justify-content:center; align-items:center; flex-shrink:0;
        }
        .category-title{ font-size:17px; font-weight:700; color:#221A16; margin-bottom:4px; display:flex; align-items:center; gap:10px; }
        .category-desc{ color:#8A7A70; font-size:14px; line-height:1.6; }
        .recent-badge{ font-size:11px; background:#F2E8DC; color:#8C6A48; padding:2px 8px; border-radius:99px; font-weight:600; }

        .category-right-actions{ display:flex; align-items:center; gap:12px; }
        .status-badge{ padding:6px 12px; border-radius:999px; font-size:12px; font-weight:700; }
        .status-active{ background:#F4F7F5; color:#4F6B5B; border:1px solid #DCE8E0; }
        .status-disabled{ background:#FAF7F5; color:#8B7C72; border:1px solid #ECE4DD; }

        .action-btn{
            width:38px; height:38px; border-radius:12px; background:#FAF8F5;
            border:1px solid #EEE6DD; cursor:pointer; transition:.25s;
            display:flex; align-items:center; justify-content:center; color:#554840;
        }
        .action-btn:hover{ background:#241C18; color:white; border-color:#241C18; }

        /* Dropdown Actions - FIXED PORTAL STYLING */
        .dropdown-container{ position:relative; }
        .action-dropdown{
            position:fixed; z-index:999999; min-width:180px; 
            background:white; border-radius:16px; box-shadow:0 18px 45px rgba(0,0,0,.15); 
            border:1px solid #ECE3DA; padding:8px;
        }
        .action-dropdown button{
            width:100%; text-align:left; background:none; border:none; padding:10px 12px;
            font-size:13px; font-weight:600; color:#443830; border-radius:10px; cursor:pointer;
            display:flex; align-items:center; gap:8px;
        }
        .action-dropdown button:hover{ background:#F8F5F0; }
        .action-dropdown button.danger-text{ color:#A15B55; }
        .action-dropdown button.danger-text:hover{ background:#FAF3F2; }

        .category-expanded-details{
            margin-top:16px; padding-top:16px; border-top:1px solid #F0EAE2;
        }
        .detail-grid{ display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:12px; font-size:13px; color:#7E6E63; }

        /* Customer Preview Lighter Version */
        .customer-preview-box{
            background:#FAF8F5; color:#221A16; border-radius:24px; padding:20px; border:1px solid #E8DED2; box-shadow:0 10px 30px rgba(0,0,0,.04);
            max-height:430px; overflow-y:auto;
        }
        .customer-preview-header{ font-size:12px; text-transform:uppercase; letter-spacing:1px; color:#8C7C72; margin-bottom:16px; font-weight:700; }
        .real-preview-card{
            background:white; border:1px solid #EAE2D8;
            border-radius:18px; padding:16px; display:flex; gap:16px; align-items:flex-start; margin-bottom:12px;
            box-shadow:0 4px 14px rgba(0,0,0,.02);
        }
        .real-preview-card h5{ margin:0 0 6px; font-size:15px; font-weight:600; color:#221A16; }
        .real-preview-card p{ margin:0; font-size:13px; color:#7A6A60; line-height:1.6; }

        /* Skeleton */
        .skeleton-loader{ display:flex; flex-direction:column; gap:16px; }
        .skeleton-item{
            height:80px; background:linear-gradient(90deg, #F0EAE2 25%, #E4DDD5 50%, #F0EAE2 75%);
            background-size:200% 100%; animation:shimmer 1.5s infinite; border-radius:22px;
        }
        @keyframes shimmer{ 0%{background-position:200% 0} 100%{background-position:-200% 0} }

        /* Recent Activity section - scrollable list with empty state */
        .activity-list{ display:flex; flex-direction:column; gap:8px; max-height:220px; overflow-y:auto; padding-right:4px; }
        .activity-item{ display:flex; justify-content:space-between; font-size:13px; padding:10px 0; border-bottom:1px solid #F4EFEA; }
        .activity-item:last-child{ border-bottom:none; }
        .activity-text{ color:#554840; font-weight:500; }
        .activity-time{ color:#A19288; font-size:12px; }
        .activity-empty{ text-align:center; padding:24px 0; color:#9B8C82; font-size:14px; }

        .empty-search{ text-align:center; padding:40px; background:white; border-radius:22px; border:1px solid #ECE3DA; }
        .empty-search h4{ margin:0 0 6px; color:#221A16; font-size:16px; }
        .empty-search p{ margin:0 0 16px; color:#8A7A70; font-size:14px; }
      `}</style>

      {toast && (
        <div className={`toast ${toast.type}`}>
          <div className="toast-dot" />
          {toast.message}
        </div>
      )}

      {deleteTarget && createPortal(
        <div className="modal-overlay" style={{ position: "fixed" }}>
          <div className="modal-card">
            <div className="modal-icon">
              <Trash2 size={22} strokeWidth={1.8} />
            </div>
            <h3>Delete category</h3>
            <p>
              <strong>{deleteTarget.title}</strong> will be permanently removed from the Help Centre.
            </p>
            <div className="modal-actions">
              <button className="secondary-btn" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="danger-btn" onClick={confirmDelete}>Delete Category</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="help-page">
        <div className="help-header">
          <div>
            <h2>Support Help Categories</h2>
            <p>Manage help topics and customer support routing.</p>
          </div>
          <div className="sync-info">
            Last synced {lastSynced}
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="help-stats">
          <div className="stat-card">
            <span>Total Categories</span>
            <h2>{categories.length}</h2>
          </div>
          <div className="stat-card">
            <span>Active</span>
            <h2>{categories.filter(c => c.active !== false).length}</h2>
          </div>
          <div className="stat-card">
            <span>Hidden</span>
            <h2>{categories.filter(c => c.active === false).length}</h2>
          </div>
          <div className="stat-card">
            <span>Icons Used</span>
            <h2>{new Set(categories.map(c => c.icon)).size}</h2>
          </div>
        </div>

        <div className="dashboard-grid">
          {/* Recent Activity Section */}
          <div className="help-card">
            <div className="section-header" style={{ marginBottom: "16px" }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "20px" }}>
                <Activity size={18} color="#C4956A" /> Recent Activity
              </h3>
            </div>
            <div className="activity-list">
              {recentActivities.length === 0 ? (
                <div className="activity-empty">No recent activity yet. Actions will appear here as you manage categories.</div>
              ) : (
                recentActivities.map(act => (
                  <div key={act.id} className="activity-item">
                    <span className="activity-text">{act.text}</span>
                    <span className="activity-time">{act.time}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Add / Edit Form (Full Width) */}
          <div className="help-card" ref={formRef}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "22px" }}>{editingId ? "Edit Category" : "New Category"}</h3>
                <p className="form-subtitle">Configure navigation routing for customers.</p>
              </div>
            </div>

            {dirty && (
              <div className="unsaved-banner">
                You have unsaved changes. (Ctrl + S)
              </div>
            )}

            <div className="help-form">
              <div>
                <input
                  ref={titleInputRef}
                  value={title}
                  maxLength={40}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setDirty(true);
                  }}
                  placeholder="Category title"
                />
                <div className="field-counter">{title.length}/40</div>
                {isDuplicateTitle && (
                  <div className="warning-text">Category already exists.</div>
                )}
              </div>

              {/* Icon Picker Accordion Dropdown */}
              <div className="icon-dropdown-container" ref={iconDropdownRef}>
                <div 
                  className="icon-dropdown-toggle"
                  onClick={() => setIconDropdownOpen(!iconDropdownOpen)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <SelectedIconComponent size={20} color="#C4956A" />
                    <span>{icon}</span>
                  </div>
                  <ChevronDown size={16} color="#8C7C72" />
                </div>

                {iconDropdownOpen && (
                  <div className="icon-dropdown-menu">
                    <div className="icon-picker">
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
                            className={icon === name ? "icon-option active" : "icon-option"}
                          >
                            <Icon size={20} strokeWidth={1.8} />
                            <span>{name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <textarea
                  value={description}
                  maxLength={120}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setDirty(true);
                  }}
                  placeholder="Description"
                  rows="3"
                />
                <div className="field-counter">{description.length}/120</div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                <button 
                  className="primary-btn"
                  onClick={saveCategory}
                >
                  {saveState === "saving" ? "Saving..." : saveState === "saved" ? <><Check size={16} /> Saved</> : editingId ? "Update Category" : "Create Category"}
                </button>
                <button 
                  className="secondary-btn"
                  onClick={() => {
                    setTitle("");
                    setDescription("");
                    setIcon("Truck");
                    setEditingId(null);
                    setDirty(false);
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Category List with Drag & Drop */}
          <div className="help-card">
            <div className="section-header">
              <div>
                <h3>Manage Categories</h3>
                <p>Organise how support topics appear. Drag items to reorder.</p>
              </div>
              <div className="section-count">
                {categories.length} Categories
              </div>
            </div>

            <input 
              className="search-input" 
              placeholder="Search categories..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />

            <div className="filter-row">
              <button className={filter === "All" ? "filter-active" : "filter-btn"} onClick={() => setFilter("All")}>All</button>
              <button className={filter === "Active" ? "filter-active" : "filter-btn"} onClick={() => setFilter("Active")}>Active</button>
              <button className={filter === "Hidden" ? "filter-active" : "filter-btn"} onClick={() => setFilter("Hidden")}>Hidden</button>
            </div>

            {loading ? (
              <div className="skeleton-loader">
                <div className="skeleton-item" />
                <div className="skeleton-item" />
                <div className="skeleton-item" />
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="empty-search">
                <h4>No matching categories</h4>
                <p>Try another keyword or search query.</p>
                <button className="secondary-btn" onClick={() => setSearch("")}>Clear Search</button>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={filteredCategories.map(c => c.id)} strategy={verticalListSortingStrategy}>
                  <div className="category-grid">
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

          {/* Customer Preview Lighter Version */}
          <div className="help-card" style={{ marginBottom: 0 }}>
            <h3 style={{ margin: "0 0 6px", color: "#221A16", fontSize: "20px", fontWeight: "700" }}>Customer Preview</h3>
            <p style={{ color: "#8C7C72", marginBottom: "20px", fontSize: "14px" }}>
              Live rendering inside the consumer Help Centre.
            </p>

            <div className="customer-preview-box">
              <div className="customer-preview-header">Support Centre</div>
              {categories.filter(c => c.active !== false).map(category => {
                const Icon = iconMap[category.icon] || HelpCircle;
                return (
                  <div key={category.id} className="real-preview-card">
                    <div className="icon-box" style={{ background: "#FAF3EE", border: "1px solid #F1E5DB" }}>
                      <Icon size={20} strokeWidth={1.7} color="#C4956A" />
                    </div>
                    <div>
                      <h5>{category.title}</h5>
                      <p>{category.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
