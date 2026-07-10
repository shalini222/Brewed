import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

export default function OrdersPage({ setPage }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

    const handleReorder = (orderItems) => {
  // If you are using a Context, call it here:
  // addToCart(orderItems); 
  
  // Or, if you need to manually update state:
  alert("Reordering " + orderItems.length + " items!");
  console.log("Adding these to cart:", orderItems);
};
  

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOrders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().createdAt?.toDate().toLocaleDateString() || "N/A"
      }));
      
      setOrders(fetchedOrders);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <>
      <style>{`
        .orders-page { min-height: 100vh; background: #FDFAF5; padding: 100px 20px; display: flex; justify-content: center; }
        .orders-container { width: 100%; max-width: 700px; }
        .back-button { background: none; border: none; color: #5C4A3D; font-weight: 600; cursor: pointer; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; }
        .page-title { font-family: 'Playfair Display', serif; font-size: 2.5rem; color: #2D1B0E; margin-bottom: 30px; }
        .order-card { background: #FFFFFF; border-radius: 20px; padding: 24px; margin-bottom: 20px; border: 1px solid #F0ECE6; box-shadow: 0 4px 20px rgba(0,0,0,0.03); }
        .order-main { display: flex; align-items: center; gap: 20px; margin-bottom: 15px; }
        .order-image { width: 60px; height: 60px; border-radius: 12px; object-fit: cover; }
        .drink-name { font-family: 'Playfair Display', serif; font-size: 1.2rem; color: #2D1B0E; font-weight: bold; }
        .meta-info { font-size: 0.85rem; color: #A89B93; }
        .order-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 16px; border-top: 1px solid #F7F4EF; }
        .total-price { font-size: 1.1rem; font-weight: 700; color: #2D1B0E; }
        .reorder-btn { background: #2D1B0E; color: #FDF9F5; border: none; padding: 10px 20px; border-radius: 12px; font-weight: 600; cursor: pointer; }
        .badge { padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
        .status-preparing { background: #FFF7E6; color: #B88300; }
      `}</style>

      <div className="orders-page">
        <div className="orders-container">
          <button className="back-button" onClick={() => setPage("menu")}>← Return to Menu</button>
          <h1 className="page-title">Brewed Journey</h1>
          
          {loading ? (
            <p>Brewing your order history...</p> 
          ) : orders.length === 0 ? (
            <div className="empty"><h2>No orders yet ☕</h2></div>
          ) : (
            orders.map((order) => (
              <div className="order-card" key={order.id}>
                {/* Nested map to show ALL items in the order */}
                {order.items?.map((item, index) => (
                  <div className="order-main" key={index}>
                    <img src={item.image || "default-coffee.jpg"} className="order-image" alt="item" />
                    <div style={{ flex: 1 }}>
                      <div className="drink-name">{item.name}</div>
                      <div className="meta-info">Qty: {item.qty} • {item.size}</div>
                    </div>
                  </div>
                ))}
                
                <div className="order-bottom">
                  <div className="meta-info">#{order.id.slice(-6).toUpperCase()} • {order.date}</div>
                  <div className="total-price">₹{order.total}</div>
                  <span className={`badge status-${(order.status || "preparing").toLowerCase()}`}>
                    {order.status || "Preparing"}
                  </span>
                  <button 
  className="reorder-btn" 
  onClick={() => handleReorder(order.items)}
>
  Reorder
</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
