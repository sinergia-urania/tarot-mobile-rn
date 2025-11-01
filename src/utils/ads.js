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

// START: helper – razlikuj "guest" od "loading"
// undefined => učitava se; null => nema sesije (gost)
const isLoadingSessionProfile = (session, profile) => {
  if (typeof session === 'undefined') return true;
  // ako postoji sesija, ali profil još uvek nije učitan
  if (session && typeof profile === 'undefined') return true;
  return false;
};
// END: helper – razlikuj "guest" od "loading"

// === KONFIGURACIJA AD UNIT ID-eva ===
// TEST ↔ PROD toggle po env promenljivoj.
// START: USE_TEST_IDS kontrola isključivo preko EXPO_PUBLIC_ADS_ENV (ignorišemo __DEV__)
// - Kada EXPO_PUBLIC_ADS_ENV !== 'prod' -> TEST ID-jevi
// - Kada EXPO_PUBLIC_ADS_ENV === 'prod' -> REAL ID-jevi (ispod nalepi svoje)
const USE_TEST_IDS = process.env.EXPO_PUBLIC_ADS_ENV !== 'prod';
// START: eksplicitni env export za lakši debug
export const ADS_ENV = USE_TEST_IDS ? 'test' : 'prod';
// END: eksplicitni env export
// (opciono) dodatni log radi dijagnostike
console.log('[ADS] __DEV__ =', __DEV__);
// END: USE_TEST_IDS kontrola isključivo preko EXPO_PUBLIC_ADS_ENV

// START: PANIC SWITCH – globalno gašenje oglasa
export const ADS_DISABLED = String(process.env.EXPO_PUBLIC_ADS_DISABLED || '0') === '1';
if (ADS_DISABLED) {
  console.warn('[ADS] PANIC SWITCH ENABLED → svi oglasi su isključeni (EXPO_PUBLIC_ADS_DISABLED=1)');
}
// END: PANIC SWITCH

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
// START: safety – upozori ako je REAL mod a ostali TestIds (zaboravljeni ID-jevi)
if (!USE_TEST_IDS) {
  const looksLikeTest =
    INTERSTITIAL_AD_UNIT_ID === TestIds.INTERSTITIAL ||
    REWARDED_AD_UNIT_ID === TestIds.REWARDED ||
    BANNER_AD_UNIT_ID === TestIds.BANNER;
  if (looksLikeTest) {
    console.warn('[ADS][WARN] REAL mode je aktivan, ali koristiš TestIds – nalepi prave AdMob ID-jeve!');
  }
}
// END: safety

// START: Helper – centralna odluka ko vidi reklame
// GOST i FREE vide reklame; PREMIUM/PRO ne vide.
// Oslanja se na session i/ili profile objekat iz app-a (npr. iz Supabase-a).
export const shouldShowAds = ({ session, profile } = {}) => {
  // START: panic switch ima prednost – nema oglasa nigde
  if (ADS_DISABLED) return false;
  // END: panic switch

  // START: striktni gate — dok ne znamo plan, NEMA reklama
  if (isLoadingSessionProfile(session, profile)) return false;
  // Ako je session === null → gost (dozvoli oglase)
  if (session === null) return true;
  // END: striktni gate

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
  return !isPaid; // free → true, pro/premium → false
};
// END: Helper – centralna odluka ko vidi reklame

// START: Guard wrapper-i – ne prikazuj za premium/pro
export const showInterstitialAdIfEligible = async ({ session, profile } = {}) => {
  if (ADS_DISABLED) {
    console.log('[ADS] Interstitial SKIPPED (panic switch)');
    return;
  }
  if (!shouldShowAds({ session, profile })) {
    console.log('[ADS] Interstitial SKIPPED for paid tier or unknown plan');
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
    console.log('[ADS] Rewarded SKIPPED for paid tier or unknown plan');
    return;
  }
  return showRewardedAd(onReward);
};
// END: Guard wrapper-i – ne prikazuj za premium/pro

// === INTERSTITIAL REKLAMA ===
export const showInterstitialAd = async () => {
  // START: panic – hard blokiraj i direktne pozive
  if (ADS_DISABLED) {
    console.log('[INTERSTITIAL] blocked by panic switch');
    return Promise.resolve();
  }
  // END: panic

  return new Promise((resolve, reject) => {
    const interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: true,
    });

    // START: fix – definiši ERROR listener prvo (sigurniji closure redosled)
    const unsubscribeError = interstitial.addAdEventListener(AdEventType.ERROR, error => {
      console.log('[INTERSTITIAL][ERROR]', error?.code, error?.message, error);
      try { unsubscribeLoaded(); } catch { }
      try { unsubscribeClosed(); } catch { }
      try { unsubscribeError(); } catch { }
      reject(error);
    });
    // END: fix

    const unsubscribeLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      interstitial.show();
    });

    // START: fix – odjava i error listenera da ne ostane aktivan
    const unsubscribeClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      try { unsubscribeLoaded(); } catch { }
      try { unsubscribeClosed(); } catch { }
      try { unsubscribeError(); } catch { }
      resolve();
    });
    // END: fix

    interstitial.load();
  });
};

// === REWARDED REKLAMA (production ready) ===
export const showRewardedAd = async (onReward) => {
  // START: panic – hard blokiraj i direktne pozive
  if (ADS_DISABLED) {
    console.log('[REWARDED] blocked by panic switch');
    return Promise.resolve();
  }
  // END: panic

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
  // START: panic switch – ne renderuj baner slot uopšte
  ADS_DISABLED ? null : (
    <BannerAd
      unitId={BANNER_AD_UNIT_ID}
      size={size}
      requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      onAdFailedToLoad={onError ?? ((e) => console.log('[BANNER][ERROR]:', e))}
    />
  )
  // END: panic switch
);
// END: Banner komponenta

// START: Guardovani Banner – no-fill backoff + stabilna visina (RN)
const sizeToHeight = (sz) => {
  switch (sz) {
    case BannerAdSize.LARGE_BANNER: return 100;  // 320x100
    case BannerAdSize.BANNER: return 50;         // 320x50
    // ADAPTIVE_BANNER visina varira; rezervišemo ~62 kao minimum da UI ne skače
    case BannerAdSize.ADAPTIVE_BANNER:
    default: return 62;
  }
};

export const AdBannerIfEligible = React.memo(
  ({ session, profile, size = BannerAdSize.ADAPTIVE_BANNER, onError, npa = true }) => {
    // START: striktni gate + panic switch
    if (ADS_DISABLED) {
      console.log('[BANNER] Hidden by panic switch');
      return null;
    }
    const canShow = shouldShowAds({ session, profile }); // false tokom loading-a; true tek kad znamo da je guest/free
    // END: striktni gate + panic switch

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
