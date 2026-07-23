import { useEffect, useState, useRef } from "react";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";

export default function AdminPage({ setPage, setActivePage }) {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortBy, setSortBy] = useState("featured");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const sortDropdownRef = useRef(null);

  // Bulk action states
  const [selectedItems, setSelectedItems] = useState([]);
  const [bulkAction, setBulkAction] = useState("");
  const [showBulkDropdown, setShowBulkDropdown] = useState(false);
  const bulkDropdownRef = useRef(null);

  const [orders, setOrders] = useState([]);
  const [orderLoading, setOrderLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const lastOrderId = useRef(null);
  const [userNotifications, setUserNotifications] = useState([]);
  const lastUserId = useRef(null);

  // Toast notification state
  const [toast, setToast] = useState(null);

  function triggerToast(message) {
    setToast(message);
    setTimeout(() => {
      setToast(null);
    }, 3500);
  }

  const [newItem, setNewItem] = useState({
    name: "",
    category: "Coffee",
    price: "",
    desc: "",
    emoji: "",
    img: "",
    available: true,
    isFeatured: false,
    prepTime: "5–8 mins",
    servedAs: "Hot",
    dietType: "Vegetarian",
    salesCount: 0,
    rating: 0,
    reviews: 0,
    sizes: [],
    milkOptions: [],
    temperatureOptions: [],
    customExtras: [],
    customExtrasMaxSelection: 3,
    sweetnessOptions: [],
  });

  const [editing, setEditing] = useState(null);
  const [editItem, setEditItem] = useState({
    name: "",
    category: "Coffee",
    price: "",
    desc: "",
    emoji: "",
    img: "",
    available: true,
    isFeatured: false,
    prepTime: "5–8 mins",
    servedAs: "Hot",
    dietType: "Vegetarian",
    sizes: [],
    milkOptions: [],
    temperatureOptions: [],
    customExtras: [],
    customExtrasMaxSelection: 3,
    sweetnessOptions: [],
  });

  useEffect(() => {
    loadMenu();

    // Close dropdowns when clicking outside
    function handleClickOutside(event) {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target)) {
        setShowSortDropdown(false);
      }
      if (bulkDropdownRef.current && !bulkDropdownRef.current.contains(event.target)) {
        setShowBulkDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);

    const unsubscribe = onSnapshot(collection(db, "orders"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setOrders(data);
      setOrderLoading(false);
      if (data.length > 0) {
        const newest = [...data].sort(
          (a, b) =>
            (b.createdAt?.seconds || 0) -
            (a.createdAt?.seconds || 0)
        )[0];
        if (lastOrderId.current && newest.id !== lastOrderId.current) {
          setNotifications((prev) => [
            {
              id: newest.id,
              text: `🛎️ New order from ${newest.customer?.name || "Customer"}`,
            },
            ...prev,
          ]);
          triggerToast(`New order received from ${newest.customer?.name || "Customer"}!`);
        }
        lastOrderId.current = newest.id;
      }
    });

    const unsubscribeUsers = onSnapshot(
      query(collection(db, "users"), orderBy("createdAt", "desc")),
      (snapshot) => {
        if (snapshot.empty) return;
        const newest = snapshot.docs[0];
        const user = newest.data();
        if (lastUserId.current && newest.id !== lastUserId.current) {
          setUserNotifications((prev) => [
            {
              id: newest.id,
              text: `👤 ${user.name || "New user"} has joined Brewed`,
            },
            ...prev,
          ]);
        }
        lastUserId.current = newest.id;
      }
    );

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      unsubscribe();
      unsubscribeUsers();
    };
  }, []);

  async function loadMenu() {
    const snapshot = await getDocs(collection(db, "menu"));
    const items = snapshot.docs.map((doc) => ({
      ...doc.data(),
      firestoreId: doc.id,
    }));
    setMenu(items);
    setLoading(false);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#FDFBF7", color: "#3B1A08", fontSize: "20px", fontWeight: 600, fontFamily: "'Playfair Display', serif" }}>
        ☕ Crafting Brewed Experience...
      </div>
    );
  }

  async function addProduct() {
    if (!newItem.name || !newItem.price) {
      alert("Please fill in the product name and price.");
      return;
    }
    const now = new Date();
    await addDoc(collection(db, "menu"), {
      ...newItem,
      price: Number(newItem.price),
      available: newItem.available,
      isFeatured: newItem.isFeatured,
      createdAt: now,
      updatedAt: now,
      sizes: newItem.sizes,
      prepTime: newItem.prepTime,
      servedAs: newItem.servedAs,
      dietType: newItem.dietType,
      milkOptions: newItem.milkOptions,
      temperatureOptions: newItem.temperatureOptions,
      customExtras: newItem.customExtras,
      customExtrasMaxSelection: Number(newItem.customExtrasMaxSelection),
      sweetnessOptions: newItem.sweetnessOptions,
      salesCount: 0,
      rating: 0,
      reviews: 0,
    });
    setNewItem({
      name: "",
      category: "Coffee",
      price: "",
      desc: "",
      emoji: "",
      img: "",
      available: true,
      isFeatured: false,
      prepTime: "5–8 mins",
      servedAs: "Hot",
      dietType: "Vegetarian",
      salesCount: 0,
      rating: 0,
      reviews: 0,
      sizes: [],
      milkOptions: [],
      temperatureOptions: [],
      customExtras: [],
      customExtrasMaxSelection: 3,
      sweetnessOptions: [],
    });
    setShowAdd(false);
    loadMenu();
    triggerToast("Product successfully created!");
  }

  async function deleteProduct(id) {
    const confirmed = window.confirm("Are you sure you want to delete this product?");
    if (!confirmed) return;
    await deleteDoc(doc(db, "menu", id));
    loadMenu();
    triggerToast("Product successfully deleted!");
  }

  async function toggleAvailability(item) {
    const nextStatus = item.available === false ? true : false;
    await updateDoc(doc(db, "menu", item.firestoreId), {
      available: nextStatus,
      updatedAt: new Date(),
    });
    loadMenu();
    triggerToast(`Item is now ${nextStatus ? "In Stock" : "Out of Stock"}!`);
  }

  async function updateProduct() {
    if (!editing) return;
    try {
      await updateDoc(doc(db, "menu", editing.firestoreId), {
        name: editItem.name,
        category: editItem.category,
        price: Number(editItem.price),
        desc: editItem.desc,
        emoji: editItem.emoji,
        img: editItem.img,
        available: editItem.available,
        isFeatured: editItem.isFeatured,
        updatedAt: new Date(),
        sizes: editItem.sizes,
        milkOptions: editItem.milkOptions,
        temperatureOptions: editItem.temperatureOptions,
        customExtras: editItem.customExtras,
        customExtrasMaxSelection: Number(editItem.customExtrasMaxSelection),
        sweetnessOptions: editItem.sweetnessOptions,
        prepTime: editItem.prepTime,
        servedAs: editItem.servedAs,
        dietType: editItem.dietType,
      });
      setEditing(null);
      loadMenu();
      triggerToast("Product successfully edited!");
    } catch (e) {
      alert("Error updating product:\n" + String(e));
    }
  }

  const totalProductsCount = menu.length;
  const featuredCount = menu.filter((i) => i.isFeatured).length;
  const inStockCount = menu.filter((i) => i.available !== false).length;
  const outOfStockCount = menu.filter((i) => i.available === false).length;

  const sortOptions = [
    { id: "featured", label: "Featured First" },
    { id: "high-to-low", label: "Highest to Lowest" },
    { id: "low-to-high", label: "Lowest to Highest" },
    { id: "best-selling", label: "Best Selling" },
    { id: "new-to-old", label: "New to Old" },
    { id: "old-to-new", label: "Old to New" },
    { id: "last-edited", label: "Last Edited" },
  ];

  const currentSortLabel = sortOptions.find((o) => o.id === sortBy)?.label || "Sort";

  // Filtered and sorted menu computation
  const filteredAndSortedMenu = menu
    .filter((item) => {
      const matchesSearch =
        (item.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (item.category || "").toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        categoryFilter === "All" || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === "high-to-low") {
        return Number(b.price || 0) - Number(a.price || 0);
      }
      if (sortBy === "low-to-high") {
        return Number(a.price || 0) - Number(b.price || 0);
      }
      if (sortBy === "featured") {
        return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
      }
      if (sortBy === "best-selling") {
        return Number(b.salesCount || 0) - Number(a.salesCount || 0);
      }
      if (sortBy === "new-to-old") {
        const timeA = a.createdAt?.seconds || (a.createdAt ? new Date(a.createdAt).getTime() / 1000 : 0);
        const timeB = b.createdAt?.seconds || (b.createdAt ? new Date(b.createdAt).getTime() / 1000 : 0);
        return timeB - timeA;
      }
      if (sortBy === "old-to-new") {
        const timeA = a.createdAt?.seconds || (a.createdAt ? new Date(a.createdAt).getTime() / 1000 : 0);
        const timeB = b.createdAt?.seconds || (b.createdAt ? new Date(b.createdAt).getTime() / 1000 : 0);
        return timeA - timeB;
      }
      if (sortBy === "last-edited") {
        const timeA = a.updatedAt?.seconds || (a.updatedAt ? new Date(a.updatedAt).getTime() / 1000 : 0);
        const timeB = b.updatedAt?.seconds || (b.updatedAt ? new Date(b.updatedAt).getTime() / 1000 : 0);
        return timeB - timeA;
      }
      return 0;
    });

  function toggleSelectAll(e) {
    if (e.target.checked) {
      setSelectedItems(filteredAndSortedMenu.map((i) => i.firestoreId));
    } else {
      setSelectedItems([]);
    }
  }

  // Bulk action execution handler
  async function executeBulkAction() {
    if (selectedItems.length === 0 || !bulkAction) return;

    if (bulkAction === "delete") {
      if (!window.confirm(`Are you sure you want to delete ${selectedItems.length} products?`)) return;
      for (const id of selectedItems) {
        await deleteDoc(doc(db, "menu", id));
      }
      triggerToast(`${selectedItems.length} products deleted successfully!`);
    } else if (bulkAction === "mark-featured") {
      for (const id of selectedItems) {
        await updateDoc(doc(db, "menu", id), { isFeatured: true, updatedAt: new Date() });
      }
      triggerToast(`${selectedItems.length} products marked as featured!`);
    } else if (bulkAction === "remove-featured") {
      for (const id of selectedItems) {
        await updateDoc(doc(db, "menu", id), { isFeatured: false, updatedAt: new Date() });
      }
      triggerToast(`Removed featured status from ${selectedItems.length} products!`);
    } else if (bulkAction === "mark-in-stock") {
      for (const id of selectedItems) {
        await updateDoc(doc(db, "menu", id), { available: true, updatedAt: new Date() });
      }
      triggerToast(`${selectedItems.length} products marked as in stock!`);
    } else if (bulkAction === "mark-out-of-stock") {
      for (const id of selectedItems) {
        await updateDoc(doc(db, "menu", id), { available: false, updatedAt: new Date() });
      }
      triggerToast(`${selectedItems.length} products marked as out of stock!`);
    } else if (bulkAction === "change-category") {
      const newCat = window.prompt("Enter new category (Coffee, Non-Coffee, Food):", "Coffee");
      if (!newCat) return;
      for (const id of selectedItems) {
        await updateDoc(doc(db, "menu", id), { category: newCat, updatedAt: new Date() });
      }
      triggerToast(`Category updated for ${selectedItems.length} products!`);
    } else if (bulkAction === "duplicate") {
      for (const id of selectedItems) {
        const itemToCopy = menu.find((i) => i.firestoreId === id);
        if (itemToCopy) {
          const { firestoreId, ...copyData } = itemToCopy;
          copyData.name = `${copyData.name} (Copy)`;
          copyData.createdAt = new Date();
          copyData.updatedAt = new Date();
          await addDoc(collection(db, "menu"), copyData);
        }
      }
      triggerToast(`${selectedItems.length} products duplicated!`);
    } else if (bulkAction === "apply-discount") {
      const discountStr = window.prompt("Enter discount percentage (e.g., 10 for 10% off):", "10");
      const discount = Number(discountStr);
      if (isNaN(discount) || discount <= 0) return;
      for (const id of selectedItems) {
        const item = menu.find((i) => i.firestoreId === id);
        if (item) {
          const newPrice = Math.round(Number(item.price) * (1 - discount / 100));
          await updateDoc(doc(db, "menu", id), { price: newPrice, updatedAt: new Date() });
        }
      }
      triggerToast(`${discount}% discount applied to ${selectedItems.length} products!`);
    } else if (bulkAction === "export") {
      const selectedData = menu.filter((i) => selectedItems.includes(i.firestoreId));
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(selectedData, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `brewed_selected_products_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      triggerToast(`Exported ${selectedItems.length} products successfully!`);
    } else if (bulkAction === "archive") {
      for (const id of selectedItems) {
        await updateDoc(doc(db, "menu", id), { available: false, archived: true, updatedAt: new Date() });
      }
      triggerToast(`${selectedItems.length} products archived!`);
    }

    setSelectedItems([]);
    setBulkAction("");
    loadMenu();
  }

  const bulkActionOptions = [
    { id: "delete", label: "🗑️ Delete Selected" },
    { id: "mark-featured", label: "⭐ Mark as Featured" },
    { id: "remove-featured", label: "☆ Remove Featured" },
    { id: "mark-in-stock", label: "✅ Mark In Stock" },
    { id: "mark-out-of-stock", label: "🚫 Mark Out of Stock" },
    { id: "change-category", label: "🏷️ Change Category" },
    { id: "duplicate", label: "📋 Duplicate" },
    { id: "apply-discount", label: "🏷️ Apply Discount" },
    { id: "export", label: "📥 Export Selected" },
    { id: "archive", label: "📦 Archive" },
  ];

  const currentBulkLabel = bulkActionOptions.find((o) => o.id === bulkAction)?.label || "Bulk Actions";

  return (
    <div style={{ padding: "40px 32px", fontFamily: "'Inter', sans-serif", background: "#FDFBF7", minHeight: "100vh", color: "#2C1810", position: "relative" }}>
      
      {/* Toast Notification Container */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "30px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#2C1810",
            color: "#FFF9F0",
            padding: "16px 28px",
            borderRadius: "14px",
            boxShadow: "0 10px 30px rgba(44, 24, 16, 0.25)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontWeight: 600,
            fontSize: "14px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            animation: "fadeIn 0.3s ease",
            whiteSpace: "nowrap",
          }}
        >
          <span>☕</span> {toast}
        </div>
      )}

      {/* Header & Navigation */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "28px",
          background: "#FFFFFF",
          padding: "20px 28px",
          borderRadius: "20px",
          border: "1px solid #E8DFD5",
          boxShadow: "0 10px 30px rgba(59, 26, 8, 0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: "linear-gradient(135deg, #3B1A08 0%, #59290C 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", boxShadow: "0 4px 12px rgba(59, 26, 8, 0.15)" }}>
            ☕
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "700", fontFamily: "'Playfair Display', serif", color: "#3B1A08", letterSpacing: "-0.5px", lineHeight: "1.2" }}>
                Brewed
              </h1>
              <span style={{ fontSize: "11px", fontWeight: 700, background: "#F4ECE4", color: "#6E523D", padding: "3px 8px", borderRadius: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Menu Management
              </span>
            </div>
            <p style={{ margin: "2px 0 0 0", color: "#6E523D", fontSize: "13px", fontWeight: "400", lineHeight: "1.4" }}>
              Curate exquisite offerings, adjust pricing, and control item availability seamlessly.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            style={{
              position: "relative",
              padding: "10px 16px",
              backgroundColor: "#FAF7F2",
              border: "1px solid #E2D5C9",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "13px",
              color: "#5C4A3E",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>🔔</span> Notifications
            {(notifications.length > 0 || userNotifications.length > 0) && (
              <span
                style={{
                  position: "absolute",
                  top: "-6px",
                  right: "-6px",
                  background: "#C0392B",
                  color: "white",
                  borderRadius: "50%",
                  width: "18px",
                  height: "18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "10px",
                  fontWeight: "bold",
                }}
              >
                {notifications.length + userNotifications.length}
              </span>
            )}
          </button>

          {setActivePage && (
            <button
              onClick={() => setActivePage("dashboard")}
              style={{
                padding: "10px 16px",
                backgroundColor: "#FAF7F2",
                color: "#5C4A3E",
                border: "1px solid #E2D5C9",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "13px",
              }}
            >
              ← Dashboard
            </button>
          )}

          {setPage && (
            <button
              onClick={() => setPage("home")}
              style={{
                padding: "10px 20px",
                backgroundColor: "#3B1A08",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "13px",
              }}
            >
              Exit to Store →
            </button>
          )}
        </div>
      </header>

      {/* Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "28px" }}>
        <div style={{ background: "#FFFFFF", padding: "18px 24px", borderRadius: "16px", border: "1px solid #E8DFD5", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ width: "42px", height: "42px", background: "#FAF7F2", border: "1px solid #EFE6DC", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>☕</div>
          <div>
            <span style={{ fontSize: "11px", color: "#6E523D", textTransform: "uppercase", fontWeight: 700, letterSpacing: "1px" }}>Products</span>
            <h3 style={{ margin: "2px 0 0 0", fontSize: "22px", fontWeight: 800, color: "#3B1A08", fontFamily: "'Playfair Display', serif" }}>{totalProductsCount}</h3>
          </div>
        </div>

        <div style={{ background: "#FFFFFF", padding: "18px 24px", borderRadius: "16px", border: "1px solid #E8DFD5", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ width: "42px", height: "42px", background: "#FFF9E6", border: "1px solid #FDF3CD", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>⭐</div>
          <div>
            <span style={{ fontSize: "11px", color: "#6E523D", textTransform: "uppercase", fontWeight: 700, letterSpacing: "1px" }}>Featured</span>
            <h3 style={{ margin: "2px 0 0 0", fontSize: "22px", fontWeight: 800, color: "#D4AC0D", fontFamily: "'Playfair Display', serif" }}>{featuredCount}</h3>
          </div>
        </div>

        <div style={{ background: "#FFFFFF", padding: "18px 24px", borderRadius: "16px", border: "1px solid #E8DFD5", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ width: "42px", height: "42px", background: "#E8F5E9", border: "1px solid #D1EED3", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>✅</div>
          <div>
            <span style={{ fontSize: "11px", color: "#6E523D", textTransform: "uppercase", fontWeight: 700, letterSpacing: "1px" }}>In Stock</span>
            <h3 style={{ margin: "2px 0 0 0", fontSize: "22px", fontWeight: 800, color: "#2E7D32", fontFamily: "'Playfair Display', serif" }}>{inStockCount}</h3>
          </div>
        </div>

        <div style={{ background: "#FFFFFF", padding: "18px 24px", borderRadius: "16px", border: "1px solid #E8DFD5", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ width: "42px", height: "42px", background: "#FFEBEE", border: "1px solid #FADBD8", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>🚫</div>
          <div>
            <span style={{ fontSize: "11px", color: "#6E523D", textTransform: "uppercase", fontWeight: 700, letterSpacing: "1px" }}>Out of Stock</span>
            <h3 style={{ margin: "2px 0 0 0", fontSize: "22px", fontWeight: 800, color: "#C62828", fontFamily: "'Playfair Display', serif" }}>{outOfStockCount}</h3>
          </div>
        </div>
      </div>

      {/* Action Trigger Section */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "28px" }}>
        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{
            background: "#3B1A08",
            color: "white",
            border: "none",
            padding: "14px 24px",
            borderRadius: "12px",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "14px",
            boxShadow: "0 6px 20px rgba(59, 26, 8, 0.18)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span style={{ fontSize: "16px" }}>+</span> Add New Product
        </button>
      </div>

      {/* Search Bar & Custom Dropdown Sort Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", flexWrap: "wrap", gap: "20px" }}>
        <div style={{ position: "relative", maxWidth: "440px", flex: 1, minWidth: "280px", paddingTop: "2px" }}>
          <input
            type="text"
            placeholder="Search items by name or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "14px 18px 14px 44px",
              borderRadius: "12px",
              border: "1px solid #D8C8B8",
              fontSize: "14px",
              outline: "none",
              background: "#FFFFFF",
              boxShadow: "0 2px 10px rgba(59, 26, 8, 0.02)",
              color: "#2C1810",
              boxSizing: "border-box",
            }}
          />
          <span style={{ position: "absolute", left: "16px", top: "calc(50% + 1px)", transform: "translateY(-50%)", color: "#6E523D", fontSize: "16px" }}>🔍</span>
        </div>

        <div ref={sortDropdownRef} style={{ position: "relative", paddingTop: "2px" }}>
          <button
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            style={{
              padding: "13px 20px",
              backgroundColor: "#FFFFFF",
              border: "1px solid #D8C8B8",
              borderRadius: "12px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "14px",
              color: "#3B1A08",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              boxShadow: "0 2px 10px rgba(59, 26, 8, 0.02)",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ color: "#6E523D", fontSize: "12px", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>Sort:</span>
            <span>{currentSortLabel}</span>
            <span style={{ fontSize: "10px", color: "#6E523D", marginLeft: "4px" }}>▼</span>
          </button>

          {showSortDropdown && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "calc(100% + 6px)",
                background: "#FFFFFF",
                borderRadius: "14px",
                boxShadow: "0 10px 30px rgba(44, 24, 16, 0.12)",
                border: "1px solid #E8DFD5",
                zIndex: 1000,
                minWidth: "200px",
                overflow: "hidden",
                padding: "6px 0",
              }}
            >
              {sortOptions.map((option) => (
                <div
                  key={option.id}
                  onClick={() => {
                    setSortBy(option.id);
                    setShowSortDropdown(false);
                  }}
                  style={{
                    padding: "10px 18px",
                    fontSize: "13px",
                    fontWeight: sortBy === option.id ? 700 : 500,
                    color: sortBy === option.id ? "#3B1A08" : "#5C4A3E",
                    background: sortBy === option.id ? "#FAF7F2" : "transparent",
                    cursor: "pointer",
                  }}
                >
                  {option.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Categories Filter Pills */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px" }}>
        {["All", "Coffee", "Non-Coffee", "Food"].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            style={{
              padding: "8px 20px",
              borderRadius: "30px",
              border: categoryFilter === cat ? "1px solid #3B1A08" : "1px solid #D8C8B8",
              cursor: "pointer",
              background: categoryFilter === cat ? "#3B1A08" : "#FFFFFF",
              color: categoryFilter === cat ? "#FFF" : "#4A3B32",
              fontWeight: 600,
              fontSize: "13px",
              boxShadow: categoryFilter === cat ? "0 4px 12px rgba(59, 26, 8, 0.15)" : "0 1px 3px rgba(0,0,0,0.02)",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Bulk Actions Toolbar (Appears only when at least one item is selected) */}
      {selectedItems.length > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#FFFFFF",
            padding: "14px 22px",
            borderRadius: "14px",
            border: "1px solid #E8DFD5",
            marginBottom: "32px",
            boxShadow: "0 4px 15px rgba(59, 26, 8, 0.06)",
            animation: "fadeIn 0.2s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <input
              type="checkbox"
              checked={filteredAndSortedMenu.length > 0 && selectedItems.length === filteredAndSortedMenu.length}
              onChange={toggleSelectAll}
              style={{ width: "18px", height: "18px", accentColor: "#3B1A08", cursor: "pointer" }}
            />
            <span style={{ fontWeight: 600, fontSize: "14px", color: "#3B1A08" }}>
              {selectedItems.length} selected
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div ref={bulkDropdownRef} style={{ position: "relative" }}>
              <button
                onClick={() => setShowBulkDropdown(!showBulkDropdown)}
                style={{
                  padding: "11px 18px",
                  backgroundColor: "#FAF7F2",
                  border: "1px solid #D8C8B8",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "13px",
                  color: "#3B1A08",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>{currentBulkLabel}</span>
                <span style={{ fontSize: "10px", color: "#6E523D" }}>▼</span>
              </button>

              {showBulkDropdown && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 6px)",
                    background: "#FFFFFF",
                    borderRadius: "12px",
                    boxShadow: "0 10px 30px rgba(44, 24, 16, 0.12)",
                    border: "1px solid #E8DFD5",
                    zIndex: 1000,
                    minWidth: "220px",
                    padding: "6px 0",
                    maxHeight: "300px",
                    overflowY: "auto",
                  }}
                >
                  {bulkActionOptions.map((action) => (
                    <div
                      key={action.id}
                      onClick={() => {
                        setBulkAction(action.id);
                        setShowBulkDropdown(false);
                      }}
                      style={{
                        padding: "10px 16px",
                        fontSize: "13px",
                        fontWeight: bulkAction === action.id ? 700 : 500,
                        color: bulkAction === action.id ? "#3B1A08" : "#5C4A3E",
                        background: bulkAction === action.id ? "#FAF7F2" : "transparent",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        if (bulkAction !== action.id) e.currentTarget.style.background = "#FDFBF7";
                      }}
                      onMouseLeave={(e) => {
                        if (bulkAction !== action.id) e.currentTarget.style.background = "transparent";
                      }}
                    >
                      {action.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={executeBulkAction}
              disabled={selectedItems.length === 0 || !bulkAction}
              style={{
                padding: "11px 22px",
                background: selectedItems.length > 0 && bulkAction ? "#3B1A08" : "#E2D5C9",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "10px",
                cursor: selectedItems.length > 0 && bulkAction ? "pointer" : "not-allowed",
                fontWeight: 600,
                fontSize: "13px",
                boxShadow: selectedItems.length > 0 && bulkAction ? "0 4px 12px rgba(59, 26, 8, 0.15)" : "none",
              }}
            >
              Apply
            </button>

            {/* Cancel Button to Exit Bulk Selection Mode */}
            <button
              onClick={() => {
                setSelectedItems([]);
                setBulkAction("");
              }}
              style={{
                padding: "11px 18px",
                background: "#FAF7F2",
                color: "#6E523D",
                border: "1px solid #D8C8B8",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "13px",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add Product Modal Drawer */}
      {showAdd && (
        <div
          style={{
            background: "#FFFFFF",
            padding: "40px",
            borderRadius: "24px",
            marginBottom: "40px",
            boxShadow: "0 20px 50px rgba(59, 26, 8, 0.08)",
            border: "1px solid #E8DFD5",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", borderBottom: "1px solid #F2ECE4", paddingBottom: "16px" }}>
            <h2 style={{ margin: 0, color: "#3B1A08", fontSize: "24px", fontFamily: "'Playfair Display', serif" }}>
              Craft New Menu Product
            </h2>
            <button onClick={() => setShowAdd(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#6E523D" }}>✕</button>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "20px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#6E523D", marginBottom: "8px", textTransform: "uppercase" }}>Product Name</label>
              <input
                placeholder="e.g. Vanilla Velvet Latte"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #E2D5C9", fontSize: "14px", outline: "none", background: "#FAF7F2" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#6E523D", marginBottom: "8px", textTransform: "uppercase" }}>Category</label>
              <select
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #E2D5C9", fontSize: "14px", outline: "none", background: "#FAF7F2" }}
              >
                <option>Coffee</option>
                <option>Non-Coffee</option>
                <option>Food</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#6E523D", marginBottom: "8px", textTransform: "uppercase" }}>Price (₹)</label>
              <input
                placeholder="160"
                type="number"
                value={newItem.price}
                onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #E2D5C9", fontSize: "14px", outline: "none", background: "#FAF7F2" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#6E523D", marginBottom: "8px", textTransform: "uppercase" }}>Emoji</label>
              <input
                placeholder="☕"
                value={newItem.emoji}
                onChange={(e) => setNewItem({ ...newItem, emoji: e.target.value })}
                style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #E2D5C9", fontSize: "14px", outline: "none", background: "#FAF7F2" }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#6E523D", marginBottom: "8px", textTransform: "uppercase" }}>Description</label>
            <textarea
              placeholder="Rich, velvety espresso blended with steamed microfoam and gourmet vanilla essence..."
              value={newItem.desc}
              onChange={(e) => setNewItem({ ...newItem, desc: e.target.value })}
              style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #E2D5C9", fontSize: "14px", outline: "none", minHeight: "90px", resize: "vertical", background: "#FAF7F2" }}
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#6E523D", marginBottom: "8px", textTransform: "uppercase" }}>Cloudinary Image URL</label>
            <input
              placeholder="https://res.cloudinary.com/..."
              value={newItem.img}
              onChange={(e) => setNewItem({ ...newItem, img: e.target.value })}
              style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #E2D5C9", fontSize: "14px", outline: "none", background: "#FAF7F2" }}
            />
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "25px", fontWeight: 600, color: "#3B1A08", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={newItem.isFeatured}
              onChange={(e) => setNewItem({ ...newItem, isFeatured: e.target.checked })}
              style={{ width: "18px", height: "18px", accentColor: "#3B1A08" }}
            />
            Highlight as Featured Menu Item
          </label>

          <div style={{ display: "flex", gap: "15px" }}>
            <button
              onClick={addProduct}
              style={{ background: "#3B1A08", color: "#FFF", border: "none", padding: "14px 28px", borderRadius: "12px", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}
            >
              Save Product
            </button>
            <button
              onClick={() => setShowAdd(false)}
              style={{ background: "#E8DFD5", color: "#3B1A08", border: "none", padding: "14px 28px", borderRadius: "12px", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Editing State Modal */}
      {editing && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "20px",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              padding: "40px",
              borderRadius: "24px",
              width: "100%",
              maxWidth: "800px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px rgba(0, 0, 0, 0.25)",
              border: "2px solid #C4956A",
              boxSizing: "border-box",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", borderBottom: "1px solid #F2ECE4", paddingBottom: "16px" }}>
              <h2 style={{ margin: 0, color: "#3B1A08", fontSize: "24px", fontFamily: "'Playfair Display', serif" }}>
                Editing: {editing.name}
              </h2>
              <button onClick={() => setEditing(null)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#6E523D" }}>✕</button>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#6E523D", marginBottom: "8px", textTransform: "uppercase" }}>Name</label>
                <input
                  value={editItem.name}
                  onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
                  style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #E2D5C9", fontSize: "14px", outline: "none", background: "#FAF7F2", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#6E523D", marginBottom: "8px", textTransform: "uppercase" }}>Category</label>
                <select
                  value={editItem.category}
                  onChange={(e) => setEditItem({ ...editItem, category: e.target.value })}
                  style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #E2D5C9", fontSize: "14px", outline: "none", background: "#FAF7F2", boxSizing: "border-box" }}
                >
                  <option>Coffee</option>
                  <option>Non-Coffee</option>
                  <option>Food</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#6E523D", marginBottom: "8px", textTransform: "uppercase" }}>Price (₹)</label>
                <input
                  type="number"
                  value={editItem.price}
                  onChange={(e) => setEditItem({ ...editItem, price: e.target.value })}
                  style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #E2D5C9", fontSize: "14px", outline: "none", background: "#FAF7F2", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#6E523D", marginBottom: "8px", textTransform: "uppercase" }}>Emoji</label>
                <input
                  value={editItem.emoji}
                  onChange={(e) => setEditItem({ ...editItem, emoji: e.target.value })}
                  style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #E2D5C9", fontSize: "14px", outline: "none", background: "#FAF7F2", boxSizing: "border-box" }}
                />
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#6E523D", marginBottom: "8px", textTransform: "uppercase" }}>Description</label>
              <textarea
                value={editItem.desc}
                onChange={(e) => setEditItem({ ...editItem, desc: e.target.value })}
                style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #E2D5C9", fontSize: "14px", outline: "none", minHeight: "90px", background: "#FAF7F2", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#6E523D", marginBottom: "8px", textTransform: "uppercase" }}>Cloudinary URL</label>
              <input
                value={editItem.img}
                onChange={(e) => setEditItem({ ...editItem, img: e.target.value })}
                style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #E2D5C9", fontSize: "14px", outline: "none", background: "#FAF7F2", boxSizing: "border-box" }}
              />
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "25px", fontWeight: 600, color: "#3B1A08", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={editItem.isFeatured}
                onChange={(e) => setEditItem({ ...editItem, isFeatured: e.target.checked })}
                style={{ width: "18px", height: "18px", accentColor: "#3B1A08" }}
              />
              Highlight as Featured Menu Item
            </label>

            <div style={{ display: "flex", gap: "15px" }}>
              <button
                onClick={updateProduct}
                style={{ background: "#2E7D32", color: "#FFF", border: "none", padding: "14px 28px", borderRadius: "12px", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}
              >
                💾 Save Changes
              </button>
              <button
                onClick={() => setEditing(null)}
                style={{ background: "#E8DFD5", color: "#3B1A08", border: "none", padding: "14px 28px", borderRadius: "12px", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menu Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px" }}>
        {filteredAndSortedMenu.map((item) => {
          const isSelected = selectedItems.includes(item.firestoreId);
          return (
            <div
              key={item.firestoreId}
              style={{
                background: "#FFFFFF",
                borderRadius: "20px",
                overflow: "hidden",
                boxShadow: "0 8px 30px rgba(59, 26, 8, 0.04)",
                border: isSelected ? "2px solid #3B1A08" : "1px solid #E8DFD5",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
                transform: "translateY(0)",
                transition: "all 0.25s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 14px 35px rgba(59, 26, 8, 0.08)";
                const cb = e.currentTarget.querySelector(".card-checkbox");
                if (cb) cb.style.opacity = "1";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 8px 30px rgba(59, 26, 8, 0.04)";
                const cb = e.currentTarget.querySelector(".card-checkbox");
                if (cb && !isSelected) cb.style.opacity = "0";
              }}
            >
              {/* Product Card Checkbox (Hidden by default, reveals on hover or when checked) */}
              <div 
                className="card-checkbox"
                style={{ 
                  position: "absolute", 
                  top: "12px", 
                  left: "12px", 
                  zIndex: 10,
                  opacity: isSelected ? "1" : "0",
                  transition: "opacity 0.2s ease"
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedItems([...selectedItems, item.firestoreId]);
                    } else {
                      setSelectedItems(selectedItems.filter((id) => id !== item.firestoreId));
                    }
                  }}
                  style={{ width: "18px", height: "18px", accentColor: "#3B1A08", cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.2)" }}
                />
              </div>

              <div>
                <div style={{ width: "100%", height: "160px", overflow: "hidden", background: "#F2ECE4", position: "relative" }}>
                  {item.img ? (
                    <img src={item.img} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "48px" }}>
                      {item.emoji || "☕"}
                    </div>
                  )}

                  {item.isFeatured && (
                    <div style={{ position: "absolute", top: "12px", right: "12px", background: "rgba(212, 172, 13, 0.95)", color: "#FFFFFF", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", backdropFilter: "blur(4px)" }}>
                      ⭐ Featured
                    </div>
                  )}
                </div>
                
                <div style={{ padding: "20px 24px 12px 24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div>
                      <span style={{ fontSize: "11px", fontWeight: 700, background: "#F2ECE4", color: "#6E523D", padding: "4px 10px", borderRadius: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        {item.category || "General"}
                      </span>
                      <h3 style={{ margin: "8px 0 4px 0", fontSize: "20px", fontWeight: 700, color: "#3B1A08", fontFamily: "'Playfair Display', serif" }}>
                        {item.name || "Unnamed Product"}
                      </h3>
                    </div>
                    <strong style={{ fontSize: "34px", color: "#A9784E", fontWeight: 700, lineHeight: 1, fontFamily: "'Playfair Display', serif" }}>
                      ₹{item.price || 0}
                    </strong>
                  </div>

                  <p style={{ color: "#6E523D", fontSize: "13px", margin: "0", lineHeight: "1.6", minHeight: "42px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {item.desc || "No description provided."}
                  </p>
                </div>
              </div>

              <div style={{ padding: "16px 24px", background: "#FAF7F2", borderTop: "1px solid #F2ECE4", display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  onClick={() => {
                    setEditing(item);
                    setEditItem({
                      name: item.name || "",
                      category: item.category || "Coffee",
                      price: item.price || "",
                      desc: item.desc || "",
                      emoji: item.emoji || "",
                      img: item.img || "",
                      isFeatured: item.isFeatured || false,
                      available: item.available ?? true,
                      prepTime: item.prepTime || "5–8 mins",
                      servedAs: item.servedAs || "Hot",
                      dietType: item.dietType || "Vegetarian",
                    });
                  }}
                  style={{
                    flex: 1,
                    background: "#F7F2EC",
                    color: "#3B1A08",
                    border: "1px solid #E7D8C8",
                    padding: "10px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "13px",
                  }}
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => deleteProduct(item.firestoreId)}
                  style={{
                    background: "#FFF1F1",
                    color: "#C62828",
                    border: "1px solid #F5C6CB",
                    width: "40px",
                    height: "38px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "16px",
                  }}
                  title="Delete Product"
                >
                  🗑
                </button>
                <button
                  onClick={() => toggleAvailability(item)}
                  style={{
                    flex: 1.2,
                    background: item.available === false ? "#777777" : "#2E7D32",
                    color: "#FFFFFF",
                    border: "none",
                    padding: "10px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "13px",
                  }}
                >
                  {item.available === false ? "🚫 Out of Stock" : "✅ In Stock"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
