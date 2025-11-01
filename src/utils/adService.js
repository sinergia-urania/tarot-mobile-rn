// src/utils/adService.js

import AsyncStorage from "@react-native-async-storage/async-storage";
import { showInterstitialAd } from "./ads";

const KEY = "adgate:v1";
const THROTTLE_MS = 50_000;  // ne više od jedne reklame na ~50s (legacy)
const GUEST_EVERY = 5;       // na svaku 5. promenu ekrana (legacy)
const FREE_EVERY = 8;        // na svaku 8. promenu ekrana (legacy)

/**
 * ========================================================================
 * V1 LOGIKA (legacy) — sačuvano zbog kompatibilnosti
 * ========================================================================
 */

// START: preserve V1 legacy copy (originalni recordRouteView pre refaktora)
export async function recordRouteViewV1Legacy(userPlan) {
  try {
    const now = Date.now();
    const raw = await AsyncStorage.getItem(KEY);
    const st = raw ? JSON.parse(raw) : { count: 0, last: Date.now() };
    const count = (st.count || 0) + 1;

    // throttle
    if (now - (st.last || 0) < THROTTLE_MS) {
      await AsyncStorage.setItem(KEY, JSON.stringify({ count, last: st.last || 0 }));
      return;
    }

    const plan = userPlan || "guest";
    let fire = false;
    if (plan === "guest" && count % GUEST_EVERY === 0) fire = true;
    if (plan === "free" && count % FREE_EVERY === 0) fire = true;

    await AsyncStorage.setItem(KEY, JSON.stringify({ count, last: fire ? now : (st.last || 0) }));
    if (fire) showInterstitialAd().catch(() => { });
  } catch { }
}
// END: preserve V1 legacy copy (originalni recordRouteView pre refaktora)

/**
 * ========================================================================
 * V2 STRICT gate — nema reklame dok ne znamo plan + globalni cooldown
 * + first-impression delay (preživljava restart)
 * ========================================================================
 */

// START: V2 STRICT gate — nema reklame dok ne znamo plan + globalni cooldown + first-impression delay
// Odvojeni ključ da ne diramo legacy/hibrid state
const KEY_STRICT = "adgate:v2:strict";
const COOLDOWN_MS_STRICT = 50_000;            // striktni globalni cooldown (50s)
const FIRST_IMPRESSION_DELAY_MS = 60_000;     // prvi oglas najranije 60s posle starta
const GUEST_EVERY_STRICT = 4;
const FREE_EVERY_STRICT = 6;

export async function recordRouteView(userPlan) {
  try {
    // 1) Plan mora biti poznat – u suprotnom ništa ne radimo (nema pretpostavke "guest/free")
    if (userPlan == null) return;

    // 2) Plaćeni planovi nikad ne vide oglas i ne diramo state
    const planNorm = String(userPlan).toLowerCase();
    const isPaid = planNorm === "pro" || planNorm === "premium";
    if (isPaid) return;

    const now = Date.now();
    const raw = await AsyncStorage.getItem(KEY_STRICT);
    const st = raw
      ? JSON.parse(raw)
      : { count: 0, lastShown: 0, appStartedAt: now };

    // migracija starijeg state-a bez appStartedAt
    if (!st.appStartedAt) st.appStartedAt = now;

    // 3) First impression delay – ne prikazuj pre nego što protekne X ms od starta appa
    if (now - st.appStartedAt < FIRST_IMPRESSION_DELAY_MS) {
      await AsyncStorage.setItem(KEY_STRICT, JSON.stringify(st));
      return;
    }

    // 4) Globalni cooldown
    if (now - (st.lastShown || 0) < COOLDOWN_MS_STRICT) {
      await AsyncStorage.setItem(KEY_STRICT, JSON.stringify(st));
      return;
    }

    // 5) Brojanje i odluka
    const count = (st.count || 0) + 1;
    let fire = false;
    if (planNorm === "guest" && count % GUEST_EVERY_STRICT === 0) fire = true;
    if (planNorm === "free" && count % FREE_EVERY_STRICT === 0) fire = true;

    // 6) Upis lastShown PRE poziva SDK (idempotentno na padovima)
    const newState = { ...st, count, lastShown: fire ? now : st.lastShown };
    await AsyncStorage.setItem(KEY_STRICT, JSON.stringify(newState));

    if (fire) {
      showInterstitialAd().catch(() => { /* ignorišemo greške SDK-a */ });
    }
  } catch {
    // oglasi su ne-kritični; tiho ignoriši
  }
}

