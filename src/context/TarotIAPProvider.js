// src/context/TarotIAPProvider.js
// Production-ready IAP provider za Google Play + Apple In-App Purchase

import {
    ErrorCode,
    flushFailedPurchasesCachedAsPendingAndroid,
    useIAP,
} from 'expo-iap';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import { getProductType, getSkuFor } from '../config/billingProducts';
import { useDukati } from '../context/DukatiContext';
import { supabase } from '../utils/supabaseClient';

// ========================================================================
// CONFIG
// ========================================================================

const DEV_MODE = __DEV__; // U dev modu omogućava fallback na direktne RPC pozive

// Fallback bonusi (biće override-ovani sa servera ako postoji membership-config)
const PAKET_BONUSI = {
    free: 150,
    premium: 4000,
    pro: 6500,
    proplus: 70000,
};

// ========================================================================
// HELPER: Normalizacija payment_id (hash ako je predugačak - Apple fix)
// ========================================================================

const normalizePaymentId = async (input) => {
    if (!input) return input;
    const trimmed = String(input).trim();

    // Ako je "normalne" dužine (Android tokeni) - vrati kao što jeste
    if (trimmed.length <= 200) {
        return trimmed;
    }

    // Ako je ogroman (Apple receipt) → SHA-256 hash
    // Ovo sprečava "index row size exceeds maximum" grešku u PostgreSQL
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(trimmed);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashed = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        if (DEV_MODE) console.log('[IAP] payment_id hashed (was', trimmed.length, 'chars)');
        return hashed;
    } catch (e) {
        // Fallback: skrati na 200 karaktera ako hash ne radi
        console.warn('[IAP] normalizePaymentId hash failed, truncating:', e);
        return trimmed.substring(0, 200);
    }
};

// ========================================================================
// CONTEXT
// ========================================================================

const TarotIAPContext = React.createContext({
    iapReady: false,
    devMode: false,
    startPlanPurchase: async () => { },
    startTopupPurchase: async () => { },
    products: [], // ← DODATO: default prazna lista
});

