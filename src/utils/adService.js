// src/utils/adService.js

import AsyncStorage from "@react-native-async-storage/async-storage";
import { showInterstitialAd } from "./ads";
// ✅ centralno: plan helperi (plaćeni: premium/pro/proplus)
import { isPaidTier, normalizePlanCanon } from "../constants/plans";

// START: deprecirani V1 konstanti (ostaju samo radi BK kompatibilnosti)
const KEY_V1 = "adgate:v1";
const THROTTLE_MS = 50_000;     // legacy throttle
const FREE_EVERY = 8;           // legacy takt za free (zadržano radi kompatibilnosti)
// END: deprecirani V1 konstanti

/**
 * ===========================================================================
 * V1 (legacy) — DEPRAKTIKOVANO: sada je no-op.
 * Ostavljeno radi kompatibilnosti ako se negde još uvek pozove.
 * NEMA “guest” grana; za prave oglase koristi recordRouteView (STRICT).
 * ===========================================================================
 */
// START: deprecate V1 -> no-op (nema više gost logike)
export async function recordRouteViewV1Legacy(/* userPlan */) {
  try {
    // Namerno ne radimo ništa – kompletna logika prebačena u STRICT varijantu.
    // Ovaj no-op sprečava iznenadna prikazivanja i čuva stabilnost.
    return;
  } catch {
    // tiho
  }
}
// END: deprecate V1 -> no-op

/**
 * ===========================================================================
 * V2 STRICT — preporučeno: nema oglasa dok ne znamo plan,
 * globalni cooldown + first-impression delay, samo za FREE.
 * ===========================================================================
 */
const KEY_STRICT = "adgate:v2:strict";
const COOLDOWN_MS_STRICT = 50_000;        // globalni cooldown
const FIRST_IMPRESSION_DELAY_MS = 60_000; // najranije 60s posle pokretanja
const FREE_EVERY_STRICT = 6;              // takt za free (stroži od V1)

export async function recordRouteView(userPlan) {
  try {
    // 1) Plan mora biti poznat – u suprotnom ništa (bez pretpostavki / bez oglasa)
    if (userPlan == null) return;

    const plan = normalizePlanCanon(userPlan); // 'free' | 'premium' | 'pro' | 'proplus' | ...
    // 2) Plaćeni planovi nikad ne vide oglas i ne diramo state
    if (isPaidTier(plan)) return;

    const now = Date.now();
    const raw = await AsyncStorage.getItem(KEY_STRICT);
    const st = raw
      ? JSON.parse(raw)
      : { count: 0, lastShown: 0, appStartedAt: now };

    // migracija starijeg state-a bez appStartedAt
    if (!st.appStartedAt) st.appStartedAt = now;

    // 3) First impression delay
    if (now - st.appStartedAt < FIRST_IMPRESSION_DELAY_MS) {
      await AsyncStorage.setItem(KEY_STRICT, JSON.stringify(st));
      return;
    }

    // 4) Globalni cooldown
    if (now - (st.lastShown || 0) < COOLDOWN_MS_STRICT) {
      await AsyncStorage.setItem(KEY_STRICT, JSON.stringify(st));
      return;
    }

    // 5) Brojanje i odluka — samo FREE
    const count = (st.count || 0) + 1;
    const fire = (plan === "free") && (count % FREE_EVERY_STRICT === 0);

    // 6) Upis pre SDK poziva (idempotentno)
    const newState = { ...st, count, lastShown: fire ? now : st.lastShown };
    await AsyncStorage.setItem(KEY_STRICT, JSON.stringify(newState));

    if (fire) {
      showInterstitialAd().catch(() => { /* ignoriši greške SDK-a */ });
    }
  } catch {
    // tiho
  }
}

export async function resetAdGateStrict() {
  try { await AsyncStorage.removeItem(KEY_STRICT); } catch { }
}

/**
 * ===========================================================================
 * V1 reset (legacy) — i dalje briše stari ključ ako postoji.
 * ===========================================================================
 */
export async function resetAdGate() {
  try { await AsyncStorage.removeItem(KEY_V1); } catch { }
}

/**
 * ===========================================================================
 * V2 hibridni gate (legacy) — pošto nema “guest”, ovo je alias na STRICT.
 * Ako negde i dalje zoveš recordRouteViewV2, prosleđujemo na STRICT.
 * ===========================================================================
 */
export async function recordRouteViewV2(userPlan) {
  return recordRouteView(userPlan);
}

export async function resetAdGateV2() {
  // radi kompatibilnosti resetuj i strict state
  await resetAdGateStrict();
}
