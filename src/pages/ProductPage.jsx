import React, { useState } from "react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";


import {
  ArrowLeft,
  Heart,
  Star,
  Clock3,
  Leaf,
  Flame,
  CupSoda,
  Camera,
  ImagePlus
} from "lucide-react";

export default function ProductPage({
  setPage,
  product,
})  {
  const [favorite, setFavorite] = useState(false);
  const [size, setSize] = useState("Medium");
  const [milk, setMilk] = useState("Whole Milk");
  const [toppings, setToppings] = useState([]);
  const [temperature, setTemperature] = useState("Hot");
  const [iceLevel, setIceLevel] = useState("Regular");
  const [sweetness, setSweetness] = useState(50);
  const [instructions, setInstructions] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewImages, setReviewImages] = useState([]);
  const [quantity, setQuantity] = useState(1);

  const [reviews, setReviews] = useState([
    {
      id: 1,
      name: "Emily R.",
      rating: 5,
      text: "Smooth, creamy and perfectly balanced. Definitely one of my favourite coffees.",
      images: [
        "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=700"
      ]
    },
    {
      id: 2,
      name: "Daniel K.",
      rating: 5,
      text: "The oat milk option tastes amazing. Highly recommend adding caramel drizzle.",
      images: []
    }
  ]);
  
  const { addToCart } = useCart();
  const { currentUser } = useAuth(); 
  
  
  const basePrice = product.price;

  const sizePrices = {
    Small: -50,
    Medium: 0,
    Large: 50
  };

  const milkPrices = {
    "Whole Milk": 0,
    "Skim Milk": 0,
    "Soy Milk": 20,
    "Oat Milk": 30,
    "Almond Milk": 30,
    "Coconut Milk": 35
  };

  const toppingPrices = {
    "Whipped Cream": 20,
    "Chocolate Drizzle": 25,
    "Caramel Drizzle": 25,
    "Vanilla Syrup": 20
  };
  
  
  const toppingsTotal = toppings.reduce(
    (sum, topping) => sum + (toppingPrices[topping] || 0),
    0
  );

  const singlePrice =
    basePrice +
    sizePrices[size] +
    milkPrices[milk] +
    toppingsTotal;

  const totalPrice = singlePrice * quantity;

  const toggleTopping = (topping) => {
    if (toppings.includes(topping)) {
      setToppings(toppings.filter(item => item !== topping));
    } else {
      setToppings([...toppings, topping]);
    }
  };

  const handleReviewImages = (e) => {
    const files = Array.from(e.target.files);
    const imageURLs = files.map(file => URL.createObjectURL(file));
    setReviewImages(imageURLs);
  };

  const submitReview = () => {
    if (!reviewText.trim()) return;

    const newReview = {
      id: Date.now(),
      name: "You",
      rating: reviewRating,
      text: reviewText,
      images: reviewImages
    };

    setReviews([newReview, ...reviews]);
    setReviewText("");
    setReviewRating(5);
    setReviewImages([]);
  };

  const handleAddToCart = () => {
  // Check if user is logged in
  if (!currentUser) {
    // Redirect to login if they aren't signed in
    setPage("login");
    return; // Stop the function here
  }

  // If they are logged in, proceed as normal
  addToCart({
    ...product,
    price: singlePrice,
    qty: quantity,
    size,
    milk,
    toppings,
    temperature,
    iceLevel,
    sweetness,
    instructions,
  });

  setPage("cart");
};
  

  const quickRequests = ["Extra Hot", "Less Sweet", "No Ice", "Make it Vegan"];
  
  if (!product) {
  return (
    <div style={{ padding: 40 }}>
      <h2>No product selected.</h2>

      <button onClick={() => setPage("menu")}>
        Back to Menu
      </button>
    </div>
  );
  }

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

.product-page{
  min-height:100vh;
  background:#FDFAF5;
  padding:50px 24px 140px;
}

.product-container{
  max-width:1200px;
  margin:auto;
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
  margin-bottom:28px;
  transition:.3s;
}

.back-button:hover{
  color:#C4956A;
  transform:translateX(-5px);
}

.hero-section{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:50px;
  align-items:flex-start;
}

.product-image{
  position:relative;
  border-radius:30px;
  overflow:hidden;
  background:#F4ECE4;
  box-shadow:0 20px 50px rgba(0,0,0,.08);
}

