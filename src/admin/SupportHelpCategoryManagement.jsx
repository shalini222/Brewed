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
            max-width:1280px;
            margin:auto;
            padding:40px;
            min-height:100vh;
            background: radial-gradient(circle at top right, rgba(196,149,106,.08), transparent 32%), radial-gradient(circle at bottom left, rgba(44,34,30,.05), transparent 35%), #F8F6F2;
        }

        /* Header */

        .help-header{
            display:flex;
            justify-content:space-between;
            align-items:flex-end;
            margin-bottom:40px;
        }

        .help-header h2{
            margin:0;
            font-size:34px;
            font-weight:800;
            letter-spacing:-1px;
            color:#221A16;
        }

        .help-header p{
            margin-top:10px;
            color:#8C7C72;
            font-size:15px;
            line-height:1.7;
        }

        /* Cards */

        .help-card{
            background:rgba(255,255,255,.82);
            backdrop-filter:blur(18px);
            border-radius:28px;
            padding:34px;
            margin-bottom:32px;
            border:1px solid rgba(255,255,255,.8);
            box-shadow: 
                0 12px 40px rgba(30,22,18,.05), 
                inset 0 1px rgba(255,255,255,.9);
            transition:.35s;
        }

        .help-card:hover{
            transform:translateY(-4px);
            box-shadow: 0 20px 60px rgba(30,22,18,.08);
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
            background:white;
            border:1px solid #ECE6DE;
            border-radius:18px;
            padding:16px 18px;
            font-size:15px;
            transition:.25s;
            outline:none;
        }

        .help-form input:hover,
        .help-form textarea:hover,
        .help-form select:hover{
            border-color:#D3B08B;
        }

        .help-form input:focus,
        .help-form textarea:focus,
        .help-form select:focus{
            border-color:#C4956A;
            box-shadow: 0 0 0 4px rgba(196,149,106,.12);
        }

        /* Buttons */

        .primary-btn{
            background:#241C18;
            color:white;
            border:none;
            border-radius:16px;
            padding:15px 26px;
            font-weight:700;
            cursor:pointer;
            transition:.3s;
        }

        .primary-btn:hover{
            transform:translateY(-2px);
            background:#17120F;
            box-shadow: 0 12px 24px rgba(0,0,0,.15);
        }

        .secondary-btn{
            background:white;
            border:1px solid #E7DED5;
            border-radius:16px;
            padding:14px 22px;
            font-weight:600;
            cursor:pointer;
            transition:.25s;
        }

        .secondary-btn:hover{
            border-color:#C4956A;
            background:#FAF8F5;
        }

        /* Category List */

        .category-grid{
            display:grid;
            grid-template-columns:repeat(auto-fit,minmax(350px,1fr));
            gap:28px;
        }

        .category-item{
            display:flex;
            justify-content:space-between;
            align-items:center;
            background:rgba(255,255,255,.88);
            backdrop-filter:blur(14px);
            border-radius:22px;
            border:1px solid rgba(255,255,255,.8);
            padding:24px;
            transition:.3s;
        }

        .category-item:hover{
            transform:translateY(-5px);
            border-color:#D3B08B;
            box-shadow: 0 18px 38px rgba(0,0,0,.06);
        }

        .category-left{
            display:flex;
            align-items:center;
            gap:18px;
        }

        .icon-box{
            width:62px;
            height:62px;
            border-radius:18px;
            background: linear-gradient(180deg, #FBF9F6, #F2ECE5);
            border:1px solid #ECE3DA;
            display:flex;
            justify-content:center;
            align-items:center;
            flex-shrink:0;
        }

        .category-title{
            font-size:18px;
            font-weight:700;
            letter-spacing:-.3px;
            color:#221A16;
            margin-bottom:6px;
        }

        .category-desc{
            color:#8A7A70;
            font-size:14px;
            line-height:1.7;
        }

        /* Badge */

        .status-badge{
            padding:6px 12px;
            border-radius:999px;
            font-size:12px;
            font-weight:700;
        }

        .status-active{
            background:#F3F7F4;
            color:#50755E;
        }

        .status-disabled{
            background:#FAF4F3;
            color:#A56D6D;
        }

        /* Action Buttons */

        .category-actions{
            display:flex;
            flex-wrap:wrap;
            gap:8px;
            justify-content:flex-end;
        }

        .action-btn{
            width:42px;
            height:42px;
            border-radius:14px;
            background:#FAF8F5;
            border:1px solid #EEE6DD;
            cursor:pointer;
            transition:.25s;
            display:flex;
            align-items:center;
            justify-content:center;
            color:#554840;
        }

        .action-btn:hover{
            background:#241C18;
            color:white;
            border-color:#241C18;
        }

        /* Live Preview */

        .preview-grid{
            display:grid;
            grid-template-columns:repeat(auto-fit,minmax(230px,1fr));
            gap:28px;
        }

        .preview-card{
            background:white;
            border-radius:22px;
            border:1px solid #EEE6DD;
            padding:26px;
            transition:.3s;
        }

        .preview-card:hover{
            transform:translateY(-5px);
            border-color:#C4956A;
            box-shadow: 0 18px 38px rgba(0,0,0,.06);
        }

        .preview-card h4{
            margin:16px 0 8px;
            color:#221A16;
            font-size:16px;
            font-weight:700;
        }

        .preview-card p{
            color:#8A7A70;
            line-height:1.7;
            font-size:14px;
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
            <h2>Support Help Categories</h2>
            <p>Manage help topics and customer support routing.</p>
          </div>
        </div>

        {/* Add / Edit Form */}
        <div className="help-card">
          <h3 style={{ margin: "0 0 18px", color: "#221A16", fontSize: "20px", fontWeight: "700" }}>
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
          <h3 style={{ margin: "0 0 6px", color: "#221A16", fontSize: "20px", fontWeight: "700" }}>Customer Preview</h3>
          <p style={{ color: "#8C7C72", marginBottom: "18px", fontSize: "14px" }}>
            This is how categories will appear in the Help Centre.
          </p>

          <div
            style={{
              marginBottom: "18px",
              fontWeight: 600,
              color: "#6E5E53",
              fontSize: "14px"
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
                    <div className="icon-box">
                      <Icon
                        size={24}
                        strokeWidth={1.7}
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
                color: "#8A7A70",
                fontSize: "14px"
              }}
            >
              No active help categories.
            </div>
          )}
        </div>

        {/* Category List */}
        <div>
          <h3 style={{ margin: "0 0 18px", color: "#221A16", fontSize: "20px", fontWeight: "700" }}>Manage Categories</h3>
          
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
                      <Icon size={24} strokeWidth={1.7} color="#C4956A" />
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
                        <span style={{ fontSize: "13px", color: "#8A7A70" }}>
                          {category.icon}
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
                      <ArrowUp size={16} strokeWidth={1.7} />
                    </button>

                    {/* Move Down Button */}
                    <button
                      disabled={index === categories.length - 1}
                      onClick={() => moveCategory(index, 1)}
                      className="action-btn"
                      style={{ opacity: index === categories.length - 1 ? 0.4 : 1, cursor: index === categories.length - 1 ? "not-allowed" : "pointer" }}
                      title="Move Down"
                    >
                      <ArrowDown size={16} strokeWidth={1.7} />
                    </button>

                    {/* Enable/Disable Toggle */}
                    <button
                      onClick={() => toggleStatus(category)}
                      className="action-btn"
                      title={isActive ? "Disable" : "Enable"}
                    >
                      {isActive ? <Eye size={16} strokeWidth={1.7} /> : <EyeOff size={16} strokeWidth={1.7} />}
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
                      <Pencil size={16} strokeWidth={1.7} />
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
                      <Trash2 size={16} strokeWidth={1.7} />
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
