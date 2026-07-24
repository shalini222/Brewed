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
import * as XLSX from "xlsx";
import { db } from "../firebase";

const DEFAULT_COFFEE_PRESETS = {
  sizes: [
    { name: "Small", desc: "180 ml", priceAdd: 30 },
    { name: "Regular", desc: "210 ml", priceAdd: 50 },
    { name: "Large", desc: "260 ml", priceAdd: 80 },
    { name: "Extra Large", desc: "320 ml", priceAdd: 120 }
  ],
  milkOptions: [
    { name: "Whole", price: 0 },
    { name: "Skim", price: 0 },
    { name: "Oat", price: 30 },
    { name: "Soy", price: 25 },
    { name: "Almond", price: 30 }
  ],
  temperatureOptions: ["Hot", "Iced"],
  sweetnessOptions: ["0% (Unsweetened)", "25% (Light)", "50% (Regular)", "100% (Sweet)"],
  customExtras: [
    { name: "Extra Espresso Shot", price: 40 },
    { name: "Vanilla Syrup", price: 25 },
    { name: "Caramel Drizzle", price: 25 },
    { name: "Whipped Cream", price: 30 }
  ],
  customExtrasMaxSelection: 3,
  prepTime: "8-10 mins",
  servedAs: "Hot",
  dietType: "Vegetarian",
  specialRequests: ["Less Ice", "Extra Hot", "No Foam"]
};

export default function MenuManagement({ setPage, setActivePage }) {
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

  // Bulk Input Modal State
  const [bulkModal, setBulkModal] = useState({ show: false, type: null });
  const [bulkInputValue, setBulkInputValue] = useState("");
  const [discountType, setDiscountType] = useState("percentage");
  const [exportFormat, setExportFormat] = useState("xlsx");

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
    archived: false,
    isFeatured: false,
    prepTime: "8-10 mins",
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
    specialRequests: [],
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
    archived: false,
    isFeatured: false,
    prepTime: "8-10 mins",
    servedAs: "Hot",
    dietType: "Vegetarian",
    sizes: [],
    milkOptions: [],
    temperatureOptions: [],
    customExtras: [],
    customExtrasMaxSelection: 3,
    sweetnessOptions: [],
    specialRequests: [],
  });

  useEffect(() => {
    loadMenu();

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
    try {
      const snapshot = await getDocs(collection(db, "menu"));
      const items = snapshot.docs.map((doc) => ({
        ...doc.data(),
        firestoreId: doc.id,
      }));
      setMenu(items);
    } catch (err) {
      console.error("Error loading menu:", err);
    } finally {
      setLoading(false);
    }
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
      archived: newItem.archived || false,
      isFeatured: newItem.isFeatured,
      createdAt: now,
      updatedAt: now,
      sizes: newItem.sizes || [],
      prepTime: newItem.prepTime || "8-10 mins",
      servedAs: newItem.servedAs || "Hot",
      dietType: newItem.dietType || "Vegetarian",
      milkOptions: newItem.milkOptions || [],
      temperatureOptions: newItem.temperatureOptions || [],
      customExtras: newItem.customExtras || [],
      customExtrasMaxSelection: Number(newItem.customExtrasMaxSelection) || 3,
      sweetnessOptions: newItem.sweetnessOptions || [],
      specialRequests: newItem.specialRequests || [],
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
      archived: false,
      isFeatured: false,
      prepTime: "8-10 mins",
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
      specialRequests: [],
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
        archived: editItem.archived || false,
        isFeatured: editItem.isFeatured,
        updatedAt: new Date(),
        sizes: editItem.sizes || [],
        milkOptions: editItem.milkOptions || [],
        temperatureOptions: editItem.temperatureOptions || [],
        customExtras: editItem.customExtras || [],
        customExtrasMaxSelection: Number(editItem.customExtrasMaxSelection) || 3,
        sweetnessOptions: editItem.sweetnessOptions || [],
        specialRequests: editItem.specialRequests || [],
        prepTime: editItem.prepTime || "8-10 mins",
        servedAs: editItem.servedAs || "Hot",
        dietType: editItem.dietType || "Vegetarian",
      });
      setEditing(null);
      loadMenu();
      triggerToast("Product successfully edited!");
    } catch (e) {
      alert("Error updating product:\n" + String(e));
    }
  }

  const totalProductsCount = menu.filter((i) => !i.archived).length;
  const featuredCount = menu.filter((i) => i.isFeatured && !i.archived).length;
  const inStockCount = menu.filter((i) => i.available !== false && !i.archived).length;
  const outOfStockCount = menu.filter((i) => i.available === false && !i.archived).length;
  const archivedCount = menu.filter((i) => i.archived).length;


  const CLOUD_NAME = "knvwfzhp";
const UPLOAD_PRESET = "brewed_menu";
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

