// BULK + single-user, guard-ovi, dodela dukata, i18n, push log.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const EXPO_ENDPOINT = "https://exp.host/--/api/v2/push/send";
// Ako koristiš posebni kanal, promeni ga (inače "default")
const CHANNEL_ID = "alerts-high";
// i18n mapa (dodaj ostale prevode po potrebi)
const MSG = {
  en: {
    bonusTitle: "🎁 Monthly bonus",
    bonusBody: (n)=>`You received ${n} coins! Thanks for using Una 💛`
  },
  sr: {
    bonusTitle: "🎁 Mesečni bonus",
    bonusBody: (n)=>`Dobili ste ${n} dukata! Hvala što koristite Unu 💛`
  },
  es: {
    bonusTitle: "🎁 Bono mensual",
    bonusBody: (n)=>`Has recibido ${n} monedas. ¡Gracias por usar Una 💛!`
  },
  pt: {
    bonusTitle: "🎁 Bónus mensal",
    bonusBody: (n)=>`Você recebeu ${n} moedas! Obrigado por usar a Una 💛`
  },
  de: {
    bonusTitle: "🎁 Monatsbonus",
    bonusBody: (n)=>`Du hast ${n} Münzen erhalten! Danke, dass du Una nutzt 💛`
  },
  hi: {
    bonusTitle: "🎁 मासिक बोनस",
    bonusBody: (n)=>`आपको ${n} कॉइन्स मिले! यूना इस्तेमाल करने के लिए धन्यवाद 💛`
  },
  // START: fr prevod
  fr: {
    bonusTitle: "🎁 Bonus mensuel",
    bonusBody: (n)=>`Vous avez reçu ${n} pièces ! Merci d’utiliser Una 💛`
  },
  // END: fr prevod
  // START: ✨ novi jezici – turski (tr) i indonežanski (id)
  tr: {
    bonusTitle: "🎁 Aylık bonus",
    bonusBody: (n)=>`${n} jeton kazandınız! Una’yı kullandığınız için teşekkürler 💛`
  },
  id: {
    bonusTitle: "🎁 Bonus bulanan",
    bonusBody: (n)=>`Anda menerima ${n} koin! Terima kasih telah menggunakan Una 💛`
  }
};
function pickLang(lang) {
  const code = (lang || "en").slice(0, 2).toLowerCase();
  return MSG[code] ?? MSG.en; // fallback EN
}
// Env (podrži oba imena, u zavisnosti kako si setovao u Secrets)
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const db = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: {
    persistSession: false
  }
});
function monthStartUTC(d = new Date()) {
  const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
  return m.toISOString();
}
async function logPush(user_id, success, receipt, message) {
  try {
    await db.from("push_log").insert({
      user_id,
      type: "monthly_bonus",
      message,
      success,
      receipt
    });
  } catch  {}
  try {
    await db.from("profiles").update({
      last_push_any_at: new Date().toISOString()
    }).eq("id", user_id);
  } catch  {}
}
async function sendExpoPush(to, title, body) {
  const payload = {
    to,
    title,
    body,
    sound: "default",
    channelId: CHANNEL_ID,
    // Android heads-up (MAX) — usklađeno sa push-card-of-day
    priority: "high",
    // START: data bez URL-a – aplikacija uvek otvara Home
    data: {
      action: "open_monthly_bonus",
      ts: Date.now()
    }
  };
  const res = await fetch(EXPO_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const json = await res.json();
  const success = json?.data?.status === "ok" || json?.data?.[0]?.status === "ok";
  const errorCode = json?.data?.details?.error || json?.data?.[0]?.details?.error || json?.errors?.[0]?.code;
  return {
    success,
    json,
    errorCode
  };
}
// Single-user handler
async function processUserMonthlyBonus(userId, amount) {
  // 1) Učitaj profil + guard-ovi — language jedini izvor istine
  const { data: u, error } = await db.from("profiles").select("id, package, notifications_enabled, notif_monthly_bonus_enabled, expo_push_token, language").eq("id", userId).single();
  if (error || !u) return {
    userId,
    skipped: true,
    reason: "no_user"
  };
  if (u.package !== "free") return {
    userId,
    skipped: true,
    reason: "not_free"
  };
  if (!u.notifications_enabled || !u.notif_monthly_bonus_enabled) return {
    userId,
    skipped: true,
    reason: "prefs_off"
  };
  if (!u.expo_push_token) return {
    userId,
    skipped: true,
    reason: "no_token"
  };
  // 2) Jednom mesečno (preko loga)
  const { data: already } = await db.from("push_log").select("id").eq("user_id", u.id).eq("type", "monthly_bonus").gte("sent_at", monthStartUTC()).limit(1).maybeSingle();
  if (already) return {
    userId,
    skipped: true,
    reason: "already_this_month"
  };
  // 3) Dodeli dukate (RPC)
  await db.rpc("add_coins", {
    p_user: u.id,
    p_amount: amount,
    p_reason: "monthly_bonus"
  });
  // 4) i18n tekst i slanje — isključivo profiles.language
  const t = pickLang(u.language);
  const title = t.bonusTitle;
  const body = t.bonusBody(amount);
  const { success, json, errorCode } = await sendExpoPush(u.expo_push_token, title, body);
  await logPush(u.id, success, json, body);
  // 5) Ako je token nevažeći → očisti
  if (!success && (errorCode === "DeviceNotRegistered" || errorCode === "InvalidCredentials")) {
    await db.from("profiles").update({
      expo_push_token: null,
      notifications_enabled: false
    }).eq("id", u.id);
  }
  return {
    userId,
    success,
    skipped: false
  };
}
Deno.serve(async (req)=>{
  try {
    let userId;
    let amount = 150;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        userId = body.userId;
        amount = body.amount ?? 150;
      } catch  {}
    }
    // Single-user (back-compat)
    if (userId) {
      const result = await processUserMonthlyBonus(userId, amount);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          "content-type": "application/json"
        }
      });
    }
    // BULK
    const { data: users, error } = await db.from("profiles").select("id").eq("package", "free").eq("notifications_enabled", true).eq("notif_monthly_bonus_enabled", true).not("expo_push_token", "is", null);
    if (error) return new Response(error.message, {
      status: 500
    });
    const results = [];
    for (const row of users ?? []){
      const r = await processUserMonthlyBonus(row.id, amount);
      results.push(r);
    }
    const summary = {
      total: users?.length ?? 0,
      sent: results.filter((r)=>r.success).length,
      skipped: results.filter((r)=>r.skipped).length
    };
    return new Response(JSON.stringify({
      summary,
      results
    }), {
      status: 200,
      headers: {
        "content-type": "application/json"
      }
    });
  } catch (e) {
    return new Response(String(e?.message || e), {
      status: 500
    });
  }
});
