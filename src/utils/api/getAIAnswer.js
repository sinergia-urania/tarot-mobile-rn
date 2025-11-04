// src/utils/api/getAIAnswer.js
import { supabase } from "../supabaseClient";
import { buildAIPrompt } from "./buildAIPrompt";
// START: Hindi sniff helpers
import { hiPostEdit, looksHindi } from "../langSniff";
// END: Hindi sniff helpers
// START: plan normalizacija (ProPlus ≙ Pro) — centralizovano
import { normalizePlanCanon } from "../../constants/plans";
// END: plan normalizacija

// START: single-flight + dedupe + quiet logs
const AI_DEBUG = process.env.EXPO_PUBLIC_AI_DEBUG === "1";

let __AI_IN_FLIGHT = false;
let __AI_LAST_SIG = null;
let __AI_LAST_TS = 0;
let __AI_LAST_RESULT = null;

const DEDUPE_WINDOW_MS = Number(process.env.EXPO_PUBLIC_AI_DEDUPE_WINDOW_MS || 1200);

function dlog(tag, payload) {
  if (typeof __DEV__ !== "undefined" && __DEV__ && AI_DEBUG) {
    try { console.log(tag, payload); } catch { }
  }
}

function makeSig(input) {
  try {
    const src = JSON.stringify({
      userId: input?.userId,
      tip: input?.tipOtvaranja,
      subtip: input?.subtip,
      prompt: input?.payload?.prompt,
      modelHint: input?.payload?.modelHint,
      jePodpitanje: !!input?.jePodpitanje,
    });
    let h = 0;
    for (let i = 0; i < src.length; i++) h = (h * 33 + src.charCodeAt(i)) | 0;
    return String(h);
  } catch {
    return null;
  }
}
// END: single-flight + dedupe + quiet logs

// START: verbose AI logs flag
const VERBOSE_AI_LOGS =
  (typeof __DEV__ !== "undefined" && __DEV__) ||
  process.env.EXPO_PUBLIC_VERBOSE_AI_LOGS === "1";
// END: verbose AI logs flag

// START: util model + lang-guard toggle-ovi
const UTIL_MODEL = process.env.EXPO_PUBLIC_AI_MODEL_UTIL || "gpt-4.1-mini";
const LG_ON = (process.env.EXPO_PUBLIC_AI_LANG_GUARD ?? "1") === "1";
const LG_TRANSLATE_ON = (process.env.EXPO_PUBLIC_AI_LANG_GUARD_TRANSLATE ?? "1") === "1";
const LG_MAX_CHARS = Number(process.env.EXPO_PUBLIC_AI_LANG_GUARD_MAXCHARS || 6000);
// END: util model + lang-guard toggle-ovi

// START: lang-guard helpers (sa IT kao cilj, ali NE kao app fallback jezik)
function normalizeLangCode(lang) {
  return String(lang || "").split("-")[0].toLowerCase();
}
const ALLOWED_LANGS = new Set(["it", "en", "de", "es", "fr", "sr", "pt", "hi"]); // ciljni jezici (IT dozvoljen kao target)
const SUPPORTED_APP_LANGS = new Set(["en", "de", "pt", "fr", "sr", "hi", "es"]); // app jezici (bez IT)
function normalizeAppLang(lang) {
  const n = normalizeLangCode(lang);
  return SUPPORTED_APP_LANGS.has(n) ? n : "en";
}
function looksSerbian(text = "") {
  if (!text) return false;
  // SAMO diakritici i/ili ćirilica — smanjuje false-positive (npr. "Suma sumarum")
  return /[čćšžđČĆŠŽĐ]|[ЉЊЂЋЏА-Яа-я]/.test(text);
}
// END: lang-guard helpers