.product-image img{
  width:100%;
  height:520px;
  object-fit:cover;
  display:block;
}

.favorite-btn{
  position:absolute;
  top:20px;
  right:20px;
  width:52px;
  height:52px;
  border:none;
  border-radius:50%;
  background:white;
  display:flex;
  justify-content:center;
  align-items:center;
  cursor:pointer;
  box-shadow:0 8px 20px rgba(0,0,0,.12);
  transition:.3s;
}

.favorite-btn:hover{
  transform:scale(1.08);
}

.size-grid{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:20px;
}

.size-card, .temperature-card{
  background:white;
  border:2px solid transparent;
  border-radius:22px;
  padding:22px;
  cursor:pointer;
  transition:all .3s ease;
  box-shadow:0 12px 30px rgba(0,0,0,.06);
  position:relative;
}

.size-card:hover, .temperature-card:hover{
  transform:translateY(-5px);
  box-shadow:0 20px 40px rgba(0,0,0,.10);
}

.size-card.active, .temperature-card.active{
  background:#FFF8F2;
  border-color:#C4956A;
}

.cup-icon{
  color:#C4956A;
  margin-bottom:12px;
  width:32px;
  height:32px;
}

.temperature-grid{
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:20px;
}

.temperature-icon{
  font-size:2rem;
  margin-bottom:8px;
}

.temperature-name{
  font-size:1.1rem;
  font-weight:700;
  color:#3B1A08;
  margin-bottom:4px;
}

.temperature-desc{
  color:#8D7B70;
  font-size:.9rem;
}

.sweetness-card{
  background:white;
  border-radius:24px;
  padding:28px;
  box-shadow:0 12px 30px rgba(0,0,0,.06);
}

.sweetness-labels{
  display:flex;
  justify-content:space-between;
  color:#8D7B70;
  font-size:.9rem;
  margin-bottom:20px;
}

.sweetness-slider{
  width:100%;
  accent-color:#C4956A;
  cursor:pointer;
}

.quick-request-title{
  font-weight:700;
  color:#3B1A08;
  margin-bottom:16px;
}

.quick-request-grid{
  display:flex;
  flex-wrap:wrap;
  gap:12px;
  margin-bottom:22px;
}

.quick-chip{
  padding:12px 18px;
  background:white;
  border:2px solid #EFE5DB;
  border-radius:999px;
  cursor:pointer;
  font-weight:600;
  font-size:.95rem;
  color:#6B5C53;
  transition:.25s;
  box-shadow:0 8px 20px rgba(0,0,0,.05);
}

.quick-chip:hover{
  background:#FFF8F2;
  border-color:#C4956A;
  color:#3B1A08;
  transform:translateY(-2px);
}

.instructions-card{
  background:white;
  border-radius:24px;
  padding:24px;
  box-shadow:0 12px 30px rgba(0,0,0,.06);
}

.instructions-input{
  width:100%;
  min-height:140px;
  border:none;
  outline:none;
  resize:vertical;
  padding:18px;
  border-radius:18px;
  background:#FDF9F4;
  font-family:'Inter',sans-serif;
  font-size:1rem;
  line-height:1.7;
  color:#3B1A08;
  transition:.3s;
}

.instructions-input:focus{
  box-shadow:0 0 0 2px #C4956A;
}

.instructions-input::placeholder{
  color:#A5968D;
}

.upload-review{
  display:inline-flex;
  align-items:center;
  gap:10px;
  padding:14px 22px;
  background:#F6ECE1;
  border-radius:999px;
  font-weight:700;
  cursor:pointer;
  color:#3B1A08;
  margin-bottom:20px;
  transition:.3s;
}

.upload-review:hover{
  background:#C4956A;
  color:white;
}

.preview-grid{
  display:grid;
  grid-template-columns:repeat(auto-fill,90px);
  gap:12px;
  margin-bottom:20px;
}

.preview-photo{
  width:90px;
  height:90px;
  border-radius:18px;
  object-fit:cover;
  box-shadow:0 8px 18px rgba(0,0,0,.08);
}

.review-photo-grid{
  display:grid;
  grid-template-columns:repeat(auto-fill,110px);
  gap:14px;
  margin-top:18px;
}

.review-photo{
  width:110px;
  height:110px;
  border-radius:18px;
  object-fit:cover;
}

