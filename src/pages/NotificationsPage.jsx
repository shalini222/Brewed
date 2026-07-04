import React from "react";
import {
  Coffee,
  Gift,
  Star,
  Sparkles,
  ArrowLeft
} from "lucide-react";

export default function NotificationsPage({ setPage }) {

  const notifications = [
    {
      id: 1,
      icon: <Coffee size={28} />,
      title: "Order Ready",
      message: "Your Cappuccino is ready for pickup.",
      time: "2 min ago",
      unread: true,
    },

    {
      id: 2,
      icon: <Gift size={28} />,
      title: "Birthday Reward",
      message: "Claim your FREE handcrafted coffee.",
      time: "Today",
      unread: true,
    },

    {
      id: 3,
      icon: <Star size={28} />,
      title: "Almost Silver",
      message: "Only 20 Beans until Silver Member.",
      time: "Yesterday",
      unread: false,
    },

    {
      id: 4,
      icon: <Sparkles size={28} />,
      title: "Seasonal Collection",
      message: "Pumpkin Spice Latte has arrived.",
      time: "2 days ago",
      unread: false,
    }
  ];

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');

*{
  box-sizing:border-box;
}

body{
  margin:0;
  background:#FDFAF5;
  font-family:'Inter',sans-serif;
}

.notifications-page{
  min-height:100vh;
  background:#FDFAF5;
  padding:110px 20px 60px;
  display:flex;
  justify-content:center;
}

.notifications-container{
  width:100%;
  max-width:850px;
}

.back-button{
  display:flex;
  align-items:center;
  gap:8px;
  background:none;
  border:none;
  color:#3B1A08;
  font-size:16px;
  font-weight:600;
  cursor:pointer;
  margin-bottom:30px;
  padding:0;
  transition:.3s;
}

.back-button:hover{
  color:#C4956A;
  transform:translateX(-5px);
}

.page-title{
  font-family:'Playfair Display',serif;
  font-size:2.8rem;
  color:#3B1A08;
  margin-bottom:10px;
}

.page-subtitle{
  color:#7A675C;
  margin-bottom:40px;
  line-height:1.6;
}

.notification-card{
  display:flex;
  align-items:flex-start;
  gap:20px;
  background:white;
  border-radius:22px;
  padding:24px;
  margin-bottom:20px;
  box-shadow:0 15px 40px rgba(0,0,0,.08);
  transition:.3s;
}

.notification-card:hover{
  transform:translateY(-6px);
}

.notification-card.unread{
  background:#FFF8F1;
  border-left:6px solid #C4956A;
}

.notification-icon{
  width:60px;
  height:60px;
  border-radius:18px;
  background:#F6ECE1;
  color:#3B1A08;
  display:flex;
  align-items:center;
  justify-content:center;
  flex-shrink:0;
  transition:.3s;
}

.notification-card:hover .notification-icon{
  background:#C4956A;
  color:white;
}

.notification-content{
  flex:1;
}

.notification-title{
  font-size:1.2rem;
  font-weight:700;
  color:#3B1A08;
  margin-bottom:8px;
}

.notification-message{
  color:#6B5C53;
  line-height:1.7;
}

.notification-time{
  margin-top:14px;
  color:#A08D81;
  font-size:.9rem;
}

.new-badge{
  background:#C4956A;
  color:white;
  padding:6px 14px;
  border-radius:999px;
  font-size:.75rem;
  font-weight:700;
  align-self:flex-start;
}

.empty-state{
  background:white;
  border-radius:24px;
  padding:80px 30px;
  text-align:center;
  box-shadow:0 15px 40px rgba(0,0,0,.08);
}

.empty-title{
  font-family:'Playfair Display',serif;
  font-size:2rem;
  color:#3B1A08;
  margin-bottom:12px;
}

.empty-text{
  color:#7A675C;
}

@media(max-width:768px){

.notifications-page{
  padding:90px 18px 50px;
}

.page-title{
  font-size:2.2rem;
}

.notification-card{
  flex-direction:column;
}

.notification-icon{
  width:55px;
  height:55px;
}

.new-badge{
  margin-top:12px;
}

}
`}</style>

<div className="notifications-page">

  <div className="notifications-container">

    <button
      className="back-button"
      onClick={() => setPage("menu")}
    >
      <ArrowLeft size={20} />
      Back
    </button>

    <h1 className="page-title">
      Notifications
    </h1>

    <p className="page-subtitle">
      Stay updated with your orders, rewards and exclusive Brewed offers.
    </p>

    {notifications.length === 0 ? (

      <div className="empty-state">

        <div className="empty-title">
          You're all caught up ☕
        </div>

        <div className="empty-text">
          New notifications will appear here.
        </div>

      </div>

    ) : (

      notifications.map((item) => (

        <div
          key={item.id}
          className={`notification-card ${
            item.unread ? "unread" : ""
          }`}
        >

          <div className="notification-icon">
            {item.icon}
          </div>

          <div className="notification-content">

            <div className="notification-title">
              {item.title}
            </div>

            <div className="notification-message">
              {item.message}
            </div>

            <div className="notification-time">
              {item.time}
            </div>

          </div>

          {item.unread && (

            <div className="new-badge">
              NEW
            </div>

          )}

        </div>

      ))

    )}

  @media(max-width:768px){

.notifications-page{
  padding:90px 18px 50px;
}

.page-title{
  font-size:2.2rem;
}

.notification-card{
  flex-direction:column;
}

.notification-icon{
  width:55px;
  height:55px;
}

.new-badge{
  margin-top:12px;
}

}
`}</style>

<div className="notifications-page">

  <div className="notifications-container">

    <button
      className="back-button"
      onClick={() => setPage("menu")}
    >
      <ArrowLeft size={20} />
      Back
    </button>

    <h1 className="page-title">
      Notifications
    </h1>

    <p className="page-subtitle">
      Stay updated with your orders, rewards and exclusive Brewed offers.
    </p>

    {notifications.length === 0 ? (

      <div className="empty-state">

        <div className="empty-title">
          You're all caught up ☕
        </div>

        <div className="empty-text">
          New notifications will appear here.
        </div>

      </div>

    ) : (

      notifications.map((item) => (

        <div
          key={item.id}
          className={`notification-card ${
            item.unread ? "unread" : ""
          }`}
        >

          <div className="notification-icon">
            {item.icon}
          </div>

          <div className="notification-content">

            <div className="notification-title">
              {item.title}
            </div>

            <div className="notification-message">
              {item.message}
            </div>

            <div className="notification-time">
              {item.time}
            </div>

          </div>

          {item.unread && (

  <div className="new-badge">
    NEW
  </div>

)}

</div>

))

)}
    {notifications.length === 0 ? (

  <div className="empty-state">

    <div className="empty-title">
      You're all caught up ☕
    </div>

    <div className="empty-text">
      New notifications will appear here.
    </div>

  </div>

) : (

  notifications.map((item) => (

    <div
      key={item.id}
      className={`notification-card ${
        item.unread ? "unread" : ""
      }`}
    >

      <div className="notification-icon">
        {item.icon}
      </div>

      <div className="notification-content">

        <div className="notification-title">
          {item.title}
        </div>

        <div className="notification-message">
          {item.message}
        </div>

        <div className="notification-time">
          {item.time}
        </div>

      </div>

      {item.unread && (
        <div className="new-badge">
          NEW
        </div>
      )}

    </div>

  ))

)}

</div>

</div>

</>
  );
}
