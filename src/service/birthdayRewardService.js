import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp
} from "firebase/firestore";

import { db } from "../firebase.js";


export async function checkBirthdayReward(userId){

  const userRef = doc(db,"users",userId);

  const userSnap = await getDoc(userRef);


  if(!userSnap.exists()) return;


  const user = userSnap.data();


  if(!user.birthday) return;



  const today = new Date();

  const birthday = new Date(user.birthday);



  const isBirthday =
    today.getDate() === birthday.getDate() &&
    today.getMonth() === birthday.getMonth();



  if(!isBirthday) return;



  // prevent duplicate

  if(user.lastBirthdayReward){

    const last =
      user.lastBirthdayReward.toDate();


    if(
      last.getFullYear() === today.getFullYear()
    ){
      return;
    }

  }



  const settingsSnap =
    await getDoc(
      doc(db,"settings","loyalty")
    );


  if(!settingsSnap.exists()) return;


  const settings =
    settingsSnap.data();


  if(!settings.birthdayRewardEnabled)
    return;



  const points =
    settings.birthdayRewardPoints || 100;



  // Calculate expiry date based on settings (default to 30 days if not set)
  const expiryDays = settings.birthdayRewardExpiryDays || 30;
  const expiryDate = new Date();
  expiryDate.setDate(today.getDate() + expiryDays);



  // 1. Create the reward in the customer's redeemedRewards subcollection
  const redeemedRewardRef = await addDoc(
    collection(db, "users", userId, "redeemedRewards"),
    {
      rewardTitle: "Birthday Gift",
      rewardType: "birthday",
      menuItemId: settings.birthdayRewardMenuItemId || null,
      status: "unused",
      points: 0,
      redeemedAt: serverTimestamp(),
      expiresAt: expiryDate,
      birthdayGift: true,
      year: new Date().getFullYear(),
    }
  );



  // 2. Create the matching admin record in rewardRedemptions
  await addDoc(
    collection(db, "rewardRedemptions"),
    {
      userId,
      customerName: user.name || "Customer",
      customerEmail: user.email || "",
      customerRewardId: redeemedRewardRef.id,
      rewardTitle: "Birthday Gift",
      rewardType: "birthday",
      menuItemId: settings.birthdayRewardMenuItemId || null,
      status: "unused",
      redeemedAt: serverTimestamp(),
      expiresAt: expiryDate,
      birthdayGift: true,
      year: new Date().getFullYear(),
    }
  );



  // 3. Update user loyalty points and timestamp
  await updateDoc(userRef,{

    loyaltyPoints:
      (user.loyaltyPoints || 0)
      + points,

    lifetimePoints:
      (user.lifetimePoints || 0)
      + points,

    lastBirthdayReward:
      serverTimestamp()

  });



  // 4. Log the transaction
  await addDoc(
    collection(db,"loyaltyTransactions"),
    {

      userId,

      type:"earned",

      points,

      description:
        "🎂 Birthday reward",

      createdAt:
        serverTimestamp()

    }
  );

}

