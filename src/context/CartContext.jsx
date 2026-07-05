import { createContext, useContext, useState } from "react";

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);

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

  // FIX: Identify items by looking at their unique reference object
  const removeFromCart = (itemToRemove) => {
    setCart((prev) => prev.filter((i) => i !== itemToRemove));
  };

  // FIX: Identify the exact customized item to update quantity
  const updateQty = (itemToUpdate, qty) => {
    if (qty < 1) return removeFromCart(itemToUpdate);
    setCart((prev) =>
      prev.map((i) => (i === itemToUpdate ? { ...i, qty } : i))
    );
  };

  const clearCart = () => setCart([]);

  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const count = cart.reduce((sum, i) => sum + i.qty, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQty, clearCart, total, count }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
