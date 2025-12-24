// src/config/billingProducts.js
// Centralizovana mapa SKU-ova za Google Play + App Store

import { Platform } from 'react-native';

/**
 * ⚠️ VAŽNO: Ovi SKU-ovi moraju TAČNO da se poklapaju sa:
 * - Google Play Console → Products → In-app products / Subscriptions
 * - App Store Connect → Features → In-App Purchases / Subscriptions
 */
export const BILLING_PRODUCTS = {
    // === PRETPLATE (subscriptions) ===
    premium: {
        type: 'subs',
        androidSku: 'tarot_premium_monthly',
        iosSku: 'tarot_premium_monthly', // isti ID možeš koristiti i za iOS
    },
    pro: {
        type: 'subs',
        androidSku: 'tarot_pro_monthly',
        iosSku: 'tarot_pro_monthly',
    },

    proplus: {
        type: 'subs',
        androidSku: 'tarot_proplus_annual',
        iosSku: 'tarot_proplus_annual',

    },

    // === JEDNOKRATNI PROIZVODI (in-app purchases) ===
    topup500: {
        type: 'in-app',
        androidSku: 'tarot_topup_500',
        iosSku: 'tarot_topup_500',
    },
    topup1000: {
        type: 'in-app',
        androidSku: 'tarot_topup_1000',
        iosSku: 'tarot_topup_1000',
    },
};

/**
 * Helper koji vraća pravi SKU za trenutnu platformu
 * @param {keyof BILLING_PRODUCTS} key - 'premium' | 'pro' | 'proplus' | 'topup500' | 'topup1000'
 * @returns {string|null}
 */
export function getSkuFor(key) {
    const cfg = BILLING_PRODUCTS[key];
    if (!cfg) {
        console.warn(`[billingProducts] Unknown key: ${key}`);
        return null;
    }

    return Platform.select({
        ios: cfg.iosSku,
        android: cfg.androidSku,
        default: cfg.androidSku,
    });
}

/**
 * Helper koji vraća tip proizvoda ('subs' ili 'in-app')
 * @param {keyof BILLING_PRODUCTS} key
 * @returns {'subs'|'in-app'|null}
 */
export function getProductType(key) {
    return BILLING_PRODUCTS[key]?.type || null;
}

/**
 * Helper za mapiranje SKU → product key (za prepoznavanje u onPurchaseSuccess)
 * @param {string} sku
 * @returns {string|null}
 */
export function getKeyFromSku(sku) {
    for (const [key, cfg] of Object.entries(BILLING_PRODUCTS)) {
        if (cfg.androidSku === sku || cfg.iosSku === sku) {
            return key;
        }
    }
    return null;
}