.character-count{
  margin-top:12px;
  text-align:right;
  transform:translateY(-3px);
  color:#8D7B70;
  font-size:.85rem;
}

.chip.active{
  background:#C4956A;
  color:white;
}

.badge{
  display:inline-block;
  padding:8px 18px;
  border-radius:999px;
  background:#F4E1CF;
  color:#8B5E34;
  font-weight:700;
  font-size:.85rem;
  margin-bottom:18px;
}

.milk-grid{
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:20px;
}

.milk-card{
  display:flex;
  justify-content:space-between;
  align-items:center;
  background:white;
  border:2px solid transparent;
  border-radius:22px;
  padding:22px 24px;
  cursor:pointer;
  transition:all .3s ease;
  box-shadow:0 12px 30px rgba(0,0,0,.06);
}

.milk-card:hover{
  transform:translateY(-5px);
  box-shadow:0 20px 40px rgba(0,0,0,.10);
}

.milk-card.active{
  background:#FFF8F2;
  border-color:#C4956A;
}

.milk-header{
  display:flex;
  align-items:center;
  gap:16px;
}

.milk-emoji{
  font-size:2rem;
  width:48px;
  height:48px;
  display:flex;
  align-items:center;
  justify-content:center;
  background:#F6ECE1;
  border-radius:16px;
  transition:.3s;
}

.milk-card.active .milk-emoji{
  background:#C4956A;
}

.milk-name{
  font-size:1.08rem;
  font-weight:700;
  color:#3B1A08;
  margin-bottom:6px;
}

.milk-tagline{
  color:#8D7B70;
  font-size:.9rem;
}

.milk-price{
  font-weight:700;
  color:#C4956A;
  font-size:1rem;
  white-space:nowrap;
}

.milk-card.active .milk-price{
  color:#8B5E34;
}

.product-name{
  font-family:'Playfair Display',serif;
  font-size:3rem;
  color:#3B1A08;
  margin-bottom:14px;
}

.rating{
  display:flex;
  align-items:center;
  gap:10px;
  color:#8B5E34;
  font-weight:600;
  margin-bottom:20px;
}

.description{
  color:#6B5C53;
  line-height:1.8;
  font-size:1.05rem;
  margin-bottom:28px;
}

.price{
  font-size:2.2rem;
  font-weight:700;
  color:#3B1A08;
  margin-bottom:20px;
}

.option-section{
  margin-top:45px;
}

.option-title{
  font-family:'Playfair Display',serif;
  color:#3B1A08;
  font-size:1.8rem;
  margin-bottom:18px;
}

.write-review-card {
  background:white;
  border-radius:24px;
  padding:32px;
  box-shadow:0 12px 30px rgba(0,0,0,.06);
  margin-bottom:30px;
}

.write-title {
  font-family:'Playfair Display',serif;
  font-size:1.5rem;
  color:#3B1A08;
  margin-bottom:6px;
}

.write-subtitle{
  color:#7A675C;
  margin-bottom:25px;
  line-height:1.6;
}

.star-picker{
  display:flex;
  gap:10px;
  margin-bottom:25px;
}

.review-input{
  width:100%;
  min-height:140px;
  border:none;
  outline:none;
  resize:vertical;
  background:#FDF9F4;
  border-radius:20px;
  padding:18px;
  font-family:'Inter',sans-serif;
  font-size:1rem;
  line-height:1.6;
  margin-bottom:20px;
}

.review-input:focus{
  box-shadow:0 0 0 2px #C4956A;
}

.submit-review {
  background:#3B1A08;
  color:white;
  border:none;
  padding:16px 32px;
  border-radius:14px;
  font-size:1rem;
  font-weight:700;
  cursor:pointer;
  transition:.3s;
  width:100%;
}

.submit-review:hover{
  background:#A9784E;
  transform:translateY(-2px);
}

.reviews-list{
  display:flex;
  flex-direction:column;
  gap:25px;
  margin-top:20px;
}

.review-card{
  background:white;
  border-radius:24px;
  padding:24px;
  box-shadow:0 12px 35px rgba(0,0,0,.07);
  transition:.3s;
}

.review-card:hover{
  transform:translateY(-4px);
}

.review-header{
  display:flex;
  justify-content:space-between;
  align-items:center;
  margin-bottom:18px;
}

