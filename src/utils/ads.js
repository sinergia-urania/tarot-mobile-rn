// src/utils/ads.js – TEST/PROD toggle + guard logika + detaljni logovi
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import {
  AdEventType,
  BannerAd,
  BannerAdSize,
  InterstitialAd,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

// ✅ Plan helpers (centralizovano): premium/pro/proplus = paid
import { isPaidTier, normalizePlanCanon } from '../constants/plans';

// START: helper – razlikuj "loading" od poznatog stanja
// undefined => učitava se; null => nema sesije (izlogovan)
const isLoadingSessionProfile = (session, profile) => {
  if (typeof session === 'undefined') return true;
  if (session && typeof profile === 'undefined') return true;
  return false;
};
// END: helper

// === KONFIGURACIJA AD UNIT ID-eva ===
// TEST ↔ PROD toggle preko EXPO_PUBLIC_ADS_ENV
const USE_TEST_IDS = process.env.EXPO_PUBLIC_ADS_ENV !== 'prod';
export const ADS_ENV = USE_TEST_IDS ? 'test' : 'prod';

console.log('[ADS] __DEV__ =', __DEV__);
export const ADS_DISABLED = String(process.env.EXPO_PUBLIC_ADS_DISABLED || '0') === '1';
if (ADS_DISABLED) {
  console.warn('[ADS] PANIC SWITCH ENABLED → svi oglasi su isključeni (EXPO_PUBLIC_ADS_DISABLED=1)');
}

// ANDROID (prod)
const REAL_INTERSTITIAL_ANDROID = 'ca-app-pub-2786609619751533/5387589780';
const REAL_REWARDED_ANDROID = 'ca-app-pub-2786609619751533/2876782994';
const REAL_BANNER_ANDROID = 'ca-app-pub-2786609619751533/5886089716';

// IOS (prod)
const REAL_INTERSTITIAL_IOS = 'ca-app-pub-2786609619751533/4903362291';
const REAL_REWARDED_IOS = 'ca-app-pub-2786609619751533/2772022979';
const REAL_BANNER_IOS = 'ca-app-pub-2786609619751533/4576877479';

// Izaberi po platformi
const REAL_INTERSTITIAL = Platform.OS === 'ios' ? REAL_INTERSTITIAL_IOS : REAL_INTERSTITIAL_ANDROID;
const REAL_REWARDED = Platform.OS === 'ios' ? REAL_REWARDED_IOS : REAL_REWARDED_ANDROID;
const REAL_BANNER = Platform.OS === 'ios' ? REAL_BANNER_IOS : REAL_BANNER_ANDROID;

export const INTERSTITIAL_AD_UNIT_ID = USE_TEST_IDS ? TestIds.INTERSTITIAL : REAL_INTERSTITIAL;
export const REWARDED_AD_UNIT_ID = USE_TEST_IDS ? TestIds.REWARDED : REAL_REWARDED;
export const BANNER_AD_UNIT_ID = USE_TEST_IDS ? TestIds.BANNER : REAL_BANNER;

console.log('[ADS] Mode:', USE_TEST_IDS ? 'TEST' : 'REAL', {
  interstitial: INTERSTITIAL_AD_UNIT_ID,
  rewarded: REWARDED_AD_UNIT_ID,
  banner: BANNER_AD_UNIT_ID,
});

if (!USE_TEST_IDS) {
  const looksLikeTest =
    INTERSTITIAL_AD_UNIT_ID === TestIds.INTERSTITIAL ||
    REWARDED_AD_UNIT_ID === TestIds.REWARDED ||
    BANNER_AD_UNIT_ID === TestIds.BANNER;
  if (looksLikeTest) {
    console.warn('[ADS][WARN] REAL mode je aktivan, ali koristiš TestIds – nalepi prave AdMob ID-jeve!');
  }
}

// START: Helper – centralna odluka ko vidi reklame
// Bez “guest” režima: ako korisnik NIJE ulogovan, NE prikazuj oglase (sigurniji UX).
export const shouldShowAds = ({ session, profile } = {}) => {
  if (ADS_DISABLED) return false;

  // Dok se učitava – ne prikazuj
  if (isLoadingSessionProfile(session, profile)) return false;

  // Nema sesije (izlogovan) → ne prikazuj (pošto nema “guest” u app flow-u)
  if (session === null) return false;

  // Izvuci plan iz nekoliko potencijalnih polja; default 'free'
  const raw =
    profile?.plan ??
    profile?.subscription_tier ??
    profile?.role ??
    (profile?.is_pro ? 'pro' : null) ??
    (profile?.is_premium ? 'premium' : null) ??
    'free';

  const plan = normalizePlanCanon(raw); // 'free' | 'premium' | 'pro' | 'proplus'
  const paid = isPaidTier(plan);        // premium/pro/proplus => true

  // Plaćeni planovi NIKAD ne vide oglase
  return !paid;
};
// END: Helper

// START: Guard wrapper-i – ne prikazuj za paid
export const showInterstitialAdIfEligible = async ({ session, profile } = {}) => {
  if (ADS_DISABLED) {
    console.log('[ADS] Interstitial SKIPPED (panic switch)');
    return;
  }
  if (!shouldShowAds({ session, profile })) {
    console.log('[ADS] Interstitial SKIPPED (paid tier or not allowed)');
    return;
  }
  return showInterstitialAd();
};

export const showRewardedAdIfEligible = async ({ session, profile } = {}, onReward) => {
  if (ADS_DISABLED) {
    console.log('[ADS] Rewarded SKIPPED (panic switch)');
    return;
  }
  if (!shouldShowAds({ session, profile })) {
    console.log('[ADS] Rewarded SKIPPED (paid tier or not allowed)');
    return;
  }
  return showRewardedAd(onReward);
};
// END: Guard wrapper-i

// === INTERSTITIAL REKLAMA ===
export const showInterstitialAd = async () => {
  if (ADS_DISABLED) {
    console.log('[INTERSTITIAL] blocked by panic switch');
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: true,
    });

    const unsubscribeError = interstitial.addAdEventListener(AdEventType.ERROR, error => {
      console.log('[INTERSTITIAL][ERROR]', error?.code, error?.message, error);
      try { unsubscribeLoaded(); } catch { }
      try { unsubscribeClosed(); } catch { }
      try { unsubscribeError(); } catch { }
      reject(error);
    });

    const unsubscribeLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      interstitial.show();
    });

    const unsubscribeClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      try { unsubscribeLoaded(); } catch { }
      try { unsubscribeClosed(); } catch { }
      try { unsubscribeError(); } catch { }
      resolve();
    });

    interstitial.load();
  });
};

