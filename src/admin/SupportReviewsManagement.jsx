import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot
} from "firebase/firestore";
import { Star } from "lucide-react";

export default function SupportReviewsManagement() {

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

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


      {loading ? (
        <div style={{ color:"#9A8C82" }}>
          Loading reviews...
        </div>
      ) : reviews.length === 0 ? (
        <div
          style={{
            background:"#FFFFFF",
            border:"1px solid #EFE8DF",
            borderRadius:"18px",
            padding:"30px",
            textAlign:"center",
            color:"#9A8C82"
          }}
        >
          No reviews yet.
        </div>
      ) : (
        reviews.map((review) => (
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

            <div style={{
              display:"flex",
              justifyContent:"space-between"
            }}>
              <strong style={{color:"#2C221E"}}>
                {review.customerName || "Customer"}
              </strong>

              <div>
                {[1,2,3,4,5].map((star)=>(
                  <span
                    key={star}
                    style={{
                      color:
                        review.rating >= star
                        ? "#3A2A22"
                        : "#D8D1CA"
                    }}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>


            <p style={{
              color:"#5C514B",
              marginTop:"12px"
            }}>
              {review.comment || "No comment provided."}
            </p>


            <div style={{
              fontSize:"12px",
              color:"#9A8C82"
            }}>
              Ticket: {review.ticketNumber || review.ticketId}
            </div>

          </div>
        ))
      )}

    </div>
  );
}
