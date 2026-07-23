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
  ImagePlus,
  X,
  BadgeCheck,
  ThumbsUp
} from "lucide-react";

export default function ProductPage({
  setPage,
  product,
}) {
  const [favorite, setFavorite] = useState(false);
  const [size, setSize] = useState(product?.sizes?.[0]?.name || "");
  const [milk, setMilk] = useState("");
  const [toppings, setToppings] = useState([]);
  const [temperature, setTemperature] = useState("Hot");
  const [sweetnessIndex, setSweetnessIndex] = useState(0);
  const [instructions, setInstructions] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewImages, setReviewImages] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [selectedExtras, setSelectedExtras] = useState([]);
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
      } catch (err) {
        console.error("Failed loading requests:", err);
      }
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
  
  const basePrice = Number(product?.price || 0);
  const selectedSize = product?.sizes?.find(s => s.name === size);
  const sizePrice = Number(selectedSize?.price || 0);
  
  const milkPrices = Object.fromEntries(
    (product?.milkOptions || []).map((m) => [
      m.name,
      Number(m.price || 0),
    ])
  );
  const milkPrice = milkPrices[milk] || 0;

  const extrasTotal = selectedExtras.reduce(
    (sum, extra) => sum + Number(extra.price || 0),
    0
  );
  
  const singlePrice = basePrice + sizePrice + milkPrice + extrasTotal;
  const totalPrice = singlePrice * quantity;

  const MAX_REVIEW_PHOTOS = 5;

  const handleReviewImages = (e) => {
    const files = Array.from(e.target.files);
    const updatedImages = [...reviewImages, ...files];

    if (updatedImages.length > MAX_REVIEW_PHOTOS) {
      showToast(`You can upload up to ${MAX_REVIEW_PHOTOS} photos.`);
    }

    setReviewImages(updatedImages.slice(0, MAX_REVIEW_PHOTOS));
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

    if (!reviewText.trim() && reviewImages.length === 0) {
      showToast("Please write a review or upload photos.");
      return;
    }

    try {
      const uploadedImages = await uploadReviewImages();
      
      const purchaseQuery = query(
        collection(db, "orders"),
        where("userId", "==", currentUser.uid),
        where("items", "array-contains", product.id)
      );
      
      const purchaseSnapshot = await getDocs(purchaseQuery);
      const verifiedPurchase = !purchaseSnapshot.empty;

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
      showToast("Review posted successfully!");
    } catch (error) {
      console.error("Failed to submit review:", error);
      showToast(error.message);
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

      await setDoc(helpfulRef, { votedAt: serverTimestamp() });
      await updateDoc(doc(db, "reviews", reviewId), {
        helpfulCount: increment(1),
      });

      setReviews((prev) =>
        prev.map((review) =>
          review.id === reviewId
            ? { ...review, helpfulCount: (review.helpfulCount || 0) + 1 }
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
            ? { ...review, text: editText, rating: editRating, edited: true }
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
      setReviews((prev) => prev.filter((review) => review.id !== reviewToDelete));
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
      size,
      milk,
      toppings,
      temperature,
      sweetness: selectedSweetness,
      instructions,
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
      const favRef = doc(db, "users", currentUser.uid, "favorites", product.id);
      if (favorite) {
        await deleteDoc(favRef);
        setFavorite(false);
        showToast("Removed from wishlist");
      } else {
        await setDoc(favRef, { ...product, addedAt: serverTimestamp() });
        setFavorite(true);
        showToast("Added to wishlist ❤️");
      }
    } catch (err) {
      console.error(err);
      showToast("Something went wrong.");
    }
  };

  function showToast(message) {
    setToast(message);
    setTimeout(() => {
      setToast("");
    }, 2500);
  }

  function toggleExtra(extra) {
    const alreadySelected = selectedExtras.some((item) => item.name === extra.name);
    if (alreadySelected) {
      setSelectedExtras(selectedExtras.filter((item) => item.name !== extra.name));
      return;
    }

    const max = product.customExtrasMaxSelection || 3;
    if (selectedExtras.length >= max) {
      showToast(`You can select up to ${max} extras.`);
      return;
    }

    setSelectedExtras([...selectedExtras, extra]);
  }

  const filteredReviews = reviews.filter((review) => {
    switch (reviewFilter) {
      case "photos": return review.images?.length > 0;
      case "verified": return review.verifiedPurchase === true;
      case "5": case "4": case "3": case "2": case "1":
        return review.rating === Number(reviewFilter);
      default: return true;
    }
  });

  const sortedReviews = [...filteredReviews].sort((a, b) => {
    switch (reviewSort) {
      case "highest": return b.rating - a.rating;
      case "lowest": return a.rating - b.rating;
      case "oldest": return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
      case "helpful": return (b.helpfulCount || 0) - (a.helpfulCount || 0);
      case "newest":
      default:
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
    }
  });

  const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach((review) => {
    if (ratingBreakdown[review.rating] !== undefined) {
      ratingBreakdown[review.rating]++;
    }
  });

  const recommendationPercentage = reviews.length === 0
    ? 0
    : Math.round(
        (reviews.filter((r) => r.rating >= 4).length / reviews.length) * 100
      );
  
  const customerPhotos = reviews.flatMap((review) =>
    (review.images || []).map((imgUrl) => ({
      image: imgUrl,
      reviewer: review.name,
      rating: review.rating,
    }))
  );

  if (!product) {
    return (
      <div style={{ padding: 40 }}>
        <h2>No product selected.</h2>
        <button onClick={() => setPage("menu")}>Back to Menu</button>
      </div>
    );
  }

  return (
    <>
      <style>{`
        *{box-sizing:border-box;}
        body{margin:0;background:#FDFAF5;font-family:'Inter',sans-serif;}
        .product-page{min-height:100vh;background:#FDFAF5;padding:50px 24px 140px;}
        .product-container{max-width:1200px;margin:auto;}
        .back-button{display:flex;align-items:center;gap:8px;background:none;border:none;color:#3B1A08;font-size:16px;font-weight:600;cursor:pointer;margin-bottom:28px;transition:.3s;}
        .back-button:hover{color:#C4956A;transform:translateX(-5px);}
        .hero-section{display:grid;grid-template-columns:1fr 1fr;gap:50px;align-items:flex-start;}
        .product-image{position:relative;border-radius:30px;overflow:hidden;background:#F4ECE4;box-shadow:0 20px 50px rgba(0,0,0,.08);}
        .product-image img{width:100%;height:520px;object-fit:cover;display:block;}
        .favorite-btn{position:absolute;top:20px;right:20px;width:52px;height:52px;border:none;border-radius:50%;background:white;display:flex;justify-content:center;align-items:center;cursor:pointer;box-shadow:0 8px 20px rgba(0,0,0,.12);transition:.3s;}
        .favorite-btn:hover{transform:scale(1.08);}
        .size-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
        .size-card, .temperature-card{background:white;border:2px solid transparent;border-radius:22px;padding:22px;cursor:pointer;transition:all .3s ease;box-shadow:0 12px 30px rgba(0,0,0,.06);position:relative;}
        .size-card:hover, .temperature-card:hover{transform:translateY(-5px);box-shadow:0 20px 40px rgba(0,0,0,.10);}
        .size-card.active, .temperature-card.active{background:#FFF8F2;border-color:#C4956A;}
        .cup-icon{color:#C4956A;margin-bottom:12px;width:32px;height:32px;}
        .temperature-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px;}
        .temperature-icon{font-size:2rem;margin-bottom:8px;}
        .temperature-name{font-size:1.1rem;font-weight:700;color:#3B1A08;margin-bottom:4px;}
        .temperature-desc{color:#8D7B70;font-size:.9rem;}
        .toast {position: fixed;bottom: 30px;left: 50%;transform: translateX(-50%);background: #3B1A08;color: white;padding: 12px 20px;border-radius: 12px;z-index: 9999;}
        .verified-badge{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;background:#E8F7EC;color:#2E7D32;font-size:.75rem;font-weight:700;border:1px solid #BFE5C7;}
        .preview-item{position:relative;width:90px;height:90px;}
        .remove-photo-btn{position:absolute;top:-6px;right:-6px;width:24px;height:24px;border:none;border-radius:50%;background:#3B1A08;color:white;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:.2s;}
        .quick-request-grid{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:22px;}
        .quick-chip{padding:10px 16px;background:white;border:2px solid #EFE5DB;border-radius:999px;cursor:pointer;font-weight:600;font-size:.95rem;color:#6B5C53;transition:.25s;box-shadow:0 8px 20px rgba(0,0,0,.05);}
        .quick-chip.active{background:#C4956A;border-color:#C4956A;color:white;}
        .instructions-card{background:white;border-radius:24px;padding:24px;box-shadow:0 12px 30px rgba(0,0,0,.06);}
        .instructions-input{width:100%;min-height:140px;border:none;outline:none;resize:vertical;padding:18px;border-radius:18px;background:#FDF9F4;font-family:'Inter',sans-serif;font-size:1rem;line-height:1.7;color:#3B1A08;}
        .customer-gallery{background:white;border-radius:24px;padding:28px;margin-bottom:35px;box-shadow:0 12px 30px rgba(0,0,0,.06);}
        .gallery-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;}
        .gallery-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:14px;}
        .gallery-photo{width:100%;aspect-ratio:1;object-fit:cover;border-radius:18px;cursor:pointer;transition:.25s;}
        .rating-summary-card{display:grid;grid-template-columns:260px 1fr;gap:40px;background:white;border-radius:24px;padding:30px;margin-bottom:35px;box-shadow:0 12px 30px rgba(0,0,0,.06);}
        .summary-left{display:flex;flex-direction:column;align-items:center;justify-content:center;}
        .summary-rating{font-size:4rem;font-weight:700;color:#3B1A08;}
        .summary-stars{display:flex;gap:4px;margin:10px 0;}
        .summary-total{color:#8D7B70;text-align:center;}
        .summary-right{display:flex;flex-direction:column;gap:14px;}
        .rating-row{display:flex;align-items:center;gap:14px;}
        .rating-label{width:32px;font-weight:700;color:#3B1A08;}
        .rating-bar{flex:1;height:10px;background:#EFE5DB;border-radius:999px;overflow:hidden;}
        .rating-fill{height:100%;background:#C4956A;border-radius:999px;}
        .rating-count{width:28px;text-align:right;color:#8D7B70;}
        .review-actions{margin-top:16px;display:flex;justify-content:space-between;align-items:center;}
        .helpful-btn{display:flex;align-items:center;gap:8px;padding:8px 14px;background:#fff;border:1px solid #E6DFD5;border-radius:999px;cursor:pointer;font-size:14px;}
        .review-lightbox{position:fixed;inset:0;background:rgba(0,0,0,.9);display:flex;align-items:center;justify-content:center;z-index:9999;}
        .lightbox-image{max-width:90%;max-height:90%;border-radius:18px;}
        .lightbox-close{position:absolute;top:24px;right:24px;width:44px;height:44px;border:none;border-radius:50%;background:white;cursor:pointer;}
        .upload-skeleton{width:90px;height:90px;border:2px dashed #D9D1C8;border-radius:18px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;color:#B2A79D;background:#FAF7F3;}
        .recommend-box{margin-top:22px;padding:18px;width:100%;background:#FFF8F2;border:1px solid #F1D9C4;border-radius:18px;text-align:center;}
        .recommend-number{font-size:2rem;font-weight:700;color:#C4956A;}
        .recommend-text{margin-top:6px;color:#6B5C53;font-size:.95rem;}
        .preview-grid{display:grid;grid-template-columns:repeat(auto-fill,90px);gap:12px;margin-bottom:20px;}
        .preview-photo{width:90px;height:90px;border-radius:18px;object-fit:cover;}
        .review-photo-grid{display:grid;grid-template-columns:repeat(auto-fill,110px);gap:14px;margin-top:18px;}
        .review-photo{width:110px;height:110px;border-radius:18px;object-fit:cover;}
        .character-count{margin-top:6px;text-align:right;color:#8D7B70;font-size:.85rem;}
        .badge{display:inline-block;padding:8px 18px;border-radius:999px;background:#F4E1CF;color:#8B5E34;font-weight:700;font-size:.85rem;margin-bottom:18px;}
        .milk-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px;}
        .milk-card{display:flex;justify-content:space-between;align-items:center;background:white;border:2px solid transparent;border-radius:22px;padding:22px 24px;cursor:pointer;box-shadow:0 12px 30px rgba(0,0,0,.06);}
        .milk-card.active{background:#FFF8F2;border-color:#C4956A;}
        .milk-header{display:flex;align-items:center;gap:16px;}
        .milk-emoji{font-size:2rem;width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:#F6ECE1;border-radius:16px;}
        .milk-name{font-size:1.08rem;font-weight:700;color:#3B1A08;margin-bottom:6px;}
        .milk-price{font-weight:700;color:#C4956A;}
        .product-name{font-family:'Playfair Display',serif;font-size:3rem;color:#3B1A08;margin-bottom:14px;}
        .rating{display:flex;align-items:center;gap:10px;color:#8B5E34;font-weight:600;margin-bottom:20px;}
        .description{color:#6B5C53;line-height:1.8;font-size:1.05rem;margin-bottom:28px;}
        .price{font-size:2.2rem;font-weight:700;color:#3B1A08;margin-bottom:20px;}
        .option-section{margin-top:45px;}
        .option-title{font-family:'Playfair Display',serif;color:#3B1A08;font-size:1.8rem;margin-bottom:18px;}
        .write-review-card{background:white;border-radius:24px;padding:32px;box-shadow:0 12px 30px rgba(0,0,0,.06);margin-bottom:30px;}
        .write-title{font-family:'Playfair Display',serif;font-size:1.5rem;color:#3B1A08;margin-bottom:6px;}
        .write-subtitle{color:#7A675C;margin-bottom:25px;}
        .star-picker{display:flex;gap:10px;margin-bottom:25px;}
        .review-input{width:100%;min-height:140px;border:none;outline:none;resize:vertical;background:#FDF9F4;border-radius:20px;padding:18px;font-family:'Inter',sans-serif;font-size:1rem;margin-bottom:20px;}
        .submit-review{background:#3B1A08;color:white;border:none;padding:16px 32px;border-radius:14px;font-size:1rem;font-weight:700;cursor:pointer;width:100%;}
        .reviews-list{display:flex;flex-direction:column;gap:25px;margin-top:20px;}
        .review-card{background:white;border-radius:24px;padding:24px;box-shadow:0 12px 35px rgba(0,0,0,.07);}
        .review-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;}
        .review-user{display:flex;align-items:center;gap:16px;}
        .review-avatar{width:56px;height:56px;border-radius:50%;background:#F6ECE1;display:flex;align-items:center;justify-content:center;font-weight:700;color:#3B1A08;}
        .review-name{font-weight:700;color:#3B1A08;}
        .review-date{color:#9A8A80;font-size:.9rem;}
        .product-info-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:35px;}
        .sticky-order-bar{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);width:min(94%,1000px);background:white;border-radius:28px;padding:18px 24px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 18px 50px rgba(0,0,0,.15);z-index:999;}
        .sticky-left{display:flex;flex-direction:column;gap:6px;}
        .sticky-product-name{font-size:1.2rem;font-weight:700;color:#3B1A08;}
        .sticky-summary{font-size:.95rem;color:#8A786D;}
        .sticky-right{display:flex;align-items:center;gap:18px;}
        .quantity-selector{display:flex;align-items:center;background:#F6ECE1;border-radius:999px;padding:6px;gap:12px;}
        .quantity-selector button{width:34px;height:34px;border:none;border-radius:50%;background:white;cursor:pointer;}
        .sticky-cart-button{display:flex;align-items:center;gap:16px;border:none;background:#C4956A;color:white;padding:15px 24px;border-radius:999px;font-weight:700;cursor:pointer;}
        .info-card{background:white;border-radius:18px;padding:18px;display:flex;align-items:center;gap:12px;font-weight:600;color:#3B1A08;box-shadow:0 10px 25px rgba(0,0,0,.06);}
        .extras-grid{display:grid;gap:18px;}
        .extra-card{display:flex;justify-content:space-between;align-items:center;padding:22px 24px;background:white;border:2px solid transparent;border-radius:22px;cursor:pointer;box-shadow:0 12px 30px rgba(0,0,0,.06);}
        .extra-card.active{border-color:#C4956A;background:#FFF8F2;}
        .extra-left{display:flex;align-items:center;gap:18px;}
        .extra-icon{width:52px;height:52px;border-radius:16px;background:#F6ECE1;display:flex;justify-content:center;align-items:center;}
        .review-toolbar{display:flex;justify-content:space-between;align-items:center;margin:40px 0 25px;}
        .sort-wrapper{position:relative;}
        .sort-btn{background:white;border:1px solid #E8DDD2;padding:12px 18px;border-radius:14px;cursor:pointer;font-weight:600;}
        .sort-menu{position:absolute;top:55px;right:0;width:220px;background:white;border-radius:18px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,.12);z-index:100;}
        .sort-menu button{width:100%;text-align:left;padding:15px 18px;border:none;background:white;cursor:pointer;}
        .sweetness-slider{width:100%;height:12px;margin:20px 0;}
        .sweetness-track{top:4px;height:6px;border-radius:999px;background:#E8DED3;}
        .sweetness-thumb{width:24px;height:24px;border-radius:50%;background:#C4956A;border:3px solid #fff;cursor:grab;outline:none;top:-6px;}
        .review-owner-actions{display:flex;gap:10px;}
        .edit-review-btn, .delete-review-btn{border:none;background:none;cursor:pointer;font-size:14px;color:#70645C;}
        .review-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;justify-content:center;align-items:center;z-index:9999;}
        .review-modal{width:min(92%,480px);background:#fff;border-radius:22px;padding:28px;}
        .review-modal-actions{display:flex;justify-content:flex-end;gap:12px;margin-top:20px;}
        .cancel-btn, .save-btn, .delete-btn{border:none;padding:10px 18px;border-radius:999px;cursor:pointer;font-weight:600;}
        .cancel-btn{background:#EFEAE3;}
        .save-btn{background:#C4956A;color:white;}
        .delete-modal{width:min(90%,420px);background:white;border-radius:22px;padding:30px;text-align:center;}
        .delete-btn{background:#DE6B48;color:white;}
      `}</style>

      <div className="product-page">
        <div className="product-container">
          <button className="back-button" onClick={() => setPage("menu")}>
            <ArrowLeft size={20} />
            Back to Menu
          </button>

          <div className="hero-section">
            <div className="product-image">
              {product?.image ? (
                <img src={product.image} alt={product.name} />
              ) : (
                <div className="product-emoji">{product?.emoji || "☕"}</div>
              )}
              <button className="favorite-btn" onClick={toggleFavorite}>
                <Heart size={24} fill={favorite ? "#C4956A" : "none"} color="#C4956A" />
              </button>
            </div>

            <div>
              {product.isBestSeller && <div className="badge">BEST SELLER</div>}
              <h1 className="product-name">{product.name}</h1>

              <div className="rating">
                <Star size={20} fill="#C4956A" color="#C4956A" />
                <span>{averageRating}</span>
                <span style={{ color: "#9A8A80" }}>({reviews.length} Reviews)</span>
              </div>

              <p className="description">{product.desc}</p>

              <div className="product-info-grid">
                <div className="info-card"><Clock3 size={22} /><span>{product.prepTime}</span></div>
                <div className="info-card"><Flame size={22} /><span>{product.servedAs}</span></div>
                <div className="info-card"><Leaf size={22} /><span>{product.dietType}</span></div>
                <div className="info-card"><Star size={22} fill="#C4956A" color="#C4956A" /><span>{product.salesCount}</span></div>
              </div>

              <div className="price">₹{singlePrice}</div>

              {product.sizes?.length > 0 && (
                <div className="option-section">
                  <h2 className="option-title">Choose Your Size</h2>
                  <div className="size-grid">
                    {product.sizes.map((item) => (
                      <div
                        key={item.name}
                        className={`size-card ${size === item.name ? "active" : ""}`}
                        onClick={() => setSize(item.name)}
                      >
                        <CupSoda className="cup-icon" />
                        <div className="size-name">{item.name}</div>
                        <div className="size-volume">{item.volume}</div>
                        <div className="size-price">
                          {item.price > 0 ? `+₹${item.price}` : item.price < 0 ? `-₹${Math.abs(item.price)}` : "No extra charge"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {product.milkOptions?.length > 0 && (
                <div className="option-section">
                  <h2 className="option-title">Choose Your Milk</h2>
                  <div className="milk-grid">
                    {product.milkOptions.map((option) => (
                      <div
                        key={option.name}
                        className={`milk-card ${milk === option.name ? "active" : ""}`}
                        onClick={() => setMilk(option.name)}
                      >
                        <div className="milk-header">
                          <div className="milk-emoji">
                            {option.icon?.startsWith("http") ? (
                              <img src={option.icon} alt={option.name} style={{ width: 30, height: 30, objectFit: "contain" }} />
                            ) : (
                              option.icon || "🥛"
                            )}
                          </div>
                          <div>
                            <div className="milk-name">{option.name}</div>
                            <div className="milk-tagline">{option.description || ""}</div>
                          </div>
                        </div>
                        <div className="milk-price">{option.price > 0 ? `+₹${option.price}` : "Free"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {product.temperatureOptions?.length > 0 && (
                <div className="option-section">
                  <h2 className="option-title">Temperature</h2>
                  <div className="temperature-grid">
                    {product.temperatureOptions.map((option) => (
                      <div
                        key={option.name}
                        className={`temperature-card ${temperature === option.name ? "active" : ""}`}
                        onClick={() => setTemperature(option.name)}
                      >
                        <div className="temperature-icon">
                          {option.icon?.startsWith("http") || option.icon?.startsWith("/") ? (
                            <img src={option.icon} alt={option.name} style={{ width: 30, height: 30, objectFit: "contain" }} />
                          ) : (
                            option.icon || "🌡️"
                          )}
                        </div>
                        <div>
                          <div className="temperature-name">{option.name}</div>
                          <div className="temperature-desc">{option.description || ""}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {product.customExtras?.length > 0 && (
                <div className="option-section">
                  <h2 className="option-title">Custom Extras</h2>
                  <div className="extras-grid">
                    {product.customExtras.map((extra) => {
                      const selected = selectedExtras.some((item) => item.name === extra.name);
                      return (
                        <div
                          key={extra.name}
                          className={`extra-card ${selected ? "active" : ""}`}
                          onClick={() => toggleExtra(extra)}
                        >
                          <div className="extra-left">
                            <div className="extra-icon">
                              {extra.icon?.startsWith("http") || extra.icon?.startsWith("/") ? (
                                <img src={extra.icon} alt={extra.name} style={{ width: 30, height: 30, objectFit: "contain" }} />
                              ) : (
                                extra.icon || "✨"
                              )}
                            </div>
                            <div>
                              <div className="extra-name">{extra.name}</div>
                              <div className="extra-desc">{extra.description || ""}</div>
                            </div>
                          </div>
                          <div className="extra-price">{extra.price > 0 ? `+₹${extra.price}` : "Free"}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {sweetnessOptions.length > 0 && (
                <div className="option-section">
                  <h2 className="option-title">Sweetness Level</h2>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 15 }}>
                      <div style={{ fontSize: 28, width: 34, textAlign: "center" }}>
                        {selectedSweetness?.icon || "🍬"}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700 }}>{selectedSweetness?.name}</div>
                        <div className="sweetness-desc">{selectedSweetness?.description}</div>
                      </div>
                    </div>
                  </div>
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
                </div>
              )}

              <div className="option-section">
                <h2 className="option-title">Special Requests</h2>
                <div className="quick-request-grid">
                  {quickRequests.map((request) => (
                    <button
                      key={request}
                      type="button"
                      className={instructions.includes(request) ? "quick-chip active" : "quick-chip"}
                      onClick={() =>
                        setInstructions((prev) => (prev ? `${prev}, ${request}` : request))
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
                    onChange={(e) => setInstructions(e.target.value)}
                  />
                  <div className="character-count">{instructions.length} / 200</div>
                </div>
              </div>

              <div className="option-section">
                <h2 className="option-title">Customer Reviews</h2>

                <div className="rating-summary-card">
                  <div className="summary-left">
                    <div className="summary-rating">{averageRating}</div>
                    <div className="summary-stars">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={index}
                          size={20}
                          fill={index < Math.round(Number(averageRating)) ? "#C4956A" : "none"}
                          color="#C4956A"
                        />
                      ))}
                    </div>
                    <div className="summary-total">Based on {reviews.length} review{reviews.length !== 1 ? "s" : ""}</div>
                    <div className="recommend-box">
                      <div className="recommend-number">{recommendationPercentage}%</div>
                      <div className="recommend-text">of customers recommend this drink</div>
                    </div>
                  </div>

                  <div className="summary-right">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = ratingBreakdown[star];
                      const percentage = reviews.length === 0 ? 0 : (count / reviews.length) * 100;
                      return (
                        <div key={star} className="rating-row">
                          <span className="rating-label">{star}★</span>
                          <div className="rating-bar">
                            <div className="rating-fill" style={{ width: `${percentage}%` }} />
                          </div>
                          <span className="rating-count">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {customerPhotos.length > 0 && (
                  <div className="customer-gallery">
                    <div className="gallery-header">
                      <h3>Customer Photos</h3>
                      <span>{customerPhotos.length} photo{customerPhotos.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="gallery-grid">
                      {customerPhotos.map((photo, index) => (
                        <img
                          key={index}
                          src={photo.image}
                          alt=""
                          className="gallery-photo"
                          onClick={() => setSelectedReviewImage(photo.image)}
                        />
                      ))}
                    </div>
                  </div>
                )}

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

                  <input
                    id="review-photo-input"
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={handleReviewImages}
                  />

                  <div className="preview-grid">
                    {reviewImages.map((file, index) => (
                      <div key={index} className="preview-item">
                        <img src={URL.createObjectURL(file)} alt="" className="preview-photo" />
                        <button
                          type="button"
                          className="remove-photo-btn"
                          onClick={() => setReviewImages(reviewImages.filter((_, i) => i !== index))}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    {Array.from({ length: Math.max(0, 5 - reviewImages.length) }).map((_, index) => (
                      <label key={`slot-${index}`} htmlFor="review-photo-input" className="upload-skeleton">
                        <ImagePlus size={30} />
                      </label>
                    ))}
                  </div>

                  <button type="button" className="submit-review" onClick={submitReview}>
                    Post Review
                  </button>
                </div>

                <div className="review-toolbar">
                  <h3>{sortedReviews.length} Reviews</h3>
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <div className="sort-wrapper">
                      <button className="sort-btn" onClick={() => setShowFilterMenu(!showFilterMenu)}>Filter</button>
                      {showFilterMenu && (
                        <div className="sort-menu">
                          <button onClick={() => { setReviewFilter("all"); setShowFilterMenu(false); }}>All Reviews</button>
                          <button onClick={() => { setReviewFilter("photos"); setShowFilterMenu(false); }}>With Photos</button>
                          <button onClick={() => { setReviewFilter("verified"); setShowFilterMenu(false); }}>Verified Purchase</button>
                          <button onClick={() => { setReviewFilter("5"); setShowFilterMenu(false); }}>5 Stars</button>
                        </div>
                      )}
                    </div>

                    <div className="sort-wrapper">
                      <button className="sort-btn" onClick={() => setShowSortMenu(!showSortMenu)}>Sort by</button>
                      {showSortMenu && (
                        <div className="sort-menu">
                          <button onClick={() => { setReviewSort("helpful"); setShowSortMenu(false); }}>Most Helpful</button>
                          <button onClick={() => { setReviewSort("newest"); setShowSortMenu(false); }}>Newest</button>
                          <button onClick={() => { setReviewSort("highest"); setShowSortMenu(false); }}>Highest Rated</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="reviews-list">
                  {sortedReviews.map((rev) => (
                    <div key={rev.id} className="review-card">
                      <div className="review-header">
                        <div className="review-user">
                          <div className="review-avatar">
                            {rev.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="review-name">{rev.name}</div>
                            <div className="review-date">
                              {rev.createdAt?.toDate ? rev.createdAt.toDate().toLocaleDateString() : "Just now"}
                            </div>
                          </div>
                        </div>
                        {rev.verifiedPurchase && (
                          <div className="verified-badge">
                            <BadgeCheck size={15} /> Verified Purchase
                          </div>
                        )}
                      </div>

                      <p className="review-text">{rev.text}</p>

                      {rev.images?.length > 0 && (
                        <div className="review-photo-grid">
                          {rev.images.map((imgUrl, index) => (
                            <img
                              key={index}
                              src={imgUrl}
                              alt=""
                              className="review-photo"
                              onClick={() => setSelectedReviewImage(imgUrl)}
                            />
                          ))}
                        </div>
                      )}

                      <div className="review-actions">
                        <button type="button" className="helpful-btn" onClick={() => markHelpful(rev.id)}>
                          <ThumbsUp size={16} /> Helpful {rev.helpfulCount > 0 && `(${rev.helpfulCount})`}
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
            </div>
          </div>
        </div>
      </div>

      {editingReview && (
        <div className="review-modal-overlay" onClick={() => setEditingReview(null)}>
          <div className="review-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Review</h3>
            <textarea
              className="review-input"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
            />
            <div className="review-modal-actions">
              <button type="button" className="cancel-btn" onClick={() => setEditingReview(null)}>Cancel</button>
              <button type="button" className="save-btn" onClick={updateReview}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="review-modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Review?</h3>
            <p>This action cannot be undone.</p>
            <div style={{ display: "flex", justifyContent: "center", gap: 14 }}>
              <button type="button" className="cancel-btn" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button type="button" className="delete-btn" onClick={deleteReview}>Delete Review</button>
            </div>
          </div>
        </div>
      )}

      {selectedReviewImage && (
        <div className="review-lightbox" onClick={() => setSelectedReviewImage(null)}>
          <button type="button" className="lightbox-close" onClick={() => setSelectedReviewImage(null)}>
            <X size={28} />
          </button>
          <img src={selectedReviewImage} className="lightbox-image" alt="" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

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
          >
            {currentUser ? (
              <>₹{totalPrice} <span>Add to Cart</span></>
            ) : (
              <span>Log in to Order</span>
            )}
          </button>
        </div>
      </div>

      {toast && <div className="toast">⚠️ {toast}</div>}
    </>
  );
}
