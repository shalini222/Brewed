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
import { db } from "../firebase";

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


async function saveZone() {
  const name = zoneForm.name.trim();

  if (!name) {
    alert("Please enter a zone name.");
    return;
  }

  const pincodes = zoneForm.pincodes
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);

  if (pincodes.length === 0) {
    alert("Please enter at least one pincode.");
    return;
  }

  const zoneData = {
    ...zoneForm,
    name,
    pincodes,
  };

  try {
    if (editingId) {
      await updateDoc(
        doc(db, "deliveryZones", editingId),
        zoneData
      );
    } else {
      await addDoc(
        collection(db, "deliveryZones"),
        {
          ...zoneData,
          createdAt: serverTimestamp(),
        }
      );
    }

    loadZones();

    setShowForm(false);
    setEditingId(null);
    setZoneForm(emptyZone);

  } catch (err) {
    console.log(err);
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
{showForm && (
  <div style={styles.formCard}>

    <h2>
      {editingId ? "Edit Delivery Zone" : "Add Delivery Zone"}
    </h2>

    <input
      placeholder="Zone Name"
      value={zoneForm.name}
      onChange={(e) =>
        setZoneForm({
          ...zoneForm,
          name: e.target.value,
        })
      }
    />

    <input
      type="number"
      placeholder="Delivery Fee"
      value={zoneForm.deliveryFee}
      onChange={(e) =>
        setZoneForm({
          ...zoneForm,
          deliveryFee: Number(e.target.value),
        })
      }
    />

    <input
      type="number"
      placeholder="Free Delivery Above"
      value={zoneForm.freeDeliveryAbove}
      onChange={(e) =>
        setZoneForm({
          ...zoneForm,
          freeDeliveryAbove: Number(e.target.value),
        })
      }
    />

    <input
      type="number"
      placeholder="Minimum Order"
      value={zoneForm.minOrder}
      onChange={(e) =>
        setZoneForm({
          ...zoneForm,
          minOrder: Number(e.target.value),
        })
      }
    />

    <input
      placeholder="Estimated Delivery Time"
      value={zoneForm.estimatedTime}
      onChange={(e) =>
        setZoneForm({
          ...zoneForm,
          estimatedTime: e.target.value,
        })
      }
    />

    <textarea
      rows={6}
      placeholder="One pincode per line"
      value={zoneForm.pincodes}
      onChange={(e) =>
        setZoneForm({
          ...zoneForm,
          pincodes: e.target.value,
        })
      }
    />

    <label>
      <input
        type="checkbox"
        checked={zoneForm.active}
        onChange={(e) =>
          setZoneForm({
            ...zoneForm,
            active: e.target.checked,
          })
        }
      />

      Active
    </label>

    <button onClick={saveZone}>
  {editingId ? "Update Zone" : "Save Zone"}
</button>

    <button
      onClick={() => {
        setShowForm(false);
        setEditingId(null);
        setZoneForm(emptyZone);
      }}
    >
      Cancel
    </button>

  </div>
)}
  </div>
);
  

}
