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
  orderBy,
  limit,
  doc,
  getDoc,
  updateDoc,
  increment,
  setDoc,
  deleteDoc
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

import { X } from "lucide-react";

import { BadgeCheck
} from "lucide-react";

import { ThumbsUp } from "lucide-react";






export default function ProductPage({
  setPage,
  product,
})  {
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
  const [reviewSort, setReviewSort] = useState("newest");
  const [reviewFilter, setReviewFilter] = useState("all");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [toast, setToast] = useState("");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedReviewImage, setSelectedReviewImage] = useState(null);
  const [reviews, setReviews] = useState([]);




const [editingReview, setEditingReview] = useState(null);

const [editText, setEditText] = useState("");

const [editRating, setEditRating] = useState(0);

const [showDeleteModal, setShowDeleteModal] = useState(false);

const [reviewToDelete, setReviewToDelete] = useState(null);
  
  
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
  
  const selectedSweetness =
  sweetnessOptions[sweetnessIndex] ?? null;


const CLOUD_NAME = "knvwfzhp";
const UPLOAD_PRESET = "brewed_menu";
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
  
  

useEffect(() => {

  if(!product) return;

  const fetchReviews = async()=>{

    try {

      const q = query(
        collection(db,"reviews"),
        where("productId","==",product.id)
        
      );

      const snapshot = await getDocs(q);

      const loadedReviews = snapshot.docs.map(doc=>({
        id: doc.id,
        ...doc.data()
      }));

      setReviews(loadedReviews);

    } catch(error){
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

  const q = query(
    collection(db,"specialRequests"),
    where("active","==",true)
  );

  const snapshot = await getDocs(q);

  const data = snapshot.docs.map(doc => doc.data().name);

  setQuickRequests(data);

 };

 fetchRequests();

}, []);


useEffect(() => {
  if (!currentUser || !product) return;

  const checkFavorite = async () => {
    const favRef = doc(
      db,
      "users",
      currentUser.uid,
      "favorites",
      product.id
    );

    const snapshot = await getDoc(favRef);

    setFavorite(snapshot.exists());
  };

  checkFavorite();
}, [currentUser, product]);
  
  
  const basePrice = product.price;

  
  

 const selectedSize =
  product.sizes?.find(s => s.name === size);

  
  const milkPrices = Object.fromEntries(
  (product.milkOptions || []).map((milk) => [
    milk.name,
    Number(milk.price || 0),
  ])
);


const extrasTotal = selectedExtras.reduce(
  (sum, extra) => sum + Number(extra.price || 0),
  0
);

  
const singlePrice =
  basePrice +
  (selectedSize?.price || 0) +
  (milkPrices[milk] || 0) +
  extrasTotal;
  

  const totalPrice = singlePrice * quantity;

  const toggleTopping = (topping) => {
    if (toppings.includes(topping)) {
      setToppings(toppings.filter(item => item !== topping));
    } else {
      setToppings([...toppings, topping]);
    }
  };

  const MAX_REVIEW_PHOTOS = 5;

const handleReviewImages = (e) => {
  const files = Array.from(e.target.files);

  const updatedImages = [...reviewImages, ...files];

  if (updatedImages.length > MAX_REVIEW_PHOTOS) {
    showToast(`You can upload up to ${MAX_REVIEW_PHOTOS} photos.`);
  }

  setReviewImages(updatedImages.slice(0, MAX_REVIEW_PHOTOS));

  // Allow selecting the same file again later
  e.target.value = "";
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

  if (reviewRating === 0) {
  showToast("Please select a rating.");
  return;
}

if (reviewImages.length > 0 && !reviewText.trim()) {
  showToast("Please write a review when uploading photos.");
  return;
}

if (!reviewText.trim() && reviewImages.length === 0) {
  showToast("Please write a review or upload photos.");
  return;
}

  try {
    // Upload images to Cloudinary
    const uploadedImages = await uploadReviewImages();



     // Check if user has purchased this product
const purchaseQuery = query(
  collection(db, "orders"),
  where("userId", "==", currentUser.uid),
  limit(50)
);

const purchaseSnapshot = await getDocs(purchaseQuery);

const verifiedPurchase = purchaseSnapshot.docs.some((doc) => {
  const order = doc.data();

  return (order.items || []).some(
    (item) => item.id === product.id
  );
});

    

    // Save review
    await addDoc(collection(db, "reviews"), {
  productId: product.id,
  userId: currentUser.uid,
  name: currentUser.displayName || "Customer",

  verifiedPurchase,
  helpfulCount: 0,

  rating: reviewRating,
  text: reviewText,
  images: uploadedImages,
  createdAt: serverTimestamp(),
});

    
    // Clear form
    setReviewText("");
    setReviewRating(0);
    setReviewImages([]);

    // Reload reviews
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
    alert(error.message);
  }
};
 


  

const markHelpful = async (reviewId) => {
  if (!currentUser) {
    setPage("login");
    return;
  }

  try {
    const helpfulRef = doc(
      db,
      "reviews",
      reviewId,
      "helpfulBy",
      currentUser.uid
    );

    const alreadyVoted = await getDoc(helpfulRef);

    if (alreadyVoted.exists()) {
      showToast("You've already marked this review as helpful.");
      return;
    }

    await setDoc(helpfulRef, {
      votedAt: serverTimestamp(),
    });

    await updateDoc(doc(db, "reviews", reviewId), {
      helpfulCount: increment(1),
    });

    setReviews((prev) =>
      prev.map((review) =>
        review.id === reviewId
          ? {
              ...review,
              helpfulCount:
                (review.helpfulCount || 0) + 1,
            }
          : review
      )
    );

    showToast("Thanks for your feedback ❤️");
  } catch (err) {
    console.error(err);
    showToast("Something went wrong.");
  }
};
  

const updateReview = async () => {
  if (!editingReview) return;

  if (!editText.trim()) {
    showToast("Review cannot be empty.");
    return;
  }

  if (editRating === 0) {
    showToast("Please select a rating.");
    return;
  }

  try {
    await updateDoc(doc(db, "reviews", editingReview), {
      text: editText,
      rating: editRating,
      edited: true,
      editedAt: serverTimestamp(),
    });

    setReviews((prev) =>
      prev.map((review) =>
        review.id === editingReview
          ? {
              ...review,
              text: editText,
              rating: editRating,
              edited: true,
            }
          : review
      )
    );

    showToast("Review updated!");

    setEditingReview(null);
    setEditText("");
    setEditRating(0);

  } catch (err) {
    console.error(err);
    showToast("Failed to update review.");
  }
};
  
  
const deleteReview = async () => {
  if (!reviewToDelete) return;

  try {
    await deleteDoc(doc(db, "reviews", reviewToDelete));

    setReviews((prev) =>
      prev.filter((review) => review.id !== reviewToDelete)
    );

    showToast("Review deleted.");

    setShowDeleteModal(false);
    setReviewToDelete(null);

  } catch (err) {
    console.error(err);
    showToast("Failed to delete review.");
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

    // Customizations
    size,
    milk,
    toppings,
    temperature,
    iceLevel,
    sweetness: selectedSweetness,

    // Special requests
    instructions,

    // Extras
    extras: selectedExtras,
  });

  setPage("cart");
};
  


