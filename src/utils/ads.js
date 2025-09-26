// utils/ads.js – TEST/PROD toggle + guard logika + detaljni logovi
// START: RN imports za banner backoff/stabilnu visinu
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
// END: RN imports za banner backoff/stabilnu visinu
import {
  AdEventType,
  BannerAd,
  BannerAdSize,
  InterstitialAd,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

// START: Helper – centralna odluka ko vidi reklame
// GOST i FREE vide reklame; PREMIUM/PRO ne vide.
// Oslanja se na session i/ili profile objekat iz app-a (npr. iz Supabase-a).
export const shouldShowAds = ({ session, profile } = {}) => {
  // Gosti (nema session-a) -> prikazati reklame
  if (!session) return true;

  // Pokušaj čitanja plana iz više potencijalnih polja (fleksibilno)
  const tier =
    profile?.subscription_tier ||
    profile?.plan ||
    profile?.role ||
    (profile?.is_pro ? 'pro' : null) ||
    (profile?.is_premium ? 'premium' : null) ||
    'free';

  const tierNorm = String(tier).toLowerCase();
  const isPaid = ['pro', 'premium'].includes(tierNorm);
  return !isPaid;
};
// END: Helper – centralna odluka ko vidi reklame

// === KONFIGURACIJA AD UNIT ID-eva ===
// TEST ↔ PROD toggle po env promenljivoj.
// - U dev buildu i kada EXPO_PUBLIC_ADS_ENV !== 'prod' -> TEST ID-jevi
// - Kada EXPO_PUBLIC_ADS_ENV === 'prod' -> REAL ID-jevi (ispod ih samo nalepi)
const USE_TEST_IDS = __DEV__ || process.env.EXPO_PUBLIC_ADS_ENV !== 'prod';

// 🔽🔽🔽 OVDE SAMO NALepi SVOJE PRAVE AdMob ID-jeve (Android) 🔽🔽🔽
// Primer formata: 'ca-app-pub-2786609619751533/6811905994'
const REAL_INTERSTITIAL = 'ca-app-pub-2786609619751533/6811905994'; // must-watch
const REAL_REWARDED = 'ca-app-pub-2786609619751533/6157299876'; // coinsRewardAd
const REAL_BANNER = 'ca-app-pub-2786609619751533/8415593631'; // banner_bottom
// 🔼🔼🔼 SAMO OVO POPUNI – ostalo ne diraj 🔼🔼🔼

// Exportovan izbor ID-jeva na osnovu flag-a
export const INTERSTITIAL_AD_UNIT_ID = USE_TEST_IDS ? TestIds.INTERSTITIAL : REAL_INTERSTITIAL;
export const REWARDED_AD_UNIT_ID = USE_TEST_IDS ? TestIds.REWARDED : REAL_REWARDED;
export const BANNER_AD_UNIT_ID = USE_TEST_IDS ? TestIds.BANNER : REAL_BANNER;

console.log('[ADS] Mode:', USE_TEST_IDS ? 'TEST' : 'REAL', {
  interstitial: INTERSTITIAL_AD_UNIT_ID,
  rewarded: REWARDED_AD_UNIT_ID,
  banner: BANNER_AD_UNIT_ID,
});

// START: Guard wrapper-i – ne prikazuj za premium/pro
export const showInterstitialAdIfEligible = async ({ session, profile } = {}) => {
  if (!shouldShowAds({ session, profile })) {
    console.log('[ADS] Interstitial SKIPPED for paid tier');
    return;
  }
  return showInterstitialAd();
};

export const showRewardedAdIfEligible = async ({ session, profile } = {}, onReward) => {
  if (!shouldShowAds({ session, profile })) {
    console.log('[ADS] Rewarded SKIPPED for paid tier');
    return;
  }
  return showRewardedAd(onReward);
};
// END: Guard wrapper-i – ne prikazuj za premium/pro

// === INTERSTITIAL REKLAMA ===
export const showInterstitialAd = async () => {
  return new Promise((resolve, reject) => {
    const interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: true,
    });

    const unsubscribeLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      interstitial.show();
    });

    // START: fix – odjava i error listenera da ne ostane aktivan
    const unsubscribeClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      unsubscribeLoaded();
      unsubscribeClosed();
      unsubscribeError();
      resolve();
    });
    // END: fix

    const unsubscribeError = interstitial.addAdEventListener(AdEventType.ERROR, error => {
      console.log('[INTERSTITIAL][ERROR]', error?.code, error?.message, error);
      unsubscribeLoaded();
      unsubscribeClosed();
      unsubscribeError();
      reject(error);
    });

    interstitial.load();
  });
};

