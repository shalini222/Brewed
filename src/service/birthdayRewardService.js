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