.review-user{
  display:flex;
  align-items:center;
  gap:16px;
}

.review-avatar{
  width:56px;
  height:56px;
  border-radius:50%;
  background:#F6ECE1;
  display:flex;
  align-items:center;
  justify-content:center;
  font-weight:700;
  color:#3B1A08;
}

.review-name{
  font-weight:700;
  color:#3B1A08;
  margin-bottom:5px;
}

.review-stars{
  display:flex;
  gap:3px;
}

.review-date{
  color:#9A8A80;
  font-size:.9rem;
}

.review-text{
  color:#5F524A;
  line-height:1.8;
  margin:0;
}

.size-name{
  font-size:1.2rem;
  font-weight:700;
  color:#3B1A08;
  margin-bottom:8px;
}

.size-volume{
  color:#8F7F75;
  font-size:.95rem;
  margin-bottom:18px;
}

.size-price{
  color:#C4956A;
  font-size:1.15rem;
  font-weight:700;
}

.popular-badge{
  position:absolute;
  top:14px;
  right:14px;
  background:#C4956A;
  color:white;
  padding:6px 12px;
  border-radius:999px;
  font-size:.72rem;
  font-weight:700;
  letter-spacing:.4px;
}

.product-info-grid{
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:16px;
  margin-bottom:35px;
}

.sticky-order-bar{
  position:fixed;
  bottom:20px;
  left:50%;
  transform:translateX(-50%);
  width:min(94%,1000px);
  background:white;
  border-radius:28px;
  padding:18px 24px;
  display:flex;
  justify-content:space-between;
  align-items:center;
  box-shadow:0 18px 50px rgba(0,0,0,.15);
  z-index:999;
}

.sticky-left{
  display:flex;
  flex-direction:column;
  gap:6px;
}

.sticky-product-name{
  font-size:1.2rem;
  font-weight:700;
  color:#3B1A08;
}

.sticky-summary{
  font-size:.95rem;
  color:#8A786D;
}

.sticky-right{
  display:flex;
  align-items:center;
  gap:18px;
}

.quantity-selector{
  display:flex;
  align-items:center;
  background:#F6ECE1;
  border-radius:999px;
  padding:6px;
  gap:12px;
}

.quantity-selector button{
  width:34px;
  height:34px;
  border:none;
  border-radius:50%;
  background:white;
  font-size:1.2rem;
  cursor:pointer;
  transition:.3s;
}

.quantity-selector button:hover{
  background:#C4956A;
  color:white;
}

.quantity-selector span{
  font-weight:700;
  min-width:22px;
  text-align:center;
}

.sticky-cart-button{
  display:flex;
  align-items:center;
  gap:16px;
  border:none;
  background:#C4956A;
  color:white;
  padding:15px 24px;
  border-radius:999px;
  font-weight:700;
  font-size:1rem;
  cursor:pointer;
  transition:.3s;
}

.sticky-cart-button:hover{
  background:#AA7851;
  transform:translateY(-2px);
}

.info-card{
  background:white;
  border-radius:18px;
  padding:18px;
  display:flex;
  align-items:center;
  gap:12px;
  font-weight:600;
  color:#3B1A08;
  box-shadow:0 10px 25px rgba(0,0,0,.06);
  transition:.3s;
}

.info-card svg{
  color:#C4956A;
}

.extras-grid{
  display:grid;
  gap:18px;
}

.extra-card{
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:22px 24px;
  background:white;
  border:2px solid transparent;
  border-radius:22px;
  cursor:pointer;
  transition:.3s;
  box-shadow:0 12px 30px rgba(0,0,0,.06);
}

.extra-card:hover{
  transform:translateY(-5px);
  box-shadow:0 18px 35px rgba(0,0,0,.10);
}

.extra-card.active{
  border-color:#C4956A;
  background:#FFF8F2;
}

.extra-left{
  display:flex;
  align-items:center;
  gap:18px;
}

.extra-icon{
  width:52px;
  height:52px;
  border-radius:16px;
  background:#F6ECE1;
  display:flex;
  justify-content:center;
  align-items:center;
  font-size:1.5rem;
  transition:.3s;
}

.extra-card.active .extra-icon{
  background:#C4956A;
}

.extra-name{
  font-size:1.05rem;
  font-weight:700;
  color:#3B1A08;
  margin-bottom:5px;
}