// Pomoćni reset samo za strict varijantu (ne dira legacy ključeve)
export async function resetAdGateStrict() {
  try { await AsyncStorage.removeItem(KEY_STRICT); } catch { }
}
// END: V2 STRICT gate — nema reklame dok ne znamo plan + globalni cooldown + first-impression delay

/**
 * ========================================================================
 * V1 reset (legacy) — ostaje netaknut
 * ========================================================================
 */
export async function resetAdGate() {
  try { await AsyncStorage.removeItem(KEY); } catch { }
}

/**
 * ========================================================================
 * V2 hibridni gate – cooldown + grace + must-show-once (guest)
 * (TVOJ POSTOJEĆI BLOK — ostavljam netaknut)
 * ========================================================================
 */

// ========================================================================
// START: V2 hibridni gate – cooldown + grace + must-show-once (guest)
// Opis:
//  - Minimalni razmak između interstitial-a (COOLDOWN_MS).
//  - “Grace” pre prve reklame (MIN_VIEWS_BEFORE_FIRST_AD).
//  - Za GOSTE: garantuj ≥1 prikaz po sesiji (MUST_SHOW_ONCE_GUEST), uz poštovanje cooldown-a.
//  - Takt: guest na svaku 3. promenu ekrana, free na svaku 5.
//  - Premium/Pro: nikad (pretpostavlja se guard ranije).
// Napomena: koristimo KEY_V2 da ne kolidira sa V1 stanjem.
// ========================================================================

const KEY_V2 = "adgate:v2";

const COOLDOWN_MS = 50_000;              // minimalni razmak između 2 interstitial-a (~50s; promeni po želji)
const MIN_VIEWS_BEFORE_FIRST_AD = 2;     // “grace” – bar 2 interakcije pre prve reklame
const MUST_SHOW_ONCE_GUEST = true;       // gost: garantuj ≥1 prikaz po sesiji (uz cooldown)
const GUEST_TACT = 3;                    // gost: svaka 3. promena ekrana
const FREE_TACT = 5;                     // free: svaka 5. promena ekrana

const normPlan = (p) => {
  const s = String(p || "guest").toLowerCase();
  if (s === "pro" || s === "premium") return s; // plaćeni – ne prikazuj
  if (s === "free") return "free";
  return "guest";
};

export async function recordRouteViewV2(userPlan) {
  try {
    const now = Date.now();
    const plan = normPlan(userPlan);

    // Inicijalno stanje: last=now → odložena prva reklama bar COOLDOWN_MS
    const init = { count: 0, last: now, mustOnce: MUST_SHOW_ONCE_GUEST && plan === "guest" };

    const raw = await AsyncStorage.getItem(KEY_V2);
    const st = raw ? { mustOnce: false, ...JSON.parse(raw) } : init;
    const count = (st.count || 0) + 1;

    // 1) Cooldown
    const inCooldown = now - (st.last || 0) < COOLDOWN_MS;
    if (inCooldown) {
      await AsyncStorage.setItem(KEY_V2, JSON.stringify({ ...st, count }));
      return;
    }

    // 2) Grace pre prve reklame
    if (count < MIN_VIEWS_BEFORE_FIRST_AD) {
      await AsyncStorage.setItem(KEY_V2, JSON.stringify({ ...st, count }));
      return;
    }

    // 3) Odluka: must-once (guest) + takt po planu
    let fire = false;
    if (plan === "guest") {
      if (st.mustOnce) fire = true;                 // garantuj bar jedan prikaz po sesiji
      else if (count % GUEST_TACT === 0) fire = true;
    } else if (plan === "free") {
      if (count % FREE_TACT === 0) fire = true;
    }
    // premium/pro – nikad (gating rešavaš pre poziva; ovde ostaje false)

    // 4) Upis i prikaz
    if (fire) {
      const next = { count, last: now, mustOnce: false };
      await AsyncStorage.setItem(KEY_V2, JSON.stringify(next));
      showInterstitialAd().catch(() => { });
      return;
    }

    // Nema fire – samo ažuriraj brojač
    await AsyncStorage.setItem(KEY_V2, JSON.stringify({ ...st, count }));
  } catch {
    // tiho ignorišemo – oglasi nisu kritični za core flow
  }
}

export async function resetAdGateV2() {
  try { await AsyncStorage.removeItem(KEY_V2); } catch { }
}
// END: V2 hibridni gate – cooldown + grace + must-show-once (guest)