const toggleFavorite = async () => {
  if (!currentUser) {
    setPage("login");
    return;
  }

  try {
    const favRef = doc(
      db,
      "users",
      currentUser.uid,
      "favorites",
      product.id
    );

    if (favorite) {
      await deleteDoc(favRef);

      setFavorite(false);

      showToast("Removed from wishlist");
    } else {
      await setDoc(favRef, {
        ...product,
        addedAt: serverTimestamp(),
      });

      setFavorite(true);

      showToast("Added to wishlist ❤️");
    }
  } catch (err) {
    console.error(err);
    showToast("Something went wrong.");
  }
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


const filteredReviews = reviews.filter((review) => {
  switch (reviewFilter) {
    case "photos":
      return review.images?.length > 0;

    case "verified":
      return review.verifiedPurchase === true;

    case "5":
      return review.rating === 5;

    case "4":
      return review.rating === 4;

    case "3":
      return review.rating === 3;

    case "2":
      return review.rating === 2;

    case "1":
      return review.rating === 1;

    default:
      return true;
  }
});


const sortedReviews = [...filteredReviews].sort((a, b) => {
  switch (reviewSort) {
    case "highest":
      return b.rating - a.rating;

    case "lowest":
      return a.rating - b.rating;

    case "oldest":
      return (
        (a.createdAt?.seconds || 0) -
        (b.createdAt?.seconds || 0)
      );

    case "helpful":
  return (
    (b.helpfulCount || 0) -
    (a.helpfulCount || 0)
  );


      
    case "newest":
    default:
      return (
        (b.createdAt?.seconds || 0) -
        (a.createdAt?.seconds || 0)
      );
  }
});







const ratingBreakdown = {
  5: 0,
  4: 0,
  3: 0,
  2: 0,
  1: 0,
};

reviews.forEach((review) => {
  if (ratingBreakdown[review.rating] !== undefined) {
    ratingBreakdown[review.rating]++;
  }
});

const recommendationPercentage =
  reviews.length === 0
    ? 0
    : Math.round(
        (reviews.filter((r) => r.rating >= 4).length /
          reviews.length) *
          100
      );
  
  const customerPhotos = reviews.flatMap((review) =>
  (review.images || []).map((image) => ({
    image,
    reviewer: review.name,
    rating: review.rating,
  }))
);


  

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

.review-name-row{
  display:flex;
  align-items:center;
  gap:10px;
  flex-wrap:wrap;
  margin-bottom:6px;
}

.verified-badge{
  display:inline-flex;
  align-items:center;
  gap:6px;
  padding:5px 10px;
  border-radius:999px;

  background:#E8F7EC;
  color:#2E7D32;

  font-size:.75rem;
  font-weight:700;

  border:1px solid #BFE5C7;
}



.preview-item{
  position:relative;
  width:90px;
  height:90px;
}

.remove-photo-btn{
  position:absolute;
  top:-6px;
  right:-6px;
  width:24px;
  height:24px;
  border:none;
  border-radius:50%;
  background:#3B1A08;
  color:white;
  display:flex;
  align-items:center;
  justify-content:center;
  cursor:pointer;
  transition:.2s;
}

.remove-photo-btn:hover{
  background:#C4956A;
  transform:scale(1.1);
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


.customer-gallery{
  background:white;
  border-radius:24px;
  padding:28px;
  margin-bottom:35px;
  box-shadow:0 12px 30px rgba(0,0,0,.06);
}

.gallery-header{
  display:flex;
  justify-content:space-between;
  align-items:center;
  margin-bottom:20px;
}

.gallery-header h3{
  margin:0;
  font-family:'Playfair Display',serif;
  color:#3B1A08;
}

.gallery-header span{
  color:#8D7B70;
  font-weight:600;
}

.gallery-grid{
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(90px,1fr));
  gap:14px;
}

.gallery-photo{
  width:100%;
  aspect-ratio:1;

  object-fit:cover;

  border-radius:18px;

  cursor:pointer;

  transition:.25s;
}

.gallery-photo:hover{
  transform:scale(1.05);
}

.rating-summary-card{
  display:grid;
  grid-template-columns:260px 1fr;
  gap:40px;

  background:white;
  border-radius:24px;

  padding:30px;

  margin-bottom:35px;

  box-shadow:0 12px 30px rgba(0,0,0,.06);
}

.summary-left{
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
}

.summary-rating{
  font-size:4rem;
  font-weight:700;
  color:#3B1A08;
}

.summary-stars{
  display:flex;
  gap:4px;
  margin:10px 0;
}

.summary-total{
  color:#8D7B70;
  text-align:center;
}

.summary-right{
  display:flex;
  flex-direction:column;
  gap:14px;
}

.rating-row{
  display:flex;
  align-items:center;
  gap:14px;
}

.rating-label{
  width:32px;
  font-weight:700;
  color:#3B1A08;
}

.rating-bar{
  flex:1;
  height:10px;

  background:#EFE5DB;

  border-radius:999px;

  overflow:hidden;
}

.rating-fill{
  height:100%;

  background:#C4956A;

  border-radius:999px;

  transition:width .35s ease;
}

.rating-count{
  width:28px;
  text-align:right;

  color:#8D7B70;
}

@media(max-width:768px){

.rating-summary-card{

grid-template-columns:1fr;

gap:30px;

}

}


.review-actions{
  margin-top:16px;
}

.helpful-btn{
  display:flex;
  align-items:center;
  gap:8px;

  padding:8px 14px;

  background:#fff;

  border:1px solid #E6DFD5;

  border-radius:999px;

  cursor:pointer;

  font-size:14px;

  transition:.25s;
}

.helpful-btn:hover{
  background:#FAF6F0;
  border-color:#C4956A;
  color:#C4956A;
}

.helpful-btn svg{
  width:17px;
  height:17px;
}

.review-lightbox{
  position:fixed;
  inset:0;
  background:rgba(0,0,0,.9);

  display:flex;
  align-items:center;
  justify-content:center;

  z-index:9999;

  animation:fadeIn .25s;
}

.lightbox-image{
  max-width:90%;
  max-height:90%;
  border-radius:18px;
}

.lightbox-close{
  position:absolute;
  top:24px;
  right:24px;

  width:44px;
  height:44px;

  border:none;
  border-radius:50%;

  background:white;
  cursor:pointer;
}

@keyframes fadeIn{
  from{opacity:0;}
  to{opacity:1;}
}

.instructions-input::placeholder{
  color:#A5968D;
}
.upload-skeleton-grid{
  display:grid;
  grid-template-columns:repeat(4,90px);
  gap:14px;
  margin-bottom:20px;
}
.review-time{
  font-size:.8rem;
  color:#9A8A80;
  margin-top:3px;
}



.review-filter{
  display:flex;
  flex-direction:column;
  gap:8px;
}

.review-filter label{
  font-weight:700;
  color:#3B1A08;
}

.review-filter select{
  padding:12px 16px;

  border:2px solid #EFE5DB;

  border-radius:14px;

  background:white;

  font-size:.95rem;

  cursor:pointer;

  transition:.25s;
}

.review-filter select:hover{
  border-color:#C4956A;
}

.review-filter select:focus{
  outline:none;

  border-color:#C4956A;
}


.upload-skeleton{
  width:90px;
  height:90px;
  border:2px dashed #D9D1C8;
  border-radius:18px;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  cursor:pointer;
  color:#B2A79D;
  transition:.25s;
  background:#FAF7F3;
}

.upload-skeleton:hover{
  border-color:#C4956A;
  color:#C4956A;
  background:#FFF8F2;
}

.upload-skeleton span{
  margin-top:6px;
  font-size:.75rem;
  font-weight:600;
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
.recommend-box{
  margin-top:22px;

  padding:18px;

  width:100%;

  background:#FFF8F2;

  border:1px solid #F1D9C4;

  border-radius:18px;

  text-align:center;
}

.recommend-number{
  font-size:2rem;
  font-weight:700;
  color:#C4956A;
}

.recommend-text{
  margin-top:6px;

  color:#6B5C53;

  line-height:1.5;

  font-size:.95rem;
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

.review-toolbar{
  display:flex;
  justify-content:space-between;
  align-items:center;
  margin:40px 0 25px;
}

.sort-wrapper{
  position:relative;
}

.sort-btn{
  background:white;
  border:1px solid #E8DDD2;
  padding:12px 18px;
  border-radius:14px;
  cursor:pointer;
  font-weight:600;
  color:#3B1A08;
  transition:.25s;
}

.sort-btn:hover{
  border-color:#C4956A;
}

.sort-menu{
  position:absolute;
  top:55px;
  right:0;
  width:220px;
  background:white;
  border-radius:18px;
  overflow:hidden;
  box-shadow:0 20px 50px rgba(0,0,0,.12);
  z-index:100;
}

.sort-menu button{
  width:100%;
  text-align:left;
  padding:15px 18px;
  border:none;
  background:white;
  cursor:pointer;
  font-size:.95rem;
  transition:.2s;
}

.sort-menu button:hover{
  background:#FFF8F2;
}

.sort-menu button.active{
  background:#FFF4EA;
  color:#C4956A;
  font-weight:700;
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
  background: var(--surface);
  border: 1px solid #eee;
}

.instructions-input {
  width: 100%;
  min-height: 90px;
  border: none;
  outline: none;
  resize: none;
  background: transparent;
  font-family: inherit;
  font-size: 14px;
}

.character-count {
  text-align: right;
  font-size: 12px;
  color: #888;
}


.info-card:hover{
  transform:translateY(-5px);
  box-shadow:0 18px 35px rgba(0,0,0,.10);
}


.review-actions{
  display:flex;
  justify-content:space-between;
  align-items:center;
  margin-top:16px;
}

.review-owner-actions{
  display:flex;
  gap:10px;
}

.edit-review-btn,
.delete-review-btn{
  border:none;
  background:none;
  cursor:pointer;
  font-size:14px;
  color:#70645C;
  transition:.2s;
}

.edit-review-btn:hover{
  color:#C4956A;
}

.delete-review-btn:hover{
  color:#DE6B48;
}

.review-modal-overlay{
  position:fixed;
  inset:0;
  background:rgba(0,0,0,.45);

  display:flex;
  justify-content:center;
  align-items:center;

  z-index:9999;
}

.review-modal{
  width:min(92%,480px);

  background:#fff;

  border-radius:22px;

  padding:28px;
}

.review-modal h3{
  margin-top:0;
  margin-bottom:20px;
}

.review-modal-actions{
  display:flex;
  justify-content:flex-end;
  gap:12px;

  margin-top:20px;
}

.cancel-btn,
.save-btn{
  border:none;

  padding:10px 18px;

  border-radius:999px;

  cursor:pointer;

  font-weight:600;
}

.cancel-btn{
  background:#EFEAE3;
}

.save-btn{
  background:#C4956A;
  color:white;
}


.delete-modal{
  width:min(90%,420px);

  background:white;

  border-radius:22px;

  padding:30px;

  text-align:center;
}

.delete-icon{
  font-size:44px;

  margin-bottom:15px;
}

.delete-modal h3{
  margin-bottom:10px;
}

.delete-modal p{
  color:#70645C;

  margin-bottom:24px;
}

.delete-actions{
  display:flex;

  justify-content:center;

  gap:14px;
}

.delete-btn{
  background:#DE6B48;

  color:white;

  border:none;

  padding:11px 22px;

  border-radius:999px;

  cursor:pointer;

  font-weight:600;
}

.delete-btn:hover{
  background:#c95837;
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
        <div className= "product-container">
          <button className="back-button" onClick={() => setPage("menu")}>
            <ArrowLeft size={20} />
            Back to Menu
          </button>

          <div className="hero-section">
            {/* LEFT SIDE */}
            <div className="product-image">
              {product?.image ? (
  <img
    src={product.image}
    alt={product.name}
  />
) : (
  <div className="product-emoji">
    {product?.emoji || "☕"}
  </div>
)}
              <button
  className="favorite-btn"
  onClick={toggleFavorite}
>
  <Heart
    size={24}
    fill={favorite ? "#C4956A" : "none"}
    color="#C4956A"
  />
</button>





              
            </div>

            {/* RIGHT SIDE */}
            <div>
              {product.isBestSeller && (
  <div className="badge">BEST SELLER</div>
)}
              <h1 className="product-name">{product.name}</h1>

              <div className="rating">
  <Star size={20} fill="#C4956A" color="#C4956A" />

  <span>{averageRating}</span>

  <span style={{ color: "#9A8A80" }}>
    ({reviews.length} Reviews)
  </span>
</div>

              <p className="description">
                {product.desc}
              </p>

              <div className="product-info-grid">
                <div className="info-card">
                  <Clock3 size={22} />
                  <span>{product.prepTime}</span>
                </div>
                <div className="info-card">
                  <Flame size={22} />
                  <span>{product.servedAs}</span>
                </div>
                <div className="info-card">
                  <Leaf size={22} />
                  <span>{product.dietType}</span>
                </div>
                <div className="info-card">
                  <Star size={22} fill="#C4956A" color="#C4956A" />
                  <span>{product.salesCount}</span>
                </div>
              </div>

              <div className="price">₹{singlePrice}</div>

              {/* SIZE SELECTION SECTION */}
              <div className="option-section">
                <h2 className="option-title">Choose Your Size</h2>
                <div className="size-grid">
  {product.sizes?.map((item) => (
    <div
      key={item.name}
      className={`size-card ${
        size === item.name ? "active" : ""
      }`}
      onClick={() => setSize(item.name)}
    >
      <CupSoda className="cup-icon" />

      <div className="size-name">
        {item.name}
      </div>

      <div className="size-volume">
        {item.volume}
      </div>

      <div className="size-price">
  {item.price > 0
    ? `+₹${item.price}`
    : item.price < 0
      ? `-₹${Math.abs(item.price)}`
      : "No extra charge"}
</div>
    </div>
  ))}
</div>
</div>

              {/* MILK OPTIONS SECTION */}
             {product.milkOptions?.length > 0 && (
  <div className="option-section">
    <h2 className="option-title">
      Choose Your Milk
    </h2>

    <div className="milk-grid">
      {product.milkOptions.map((option) => (
        <div
          key={option.name}
          className={`milk-card ${
            milk === option.name ? "active" : ""
          }`}
          onClick={() => setMilk(option.name)}
        >
          <div className="milk-header">
            <div className="milk-emoji">
              {option.icon?.startsWith("http") ||
              option.icon?.startsWith("/") ? (
                <img
                  src={option.icon}
                  alt={option.name}
                  style={{
                    width: 30,
                    height: 30,
                    objectFit: "contain",
                  }}
                />
              ) : (
                <span
                  style={{
                    fontSize: 30,
                    lineHeight: 1,
                  }}
                >
                  {option.icon || "🥛"}
                </span>
              )}
            </div>

            <div>
              <div className="milk-name">
                {option.name}
              </div>

              <div className="milk-tagline">
                {option.description || ""}
              </div>
            </div>
          </div>

          <div className="milk-price">
            {Number(option.price) > 0
              ? `+₹${option.price}`
              : "Free"}
          </div>
        </div>
      ))}
    </div>
  </div>
)}


                <br />

              {/* TEMPERATURE SECTION */}
               {/* TEMPERATURE SECTION */}
{product.temperatureOptions?.length > 0 && (
  <div className="option-section">
    <h2 className="option-title">
      Temperature
    </h2>

    <div className="temperature-grid">
      {product.temperatureOptions.map((option) => (
        <div
          key={option.name}
          className={`temperature-card ${
            temperature === option.name ? "active" : ""
          }`}
          onClick={() => setTemperature(option.name)}
        >
          <div className="temperature-icon">
            {option.icon?.startsWith("http") ||
            option.icon?.startsWith("/") ? (
              <img
                src={option.icon}
                alt={option.name}
                style={{
                  width: 30,
                  height: 30,
                  objectFit: "contain",
                }}
              />
            ) : (
              option.icon || "🌡️"
            )}
          </div>

          <div>
            <div className="temperature-name">
              {option.name}
            </div>

            <div className="temperature-desc">
              {option.description || ""}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
)}
                
              {/* CUSTOM EXTRAS PANEL */}

                 {product.customExtras?.length > 0 && (
  <div className="option-section">
    <h2 className="option-title">
      Custom Extras
    </h2>

    <p className="option-subtitle">
      Choose up to{" "}
      {product.customExtrasMaxSelection || 3} extras
    </p>

    <div className="extras-grid">
      {product.customExtras.map((extra) => {
        const selected = selectedExtras.some(
          (item) => item.name === extra.name
        );

        return (
          <div
            key={extra.name}
            className={`extra-card ${
              selected ? "active" : ""
            }`}
            onClick={() => toggleExtra(extra)}
          >
            <div className="extra-left">
              <div className="extra-icon">
                {extra.icon?.startsWith("http") ||
                extra.icon?.startsWith("/") ? (
                  <img
                    src={extra.icon}
                    alt={extra.name}
                    style={{
                      width: 30,
                      height: 30,
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  extra.icon || "✨"
                )}
              </div>

              <div>
                <div className="extra-name">
                  {extra.name}
                </div>

                <div className="extra-desc">
                  {extra.description || ""}
                </div>
              </div>
            </div>

            <div className="extra-price">
              {extra.price > 0
                ? `+₹${extra.price}`
                : "Free"}
            </div>
          </div>
        );
      })}
    </div>
  </div>
)}



              {/* SWEETNESS SECTION */}

  {/* SWEETNESS SECTION */}
<div className="option-section">
  <h2 className="option-title">
    Sweetness Level
  </h2>

  {/* Sweetness Cards */}
  <div
    style={{
      display: "flex",
      gap: "12px",
      overflowX: "auto",
      paddingBottom: "10px",
      marginBottom: "22px",
      scrollbarWidth: "none",
      msOverflowStyle: "none",
    }}
  >
    {sweetnessOptions.map((option, index) => (
      <div
        key={option.name}
        onClick={() => setSweetnessIndex(index)}
        style={{
          minWidth: "120px",
          padding: "16px",
          borderRadius: "16px",
          border:
            sweetnessIndex === index
              ? "2px solid #C4956A"
              : "1px solid #E8DED4",
          background:
            sweetnessIndex === index
              ? "#FFF8F2"
              : "#FFFFFF",
          cursor: "pointer",
          transition: "all 0.25s ease",
          textAlign: "center",
          flexShrink: 0,
          boxShadow:
            sweetnessIndex === index
              ? "0 8px 20px rgba(196,149,106,.18)"
              : "0 2px 8px rgba(0,0,0,.04)",
        }}
      >
        <div
          style={{
            fontSize: "34px",
            marginBottom: "10px",
          }}
        >
          {option.icon?.startsWith("http") ||
          option.icon?.startsWith("/") ? (
            <img
              src={option.icon}
              alt={option.name}
              style={{
                width: 34,
                height: 34,
                objectFit: "contain",
              }}
            />
          ) : (
            option.icon || "🍬"
          )}
        </div>

        <div
          style={{
            fontWeight: 700,
            fontSize: "15px",
            color: "#2F1A09",
            marginBottom: "4px",
          }}
        >
          {option.name}
        </div>

        <div
          style={{
            fontSize: "12px",
            color: "#8A7564",
            lineHeight: 1.4,
          }}
        >
          {option.description}
        </div>
      </div>
    ))}
  </div>

  {/* Slider */}
  <ReactSlider
    className="sweetness-slider"
    thumbClassName="sweetness-thumb"
    trackClassName="sweetness-track"
    min={0}
    max={Math.max(sweetnessOptions.length - 1, 0)}
    step={1}
    value={sweetnessIndex}
    onChange={setSweetnessIndex}
    disabled={sweetnessOptions.length <= 1}
  />

  {/* Bottom Labels */}
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      marginTop: "14px",
      fontSize: "12px",
      color: "#8A7564",
      fontWeight: 600,
    }}
  >
    {sweetnessOptions.map((option, index) => (
      <span
        key={option.name}
        style={{
          color:
            sweetnessIndex === index
              ? "#C4956A"
              : "#8A7564",
          fontWeight:
            sweetnessIndex === index
              ? 700
              : 500,
          transition: "0.2s",
        }}
      >
        {option.name}
      </span>
    ))}
  </div>
</div>
        
  

  
                
              {/* SPECIAL INSTRUCTIONS SECTION */}
            {/* SPECIAL REQUESTS */}
<div className="option-section">
  <h2 className="option-title">
    Special Requests
  </h2>

  <div className="quick-request-grid">
    {quickRequests.map((request) => (
      <button
        key={request}
        type="button"
        className={
          instructions.includes(request)
            ? "quick-chip active"
            : "quick-chip"
        }
        onClick={() =>
          setInstructions((prev) =>
            prev
              ? `${prev}, ${request}`
              : request
          )
        }
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
      onChange={(e) =>
        setInstructions(e.target.value)
      }
    />

    <div className="character-count">
      {instructions.length} / 200
    </div>
  </div>
</div>

              {/* REVIEWS & FEEDBACK MODULE */}
              <div className="option-section">
  <h2 className="option-title">Customer Reviews</h2>

<div className="rating-summary-card">

  <div className="summary-left">

    <div className="summary-rating">
      {averageRating}
    </div>

    <div className="summary-stars">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          size={20}
          fill={
            index < Math.round(Number(averageRating))
              ? "#C4956A"
              : "none"
          }
          color="#C4956A"
        />
      ))}
    </div>

    <div className="summary-total">
      Based on {reviews.length} review
      {reviews.length !== 1 ? "s" : ""}
    </div>



    <div className="recommend-box">
  <div className="recommend-number">
    {recommendationPercentage}%
  </div>

  <div className="recommend-text">
    of customers recommend this drink
  </div>
</div>




    

  </div>

  <div className="summary-right">

    {[5,4,3,2,1].map((star)=>{

      const count = ratingBreakdown[star];

      const percentage =
        reviews.length === 0
          ? 0
          : (count / reviews.length) * 100;

      return (

        <div
          key={star}
          className="rating-row"
        >

          <span className="rating-label">
            {star}★
          </span>

          <div className="rating-bar">

            <div
              className="rating-fill"
              style={{
                width:`${percentage}%`
              }}
            />

          </div>

          <span className="rating-count">
            {count}
          </span>

        </div>

      );

    })}

  </div>

</div>



                
       {customerPhotos.length > 0 && (
  <div className="customer-gallery">

    <div className="gallery-header">
      <h3>Customer Photos</h3>

      <span>
        {customerPhotos.length} photo
        {customerPhotos.length !== 1 ? "s" : ""}
      </span>
    </div>

    <div className="gallery-grid">
      {customerPhotos.map((photo, index) => (
        <img
          key={index}
          src={photo.image}
          alt=""
          className="gallery-photo"
          onClick={() => setSelectedReviewImage(image)}    
        />
      ))}
    </div>

  </div>
)}         



                
  <div className="write-review-card">
    <h3 className="write-title">Share Your Experience</h3>

    <p className="write-subtitle">
      Tell other coffee lovers what you thought.
    </p>

    {/* Rating */}
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

    {/* Review Text */}
    <textarea
      className="review-input"
      placeholder="How was your drink today?"
      value={reviewText}
      onChange={(e) => setReviewText(e.target.value)}
    />

    {/* Hidden Upload Input */}
    <input
      id="review-photo-input"
      type="file"
      accept="image/*"
      multiple
      hidden
      onChange={handleReviewImages}
    />

    {/* Upload Grid */}
    <div className="preview-grid">
      {/* Uploaded Images */}
      {reviewImages.map((file, index) => (
        <div
          key={index}
          className="preview-item"
        >
          <img
            src={URL.createObjectURL(file)}
            alt=""
            className="preview-photo"
          />

          <button
            type="button"
            className="remove-photo-btn"
            onClick={() =>
              setReviewImages(
                reviewImages.filter((_, i) => i !== index)
              )
            }
          >
            <X size={16} />
          </button>
        </div>
      ))}

      {/* Empty Upload Slots */}
      {Array.from({
        length: Math.max(0, 5 - reviewImages.length),
      }).map((_, index) => (
        <label
          key={`slot-${index}`}
          htmlFor="review-photo-input"
          className="upload-skeleton"
        >
          <ImagePlus size={30} />
        </label>
      ))}
    </div>

    <p className="upload-hint">
      Upload up to 5 photos (optional)
    </p>

    <button
      type="button"
      className="submit-review"
      onClick={submitReview}
    >
      Post Review
    </button>
  </div>



                
                
                <div className="review-toolbar">

  <h3>
    {sortedReviews.length} Reviews
  </h3>

  <div
    style={{
      display: "flex",
      gap: "12px",
      alignItems: "center",
    }}
  >

    {/* Filter */}

    <div className="sort-wrapper">

      <button
        className="sort-btn"
        onClick={() =>
          setShowFilterMenu(!showFilterMenu)
        }
      >
        Filter
      </button>

      {showFilterMenu && (
        <div className="sort-menu">

          <button
            className={reviewFilter === "all" ? "active" : ""}
            onClick={() => {
              setReviewFilter("all");
              setShowFilterMenu(false);
            }}
          >
            ○ All Reviews
          </button>

          <button
            className={reviewFilter === "photos" ? "active" : ""}
            onClick={() => {
              setReviewFilter("photos");
              setShowFilterMenu(false);
            }}
          >
            📷 With Photos
          </button>

          <button
            className={reviewFilter === "verified" ? "active" : ""}
            onClick={() => {
              setReviewFilter("verified");
              setShowFilterMenu(false);
            }}
          >
            ✔ Verified Purchase
          </button>

          <button
            className={reviewFilter === "5" ? "active" : ""}
            onClick={() => {
              setReviewFilter("5");
              setShowFilterMenu(false);
            }}
          >
            ⭐⭐⭐⭐⭐ 5 Stars
          </button>

          <button
            className={reviewFilter === "4" ? "active" : ""}
            onClick={() => {
              setReviewFilter("4");
              setShowFilterMenu(false);
            }}
          >
            ⭐⭐⭐⭐ 4 Stars
          </button>

          <button
            className={reviewFilter === "3" ? "active" : ""}
            onClick={() => {
              setReviewFilter("3");
              setShowFilterMenu(false);
            }}
          >
            ⭐⭐⭐ 3 Stars
          </button>

          <button
            className={reviewFilter === "2" ? "active" : ""}
            onClick={() => {
              setReviewFilter("2");
              setShowFilterMenu(false);
            }}
          >
            ⭐⭐ 2 Stars
          </button>

          <button
            className={reviewFilter === "1" ? "active" : ""}
            onClick={() => {
              setReviewFilter("1");
              setShowFilterMenu(false);
            }}
          >
            ⭐ 1 Star
          </button>

        </div>
      )}

    </div>

    {/* Sort */}

    <div className="sort-wrapper">

      <button
        className="sort-btn"
        onClick={() =>
          setShowSortMenu(!showSortMenu)
        }
      >
        Sort by
      </button>

      {showSortMenu && (
        <div className="sort-menu">

         
          <button
  className={reviewSort === "helpful" ? "active" : ""}
  onClick={() => {
    setReviewSort("helpful");
    setShowSortMenu(false);
  }}
>
  ○ Most Helpful
</button>
          
          
          
          
          <button
            className={reviewSort === "newest" ? "active" : ""}
            onClick={() => {
              setReviewSort("newest");
              setShowSortMenu(false);
            }}
          >
            ○ Newest
          </button>

          <button
            className={reviewSort === "highest" ? "active" : ""}
            onClick={() => {
              setReviewSort("highest");
              setShowSortMenu(false);
            }}
          >
            ○ Highest Rated
          </button>

          <button
            className={reviewSort === "lowest" ? "active" : ""}
            onClick={() => {
              setReviewSort("lowest");
              setShowSortMenu(false);
            }}
          >
            ○ Lowest Rated
          </button>

          <button
            className={reviewSort === "oldest" ? "active" : ""}
            onClick={() => {
              setReviewSort("oldest");
              setShowSortMenu(false);
            }}
          >
            ○ Oldest
          </button>

        </div>
      )}

    </div>

  </div>

</div>
    




                
  {/* Existing Reviews */}
  <div className="reviews-list">
    {sortedReviews.map((rev) => (
      <div
        key={rev.id}
        className="review-card"
      >
        <div className="review-header">
          <div className="review-user">
            <div className="review-avatar">
              {rev.name?.charAt(0).toUpperCase()}
            </div>

            <div>
              <div className="review-name">
                {rev.name}
              </div>

              <div className="review-stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={16}
                    fill={star <= rev.rating ? "#C4956A" : "none"}
                    color="#C4956A"
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="review-date">
  {rev.createdAt?.toDate
    ? rev.createdAt.toDate().toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "Just now"}
</div>
          </div>

        <div className="review-name-row">
  <div className="review-name">
    {rev.name}
  </div>

  {rev.verifiedPurchase && (
  <div className="verified-badge">
    <BadgeCheck size={15} />
    Verified Purchase
  </div>
)}
</div>

{rev.images?.length > 0 && (
  <div className="review-photo-grid">
    {rev.images.map((image, index) => (
      <img
        key={index}
        src={image}
        alt={`Review ${index + 1}`}
        className="review-photo"
        loading="lazy"
        onClick={() => setSelectedReviewImage(image)}    
      />
    ))}
  </div>
)}

<div className="review-actions">
  <button
    type="button"
    className="helpful-btn"
    onClick={() => markHelpful(rev.id)}
  >
    <ThumbsUp size={16} />

    Helpful

    {rev.helpfulCount > 0 && (
      <span>({rev.helpfulCount})</span>
    )}
  </button>

  {currentUser?.uid === rev.userId && (
    <div className="review-owner-actions">
      <button
        type="button"
        className="edit-review-btn"
        onClick={() => {
          setEditingReview(rev.id);
          setEditText(rev.text);
          setEditRating(rev.rating);
        }}
      >
        ✏ Edit
      </button>

      <button
        type="button"
        className="delete-review-btn"
        onClick={() => {
          setReviewToDelete(rev.id);
          setShowDeleteModal(true);
        }}
      >
        🗑 Delete
      </button>
    </div>
  )}
</div>

</div>
))}
</div>
</div>



{/* EDIT MODAL*/}

{editingReview && (
  <div
    className="review-modal-overlay"
    onClick={() => setEditingReview(null)}
  >
    <div
      className="review-modal"
      onClick={(e) => e.stopPropagation()}
    >
      <h3>Edit Review</h3>

      <div className="star-picker">
        {[1,2,3,4,5].map((star)=>(
          <Star
            key={star}
            size={28}
            fill={star <= editRating ? "#C4956A" : "none"}
            color="#C4956A"
            onClick={() => setEditRating(star)}
            style={{cursor:"pointer"}}
          />
        ))}
      </div>

      <textarea
        className="review-input"
        value={editText}
        onChange={(e)=>setEditText(e.target.value)}
      />

      <div className="review-modal-actions">

        <button
          type="button"
          className="cancel-btn"
          onClick={() => setEditingReview(null)}
        >
          Cancel
        </button>

        <button
          type="button"
          className="save-btn"
          onClick={updateReview}
        >
          Save Changes
        </button>

      </div>
    </div>
  </div>
)}



     {/* DELETE  MODAL*/}         

{showDeleteModal && (
  <div
    className="review-modal-overlay"
    onClick={() => setShowDeleteModal(false)}
  >
    <div
      className="delete-modal"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="delete-icon">
        🗑️
      </div>

      <h3>Delete Review?</h3>

      <p>
        This action cannot be undone.
      </p>

      <div className="delete-actions">

        <button
          type="button"
          className="cancel-btn"
          onClick={() => {
            setShowDeleteModal(false);
            setReviewToDelete(null);
          }}
        >
          Cancel
        </button>

        <button
          type="button"
          className="delete-btn"
          onClick={deleteReview}
        >
          Delete Review
        </button>

      </div>
    </div>
  </div>
)}


              
              

{/* LIGHTBOX TRACKER */}


{selectedReviewImage && (
  <div
    className="review-lightbox"
    onClick={() => setSelectedReviewImage(null)}
  >
    <button
      type="button"
      className="lightbox-close"
      onClick={() => setSelectedReviewImage(null)}
    >
      <X size={28} />
    </button>

    <img
      src={selectedReviewImage}
      className="lightbox-image"
      alt=""
      onClick={(e) => e.stopPropagation()}
    />
  </div>
)}



              
                         
              
              {/* PERSISTENT BAR TRACKER */}
          <div className="sticky-order-bar">
            <div className="sticky-left">
              <div className="sticky-product-name">{product.name}</div>
              <div className="sticky-summary">
                {size} • {milk} {toppings.length > 0 && ` • ${toppings.join(", ")}`}
              </div>
            </div>

            <div className="sticky-right">
              {currentUser && (
                <div className="quantity-selector">
                  <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
                  <span>{quantity}</span>
                  <button type="button" onClick={() => setQuantity(quantity + 1)}>+</button>
                </div>
              )}

              <button 
                className="sticky-cart-button" 
                onClick={currentUser ? handleAddToCart : () => setPage("login")}
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
      </div>
          
      {toast && (
      <div className="toast">
        ⚠️ {toast}
      </div>
    )}
       </div> 
    </>
  );
}
