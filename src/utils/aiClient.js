// src/utils/aiClient.js
import { supabase } from "../utils/supabaseClient";

/**
 * AI Client — tihi, robustni wrapper za poziv Supabase Edge funkcije "ai-odgovor".
 *
 * Šta radi:
 *  - Poziva edge funkciju sa prosleđenim payload-om
 *  - Timeout zaštita (podesivo preko EXPO_PUBLIC_AI_EDGE_TIMEOUT_MS, podrazumevano 25s)
 *  - Normalizuje odgovor (string/JSON) i izdvaja tipične polja { odgovor, sessionId, ... }
 *  - Mapira česte greške na jasne poruke/status kodove (402/429/400/403/404/502)
 *  - Tihi debug log preko EXPO_PUBLIC_AI_DEBUG=1 (samo u __DEV__)
 *
 * Ne menja tvoj postojeći API — i dalje exportuje getAIAnswer(payload).
 */

// START: konfiguracija + debug log
const AI_CLIENT_DEBUG = process.env.EXPO_PUBLIC_AI_DEBUG === "1";
const EDGE_TIMEOUT_MS = Number(process.env.EXPO_PUBLIC_AI_EDGE_TIMEOUT_MS || 25000);

const dlog = (tag, obj) => {
  if (typeof __DEV__ !== "undefined" && __DEV__ && AI_CLIENT_DEBUG) {
    try { console.log(tag, obj); } catch { }
  }
};
// END: konfiguracija + debug log

// START: utility — timeout wrapper sa clearTimeout
function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const err = new Error(`Edge timeout after ${ms}ms`);
      err.code = 502;          // tretiramo kao 502 (upstream fail / refund safe)
      err.name = "EDGE_TIMEOUT";
      // START: i18n key za timeout
      err.i18nKey = "errors.edgeTimeout";
      // END: i18n key za timeout
      reject(err);
    }, ms);
    promise
      .then((v) => { clearTimeout(timer); resolve(v); })
      .catch((e) => { clearTimeout(timer); reject(e); });
  });
}
// END: utility — timeout

// START: utility — normalizacija odgovora (radi i kada Functions vrati string)
function normalizeData(data) {
  try {
    let obj = data;
    if (typeof data === "string") {
      try { obj = JSON.parse(data); } catch { /* ostaje string */ }
    }
    if (!obj || typeof obj !== "object") {
      return { raw: data, odgovor: null, sessionId: null };
    }
    const odgovor =
      obj.odgovor ??
      obj.answer ??
      obj.message ??
      obj.text ??
      obj?.choices?.[0]?.message?.content ??
      null;

    return {
      raw: obj,
      odgovor: typeof odgovor === "string" ? odgovor.trim() : null,
      sessionId: obj.sessionId ?? null,
      api: obj.api ?? null,
      modelUsed: obj.modelUsed ?? null,
      usage: obj.usage ?? null,
      error_code: obj.error_code ?? null,
    };
  } catch {
    return { raw: data, odgovor: null, sessionId: null };
  }
}
// END: utility — normalizacija

