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
  Camera,
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
  const [selectedSize, setSelectedSize] = useState(product?.sizes?.[0] || null);
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
    if(!product) return;

    const fetchReviews = async() => {
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
      try {
        const q = query(
          collection(db, "specialRequests"),
          where("active", "==", true)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => doc.data().name);
        setQuickRequests(data);
      } catch (err) {
        console.error("Failed loading special requests:", err);
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
  
  const basePrice = product?.price || 0;
  const sizePrice = Number(selectedSize?.price || 0);

  const milkPrices = Object.fromEntries(
    (product?.milkOptions || []).map((m) => [
      m.name,
      Number(m.price || 0),
    ])
  );

  const extrasTotal = selectedExtras.reduce(
    (sum, extra) => sum + Number(extra.price || 0),
    0
  );

  const sweetnessPrice = Number(selectedSweetness?.price || 0);

  const singlePrice =
    basePrice +
    sizePrice +
    (milkPrices[milk] || 0) +
    sweetnessPrice +
    extrasTotal;

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
        where("userId", "==", currentUser.uid)
      );
      const purchaseSnapshot = await getDocs(purchaseQuery);
      const verifiedPurchase = purchaseSnapshot.docs.some((docSnap) => {
        const order = docSnap.data();
        return (order.items || []).some((item) => item.id === product.id);
      });

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
        snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }))
      );
      showToast("Review submitted successfully!");
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
      size: selectedSize?.name,
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

  if (!product) {
    return (
      <div style={{ padding: 40 }}>
        <h2>No product selected.</h2>
        <button onClick={() => setPage("menu")}>Back to Menu</button>
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
      case "5": return review.rating === 5;
      case "4": return review.rating === 4;
      case "3": return review.rating === 3;
      case "2": return review.rating === 2;
      case "1": return review.rating === 1;
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
      default: return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
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
    : Math.round((reviews.filter((r) => r.rating >= 4).length / reviews.length) * 100);
  
  const customerPhotos = reviews.flatMap((review) =>
    (review.images || []).map((imgUrl) => ({
      image: imgUrl,
      reviewer: review.name,
      rating: review.rating,
    }))
  );

  return (
    <>
      <style>{`
        .product-page {
          background-color: #FDFBF7;
          min-height: 100vh;
          padding-bottom: 120px;
          color: #2D2422;
          font-family: inherit;
        }
        .product-container {
          max-width: 900px;
          margin: 0 auto;
          padding: 24px 16px;
        }
        .back-button {
          display: flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          color: #6B5C53;
          font-weight: 600;
          cursor: pointer;
          margin-bottom: 20px;
          font-size: 15px;
        }
        .hero-section {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .product-image {
          position: relative;
          width: 100%;
          height: 350px;
          background: #F4ECE1;
          border-radius: 20px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .product-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .product-emoji {
          font-size: 80px;
        }
        .favorite-btn {
          position: absolute;
          top: 16px;
          right: 16px;
          background: white;
          border: none;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
        .badge {
          display: inline-block;
          background: #C4956A;
          color: white;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 6px;
          margin-bottom: 8px;
          letter-spacing: 0.5px;
        }
        .product-name {
          font-size: 28px;
          font-weight: 800;
          margin-bottom: 8px;
        }
        .rating {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
          margin-bottom: 16px;
        }
        .description {
          color: #6B5C53;
          line-height: 1.6;
          margin-bottom: 20px;
        }
        .product-info-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }
        .info-card {
          background: white;
          border: 1px solid #E8DFD8;
          padding: 12px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #5D524C;
        }
        .price {
          font-size: 24px;
          font-weight: 800;
          color: #C4956A;
          margin-bottom: 24px;
        }
        .option-section {
          margin-bottom: 28px;
        }
        .option-title {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 12px;
        }
        .option-subtitle {
          font-size: 13px;
          color: #777;
          margin-bottom: 10px;
        }
        .size-options-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 12px;
        }
        .size-card {
          background: white;
          border: 2px solid #E8DFD8;
          padding: 14px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .size-card.active {
          border-color: #C4956A;
          background: #FDF8F5;
        }
        .size-name {
          font-weight: 700;
          font-size: 15px;
        }
        .size-price {
          font-size: 12px;
          color: #888;
          margin-top: 4px;
        }
        .sweetness-display {
          background: white;
          border: 1px solid #E8DFD8;
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 12px;
        }
        .sweetness-desc {
          font-size: 13px;
          color: #777;
          margin-top: 2px;
        }
        .sweetness-slider {
          height: 8px;
          background: #E8DFD8;
          border-radius: 4px;
          position: relative;
          cursor: pointer;
        }
        .sweetness-thumb {
          height: 24px;
          width: 24px;
          background: #C4956A;
          border-radius: 50%;
          outline: none;
          top: -8px;
          cursor: grab;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
        .sweetness-track {
          background: #C4956A;
          height: 8px;
          border-radius: 4px;
        }
        .sweetness-label {
          font-size: 12px;
          color: #777;
        }
        .sweetness-label.active {
          color: #C4956A;
          font-weight: 700;
        }
        .milk-grid, .temperature-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
        }
        .milk-card, .temperature-card, .extra-card {
          background: white;
          border: 2px solid #E8DFD8;
          padding: 14px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          transition: all 0.2s;
        }
        .milk-card.active, .temperature-card.active, .extra-card.active {
          border-color: #C4956A;
          background: #FDF8F5;
        }
        .milk-header, .extra-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .milk-emoji, .temperature-icon, .extra-icon {
          font-size: 24px;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .milk-name, .temperature-name, .extra-name {
          font-weight: 700;
          font-size: 14px;
        }
        .milk-tagline, .temperature-desc, .extra-desc {
          font-size: 12px;
          color: #777;
        }
        .milk-price, .extra-price {
          font-size: 13px;
          font-weight: 600;
          color: #C4956A;
        }
        .extras-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }
        .quick-request-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }
        .quick-chip {
          background: white;
          border: 1px solid #E8DFD8;
          padding: 8px 14px;
          border-radius: 20px;
          font-size: 13px;
          cursor: pointer;
          font-weight: 500;
          color: #5D524C;
        }
        .quick-chip.active {
          background: #C4956A;
          color: white;
          border-color: #C4956A;
        }
        .instructions-card {
          position: relative;
        }
        .instructions-input {
          width: 100%;
          background: white;
          border: 1px solid #E8DFD8;
          border-radius: 12px;
          padding: 12px;
          min-height: 80px;
          font-size: 14px;
          outline: none;
          resize: none;
          font-family: inherit;
        }
        .character-count {
          position: absolute;
          bottom: 10px;
          right: 14px;
          font-size: 11px;
          color: #999;
        }
        .rating-summary-card {
          background: white;
          border: 1px solid #E8DFD8;
          border-radius: 16px;
          padding: 20px;
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 20px;
          align-items: center;
          margin-bottom: 20px;
        }
        @media(max-width: 600px) {
          .rating-summary-card {
            grid-template-columns: 1fr;
          }
          .product-info-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .summary-left {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          border-right: 1px solid #eee;
          padding-right: 20px;
        }
        .summary-rating {
          font-size: 42px;
          font-weight: 800;
          line-height: 1;
          margin-bottom: 6px;
        }
        .summary-stars {
          display: flex;
          gap: 2px;
          margin-bottom: 6px;
        }
        .summary-total {
          font-size: 13px;
          color: #777;
          margin-bottom: 14px;
        }
        .recommend-box {
          background: #FDF8F5;
          padding: 10px;
          border-radius: 8px;
          width: 100%;
        }
        .recommend-number {
          font-weight: 800;
          color: #C4956A;
          font-size: 16px;
        }
        .recommend-text {
          font-size: 11px;
          color: #777;
        }
        .summary-right {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .rating-row {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
        }
        .rating-bar {
          flex: 1;
          height: 6px;
          background: #E8DFD8;
          border-radius: 3px;
          overflow: hidden;
        }
        .rating-fill {
          height: 100%;
          background: #C4956A;
        }
        .rating-count {
          width: 20px;
          text-align: right;
          color: #777;
        }
        .customer-gallery {
          margin-bottom: 24px;
        }
        .gallery-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .gallery-header h3 {
          font-size: 16px;
          font-weight: 700;
        }
        .gallery-header span {
          font-size: 13px;
          color: #777;
        }
        .gallery-grid {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          padding-bottom: 4px;
        }
        .gallery-photo {
          width: 70px;
          height: 70px;
          border-radius: 10px;
          object-fit: cover;
          cursor: pointer;
          flex-shrink: 0;
          border: 1px solid #E8DFD8;
        }
        .write-review-card {
          background: white;
          border: 1px solid #E8DFD8;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 24px;
        }
        .write-title {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .write-subtitle {
          font-size: 13px;
          color: #777;
          margin-bottom: 14px;
        }
        .star-picker {
          display: flex;
          gap: 6px;
          margin-bottom: 14px;
        }
        .review-input {
          width: 100%;
          background: #FAF7F2;
          border: 1px solid #E8DFD8;
          border-radius: 12px;
          padding: 12px;
          min-height: 80px;
          font-size: 14px;
          outline: none;
          resize: none;
          margin-bottom: 14px;
          font-family: inherit;
        }
        .preview-grid {
          display: flex;
          gap: 10px;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }
        .preview-item {
          position: relative;
          width: 60px;
          height: 60px;
        }
        .preview-photo {
          width: 100%;
          height: 100%;
          border-radius: 8px;
          object-fit: cover;
        }
        .remove-photo-btn {
          position: absolute;
          top: -6px;
          right: -6px;
          background: #ff5252;
          color: white;
          border: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .upload-skeleton {
          width: 60px;
          height: 60px;
          border: 2px dashed #C4956A;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #C4956A;
          cursor: pointer;
          background: #FDF8F5;
        }
        .upload-hint {
          font-size: 12px;
          color: #777;
          margin-bottom: 14px;
        }
        .submit-review {
          background: #C4956A;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
        }
        .review-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .review-toolbar h3 {
          font-size: 18px;
          font-weight: 700;
        }
        .sort-wrapper {
          position: relative;
        }
        .sort-btn {
          background: white;
          border: 1px solid #E8DFD8;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          color: #5D524C;
        }
        .sort-menu {
          position: absolute;
          right: 0;
          top: 100%;
          margin-top: 4px;
          background: white;
          border: 1px solid #E8DFD8;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          z-index: 10;
          min-width: 140px;
          display: flex;
          flex-direction: column;
        }
        .sort-menu button {
          background: none;
          border: none;
          padding: 10px 14px;
          text-align: left;
          font-size: 13px;
          cursor: pointer;
          color: #5D524C;
        }
        .sort-menu button:hover, .sort-menu button.active {
          background: #FDF8F5;
          color: #C4956A;
          font-weight: 600;
        }
        .reviews-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .review-card {
          background: white;
          border: 1px solid #E8DFD8;
          border-radius: 14px;
          padding: 16px;
        }
        .review-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 10px;
        }
        .review-user {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .review-avatar {
          width: 36px;
          height: 36px;
          background: #C4956A;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 14px;
        }
        .review-name {
          font-weight: 700;
          font-size: 14px;
        }
        .review-stars {
          display: flex;
          gap: 2px;
          margin-top: 2px;
        }
        .review-date {
          font-size: 12px;
          color: #888;
        }
        .verified-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: #2e7d32;
          background: #e8f5e9;
          padding: 2px 8px;
          border-radius: 6px;
          width: fit-content;
          margin-bottom: 10px;
          font-weight: 600;
        }
        .review-photo-grid {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }
        .review-photo {
          width: 60px;
          height: 60px;
          border-radius: 8px;
          object-fit: cover;
          cursor: pointer;
        }
        .review-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid #f4ece1;
          padding-top: 10px;
          margin-top: 10px;
        }
        .helpful-btn {
          background: none;
          border: none;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #777;
          cursor: pointer;
        }
        .review-owner-actions {
          display: flex;
          gap: 10px;
        }
        .edit-review-btn, .delete-review-btn {
          background: none;
          border: none;
          font-size: 12px;
          cursor: pointer;
          font-weight: 600;
        }
        .edit-review-btn { color: #C4956A; }
        .delete-review-btn { color: #d32f2f; }
        .review-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }
        .review-modal, .delete-modal {
          background: white;
          padding: 24px;
          border-radius: 16px;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.15);
        }
        .review-modal-actions, .delete-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 16px;
        }
        .cancel-btn {
          background: #eee;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }
        .save-btn, .delete-btn {
          background: #C4956A;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }
        .delete-btn { background: #d32f2f; }
        .delete-modal {
          text-align: center;
        }
        .delete-icon {
          font-size: 36px;
          margin-bottom: 10px;
        }
        .review-lightbox {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .lightbox-close {
          position: absolute;
          top: 20px;
          right: 20px;
          background: none;
          border: none;
          color: white;
          cursor: pointer;
        }
        .lightbox-image {
          max-width: 90%;
          max-height: 90vh;
          border-radius: 10px;
        }
        .sticky-order-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          border-top: 1px solid #E8DFD8;
          padding: 14px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 -4px 16px rgba(0,0,0,0.06);
          z-index: 99;
        }
        .sticky-left {
          display: flex;
          flex-direction: column;
        }
        .sticky-product-name {
          font-weight: 700;
          font-size: 15px;
        }
        .sticky-summary {
          font-size: 12px;
          color: #777;
        }
        .sticky-right {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .quantity-selector {
          display: flex;
          align-items: center;
          border: 1px solid #E8DFD8;
          border-radius: 8px;
          overflow: hidden;
        }
        .quantity-selector button {
          background: none;
          border: none;
          width: 32px;
          height: 32px;
          font-weight: 700;
          cursor: pointer;
        }
        .quantity-selector span {
          width: 28px;
          text-align: center;
          font-weight: 600;
          font-size: 14px;
        }
        .sticky-cart-button {
          background: #C4956A;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 15px;
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
        }
        .sticky-cart-button span {
          font-size: 11px;
          font-weight: 400;
        }
        .toast {
          position: fixed;
          bottom: 90px;
          left: 50%;
          transform: translateX(-50%);
          background: #2D2422;
          color: white;
          padding: 10px 20px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          z-index: 1000;
          animation: fadeInOut 2.5s ease;
        }
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translate(-50%, 10px); }
          15% { opacity: 1; transform: translate(-50%, 0); }
          85% { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, -10px); }
        }
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

              {product.sizes && product.sizes.length > 0 && (
                <div className="option-section">
                  <h2 className="option-title">Select Size</h2>
                  <div className="size-options-grid">
                    {product.sizes.map((sizeOption) => {
                      const isSelected = selectedSize?.id === sizeOption.id || selectedSize?.name === sizeOption.name;
                      return (
                        <button
                          type="button"
                          key={sizeOption.id || sizeOption.name}
                          className={`size-card ${isSelected ? "active" : ""}`}
                          onClick={() => setSelectedSize(sizeOption)}
                        >
                          <span className="size-name">{sizeOption.name}</span>
                          {sizeOption.price > 0 && <span className="size-price">+{sizeOption.price}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {sweetnessOptions.length > 0 && (
                <div className="option-section">
                  <h2 className="option-title">Sweetness Level</h2>
                  <div className="sweetness-display">
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 15 }}>
                      <div style={{ fontSize: 28, width: 34, textAlign: "center" }}>
                        {selectedSweetness?.icon?.startsWith("http") || selectedSweetness?.icon?.startsWith("/") ? (
                          <img src={selectedSweetness.icon} alt={selectedSweetness.name} style={{ width: 30, height: 30, objectFit: "contain" }} />
                        ) : (
                          selectedSweetness?.icon || "🍬"
                        )}
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
                    max={sweetnessOptions.length - 1}
                    step={1}
                    value={sweetnessIndex}
                    onChange={(index) => setSweetnessIndex(index)}
                    disabled={sweetnessOptions.length <= 1}
                  />

                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 13, color: "#777" }}>
                    {sweetnessOptions.map((option, index) => (
                      <span
                        key={option.name}
                        className={sweetnessIndex === index ? "sweetness-label active" : "sweetness-label"}
                        onClick={() => setSweetnessIndex(index)}
                        style={{ cursor: "pointer" }}
                      >
                        {option.name}
                      </span>
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
                  <p className="option-subtitle">Choose up to {product.customExtrasMaxSelection || 3} extras</p>
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

              <div className="option-section">
                <h2 className="option-title">Special Requests</h2>
                <div className="quick-request-grid">
                  {quickRequests.map((request) => (
                    <button
                      key={request}
                      type="button"
                      className={instructions.includes(request) ? "quick-chip active" : "quick-chip"}
                      onClick={() => setInstructions((prev) => prev ? `${prev}, ${request}` : request)}
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

                  <p className="upload-hint">Upload up to 5 photos (optional)</p>

                  <button type="button" className="submit-review" onClick={submitReview}>
                    Post Review
                  </button>
                </div>

                <div className="review-toolbar">
                  <h3>{sortedReviews.length} Reviews</h3>
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <div className="sort-wrapper">
                      <button className="sort-btn" onClick={() => setShowFilterMenu(!showFilterMenu)}>
                        Filter
                      </button>
                      {showFilterMenu && (
                        <div className="sort-menu">
                          <button className={reviewFilter === "all" ? "active" : ""} onClick={() => { setReviewFilter("all"); setShowFilterMenu(false); }}>○ All Reviews</button>
                          <button className={reviewFilter === "photos" ? "active" : ""} onClick={() => { setReviewFilter("photos"); setShowFilterMenu(false); }}>📷 With Photos</button>
                          <button className={reviewFilter === "verified" ? "active" : ""} onClick={() => { setReviewFilter("verified"); setShowFilterMenu(false); }}>✔ Verified Purchase</button>
                          <button className={reviewFilter === "5" ? "active" : ""} onClick={() => { setReviewFilter("5"); setShowFilterMenu(false); }}>⭐⭐⭐⭐⭐ 5 Stars</button>
                        </div>
                      )}
                    </div>

                    <div className="sort-wrapper">
                      <button className="sort-btn" onClick={() => setShowSortMenu(!showSortMenu)}>
                        Sort by
                      </button>
                      {showSortMenu && (
                        <div className="sort-menu">
                          <button className={reviewSort === "helpful" ? "active" : ""} onClick={() => { setReviewSort("helpful"); setShowSortMenu(false); }}>○ Most Helpful</button>
                          <button className={reviewSort === "newest" ? "active" : ""} onClick={() => { setReviewSort("newest"); setShowSortMenu(false); }}>○ Newest</button>
                          <button className={reviewSort === "highest" ? "active" : ""} onClick={() => { setReviewSort("highest"); setShowSortMenu(false); }}>○ Highest Rated</button>
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
                          <div className="review-avatar">{rev.name?.charAt(0).toUpperCase()}</div>
                          <div>
                            <div className="review-name">{rev.name}</div>
                            <div className="review-stars">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star key={star} size={16} fill={star <= rev.rating ? "#C4956A" : "none"} color="#C4956A" />
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="review-date">
                          {rev.createdAt?.toDate ? rev.createdAt.toDate().toLocaleString("en-IN", {
                            day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
                          }) : "Just now"}
                        </div>
                      </div>

                      {rev.verifiedPurchase && (
                        <div className="verified-badge">
                          <BadgeCheck size={15} />
                          Verified Purchase
                        </div>
                      )}

                      {rev.images?.length > 0 && (
                        <div className="review-photo-grid">
                          {rev.images.map((image, index) => (
                            <img key={index} src={image} alt="" className="review-photo" loading="lazy" onClick={() => setSelectedReviewImage(image)} />
                          ))}
                        </div>
                      )}

                      <div className="review-actions">
                        <button type="button" className="helpful-btn" onClick={() => markHelpful(rev.id)}>
                          <ThumbsUp size={16} />
                          Helpful {rev.helpfulCount > 0 && <span>({rev.helpfulCount})</span>}
                        </button>

                        {currentUser?.uid === rev.userId && (
                          <div className="review-owner-actions">
                            <button type="button" className="edit-review-btn" onClick={() => { setEditingReview(rev.id); setEditText(rev.text); setEditRating(rev.rating); }}>✏ Edit</button>
                            <button type="button" className="delete-review-btn" onClick={() => { setReviewToDelete(rev.id); setShowDeleteModal(true); }}>🗑 Delete</button>
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

        {editingReview && (
          <div className="review-modal-overlay" onClick={() => setEditingReview(null)}>
            <div className="review-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Edit Review</h3>
              <div className="star-picker">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} size={28} fill={star <= editRating ? "#C4956A" : "none"} color="#C4956A" onClick={() => setEditRating(star)} style={{ cursor: "pointer" }} />
                ))}
              </div>
              <textarea className="review-input" value={editText} onChange={(e) => setEditText(e.target.value)} />
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
              <div className="delete-icon">🗑️</div>
              <h3>Delete Review?</h3>
              <p>This action cannot be undone.</p>
              <div className="delete-actions">
                <button type="button" className="cancel-btn" onClick={() => { setShowDeleteModal(false); setReviewToDelete(null); }}>Cancel</button>
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
              {selectedSize?.name} • {milk} {toppings.length > 0 && ` • ${toppings.join(", ")}`}
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
              style={{ background: currentUser ? "#C4956A" : "#6B5C53" }}
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

        {toast && (
          <div className="toast">⚠️ {toast}</div>
        )}
      </div>
    </>
  );
}
