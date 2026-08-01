import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";

export default function RedeemedRewardsPage({
  setPage,
  setActivePage,
}) {

const [loading, setLoading] = useState(true);

const [redemptions, setRedemptions] = useState([]);


async function loadRedemptions() {
  setLoading(true);

  const snapshot = await getDocs(
    collection(db, "rewardRedemptions")
  );

  setRedemptions(
    snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }))
  );

  setLoading(false);
}

useEffect(() => {
  loadRedemptions();
}, []);


return (
  <div className="loyalty-admin-header">

<button
className="back-btn"
onClick={() => setActivePage("loyalty")}
>
← Back
</button>

<h1>🎟 Redeemed Rewards</h1>

</div>

<div className="admin-page">

<div className="loyalty-admin-header">

<button
className="back-btn"
onClick={() => setActivePage("loyalty")}
>
← Back
</button>

<h1>🎟 Redeemed Rewards</h1>

</div>

{loading ? (

<p>Loading...</p>

) : redemptions.length === 0 ? (

<div className="empty-state">

<h3>No redeemed rewards yet.</h3>

<p>Customer redemptions will appear here.</p>

</div>

) : (

<p>{redemptions.length} redeemed rewards</p>

)}

</div>
);

}
  
