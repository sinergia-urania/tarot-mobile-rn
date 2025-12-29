// src/pages/MembershipModal.jsx
// Production-ready modal - samo IAP (Google Play + App Store)

import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useDukati } from '../context/DukatiContext';
import { useTarotIAP } from '../context/TarotIAPProvider';
import { supabase } from '../utils/supabaseClient';

// Fallback bonus vrednosti
const PAKET_BONUSI = { free: 150, premium: 4000, pro: 6500, proplus: 70000 };

// === SKU mapping za Play Billing ===
const SKU_MAP = {
  premium: 'tarot_premium_monthly',
  pro: 'tarot_pro_monthly',
  proplus: 'tarot_proplus_annual',
  topup500: 'tarot_coins_500',
  topup1000: 'tarot_coins_1000',
};

// === Helper za lokalizovanu cenu iz Play Billing-a ===
const getFormattedStorePrice = (product) => {
  if (!product) return null;
  return (
    // iOS expo-iap koristi displayPrice (npr. "4,99 €")
    product.displayPrice ||
    // Android / standardni formati
    product.localizedPrice ||
    product.priceString ||
    product.subscriptionOfferDetails?.[0]?.pricingPhases?.pricingPhaseList?.[0]?.formattedPrice ||
    product.oneTimePurchaseOfferDetails?.formattedPrice ||
    (product.price != null && product.currency ? `${product.price} ${product.currency}` : null)
  );
};

// Packages definition
const packages = [
  {
    name: 'Free',
    key: 'free',
    color: '#facc15',
    features: [
      { label: '', value: 'AI model: Mini', valueKey: 'aiModelMini', color: '#facc15' },
      { label: 'Značenje karata', labelKey: 'meanings', icon: 'bank-outline' },
      { label: 'Klasična otvaranja', labelKey: 'classicSpreads', icon: 'bank-outline' },
      { label: 'Keltski krst', labelKey: 'celticCross', icon: 'bank-outline' },
      {
        label: 'Kabalističko otvaranje',
        labelKey: 'kabbalisticSpread',
        icon: 'close',
        color: '#ff5454',
      },
      {
        label: 'Astrološko otvaranje',
        labelKey: 'astrologicalSpread',
        icon: 'close',
        color: '#ff5454',
      },
      {
        label: 'Astro tranziti',
        labelKey: 'astrologicalTransits',
        icon: 'close',
        color: '#ff5454',
      },
      { label: 'AI potpitanja', labelKey: 'aiFollowups', icon: 'close', color: '#ff5454' },
      {
        label: 'Arhiva otvaranja',
        labelKey: 'historyArchive',
        icon: 'close',
        color: '#ff5454',
      },
      { label: '', value: 'Reklame', valueKey: 'ads', color: '#facc15' },
    ],
  },
  {
    name: 'Premium',
    key: 'premium',
    color: '#a8ff76',
    features: [
      { label: '', value: 'AI model: Large', valueKey: 'aiModelLarge', color: '#a8ff76' },
      { label: 'Značenje karata', labelKey: 'meanings', icon: 'bank-outline' },
      { label: 'Klasična otvaranja', labelKey: 'classicSpreads', icon: 'bank-outline' },
      { label: 'Keltski krst', labelKey: 'celticCross', icon: 'bank-outline' },
      {
        label: 'Kabalističko otvaranje',
        labelKey: 'kabbalisticSpread',
        icon: 'bank-outline',
      },
      {
        label: 'Astrološko otvaranje',
        labelKey: 'astrologicalSpread',
        icon: 'close',
        color: '#ff5454',
      },
      { label: 'Astro tranziti', labelKey: 'astrologicalTransits', icon: 'bank-outline' },
      { label: 'AI potpitanja', labelKey: 'aiFollowups', icon: 'close', color: '#ff5454' },
      {
        label: 'Arhiva otvaranja',
        labelKey: 'historyArchive',
        icon: 'close',
        color: '#ff5454',
      },
      { label: '', value: 'Bez reklama', valueKey: 'noAds', color: '#a8ff76' },
    ],
  },
  {
    name: 'Pro',
    key: 'pro',
    color: '#ae7ffb',
    features: [
      { label: '', value: 'AI model: Large', valueKey: 'aiModelLarge', color: '#ae7ffb' },
      { label: 'Značenje karata', labelKey: 'meanings', icon: 'bank-outline' },
      { label: 'Klasična otvaranja', labelKey: 'classicSpreads', icon: 'bank-outline' },
      { label: 'Keltski krst', labelKey: 'celticCross', icon: 'bank-outline' },
      {
        label: 'Kabalističko otvaranje',
        labelKey: 'kabbalisticSpread',
        icon: 'bank-outline',
      },
      { label: 'Astrološko otvaranje', labelKey: 'astrologicalSpread', icon: 'bank-outline' },
      { label: 'Astro tranziti', labelKey: 'astrologicalTransits', icon: 'bank-outline' },
      { label: 'AI potpitanja', labelKey: 'aiFollowups', icon: 'bank-outline' },
      { label: 'Arhiva otvaranja', labelKey: 'historyArchive', icon: 'bank-outline' },
      { label: '', value: 'Bez reklama', valueKey: 'noAds', color: '#ae7ffb' },
    ],
  },
  {
    name: 'ProPlus',
    key: 'proplus',
    color: '#ef4444',
    features: [
      { label: '', value: 'AI model: Large', valueKey: 'aiModelLarge', color: '#ef4444' },
      { label: 'Značenje karata', labelKey: 'meanings', icon: 'bank-outline' },
      { label: 'Klasična otvaranja', labelKey: 'classicSpreads', icon: 'bank-outline' },
      { label: 'Keltski krst', labelKey: 'celticCross', icon: 'bank-outline' },
      {
        label: 'Kabalističko otvaranje',
        labelKey: 'kabbalisticSpread',
        icon: 'bank-outline',
      },
      { label: 'Astrološko otvaranje', labelKey: 'astrologicalSpread', icon: 'bank-outline' },
      { label: 'Astro tranziti', labelKey: 'astrologicalTransits', icon: 'bank-outline' },
      { label: 'AI potpitanja', labelKey: 'aiFollowups', icon: 'bank-outline' },
      { label: 'Arhiva otvaranja', labelKey: 'historyArchive', icon: 'bank-outline' },
      { label: '', value: 'Bez reklama', valueKey: 'noAds', color: '#ef4444' },
    ],
  },
];

