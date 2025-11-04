// Svakog sata; šalje kad je korisniku 08:00 i prošlo ≥ 3 dana. i18n + log + cleanup.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
const EXPO_ENDPOINT = "https://exp.host/--/api/v2/push/send";
const CHANNEL_ID = "alerts-high"; // ili "default"
// Plaćeni paketi kojima šaljemo poruku
const PAID_PACKAGES = [
  "premium",
  "pro",
  "proplus"
];
// i18n mapa
const MSG = {
  en: {
    cardTitle: "🃏 Card of the day",
    cardBody: "Check today’s card — it might have a message for you."
  },
  sr: {
    cardTitle: "🃏 Karta dana",
    cardBody: "Pogledaj kartu dana – možda baš danas nosi poruku za tebe."
  },
  es: {
    cardTitle: "🃏 Carta del día",
    cardBody: "Mira la carta de hoy: puede tener un mensaje para ti."
  },
  pt: {
    cardTitle: "🃏 Carta do dia",
    cardBody: "Veja a carta de hoje — pode ter uma mensagem para você."
  },
  de: {
    cardTitle: "🃏 Karte des Tages",
    cardBody: "Sieh dir die Karte des Tages an – vielleicht hat sie eine Nachricht für dich."
  },
  hi: {
    cardTitle: "🃏 आज का कार्ड",
    cardBody: "आज का कार्ड देखें — शायद इसमें आपके लिए संदेश हो।"
  },
  // START: fr prevod
  fr: {
    cardTitle: "🃏 Carte du jour",
    cardBody: "Découvrez la carte du jour — elle a peut-être un message pour vous."
  },
  // END: fr prevod
  // START: ✨ turski (tr) i indonežanski (id)
  tr: {
    cardTitle: "🃏 Günün kartı",
    cardBody: "Bugünün kartına göz at — belki sana bir mesajı vardır."
  },
  id: {
    cardTitle: "🃏 Kartu hari ini",
    cardBody: "Lihat kartu hari ini — mungkin ada pesan untukmu."
  }
};
// Ostavljamo pickLang, ali prosleđujemo isključivo profiles.language
function pickLang(lang) {
  const code = (lang || "en").slice(0, 2).toLowerCase();
  // @ts-ignore
  return MSG[code] ?? MSG.en; // fallback EN
}
function localHour(tz, d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz || "Europe/Belgrade",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(d);
  const hh = parts.find((p)=>p.type === "hour")?.value ?? "00";
  return parseInt(hh, 10);
}
serve(async (req)=>{
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const db = createClient(supabaseUrl, supabaseKey);
  // (opciono) force test parametri
  let force = false, onlyUser;
  try {
    const body = await req.json();
    force = !!body?.force;
    onlyUser = body?.userId;
  } catch  {}
  // Ako je force + onlyUser => dozvoli test čak i za free korisnika
  const includeFreeForTest = !!(force && onlyUser);
  // language jedini izvor istine (uklonjen device_locale iz SELECT-a)
  let q = db.from("profiles").select("id, package, expo_push_token, notifications_enabled, notif_card_of_day_enabled, last_card_push_at, timezone, language").not("expo_push_token", "is", null).eq("notifications_enabled", true).eq("notif_card_of_day_enabled", true);
  if (onlyUser) q = q.eq("id", onlyUser);
  // Gating na plaćene planove (osim ako je force test za konkretnog usera)
  if (!includeFreeForTest) {
    // @ts-ignore
    q = q.in("package", PAID_PACKAGES);
  }
  const { data: users, error } = await q;
  if (error) return new Response(error.message, {
    status: 500
  });
  const now = new Date();
  let sent = 0;
  for (const u of users ?? []){
    // 1) Globalna kapa – 1/dan
    if (!force) {
      const { data: okToday } = await db.rpc("can_send_push_today", {
        uid: u.id
      });
      if (okToday === false) continue;
    }
    // 2) 3 dana pauze
    const last = u.last_card_push_at ? new Date(u.last_card_push_at) : null;
    const threeDays = 72 * 60 * 60 * 1000;
    const due = force || !last || now.getTime() - (last?.getTime?.() ?? 0) >= threeDays;
    if (!due) continue;
    // 3) Lokalno vreme 08:00 (ako nije force)
    const tz = u.timezone || "Europe/Belgrade";
    const hh = localHour(tz, now);
    if (!force && hh !== 8) continue;
    // 4) i18n tekst — isključivo profiles.language
    const t = pickLang(u.language);
    const payload = {
      to: u.expo_push_token,
      title: t.cardTitle,
      body: t.cardBody,
      sound: "default",
      channelId: CHANNEL_ID,
      priority: "high",
      // START: data bez URL-a – aplikacija uvek otvara Home
      data: {
        action: "open_card_of_day",
        userId: u.id,
        ts: Date.now()
      }
    };
    // 5) Pošalji
    const res = await fetch(EXPO_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    const success = json?.data?.status === "ok" || json?.data?.[0]?.status === "ok";
    await db.from("push_log").insert({
      user_id: u.id,
      type: "card_of_day",
      message: payload.body,
      success,
      receipt: json
    });
    await db.from("profiles").update({
      last_card_push_at: new Date().toISOString(),
      last_push_any_at: new Date().toISOString()
    }).eq("id", u.id);
    const err = json?.data?.details?.error || json?.data?.[0]?.details?.error || json?.errors?.[0]?.code;
    if (!success && (err === "DeviceNotRegistered" || err === "InvalidCredentials")) {
      await db.from("profiles").update({
        expo_push_token: null,
        notifications_enabled: false
      }).eq("id", u.id);
    }
    if (success) sent++;
  }
  return new Response(JSON.stringify({
    sent
  }), {
    headers: {
      "Content-Type": "application/json"
    }
  });
});
