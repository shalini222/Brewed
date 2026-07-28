import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import walletService from "./walletService";

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

  if (!settingsSnap.exists()) return;

  const settings = settingsSnap.data();

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
