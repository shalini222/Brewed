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
  ArrowDown
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
    <div style={{ padding: "24px", maxWidth: "900px", margin: "0 auto" }}>
      <h2>🗂 Support Help Categories</h2>

      {/* Add / Edit Form */}
      <div className="support-card" style={{ background: "#fff", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", marginTop: "16px" }}>
        <h3>
          {editingId ? "Edit Category" : "New Category"}
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Category title"
            style={{ padding: "8px 12px", borderRadius: "4px", border: "1px solid #ccc" }}
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            rows="3"
            style={{ padding: "8px 12px", borderRadius: "4px", border: "1px solid #ccc" }}
          />

          <select
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: "4px", border: "1px solid #ccc", background: "#fff" }}
          >
            {icons.map(i => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>

          <div style={{ display: "flex", gap: "10px" }}>
            <button 
              onClick={saveCategory}
              style={{ padding: "10px 16px", background: "#007bff", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
            >
              {editingId ? "Update Category" : "Add Category"}
            </button>
            {editingId && (
              <button 
                onClick={() => {
                  setEditingId(null);
                  setTitle("");
                  setDescription("");
                  setIcon("Truck");
                }}
                style={{ padding: "10px 16px", background: "#6c757d", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Customer Preview Section */}
      <div className="settings-card" style={{ background: "#fff", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", marginTop: "25px" }}>
        <h3>👀 Customer Preview</h3>
        <p style={{ color: "#666", marginBottom: "15px" }}>
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: "18px"
          }}
        >
          {categories
            .filter(category => category.active)
            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
            .map(category => {
              const Icon = iconMap[category.icon] || HelpCircle;

              return (
                <div
                  key={category.id}
                  style={{
                    background: "white",
                    border: "1px solid #E8DED2",
                    borderRadius: "18px",
                    padding: "22px",
                    transition: ".2s",
                    cursor: "default"
                  }}
                >
                  <div
                    style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "14px",
                      background: "#FAF6F0",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      marginBottom: "14px"
                    }}
                  >
                    <Icon
                      size={26}
                      color="#C4956A"
                    />
                  </div>

                  <h4
                    style={{
                      margin: "0 0 8px",
                      color: "#2C221E"
                    }}
                  >
                    {category.title}
                  </h4>

                  <p
                    style={{
                      margin: 0,
                      color: "#8B7B70",
                      lineHeight: 1.5
                    }}
                  >
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
      <div
        style={{
          display: "grid",
          gap: "18px",
          marginTop: "25px"
        }}
      >
        <h3>🛠 Manage Categories</h3>
        {categories.map((category, index) => {
          const Icon = iconMap[category.icon] || HelpCircle;
          const isActive = category.active !== false;

          return (
            <div
              key={category.id}
              className="support-card"
              style={{
                background: "#fff",
                padding: "16px 20px",
                borderRadius: "8px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                opacity: isActive ? 1 : 0.6,
                borderLeft: isActive ? "4px solid #28a745" : "4px solid #6c757d"
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: "18px",
                    alignItems: "center"
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 16,
                      background: "#FAF6F0",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center"
                    }}
                  >
                    <Icon size={26} color="#C4956A" />
                  </div>

                  <div>
                    <h3 style={{ margin: 0 }}>{category.title}</h3>
                    <p style={{ margin: "4px 0", color: "#666" }}>{category.description}</p>

                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        marginTop: "10px",
                        alignItems: "center"
                      }}
                    >
                      <span>
                        📦 {category.icon}
                      </span>

                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: "999px",
                          background: category.active ? "#E8F8EE" : "#FFF2F2",
                          color: category.active ? "#2E7D32" : "#C62828",
                          fontWeight: 600,
                          fontSize: "12px"
                        }}
                      >
                        {category.active ? "Active" : "Disabled"}
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    alignItems: "center"
                  }}
                >
                  {/* Move Up Button */}
                  <button
                    disabled={index === 0}
                    onClick={() => moveCategory(index, -1)}
                    style={{ padding: "6px 10px", background: "#f8f9fa", border: "1px solid #ccc", borderRadius: "4px", cursor: index === 0 ? "not-allowed" : "pointer", opacity: index === 0 ? 0.4 : 1 }}
                    title="Move Up"
                  >
                    <ArrowUp size={14} />
                  </button>

                  {/* Move Down Button */}
                  <button
                    disabled={index === categories.length - 1}
                    onClick={() => moveCategory(index, 1)}
                    style={{ padding: "6px 10px", background: "#f8f9fa", border: "1px solid #ccc", borderRadius: "4px", cursor: index === categories.length - 1 ? "not-allowed" : "pointer", opacity: index === categories.length - 1 ? 0.4 : 1 }}
                    title="Move Down"
                  >
                    <ArrowDown size={14} />
                  </button>

                  {/* Enable/Disable Toggle */}
                  <button
                    onClick={() => toggleStatus(category)}
                    style={{ padding: "6px 10px", background: "#f8f9fa", border: "1px solid #ccc", borderRadius: "4px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    {category.active ? "👁 Disable" : "👁‍🗨 Enable"}
                  </button>

                  {/* Edit Button */}
                  <button
                    onClick={() => {
                      setEditingId(category.id);
                      setTitle(category.title);
                      setDescription(category.description);
                      setIcon(category.icon);
                    }}
                    style={{ padding: "6px 10px", background: "#ffc107", border: "none", borderRadius: "4px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    <Pencil size={14} /> Edit
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
                    style={{ padding: "6px 10px", background: "#dc3545", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
