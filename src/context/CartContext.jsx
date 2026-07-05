import { createContext, useContext, useState } from "react";

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);

  const addToCart = (item) => {
  setCart((prev) => {
    const existing = prev.find(
      (i) =>
        i.id === item.id &&
        i.size === item.size &&
        i.milk === item.milk &&
        JSON.stringify(i.toppings) === JSON.stringify(item.toppings) &&
        i.temperature === item.temperature &&
        i.iceLevel === item.iceLevel &&
        i.sweetness === item.sweetness &&
        i.instructions === item.instructions
    );

    if (existing) {
      return prev.map((i) =>
        i === existing
          ? { ...i, qty: i.qty + item.qty }
          : i
      );
    }

    return [...prev, item];
  });
};

  const removeFromCart = (id) => setCart((prev) => prev.filter((i) => i.id !== id));

  const updateQty = (id, qty) => {
    if (qty < 1) return removeFromCart(id);
    setCart((prev) => prev.map((i) => i.id === id ? { ...i, qty } : i));
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
