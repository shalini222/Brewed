import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import walletService from "./walletService.js";

async function giveSignupReward(userId) {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) return;

  const user = userSnap.data();

  // Already claimed
  if (user.signupRewardClaimed) return;

  // Load reward settings
  const settingsRef = doc(db, "rewardSettings", "default");
  const settingsSnap = await getDoc(settingsRef);

  

  const settings = settingsSnap.data();

  if (!settings.signupReward || settings.signupReward <= 0) { return; }

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
  // keep your other reward functions here
};