// START: tiny AI language detection (on-demand, via Edge)
async function detectLangViaEdge({ text, uid, sessionId, selectedModel }) {
  try {
    const prompt =
      `Detect the language of the following text. ` +
      `Reply with ISO 639-1 code only (e.g., "it","en","de","es","fr","sr","pt","hi","und").\n\n` +
      String(text || "");
    const { data, error } = await supabase.functions.invoke("ai-odgovor", {
      body: {
        userId: uid,
        sessionId: sessionId || null,
        payload: {
          prompt,
          modelHint: UTIL_MODEL,
          meta: { util: "langDetect", free: 1 } // <-- server-side: bez naplate
        },
      },
    });
    if (error) return null;
    let out = null;
    if (typeof data === "string") {
      try {
        const p = JSON.parse(data);
        out = p?.odgovor ?? p?.answer ?? null;
      } catch { }
    } else if (data && typeof data === "object") {
      out = data?.odgovor ?? data?.answer ?? null;
    }
    out = (out || "").toLowerCase().trim();
    const m = out.match(/^(it|en|de|es|fr|sr|pt|hi|und)\b/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}
// END: tiny AI language detection (on-demand, via Edge)

// START: pickTargetLang helper
function pickTargetLang({ questionLang, jezikAplikacije, pitanje }) {
  const q = normalizeLangCode(questionLang);
  if (q) return q;                           // 1) eksplicitno iz UI
  if (looksSerbian(String(pitanje || ""))) return "sr"; // 2) ako je i pitanje srpsko
  return normalizeAppLang(jezikAplikacije);  // 3) fallback: jezik app (bez IT)
}
// END: pickTargetLang helper

const VERBOSE = process.env.EXPO_PUBLIC_AI_VERBOSE === "1";
// START: strip Transitus kada tranziti nisu dozvoljeni
function stripTransitusIfNotAllowed(text, { tipOtvaranja, tranzitiTekst }) {
  try {
    const allow = ["keltski", "astrološko", "drvo"].includes(tipOtvaranja) && !!tranzitiTekst;
    if (allow) return text;
    // Ukloni blok "Transitus:" do prve prazne linije / sledećeg naslova / kraja
    let out = text.replace(
      /(^|\n)Transitus\s*:\s*[\s\S]*?(?=\n{2,}|\n##|\n[A-Z][^\n]*:|\n?$)/gi,
      "$1"
    );
    // Ukloni i usamljeni naslov "Transitus"
    out = out.replace(/(^|\n)Transitus\s*\n/gi, "$1");
    return out.trim();
  } catch {
    return text;
  }
}
// END: strip Transitus

export async function getAIAnswer({
  ime,
  pitanje,
  dodatniKontekst,
  tipOtvaranja,
  subtip,
  podpitanja = [],
  userLevel = "free",
  jezikAplikacije,
  karte = [],
  pozicije = [],
  // START: i18n etikete (pozicije/kuće/sefiroti) – u jeziku aplikacije
  keltskePozicije,
  sefirotiLabels,
  kuceAstroLabels,
  // END: i18n etikete
  znak,
  podznak,
  datumrodjenja,
  datumOtvaranja,
  tranzitiTekst,
  // NOVO:
  podpitanjeMod = false,
  podpitanje,
  prethodniOdgovor,
  gender,
  // START: NOVO – prosleđujemo userId i (opciono) sessionId
  userId,
  sessionId,
  // END: NOVO
  // START: NOVO – opciono: već detektovani jezik pitanja iz UI/servisa
  questionLang,
  // END: NOVO
}) {
  // START: ProPlus tretman i centralna normalizacija plana
  const planCanon = normalizePlanCanon(userLevel); // "free" | "premium" | "pro" | "proplus"
  const MODEL_FREE = process.env.EXPO_PUBLIC_AI_MODEL_FREE || "gpt-4.1-mini";
  const MODEL_PRO = process.env.EXPO_PUBLIC_AI_MODEL_PRO || "gpt-4.1";
  const useProModel = (planCanon === "premium" || planCanon === "pro" || planCanon === "proplus");
  const model = useProModel ? "gpt-4.1" : "gpt-4.1-mini";
  const selectedModel = useProModel ? MODEL_PRO : MODEL_FREE;
  // END: ProPlus tretman i centralna normalizacija plana

  // START: switch na GPT-4.1 porodicu + ENV override
  // (ne diramo postojeći `model` iznad; uvodimo `selectedModel` i dalje njega koristimo)
  // END: switch na GPT-4.1 porodicu + ENV override

  // START: LIGHT ROLLBACK — prepustimo modelu autodetekciju jezika
  const targetLang = questionLang || null;
  if (__DEV__) {
    dlog("[AI][lang]", {
      questionLang,
      targetLang: targetLang || "auto",
      appLang: jezikAplikacije,
      mode: "model-autodetect",
    });
  }
  // END: LIGHT ROLLBACK

  // START: NOVO – fallback ako userId nije prosleđen
  let uid = userId || null;
  if (!uid) {
    const { data } = await supabase.auth.getUser();
    uid = data?.user?.id || null;
  }
  // END: NOVO

  // START: uvek koristi buildAIPrompt (glavno + podpitanje)
  let prompt = "";

  if (podpitanjeMod) {
    // PODPITANJE → bez tranzita, ali UVEK kroz buildAIPrompt
    prompt = buildAIPrompt({
      ime,
      pitanje,
      dodatniKontekst,
      tipOtvaranja,
      subtip,
      podpitanja: [podpitanje],
      jezikAplikacije,
      jezikPitanja: targetLang || undefined, // hint (ne forsiramo)
      karte,
      pozicije,
      // START: i18n etikete do buildera
      keltskePozicije,
      sefirotiLabels,
      kuceAstroLabels,
      // END: i18n etikete
      znak,
      podznak,
      datumrodjenja,
      // namerno BEZ tranzitiTekst u follow-up-u
      gender,
      prethodniOdgovor,
    });
  } else {
    // GLAVNO pitanje → sa tranzitima
    prompt = buildAIPrompt({
      ime,
      pitanje,
      dodatniKontekst,
      tipOtvaranja,
      subtip,
      podpitanja,
      jezikAplikacije,
      jezikPitanja: targetLang || undefined, // hint (ne forsiramo)
      karte,
      pozicije,
      // START: i18n etikete do buildera
      keltskePozicije,
      sefirotiLabels,
      kuceAstroLabels,
      // END: i18n etikete
      znak,
      podznak,
      datumrodjenja,
      datumOtvaranja,
      tranzitiTekst,
      gender,
    });
  }
  // END: uvek koristi buildAIPrompt (glavno + podpitanje)

  // START: post-proces — PREMEŠTENO POSLE PARSIRANJA ODGOVORA
  // (ovde NE diramo odgovorText jer još ne postoji)
  // END: post-proces — PREMEŠTENO

  // START: Approx tokens (gruba procena na klijentu)
  const approxInputTokens = Math.ceil(((prompt || "").length) / 3.2);
  // cene po 1M tokena (približno, promeni po želji)
  const PRICE_PER_MILLION = {
    "gpt-4.1": { in: 2.00, out: 8.00 },   // $/1M (Standard)
    "gpt-4.1-mini": { in: 0.40, out: 1.60 },
    "gpt-4o": { in: 2.50, out: 10.00 },
    "gpt-4o-mini": { in: 0.15, out: 0.60 },
  };
  // END: Approx tokens (gruba procena na klijentu)

  // START: aproks cene — koristimo selectedModel
  const price = PRICE_PER_MILLION[selectedModel] || PRICE_PER_MILLION["gpt-4.1-mini"];
  // END: aproks cene — koristimo selectedModel

  // START: dedupe/guard
  const _sig = makeSig({
    userId: uid,
    tipOtvaranja,
    subtip,
    payload: { prompt, modelHint: selectedModel },
    jePodpitanje: !!podpitanjeMod,
  });
  const now = Date.now();
  if (__AI_IN_FLIGHT || (_sig && __AI_LAST_SIG === _sig && (now - __AI_LAST_TS) < DEDUPE_WINDOW_MS)) {
    dlog("[AI][guard]", { skip: true, inFlight: __AI_IN_FLIGHT, sinceMs: now - __AI_LAST_TS });
    return __AI_LAST_RESULT ?? { odgovor: "", sessionId: null, _deduped: true };
  }
  __AI_IN_FLIGHT = true;
  __AI_LAST_SIG = _sig;
  __AI_LAST_TS = now;
  // END: dedupe/guard

  try {
    const { data, error } = await supabase.functions.invoke("ai-odgovor", {
      body: {
        // START: NOVO – server traži ovo na TOP-level-u
        userId: uid,
        pitanje,
        sessionId: sessionId || null,
        tipOtvaranja,
        subtip,  // za podpitanje/vezivanje
        karte,       // <— zbog spend_coins_and_log p_cards
        pozicije,    // (nije kritično, ali može pomoći za log/debug)

        jePodpitanje: !!podpitanjeMod,
        podpitanjeMod: !!podpitanjeMod,
        podpitanje,
        prethodniOdgovor,
        payload: {
          // START: KLJUČNO – šaljemo STVARNI PROMPT
          prompt,
          // END: KLJUČNO
          // (opciono meta za debugiranje na serveru)
          promptPreview: prompt?.slice(0, 5000),

          // ostali podaci čisto informativno (server ih ne koristi kada ima prompt)
          pitanje,
          questionLang: questionLang || null,   // zadržavamo radi debug-a
          targetLang: targetLang || "auto",     // jasno da je puštena autodetekcija
          dodatniKontekst,
          karte,
          pozicije,
          // START: i18n etikete i za debug payload (opciono)
          keltskePozicije,
          sefirotiLabels,
          kuceAstroLabels,
          // END: i18n etikete
          znak,
          podznak,
          datumrodjenja,
          datumOtvaranja,
          tranzitiTekst,
          gender,
          // START: model hint – koristimo selectedModel
          modelHint: selectedModel,
          // END: model hint
        },
        // END: NOVO
      },
    });

    if (error) {
      if (error) {
        // START: detaljan log Edge greške (status + response/body)
        const ctx = error?.context || {};
        const resp = ctx.response || ctx;
        const edgeStatus = error?.status;
        const edgeName = error?.name;
        const edgeMsg = error?.message;
        const edgeBody = resp?.error || resp?.data || resp?.body || null;
        console.error("[EdgeFn][invoke][error]", {
          status: edgeStatus,
          name: edgeName,
          message: edgeMsg,
          body: edgeBody,
        });
        // END: detaljan log

        // Precizan mapping na statuse iz Edge funkcije
        if (error.status === 402) {
          return { odgovor: "Nedovoljno dukata za ovo otvaranje.", sessionId: null };
        }
        if (error.status === 502) {
          return { odgovor: "Došlo je do greške, iznos je vraćen.", sessionId: null };
        }

        // Korisnije poruke za česte statuse
        if (error.status === 400 || error.status === 403 || error.status === 404) {
          return {
            odgovor: "Model nije dostupan ili payload nije validan (400/403/404).",
            sessionId: null,
          };
        }
        if (error.status === 429) {
          return {
            odgovor: "Prekoračen limit poziva (429). Pokušaj ponovo kasnije.",
            sessionId: null,
          };
        }

        // Legacy fallback
        if (String(error.message || "").includes("Not enough coins")) {
          return { odgovor: "Nedovoljno dukata za ovo otvaranje.", sessionId: null };
        }

        return {
          odgovor:
            error.message || "Došlo je do greške pri komunikaciji sa AI servisom.",
          sessionId: null,
        };
      }

      // precizan mapping na statuse iz Edge funkcije
      if (error.status === 402) {
        return { odgovor: "Nedovoljno dukata za ovo otvaranje.", sessionId: null };
      }
      if (error.status === 502) {
        return { odgovor: "Došlo je do greške, iznos je vraćen.", sessionId: null };
      }

      // fallback (zadrži i stari heuristički check ako želiš)
      if (String(error.message || "").includes("Not enough coins")) {
        return { odgovor: "Nedovoljno dukata za ovo otvaranje.", sessionId: null };
      }
      return {
        odgovor: error.message || "Došlo je do greške pri komunikaciji sa AI servisom.",
        sessionId: null,
      };
    }

    // START: robust edge response parsing & logging (JS)
    let odgovorText = ((data && (data.odgovor ?? data.answer)) ?? "AI nije dao odgovor.").toString().trim();
    let edgeBuild = null;

    try {
      if (typeof data === "string") {
        // Ponekad supabase.functions.invoke vrati string — probaj parse
        const parsed = JSON.parse(data);
        edgeBuild = (parsed && parsed.edge_build) || null;
        if (!odgovorText || odgovorText === "AI nije dao odgovor.") {
          const pick = (parsed && (parsed.odgovor ?? parsed.answer ?? parsed.error)) || "";
          if (pick) odgovorText = String(pick).trim();
        }
      } else if (data && typeof data === "object") {
        edgeBuild = (data.edge_build ?? null);
        if (!odgovorText || odgovorText === "AI nije dao odgovor.") {
          const pick = (data.odgovor ?? data.answer ?? data.error ?? "");
          if (pick) odgovorText = String(pick).trim();
        }
      }
    } catch (e) {
      // tiho — u najgorem slučaju ostaje prethodni odgovorText
    }

    // Ako je i dalje prazno — prikaži jasnu poruku
    if (!odgovorText) {
      odgovorText = "AI server nije vratio sadržaj" + (edgeBuild ? ` (edge_build: ${edgeBuild})` : "") + ".";
    }

    // DEV meta log — [edge log] quiet + no keys
    let apiVal = null, modelUsedVal = null;
    try {
      if (typeof data === "string") {
        const parsed = JSON.parse(data);
        apiVal = parsed?.api ?? null;
        modelUsedVal = parsed?.modelUsed ?? null;
      } else if (data && typeof data === "object") {
        apiVal = data?.api ?? null;
        modelUsedVal = data?.modelUsed ?? null;
      }
    } catch { }
    // END: robust edge response parsing & logging (JS)

    // START: language guard (mini fix) — radi i za 4.1 i 4.1-mini
    let _lgApplied = false;
    let _lgTarget = null;
    let _lgReason = null;
    try {
      if (!LG_ON) throw new Error("lang-guard disabled");
      const trg = pickTargetLang({ questionLang, jezikAplikacije, pitanje });

      // Ako nemamo questionLang i cilj je jezik aplikacije → probaj AI autodetekciju pitanja;
      // ako ne uspe → eksplicitni fallback na jezik aplikacije (bez IT).
      let toLang = trg;
      if ((!questionLang || questionLang === "") && trg === normalizeAppLang(jezikAplikacije)) {
        const inferred = await detectLangViaEdge({ text: pitanje, uid, sessionId, selectedModel: UTIL_MODEL });
        if (inferred && inferred !== "und") {
          toLang = inferred;             // npr. "it"
          _lgReason = "detected_question";
        } else {
          toLang = normalizeAppLang(jezikAplikacije); // fallback: app lang (bez IT)
          _lgReason = "fallback_app_no_detect";
        }
      } else {
        _lgReason = questionLang ? "explicit_questionLang" : "pick_target_lang";
      }

      // Ako je cilj nepoznat/van podržanog seta → fallback na jezik aplikacije (bez IT)
      if (!toLang || !ALLOWED_LANGS.has(toLang)) {
        toLang = normalizeAppLang(jezikAplikacije);
        _lgReason = "fallback_app_invalid_target";
      }

      // START: HI guard — prevod u HI po potrebi (samo ako je cilj hi)
      if (
        LG_TRANSLATE_ON &&
        toLang === "hi" &&
        typeof odgovorText === "string" &&
        odgovorText &&
        odgovorText.length <= LG_MAX_CHARS
      ) {
        const quickHindi = looksHindi(odgovorText);
        let outLang = quickHindi ? "hi" : await detectLangViaEdge({
          text: odgovorText.slice(0, 4000),
          uid,
          sessionId,
          selectedModel: UTIL_MODEL
        });
        if (outLang !== "hi") {
          const translatePrompt =
            `Translate the following tarot reading to hi (Hindi, Devanagari). ` +
            `Preserve formatting, lists and emojis. Do not add any preface or extra comments.\n\n` +
            odgovorText;
          const { data: tData, error: tErr } = await supabase.functions.invoke("ai-odgovor", {
            body: {
              userId: uid,
              pitanje,
              sessionId: sessionId || null,
              payload: {
                prompt: translatePrompt,
                modelHint: UTIL_MODEL,
                meta: { util: "translate", free: 1 }
              },
            },
          });
          if (!tErr) {
            let fixed = null;
            if (typeof tData === "string") {
              try {
                const p = JSON.parse(tData);
                fixed = p?.odgovor ?? p?.answer ?? null;
              } catch { }
            } else if (tData && typeof tData === "object") {
              fixed = tData?.odgovor ?? tData?.answer ?? null;
            }
            if (fixed && typeof fixed === "string") {
              odgovorText = hiPostEdit(String(fixed)).trim();
              _lgApplied = true;
              _lgTarget = "hi";
              _lgReason = "hi_output_fix";
              dlog("[AI][lang-guard]", { to: "hi", applied: true, reason: _lgReason });
            }
          }
        }
      }
      // END: HI guard — prevod u HI po potrebi

      // Prevod samo ako je omogućen, cilj NIJE sr, izlaz "miriše" na srpski, i nije predugačak
      if (
        LG_TRANSLATE_ON &&
        toLang && toLang !== "sr" &&
        looksSerbian(odgovorText) &&
        odgovorText.length <= LG_MAX_CHARS
      ) {
        // Potvrdi jezik izlaza jeftinim detektom da smanjiš lažne alarme
        const outLang = await detectLangViaEdge({
          text: odgovorText.slice(0, 4000),
          uid,
          sessionId,
          selectedModel: UTIL_MODEL
        });
        if (outLang !== "sr") {
          dlog("[AI][lang-guard]", { applied: false, reason: "output_not_sr_confirmed", outLang, mode: _lgReason });
          throw new Error("skip-translate-not-sr");
        }
        const translatePrompt =
          `Translate the following tarot reading to ${toLang}. ` +
          `Preserve formatting, lists and emojis. Do not add any preface or extra comments.\n\n` +
          odgovorText;

        const { data: tData, error: tErr } = await supabase.functions.invoke("ai-odgovor", {
          body: {
            userId: uid,
            pitanje,
            sessionId: sessionId || null,
            payload: {
              prompt: translatePrompt,
              modelHint: UTIL_MODEL,
              meta: { util: "translate", free: 1 } // <-- server-side: bez naplate
            },
          },
        });
        if (!tErr) {
          let fixed = null;
          if (typeof tData === "string") {
            try {
              const parsed = JSON.parse(tData);
              fixed = parsed?.odgovor ?? parsed?.answer ?? null;
            } catch { }
          } else if (tData && typeof tData === "object") {
            fixed = tData?.odgovor ?? tData?.answer ?? null;
          }
          if (fixed && typeof fixed === "string") {
            _lgApplied = true;
            _lgTarget = toLang;
            dlog("[AI][lang-guard]", {
              to: toLang,
              applied: true,
              reason: "detected_serbian_output",
              mode: _lgReason
            });
            odgovorText = fixed.trim();
          } else {
            dlog("[AI][lang-guard]", { applied: false, reason: "no parsed text" });
          }
        } else {
          dlog("[AI][lang-guard]", { applied: false, reason: tErr?.message || "translate error" });
        }
      }
    } catch (e) {
      dlog("[AI][lang-guard][skip]", { reason: String(e?.message || e) });
    }
    // END: language guard (mini fix)

    // START: post-proces — ukloni "Transitus" ako nije dozvoljen (SADA: nakon parsiranja/prevoda)
    try {
      const allow = ["keltski", "astrološko", "drvo"].includes(tipOtvaranja) && !!tranzitiTekst;
      if (!allow) {
        const beforeScrub2 = odgovorText;
        odgovorText = stripTransitusIfNotAllowed(odgovorText, { tipOtvaranja, tranzitiTekst });
        if (beforeScrub2 !== odgovorText) {
          dlog("[AI][postprocess]", { removedTransitus: true, tip: tipOtvaranja });
        }
      }
    } catch { }
    // END: post-proces — ukloni "Transitus"

    // START: Approx output i cena (samo log, bez UI promena)
    const approxOutputTokens = Math.ceil(odgovorText.length / 4); // (posle lang-guarda)
    const approxTotalTokens = approxInputTokens + approxOutputTokens;
    const approxCostUSD = Number(
      ((approxInputTokens * price.in + approxOutputTokens * price.out) / 1_000_000).toFixed(6)
    );

    // --- META iz servera (uvek probaj da izvučeš) ---
    const edgeBuildMeta = edgeBuild ?? (data && data.edge_build) ?? null;
    const apiUsed = (typeof apiVal !== "undefined" ? apiVal : data?.api) ?? null;
    const modelUsed = (typeof modelUsedVal !== "undefined" ? modelUsedVal : data?.modelUsed) ?? null;
    const usageServer = data?.usage ?? null;

    // --- Logovi (kontrolisani flagom) — rade i na FREE planu ---
    if (VERBOSE_AI_LOGS) {
      console.log("[AI][edge]", {
        edge_build: edgeBuildMeta,
        api: apiUsed,
        modelUsed,
        selectedModel, // šta smo tražili sa klijenta
      });
      if (usageServer) {
        console.log("[AI][server-usage]", usageServer);
      } else {
        console.log("[AI][server-usage]", { note: "no usage in server response" });
      }
      console.log("[AI][approx]", {
        model: modelUsed || selectedModel,
        in_tokens: approxInputTokens,
        out_tokens: approxOutputTokens,
        total_tokens: approxTotalTokens,
        cost_usd_est: approxCostUSD,
      });
    }
    // END: Approx output i cena + meta logovi

    // START: cache last result (for dedupe hits)
    const _res = {
      odgovor: odgovorText,
      sessionId: data?.sessionId ?? null,
      // START: lang-guard meta (opciono za UI/debug)
      _translated: _lgApplied,
      _langTarget: _lgTarget,
      _langGuardMode: _lgReason
      // END: lang-guard meta
    };
    __AI_LAST_RESULT = _res;
    return _res;
    // END: cache last result (for dedupe hits)
    // END: NOVO
  } catch (e) {
    console.error("invoke greška:", e);
    return { odgovor: "Došlo je do greške pri komunikaciji sa AI servisom." };
  } finally {
    // START: release single-flight lock
    __AI_IN_FLIGHT = false;
    // END: release single-flight lock
  }
}
