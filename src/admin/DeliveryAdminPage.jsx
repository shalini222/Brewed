import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";

import {
  Plus,
  Pencil,
  Trash2,
  Truck,
  MapPin,
} from "lucide-react";

export default function DeliveryAdminPage({ setPage }) {


const emptyZone = {
  name: "",
  deliveryFee: 40,
  freeDeliveryAbove: 499,
  minOrder: 199,
  estimatedTime: "30-40 mins",
  pincodes: "",
  active: true,
};


  const [zones, setZones] = useState([]);
const [loading, setLoading] = useState(true);

const [showForm, setShowForm] = useState(false);

const [editingId, setEditingId] = useState(null);

const [zoneForm, setZoneForm] = useState(emptyZone);

  useEffect(() => {
  loadZones();
}, []);

async function loadZones() {
  try {
    setLoading(true);

    const snap = await getDocs(
      collection(db, "deliveryZones")
    );

    const data = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    setZones(data);

  } catch (err) {
    console.log(err);
  } finally {
    setLoading(false);
  }
}

  return (
  <div>

    <button onClick={() => setPage("admin")}>
      ← Back
    </button>

    <h1>Delivery Management</h1>

    <button
      onClick={() => {
        setEditingId(null);
        setZoneForm(emptyZone);
        setShowForm(true);
      }}
    >
      <Plus size={18}/>
      Add Delivery Zone
    </button>

  </div>
);
  

}
