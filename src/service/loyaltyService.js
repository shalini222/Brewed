import {
  doc,
  getDoc
} from "firebase/firestore";

import { db } from "../firebase";


export async function getLoyaltySettings(){

  const snap = await getDoc(
    doc(db,"settings","loyalty")
  );


  if(!snap.exists()){

    return {
      enabled:true,
      pointsPer100:10,
      rewardExpiryDays:365,
      birthdayRewardEnabled:true,
      birthdayRewardPoints:100
    };

  }


  return snap.data();

}



export async function isLoyaltyEnabled(){

  const settings =
    await getLoyaltySettings();


  return settings.enabled !== false;

}
