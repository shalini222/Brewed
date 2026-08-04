import { useEffect, useState } from "react";
import { db } from "../firebase";
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy 
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
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff
} from "lucide-react";

export default function SupportHelpCategoryManagement() {
  const [categories, setCategories] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("Truck");
  const [editingId, setEditingId] = useState(null);

  const icons = [
    "Truck",
    "CreditCard",
    "Gift",
    "ShieldCheck",
    "HelpCircle",
    "Coffee",
    "CircleDollarSign",
    "User",
    "ShoppingBag",
    "Clock",
    "MessageCircle",
    "Phone",
    "Mail"
  ];

  const iconMap = {
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
    Mail
  };

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
    });
    return unsubscribe;
  }, []);

  const saveCategory = async () => {
    if (!title.trim()) return;
    
    const data = {
      title,
      description,
      icon,
      active: true,
      sortOrder: editingId 
        ? categories.find(c => c.id === editingId)?.sortOrder || categories.length + 1 
        : categories.length + 1
    };

    if (editingId) {
      await updateDoc(doc(db, "supportHelpCategories", editingId), data);
    } else {
      await addDoc(collection(db, "supportHelpCategories"), data);
    }
    
    setEditingId(null);
    setTitle("");
    setDescription("");
    setIcon("Truck");
  };

  const toggleStatus = async (category) => {
    await updateDoc(
      doc(db, "supportHelpCategories", category.id),
      {
        active: !category.active
      }
    );
  };

  const moveCategory = async (index, direction) => {
    const swapIndex = index + direction;

    if (swapIndex < 0 || swapIndex >= categories.length) return;

    const current = categories[index];
    const target = categories[swapIndex];

    await updateDoc(
      doc(db, "supportHelpCategories", current.id),
      {
        sortOrder: target.sortOrder
      }
    );

    await updateDoc(
      doc(db, "supportHelpCategories", target.id),
      {
        sortOrder: current.sortOrder
      }
    );
  };

  return (
    <>
      <style>{`
        /* ===========================
           HELP CATEGORIES PAGE
        =========================== */

        .help-page{
            max-width:1200px;
            margin:auto;
            padding:28px;
            background:#FDFBF8;
        }

        /* Header */

        .help-header{
            display:flex;
            justify-content:space-between;
            align-items:center;
            margin-bottom:28px;
        }

        .help-header h2{
            margin:0;
            font-size:30px;
            color:#2C221E;
        }

        .help-header p{
            color:#8B7B70;
            margin-top:8px;
        }

        /* Cards */

        .help-card{
            background:#fff;
            border-radius:22px;
            padding:28px;
            margin-bottom:24px;
            border:1px solid #F1E8DE;
            box-shadow:
                0 8px 24px rgba(44,34,30,.04),
                0 18px 40px rgba(44,34,30,.04);
            transition:.25s;
        }

        .help-card:hover{
            transform:translateY(-3px);
            box-shadow:
                0 12px 32px rgba(44,34,30,.07),
                0 24px 50px rgba(44,34,30,.08);
        }

        /* Form */

        .help-form{
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:22px;
        }

        .help-form textarea{
            grid-column:1/-1;
        }

        .help-form input,
        .help-form textarea,
        .help-form select{

            width:100%;
            padding:15px 18px;
            border-radius:16px;
            border:2px solid transparent;
            background:#FAF6F0;
            font-size:15px;
            transition:.25s;
            outline:none;

        }

        .help-form input:hover,
        .help-form textarea:hover,
        .help-form select:hover{

            border-color:#E8DED2;
            background:white;

        }

        .help-form input:focus,
        .help-form textarea:focus,
        .help-form select:focus{

            background:white;
            border-color:#C4956A;
            box-shadow:0 0 0 5px rgba(196,149,106,.15);

        }

        /* Buttons */

        .primary-btn{

            background:#C4956A;
            color:white;
            border:none;
            border-radius:14px;
            padding:14px 22px;
            font-weight:700;
            cursor:pointer;
            transition:.25s;

        }

        .primary-btn:hover{

            background:#B7865E;
            transform:translateY(-2px);

        }

        .secondary-btn{

            background:white;
            border:2px solid #E8DED2;
            border-radius:12px;
            padding:12px 18px;
            cursor:pointer;
            transition:.25s;

        }

        .secondary-btn:hover{

            border-color:#C4956A;
            background:#FAF6F0;

        }

        /* Category List */

        .category-grid{

            display:grid;
            grid-template-columns:repeat(auto-fit,minmax(350px,1fr));
            gap:22px;

        }

        .category-item{

            display:flex;
            justify-content:space-between;
            align-items:center;
            padding:22px;
            border-radius:18px;
            border:1px solid #EEE3D7;
            background:white;
            transition:.25s;

        }

        .category-item:hover{

            transform:translateY(-3px);
            border-color:#C4956A;

        }

        .category-left{

            display:flex;
            align-items:center;
            gap:18px;

        }

        .icon-box{

            width:58px;
            height:58px;
            border-radius:18px;
            background:#FAF6F0;
            display:flex;
            justify-content:center;
            align-items:center;
            flex-shrink:0;

        }

        .category-title{

            font-size:18px;
            font-weight:700;
            color:#2C221E;
            margin-bottom:6px;

        }

        .category-desc{

            color:#8B7B70;
            line-height:1.5;
            font-size:14px;

        }

        /* Badge */

        .status-badge{

            padding:6px 12px;
            border-radius:999px;
            font-size:12px;
            font-weight:700;

        }

        .status-active{

            background:#E8F8EE;
            color:#2E7D32;

        }

        .status-disabled{

            background:#FFF1F1;
            color:#D32F2F;

        }

        /* Action Buttons */

        .category-actions{

            display:flex;
            flex-wrap:wrap;
            gap:8px;
            justify-content:flex-end;

        }

        .action-btn{

            width:38px;
            height:38px;
            border:none;
            border-radius:10px;
            background:#FAF6F0;
            cursor:pointer;
            transition:.2s;
            display: flex;
            align-items: center;
            justify-content: center;

        }

        .action-btn:hover{

            background:#C4956A;
            color:white;

        }

        /* Live Preview */

        .preview-grid{

            display:grid;
            grid-template-columns:repeat(auto-fit,minmax(230px,1fr));
            gap:20px;

        }

        .preview-card{

            background:white;
            border-radius:18px;
            padding:22px;
            border:1px solid #EEE3D7;
            transition:.25s;

        }

        .preview-card:hover{

            transform:translateY(-4px);
            border-color:#C4956A;
            box-shadow:0 12px 30px rgba(44,34,30,.08);

        }

        .preview-card h4{

            margin:16px 0 8px;
            color:#2C221E;

        }

        .preview-card p{

            color:#8B7B70;
            line-height:1.6;

        }

        /* Responsive */

        @media(max-width:768px){

          .help-form{
            grid-template-columns:1fr;
          }

          .category-item{
            flex-direction:column;
            align-items:flex-start;
            gap:20px;
          }

          .category-actions{
            width:100%;
            justify-content:flex-start;
          }

        }
      `}</style>

      <div className="help-page">
        <div className="help-header">
          <div>
            <h2>🗂 Support Help Categories</h2>
            <p>Manage help topics and customer support routing.</p>
          </div>
        </div>

        {/* Add / Edit Form */}
        <div className="help-card">
          <h3 style={{ margin: "0 0 18px", color: "#2C221E" }}>
            {editingId ? "Edit Category" : "New Category"}
          </h3>

          <div className="help-form">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Category title"
            />

            <select
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
            >
              {icons.map(i => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              rows="3"
            />

            <div style={{ display: "flex", gap: "10px", gridColumn: "1/-1" }}>
              <button 
                className="primary-btn"
                onClick={saveCategory}
              >
                {editingId ? "Update Category" : "Add Category"}
              </button>
              {editingId && (
                <button 
                  className="secondary-btn"
                  onClick={() => {
                    setEditingId(null);
                    setTitle("");
                    setDescription("");
                    setIcon("Truck");
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Customer Preview Section */}
        <div className="help-card">
          <h3 style={{ margin: "0 0 6px", color: "#2C221E" }}>👀 Customer Preview</h3>
          <p style={{ color: "#8B7B70", marginBottom: "18px" }}>
            This is how categories will appear in the Help Centre.
          </p>

          <div
            style={{
              marginBottom: "18px",
              fontWeight: 600,
              color: "#6E5E53"
            }}
          >
            Showing {categories.filter(c => c.active).length} categories
          </div>

          <div className="preview-grid">
            {categories
              .filter(category => category.active)
              .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
              .map(category => {
                const Icon = iconMap[category.icon] || HelpCircle;

                return (
                  <div
                    key={category.id}
                    className="preview-card"
                  >
                    <div
                      style={{
                        width: "52px",
                        height: "52px",
                        borderRadius: "14px",
                        background: "#FAF6F0",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center"
                      }}
                    >
                      <Icon
                        size={26}
                        color="#C4956A"
                      />
                    </div>

                    <h4>
                      {category.title}
                    </h4>

                    <p>
                      {category.description}
                    </p>
                  </div>
                );
              })}
          </div>

          {categories.filter(c => c.active).length === 0 && (
            <div
              style={{
                padding: "40px",
                textAlign: "center",
                color: "#999"
              }}
            >
              No active help categories.
            </div>
          )}
        </div>

        {/* Category List */}
        <div>
          <h3 style={{ margin: "0 0 18px", color: "#2C221E" }}>🛠 Manage Categories</h3>
          
          <div className="category-grid">
            {categories.map((category, index) => {
              const Icon = iconMap[category.icon] || HelpCircle;
              const isActive = category.active !== false;

              return (
                <div
                  key={category.id}
                  className="category-item"
                  style={{ opacity: isActive ? 1 : 0.6 }}
                >
                  <div className="category-left">
                    <div className="icon-box">
                      <Icon size={26} color="#C4956A" />
                    </div>

                    <div>
                      <div className="category-title">{category.title}</div>
                      <div className="category-desc">{category.description}</div>
                      
                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          marginTop: "10px",
                          alignItems: "center"
                        }}
                      >
                        <span style={{ fontSize: "13px", color: "#8B7B70" }}>
                          📦 {category.icon}
                        </span>

                        <span
                          className={`status-badge ${isActive ? 'status-active' : 'status-disabled'}`}
                        >
                          {isActive ? "Active" : "Disabled"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="category-actions">
                    {/* Move Up Button */}
                    <button
                      disabled={index === 0}
                      onClick={() => moveCategory(index, -1)}
                      className="action-btn"
                      style={{ opacity: index === 0 ? 0.4 : 1, cursor: index === 0 ? "not-allowed" : "pointer" }}
                      title="Move Up"
                    >
                      <ArrowUp size={16} />
                    </button>

                    {/* Move Down Button */}
                    <button
                      disabled={index === categories.length - 1}
                      onClick={() => moveCategory(index, 1)}
                      className="action-btn"
                      style={{ opacity: index === categories.length - 1 ? 0.4 : 1, cursor: index === categories.length - 1 ? "not-allowed" : "pointer" }}
                      title="Move Down"
                    >
                      <ArrowDown size={16} />
                    </button>

                    {/* Enable/Disable Toggle */}
                    <button
                      onClick={() => toggleStatus(category)}
                      className="action-btn"
                      title={isActive ? "Disable" : "Enable"}
                    >
                      {isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>

                    {/* Edit Button */}
                    <button
                      onClick={() => {
                        setEditingId(category.id);
                        setTitle(category.title);
                        setDescription(category.description);
                        setIcon(category.icon);
                      }}
                      className="action-btn"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={async () => {
                        if (window.confirm("Delete this category?")) {
                          await deleteDoc(
                            doc(
                              db,
                              "supportHelpCategories",
                              category.id
                            )
                          );
                        }
                      }}
                      className="action-btn"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
