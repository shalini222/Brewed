import {
  doc,
  getDoc
} from "firebase/firestore";

import { db } from "../firebase.js";


export async function getLoyaltySettings(){

  const snap = await getDoc(
    doc(db,"settings","loyalty")
  );


  if(!snap.exists()){

    const defaultSettings = {
      enabled: true,
      pointsPer100: 10,
      rewardExpiryDays: 365,
      birthdayRewardEnabled: true,
      birthdayRewardPoints: 100,
      seasonalCampaignEnabled: false,
      seasonalStartDate: null,
      seasonalEndDate: null,
      seasonalMultiplier: 1,
      seasonalCampaignName: "",
      seasonalCampaignDescription: ""
    };

    const today = new Date();
    let seasonalCampaignActive = false;

    if (
      defaultSettings.seasonalCampaignEnabled &&
      defaultSettings.seasonalStartDate &&
      defaultSettings.seasonalEndDate
    ) {
      const start = new Date(defaultSettings.seasonalStartDate);
      const end = new Date(defaultSettings.seasonalEndDate);

      end.setHours(23, 59, 59, 999);

      seasonalCampaignActive =
        today >= start &&
        today <= end;
    }

    return {
      ...defaultSettings,
      seasonalCampaignActive,
    };

  }


  const settings = snap.data();

  const today = new Date();
  let seasonalCampaignActive = false;

  if (
    settings.seasonalCampaignEnabled &&
    settings.seasonalStartDate &&
    settings.seasonalEndDate
  ) {
    const start = new Date(settings.seasonalStartDate);
    const end = new Date(settings.seasonalEndDate);

    end.setHours(23, 59, 59, 999);

    seasonalCampaignActive =
      today >= start &&
      today <= end;
  }


  return {
    ...settings,
    seasonalCampaignActive,
  };

}



export async function isLoyaltyEnabled(){

  const settings =
    await getLoyaltySettings();


  return settings.enabled !== false;

}
