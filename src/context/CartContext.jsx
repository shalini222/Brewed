import { createContext, useContext, useState, useEffect } from "react";
import { db, auth } from "../firebase";
import {
  addDoc,
  collection,
  doc,
  updateDoc,
  increment,
  serverTimestamp,
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
    if (!auth.currentUser) {
      alert("Please log in to start your order.");
      return; 
    }

    setCart((prev) => {
      const incomingItem = { 
        ...item, 
        qty: item.qty || 1, 
        size: item.size || "Medium", 
        milk: item.milk || "Whole Milk", 
        toppings: item.toppings || [], 
        extras: item.extras || [], 
        temperature: item.temperature || "Hot", 
        iceLevel: item.iceLevel || "Regular", 
        sweetness: item.sweetness ?? 50, 
        instructions: item.instructions || "" 
      };

      const existing = prev.find((i) => 
        i.id === incomingItem.id && 
        (i.size || "Medium") === incomingItem.size && 
        (i.milk || "Whole Milk") === incomingItem.milk && 
        JSON.stringify(i.toppings || []) === JSON.stringify(incomingItem.toppings) && 
        JSON.stringify(i.extras || []) === JSON.stringify(incomingItem.extras || []) && 
        (i.temperature || "Hot") === incomingItem.temperature && 
        (i.iceLevel || "Regular") === incomingItem.iceLevel && 
        (i.sweetness ?? 50) === incomingItem.sweetness && 
        (i.instructions || "") === incomingItem.instructions
      );

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

      // To make sure free item is redeemed only once
      if (orderDetails.selectedReward) {
        await updateDoc(
          doc(
            db,
            "users",
            auth.currentUser.uid,
            "redeemedRewards",
            orderDetails.selectedReward.id
          ),
          {
            status: "used",
            usedAt: serverTimestamp(),
            orderIdUsed: docRef.id,
          }
        );
      }

      // Update menu sales count
      for (const item of orderDetails.items) {
        if (item.isReward) continue;

        await updateDoc(
          doc(db, "menu", item.firestoreId),
          {
            salesCount: increment(item.qty || item.quantity || 1),
          }
        );
      }

      clearCart();
      return docRef.id;

    } catch (error) {
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