async function uploadMilkIcon(file) {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const response = await fetch(CLOUDINARY_URL, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  return data.secure_url;
}
  
  
  
  
  
  
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

  const filteredAndSortedMenu = menu
    .filter((item) => {
      const matchesSearch =
        (item.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (item.category || "").toLowerCase().includes(search.toLowerCase());
      
      if (categoryFilter === "Archived") {
        return matchesSearch && item.archived === true;
      }
      
      const matchesCategory =
        categoryFilter === "All" || (item.category === categoryFilter && !item.archived);
      return matchesSearch && matchesCategory && !item.archived;
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

  function handleBulkActionTrigger() {
    if (selectedItems.length === 0 || !bulkAction) return;

    if (bulkAction === "change-category" || bulkAction === "apply-discount" || bulkAction === "export") {
      if (bulkAction === "change-category") setBulkInputValue("Coffee");
      if (bulkAction === "apply-discount") {
        setBulkInputValue("10");
        setDiscountType("percentage");
      }
      if (bulkAction === "export") setExportFormat("xlsx");

      setBulkModal({ show: true, type: bulkAction });
      return;
    }

    executeBulkActionConfirmed();
  }

  async function executeBulkActionConfirmed(modalInputOverride = null) {
    const actionToRun = bulkAction;
    if (selectedItems.length === 0 || !actionToRun) return;

    if (actionToRun === "delete") {
      if (!window.confirm(`Are you sure you want to delete ${selectedItems.length} products?`)) return;
      for (const id of selectedItems) {
        await deleteDoc(doc(db, "menu", id));
      }
      triggerToast(`${selectedItems.length} products deleted successfully!`);
    } else if (actionToRun === "mark-featured") {
      for (const id of selectedItems) {
        await updateDoc(doc(db, "menu", id), { isFeatured: true, updatedAt: new Date() });
      }
      triggerToast(`${selectedItems.length} products marked as featured!`);
    } else if (actionToRun === "remove-featured") {
      for (const id of selectedItems) {
        await updateDoc(doc(db, "menu", id), { isFeatured: false, updatedAt: new Date() });
      }
      triggerToast(`Removed featured status from ${selectedItems.length} products!`);
    } else if (actionToRun === "mark-in-stock") {
      for (const id of selectedItems) {
        await updateDoc(doc(db, "menu", id), { available: true, updatedAt: new Date() });
      }
      triggerToast(`${selectedItems.length} products marked as in stock!`);
    } else if (actionToRun === "mark-out-of-stock") {
      for (const id of selectedItems) {
        await updateDoc(doc(db, "menu", id), { available: false, updatedAt: new Date() });
      }
      triggerToast(`${selectedItems.length} products marked as out of stock!`);
    } else if (actionToRun === "change-category") {
      const newCat = modalInputOverride !== null ? modalInputOverride : bulkInputValue;
      if (!newCat) return;
      for (const id of selectedItems) {
        await updateDoc(doc(db, "menu", id), { category: newCat, updatedAt: new Date() });
      }
      triggerToast(`Category updated for ${selectedItems.length} products!`);
    } else if (actionToRun === "duplicate") {
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
    } else if (actionToRun === "apply-discount") {
      const val = Number(modalInputOverride !== null ? modalInputOverride : bulkInputValue);
      if (isNaN(val) || val <= 0) return;
      for (const id of selectedItems) {
        const item = menu.find((i) => i.firestoreId === id);
        if (item) {
          let newPrice = Number(item.price);
          if (discountType === "percentage") {
            newPrice = Math.round(newPrice * (1 - val / 100));
          } else {
            newPrice = Math.max(0, newPrice - val);
          }
          await updateDoc(doc(db, "menu", id), { price: newPrice, updatedAt: new Date() });
        }
      }
      triggerToast(`Discount applied to ${selectedItems.length} products!`);
    } else if (actionToRun === "export") {
      const selectedData = menu
        .filter((i) => selectedItems.includes(i.firestoreId))
        .map(({ firestoreId, ...rest }) => ({
          ID: firestoreId,
          Name: rest.name || "",
          Category: rest.category || "",
          Price: rest.price || 0,
          Description: rest.desc || "",
          Available: rest.available !== false ? "Yes" : "No",
          Archived: rest.archived ? "Yes" : "No",
          Featured: rest.isFeatured ? "Yes" : "No",
          SalesCount: rest.salesCount || 0,
        }));

      const worksheet = XLSX.utils.json_to_sheet(selectedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

      if (exportFormat === "xlsx") {
        XLSX.writeFile(workbook, `brewed_products_${Date.now()}.xlsx`);
        triggerToast(`Exported ${selectedItems.length} products to Excel (.xlsx)!`);
      } else {
        XLSX.writeFile(workbook, `brewed_products_${Date.now()}.csv`, { bookType: "csv" });
        triggerToast(`Exported ${selectedItems.length} products to CSV (.csv)!`);
      }
    } else if (actionToRun === "archive") {
      for (const id of selectedItems) {
        await updateDoc(doc(db, "menu", id), { archived: true, updatedAt: new Date() });
      }
      triggerToast(`${selectedItems.length} products archived!`);
    } else if (actionToRun === "unarchive") {
      for (const id of selectedItems) {
        await updateDoc(doc(db, "menu", id), { archived: false, updatedAt: new Date() });
      }
      triggerToast(`${selectedItems.length} products unarchived!`);
    }

    setBulkModal({ show: false, type: null });
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
    { id: "unarchive", label: "📂 Unarchive" },
  ];

  const currentBulkLabel = bulkActionOptions.find((o) => o.id === bulkAction)?.label || "Bulk Actions";

  return (
    <div style={{ padding: "40px 32px", fontFamily: "'Inter', sans-serif", background: "#FDFBF7", minHeight: "100vh", color: "#2C1810", position: "relative" }}>
      
      {/* Toast Notification */}
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
            whiteSpace: "nowrap",
          }}
        >
          <span>☕</span> {toast}
        </div>
      )}

      {/* Bulk Input Modal */}
      {bulkModal.show && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(5px)",
            zIndex: 10000,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              padding: "36px",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "420px",
              boxShadow: "0 25px 50px rgba(0, 0, 0, 0.25)",
              border: "1px solid #E8DFD5",
              boxSizing: "border-box",
            }}
          >
            <h3 style={{ margin: "0 0 10px 0", color: "#3B1A08", fontSize: "20px", fontFamily: "'Playfair Display', serif" }}>
              {bulkModal.type === "apply-discount" && "Apply Discount"}
              {bulkModal.type === "change-category" && "Change Product Category"}
              {bulkModal.type === "export" && "Export Products"}
            </h3>
            <p style={{ margin: "0 0 20px 0", color: "#6E523D", fontSize: "13px", lineHeight: "1.5" }}>
              {bulkModal.type === "apply-discount" && `Choose discount type and enter value for ${selectedItems.length} selected items.`}
              {bulkModal.type === "change-category" && `Enter the new category name for ${selectedItems.length} selected items.`}
              {bulkModal.type === "export" && `Choose your preferred file format to export ${selectedItems.length} selected items.`}
            </p>

            {bulkModal.type === "apply-discount" && (
              <div>
                <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
                  <button
                    onClick={() => {
                      setDiscountType("percentage");
                      setBulkInputValue("10");
                    }}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "10px",
                      border: discountType === "percentage" ? "1px solid #3B1A08" : "1px solid #D8C8B8",
                      background: discountType === "percentage" ? "#3B1A08" : "#FAF7F2",
                      color: discountType === "percentage" ? "#FFF" : "#6E523D",
                      fontWeight: 600,
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    Percentage (%)
                  </button>
                  <button
                    onClick={() => {
                      setDiscountType("fixed");
                      setBulkInputValue("50");
                    }}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "10px",
                      border: discountType === "fixed" ? "1px solid #3B1A08" : "1px solid #D8C8B8",
                      background: discountType === "fixed" ? "#3B1A08" : "#FAF7F2",
                      color: discountType === "fixed" ? "#FFF" : "#6E523D",
                      fontWeight: 600,
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    Fixed Amount (₹)
                  </button>
                </div>

                <div style={{ position: "relative", marginBottom: "24px" }}>
                  <input
                    type="number"
                    value={bulkInputValue}
                    onChange={(e) => setBulkInputValue(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "14px 40px 14px 16px",
                      borderRadius: "12px",
                      border: "1px solid #D8C8B8",
                      fontSize: "15px",
                      outline: "none",
                      background: "#FAF7F2",
                      boxSizing: "border-box",
                      fontWeight: 600,
                      color: "#3B1A08",
                    }}
                  />
                  <span style={{ position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", color: "#6E523D", fontWeight: 700 }}>
                    {discountType === "percentage" ? "%" : "₹"}
                  </span>
                </div>
              </div>
            )}

            {bulkModal.type === "change-category" && (
              <div style={{ marginBottom: "24px" }}>
                <select
                  value={bulkInputValue}
                  onChange={(e) => setBulkInputValue(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    borderRadius: "12px",
                    border: "1px solid #D8C8B8",
                    fontSize: "14px",
                    outline: "none",
                    background: "#FAF7F2",
                    boxSizing: "border-box",
                    fontWeight: 600,
                    color: "#3B1A08",
                  }}
                >
                  <option value="Coffee">Coffee</option>
                  <option value="Non-Coffee">Non-Coffee</option>
                  <option value="Food">Food</option>
                </select>
              </div>
            )}

            {bulkModal.type === "export" && (
              <div style={{ display: "flex", gap: "10px", marginBottom: "24px" }}>
                <button
                  onClick={() => setExportFormat("xlsx")}
                  style={{
                    flex: 1,
                    padding: "14px",
                    borderRadius: "12px",
                    border: exportFormat === "xlsx" ? "1px solid #3B1A08" : "1px solid #D8C8B8",
                    background: exportFormat === "xlsx" ? "#3B1A08" : "#FAF7F2",
                    color: exportFormat === "xlsx" ? "#FFF" : "#6E523D",
                    fontWeight: 600,
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  📊 Excel (.xlsx)
                </button>
                <button
                  onClick={() => setExportFormat("csv")}
                  style={{
                    flex: 1,
                    padding: "14px",
                    borderRadius: "12px",
                    border: exportFormat === "csv" ? "1px solid #3B1A08" : "1px solid #D8C8B8",
                    background: exportFormat === "csv" ? "#3B1A08" : "#FAF7F2",
                    color: exportFormat === "csv" ? "#FFF" : "#6E523D",
                    fontWeight: 600,
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  📄 CSV (.csv)
                </button>
              </div>
            )}

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => executeBulkActionConfirmed(bulkInputValue)}
                style={{
                  flex: 1,
                  background: "#3B1A08",
                  color: "#FFF",
                  border: "none",
                  padding: "12px 20px",
                  borderRadius: "10px",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                {bulkModal.type === "export" ? "Download File" : "Apply"}
              </button>
              <button
                onClick={() => setBulkModal({ show: false, type: null })}
                style={{
                  flex: 1,
                  background: "#FAF7F2",
                  color: "#6E523D",
                  border: "1px solid #D8C8B8",
                  padding: "12px 20px",
                  borderRadius: "10px",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
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
              <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "700", fontFamily: "'Playfair Display', serif", color: "#3B1A08" }}>
                Brewed
              </h1>
              <span style={{ fontSize: "11px", fontWeight: 700, background: "#F4ECE4", color: "#6E523D", padding: "3px 8px", borderRadius: "6px", textTransform: "uppercase" }}>
                Menu Management
              </span>
            </div>
            <p style={{ margin: "2px 0 0 0", color: "#6E523D", fontSize: "13px" }}>
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
            <span>🔔</span>
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
              Dashboard
            </button>
          )}

          {setPage && (
            <button
              onClick={() => setPage("Menu")}
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
              Menu Page
            </button>
          )}
        </div>
      </header>

      {/* Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "28px" }}>
        <div style={{ background: "#FFFFFF", padding: "18px 24px", borderRadius: "16px", border: "1px solid #E8DFD5", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ width: "42px", height: "42px", background: "#FAF7F2", border: "1px solid #EFE6DC", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>☕</div>
          <div>
            <span style={{ fontSize: "11px", color: "#6E523D", textTransform: "uppercase", fontWeight: 700 }}>Products</span>
            <h3 style={{ margin: "2px 0 0 0", fontSize: "22px", fontWeight: 800, color: "#3B1A08", fontFamily: "'Playfair Display', serif" }}>{totalProductsCount}</h3>
          </div>
        </div>

        <div style={{ background: "#FFFFFF", padding: "18px 24px", borderRadius: "16px", border: "1px solid #E8DFD5", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ width: "42px", height: "42px", background: "#FFF9E6", border: "1px solid #FDF3CD", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>⭐</div>
          <div>
            <span style={{ fontSize: "11px", color: "#6E523D", textTransform: "uppercase", fontWeight: 700 }}>Featured</span>
            <h3 style={{ margin: "2px 0 0 0", fontSize: "22px", fontWeight: 800, color: "#D4AC0D", fontFamily: "'Playfair Display', serif" }}>{featuredCount}</h3>
          </div>
        </div>

        <div style={{ background: "#FFFFFF", padding: "18px 24px", borderRadius: "16px", border: "1px solid #E8DFD5", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ width: "42px", height: "42px", background: "#E8F5E9", border: "1px solid #D1EED3", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>✅</div>
          <div>
            <span style={{ fontSize: "11px", color: "#6E523D", textTransform: "uppercase", fontWeight: 700 }}>In Stock</span>
            <h3 style={{ margin: "2px 0 0 0", fontSize: "22px", fontWeight: 800, color: "#2E7D32", fontFamily: "'Playfair Display', serif" }}>{inStockCount}</h3>
          </div>
        </div>

        <div style={{ background: "#FFFFFF", padding: "18px 24px", borderRadius: "16px", border: "1px solid #E8DFD5", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ width: "42px", height: "42px", background: "#FFEBEE", border: "1px solid #FADBD8", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>🚫</div>
          <div>
            <span style={{ fontSize: "11px", color: "#6E523D", textTransform: "uppercase", fontWeight: 700 }}>Out of Stock</span>
            <h3 style={{ margin: "2px 0 0 0", fontSize: "22px", fontWeight: 800, color: "#C62828", fontFamily: "'Playfair Display', serif" }}>{outOfStockCount}</h3>
          </div>
        </div>

        <div style={{ background: "#FFFFFF", padding: "18px 24px", borderRadius: "16px", border: "1px solid #E8DFD5", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ width: "42px", height: "42px", background: "#F5EEF8", border: "1px solid #E8DAEF", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>📦</div>
          <div>
            <span style={{ fontSize: "11px", color: "#6E523D", textTransform: "uppercase", fontWeight: 700 }}>Archived</span>
            <h3 style={{ margin: "2px 0 0 0", fontSize: "22px", fontWeight: 800, color: "#8E44AD", fontFamily: "'Playfair Display', serif" }}>{archivedCount}</h3>
          </div>
        </div>
      </div>

      {/* Action Trigger */}
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

      {/* Search & Sort Bar */}
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
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ color: "#6E523D", fontSize: "12px", textTransform: "uppercase", fontWeight: 700 }}>Sort:</span>
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

      {/* Category Pills */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px" }}>
        {["All", "Coffee", "Non-Coffee", "Food", "Archived"].map((cat) => (
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
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Bulk Actions Toolbar */}
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
                    >
                      {action.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleBulkActionTrigger}
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
              }}
            >
              Apply
            </button>

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

      {/* Add Product Drawer */}
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
            <div>
              <h2 style={{ margin: 0, color: "#3B1A08", fontSize: "24px", fontFamily: "'Playfair Display', serif" }}>
                Craft New Menu Product
              </h2>
              <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#6E523D" }}>Fill details manually or quick-fill standard coffee options.</p>
            </div>
            
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => {
                  setNewItem(prev => ({
                    ...prev,
                    ...DEFAULT_COFFEE_PRESETS
                  }));
                  triggerToast("Applied default coffee options!");
                }}
                style={{
                  background: "#FAF7F2",
                  color: "#3B1A08",
                  border: "1px solid #D8C8B8",
                  padding: "8px 14px",
                  borderRadius: "10px",
                  fontWeight: 600,
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                ⚡ Apply Default Presets
              </button>
              <button onClick={() => setShowAdd(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#6E523D" }}>✕</button>
            </div>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "20px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#6E523D", marginBottom: "8px", textTransform: "uppercase" }}>Product Name</label>
              <input
                placeholder="e.g. Vanilla Velvet Latte"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #E2D5C9", fontSize: "14px", outline: "none", background: "#FAF7F2", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#6E523D", marginBottom: "8px", textTransform: "uppercase" }}>Category</label>
              <select
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
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
                placeholder="160"
                type="number"
                value={newItem.price}
                onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #E2D5C9", fontSize: "14px", outline: "none", background: "#FAF7F2", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#6E523D", marginBottom: "8px", textTransform: "uppercase" }}>Emoji</label>
              <input
                placeholder="☕"
                value={newItem.emoji}
                onChange={(e) => setNewItem({ ...newItem, emoji: e.target.value })}
                style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #E2D5C9", fontSize: "14px", outline: "none", background: "#FAF7F2", boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#6E523D", marginBottom: "8px", textTransform: "uppercase" }}>Description</label>
            <textarea
              placeholder="Rich, velvety espresso blended with steamed microfoam and gourmet vanilla essence..."
              value={newItem.desc}
              onChange={(e) => setNewItem({ ...newItem, desc: e.target.value })}
              style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #E2D5C9", fontSize: "14px", outline: "none", minHeight: "90px", resize: "vertical", background: "#FAF7F2", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#6E523D", marginBottom: "8px", textTransform: "uppercase" }}>Cloudinary Image URL</label>
            <input
              placeholder="https://res.cloudinary.com/..."
              value={newItem.img}
              onChange={(e) => setNewItem({ ...newItem, img: e.target.value })}
              style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #E2D5C9", fontSize: "14px", outline: "none", background: "#FAF7F2", boxSizing: "border-box" }}
            />
          </div>

          {/* Configuration Section with Detailed Dynamic Fields */}
          <div style={{ background: "#FAF7F2", padding: "24px", borderRadius: "16px", border: "1px solid #E8DFD5", marginBottom: "20px" }}>
            <h4 style={{ margin: "0 0 16px 0", color: "#3B1A08", fontSize: "16px", fontFamily: "'Playfair Display', serif" }}>
              ☕ Coffee Customization & Options Setup
            </h4>

            {/* General Settings */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#6E523D", marginBottom: "6px", textTransform: "uppercase" }}>Prep Time</label>
                <select
                  value={newItem.prepTime}
                  onChange={(e) => setNewItem({ ...newItem, prepTime: e.target.value })}
                  style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #E2D5C9", fontSize: "13px", outline: "none", background: "#FFF", boxSizing: "border-box", fontWeight: 600, color: "#3B1A08" }}
                >
                  <option value="8-10 mins">8-10 mins</option>
                  <option value="12-15 mins">12-15 mins</option>
                  <option value="15-20 mins">15-20 mins</option>
                  <option value="30-40 mins">30-40 mins</option>
                  <option value="Ready to serve">Ready to serve</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#6E523D", marginBottom: "6px", textTransform: "uppercase" }}>Served As</label>
                <select
                  value={newItem.servedAs}
                  onChange={(e) => setNewItem({ ...newItem, servedAs: e.target.value })}
                  style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #E2D5C9", fontSize: "13px", outline: "none", background: "#FFF", boxSizing: "border-box", fontWeight: 600, color: "#3B1A08" }}
                >
                  <option value="Hot">Hot</option>
                  <option value="Iced">Iced</option>
                  <option value="Hot / Iced">Hot / Iced</option>
                  <option value="Ambient">Ambient</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#6E523D", marginBottom: "6px", textTransform: "uppercase" }}>Diet Type</label>
                <select
                  value={newItem.dietType}
                  onChange={(e) => setNewItem({ ...newItem, dietType: e.target.value })}
                  style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #E2D5C9", fontSize: "13px", outline: "none", background: "#FFF", boxSizing: "border-box", fontWeight: 600, color: "#3B1A08" }}
                >
                  <option value="Vegetarian">Vegetarian</option>
                  <option value="Vegan">Vegan</option>
                  <option value="Dairy-Free">Dairy-Free</option>
                  <option value="Gluten-Free">Gluten-Free</option>
                </select>
              </div>
            </div>

            {/* 1. SIZES BUILDER */}
            <div style={{ marginBottom: "20px", background: "#FFFFFF", padding: "16px", borderRadius: "12px", border: "1px solid #E2D5C9" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#3B1A08", textTransform: "uppercase" }}>Select Size +</label>
                <button
                  type="button"
                  onClick={() => {
                    setNewItem({
                      ...newItem,
                      sizes: [...newItem.sizes, { name: "", desc: "", price: 0 }]
                    });
                  }}
                  style={{ background: "#3B1A08", color: "#FFF", border: "none", padding: "6px 14px", borderRadius: "8px", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}
                >
                  + Add Size
                </button>
              </div>
              {newItem.sizes.map((sz, idx) => (
                <div key={idx} style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
                  <input
                    placeholder="Size name (e.g. Small)"
                    value={sz.name || ""}
                    onChange={(e) => {
                      const updated = [...newItem.sizes];
                      updated[idx].name = e.target.value;
                      setNewItem({ ...newItem, sizes: updated });
                    }}
                    style={{ flex: 1.5, padding: "10px", borderRadius: "8px", border: "1px solid #D8C8B8", fontSize: "13px", outline: "none", background: "#FAF7F2" }}
                  />
                  <input
                    placeholder="Volume (e.g. 180 ml)"
                    value={sz.desc || ""}
                    onChange={(e) => {
                      const updated = [...newItem.sizes];
                      updated[idx].desc = e.target.value;
                      setNewItem({ ...newItem, sizes: updated });
                    }}
                    style={{ flex: 1.5, padding: "10px", borderRadius: "8px", border: "1px solid #D8C8B8", fontSize: "13px", outline: "none", background: "#FAF7F2" }}
                  />
                  <input
                    type="number"
                    placeholder="Price (₹)"
                    value={sz.price?? 0}
                    onChange={(e) => {
                      const updated = [...newItem.sizes];
                      updated[idx].price = Number(e.target.value);
                      setNewItem({ ...newItem, sizes: updated });
                    }}
                    style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #D8C8B8", fontSize: "13px", outline: "none", background: "#FAF7F2" }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const updated = newItem.sizes.filter((_, i) => i !== idx);
                      setNewItem({ ...newItem, sizes: updated });
                    }}
                    style={{ background: "#FFEBEE", color: "#C62828", border: "1px solid #FADBD8", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}
                    title="Delete Size"
                  >
                    🗑️ Delete
                  </button>
                </div>
              ))}
            </div>

            {/* 2. MILK OPTIONS BUILDER */}
            <div style={{ marginBottom: "20px", background: "#FFFFFF", padding: "16px", borderRadius: "12px", border: "1px solid #E2D5C9" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#3B1A08", textTransform: "uppercase" }}>Milk Option +</label>
                <button
                  type="button"
                  onClick={() => {
                    setNewItem({
                      ...newItem,
                      milkOptions: [...newItem.milkOptions, { name: "", price: 0 , icon: ""}]
                    });
                  }}
                  style={{ background: "#3B1A08", color: "#FFF", border: "none", padding: "6px 14px", borderRadius: "8px", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}
                >
                  + Add Milk
                </button>
              </div>
              {newItem.milkOptions.map((milk, idx) => {
                const milkName = typeof milk === "string" ? milk : milk.name || "";
                const milkPrice = typeof milk === "string" ? 0 : milk.price ?? 0;
                return (
                  <div key={idx} style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
                   <div
  style={{
    width: 45,
    height: 45,
    borderRadius: 10,
    border: "1px solid #D8C8B8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#FAF7F2",
  }}
>
  {milk.icon ? (
    milk.icon.startsWith("http") || milk.icon.startsWith("/") ? (
      <img
        src={milk.icon}
        alt=""
        style={{
          width: 28,
          height: 28,
          objectFit: "contain",
        }}
      />
    ) : (
      <span style={{ fontSize: 24 }}>
        {milk.icon}
      </span>
    )
  ) : (
    "🥛"
  )}
</div>          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>

  <input
    type="file"
    accept=".png,.svg,.jpg,.jpeg,.webp"
    onChange={async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const url = await uploadMilkIcon(file);

      const updated = [...newItem.milkOptions];

      updated[idx] = {
        ...updated[idx],
        icon: url,
      };

      setNewItem({
        ...newItem,
        milkOptions: updated,
      });
    }}
  />

</div>
                    <span
    style={{
      fontSize: "12px",
      fontWeight: 700,
      color: "#8B6A4A",
      userSelect: "none",
    }}
  >
    OR
  </span>
   
<input
  type="text"
  placeholder="🥛"
  value={
    typeof milk === "string"
      ? ""
      : (milk.icon?.startsWith("http") || milk.icon?.startsWith("/")
          ? ""
          : milk.icon || "")
  }
  onChange={(e) => {
    const updated = [...newItem.milkOptions];

    updated[idx] = {
      ...updated[idx],
      icon: e.target.value,
    };

    setNewItem({
      ...newItem,
      milkOptions: updated,
    });
  }}
  style={{
    width: "60px",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #D8C8B8",
    textAlign: "center",
    fontSize: "22px",
    background: "#FAF7F2",
  }}
/>

                    
                    
                    <input
                      placeholder="Milk type (e.g. Oat Milk)"
                      value={milkName}
                      onChange={(e) => {
                        const updated = [...newItem.milkOptions];
                        if (typeof updated[idx] === "string") {
                          updated[idx] = { name: e.target.value, price: 0 };
                        } else {
                          updated[idx] = { ...updated[idx], name: e.target.value };
                        }
                        setNewItem({ ...newItem, milkOptions: updated });
                      }}
                      style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "1px solid #D8C8B8", fontSize: "13px", outline: "none", background: "#FAF7F2" }}
                    />
                    <input
                      type="number"
                      placeholder="Price (₹)"
                      value={milkPrice}
                      onChange={(e) => {
                        const updated = [...newItem.milkOptions];
                        const val = Number(e.target.value);
                        if (typeof updated[idx] === "string") {
                          updated[idx] = { name: updated[idx], price: val };
                        } else {
                          updated[idx] = { ...updated[idx], price: val };
                        }
                        setNewItem({ ...newItem, milkOptions: updated });
                      }}
                      style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #D8C8B8", fontSize: "13px", outline: "none", background: "#FAF7F2" }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = newItem.milkOptions.filter((_, i) => i !== idx);
                        setNewItem({ ...newItem, milkOptions: updated });
                      }}
                      style={{ background: "#FFEBEE", color: "#C62828", border: "1px solid #FADBD8", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}
                      title="Delete Milk Option"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                );
              })}    
            </div>
            


{/* TEMPERATURE OPTIONS BUILDER */}

    <div style={{ marginBottom: "20px", background: "#FFFFFF", padding: "16px", borderRadius: "12px", border: "1px solid #E2D5C9" }}>
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
    <label style={{ fontSize: "12px", fontWeight: 700, color: "#3B1A08", textTransform: "uppercase" }}>
      Temperature Options +
    </label>

    <button
      type="button"
      onClick={() => {
        setNewItem({
          ...newItem,
          temperatureOptions: [
            ...newItem.temperatureOptions,
            {
              icon: "☕",
              name: "",
              description: "",
            },
          ],
        });
      }}
      style={{
        background: "#3B1A08",
        color: "#FFF",
        border: "none",
        padding: "6px 14px",
        borderRadius: "8px",
        fontWeight: 600,
        fontSize: "12px",
        cursor: "pointer",
      }}
    >
      + Add Temperature
    </button>
  </div>

  {newItem.temperatureOptions.map((temp, idx) => {
    const tempIcon =
      typeof temp === "string" ? "☕" : temp.icon || "☕";

    const tempName =
      typeof temp === "string" ? temp : temp.name || "";

    const tempDescription =
      typeof temp === "string"
        ? ""
        : temp.description || "";

    return (
      <div
        key={idx}
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <input
          placeholder="Emoji"
          value={tempIcon}
          onChange={(e) => {
            const updated = [...newItem.temperatureOptions];

            if (typeof updated[idx] === "string") {
              updated[idx] = {
                icon: e.target.value,
                name: updated[idx],
                description: "",
              };
            } else {
              updated[idx] = {
                ...updated[idx],
                icon: e.target.value,
              };
            }

            setNewItem({
              ...newItem,
              temperatureOptions: updated,
            });
          }}
          style={{
            width: "70px",
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #D8C8B8",
            fontSize: "13px",
            outline: "none",
            background: "#FAF7F2",
          }}
        />

        <input
          placeholder="Temperature (e.g. Hot)"
          value={tempName}
          onChange={(e) => {
            const updated = [...newItem.temperatureOptions];

            if (typeof updated[idx] === "string") {
              updated[idx] = {
                icon: "☕",
                name: e.target.value,
                description: "",
              };
            } else {
              updated[idx] = {
                ...updated[idx],
                name: e.target.value,
              };
            }

            setNewItem({
              ...newItem,
              temperatureOptions: updated,
            });
          }}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #D8C8B8",
            fontSize: "13px",
            outline: "none",
            background: "#FAF7F2",
          }}
        />

        <input
          placeholder="Description"
          value={tempDescription}
          onChange={(e) => {
            const updated = [...newItem.temperatureOptions];

            updated[idx] = {
              ...updated[idx],
              description: e.target.value,
            };

            setNewItem({
              ...newItem,
              temperatureOptions: updated,
            });
          }}
          style={{
            flex: 2,
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #D8C8B8",
            fontSize: "13px",
            outline: "none",
            background: "#FAF7F2",
          }}
        />

        <button
          type="button"
          onClick={() => {
            const updated = newItem.temperatureOptions.filter(
              (_, i) => i !== idx
            );

            setNewItem({
              ...newItem,
              temperatureOptions: updated,
            });
          }}
          style={{
            background: "#FFEBEE",
            color: "#C62828",
            border: "1px solid #FADBD8",
            padding: "8px 12px",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "13px",
          }}
          title="Delete Temperature"
        >
          🗑️ Delete
        </button>
      </div>
    );
  })}
</div>






            

            {/* 3. SWEETNESS OPTIONS BUILDER */}
            <div style={{ marginBottom: "20px", background: "#FFFFFF", padding: "16px", borderRadius: "12px", border: "1px solid #E2D5C9" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#3B1A08", textTransform: "uppercase" }}>Sweetness Option +</label>
                <button
                  type="button"
                  onClick={() => {
                    setNewItem({
                      ...newItem,
                      sweetnessOptions: [
  ...newItem.sweetnessOptions,
  {
    name: "",
    description: "",
    icon: "🍬",
  },
]
                    });
                  }}
                  style={{ background: "#3B1A08", color: "#FFF", border: "none", padding: "6px 14px", borderRadius: "8px", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}
                >
                  + Add Sweetness
                </button>
              </div>
              {newItem.sweetnessOptions.map((sweet, idx) => {
  const sweetName =
    typeof sweet === "string" ? sweet : sweet.name || "";

  const sweetDescription =
    typeof sweet === "string"
      ? ""
      : sweet.description || "";

  const sweetIcon =
    typeof sweet === "string"
      ? "🍬"
      : sweet.icon || "🍬";

  return (
                <div key={idx} style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}>

 <input
    placeholder="Emoji"
    value={sweetIcon}
    onChange={(e) => {
      const updated = [...newItem.sweetnessOptions];

      if (typeof updated[idx] === "string") {
        updated[idx] = {
          name: updated[idx],
          description: "",
          icon: e.target.value,
        };
      } else {
        updated[idx] = {
          ...updated[idx],
          icon: e.target.value,
        };
      }

      setNewItem({
        ...newItem,
        sweetnessOptions: updated,
      });
    }}
    style={{
      width: "60px",
      padding: "10px",
      borderRadius: "8px",
      border: "1px solid #D8C8B8",
    }}
  />

  <input
    placeholder="Name"
    value={sweetName}
    onChange={(e) => {
      const updated = [...newItem.sweetnessOptions];

      if (typeof updated[idx] === "string") {
        updated[idx] = {
          name: e.target.value,
          description: "",
          icon: "🍬",
        };
      } else {
        updated[idx] = {
          ...updated[idx],
          name: e.target.value,
        };
      }

      setNewItem({
        ...newItem,
        sweetnessOptions: updated,
      });
    }}
    style={{
      flex: 1,
      padding: "10px",
      borderRadius: "8px",
      border: "1px solid #D8C8B8",
    }}
  />

  <input
    placeholder="Description"
    value={sweetDescription}
    onChange={(e) => {
      const updated = [...newItem.sweetnessOptions];

      updated[idx] = {
        ...updated[idx],
        description: e.target.value,
      };

      setNewItem({
        ...newItem,
        sweetnessOptions: updated,
      });
    }}
    style={{
      flex: 2,
      padding: "10px",
      borderRadius: "8px",
      border: "1px solid #D8C8B8",
    }}
  />



                  
                  <button
                    type="button"
                    onClick={() => {
                      const updated = newItem.sweetnessOptions.filter((_, i) => i !== idx);
                      setNewItem({ ...newItem, sweetnessOptions: updated });
                    }}
                    style={{ background: "#FFEBEE", color: "#C62828", border: "1px solid #FADBD8", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}
                    title="Delete Sweetness Option"
                  >
                    🗑️ Delete
                  </button>
                </div>
               );
        })}
            </div>

            {/* 4. SPECIAL REQUESTS BUILDER */}
            <div style={{ marginBottom: "20px", background: "#FFFFFF", padding: "16px", borderRadius: "12px", border: "1px solid #E2D5C9" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#3B1A08", textTransform: "uppercase" }}>Special Requests Options +</label>
                <button
                  type="button"
                  onClick={() => {
                    setNewItem({
                      ...newItem,
                      specialRequests: [...newItem.specialRequests, ""]
                    });
                  }}
                  style={{ background: "#3B1A08", color: "#FFF", border: "none", padding: "6px 14px", borderRadius: "8px", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}
                >
                  + Add Special Request
                </button>
              </div>
              {newItem.specialRequests.map((req, idx) => (
                <div key={idx} style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
                  <input
                    placeholder="Special request (e.g. Less Ice, Extra Hot)"
                    value={req}
                    onChange={(e) => {
                      const updated = [...newItem.specialRequests];
                      updated[idx] = e.target.value;
                      setNewItem({ ...newItem, specialRequests: updated });
                    }}
                    style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #D8C8B8", fontSize: "13px", outline: "none", background: "#FAF7F2" }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const updated = newItem.specialRequests.filter((_, i) => i !== idx);
                      setNewItem({ ...newItem, specialRequests: updated });
                    }}
                    style={{ background: "#FFEBEE", color: "#C62828", border: "1px solid #FADBD8", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}
                    title="Delete Special Request"
                  >
                    🗑️ Delete
                  </button>
                </div>
              ))}
            </div>

            {/* 5. EXTRA CUSTOMS / TOPPINGS & MAX SELECTION BUILDER */}
            <div style={{ background: "#FFFFFF", padding: "16px", borderRadius: "12px", border: "1px solid #E2D5C9" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#3B1A08", textTransform: "uppercase" }}>Extra Customs / Toppings +</label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#6E523D", textTransform: "uppercase" }}>Max Selection:</span>
                  <input
                    type="number"
                    value={newItem.customExtrasMaxSelection}
                    onChange={(e) => setNewItem({ ...newItem, customExtrasMaxSelection: e.target.value })}
                    style={{ width: "60px", padding: "6px", borderRadius: "6px", border: "1px solid #D8C8B8", fontSize: "13px", textAlign: "center", outline: "none", background: "#FAF7F2", fontWeight: 600 }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setNewItem({
                        ...newItem,
                        customExtras: [...newItem.customExtras, { name: "", price: 25 }]
                      });
                    }}
                    style={{ background: "#3B1A08", color: "#FFF", border: "none", padding: "6px 14px", borderRadius: "8px", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}
                  >
                    + Add Extra
                  </button>
                </div>
              </div>
              {newItem.customExtras.map((ex, idx) => (
                <div key={idx} style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
                  <input
                    placeholder="Extra name (e.g. Vanilla Syrup)"
                    value={ex.name || ""}
                    onChange={(e) => {
                      const updated = [...newItem.customExtras];
                      updated[idx].name = e.target.value;
                      setNewItem({ ...newItem, customExtras: updated });
                    }}
                    style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "1px solid #D8C8B8", fontSize: "13px", outline: "none", background: "#FAF7F2" }}
                  />
                  <input
                    type="number"
                    placeholder="Price (₹)"
                    value={ex.price ?? 25}
                    onChange={(e) => {
                      const updated = [...newItem.customExtras];
                      updated[idx].price = Number(e.target.value);
                      setNewItem({ ...newItem, customExtras: updated });
                    }}
                    style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #D8C8B8", fontSize: "13px", outline: "none", background: "#FAF7F2" }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const updated = newItem.customExtras.filter((_, i) => i !== idx);
                      setNewItem({ ...newItem, customExtras: updated });
                    }}
                    style={{ background: "#FFEBEE", color: "#C62828", border: "1px solid #FADBD8", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}
                    title="Delete Extra"
                  >
                    🗑️ Delete
                  </button>
                </div>
              ))}
            </div>

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

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#6E523D", marginBottom: "8px", textTransform: "uppercase" }}>Cloudinary URL</label>
              <input
                value={editItem.img}
                onChange={(e) => setEditItem({ ...editItem, img: e.target.value })}
                style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #E2D5C9", fontSize: "14px", outline: "none", background: "#FAF7F2", boxSizing: "border-box" }}
              />
            </div>

            {/* Edit Modal Configuration Section */}
            <div style={{ background: "#FAF7F2", padding: "24px", borderRadius: "16px", border: "1px solid #E8DFD5", marginBottom: "20px" }}>
              <h4 style={{ margin: "0 0 16px 0", color: "#3B1A08", fontSize: "16px", fontFamily: "'Playfair Display', serif" }}>
                ☕ Coffee Customization & Options Setup
              </h4>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#6E523D", marginBottom: "6px", textTransform: "uppercase" }}>Prep Time</label>
                  <select
                    value={editItem.prepTime}
                    onChange={(e) => setEditItem({ ...editItem, prepTime: e.target.value })}
                    style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #E2D5C9", fontSize: "13px", outline: "none", background: "#FFF", boxSizing: "border-box", fontWeight: 600, color: "#3B1A08" }}
                  >
                    <option value="8-10 mins">8-10 mins</option>
                    <option value="12-15 mins">12-15 mins</option>
                    <option value="15-20 mins">15-20 mins</option>
                    <option value="30-40 mins">30-40 mins</option>
                    <option value="Ready to serve">Ready to serve</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#6E523D", marginBottom: "6px", textTransform: "uppercase" }}>Served As</label>
                  <select
                    value={editItem.servedAs}
                    onChange={(e) => setEditItem({ ...editItem, servedAs: e.target.value })}
                    style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #E2D5C9", fontSize: "13px", outline: "none", background: "#FFF", boxSizing: "border-box", fontWeight: 600, color: "#3B1A08" }}
                  >
                    <option value="Hot">Hot</option>
                    <option value="Iced">Iced</option>
                    <option value="Hot / Iced">Hot / Iced</option>
                    <option value="Ambient">Ambient</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#6E523D", marginBottom: "6px", textTransform: "uppercase" }}>Diet Type</label>
                  <select
                    value={editItem.dietType}
                    onChange={(e) => setEditItem({ ...editItem, dietType: e.target.value })}
                    style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #E2D5C9", fontSize: "13px", outline: "none", background: "#FFF", boxSizing: "border-box", fontWeight: 600, color: "#3B1A08" }}
                  >
                    <option value="Vegetarian">Vegetarian</option>
                    <option value="Vegan">Vegan</option>
                    <option value="Dairy-Free">Dairy-Free</option>
                    <option value="Gluten-Free">Gluten-Free</option>
                  </select>
                </div>
              </div>

              {/* Edit Size Builder */}
              <div style={{ marginBottom: "20px", background: "#FFFFFF", padding: "16px", borderRadius: "12px", border: "1px solid #E2D5C9" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#3B1A08", textTransform: "uppercase" }}>Select Size +</label>
                  <button
                    type="button"
                    onClick={() => {
                      setEditItem({
                        ...editItem,
                        sizes: [...editItem.sizes, { name: "", desc: "", price: 0 }]
                      });
                    }}
                    style={{ background: "#3B1A08", color: "#FFF", border: "none", padding: "6px 14px", borderRadius: "8px", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}
                  >
                    + Add Size
                  </button>
                </div>
                {editItem.sizes.map((sz, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
                    <input
                      placeholder="Size name"
                      value={sz.name || ""}
                      onChange={(e) => {
                        const updated = [...editItem.sizes];
                        updated[idx].name = e.target.value;
                        setEditItem({ ...editItem, sizes: updated });
                      }}
                      style={{ flex: 1.5, padding: "10px", borderRadius: "8px", border: "1px solid #D8C8B8", fontSize: "13px", outline: "none", background: "#FAF7F2" }}
                    />
                    <input
                      placeholder="Volume (e.g. 180 ml)"
                      value={sz.desc || ""}
                      onChange={(e) => {
                        const updated = [...editItem.sizes];
                        updated[idx].desc = e.target.value;
                        setEditItem({ ...editItem, sizes: updated });
                      }}
                      style={{ flex: 1.5, padding: "10px", borderRadius: "8px", border: "1px solid #D8C8B8", fontSize: "13px", outline: "none", background: "#FAF7F2" }}
                    />
                    <input
                      type="number"
                      placeholder="Price (₹)"
                      value={sz.price ?? 0}
                      onChange={(e) => {
                        const updated = [...editItem.sizes];
                        updated[idx].price = Number(e.target.value);
                        setEditItem({ ...editItem, sizes: updated });
                      }}
                      style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #D8C8B8", fontSize: "13px", outline: "none", background: "#FAF7F2" }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = editItem.sizes.filter((_, i) => i !== idx);
                        setEditItem({ ...editItem, sizes: updated });
                      }}
                      style={{ background: "#FFEBEE", color: "#C62828", border: "1px solid #FADBD8", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                ))}
              </div>

              {/* Edit Milk Builder */}
              <div style={{ marginBottom: "20px", background: "#FFFFFF", padding: "16px", borderRadius: "12px", border: "1px solid #E2D5C9" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#3B1A08", textTransform: "uppercase" }}>Milk Option +</label>
                  <button
                    type="button"
                    onClick={() => {
                      setEditItem({
                        ...editItem,
                        milkOptions: [...editItem.milkOptions, { name: "", price: 0 }]
                      });
                    }}
                    style={{ background: "#3B1A08", color: "#FFF", border: "none", padding: "6px 14px", borderRadius: "8px", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}
                  >
                    + Add Milk
                  </button>
                </div>
                {editItem.milkOptions.map((milk, idx) => {
                  const milkName = typeof milk === "string" ? milk : milk.name || "";
                  const milkPrice = typeof milk === "string" ? 0 : milk.price ?? 0;
                  return (
                    <div key={idx} style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
                      <input
                        placeholder="Milk type"
                        value={milkName}
                        onChange={(e) => {
                          const updated = [...editItem.milkOptions];
                          if (typeof updated[idx] === "string") {
                            updated[idx] = { name: e.target.value, price: 0 };
                          } else {
                            updated[idx] = { ...updated[idx], name: e.target.value };
                          }
                          setEditItem({ ...editItem, milkOptions: updated });
                        }}
                        style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "1px solid #D8C8B8", fontSize: "13px", outline: "none", background: "#FAF7F2" }}
                      />
                      <input
                        type="number"
                        placeholder="Price (₹)"
                        value={milkPrice}
                        onChange={(e) => {
                          const updated = [...editItem.milkOptions];
                          const val = Number(e.target.value);
                          if (typeof updated[idx] === "string") {
                            updated[idx] = { name: updated[idx], price: val };
                          } else {
                            updated[idx] = { ...updated[idx], price: val };
                          }
                          setEditItem({ ...editItem, milkOptions: updated });
                        }}
                        style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #D8C8B8", fontSize: "13px", outline: "none", background: "#FAF7F2" }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = editItem.milkOptions.filter((_, i) => i !== idx);
                          setEditItem({ ...editItem, milkOptions: updated });
                        }}
                        style={{ background: "#FFEBEE", color: "#C62828", border: "1px solid #FADBD8", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Edit Sweetness Builder */}
              <div style={{ marginBottom: "20px", background: "#FFFFFF", padding: "16px", borderRadius: "12px", border: "1px solid #E2D5C9" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#3B1A08", textTransform: "uppercase" }}>Sweetness Option +</label>
                  <button
                    type="button"
                    onClick={() => {
                      setEditItem({
                        ...editItem,
                        sweetnessOptions: [
  ...editItem.sweetnessOptions,
  {
    name: "",
    description: "",
    icon: "🍬",
  },
]
                      });
                    }}
                    style={{ background: "#3B1A08", color: "#FFF", border: "none", padding: "6px 14px", borderRadius: "8px", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}
                  >
                    + Add Sweetness
                  </button>
                </div>
                {editItem.sweetnessOptions.map((sweet, idx) => {
  const sweetName =
    typeof sweet === "string" ? sweet : sweet.name || "";

  const sweetDescription =
    typeof sweet === "string"
      ? ""
      : sweet.description || "";

  const sweetIcon =
    typeof sweet === "string"
      ? "🍬"
      : sweet.icon || "🍬";

  return (
                  <div key={idx} style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}>

                    <input
    placeholder="Emoji"
    value={sweetIcon}
    onChange={(e) => {
      const updated = [...editItem.sweetnessOptions];

      if (typeof updated[idx] === "string") {
        updated[idx] = {
          name: updated[idx],
          description: "",
          icon: e.target.value,
        };
      } else {
        updated[idx] = {
          ...updated[idx],
          icon: e.target.value,
        };
      }

      setEditItem({
        ...editItem,
        sweetnessOptions: updated,
      });
    }}
    style={{
      width: "60px",
      padding: "10px",
      borderRadius: "8px",
      border: "1px solid #D8C8B8",
    }}
  />

  <input
    placeholder="Name"
    value={sweetName}
    onChange={(e) => {
      const updated = [...editItem.sweetnessOptions];

      if (typeof updated[idx] === "string") {
        updated[idx] = {
          name: e.target.value,
          description: "",
          icon: "🍬",
        };
      } else {
        updated[idx] = {
          ...updated[idx],
          name: e.target.value,
        };
      }

      setEditItem({
        ...editItem,
        sweetnessOptions: updated,
      });
    }}
    style={{
      flex: 1,
      padding: "10px",
      borderRadius: "8px",
      border: "1px solid #D8C8B8",
    }}
  />

  <input
    placeholder="Description"
    value={sweetDescription}
    onChange={(e) => {
      const updated = [...editItem.sweetnessOptions];

      updated[idx] = {
        ...updated[idx],
        description: e.target.value,
      };

      setEditItem({
        ...editItem,
        sweetnessOptions: updated,
      });
    }}
    style={{
      flex: 2,
      padding: "10px",
      borderRadius: "8px",
      border: "1px solid #D8C8B8",
    }}
  />





                    
                    <button
                      type="button"
                      onClick={() => {
                        const updated = editItem.sweetnessOptions.filter((_, i) => i !== idx);
                        setEditItem({ ...editItem, sweetnessOptions: updated });
                      }}
                      style={{ background: "#FFEBEE", color: "#C62828", border: "1px solid #FADBD8", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                 );
          })}
              </div>

{/*  EDIT TEMPERATURE OPTIONS BUILDER */}

<div style={{ marginBottom: "20px", background: "#FFFFFF", padding: "16px", borderRadius: "12px", border: "1px solid #E2D5C9" }}>
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
    <label style={{ fontSize: "12px", fontWeight: 700, color: "#3B1A08", textTransform: "uppercase" }}>
      Temperature Options +
    </label>

    <button
      type="button"
      onClick={() => {
        setEditItem({
          ...editItem,
          temperatureOptions: [
            ...(editItem.temperatureOptions || []),
            {
              icon: "☕",
              name: "",
              description: "",
            },
          ],
        });
      }}
      style={{
        background: "#3B1A08",
        color: "#FFF",
        border: "none",
        padding: "6px 14px",
        borderRadius: "8px",
        fontWeight: 600,
        fontSize: "12px",
        cursor: "pointer",
      }}
    >
      + Add Temperature
    </button>
  </div>

  {(editItem.temperatureOptions || []).map((temp, idx) => {
    const tempIcon =
      typeof temp === "string" ? "☕" : temp.icon || "☕";

    const tempName =
      typeof temp === "string" ? temp : temp.name || "";

    const tempDescription =
      typeof temp === "string"
        ? ""
        : temp.description || "";

    return (
      <div
        key={idx}
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <input
          placeholder="Emoji"
          value={tempIcon}
          onChange={(e) => {
            const updated = [...editItem.temperatureOptions];

            if (typeof updated[idx] === "string") {
              updated[idx] = {
                icon: e.target.value,
                name: updated[idx],
                description: "",
              };
            } else {
              updated[idx] = {
                ...updated[idx],
                icon: e.target.value,
              };
            }

            setEditItem({
              ...editItem,
              temperatureOptions: updated,
            });
          }}
          style={{
            width: "70px",
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #D8C8B8",
            fontSize: "13px",
            outline: "none",
            background: "#FAF7F2",
          }}
        />

        <input
          placeholder="Temperature (e.g. Hot)"
          value={tempName}
          onChange={(e) => {
            const updated = [...editItem.temperatureOptions];

            if (typeof updated[idx] === "string") {
              updated[idx] = {
                icon: "☕",
                name: e.target.value,
                description: "",
              };
            } else {
              updated[idx] = {
                ...updated[idx],
                name: e.target.value,
              };
            }

            setEditItem({
              ...editItem,
              temperatureOptions: updated,
            });
          }}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #D8C8B8",
            fontSize: "13px",
            outline: "none",
            background: "#FAF7F2",
          }}
        />

        <input
          placeholder="Description"
          value={tempDescription}
          onChange={(e) => {
            const updated = [...editItem.temperatureOptions];

            updated[idx] = {
              ...updated[idx],
              description: e.target.value,
            };

            setEditItem({
              ...editItem,
              temperatureOptions: updated,
            });
          }}
          style={{
            flex: 2,
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #D8C8B8",
            fontSize: "13px",
            outline: "none",
            background: "#FAF7F2",
          }}
        />

        <button
          type="button"
          onClick={() => {
            const updated = editItem.temperatureOptions.filter(
              (_, i) => i !== idx
            );

            setEditItem({
              ...editItem,
              temperatureOptions: updated,
            });
          }}
          style={{
            background: "#FFEBEE",
            color: "#C62828",
            border: "1px solid #FADBD8",
            padding: "8px 12px",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "13px",
          }}
        >
          🗑️ Delete
        </button>
      </div>
    );
  })}
</div>

      
        
          
            



              

              {/* Edit Special Requests Builder */}
              <div style={{ marginBottom: "20px", background: "#FFFFFF", padding: "16px", borderRadius: "12px", border: "1px solid #E2D5C9" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#3B1A08", textTransform: "uppercase" }}>Special Requests Options +</label>
                  <button
                    type="button"
                    onClick={() => {
                      setEditItem({
                        ...editItem,
                        specialRequests: [...editItem.specialRequests, ""]
                      });
                    }}
                    style={{ background: "#3B1A08", color: "#FFF", border: "none", padding: "6px 14px", borderRadius: "8px", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}
                  >
                    + Add Special Request
                  </button>
                </div>
                {editItem.specialRequests.map((req, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
                    <input
                      placeholder="Special request (e.g. Less Ice)"
                      value={req}
                      onChange={(e) => {
                        const updated = [...editItem.specialRequests];
                        updated[idx] = e.target.value;
                        setEditItem({ ...editItem, specialRequests: updated });
                      }}
                      style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #D8C8B8", fontSize: "13px", outline: "none", background: "#FAF7F2" }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = editItem.specialRequests.filter((_, i) => i !== idx);
                        setEditItem({ ...editItem, specialRequests: updated });
                      }}
                      style={{ background: "#FFEBEE", color: "#C62828", border: "1px solid #FADBD8", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                ))}
              </div>

              {/* Edit Extras & Max Selection Builder */}
              <div style={{ background: "#FFFFFF", padding: "16px", borderRadius: "12px", border: "1px solid #E2D5C9" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#3B1A08", textTransform: "uppercase" }}>Extra Customs / Toppings +</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#6E523D", textTransform: "uppercase" }}>Max Selection:</span>
                    <input
                      type="number"
                      value={editItem.customExtrasMaxSelection}
                      onChange={(e) => setEditItem({ ...editItem, customExtrasMaxSelection: e.target.value })}
                      style={{ width: "60px", padding: "6px", borderRadius: "6px", border: "1px solid #D8C8B8", fontSize: "13px", textAlign: "center", outline: "none", background: "#FAF7F2", fontWeight: 600 }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setEditItem({
                          ...editItem,
                          customExtras: [...editItem.customExtras, { name: "", price: 25 }]
                        });
                      }}
                      style={{ background: "#3B1A08", color: "#FFF", border: "none", padding: "6px 14px", borderRadius: "8px", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}
                    >
                      + Add Extra
                    </button>
                  </div>
                </div>
                {editItem.customExtras.map((ex, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
                    <input
                      placeholder="Extra name"
                      value={ex.name || ""}
                      onChange={(e) => {
                        const updated = [...editItem.customExtras];
                        updated[idx].name = e.target.value;
                        setEditItem({ ...editItem, customExtras: updated });
                      }}
                      style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "1px solid #D8C8B8", fontSize: "13px", outline: "none", background: "#FAF7F2" }}
                    />
                    <input
                      type="number"
                      placeholder="Price (₹)"
                      value={ex.price ?? 25}
                      onChange={(e) => {
                        const updated = [...editItem.customExtras];
                        updated[idx].price = Number(e.target.value);
                        setEditItem({ ...editItem, customExtras: updated });
                      }}
                      style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #D8C8B8", fontSize: "13px", outline: "none", background: "#FAF7F2" }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = editItem.customExtras.filter((_, i) => i !== idx);
                        setEditItem({ ...editItem, customExtras: updated });
                      }}
                      style={{ background: "#FFEBEE", color: "#C62828", border: "1px solid #FADBD8", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                ))}
              </div>

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
              }}
            >
              <div style={{ position: "absolute", top: "12px", left: "12px", zIndex: 10 }}>
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

                  {item.archived && (
                    <div style={{ position: "absolute", top: "12px", right: "12px", background: "rgba(142, 68, 173, 0.95)", color: "#FFFFFF", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "700" }}>
                      📦 Archived
                    </div>
                  )}

                  {!item.archived && item.isFeatured && (
                    <div style={{ position: "absolute", top: "12px", right: "12px", background: "rgba(212, 172, 13, 0.95)", color: "#FFFFFF", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "700" }}>
                      ⭐ Featured
                    </div>
                  )}
                </div>
                
                <div style={{ padding: "20px 24px 12px 24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div>
                      <span style={{ fontSize: "11px", fontWeight: 700, background: "#F2ECE4", color: "#6E523D", padding: "4px 10px", borderRadius: "6px", textTransform: "uppercase" }}>
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
                      archived: item.archived || false,
                      prepTime: item.prepTime || "8-10 mins",
                      servedAs: item.servedAs || "Hot",
                      dietType: item.dietType || "Vegetarian",
                      sizes: item.sizes || [],
                      milkOptions: item.milkOptions || [],
                      temperatureOptions: item.temperatureOptions || [],
                      customExtras: item.customExtras || [],
                      customExtrasMaxSelection: item.customExtrasMaxSelection || 3,
                      sweetnessOptions: item.sweetnessOptions || [],
                      specialRequests: item.specialRequests || [],
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
