import React, { useState, useEffect } from "react";
import { db } from "../firebase"; // Ensure your firebase import is correct
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";

export default function OrdersPage({ setPage, currentUser }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    // Query orders for this specific user
    const q = query(
      collection(db, "orders"),
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOrders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        // Format the date if it's a Firestore Timestamp
        date: doc.data().createdAt?.toDate().toLocaleDateString('en-GB', {
          day: 'numeric', month: 'long', year: 'numeric'
        }) || "Date unavailable"
      }));
      setOrders(fetchedOrders);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap');

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #FDFAF5;
          font-family: 'Inter', sans-serif;
        }

        .orders-page {
          min-height: 100vh;
          background: #FDFAF5;
          padding: 110px 20px 60px;
          display: flex;
          justify-content: center;
        }

        .orders-container {
          width: 100%;
          max-width: 850px;
        }

        .back-button {
          background: none;
          border: none;
          color: #3B1A08;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          margin-bottom: 30px;
          transition: .3s;
          padding: 0;
        }

        .back-button:hover {
          color: #C4956A;
          transform: translateX(-4px);
        }

        .page-title {
          font-family: 'Playfair Display', serif;
          font-size: 2.8rem;
          color: #3B1A08;
          margin-bottom: 10px;
        }

        .page-subtitle {
          color: #7A675C;
          margin-bottom: 40px;
        }

        .order-card {
          background: white;
          border-radius: 22px;
          padding: 28px;
          margin-bottom: 22px;
          box-shadow: 0 10px 35px rgba(0,0,0,.08);
          transition: .3s;
        }

        .order-card:hover {
          transform: translateY(-4px);
        }

        .order-main {
          display: flex;
          gap: 22px;
          align-items: center;
        }

        .order-image {
          width: 120px;
          height: 120px;
          border-radius: 18px;
          object-fit: cover;
          flex-shrink: 0;
        }

        .order-info {
          flex: 1;
        }

        .drink-name {
          font-family: 'Playfair Display', serif;
          font-size: 1.6rem;
          color: #3B1A08;
          margin-bottom: 6px;
        }

        .order-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
        }

        .order-id {
          font-weight: 700;
          color: #3B1A08;
          font-size: 1.1rem;
        }

        .order-date {
          color: #8B7B70;
          font-size: .95rem;
        }

        .order-items {
          color: #5F5148;
          margin-bottom: 18px;
        }

        .order-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 15px;
        }

        .order-total {
          font-size: 1.25rem;
          font-weight: 700;
          color: #3B1A08;
        }

        .badge {
          padding: 8px 16px;
          border-radius: 999px;
          font-size: .9rem;
          font-weight: 600;
          text-transform: capitalize;
        }

        .completed {
          background: #E6F8EC;
          color: #228B45;
        }

        .preparing {
          background: #FFF6DD;
          color: #B88300;
        }

        .ready {
          background: #EAF2FF;
          color: #2E6AE6;
        }

        .order-btn {
          background: #3B1A08;
          color: white;
          border: none;
          padding: 12px 22px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          transition: .3s;
        }

        .order-btn:hover {
          background: #C4956A;
          color: #3B1A08;
        }

        .empty {
          background: white;
          padding: 70px 30px;
          border-radius: 24px;
          text-align: center;
          box-shadow: 0 10px 35px rgba(0,0,0,.08);
        }

        .empty h2 {
          font-family: 'Playfair Display', serif;
          color: #3B1A08;
          margin-bottom: 10px;
        }

        .empty p {
          color: #7A675C;
        }

        @media(max-width:768px){
          .orders-page {
            padding: 90px 18px 50px;
          }

          .order-main {
            flex-direction: column;
            align-items: flex-start;
          }

          .order-image {
            width: 100%;
            height: 210px;
          }

          .page-title {
            font-size: 2.2rem;
          }

          .order-top {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .order-bottom {
            flex-direction: column;
            align-items: flex-start;
          }

          .order-btn {
            width: 100%;
          }
        }
      `}</style>

<div className="orders-page">
        <div className="orders-container">
          <button className="back-button" onClick={() => setPage("menu")}>
            ← Back
          </button>

          <h1 className="page-title">My Orders</h1>
          <p className="page-subtitle">Every cup tells a story. Here's your Brewed journey.</p>

          {loading ? (
            <div className="empty"><p>Loading your orders...</p></div>
          ) : orders.length === 0 ? (
            <div className="empty">
              <h2>No orders yet ☕</h2>
              <p>Looks like you haven't placed your first order.</p>
            </div>
          ) : (
            orders.map((order) => (
  <div className="order-card" key={order.id}>
    <div className="order-main">
      {/* 1. Safely grab the image from the first item in the array */}
      <img 
        src={order.items?.[0]?.image || "default-coffee.jpg"} 
        className="order-image" 
        alt={order.items?.[0]?.name || "Order"} 
      />

      <div className="order-info">
        {/* 2. Safely grab the name from the items array */}
        <div className="drink-name">{order.items?.[0]?.name || "Brewed Order"}</div>

        <div className="order-top">
          <div>
            <div className="order-id">#{order.id.slice(-6).toUpperCase()}</div>
            <div className="order-date">{order.date}</div>
          </div>
          <span className={"badge " + (order.status || "preparing").toLowerCase()}>
            {order.status || "Preparing"}
          </span>
        </div>

        <div className="order-items">
          {/* 3. Map through all items in the order */}
          {order.items?.map((item, idx) => (
            <span key={idx}>
              {item.name} (x{item.qty}){idx < order.items.length - 1 ? ", " : ""}
            </span>
          ))}
        </div>

        <div className="order-bottom">
          <div className="order-total">₹{order.total}</div>
          <button 
            className="order-btn" 
            onClick={() => alert("Order Again feature coming soon ☕")}
          >
            Order Again
          </button>
        </div>
      </div>
    </div>
  </div>
                    
                    
        
            ))
          )}
        </div>
      </div>
    </>
  );
}
