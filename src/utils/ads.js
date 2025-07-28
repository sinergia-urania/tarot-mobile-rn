// ads.js
import { AdEventType, InterstitialAd, RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';

// === KONFIGURACIJA AD UNIT ID-eva ===
// Ove ID-e zameni PRAVIM vrednostima sa AdMob portala kad deploy-uješ na Google Play.
// Dok testiraš, koristi TestIds koje AdMob nikada ne blokira.

export const INTERSTITIAL_AD_UNIT_ID = __DEV__
  ? TestIds.INTERSTITIAL // test mode
  : 'ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx'; // <== tvoj pravi interstitial ID

export const REWARDED_AD_UNIT_ID = __DEV__
  ? TestIds.REWARDED // test mode
  : 'ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx'; // <== tvoj pravi rewarded ID

// === INTERSTITIAL REKLAMA ===

export const showInterstitialAd = async () => {
  return new Promise((resolve, reject) => {
    const interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: true,
    });

    const unsubscribeLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      interstitial.show();
    });

    const unsubscribeClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      unsubscribeLoaded();
      unsubscribeClosed();
      resolve();
    });

    const unsubscribeError = interstitial.addAdEventListener(AdEventType.ERROR, error => {
      unsubscribeLoaded();
      unsubscribeClosed();
      unsubscribeError();
      reject(error);
    });

    interstitial.load();
  });
};

// === REWARDED REKLAMA (production ready, možeš koristiti iz bilo kog dela aplikacije) ===

export const showRewardedAd = async (onReward) => {
  return new Promise((resolve, reject) => {
    const rewarded = RewardedAd.createForAdRequest(REWARDED_AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: true,
    });

    const unsubscribeLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      rewarded.show();
    });

    const unsubscribeEarned = rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, reward => {
      if (onReward) onReward(reward);
    });

    const unsubscribeClosed = rewarded.addAdEventListener(RewardedAdEventType.CLOSED, () => {
      unsubscribeLoaded();
      unsubscribeEarned();
      unsubscribeClosed();
      unsubscribeError();
      resolve();
    });

    const unsubscribeError = rewarded.addAdEventListener(RewardedAdEventType.ERROR, error => {
      console.log("GREŠKA U REWARDED AD:", error);
      unsubscribeLoaded();
      unsubscribeEarned();
      unsubscribeClosed();
      unsubscribeError();
      reject(error);
    });

    rewarded.load();
  });
};
// DODAJ OVO dole, odmah ispod postojećeg koda u ads.js
export const createRewardedAdInstance = () => {
  return RewardedAd.createForAdRequest(REWARDED_AD_UNIT_ID, {
    requestNonPersonalizedAdsOnly: true,
  });
};