.extra-desc{
  color:#8D7B70;
  font-size:.9rem;
}

.extra-price{
  color:#C4956A;
  font-weight:700;
  white-space:nowrap;
}

.info-card:hover{
  transform:translateY(-5px);
  box-shadow:0 18px 35px rgba(0,0,0,.10);
}

@media(max-width:900px){
  .hero-section{
    grid-template-columns:1fr;
    gap:30px;
  }
  .product-image img{
    height:380px;
  }
  .milk-grid, .size-grid{
    grid-template-columns:1fr;
  }
  .temperature-grid{
    grid-template-columns:1fr;
  }
  .milk-card{
    padding:20px;
  }
  .milk-header{
    gap:14px;
  }
  .milk-emoji{
    width:44px;
    height:44px;
    font-size:1.8rem;
  }
  .product-name{
    font-size:2.3rem;
  }
  .product-info-grid{
    grid-template-columns:1fr;
  }
  .extra-card{
    padding:20px;
  }
  .extra-left{
    gap:14px;
  }
  .quick-request-grid{
    gap:10px;
  }
  .quick-chip{
    font-size:.9rem;
    padding:10px 16px;
  }
  .write-review-card{
    padding:22px;
  }
  .review-card{
    padding:20px;
  }
  .review-header{
    flex-direction:column;
    align-items:flex-start;
    gap:15px;
  }
  .review-photo-grid{
    grid-template-columns:repeat(2,1fr);
  }
  .preview-photo{
    width:80px;
    height:80px;
  }
  .instructions-card{
    padding:20px;
  }
  .instructions-input{
    min-height:120px;
  }
  .sticky-order-bar{
    flex-direction:column;
    gap:18px;
    padding:20px;
    bottom:12px;
  }
  .sticky-right{
    width:100%;
    justify-content:space-between;
  }
  .sticky-cart-button{
    flex:1;
    justify-content:center;
  }
  .extra-icon{
    width:46px;
    height:46px;
  }
  .product-page{
    padding:25px 18px 160px;
  }
}
`}</style>

      <div className="product-page">
        <div className="product-container">
          <button className="back-button" onClick={() => setPage("menu")}>
            <ArrowLeft size={20} />
            Back to Menu
          </button>

          <div className="hero-section">
            {/* LEFT SIDE */}
            <div className="product-image">
              <img
                src="https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=900"
                alt="Vanilla Latte"
              />
              <button className="favorite-btn" onClick={() => setFavorite(!favorite)}>
                <Heart
                  size={24}
                  fill={favorite ? "#C4956A" : "none"}
                  color="#C4956A"
                />
              </button>
            </div>

            {/* RIGHT SIDE */}
            <div>
              <div className="badge">BEST SELLER</div>
              <h1 className="product-name">Vanilla Latte</h1>

              <div className="rating">
                <Star size={20} fill="#C4956A" color="#C4956A" />
                <span>4.9</span>
                <span style={{ color: "#9A8A80" }}>(268 Reviews)</span>
              </div>

              <p className="description">
                Crafted with rich espresso, silky steamed milk and Madagascar vanilla, our Vanilla Latte delivers the
                perfect balance of sweetness and bold coffee flavour. A Brewed favourite made for every season.
              </p>

              <div className="product-info-grid">
                <div className="info-card">
                  <Clock3 size={22} />
                  <span>5–8 mins</span>
                </div>
                <div className="info-card">
                  <Flame size={22} />
                  <span>Served Hot</span>
                </div>
                <div className="info-card">
                  <Leaf size={22} />
                  <span>Vegetarian</span>
                </div>
                <div className="info-card">
                  <Star size={22} fill="#C4956A" color="#C4956A" />
                  <span>1.2k Sold</span>
                </div>
              </div>

              <div className="price">₹{singlePrice}</div>

              {/* SIZE SELECTION SECTION */}
              <div className="option-section">
                <h2 className="option-title">Choose Your Size</h2>
                <div className="size-grid">
                  <div
                    className={`size-card ${size === "Small" ? "active" : ""}`}
                    onClick={() => setSize("Small")}
                  >
                    <CupSoda className="cup-icon" />
                    <div className="size-name">Small</div>
                    <div className="size-volume">8 oz</div>
                    <div className="size-price">₹195</div>
                  </div>

                  <div
                    className={`size-card ${size === "Medium" ? "active" : ""}`}
                    onClick={() => setSize("Medium")}
                  >
                    <div className="popular-badge">Most Popular</div>
                    <CupSoda className="cup-icon" />
                    <div className="size-name">Medium</div>
                    <div className="size-volume">12 oz</div>
                    <div className="size-price">₹245</div>
                  </div>

                  <div
                    className={`size-card ${size === "Large" ? "active" : ""}`}
                    onClick={() => setSize("Large")}
                  >
                    <CupSoda className="cup-icon" />
                    <div className="size-name">Large</div>
                    <div className="size-volume">16 oz</div>
                    <div className="size-price">₹295</div>
                  </div>
                </div>
              </div>

              {/* MILK OPTIONS SECTION */}
              <div className="option-section">
                <h2 className="option-title">Milk Options</h2>
                <div className="milk-grid">
                  <div
                    className={`milk-card ${milk === "Whole Milk" ? "active" : ""}`}
                    onClick={() => setMilk("Whole Milk")}
                  >
                    <div className="milk-header">
                      <div className="milk-emoji">🥛</div>
                      <div>
                        <div className="milk-name">Whole Milk</div>
                        <div className="milk-tagline">Standard Premium Dairy</div>
                      </div>
                    </div>
                    <div className="milk-price">Free</div>
                  </div>

                  <div
                    className={`milk-card ${milk === "Oat Milk" ? "active" : ""}`}
                    onClick={() => setMilk("Oat Milk")}
                  >
                    <div className="milk-header">
                      <div className="milk-emoji">🌾</div>
                      <div>
                        <div className="milk-name">Oat Milk</div>
                        <div className="milk-tagline">Creamy plant-based choice</div>
                      </div>
                    </div>
                    <div className="milk-price">+ ₹30</div>
                  </div>
                </div>
              </div>

              {/* TEMPERATURE SECTION */}
              <div className="option-section">
                <h2 className="option-title">Temperature</h2>
                <div className="temperature-grid">
                  <div
                    className={`temperature-card ${temperature === "Hot" ? "active" : ""}`}
                    onClick={() => setTemperature("Hot")}
                  >
                    <div className="temperature-icon">🔥</div>
                    <div>
                      <div className="temperature-name">Hot</div>
                      <div className="temperature-desc">Freshly steamed milk</div>
                    </div>
                  </div>

                  <div
                    className={`temperature-card ${temperature === "Iced" ? "active" : ""}`}
                    onClick={() => setTemperature("Iced")}
                  >
                    <div className="temperature-icon">🧊</div>
                    <div>
                      <div className="temperature-name">Iced</div>
                      <div className="temperature-desc">Poured over smooth ice</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CUSTOM EXTRAS PANEL */}
              <div className="option-section">
                <h2 className="option-title">Custom Extras</h2>
                <div className="extras-grid">
                  <div
                    className={`extra-card ${toppings.includes("Whipped Cream") ? "active" : ""}`}
                    onClick={() => toggleTopping("Whipped Cream")}
                  >
                    <div className="extra-left">
                      <div className="extra-icon">☁️</div>
                      <div>
                        <div className="extra-name">Whipped Cream</div>
                        <div className="extra-desc">Fluffy & Sweet Cream Layer</div>
                      </div>
                    </div>
                    <div className="extra-price">+ ₹20</div>
                  </div>

                  <div
                    className={`extra-card ${toppings.includes("Caramel Drizzle") ? "active" : ""}`}
                    onClick={() => toggleTopping("Caramel Drizzle")}
                  >
                    <div className="extra-left">
                      <div className="extra-icon">🍯</div>
                      <div>
                        <div className="extra-name">Caramel Drizzle</div>
                        <div className="extra-desc">Signature Sweet Drizzle</div>
                      </div>
                    </div>
                    <div className="extra-price">+ ₹25</div>
                  </div>

                  <div
                    className={`extra-card ${toppings.includes("Vanilla Syrup") ? "active" : ""}`}
                    onClick={() => toggleTopping("Vanilla Syrup")}
                  >
                    <div className="extra-left">
                      <div className="extra-icon">✨</div>
                      <div>
                        <div className="extra-name">Vanilla Syrup</div>
                        <div className="extra-desc">Madagascar Vanilla Essence</div>
                      </div>
                    </div>
                    <div className="extra-price">+ ₹20</div>
                  </div>
                </div>
              </div>

              {/* SWEETNESS SECTION */}
              <div className="option-section">
                <h2 className="option-title">Sweetness Level</h2>
                <div className="sweetness-card">
                  <div className="sweetness-labels">
                    <span>Unsweetened (0%)</span>
                    <span>Regular (50%)</span>
                    <span>Extra Sweet (100%)</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="25"
                    value={sweetness}
                    className="sweetness-slider"
                    onChange={(e) => setSweetness(Number(e.target.value))}
                  />
                </div>
              </div>

              {/* SPECIAL INSTRUCTIONS SECTION */}
              <div className="option-section">
                <h2 className="option-title">Special Requests</h2>
                <div className="quick-request-grid">
                  {quickRequests.map((request) => (
                    <button
                      key={request}
                      type="button"
                      className="quick-chip"
                      onClick={() => setInstructions((prev) => (prev ? `${prev}, ${request}` : request))}
                    >
                      {request}
                    </button>
                  ))}
                </div>

                <div className="instructions-card">
                  <textarea
                    className="instructions-input"
                    placeholder="Any additional instructions for your barista..."
                    maxLength={200}
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                  />
                  <div className="character-count">{instructions.length} / 200</div>
                </div>
              </div>

              {/* REVIEWS & FEEDBACK MODULE */}
              <div className="option-section">
                <h2 className="option-title">Customer Reviews</h2>

                <div className="write-review-card">
                  <h3 className="write-title">Share Your Experience</h3>
                  <p className="write-subtitle">Tell other coffee lovers what you thought.</p>

                  <div className="star-picker">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={30}
                        fill={star <= reviewRating ? "#C4956A" : "none"}
                        color="#C4956A"
                        style={{ cursor: "pointer" }}
                        onClick={() => setReviewRating(star)}
                      />
                    ))}
                  </div>

                  <textarea
                    className="review-input"
                    placeholder="How was your drink today?"
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                  />

                  <label className="upload-review">
                    <Camera size={20} />
                    Add Drink Photos
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      hidden
                      onChange={handleReviewImages}
                    />
                  </label>

                  {reviewImages.length > 0 && (
                    <div className="preview-grid">
                      {reviewImages.map((image, index) => (
                        <img key={index} src={image} alt="Preview" className="preview-photo" />
                      ))}
                    </div>
                  )}

                  <button className="submit-review" onClick={submitReview}>
                    Post Review
                  </button>
                </div>

                <div className="reviews-list">
                  {reviews.map((rev) => (
                    <div className="review-card" key={rev.id}>
                      <div className="review-header">
                        <div className="review-user">
                          <div className="review-avatar">{rev.name.charAt(0)}</div>
                          <div>
                            <div className="review-name">{rev.name}</div>
                            <div className="review-stars">
                              {Array.from({ length: rev.rating }).map((_, idx) => (
                                <Star key={idx} size={16} fill="#C4956A" color="#C4956A" />
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="review-date">Just now</div>
                      </div>
                      <p className="review-text">{rev.text}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

                    {/* PERSISTENT BAR TRACKER */}
          <div className="sticky-order-bar">
            <div className="sticky-left">
              <div className="sticky-product-name">{product.name}</div>
              <div className="sticky-summary">
                {size} • {milk} {toppings.length > 0 && ` • ${toppings.join(", ")}`}
              </div>
            </div>

            <div className="sticky-right">
              {/* Only show quantity selector if logged in */}
              {currentUser && (
                <div className="quantity-selector">
                  <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
                  <span>{quantity}</span>
                  <button type="button" onClick={() => setQuantity(quantity + 1)}>+</button>
                </div>
              )}

              {/* Dynamic Button: Changes label and color based on login status */}
              
             <button 
  className="sticky-cart-button" 
  onClick={currentUser ? handleAddToCart : () => setPage("login")} // Redirect if not logged in
  style={{ 
    background: currentUser ? "#C4956A" : "#6B5C53",
    opacity: 1
  }}
>
  {currentUser ? (
    <>
      ₹{totalPrice}
      <span>Add to Cart</span>
    </>
  ) : (
    <span>Log in to Order</span>
  )}
</button>
            </div>
          </div>

          </div>
          </div>
           </>
    );
}
