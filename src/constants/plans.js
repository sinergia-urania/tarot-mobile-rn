// src/constants/plans.js

// START: helperi za planove (Premium + Pro + ProPlus) — bez UI tekstova

/**
 * Set planova; slobodno proširi po potrebi.
 * Napomena: guest/gost su zadržani radi backward-compat, ali se kanonizuju u 'free'.
 */
export const PREMIUM_TIERS = ['premium'];
export const PRO_TIERS = ['pro', 'proplus'];
export const FREE_TIERS = ['free', 'guest', 'gost'];
export const ALL_TIERS = [...FREE_TIERS, ...PREMIUM_TIERS, ...PRO_TIERS];

/**
 * Normalizuje vrednost plana (string) na jednu od poznatih etiketa.
 * Hvata i česte alias-e za godišnji/mesečni plan (checkout integracije).
 * @param {string} p
 * @returns {'free'|'guest'|'gost'|'premium'|'pro'|'proplus'|string}
 */
export const normalizePlan = (p) => {
    const s = String(p ?? '').toLowerCase().trim();

    // Pro (mesečno) aliasi
    if (s === 'pro' || s === 'pro_month' || s === 'monthly') return 'pro';

    // ProPlus (godišnji) aliasi
    if (
        s === 'proplus' ||
        s === 'pro_plus' ||
        s === 'pro-plus' ||
        s === 'proplus_year' ||
        s === 'pro_plus_year' ||
        s === 'pro_annual' ||
        s === 'annual' ||
        s === 'yearly' ||
        s === 'year'
    ) return 'proplus';

    // Premium (sopstveni tier)
    if (s === 'premium' || s === 'premijum') return 'premium';

    // Free & legacy
    if (s === 'free' || s === 'osnovni') return 'free';
    if (s === 'gost') return 'gost';
    if (s === 'guest') return 'guest';

    // Fail-soft: vrati sirovu vrednost; helperi ispod će je kanonizovati.
    return s;
};

/**
 * Kanonska etiketa koju koristimo u logici (AI model, reklame, sl.).
 * - guest/gost → 'free'
 * - unknown → 'free' (fail-safe)
 * @param {string} p
 * @returns {'free'|'premium'|'pro'|'proplus'}
 */
export const normalizePlanCanon = (p) => {
    const n = normalizePlan(p);
    if (n === 'pro' || n === 'proplus' || n === 'premium') return n;
    // sve ostalo tretiramo kao free
    return 'free';
};

/**
 * Da li je plan plaćeni (Premium, Pro ili ProPlus).
 * @param {string} p
 */
export const isPaidTier = (p) => {
    const n = normalizePlanCanon(p);
    return n === 'premium' || n === 'pro' || n === 'proplus';
};

/**
 * Da li je plan u Pro “familiji” (Pro ili ProPlus).
 * @param {string} p
 */
export const isProTier = (p) => {
    const n = normalizePlanCanon(p);
    return n === 'pro' || n === 'proplus';
};

/**
 * Klijentska validacija isteka pretplate.
 * Za free planove vraća true (nemaju isteke).
 * @param {string} plan
 * @param {string|number|Date} expiresAt ISO string / timestamp / Date
 */
export const isPlanActive = (plan, expiresAt) => {
    const n = normalizePlanCanon(plan);
    if (!isPaidTier(n)) return true;

    if (!expiresAt) return true; // Edge/webhook je izvor istine; ne gasimo klijenta ovde
    const ts = new Date(expiresAt).getTime();
    if (Number.isNaN(ts)) return true;
    return Date.now() < ts;
};

/**
 * UI label preko i18n: ne sadrži tekst u samom kodu.
 * Ako nema `t`, vrati i18n ključ kao string (možeš ga kasnije proslediti u t()).
 * @param {string} plan
 * @param {(k:string,opts?:any)=>string} [t]
 */
export const planLabel = (plan, t) =>
    t ? t(`common:plans.${normalizePlanCanon(plan)}`) : `common:plans.${normalizePlanCanon(plan)}`;

// END: helperi za planove (Premium + Pro + ProPlus)
