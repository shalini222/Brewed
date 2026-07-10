import { createContext, useContext, useState, useEffect } from "react";
import { db } from "../firebase"; // Ensure this points to your firebase.js
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const CartContext = createContext();

export function CartProvider({ children }) {
  // 1. Initialize from localStorage (Lazy initializer)
  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem("brewedCart");
    return savedCart ? JSON.parse(savedCart) : [];
  });

  // 2. Sync to localStorage whenever 'cart' changes
  useEffect(() => {
    localStorage.setItem("brewedCart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = (item) => {
    setCart((prev) => {
      const incomingItem = {
        ...item,
        qty: item.qty || 1,
        size: item.size || "Medium",
        milk: item.milk || "Whole Milk",
        toppings: item.toppings || [],
        temperature: item.temperature || "Hot",
        iceLevel: item.iceLevel || "Regular",
        sweetness: item.sweetness !== undefined ? item.sweetness : 50,
        instructions: item.instructions || ""
      };

      const existing = prev.find(
        (i) =>
          i.id === incomingItem.id &&
          (i.size || "Medium") === incomingItem.size &&
          (i.milk || "Whole Milk") === incomingItem.milk &&
          JSON.stringify(i.toppings || []) === JSON.stringify(incomingItem.toppings) &&
          (i.temperature || "Hot") === incomingItem.temperature &&
          (i.iceLevel || "Regular") === incomingItem.iceLevel &&
          (i.sweetness ?? 50) === incomingItem.sweetness &&
          (i.instructions || "") === incomingItem.instructions
      );

      if (existing) {
        return prev.map((i) =>
          i === existing
            ? { ...i, qty: i.qty + incomingItem.qty }
            : i
        );
      }

      return [...prev, incomingItem];
    });
  };

  const removeFromCart = (itemToRemove) => {
    setCart((prev) => prev.filter((i) => i !== itemToRemove));
  };

  const updateQty = (itemToUpdate, qty) => {
    if (qty < 1) return removeFromCart(itemToUpdate);
    setCart((prev) =>
      prev.map((i) => (i === itemToUpdate ? { ...i, qty } : i))
    );
  };

  const clearCart = () => setCart([]);

  // 3. New: Place Order functionality
  const placeOrder = async (orderDetails) => {
  try {
    // We explicitly pull cart and total from context BEFORE the async write
    const orderData = {
      items: cart, // Using the current cart state
      total: total,
      customer: orderDetails.customer, // The form data from CheckoutPage
      paymentMethod: orderDetails.paymentMethod,
      status: "Pending",
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "orders"), orderData);
    
    // Clear cart AFTER the order is confirmed
    clearCart(); 
    
    return docRef.id;
  } catch (error) {
    console.error("Error placing order: ", error);
    throw error;
  }
};
        

  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const count = cart.reduce((sum, i) => sum + i.qty, 0);

  return (
    <CartContext.Provider value={{ 
      cart, 
      addToCart, 
      removeFromCart, 
      updateQty, 
      clearCart, 
      total, 
      count, 
      placeOrder 
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
