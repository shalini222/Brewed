import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";

export default function OrdersPage({ setPage, currentUser }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  // Use a simple query to fetch everything, ordered by date
  const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    console.log("Total docs in collection:", snapshot.size);

    const fetchedOrders = snapshot.docs.map((doc) => {
      const data = doc.data();
      // Log each order to see what's happening
      console.log("Mapping Order:", doc.id, "UserID:", data.userId, "Items:", data.items?.length);
      
      return {
        id: doc.id,
        ...data,
        date: data.createdAt?.toDate().toLocaleDateString('en-GB') || "Date N/A"
      };
    });

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
        .back-button { background: none; border: none; color: #5C4A3D; font-weight: 600; cursor: pointer; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; transition: 0.2s; }
        .back-button:hover { color: #C4956A; transform: translateX(-4px); }
        .page-title { font-family: 'Playfair Display', serif; font-size: 2.5rem; color: #2D1B0E; margin-bottom: 30px; }
        
        .order-card { background: #FFFFFF; border-radius: 20px; padding: 24px; margin-bottom: 20px; border: 1px solid #F0ECE6; box-shadow: 0 4px 20px rgba(0,0,0,0.03); transition: all 0.3s ease; }
        .order-card:hover { border-color: #D4C4B7; box-shadow: 0 8px 30px rgba(0,0,0,0.06); }
        
        .order-main { display: flex; gap: 20px; }
        .order-image { width: 100px; height: 100px; border-radius: 16px; object-fit: cover; flex-shrink: 0; }
        .drink-name { font-family: 'Playfair Display', serif; font-size: 1.4rem; color: #2D1B0E; margin-bottom: 4px; }
        .meta-info { font-size: 0.85rem; color: #A89B93; margin-bottom: 12px; }
        
        .badge { padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        .status-preparing { background: #FFF7E6; color: #B88300; }
        .status-completed { background: #E6F8EC; color: #228B45; }
        .status-ready { background: #EAF2FF; color: #2E6AE6; }
        
        .order-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 16px; border-top: 1px solid #F7F4EF; }
        .total-price { font-size: 1.1rem; font-weight: 700; color: #2D1B0E; }
        .reorder-btn { background: #2D1B0E; color: #FDF9F5; border: none; padding: 10px 20px; border-radius: 12px; font-weight: 600; cursor: pointer; transition: 0.2s; }
        .reorder-btn:hover { background: #C4956A; }
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
                <div className="order-main">
                  <img src={order.items?.[0]?.image || "default-coffee.jpg"} className="order-image" alt="item" />
                  <div style={{ flex: 1 }}>
                    <div className="drink-name">{order.items?.[0]?.name || "Brewed Order"}</div>
                    <div className="meta-info">#{order.id.slice(-6).toUpperCase()} • {order.date}</div>
                    <span className={`badge status-${(order.status || "preparing").toLowerCase()}`}>
                      {order.status || "Preparing"}
                    </span>
                  </div>
                </div>
                <div className="order-bottom">
                  <div className="total-price">₹{order.total}</div>
                  <button className="reorder-btn">Reorder</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
