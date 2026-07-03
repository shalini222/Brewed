import React from "react";

export default function FavoritesPage({ setPage }) {

  const favorites = [
    {
      id: 1,
      name: "Caramel Latte",
      price: "₹320",
      image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80",
      description: "Espresso with steamed milk and caramel."
    },

    {
      id: 2,
      name: "Cappuccino",
      price: "₹280",
      image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80",
      description: "Rich espresso finished with velvety foam."
    },

    {
      id: 3,
      name: "Blueberry Muffin",
      price: "₹190",
      image: "https://images.unsplash.com/photo-1607958996333-41aef7caefaa?auto=format&fit=crop&w=600&q=80",
      description: "Freshly baked muffin with juicy blueberries."
    }
  ];

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap');

*{
  box-sizing:border-box;
}

body{
  margin:0;
  background:#FDFAF5;
  font-family:'Inter',sans-serif;
}

.favorites-page{
  min-height:100vh;
  background:#FDFAF5;
  padding:110px 20px 60px;
  display:flex;
  justify-content:center;
}

.favorites-container{
  width:100%;
  max-width:1100px;
}

.back-button{
  background:none;
  border:none;
  color:#3B1A08;
  font-size:16px;
  font-weight:600;
  cursor:pointer;
  margin-bottom:30px;
  transition:.3s;
}

.back-button:hover{
  color:#C4956A;
  transform:translateX(-4px);
}

.page-title{
  font-family:'Playfair Display',serif;
  color:#3B1A08;
  font-size:2.8rem;
  margin-bottom:10px;
}

.page-subtitle{
  color:#7A675C;
  margin-bottom:40px;
}

.favorites-grid{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(300px,1fr));
  gap:28px;
}

.favorite-card{
  background:white;
  border-radius:24px;
  overflow:hidden;
  box-shadow:0 15px 40px rgba(0,0,0,.08);
  transition:.35s;
}

.favorite-card:hover{
  transform:translateY(-8px);
}

.favorite-image{
  width:100%;
  height:230px;
  object-fit:cover;
}

.favorite-content{
  padding:24px;
}

.favorite-name{
  font-family:'Playfair Display',serif;
  font-size:1.7rem;
  color:#3B1A08;
  margin-bottom:8px;
}

.favorite-description{
  color:#7A675C;
  line-height:1.6;
  margin-bottom:22px;
}

.favorite-footer{
  display:flex;
  justify-content:space-between;
  align-items:center;
}

.favorite-price{
  font-size:1.3rem;
  font-weight:700;
  color:#3B1A08;
}

.favorite-btn{
  background:#3B1A08;
  color:white;
  border:none;
  border-radius:12px;
  padding:12px 18px;
  cursor:pointer;
  font-weight:600;
  transition:.3s;
}

.favorite-btn:hover{
  background:#C4956A;
  color:#3B1A08;
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
  color:#3B1A08;
  font-size:2rem;
  margin-bottom:12px;
}

.empty-text{
  color:#7A675C;
}

@media(max-width:768px){

.favorites-page{
padding:90px 18px 50px;
}

.page-title{
font-size:2.2rem;
}

.favorite-image{
height:200px;
}

.favorite-btn{
width:100%;
margin-top:15px;
}

.favorite-footer{
flex-direction:column;
align-items:flex-start;
}

}`}</style>
      <div className="favorites-page">

  <div className="favorites-container">

    <button
      className="back-button"
      onClick={() => setPage("menu")}
    >
      ← Back
    </button>

    <h1 className="page-title">
      My Favorites ❤️
    </h1>

    <p className="page-subtitle">
      Your most-loved Brewed drinks and treats, all in one place.
    </p>

    {favorites.length === 0 ? (

      <div className="empty-state">

        <div className="empty-title">
          No favorites yet
        </div>

        <div className="empty-text">
          Tap the ❤️ icon on any menu item to save it here.
        </div>

      </div>

    ) : (

      <div className="favorites-grid">

        {favorites.map((item)=>(

          <div
            className="favorite-card"
            key={item.id}
          >

            <img
              src={item.image}
              alt={item.name}
              className="favorite-image"
            />

            <div className="favorite-content">

              <div className="favorite-name">
                {item.name}
              </div>

              <div className="favorite-description">
                {item.description}
              </div>

              <div className="favorite-footer">

                <div className="favorite-price">
                  {item.price}
                </div>

                <button
                  className="favorite-btn"
                  onClick={() =>
                    alert("Order feature coming soon ☕")
                  }
                >
                  Order Now
                </button>

              </div>

            </div>

          </div>

        ))}

      </div>

    )}

  </div>

</div>

</>
);
}
