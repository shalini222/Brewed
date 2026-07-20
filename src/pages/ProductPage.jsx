import { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  orderBy
} from "firebase/firestore";

import { db } from "../firebase";
import ReactSlider from "react-slider";

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
}) {
  const [favorite, setFavorite] = useState(false);
  const [size, setSize] = useState(
    product?.sizes?.[0]?.name || ""
  );
  const [milk, setMilk] = useState("");
  const [toppings, setToppings] = useState([]);
  const [temperature, setTemperature] = useState("Hot");
  const [iceLevel, setIceLevel] = useState("Regular");
  const [sweetnessIndex, setSweetnessIndex] = useState(0);
  const [instructions, setInstructions] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewImages, setReviewImages] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [quickRequests, setQuickRequests] = useState([]);
  const [toast, setToast] = useState("");

  const [reviews, setReviews] = useState([]);
  
  const { addToCart } = useCart();
  const { currentUser } = useAuth(); 

  const averageRating = reviews.length
    ? (
        reviews.reduce((total, review) => total + review.rating, 0) /
        reviews.length
      ).toFixed(1)
    : "0.0";

  const sweetnessOptions = Array.isArray(product?.sweetnessOptions)
    ? product.sweetnessOptions
    : [];
  
  const selectedSweetness = sweetnessOptions[sweetnessIndex] ?? null;

  const CLOUD_NAME = "knvwfzhp";
  const UPLOAD_PRESET = "brewed_menu";
  const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
  
  useEffect(() => {
    if (!product) return;

    const fetchReviews = async () => {
      try {
        const q = query(
          collection(db, "reviews"),
          where("productId", "==", product.id)
        );

        const snapshot = await getDocs(q);

        const loadedReviews = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setReviews(loadedReviews);
      } catch (error) {
        console.error("Failed loading reviews:", error);
      }
    };

    fetchReviews(); 
  }, [product]);

  useEffect(() => {
    if (product?.milkOptions?.length > 0) {
      setMilk(product.milkOptions[0].name);
    } else {
      setMilk("");
    }
  }, [product]);

  useEffect(() => {
    setSweetnessIndex(0);
  }, [product]);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const q = query(
          collection(db, "specialRequests"),
          where("active", "==", true)
        );

        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => doc.data().name);

        setQuickRequests(data);
      } catch (error) {
        console.error("Failed fetching requests:", error);
      }
    };

    fetchRequests();
  }, []);

  const basePrice = product?.price || 0;

  const milkPrices = Object.fromEntries(
    (product?.milkOptions || []).map((m) => [
      m.name,
      Number(m.price || 0),
    ])
  );

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

  const selectedSize = product?.sizes?.find(s => s.name === size);

  const singlePrice =
    basePrice +
    (selectedSize?.price || 0) +
    (milkPrices[milk] || 0) +
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
    setReviewImages(files);
  };

  const uploadReviewImages = async () => {
    const uploadedImages = [];

    for (const image of reviewImages) {
      const formData = new FormData();
      formData.append("file", image);
      formData.append("upload_preset", UPLOAD_PRESET);

      const response = await fetch(CLOUDINARY_URL, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      uploadedImages.push(data.secure_url);
    }

    return uploadedImages;
  };

  const submitReview = async () => {
    if (!currentUser) {
      setPage("login");
      return;
    }

    if (!reviewText.trim() || reviewRating === 0) return;

    try {
      const uploadedImages = await uploadReviewImages();

      await addDoc(collection(db, "reviews"), {
        productId: product.id,
        userId: currentUser.uid,
        name: currentUser.displayName || "Customer",
        rating: reviewRating,
        text: reviewText,
        images: uploadedImages,
        createdAt: serverTimestamp(),
      });

      setReviewText("");
      setReviewRating(0);
      setReviewImages([]);

      const q = query(
        collection(db, "reviews"),
        where("productId", "==", product.id)
      );

      const snapshot = await getDocs(q);

      setReviews(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
    } catch (error) {
      console.error("Failed to submit review:", error);
      alert("Failed to submit review. Please try again.");
    }
  };

  const handleAddToCart = () => {
    if (!currentUser) {
      setPage("login");
      return;
    }

    addToCart({
      ...product,
      price: singlePrice,
      qty: quantity,
      size,
      milk,
      toppings,
      temperature,
      iceLevel,
      sweetness: selectedSweetness,
      instructions,
      extras: selectedExtras,
    });

    setPage("cart");
  };

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

  function showToast(message) {
    setToast(message);
    setTimeout(() => {
      setToast("");
    }, 2500);
  }

  function toggleExtra(extra) {
    const alreadySelected = selectedExtras.some(
      (item) => item.name === extra.name
    );

    if (alreadySelected) {
      setSelectedExtras(
        selectedExtras.filter(
          (item) => item.name !== extra.name
        )
      );
      return;
    }

    const max = product.customExtrasMaxSelection || 3;

    if (selectedExtras.length >= max) {
      showToast(`You can select up to ${max} extras.`);
      return;
    }

    setSelectedExtras([
      ...selectedExtras,
      extra,
    ]);
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

.toast {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  background: #3B1A08;
  color: white;
  padding: 12px 20px;
  border-radius: 12px;
  z-index: 9999;
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

/* ===== Sweetness Slider ===== */

.sweetness-slider {
  width: 100%;
  height: 12px;
  margin: 20px 0;
}

.sweetness-track {
  top: 4px;
  height: 6px;
  border-radius: 999px;
  background: #E8DED3;
}

.sweetness-track-0 {
  background: #C4956A;
}

.sweetness-thumb {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #C4956A;
  border: 3px solid #fff;
  cursor: grab;
  box-shadow: 0 6px 16px rgba(0,0,0,.18);
  transition: transform .18s ease,
              box-shadow .18s ease;
  outline: none;
  top: -6px;
}

.sweetness-thumb:hover {
  transform: scale(1.08);
}

.sweetness-thumb:active {
  cursor: grabbing;
  transform: scale(1.18);
  box-shadow: 0 10px 24px rgba(0,0,0,.25);
}

.sweetness-label {
  color: #777;
  font-size: 13px;
  font-weight: 500;
  transition: all .2s ease;
}

.sweetness-label.active {
  color: #C4956A;
  font-weight: 700;
  transform: scale(1.08);
}

.quick-request-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.quick-chip {
  padding: 10px 16px;
  border-radius: 999px;
  border: 1px solid #ddd;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  transition: 0.2s ease;
}

.quick-chip.active {
  background: #C4956A;
  color: white;
  border-color: #C4956A;
}

.instructions-card {
  margin-top: 18px;
  padding: 15px;
  border-radius: 18px;
  background: #ffffff;
  border: 1px solid #eee;
}
`}</style>

      <div className="product-page">
        <div className="product-container">
          <button className="back-button" onClick={() => setPage("menu")}>
            <ArrowLeft size={20} /> Back to Menu
          </button>

          <div className="hero-section">
            <div className="product-image">
              <img src={product.image} alt={product.name} />
              <button 
                className="favorite-btn" 
                onClick={() => setFavorite(!favorite)}
              >
                <Heart 
                  size={24} 
                  color={favorite ? "#C4956A" : "#3B1A08"} 
                  fill={favorite ? "#C4956A" : "none"} 
                />
              </button>
            </div>

            <div>
              <span className="badge">{product.category || "Beverage"}</span>
              <h1 className="product-name">{product.name}</h1>
              
              <div className="rating">
                <Star size={18} fill="#8B5E34" />
                <span>{averageRating}</span>
                <span>({reviews.length} reviews)</span>
              </div>

              <p className="description">{product.description}</p>
              <div className="price">₹{totalPrice}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