// START: utility — mapiranje Edge grešaka na jasne poruke/kodove
function mapEdgeError(error) {
  if (!error) return null;
  const status = error.status || error.code;
  const msg = String(error.message || "");

  // precizni statusi
  if (status === 402 || /INSUFFICIENT|COINS|DUKAT/i.test(msg)) {
    const e = new Error("Nedovoljno dukata");
    e.code = 402;
    // START: i18n key – nedovoljno dukata
    e.i18nKey = "errors.notEnoughCoinsFollowup";
    // END: i18n key – nedovoljno dukata
    return e;
  }
  if (status === 429 || /RATE|LIMIT|429/i.test(msg)) {
    const e = new Error("Prekoračen limit poziva (429). Pokušaj kasnije.");
    e.code = 429;
    // START: i18n key – rate limit
    e.i18nKey = "errors.rateLimited";
    // END: i18n key – rate limit
    return e;
  }
  if (status === 400 || status === 403 || status === 404) {
    const e = new Error("Model nije dostupan ili payload nije validan (400/403/404).");
    e.code = status;
    // START: i18n key – model/payload
    e.i18nKey = "errors.modelUnavailable";
    // END: i18n key – model/payload
    return e;
  }
  if (status === 502 || /OPENAI|FAILED|TIMEOUT|UPSTREAM/i.test(msg)) {
    const e = new Error("OpenAI je pukao (refund urađen)");
    e.code = 502;
    // START: i18n key – upstream fail
    e.i18nKey = "errors.upstreamFailed";
    // END: i18n key – upstream fail
    return e;
  }

  // fallback
  const e = new Error(msg || "Došlo je do greške pri komunikaciji sa AI servisom.");
  e.code = status ?? "ERR_EDGE";
  // START: i18n key – generička AI komunikacija
  e.i18nKey = "errors.aiServiceComm";
  // END: i18n key – generička AI komunikacija
  return e;
}
// END: utility — mapiranje grešaka

/**
 * Poziva Edge funkciju "ai-odgovor" i mapira tipične greške:
 *  - 402 → nedovoljno dukata
 *  - 429 → prekoračen limit
 *  - 400/403/404 → model/payload problem
 *  - 502 → OpenAI fail (refund na serveru)
 */
export async function getAIAnswer(payload) {
  // START: proširena, ali istu namenu zadržava
  try {
    dlog("[AI][invoke->payload]", {
      hasPrompt: !!payload?.payload?.prompt,
      keys: Object.keys(payload || {}),
    });

    // Poziv sa timeout zaštitom
    const invoke = supabase.functions.invoke("ai-odgovor", { body: payload });
    const { data, error } = await withTimeout(invoke, EDGE_TIMEOUT_MS);

    // HTTP greška iz Functions API-ja
    if (error) {
      const mapped = mapEdgeError(error);
      dlog("[AI][invoke->error]", { status: error?.status, message: error?.message });
      throw mapped || error;
    }

    // Aplikativne greške iz tvoje edge funkcije
    const norm = normalizeData(data);
    if (norm.error_code === "INSUFFICIENT_COINS") {
      const e = new Error("Nedovoljno dukata");
      e.code = 402;
      // START: i18n key – insufficient coins iz edge-a
      e.i18nKey = "errors.notEnoughCoinsFollowup";
      // END: i18n key – insufficient coins iz edge-a
      throw e;
    }

    dlog("[AI][invoke->ok]", { model: norm.modelUsed, api: norm.api });
    // Vraćamo raw objekt (kao i ranije), ali sada imamo i norm.* ako nekad zatreba
    return norm.raw ?? data; // očekuješ { odgovor, sessionId, ... }
  } catch (e) {
    dlog("[AI][invoke->catch]", { code: e?.code, message: e?.message });
    throw e;
  }
  // END: proširena
}

// START: legacy direct invoke (zadržano samo kao referenca — ne izvršava se)
/*
import { supabase } from "../utils/supabaseClient";

export async function getAIAnswer(payload) {
  try {
    const { data, error } = await supabase.functions.invoke("ai-odgovor", {
      body: payload,
    });

    if (error) {
      const msg = String(error.message || "");
      if (/402|INSUFFICIENT|COINS|DUKAT/i.test(msg)) {
        const e = new Error("Nedovoljno dukata");
        e.code = 402;
        throw e;
      }
      if (/502|OPENAI|FAILED|TIMEOUT/i.test(msg)) {
        const e = new Error("OpenAI je pukao (refund urađen)");
        e.code = 502;
        throw e;
      }
      throw error;
    }

    if (data?.error_code === "INSUFFICIENT_COINS") {
      const e = new Error("Nedovoljno dukata");
      e.code = 402;
      throw e;
    }

    return data; // očekuješ { odgovor, sessionId, ... }
  } catch (e) {
    throw e;
  }
}
*/
// END: legacy direct invoke (zadržano samo kao referenca)