export const TarotIAPProvider = ({ children }) => {
    const { t } = useTranslation(['common']);
    const { userId, fetchDukatiSaServera, refreshUserPlan } = useDukati();

    const [iapReady, setIapReady] = React.useState(false);
    const pendingRef = React.useRef(null);

    // ========================================================================
    // REMOTE PRICING (sa servera)
    // ========================================================================

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

    // ========================================================================
    // HELPER: writePackage (backend poziv sa fallback mehanizmima)
    // ========================================================================

    const writePackage = React.useCallback(async (uid, pkg) => {
        const target = String(pkg || '').toLowerCase();

        // 1) Pokušaj RPC sa premium_until (novi)
        try {
            const { error: rpcErr1 } = await supabase.rpc('set_package_with_expiry', {
                p_user: uid,
                p_package: target,
            });
            if (!rpcErr1) {
                // Verifikuj
                const { data: v1 } = await supabase
                    .from('profiles')
                    .select('package')
                    .eq('id', uid)
                    .single();
                if (String(v1?.package || '').toLowerCase() === target) {
                    return true;
                }
            }
        } catch (e) {
            if (DEV_MODE) console.warn('[set_package_with_expiry] error:', e);
        }

        // 2) Fallback: stari RPC (bez expiry)
        try {
            const { error: rpcErr2 } = await supabase.rpc('set_package', {
                p_user: uid,
                p_package: target,
            });
            if (!rpcErr2) {
                const { data: v2 } = await supabase
                    .from('profiles')
                    .select('package')
                    .eq('id', uid)
                    .single();
                if (String(v2?.package || '').toLowerCase() === target) {
                    return true;
                }
            }
        } catch (e) {
            if (DEV_MODE) console.warn('[set_package] error:', e);
        }

        // 3) Krajnji fallback: direktan UPDATE (ako RLS dozvoljava)
        try {
            const { data: upd, error: upErr } = await supabase
                .from('profiles')
                .update({ package: target })
                .eq('id', uid)
                .select('package')
                .single();
            if (!upErr && String(upd?.package || '').toLowerCase() === target) {
                return true;
            }
        } catch (e) {
            if (DEV_MODE) console.warn('[profiles.update] error:', e);
        }

        return false;
    }, []);

    // ========================================================================
    // ANDROID: Flush pending purchases na mount
    // ========================================================================

    React.useEffect(() => {
        if (Platform.OS !== 'android') return;
        (async () => {
            try {
                if (DEV_MODE) console.log('[IAP] Flushing pending Android purchases...');

                // ✅ Proveri da li funkcija postoji
                if (typeof flushFailedPurchasesCachedAsPendingAndroid === 'function') {
                    await flushFailedPurchasesCachedAsPendingAndroid();
                } else {
                    console.warn('[IAP] flushFailedPurchasesCachedAsPendingAndroid not available (older expo-iap version)');
                }
            } catch (err) {
                console.warn('[IAP] flush error:', err);
            }
        })();
    }, []);

    // ========================================================================
    // EXPO-IAP HOOK
    // ========================================================================

    const { connected, products, subscriptions, fetchProducts, requestPurchase, finishTransaction } = useIAP({
        autoFinishTransactions: false,

        onPurchaseError: async (error) => {
            pendingRef.current = null;

            if (error?.code === ErrorCode.UserCancelled || error?.code === ErrorCode.E_USER_CANCELLED) {
                // Korisnik odustao - tiho ignoriši
                return;
            }

            Toast.show({
                type: 'error',
                text1: t('common:errors.genericTitle', { defaultValue: 'Greška' }),
                text2:
                    error?.message ||
                    t('common:errors.tryAgain', { defaultValue: 'Pokušajte ponovo.' }),
                position: 'bottom',
            });
        },

        onPurchaseSuccess: async (purchase) => {
            const meta = pendingRef.current;

            // ✅ Stabilan payment_id (Google purchaseToken ima prioritet)
            const payment_id =
                purchase?.purchaseToken ||
                purchase?.orderId ||
                purchase?.transactionId ||
                purchase?.originalTransactionId ||
                purchase?.id;

            // iOS koristi 'id', Android koristi 'productId'
            const sku = purchase?.id || purchase?.productId;

            if (DEV_MODE) {
                console.log('[IAP] onPurchaseSuccess:', {
                    sku,
                    payment_id,
                    meta,
                });
            }

            // ========================================================================
            // VALIDACIJA
            // ========================================================================

            if (!userId) {
                console.error('[IAP] No userId - skipping backend processing');
                Toast.show({
                    type: 'error',
                    text1: t('common:errors.genericTitle', { defaultValue: 'Greška' }),
                    text2: t('common:errors.notLoggedIn', {
                        defaultValue: 'Niste ulogovani.',
                    }),
                    position: 'bottom',
                });
                pendingRef.current = null;
                return;
            }

            // ========================================================================
            // SKU FALLBACK LOGIKA (ako meta/pendingRef nije dostupan - iOS problem)
            // ========================================================================

            const premiumSku = getSkuFor('premium');
            const proSku = getSkuFor('pro');
            const proplusSku = getSkuFor('proplus');
            const topup500Sku = getSkuFor('topup500');
            const topup1000Sku = getSkuFor('topup1000');

            // Podrazumevano uzmi pendingRef metadata
            let effKind = meta?.kind ?? null;       // 'plan' | 'topup' | null
            let effPlanKey = meta?.planKey ?? null; // 'premium' | 'pro' | 'proplus' | null
            let effAmount = meta?.amount ?? null;   // 500 | 1000 | null (za topup)

            // Fallback po SKU-u ako meta nije dostupan (iOS ponekad resetuje ref)
            if (!effKind && sku) {
                if (sku === proplusSku) {
                    effKind = 'plan';
                    effPlanKey = 'proplus';
                } else if (sku === premiumSku) {
                    effKind = 'plan';
                    effPlanKey = 'premium';
                } else if (sku === proSku) {
                    effKind = 'plan';
                    effPlanKey = 'pro';
                } else if (sku === topup500Sku) {
                    effKind = 'topup';
                    effAmount = 500;
                } else if (sku === topup1000Sku) {
                    effKind = 'topup';
                    effAmount = 1000;
                }
                console.log('[IAP] Fallback na sku → effKind =', effKind, 'effPlanKey =', effPlanKey, 'effAmount =', effAmount);
            }

            // Ako još uvek nemamo effKind, ne možemo da procesiramo
            if (!effKind) {
                console.error('[IAP] No pending purchase metadata and could not determine from SKU:', sku);
                pendingRef.current = null;
                return;
            }

            if (!payment_id) {
                console.error('[IAP] No payment_id - cannot process purchase');
                Toast.show({
                    type: 'error',
                    text1: t('common:errors.genericTitle', { defaultValue: 'Greška' }),
                    text2: 'Payment ID nije dostupan.',
                    position: 'bottom',
                });
                pendingRef.current = null;
                return;
            }

            // ========================================================================
            // NORMALIZE PAYMENT_ID (hash ako je predugačak - Apple fix)
            // ========================================================================

            const normalizedPaymentId = await normalizePaymentId(payment_id);

            // ========================================================================
            // BACKEND PROCESSING
            // ========================================================================

            let isConsumable = false;

            try {
                // === PLANOVI (Premium / Pro / ProPlus) ===
                if (effKind === 'plan') {
                    const planKey = effPlanKey;

                    if (planKey === 'premium' || planKey === 'pro' || planKey === 'proplus') {
                        // ✅ ADD COINS SA payment_id ZA IDEMPOTENCY
                        await supabase.rpc('add_coins', {
                            p_user: userId,
                            p_amount: BONUS[planKey],
                            p_reason: `upgrade_${planKey}`,
                            p_payment_id: normalizedPaymentId, // ← NORMALIZOVAN za Apple
                        });

                        // ✅ SET PACKAGE
                        const ok = await writePackage(userId, planKey);
                        if (!ok) throw new Error('PACKAGE_UPDATE_FAILED');

                        await fetchDukatiSaServera();
                        await refreshUserPlan();

                        Toast.show({
                            type: 'success',
                            text1: t('common:messages.successTitle', { defaultValue: 'Uspeh!' }),
                            text2: t(`common:membership.toast.upgraded${planKey.charAt(0).toUpperCase() + planKey.slice(1)}`, {
                                bonus: BONUS[planKey],
                                defaultValue: `Vaš nalog je sada ${planKey}. Dobili ste još ${BONUS[planKey]} dukata!`,
                            }),
                            position: 'bottom',
                        });


                    } else {
                        throw new Error(`UNKNOWN_PLAN_KEY: ${planKey}`);
                    }
                }

                // === DOPUNE (Topup 500 / 1000) ===
                if (effKind === 'topup') {
                    const amount = effAmount || 0;
                    if (amount <= 0) {
                        throw new Error('INVALID_TOPUP_AMOUNT');
                    }

                    // ✅ ADD COINS SA payment_id ZA IDEMPOTENCY
                    await supabase.rpc('add_coins', {
                        p_user: userId,
                        p_amount: amount,
                        p_reason: 'topup',
                        p_payment_id: normalizedPaymentId, // ← NORMALIZOVAN za Apple
                    });

                    await fetchDukatiSaServera();

                    Toast.show({
                        type: 'success',
                        text1: t('common:messages.successGeneric', { defaultValue: 'Uspešno!' }),
                        text2: t('common:membership.toast.topupDone', {
                            amount,
                            defaultValue: `Dobili ste ${amount} dukata.`,
                        }),
                        position: 'bottom',
                    });

                    isConsumable = true; // Topup JE consumable
                }
            } catch (err) {
                console.error('[IAP] Backend processing error:', err);

                Toast.show({
                    type: 'error',
                    text1: t('common:errors.genericTitle', { defaultValue: 'Greška' }),
                    text2:
                        err?.message ||
                        t('common:errors.tryAgain', { defaultValue: 'Pokušajte ponovo.' }),
                    position: 'bottom',
                });

                // ❌ NE pozivaj finishTransaction ako backend nije uspeo
                // → Google/Apple će retry-ovati kupovinu kasnije
                pendingRef.current = null;
                return;
            }

            // ========================================================================
            // FINISH TRANSACTION (samo ako je backend uspeo)
            // ========================================================================

            try {
                await finishTransaction({
                    purchase,
                    isConsumable,
                });
                if (DEV_MODE) console.log('[IAP] finishTransaction OK');
            } catch (e) {
                console.error('[IAP] finishTransaction error:', e);
                // Ne blokiraj flow - backend je već obradio kupovinu
            } finally {
                pendingRef.current = null;
            }
        },
    });

    // ========================================================================
    // UČITAJ PROIZVODE SA STORE-A (Google Play / App Store)
    // ========================================================================

    React.useEffect(() => {
        if (!connected) {
            setIapReady(false);
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                // Pretplate (subscriptions)
                const subsSkus = [
                    getSkuFor('premium'),
                    getSkuFor('pro'),
                    getSkuFor('proplus'),
                ].filter(Boolean);

                // Jednokratni proizvodi (in-app)
                const inappSkus = [
                    getSkuFor('topup500'),
                    getSkuFor('topup1000'),
                ].filter(Boolean);

                // ✅ DEBUG
                if (DEV_MODE) {
                    console.log('[IAP] fetchProducts DEBUG:', {
                        subsSkus,
                        inappSkus,
                    });
                }

                if (subsSkus.length) {
                    await fetchProducts({ skus: subsSkus, type: 'subs' });
                }

                if (inappSkus.length) {
                    await fetchProducts({ skus: inappSkus, type: 'in-app' });
                }

                if (!cancelled) setIapReady(true);
            } catch (err) {
                console.warn('[IAP] fetchProducts error:', err);
                if (!cancelled) setIapReady(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [connected, fetchProducts]);

    // ========================================================================
    // PUBLIC API: startPlanPurchase
    // ========================================================================

    const startPlanPurchase = React.useCallback(
        async (planKey) => {
            if (!connected) {
                Toast.show({
                    type: 'error',
                    text1: t('common:errors.genericTitle', { defaultValue: 'Greška' }),
                    text2: t('common:errors.storeUnavailable', {
                        defaultValue: 'Prodavnica trenutno nije dostupna.',
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

            const sku = getSkuFor(planKey);
            const type = getProductType(planKey);

            // ✅ KRITIČNI DEBUG
            console.log('[IAP] startPlanPurchase DEBUG:', {
                planKey,
                sku,
                type,
                connected,
                userId: !!userId,
                skuIsString: typeof sku === 'string',
                skuLength: sku?.length,
                arrayToSend: [sku],
                arrayLength: [sku].length,
            });

            if (!sku) {
                Toast.show({
                    type: 'error',
                    text1: t('common:errors.genericTitle', { defaultValue: 'Greška' }),
                    text2: `Plan nije dostupan za kupovinu. SKU: ${sku}`,
                    position: 'bottom',
                });
                return;
            }

            try {
                pendingRef.current = { kind: 'plan', planKey };

                // type za planove uvek subs
                const purchaseType = 'subs';

                // Android offer tokens (ako postoji subscription sa tim SKU)
                const sub = subscriptions?.find((s) => s.id === sku);
                const subscriptionOffers = (sub?.subscriptionOfferDetailsAndroid ?? []).map((offer) => ({
                    sku,
                    offerToken: offer.offerToken,
                }));

                const requestPayload = {
                    request: {
                        apple: { sku },
                        google: {
                            skus: [sku],
                            ...(subscriptionOffers.length > 0 ? { subscriptionOffers } : {}),
                        },
                    },
                    type: purchaseType,
                };

                // ✅ DEBUG: prikazi tacni payload
                console.log('[IAP] requestPurchase PAYLOAD:', JSON.stringify(requestPayload, null, 2));
                console.log('[IAP] subscriptionOffers:', subscriptionOffers);

                await requestPurchase(requestPayload);
            } catch (err) {
                console.error('[IAP] requestPurchase(plan) error:', err);
                pendingRef.current = null;

                Toast.show({
                    type: 'error',
                    text1: t('common:errors.genericTitle', { defaultValue: 'Greška' }),
                    text2:
                        err?.message ||
                        t('common:errors.tryAgain', { defaultValue: 'Pokušajte ponovo.' }),
                    position: 'bottom',
                });
            }
        },
        [connected, requestPurchase, subscriptions, t, userId]
    );

    // ========================================================================
    // PUBLIC API: startTopupPurchase
    // ========================================================================

    const startTopupPurchase = React.useCallback(
        async (amount) => {
            if (!connected) {
                Toast.show({
                    type: 'error',
                    text1: t('common:errors.genericTitle', { defaultValue: 'Greška' }),
                    text2: t('common:errors.storeUnavailable', {
                        defaultValue: 'Prodavnica trenutno nije dostupna.',
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

            const topupKey = amount === 500 ? 'topup500' : amount === 1000 ? 'topup1000' : null;
            if (!topupKey) {
                Toast.show({
                    type: 'error',
                    text1: t('common:errors.genericTitle', { defaultValue: 'Greška' }),
                    text2: 'Nevažeći iznos dopune.',
                    position: 'bottom',
                });
                return;
            }

            const sku = getSkuFor(topupKey);

            // ✅ KRITIČNI DEBUG
            console.log('[IAP] startTopupPurchase DEBUG:', {
                amount,
                topupKey,
                sku,
                connected,
                userId: !!userId,
                skuIsString: typeof sku === 'string',
                skuLength: sku?.length,
                arrayToSend: [sku],
                arrayLength: [sku].length,
            });

            if (!sku) {
                Toast.show({
                    type: 'error',
                    text1: t('common:errors.genericTitle', { defaultValue: 'Greška' }),
                    text2: `Dopuna nije dostupna za kupovinu. SKU: ${sku}`,
                    position: 'bottom',
                });
                return;
            }

            try {
                pendingRef.current = { kind: 'topup', amount };

                const requestPayload = {
                    request: {
                        apple: { sku },
                        google: { skus: [sku] },
                    },
                    type: 'in-app',
                };

                // ✅ DEBUG: prikazi tacni payload
                console.log('[IAP] requestPurchase PAYLOAD:', JSON.stringify(requestPayload, null, 2));

                await requestPurchase(requestPayload);
            } catch (err) {
                console.error('[IAP] requestPurchase(topup) error:', err);
                pendingRef.current = null;

                Toast.show({
                    type: 'error',
                    text1: t('common:errors.genericTitle', { defaultValue: 'Greška' }),
                    text2:
                        err?.message ||
                        t('common:errors.tryAgain', { defaultValue: 'Pokušajte ponovo.' }),
                    position: 'bottom',
                });
            }
        },
        [connected, requestPurchase, t, userId]
    );

    // ========================================================================
    // CONTEXT VALUE
    // ========================================================================

    return (
        <TarotIAPContext.Provider
            value={{
                iapReady: iapReady && connected,
                devMode: DEV_MODE,
                startPlanPurchase,
                startTopupPurchase,
                products, // ← DODATO: lokalizovane cene iz Play Billing-a
            }}
        >
            {children}
        </TarotIAPContext.Provider>
    );
};

export const useTarotIAP = () => React.useContext(TarotIAPContext);