export default function MembershipModal({ visible, onClose }) {
  const { t } = useTranslation(['common']);
  const { userId, userPlan, fetchDukatiSaServera, refreshUserPlan } = useDukati();
  const { iapReady, devMode, startPlanPurchase, startTopupPurchase, products } = useTarotIAP();

  const [loadingPlanKey, setLoadingPlanKey] = React.useState(null);
  const [loadingTopUp, setLoadingTopUp] = React.useState(false);

  // Remote pricing sa servera
  const [mPricing, setMPricing] = React.useState(null);

  React.useEffect(() => {
    let live = true;
    supabase.functions
      .invoke('membership-config')
      .then(({ data, error }) => {
        if (!error && data && live) setMPricing(data);
      })
      .catch(() => { });
    return () => {
      live = false;
    };
  }, []);

  const BONUS = {
    free: mPricing?.packages?.free?.coinsBonus ?? PAKET_BONUSI.free,
    premium: mPricing?.packages?.premium?.coinsBonus ?? PAKET_BONUSI.premium,
    pro: mPricing?.packages?.pro?.coinsBonus ?? PAKET_BONUSI.pro,
    proplus: mPricing?.packages?.proplus?.coinsBonus ?? PAKET_BONUSI.proplus,
  };

  const PRICE = {
    premium:
      mPricing?.packages?.premium?.price ?? {
        amount: 599,
        currency: 'RSD',
        period: 'mesec',
      },
    pro:
      mPricing?.packages?.pro?.price ?? { amount: 999, currency: 'RSD', period: 'mesec' },
    proplus:
      mPricing?.packages?.proplus?.price ?? {
        amount: 7999,
        currency: 'RSD',
        period: 'godina',
      },
    topup500:
      mPricing?.topups?.coins_500?.price ?? { amount: 100, currency: 'RSD' },
    topup1000:
      mPricing?.topups?.coins_1000?.price ?? { amount: 170, currency: 'RSD' },
  };

  // ========================================================================
  // PLAN PURCHASE HANDLERS
  // ========================================================================

  const onPlanPress = React.useCallback(
    async (planKey) => {
      if (!iapReady && !devMode) {
        Toast.show({
          type: 'error',
          text1: t('common:errors.genericTitle', { defaultValue: 'Greška' }),
          text2: t('common:errors.storeUnavailable', {
            defaultValue: 'Prodavnica nije dostupna.',
          }),
          position: 'bottom',
        });
        return;
      }

      if (!userId) {
        Toast.show({
          type: 'error',
          text1: t('common:errors.genericTitle', { defaultValue: 'Greška' }),
          text2: t('common:errors.notLoggedIn', {
            defaultValue: 'Niste ulogovani.',
          }),
          position: 'bottom',
        });
        return;
      }

      setLoadingPlanKey(planKey);
      try {
        await startPlanPurchase(planKey);
      } catch (err) {
        Toast.show({
          type: 'error',
          text1: t('common:errors.genericTitle', { defaultValue: 'Greška' }),
          text2:
            err?.message ||
            t('common:errors.tryAgain', { defaultValue: 'Pokušajte ponovo.' }),
          position: 'bottom',
        });
      } finally {
        setLoadingPlanKey(null);
      }
    },
    [iapReady, devMode, userId, startPlanPurchase, t]
  );

  // ========================================================================
  // TOPUP PURCHASE HANDLER
  // ========================================================================

  const onTopUpPress = React.useCallback(
    async (amount) => {
      if (!iapReady && !devMode) {
        Toast.show({
          type: 'error',
          text1: t('common:errors.genericTitle', { defaultValue: 'Greška' }),
          text2: t('common:errors.storeUnavailable', {
            defaultValue: 'Prodavnica nije dostupna.',
          }),
          position: 'bottom',
        });
        return;
      }

      if (!userId) {
        Toast.show({
          type: 'error',
          text1: t('common:errors.genericTitle', { defaultValue: 'Greška' }),
          text2: t('common:errors.notLoggedIn', {
            defaultValue: 'Niste ulogovani.',
          }),
          position: 'bottom',
        });
        return;
      }

      setLoadingTopUp(true);
      try {
        await startTopupPurchase(amount);
      } catch (err) {
        Toast.show({
          type: 'error',
          text1: t('common:errors.genericTitle', { defaultValue: 'Greška' }),
          text2:
            err?.message ||
            t('common:errors.tryAgain', { defaultValue: 'Pokušajte ponovo.' }),
          position: 'bottom',
        });
      } finally {
        setLoadingTopUp(false);
      }
    },
    [iapReady, devMode, userId, startTopupPurchase, t]
  );

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Packages Carousel */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 18, paddingVertical: 4, paddingHorizontal: 4 }}
            style={{ marginBottom: 10 }}
          >
            {packages.map((pkg) => {
              const isCurrent = String(userPlan) === pkg.key;
              const isLoading = loadingPlanKey === pkg.key;
              const disabled = isCurrent || isLoading;

              return (
                <View key={pkg.name} style={{ alignItems: 'center' }}>
                  <View
                    style={[
                      styles.card,
                      {
                        borderColor: pkg.color,
                        width: 260,
                        minHeight: 240,
                        paddingHorizontal: 22,
                        paddingVertical: 18,
                      },
                      pkg.name === 'Pro' && styles.cardBest,
                      pkg.key === 'proplus' && styles.cardBestPlus,
                    ]}
                  >
                    {pkg.key === 'proplus' && (
                      <View style={styles.bestOfferBadge}>
                        <Text style={styles.bestOfferText}>
                          ⭐{' '}
                          {t('common:membership.proplus.bestOffer', {
                            defaultValue: 'Najbolja ponuda',
                          })}
                        </Text>
                      </View>
                    )}

                    <Text style={[styles.cardTitle, { color: pkg.color }]}>
                      {t(`common:membership.packages.${pkg.key}`, {
                        defaultValue: pkg.name,
                      })}
                    </Text>

                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 5,
                      }}
                    >
                      <Text style={{ fontSize: 20, marginRight: 5 }}>🪙</Text>
                      <Text
                        style={{
                          color: '#ffd700',
                          fontSize: 16,
                          fontWeight: 'bold',
                          letterSpacing: 0.5,
                        }}
                      >
                        {BONUS[pkg.key]}
                      </Text>
                    </View>

                    {pkg.features.map((f, i) => (
                      <View style={styles.featureRow} key={i}>
                        {f.label ? (
                          <Text style={styles.featureLabel}>
                            {t(`common:membership.features.${f.labelKey}`, {
                              defaultValue: f.label,
                            })}
                          </Text>
                        ) : null}
                        {f.icon ? (
                          f.icon === 'close' ? (
                            <MaterialCommunityIcons
                              name="close"
                              size={20}
                              color={f.color || '#fff'}
                            />
                          ) : (
                            <MaterialCommunityIcons
                              name={f.icon}
                              size={20}
                              color="#ffd700"
                            />
                          )
                        ) : (
                          <Text
                            style={[
                              styles.featureValue,
                              {
                                color: f.color || '#ffd700',
                                flex: 1,
                                textAlign: 'center',
                                fontSize: 15,
                                alignSelf: 'center',
                                width: '100%',
                              },
                            ]}
                          >
                            {t(`common:membership.values.${f.valueKey}`, {
                              defaultValue: f.value,
                            })}
                          </Text>
                        )}
                      </View>
                    ))}

                    {/* Free plan notice */}
                    {pkg.name === 'Free' && (
                      <Text
                        style={{
                          color: '#ffd700bb',
                          fontSize: 14,
                          textAlign: 'center',
                          marginTop: 10,
                          marginBottom: 25,
                        }}
                      >
                        {t('common:membership.notes.freeCoinsAd', {
                          defaultValue:
                            'Dukati se osvajaju gledanjem reklama (samo za free korisnike).',
                        })}
                      </Text>
                    )}

                    {/* Cancel Subscription Button - prikazuje se samo na Free kartici ako korisnik NIJE na free */}
                    {pkg.name === 'Free' && userPlan !== 'free' && (
                      <TouchableOpacity
                        style={{
                          backgroundColor: '#ff5454',
                          borderRadius: 7,
                          padding: 10,
                          marginTop: 12,
                          alignSelf: 'center',
                          opacity: loadingPlanKey === 'cancel' ? 0.5 : 1,
                        }}
                        disabled={loadingPlanKey === 'cancel'}
                        onPress={async () => {
                          // Potvrda
                          Alert.alert(
                            t('common:membership.cancel.confirmTitle', { defaultValue: 'Otkaži pretplatu?' }),
                            t('common:membership.cancel.confirmBody', {
                              defaultValue: 'Prelazak na FREE će biti odmah. Možeš ponovo da se pretplatiš bilo kada.'
                            }),
                            [
                              {
                                text: t('common:misc.cancel', { defaultValue: 'Ne' }),
                                style: 'cancel'
                              },
                              {
                                text: t('common:membership.cancel.confirmCta', { defaultValue: 'Da, otkaži' }),
                                style: 'destructive',
                                onPress: async () => {
                                  setLoadingPlanKey('cancel');
                                  try {
                                    // 1) Pozovi backend za otkazivanje
                                    const { data, error } = await supabase.functions.invoke('subscription_cancel', {
                                      body: {},
                                    });

                                    if (error) throw error;
                                    // 2) Osvezi state
                                    await fetchDukatiSaServera();
                                    await refreshUserPlan();
                                    // 3) Otvori Google Play Subscriptions (da korisnik ručno otkaže)
                                    if (Platform.OS === 'android') {
                                      const currentSku =
                                        userPlan === 'premium' ? 'tarot_premium_monthly' :
                                          userPlan === 'pro' ? 'tarot_pro_monthly' :
                                            userPlan === 'proplus' ? 'tarot_proplus_annual' : null;

                                      if (currentSku) {
                                        const url = `https://play.google.com/store/account/subscriptions?sku=${currentSku}&package=com.mare82.unatarot`;

                                        Linking.openURL(url).catch(err => {
                                          console.warn('Failed to open Play subscriptions:', err);
                                        });
                                      }
                                    }
                                    Toast.show({
                                      type: 'success',
                                      text1: t('common:messages.successTitle', { defaultValue: 'Uspeh!' }),
                                      text2: t('common:membership.cancel.scheduled', {
                                        defaultValue: 'Pretplata je otkazana. Prešli ste na FREE plan.',
                                      }),
                                      position: 'bottom',
                                    });
                                    onClose?.();
                                  } catch (err) {
                                    Toast.show({
                                      type: 'error',
                                      text1: t('common:errors.genericTitle', { defaultValue: 'Greška' }),
                                      text2: err?.message || t('common:errors.tryAgain', { defaultValue: 'Pokušaj ponovo.' }),
                                      position: 'bottom',
                                    });
                                  } finally {
                                    setLoadingPlanKey(null);
                                  }
                                },
                              },
                            ]
                          );
                        }}
                      >
                        {loadingPlanKey === 'cancel' ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                            {t('common:membership.cancel.cta', { defaultValue: 'Otkaži pretplatu' })}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}

                    {/* CTA Buttons */}
                    {pkg.name === 'Premium' && (
                      <TouchableOpacity
                        style={{
                          backgroundColor: '#a8ff76',
                          borderRadius: 7,
                          padding: 10,
                          marginTop: 12,
                          alignSelf: 'center',
                          opacity: disabled ? 0.45 : 1,
                        }}
                        onPress={() => onPlanPress('premium')}
                        disabled={disabled}
                      >
                        {isLoading ? (
                          <ActivityIndicator color="#222" size="small" />
                        ) : (
                          <Text
                            style={{
                              color: isCurrent ? '#2d2d2d' : '#1a2b0a',
                              fontWeight: 'bold',
                              fontSize: 16,
                            }}
                          >
                            {isCurrent
                              ? t('common:membership.cta.alreadyPremium', {
                                defaultValue: 'Već imate Premium',
                              })
                              : (() => {
                                // === GOOGLE PLAY / APP STORE LOKALIZOVANA CENA ===
                                // iOS koristi 'id', Android koristi 'productId'
                                const premiumProduct = products?.find(p => p.id === SKU_MAP.premium || p.productId === SKU_MAP.premium);
                                const premiumPrice = getFormattedStorePrice(premiumProduct);
                                return premiumPrice
                                  ? `Buy Premium (${premiumPrice}/mo)`
                                  : 'Buy Premium';
                              })()}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}

                    {pkg.name === 'Pro' && (
                      <TouchableOpacity
                        style={{
                          backgroundColor: '#ae7ffb',
                          borderRadius: 7,
                          padding: 10,
                          marginTop: 12,
                          alignSelf: 'center',
                          opacity: disabled ? 0.45 : 1,
                        }}
                        onPress={() => onPlanPress('pro')}
                        disabled={disabled}
                      >
                        {isLoading ? (
                          <ActivityIndicator color="#222" size="small" />
                        ) : (
                          <Text
                            style={{
                              color: isCurrent ? '#7d7d7d' : '#291a42',
                              fontWeight: 'bold',
                              fontSize: 16,
                            }}
                          >
                            {isCurrent
                              ? t('common:membership.cta.alreadyPro', {
                                defaultValue: 'Already PRO',
                              })
                              : (() => {
                                // === GOOGLE PLAY / APP STORE LOKALIZOVANA CENA ===
                                // iOS koristi 'id', Android koristi 'productId'
                                const proProduct = products?.find(p => p.id === SKU_MAP.pro || p.productId === SKU_MAP.pro);
                                const proPrice = getFormattedStorePrice(proProduct);
                                return proPrice
                                  ? `Buy PRO (${proPrice}/mo)`
                                  : 'Buy PRO';
                              })()}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}

                    {pkg.key === 'proplus' && (
                      <TouchableOpacity
                        style={{
                          backgroundColor: '#ef4444',
                          borderRadius: 7,
                          padding: 10,
                          marginTop: 12,
                          alignSelf: 'center',
                          opacity: disabled ? 0.45 : 1,
                        }}
                        onPress={() => onPlanPress('proplus')}
                        disabled={disabled}
                      >
                        {isLoading ? (
                          <ActivityIndicator color="#222" size="small" />
                        ) : (
                          <Text
                            style={{
                              color: isCurrent ? '#7d1a1a' : '#2b0a0a',
                              fontWeight: 'bold',
                              fontSize: 16,
                            }}
                          >
                            {isCurrent
                              ? t('common:membership.cta.alreadyProPlus', {
                                defaultValue: 'Already ProPlus',
                              })
                              : (() => {
                                // === GOOGLE PLAY / APP STORE LOKALIZOVANA CENA ===
                                // iOS koristi 'id', Android koristi 'productId'
                                const proplusProduct = products?.find(p => p.id === SKU_MAP.proplus || p.productId === SKU_MAP.proplus);
                                const proplusPrice = getFormattedStorePrice(proplusProduct);
                                return proplusPrice
                                  ? `Buy ProPlus (${proplusPrice}/yr)`
                                  : 'Buy ProPlus';
                              })()}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}

            {/* PETA KARTICA: Extras (Topup + Restore) */}
            <View style={{ alignItems: 'center' }}>
              <View
                style={[
                  styles.card,
                  {
                    borderColor: '#ffd700',
                    width: 260,
                    minHeight: 280,
                    paddingHorizontal: 22,
                    paddingVertical: 18,
                    justifyContent: 'center',
                  },
                ]}
              >
                <Text style={[styles.cardTitle, { color: '#ffd700', marginBottom: 16 }]}>
                  {t('common:membership.extras.title', { defaultValue: 'Extras' })}
                </Text>

                {/* Topup 500 */}
                <TouchableOpacity
                  style={{
                    backgroundColor: '#ffd700',
                    borderRadius: 10,
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    marginBottom: 10,
                    minWidth: 200,
                    alignItems: 'center',
                    opacity: loadingTopUp ? 0.5 : 1,
                  }}
                  onPress={() => onTopUpPress(500)}
                  disabled={loadingTopUp}
                >
                  {loadingTopUp ? (
                    <ActivityIndicator color="#222" size="small" />
                  ) : (
                    <Text style={{ color: '#222', fontWeight: 'bold', fontSize: 15 }}>
                      {(() => {
                        // iOS koristi 'id', Android koristi 'productId'
                        const topup500Product = products?.find(p => p.id === SKU_MAP.topup500 || p.productId === SKU_MAP.topup500);
                        const topup500Price = getFormattedStorePrice(topup500Product);
                        return topup500Price
                          ? `+500 — ${topup500Price}`
                          : '+500 coins';
                      })()}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Topup 1000 */}
                <TouchableOpacity
                  style={{
                    backgroundColor: '#ffd700',
                    borderRadius: 10,
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    marginBottom: 12,
                    minWidth: 200,
                    alignItems: 'center',
                    opacity: loadingTopUp ? 0.5 : 1,
                  }}
                  onPress={() => onTopUpPress(1000)}
                  disabled={loadingTopUp}
                >
                  {loadingTopUp ? (
                    <ActivityIndicator color="#222" size="small" />
                  ) : (
                    <Text style={{ color: '#222', fontWeight: 'bold', fontSize: 15 }}>
                      {(() => {
                        // iOS koristi 'id', Android koristi 'productId'
                        const topup1000Product = products?.find(p => p.id === SKU_MAP.topup1000 || p.productId === SKU_MAP.topup1000);
                        const topup1000Price = getFormattedStorePrice(topup1000Product);
                        return topup1000Price
                          ? `+1000 — ${topup1000Price}`
                          : '+1000 coins';
                      })()}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* iOS: Restore Purchases - otvara Apple Subscriptions ekran */}
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    onPress={async () => {
                      try {
                        await Linking.openURL('https://apps.apple.com/account/subscriptions');
                      } catch (e) {
                        console.log('Error opening Apple subscriptions:', e);
                        Toast.show({
                          type: 'error',
                          text1: t('common:errors.genericTitle', { defaultValue: 'Greška' }),
                          text2: t('common:errors.tryAgain', { defaultValue: 'Pokušajte ponovo.' }),
                          position: 'bottom',
                        });
                      }
                    }}
                    style={{
                      backgroundColor: '#333',
                      borderRadius: 10,
                      paddingHorizontal: 20,
                      paddingVertical: 12,
                      minWidth: 200,
                      alignItems: 'center',
                      marginBottom: 10,
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                      Restore Purchases
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ========================================================================
// STYLES
// ========================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#000a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#18181b',
    padding: 18,
    borderRadius: 22,
    width: '92%',
    maxWidth: 390,
    elevation: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 6,
  },
  card: {
    backgroundColor: '#252532',
    borderRadius: 14,
    borderWidth: 2,
    padding: 14,
    paddingTop: 12,
    minHeight: 240,
    width: 260,
    marginBottom: 8,
    alignItems: 'center',
    position: 'relative',
  },
  cardBest: {
    borderColor: '#ae7ffb',
    shadowColor: '#ae7ffb',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 7,
  },
  cardBestPlus: {
    borderColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  bestOfferBadge: {
    position: 'absolute',
    top: -10,
    right: -8,
    backgroundColor: '#ef4444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ffb4b4',
  },
  bestOfferText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 0.3,
  },
  cardTitle: {
    fontWeight: 'bold',
    fontSize: 19,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 1,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: '#444',
    width: '100%',
  },
  featureLabel: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  featureValue: {
    fontWeight: 'bold',
    fontSize: 15,
    textAlign: 'center',
    marginLeft: 0,
    width: '100%',
    alignSelf: 'center',
  },
});
