import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  getDoc,
  doc
} from "firebase/firestore";

export default function SupportReviewsManagement({ setActiveTab, setSelectedTicket }) {

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");

  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0 ? (
    reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
  ).toFixed(1) : "0.0";
  const fiveStarReviews = reviews.filter(
    (review) => review.rating === 5
  ).length;
  const lowRatings = reviews.filter(
    (review) => review.rating <= 2
  ).length;

  const filteredReviews = reviews.filter((review) => {
    const matchesSearch =
      review.customerName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      review.ticketNumber
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      review.ticketId
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesRating =
      ratingFilter === "all" ||
      (ratingFilter === "5" && review.rating === 5) ||
      (ratingFilter === "4" && review.rating === 4) ||
      (ratingFilter === "low" && review.rating <= 3);

    return matchesSearch && matchesRating;
  });

  const openConversation = async (ticketId) => {
    try {
      const ticketRef = doc(db, "supportTickets", ticketId);
      const ticketSnap = await getDoc(ticketRef);
      if (ticketSnap.exists()) {
        setSelectedTicket({ id: ticketSnap.id, ...ticketSnap.data() });
        setActiveTab("conversation");
      }
    } catch (error) {
      console.error("Error opening ticket:", error);
    }
  };

  useEffect(() => {
    const q = query(
      collection(db, "supportReviews"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReviews(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }))
      );

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);


  return (
    <div>
      <div
        style={{
          marginBottom: "28px"
        }}
      >
        <h1
          style={{
            fontFamily: "Playfair Display, serif",
            color: "#2C221E",
            margin: 0
          }}
        >
          Support Reviews
        </h1>

        <p
          style={{
            color: "#9A8C82",
            marginTop: "8px"
          }}
        >
          Customer feedback from resolved support conversations.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "28px"
        }}
      >
        {[
          { title: "Total Reviews", value: totalReviews },
          { title: "Average Rating", value: `${averageRating} ⭐` },
          { title: "5 Star Reviews", value: fiveStarReviews },
          { title: "Needs Attention", value: lowRatings }
        ].map((card) => (
          <div
            key={card.title}
            style={{
              background: "#FFFFFF",
              border: "1px solid #EFE8DF",
              borderRadius: "18px",
              padding: "20px"
            }}
          >
            <div
              style={{
                fontSize: "13px",
                color: "#9A8C82",
                marginBottom: "8px"
              }}
            >
              {card.title}
            </div>
            <div
              style={{
                fontSize: "28px",
                fontWeight: 700,
                color: "#2C221E",
                fontFamily: "Playfair Display, serif"
              }}
            >
              {card.value}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "20px"
        }}
      >
        <input
          type="text"
          placeholder="Search customer or ticket..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            padding: "12px 14px",
            borderRadius: "12px",
            border: "1px solid #EFE8DF",
            outline: "none"
          }}
        />
        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
          style={{
            padding: "12px",
            borderRadius: "12px",
            border: "1px solid #EFE8DF",
            background: "#FFFFFF"
          }}
        >
          <option value="all">All Ratings</option>
          <option value="5">5 Stars</option>
          <option value="4">4 Stars</option>
          <option value="low">3 Stars & Below</option>
        </select>
      </div>


      {loading ? (
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #EFE8DF",
            borderRadius: "18px",
            padding: "30px",
            textAlign: "center",
            color: "#9A8C82"
          }}
        >
          Loading customer reviews...
        </div>
      ) : filteredReviews.length === 0 ? (
        <div
          style={{
            background: "#FFFFFF",
            border: "1px dashed #EFE8DF",
            borderRadius: "18px",
            padding: "40px",
            textAlign: "center"
          }}
        >
          <h3
            style={{
              margin: 0,
              color: "#2C221E",
              fontFamily: "Playfair Display, serif"
            }}
          >
            No Reviews Yet
          </h3>
          <p
            style={{
              color: "#9A8C82",
              marginTop: "8px"
            }}
          >
            Customer feedback will appear here after resolved support tickets are reviewed.
          </p>
        </div>
      ) : (
        filteredReviews.map((review) => (
          <div
            key={review.id}
            style={{
              background:"#FFFFFF",
              border:"1px solid #EFE8DF",
              borderRadius:"18px",
              padding:"20px",
              marginBottom:"14px"
            }}
          >

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <strong style={{ color: "#2C221E", fontSize: "16px" }}>
                  {review.customerName || "Customer"}
                </strong>
                <div style={{ fontSize: "12px", color: "#9A8C82", marginTop: "4px" }}>
                  {review.customerEmail}
                </div>
              </div>
              <div>
                {[1,2,3,4,5].map((star) => (
                  <span
                    key={star}
                    style={{
                      color: review.rating >= star ? "#3A2A22" : "#D8D1CA",
                      fontSize: "18px"
                    }}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>

            <p style={{ color:"#5C514B", margin:"16px 0", lineHeight:1.5 }}>
              {review.comment || "No comment provided."}
            </p>

            <div style={{ display:"flex", flexWrap:"wrap", gap:"12px", fontSize:"12px", color:"#9A8C82" }}>
              <span>
                Ticket: {review.ticketNumber || review.ticketId || "N/A"}
              </span>
              {review.category && (
                <span>
                  Category: {review.category}
                </span>
              )}
              {review.priority && (
                <span>
                  Priority: {review.priority}
                </span>
              )}
            </div>

            <div style={{ marginTop:"14px", fontSize:"12px", color:"#9A8C82" }}>
              Submitted:{" "}
              {review.createdAt?.toDate ? review.createdAt.toDate().toLocaleDateString() : "Recently"}
            </div>

            <button
              onClick={() => openConversation(review.ticketId)}
              style={{
                marginTop: "16px",
                background: "#3A2A22",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "12px",
                padding: "10px 18px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              View Conversation →
            </button>

          </div>
        ))
      )}

    </div>
  );
}
