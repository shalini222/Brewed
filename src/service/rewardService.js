import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
} from "firebase/firestore";

import { db } from "../firebase.js";
import walletService from "./walletService.js";

async function giveSignupReward(userId) {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) return;

  const user = userSnap.data();

  // Already claimed
  if (user.signupRewardClaimed) return;

  // Reward settings
  const settingsRef = doc(db, "rewardSettings", "default");

  let settings;

  const settingsSnap = await getDoc(settingsRef);

  if (!settingsSnap.exists()) {
    settings = {
      cashbackEnabled: true,
      cashbackPercent: 5,
      minimumOrder: 200,
      maximumCashback: 150,
      birthdayReward: 200,
      referralReward: 100,
      signupReward: 50,
      rewardExpiryDays: 365,
    };

    await setDoc(settingsRef, settings);
  } else {
    settings = settingsSnap.data();
  }

  // No signup reward configured
  if (!settings.signupReward || settings.signupReward <= 0) {
    return;
  }

  await walletService.addReward({
    userId,
    amount: settings.signupReward,
    description: "Welcome Bonus 🎉",
    metadata: {
      rewardType: "SIGNUP",
    },
  });

  await updateDoc(userRef, {
    signupRewardClaimed: true,
  });
}

export default {
  giveSignupReward,
};
