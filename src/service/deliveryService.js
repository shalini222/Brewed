import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase.js";

export async function checkDelivery(pincode) {
  try {
    const snap = await getDocs(
      collection(db, "deliveryZones")
    );

    const zones = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const zone = zones.find(
      (z) =>
        z.active &&
        Array.isArray(z.pincodes) &&
        z.pincodes.includes(String(pincode).trim())
    );

    if (!zone) {
      return {
        available: false,
        info: null,
      };
    }

    return {
      available: true,
      info: {
        id: zone.id,
        zoneName: zone.name,
        deliveryFee: Number(zone.deliveryFee),
        freeDeliveryAbove: Number(zone.freeDeliveryAbove),
        minOrder: Number(zone.minOrder),
        estimatedTime: zone.estimatedTime,
      },
    };
  } catch (err) {
    console.error("Delivery check failed:", err);

    return {
      available: false,
      info: null,
      error: err,
    };
  }
}