// === REWARDED REKLAMA (production ready) ===
export const showRewardedAd = async (onReward) => {
  return new Promise((resolve, reject) => {
    const rewarded = RewardedAd.createForAdRequest(REWARDED_AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: true,
    });

    // START: Rewarded mora da koristi RewardedAdEventType.LOADED
    const unsubscribeLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      try {
        rewarded.show();
      } catch (e) {
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
    // END

    rewarded.load();
  });
};

// Kreiranje instancije za modalni flow (učitavanje unapred)
export const createRewardedAdInstance = () => {
  return RewardedAd.createForAdRequest(REWARDED_AD_UNIT_ID, {
    requestNonPersonalizedAdsOnly: true,
  });
};

// START: re-export event enum za lakši import
export { RewardedAdEventType } from 'react-native-google-mobile-ads';
// END: re-export

// START: Banner komponenta (prosta varijanta – ostaje)
export const AdBanner = ({ size = BannerAdSize.ADAPTIVE_BANNER, onError }) => (
  <BannerAd
    unitId={BANNER_AD_UNIT_ID}
    size={size}
    requestOptions={{ requestNonPersonalizedAdsOnly: true }}
    onAdFailedToLoad={onError ?? ((e) => console.log('[BANNER][ERROR]:', e))}
  />
);
// END: Banner komponenta

// START: Guardovani Banner – no-fill backoff + stabilna visina (RN)
const sizeToHeight = (sz) => {
  switch (sz) {
    case BannerAdSize.LARGE_BANNER: return 100;  // 320x100
    case BannerAdSize.BANNER: return 50;   // 320x50
    // ADAPTIVE_BANNER visina varira; rezervišemo ~62 kao minimum da UI ne skače
    case BannerAdSize.ADAPTIVE_BANNER:
    default: return 62;
  }
};

export const AdBannerIfEligible = React.memo(
  ({ session, profile, size = BannerAdSize.ADAPTIVE_BANNER, onError, npa = true }) => {
    const canShow = shouldShowAds({ session, profile });
    const [attempt, setAttempt] = useState(0);
    const [visible, setVisible] = useState(true);
    const timerRef = useRef(null);
    const height = useMemo(() => sizeToHeight(size), [size]);

    useEffect(() => {
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, []);

    if (!canShow) {
      console.log('[BANNER] Hidden for paid tier');
      return null;
    }

    const scheduleRetry = () => {
      // Backoff: 15s → 30s → 60s (cap 60s)
      const backoffMs = attempt === 0 ? 15000 : attempt === 1 ? 30000 : 60000;
      timerRef.current = setTimeout(() => {
        setAttempt((a) => a + 1);
        setVisible(true);   // remount → novi ad request
      }, backoffMs);
    };

    const handleError = (e) => {
      console.log('[BANNER][ERROR]:', e?.code || e?.message || e, 'attempt=', attempt);
      setVisible(false);    // unmount BannerAd
      scheduleRetry();
      onError?.(e);
    };

    const handleLoaded = () => {
      // uspešan load – reset pokušaje
      if (attempt !== 0) setAttempt(0);
    };

    return (
      <View style={{ height, width: '100%' }}>
        {visible && (
          <BannerAd
            key={attempt} // forsira remount pri svakom retry-u
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
// END: Guardovani Banner – no-fill backoff + stabilna visina (RN)
