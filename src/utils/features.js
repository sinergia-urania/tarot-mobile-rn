// src/utils/features.js

// Centralna normalizacija plana (hvata alias-e: pro_plus, yearly, itd.)
import { normalizePlanCanon } from "../constants/plans";

/**
 * Feature matrica po planu.
 * Napomena:
 * - free: oglasi dozvoljeni; AI dostupan uz dukate; Kabal dozvoljen; arhiva NE.
 * - premium: bez oglasa; AI dozvoljen; Kabal dozvoljen; arhiva NE (pro-only).
 * - pro: bez oglasa; AI/Kabal dozvoljeni; arhiva DA; pro-screen DA.
 * - proplus: isto kao pro (godišnji).
 */
export const featureMatrix = {
  free: {
    canWatchAds: true,
    canAccessAI: true,         // AI je dostupan (plaća se dukatima)
    canAccessKabal: true,      // u app logici "drvo" je dostupno za premium/pro; ostavljamo true i za free da gating reši cena
    canAccessArchive: false,   // arhiva je pro/proplus
    canAccessProScreen: false,
  },
  premium: {
    canWatchAds: false,
    canAccessAI: true,         // koristi “veći” model kao pro, ali bez pro-only ekrana
    canAccessKabal: true,      // “drvo” je otvoreno za premium u UI-u
    canAccessArchive: false,   // ostaje zaključano
    canAccessProScreen: false,
  },
  pro: {
    canWatchAds: false,
    canAccessAI: true,
    canAccessKabal: true,
    canAccessArchive: true,
    canAccessProScreen: true,
  },
  proplus: {
    canWatchAds: false,
    canAccessAI: true,
    canAccessKabal: true,
    canAccessArchive: true,
    canAccessProScreen: true,
  },
};

/**
 * Vraća boolean za traženi feature, uz normalizaciju plana.
 * Primer: hasFeature(userPlan, 'canAccessArchive')
 */
export const hasFeature = (plan, feature) => {
  const p = normalizePlanCanon(plan); // 'free' | 'premium' | 'pro' | 'proplus'
  return !!featureMatrix[p]?.[feature];
};

/**
 * (opciono) Helper ako negde želiš kompletan objekat feature-a
 */
export const getPlanFeatures = (plan) => {
  const p = normalizePlanCanon(plan);
  return featureMatrix[p] || featureMatrix.free;
};