// === REWARDED REKLAMA ===
export const showRewardedAd = async (onReward) => {
  if (ADS_DISABLED) {
    console.log('[REWARDED] blocked by panic switch');
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const rewarded = RewardedAd.createForAdRequest(REWARDED_AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: true,
    });

    const unsubscribeLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      try { rewarded.show(); }
      catch (e) {
        console.log('[REWARDED][SHOW][ERROR]', e);
        unsubscribeAll();
        reject(e);
      }
    });

    const unsubscribeEarned = rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, reward => {
      if (onReward) onReward(reward);
    });

    const unsubscribeClosed = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
      unsubscribeAll();
      resolve();
    });

    const unsubscribeError = rewarded.addAdEventListener(AdEventType.ERROR, error => {
      console.log('[REWARDED][LOAD/GEN][ERROR]', error?.code, error?.message, error);
      unsubscribeAll();
      reject(error);
    });

    const unsubscribeAll = () => {
      try { unsubscribeLoaded(); } catch { }
      try { unsubscribeEarned(); } catch { }
      try { unsubscribeClosed(); } catch { }
      try { unsubscribeError(); } catch { }
    };

    rewarded.load();
  });
};

// Kreiranje instancije za modalni flow (učitavanje unapred)
export const createRewardedAdInstance = () => {
  return RewardedAd.createForAdRequest(REWARDED_AD_UNIT_ID, {
    requestNonPersonalizedAdsOnly: true,
  });
};

export { RewardedAdEventType } from 'react-native-google-mobile-ads';

// === Banner (basic) ===
export const AdBanner = ({ size = BannerAdSize.ADAPTIVE_BANNER, onError }) => (
  ADS_DISABLED ? null : (
    <BannerAd
      unitId={BANNER_AD_UNIT_ID}
      size={size}
      requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      onAdFailedToLoad={onError ?? ((e) => console.log('[BANNER][ERROR]:', e))}
    />
  )
);

// === Guardovani Banner – no-fill backoff + stabilna visina ===
const sizeToHeight = (sz) => {
  switch (sz) {
    case BannerAdSize.LARGE_BANNER: return 100;  // 320x100
    case BannerAdSize.BANNER: return 50;   // 320x50
    case BannerAdSize.ADAPTIVE_BANNER:
    default: return 62;                           // minimalna visina da UI ne skače
  }
};

export const AdBannerIfEligible = React.memo(
  ({ session, profile, size = BannerAdSize.ADAPTIVE_BANNER, onError, npa = true }) => {
    if (ADS_DISABLED) {
      console.log('[BANNER] Hidden by panic switch');
      return null;
    }
    const canShow = shouldShowAds({ session, profile }); // false = ne renderuj
    if (!canShow) {
      console.log('[BANNER] Hidden for paid tier or not allowed');
      return null;
    }

    const [attempt, setAttempt] = useState(0);
    const [visible, setVisible] = useState(true);
    const timerRef = useRef(null);
    const height = useMemo(() => sizeToHeight(size), [size]);

    useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

    const scheduleRetry = () => {
      const backoffMs = attempt === 0 ? 15000 : attempt === 1 ? 30000 : 60000;
      timerRef.current = setTimeout(() => {
        setAttempt((a) => a + 1);
        setVisible(true); // remount → novi request
      }, backoffMs);
    };

    const handleError = (e) => {
      console.log('[BANNER][ERROR]:', e?.code || e?.message || e, 'attempt=', attempt);
      setVisible(false);    // unmount BannerAd
      scheduleRetry();
      onError?.(e);
    };

    const handleLoaded = () => {
      if (attempt !== 0) setAttempt(0);
    };

    return (
      <View style={{ height, width: '100%' }}>
        {visible && (
          <BannerAd
            key={attempt}
            unitId={BANNER_AD_UNIT_ID}
            size={size}
            requestOptions={{ requestNonPersonalizedAdsOnly: !!npa }}
            onAdLoaded={handleLoaded}
            onAdFailedToLoad={handleError}
          />
        )}
      </View>
    );
  }
);
