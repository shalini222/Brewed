import { createContext, useContext, useState, useEffect } from "react";
import { db, auth } from "../firebase"; // 1. Added 'auth' import
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  updateDoc,
  increment,
} from "firebase/firestore";

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem("brewedCart");
    return savedCart ? JSON.parse(savedCart) : [];
  });

  useEffect(() => {
    localStorage.setItem("brewedCart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = (item) => {
    // 2. Added Auth Check for adding items
    if (!auth.currentUser) {
      alert("Please log in to start your order.");
      return; 
    }

    setCart((prev) => {
      const incomingItem = { ...item, qty: item.qty || 1, size: item.size || "Medium", milk: item.milk || "Whole Milk", toppings: item.toppings || [], temperature: item.temperature || "Hot", iceLevel: item.iceLevel || "Regular", sweetness: item.sweetness ?? 50, instructions: item.instructions || "" };

      const existing = prev.find((i) => i.id === incomingItem.id && (i.size || "Medium") === incomingItem.size && (i.milk || "Whole Milk") === incomingItem.milk && JSON.stringify(i.toppings || []) === JSON.stringify(incomingItem.toppings) && (i.temperature || "Hot") === incomingItem.temperature && (i.iceLevel || "Regular") === incomingItem.iceLevel && (i.sweetness ?? 50) === incomingItem.sweetness && (i.instructions || "") === incomingItem.instructions);

      if (existing) {
        return prev.map((i) => i === existing ? { ...i, qty: i.qty + incomingItem.qty } : i);
      }
      return [...prev, incomingItem];
    });
  };

  const removeFromCart = (itemToRemove) => setCart((prev) => prev.filter((i) => i !== itemToRemove));

  const updateQty = (itemToUpdate, qty) => {
    if (qty < 1) return removeFromCart(itemToUpdate);
    setCart((prev) => prev.map((i) => (i === itemToUpdate ? { ...i, qty } : i)));
  };
 
  const clearCart = () => setCart([]);

        const placeOrder = async (orderDetails) => {
  if (!auth.currentUser) {
    throw new Error("User must be logged in to place an order.");
  }

  try {

    const orderData = {
      ...orderDetails,

      userId: auth.currentUser.uid,

      status: orderDetails.status || "New",

      createdAt: serverTimestamp(),
    };


    const docRef = await addDoc(
      collection(db, "orders"),
      orderData
    );
    
    alert("Order saved successfully!");

    
    
  for (const item of orderDetails.items) {
    console.log(item);
 console.log("Item ID:", item.id);
await updateDoc(
   doc(db, "menu", item.firestoreId),
  {
   salesCount: increment(item.qty || item.quantity || 1),
   }
  );
  }
    clearCart();

    return docRef.id;

  } catch(error) {
    console.error(error);
    throw error;
  }
}; 
  
  const reorder = (itemsToReorder) => {
  if (!auth.currentUser) {
    alert("Please log in to reorder.");
    return;
  }

  itemsToReorder.forEach(item => {
    // By calling addToCart, you reuse your existing logic that 
    // checks for duplicates and updates quantities automatically.
    addToCart(item);
  });
  
  alert("Items added to your cart!");
};
  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const count = cart.reduce((sum, i) => sum + i.qty, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQty, clearCart, total, count, placeOrder, reorder }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
