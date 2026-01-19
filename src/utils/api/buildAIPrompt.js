// src/utils/buildAIPrompt.js
// START: EN-prompt hotfix (cards primary, transits as complement 3–5x, app-language labels)

// Default labels (fallbacks if i18n labels are not provided from the app)
const KELTSKE_POZICIJE = [
  "1. Sadašnja situacija",
  "2. Prepreka / izazov",
  "3. Temelj (nesvesno)",
  "4. Prošlost",
  "5. Svesno / mogućnosti",
  "6. Bliska budućnost",
  "7. Stav prema situaciji",
  "8. Uticaj okoline",
  "9. Nada / strah",
  "10. Ishod"
];

const SEFIROTI = [
  "Keter (Kruna)",
  "Hokmah (Mudrost)",
  "Binah (Razumevanje)",
  "Hesed (Milosrđe)",
  "Gevurah (Stroga pravda)",
  "Tiferet (Lepota)",
  "Necah (Večnost)",
  "Hod (Slava)",
  "Jesod (Temelj)",
  "Malhut (Carstvo)"
];

// Sefiroti bez zagrada (za čistije etikete)
const SEFIROTI_NOPAREN = SEFIROTI.map(s => s.replace(/\s*\(.*?\)\s*/, ""));

// Fallback kuće (ako i18n liste nisu prosleđene)
const KUCE_ASTRO = [
  "1. oblast (Ličnost)",
  "2. oblast (Finansije)",
  "3. oblast (Komunikacija)",
  "4. oblast (Dom i porodica)",
  "5. oblast (Kreativnost)",
  "6. oblast (Zdravlje)",
  "7. oblast (Partnerstva)",
  "8. oblast (Transformacija)",
  "9. oblast (Putovanja i uverenja)",
  "10. oblast (Karijera)",
  "11. oblast (Prijatelji i zajednica)",
  "12. oblast (Podsvest)"
];

// NOTE: keep spread names in EN so the whole prompt stays English (ostavljamo kako jeste)
const NAZIVI_OTVARANJA = {
  // subtipovi klasičnog
  "ljubavno": "Love spread",
  "proslost-sadasnjost-buducnost": "Past–Present–Future",
  "putspoznaje": "Path of self-knowledge",
  // glavni tipovi
  "keltski": "Celtic Cross",
  "astrološko": "Astrological spread (12 areas)",
  "drvo": "Kabbalistic Tree of Life"
};

// Word limits
const LIMITI_REC = {
  "ljubavno": 200,
  "proslost-sadasnjost-buducnost": 250,
  "putspoznaje": 300,
  "keltski": 450,
  "astrološko": 600,
  "drvo": 500,
  "podpitanje": 200
};
// START: JUNG — dopuna map-a bez diranja postojećih objekata
try {
  NAZIVI_OTVARANJA["jung"] = "Jungian Archetypes (5 cards)";
  // limit se trenutno koristi samo za podpitanje, ali ostavljamo da postoji “za sutra”
  LIMITI_REC["jung"] = 450;
} catch { }
// END: JUNG — dopuna map-a

// Helper: map sign → house by ASC (symbolic)
export function planetaUKuci(podznak, planetaZnak) {
  const znakovi = [
    "Ovan", "Bik", "Blizanci", "Rak", "Lav", "Devica",
    "Vaga", "Škorpija", "Strelac", "Jarac", "Vodolija", "Ribe"
  ];
  const ascIndex = znakovi.indexOf(podznak);
  const planetaIndex = znakovi.indexOf(planetaZnak);
  if (ascIndex === -1 || planetaIndex === -1) return null;
  return ((planetaIndex - ascIndex + 12) % 12) + 1;
}

// START: ascHouseMap + cheat-sheet
export function ascHouseMap(podznak) {
  const znakovi = ["Ovan", "Bik", "Blizanci", "Rak", "Lav", "Devica", "Vaga", "Škorpija", "Strelac", "Jarac", "Vodolija", "Ribe"];
  const ascIndex = znakovi.indexOf(podznak);
  if (ascIndex === -1) return null;
  const map = {};
  for (let i = 0; i < 12; i++) {
    map[znakovi[i]] = ((i - ascIndex + 12) % 12) + 1;
  }
  return map;
}
// END: ascHouseMap + cheat-sheet
// START: annotate transits with H# (whole-sign houses by ASC) — avoids layout confusion
function annotateTransitsWithHouses(tranzitiTekst = "", podznak = "") {
  if (!tranzitiTekst || !podznak || podznak === "unknown") return tranzitiTekst;

  // hvata: "Venera Jarac 24.3°" i slične forme; podržava i višerečne nazive (npr. "Severni čvor")
  const ZN = "(Ovan|Bik|Blizanci|Rak|Lav|Devica|Vaga|Škorpija|Strelac|Jarac|Vodolija|Ribe)";
  const RX = new RegExp(
    `([A-Za-zČĆŠĐŽčćšđž]+(?:\\s+[A-Za-zČĆŠĐŽčćšđž]+)*)\\s+${ZN}\\s+(\\d+(?:\\.\\d+)?)°`,
    "g"
  );

  return String(tranzitiTekst).replace(RX, (m, planeta, znak, deg) => {
    // ako je već anotirano, ne diraj
    if (/\(H\d+\)/.test(m)) return m;

    const h = planetaUKuci(podznak, znak);
    const hTxt = Number.isFinite(h) ? `H${h}` : "H?";
    return `${planeta} ${znak} ${deg}° (${hTxt})`;
  });
}
// END: annotate transits with H# (whole-sign houses by ASC) — avoids layout confusion

// START: light-rollback — skraćujemo/isključujemo dugačke EN napomene (ne brišemo, samo komentarišemo)
// const TRANSITS_NOTE = `...`;
// const GLYPH_LEGEND = `...`;
// END: light-rollback

// START: SOFT — tranziti kao diskretna dopuna, bez fiksnog broja
const OBAVEZNO_TRANZITI = `
Ako su dati tranziti: **uklopi ih samo kad prirodno dopunjuju konkretnu kartu/poziciju/kuću**.
– Prioritet je tumačenje karata; tranziti su *kratka dopuna* (≈25% teksta max).
`.trim();
// END: SOFT

// START: SOFT — "flow" bez rigidnih kvota
const FLOW_UKLAPANJE = `
Inline stil (poželjno, ali bez forsiranja):
– cilj **2–3 kratke inline napomene u celom tekstu**, max **1 po oblasti**; preskoči ako ne deluje prirodno;
– piši ih u istoj rečenici gde tumačiš kartu (zagrada ili crtica), npr. „… — Mars u Vagi (H11) smiruje ton“;
– Za pozicije layout-a koristi tačno prosleđene labele iz inputa (npr. “11. oblast …”) i ne prevodi ih. Za tranzite/natalne kuće koristi isključivo oznake (H#) ako su date i ne prevodi H# u “house/kuća/casa”.
– **ne započinji pasus tranzitom** i **ne piši rečenice koje su samo o tranzitu** bez reference na kartu;
–  odeljak **Transitus** neka bude kratak (≤ 70 reči) i sažme 2–4 najrelevantnije napomene (bez ponavljanja).
`.trim();
// END: SOFT

// START: v2 guardrails — tranziti i podpitanja (enforcer)
// START: v2 guardrails — tranziti i podpitanja (enforcer)
const TRANSIT_ENFORCER = `
– **Tranziti (ako su dati):** napiši **min. 2, max. 4** kratke inline napomene (najviše 1 po oblasti/poziciji) i dodaj **obavezni** mini-odeljak "Transitus" (≤ 70 reči) koji sažima 2–3 najrelevantnije napomene. Ne započinji pasuse tranzitima.
– "Transitus" uvek mora da pokrije vremenski luk: **1× anchor datum (NOW_DATE)** + **2× različita buduća datuma** iz prosleđenih date-lineova (ako postoje). Svaku napomenu obavezno citiraj kao **[YYYY-MM-DD]**; future formuliši kao predstojeće (“oko/od/krajem”), ne kao da je već aktivno.
– Izbor 2 buduća datuma u "Transitus": biraj 2 date-linea koji su NAJRELEVANTNIJI za temu pitanja.
  Prioritet:
  1) datum gde se relevantna planeta menja znak u odnosu na NOW_DATE,
  2) datum gde su relevantne planete najistaknutije za temu:
     ljubav → Venera/Mars; posao → Merkur/Mars (+ Saturn); novac → Venera/Jupiter (+ Saturn); odnosi → Venera/Mars (+ Uran),
  3) ako je sve slično → uzmi najbliža 2 buduća datuma.

`.trim();

// START: TIME WINDOW — TRANSITS_SCOPE (meta-oznake, radi na svim jezicima)
const TRANSITS_SCOPE_RULE = `
TRANSITS_SCOPE:
- Anchor line provided in Transitus block:
  - NOW_DATE: YYYY-MM-DD (this is the "now" anchor)
- Output format:
  - NEVER print the literal token "NOW_DATE" in your prose.
  - NEVER output placeholders like [NOW_TAG] or [NOW_DATE].
  - When referencing "now/today", cite as [YYYY-MM-DD] where YYYY-MM-DD equals the NOW_DATE value.
- Allowed sources: ONLY the provided Transitus block (BASE line + dated lines).
- Never mention any planet/transit that is NOT present in the Transitus block (including Moon/Mesec if not provided).
- If you mention a transit, you MUST cite its source as [YYYY-MM-DD] using the matching dated line.
- For "current situation / šta sad" questions, keep the MAIN interpretation anchored to the NOW_DATE line (fast planets) + the slow-planets BASE; the "Transitus" recap still includes upcoming notes from future dated lines (clearly marked as upcoming and cited).
- Do not treat future dated lines as already active “now”.
`.trim();
// END: TIME WINDOW — TRANSITS_SCOPE (meta-oznake, + “next 30 days” forcing)


const FOLLOWUP_ENFORCER = `
– **Za podpitanje:** ne ponavljaj uvod ni ceo raspored. Format:
  1) Jedna rečenica – direktan odgovor.
  2) Šta je novo u odnosu na prethodno (2–3 razlike; pozovi se na **karte/pozicije** po imenu).
  3) Sledeći korak (2–3 praktične preporuke).
  Anti-duplikat: ukloni rečenice koje su skoro iste kao u "Prethodno tumačenje".`;
// END: v2 guardrails — tranziti i podpitanja (enforcer)
// END: v2 guardrails — tranziti i podpitanja (enforcer)

// START: light-rollback — srpska verzija „karte su primarne“
const CARDS_FIRST_RULE = `VAŽNO: Karte su primarne. Tranziti su dopuna i ne zamenjuju karte. Ako nema karata, traži novo otvaranje.`.trim();
// END: light-rollback

// START: legacy langRule (placeholder "{jezikAplikacije}" zbunjuje model; koristimo langRuleFinal)
// eslint-disable-next-line no-unused-vars
const langRule = `
Odgovaraj ISKLJUČIVO na jeziku aplikacije: "{jezikAplikacije}".
Ignoriši jezik pitanja (pitanje može biti na drugom jeziku).
Ne mešaj jezike i ne objašnjavaj ova pravila u odgovoru.
`.trim();
// END: legacy langRule


// HARD: zabrana meta/disclaimera
const NO_META = `
Ne piši meta-iskaze o tome da si AI, o jezičkim sposobnostima ili ograničenjima.
Ne koristi fraze tipa: "Kao AI model…" ili "Mogu da odgovorim samo na…".
Počni direktno sa tumačenjem, bez uvodnih odricanja.
`.trim();

// AKSIOM — pravila nad svim pravilima
const AXIOM = `
AKSIOM — poštuj pre svega:
1) Uvek odgovaraj na jeziku aplikacije (jezik UI).
2) Bez meta/disclaimera u tekstu.
3) Karte su primarne; tranzite koristi kao prirodnu dopunu uz konkretne karte/pozicije/oblasti.
   Ako nema karata, ljubazno zatraži novo otvaranje (ne piši čisto astro odgovor).
`.trim();

// START: transits eligibility map (ko sme tranzite)
const TRANSIT_ELIGIBLE_TIPS = new Set(["keltski", "astrološko", "drvo"]);
// END: transits eligibility map

// START: transits required map (ova tri uvek idu sa tranzitima)
const TRANSIT_REQUIRED_TIPS = new Set(["keltski", "astrološko", "drvo"]);
// END: transits required map

const SIGN_GLYPHS = {
  "Ovan": "♈", "Bik": "♉", "Blizanci": "♊", "Rak": "♋", "Lav": "♌", "Devica": "♍",
  "Vaga": "♎", "Škorpija": "♏", "Strelac": "♐", "Jarac": "♑", "Vodolija": "♒", "Ribe": "♓"
};
// END: glyph mape za znakove (neutralni simboli)
// END: minimalna detekcija SR vs non-SR + LANG banner

// START: normalize tip
function normalizeTip(t) {
  const r = String(t || "").toLowerCase().trim();
  if (["klasicno", "klasično", "klasicna", "klasična"].includes(r)) return "klasicno";
  if (["keltski", "celtic", "celtic cross"].includes(r)) return "keltski";
  if (["astrološko", "astrolosko", "astro", "astrological"].includes(r)) return "astrološko";
  if (["drvo", "kabbalah", "kabalisticko", "kabalističko", "tree"].includes(r)) return "drvo";
  // START: JUNG — normalize tip (sinonimi)
  if (r.includes("jung") || r.includes("arhetip") || r.includes("archetype")) return "jung";
  // END: JUNG — normalize tip

  return r;
}

/**
 * Build the full AI prompt, with positions/labels coming in app language.
 * Model autodetekcija jezika odgovora; fallback = jezik aplikacije.
 */
export function buildAIPrompt({
  ime,
  gender,
  pitanje,
  tipOtvaranja,
  subtip,
  podpitanja = [],
  jezikAplikacije,
  // START: target jezik odgovora (prosleđuj samo ako želiš da forsiraš; inače ignorišemo)
  jezikPitanja,
  // END: target jezik odgovora
  karte = [],
  pozicije = [],
  // i18n labels from the app (in app language)
  keltskePozicije,
  sefirotiLabels,
  kuceAstroLabels,
  // astro basics
  znak,
  podznak,
  datumrodjenja,
  // transits + date
  tranzitiTekst,
  datumOtvaranja,
  // follow-up context
  prethodniOdgovor
}) {
  // START: normalize TIP (otporan na dijakritike/sinonime)
  const TIP = normalizeTip(tipOtvaranja);
  // END: normalize TIP

  // Utility: normalized values
  const valueOrUnknown = v => (!!v && v !== "null" && v !== "") ? v : "unknown";
  const zn = valueOrUnknown(znak);
  const pz = valueOrUnknown(podznak);
  const dr = valueOrUnknown(datumrodjenja);

  // START: QLANG + LANG_BANNER (VALIDATE lang codes; ignoriši "non-sr"/"non")
  const QLANG = (() => {
    const LANG_OK = new Set(["en", "de", "es", "fr", "pt", "sr", "hi", "tr", "id"]);
    const appRaw = String(jezikAplikacije || "").split("-")[0].toLowerCase();
    return (appRaw && LANG_OK.has(appRaw)) ? appRaw : "en";
  })();

  const LANG_BANNER =
    `TARGET_LANG (APP_LANGUAGE) = "${QLANG}". ` +
    `Reply ONLY in this language. Do not mix languages.`;

  // END: QLANG + LANG_BANNER
  // START: langRuleFinal — jedina istina (TARGET_LANG = app language)
  const langRuleFinal = `
  Reply ONLY in the APP language (TARGET_LANG): "${QLANG}".
  Ignore the question language. Do not mix languages.
  `.trim();

  // END: langRuleFinal


  // START: JUNG — lokalizacija fiksnih labela (TARGET_LANG = app language)
  const JUNG_LEX = (() => {
    const lang = (QLANG || String(jezikAplikacije || "").split("-")[0] || "en").toLowerCase();

    // START: JUNG_LEX headings (Persona/Shadow/...) localized by TARGET_LANG
    // (u postojeće return objekte dodaj ovih 5 ključeva)
    if (lang === "sr") return {
      risk: "Rizik", opp: "Prilika", summary: "Sažetak", signoff: "Una",
      persona: "Persona",
      shadow: "Senka",
      core: "Centralni arhetip / tema Sopstva",
      integration: "Integracioni korak",
      direction: "Pravac",
    };

    if (lang === "de") return {
      risk: "Risiko", opp: "Chance", summary: "Zusammenfassung", signoff: "Deine, Una",
      persona: "Persona",
      shadow: "Schatten",
      core: "Kernarchetyp / Selbst-Thema",
      integration: "Integrationsschritt",
      direction: "Richtung",
    };

    if (lang === "es") return {
      risk: "Riesgo", opp: "Oportunidad", summary: "Resumen", signoff: "Con cariño, Una",
      persona: "Persona",
      shadow: "Sombra",
      core: "Arquetipo central / tema del Sí-mismo",
      integration: "Paso de integración",
      direction: "Dirección",
    };

    if (lang === "fr") return {
      risk: "Risque", opp: "Opportunité", summary: "Résumé", signoff: "Amitiés, Una",
      persona: "Persona",
      shadow: "Ombre",
      core: "Archétype central / thème du Soi",
      integration: "Étape d’intégration",
      direction: "Direction",
    };

    if (lang === "pt") return {
      risk: "Risco", opp: "Oportunidade", summary: "Resumo", signoff: "Com carinho, Una",
      persona: "Persona",
      shadow: "Sombra",
      core: "Arquétipo central / tema do Self",
      integration: "Passo de integração",
      direction: "Direção",
    };

    if (lang === "tr") return {
      risk: "Risk", opp: "Fırsat", summary: "Özet", signoff: "Sevgiler, Una",
      persona: "Persona",
      shadow: "Gölge",
      core: "Çekirdek arketip / Benlik teması",
      integration: "Entegrasyon adımı",
      direction: "Yön",
    };

    if (lang === "id") return {
      risk: "Risiko", opp: "Peluang", summary: "Ringkasan", signoff: "Salam hangat, Una",
      persona: "Persona",
      shadow: "Bayangan",
      core: "Arketipe inti / tema Diri",
      integration: "Langkah integrasi",
      direction: "Arah",
    };

    if (lang === "hi") return {
      risk: "जोखिम", opp: "अवसर", summary: "सारांश", signoff: "सप्रेम, Una",
      persona: "पर्सोना",
      shadow: "छाया",
      core: "मुख्य आर्केटाइप / स्व-थीम",
      integration: "एकीकरण कदम",
      direction: "दिशा",
    };

    return {
      risk: "Risk", opp: "Opportunity", summary: "Summary", signoff: "Yours, Una",
      persona: "Persona",
      shadow: "Shadow",
      core: "Core archetype / Self theme",
      integration: "Integration step",
      direction: "Direction",
    };
    // END: JUNG_LEX headings (Persona/Shadow/...) localized by TARGET_LANG
  })();
  // END: JUNG — lokalizacija fiksnih labela

  // START: naziv otvaranja precizniji (klasično → varijanta)
  const nazivOtvaranja =
    TIP === "klasicno"
      ? (NAZIVI_OTVARANJA[subtip] || "Classic spread")
      : (NAZIVI_OTVARANJA[TIP] || TIP || "Spread");
  // END: naziv otvaranja precizniji

  // START: word limit – samo za podpitanje (glavna otvaranja bez tvrdog limita)
  let maxBrojReci = null;
  if (podpitanja && podpitanja.length > 0) {
    maxBrojReci = LIMITI_REC["podpitanje"]; // follow-up = 200
  }
  const wordCapRule = maxBrojReci
    ? `– Glavni odgovor do **${maxBrojReci} reči**.`
    : '';
  // END: word limit – samo za podpitanje


  // START: da li su tranziti dozvoljeni (TIP + realan tekst tranzita) i obavezni
  const mustHaveTransits = TRANSIT_REQUIRED_TIPS.has(TIP);
  const allowTransits = TRANSIT_ELIGIBLE_TIPS.has(TIP) && !!tranzitiTekst;
  const REQUIRED_TRANSITS_MISSING = (mustHaveTransits && !tranzitiTekst)
    ? '– Za ovo otvaranje su tranziti **obavezni**, ali nisu prosleđeni: **ne pominji tranzite/efemeride/aspekte** niti dodaj odeljak "Transitus". Radi tumačenje isključivo iz karata.'
    : '';
  // END: da li su tranziti dozvoljeni (TIP + realan tekst tranzita) i obavezni
  // START: identitet — H# objašnjenje (natal house) vs layout positions
  const IDENTITET_ASTRO_H_NOTE = `
Napomena: Oznake poput (H9) u tranzitima su **natalne kuće korisnika** računate iz ASC (whole-sign).
Ne mešaj H# sa pozicijama otvaranja (12 oblasti/pozicija u layout-u).
`.trim();
  // END: identitet — H# objašnjenje (natal house) vs layout positions

  // START: identitet — append H# clarification
  const identitetAstro = `
Odgovaraš kao Una — empatična astro-tarot savetnica. Prvo tumačiš **izvučene karte**.${allowTransits ? " Ako su dati tranziti, suptilno ih uklapaš uz kontekst pitanja i pozicije." : ""}
${allowTransits ? "Ako je poznat podznak, tretiraj ga kao **H1 (ASC=H1)** i znakove tranzita mapiraj po redu Zodijaka (whole-sign) u **H#**." : "Ako je poznat podznak, tretiraj ga kao **H1 (ASC=H1)**."}
${allowTransits ? `\n${IDENTITET_ASTRO_H_NOTE}` : ""}
`.trim();
  // END: identitet — append H# clarification

  const identitet = (TIP === "jung") ? "" : identitetAstro;
  // END: identitet — overrideable
  // END: identitet

  // START: labelsNoteText — bez sudaranja (ne prevodi layout labele)
  const labelsNoteText =
    QLANG === "sr"
      ? "Napomena: Za layout pozicije/oblasti/sefirote koristi TAČNO prosleđene labele iz inputa i ne prevodi ih. Karte ostaju primarne."
      : "Note: Use the EXACT provided layout labels for positions/areas/Sefirot; do NOT translate them. Cards remain primary.";
  // END: labelsNoteText — bez sudaranja

  // START: Astro info block — uvek simbolički (neutralan za sve jezike)
  let astroInfo = '';
  const sunSign = zn && zn !== 'unknown' ? `☉ ${SIGN_GLYPHS[zn] || zn}` : null;
  const ascSign = pz && pz !== 'unknown' ? `ASC ${SIGN_GLYPHS[pz] || pz}` : null;
  const astroOutLine = (sunSign && ascSign) ? `${sunSign} • ${ascSign}` : "";

  const dobLine = dr && dr !== 'unknown' ? `${dr}` : null;
  const astroLine = [sunSign, ascSign, dobLine].filter(Boolean).join(' • ');
  if (astroLine) {
    astroInfo = `\nAstro: ${astroLine}`;
  }
  const astroTekst = astroInfo || '';
  // END: Astro info block — uvek simbolički

  // ASC cheat-sheet za kuće (pomaže modelu da navede kuću)
  const ascMap = ascHouseMap(pz);
  const houseCheat = ascMap

    ? '\nMapiranje znak→H (whole-sign po ASC):\n' +
    Object.entries(ascMap).map(([s, h]) => `${s} → H${h}`).join(', ') +
    '\nOvo koristi samo za natalne kuće (H#). Ne mešaj sa oblastima/pozicijama otvaranja.'
    : '';
  // START: JUNG — identitet + strip astro context
  // START: JUNG — ukloni astro kontekst iz prompta (da ne “curi” u Jung odgovor)

  // END: JUNG — ukloni astro kontekst iz prompta
  const astroTekstJungSafe = TIP === "jung" ? "" : astroTekst;
  const houseCheatJungSafe = TIP === "jung" ? "" : houseCheat;
  const identitetJung = `
Odgovaraš kao Una — profesionalni jungovski analitičar simbola (tarot kao projekcioni ekran arhetipova).
Ton: topao, jasan i precizan. Bez fatalizma i bez “predikcije budućnosti”.
Fokus: uvid u obrasce, nesvesne motive, konflikt Persona–Senka i integraciju (koraci koji su izvodljivi).
Ne postavljaš dijagnoze i ne glumiš terapeuta — nudiš refleksiju i praktičan integracioni korak.
Izbegavaj dijagnostičke etikete (npr. “depresija”, “anksiozni poremećaj”, “bipolarno”). Umesto toga koristi opisno: “snižen ton”, “pad motivacije”, “unutrašnja praznina”, “nemir”.
Radiš kroz 5 pozicija: Persona → Senka → Core archetype/Self theme → Integration step → Direction (pravac razvoja, ne događaj).
`.trim();

  // identitetFinal postoji u template-u, ali za ostale je PRAZAN (nema dupliranja)
  const identitetFinal = (TIP === "jung") ? identitetJung : "";

  // START: JUNG_ENFORCER — headings must be EXACT in TARGET_LANG (no EN leakage)
  const JUNG_ENFORCER = (TIP === "jung") ? `
– For type "jung": interpret tarot as Jungian archetypal symbolism (reflection + integration), NOT future prediction.
– Do NOT mention zodiac signs, ASC, transits, timing, “you will/it will happen”, or guarantees.

– Output must be EXACTLY 5 numbered sections with these EXACT headings (TARGET_LANG):
  1) ${JUNG_LEX.persona}
  2) ${JUNG_LEX.shadow}
  3) ${JUNG_LEX.core}
  4) ${JUNG_LEX.integration}
  5) ${JUNG_LEX.direction}

– The labels MUST be written in TARGET_LANG (APP language) using EXACT words:
  ${JUNG_LEX.risk}, ${JUNG_LEX.opp}, ${JUNG_LEX.summary}

– Section 4 must be exactly 3 bullet actions (short, concrete, doable today).
– Card-first line rule: In EACH section (1)–(5), the first content line after the heading MUST start with the card name + arrow copied verbatim from the drawn cards list, e.g. "Page of Cups ↑ — ...".
– Section 4 format: First write ONE short sentence that starts with Card 4 name+arrow (max 18 words), THEN write EXACTLY 3 bullet actions (each actionable, doable today). No extra bullets or paragraphs in section 4.

– AFTER section (5), you MUST finish with EXACTLY two final lines (no extra paragraphs):
  ${JUNG_LEX.summary}: <ONE sentence, no name, no signature words>
  ${JUNG_LEX.signoff}
– Do NOT write “In summary, Una” (or any variant). The sign-off must be ONLY the last line.
– Fidelity rule: You must interpret the EXACT drawn card identity (same card and orientation), but translate the card name into TARGET_LANG if needed.

– Section-to-card binding: Section 1 MUST use Card 1, Section 2 MUST use Card 2, ... Section 5 MUST use Card 5 (in order).
– Card naming: In each section, write the card name EXACTLY as provided for that section (copy it verbatim; do not substitute suits like Cups/Pentacles).
– Card orientation rule: ↑ = emerging/healthy need/potential; ↓ = blockage/distortion/resistance. Respect this throughout.
– Keep sections (1)–(3) to max 2–3 sentences each (avoid generic filler).
`.trim() : "";
  // END: JUNG_ENFORCER — headings must be EXACT in TARGET_LANG (no EN leakage)


  // Follow-up context
  const prethodniKontekst = (podpitanja && podpitanja.length > 0 && prethodniOdgovor)
    ? `\nPrethodno tumačenje (kontekst za podpitanje):\n${prethodniOdgovor}\n`
    : "";

  // Spread-specific intro (postojeći SR uvodi)
  let uvodPrompt = "";
  if (TIP === "klasicno") {
    if (subtip === "ljubavno") {
      uvodPrompt = `
TIP OTVARANJA: Ljubavno čitanje.
– Karta 1 predstavlja osobu koja pita.
– Karta 2 predstavlja partnera/simpatiju/osobu od interesa.
Tumači striktno u kontekstu odnosa.`.trim();
    } else if (
      subtip === "proslost-sadasnjost-buducnost" ||
      subtip === "proslost" ||
      subtip === "tri"
    ) {
      uvodPrompt = `
TIP OTVARANJA: Prošlost – Sadašnjost – Budućnost.
– Karta 1: prošlost. – Karta 2: sadašnjost. – Karta 3: budućnost.
Poveži tok vremena i učenja. `.trim();
    } else if (
      subtip === "putspoznaje" ||
      subtip === "put" ||
      subtip === "pet"
    ) {
      uvodPrompt = `
TIP OTVARANJA: Put spoznaje.
Svaka karta je korak/lekcija na putu ličnog rasta.`.trim();
    } else {
      uvodPrompt = `
TIP OTVARANJA: Klasično.
Opšte tumačenje u skladu sa pitanjem.`.trim();
    }
    // START: JUNG — uvod (SR)
  } else if (TIP === "jung") {
    uvodPrompt = `
TIP OTVARANJA: Jungian Archetypes (5 cards).
Ovo je simbolička Jungovska analiza (ne predikcija budućnosti) — fokus na uvidu, obrascima i integraciji.
Pozicije:
1) Persona (maska / adaptacija)
2) Senka (potisnuto / tabu)
3) Core archetype / Self theme (centralni motiv)
4) Integracioni korak (konkretno šta da neguješ/uradiš)
5) Pravac (u kom smeru vodi razvoj — ne “šta će biti”).`.trim();
    // END: JUNG — uvod (SR)

  } else if (TIP === "astrološko") {
    uvodPrompt = `
TIP OTVARANJA: Astrološko (12 oblasti).
Prođi svih 12 oblasti; **karte su primarne**. Tranzite uklopi gde prirodno pašu.
${allowTransits ? OBAVEZNO_TRANZITI : ""}
${allowTransits ? FLOW_UKLAPANJE : ""}
`.trim();
  } else if (TIP === "drvo") {
    uvodPrompt = `
TIP OTVARANJA: Kabalističko drvo života.
Prođi svih 10 sefirota; **karte su primarne**, tranziti su suptilna dopuna.
${allowTransits ? OBAVEZNO_TRANZITI : ""}
${allowTransits ? FLOW_UKLAPANJE : ""}
`.trim();
  } else if (TIP === "keltski") {
    uvodPrompt = `
TIP OTVARANJA: Keltski krst.
Prođi svih 10 pozicija; **karte prvo**, tranziti su dopuna.
${allowTransits ? OBAVEZNO_TRANZITI : ""}
${allowTransits ? FLOW_UKLAPANJE : ""}
`.trim();
  }

  // START: EN/SR varijante uvoda (novi EN tekst + finalni izbor)
  let uvodPromptEN = "";
  if (TIP === "klasicno") {
    if (subtip === "ljubavno") {
      uvodPromptEN = `
SPREAD TYPE: Love spread.
– Card 1: the querent.
– Card 2: the partner/person of interest.
Interpret strictly in the context of the relationship.`.trim();
    } else if (
      subtip === "proslost-sadasnjost-buducnost" ||
      subtip === "proslost" ||
      subtip === "tri"
    ) {
      uvodPromptEN = `
SPREAD TYPE: Past – Present – Future.
– Card 1: past. – Card 2: present. – Card 3: future.
Connect the flow of time and learning.`.trim();
    } else if (
      subtip === "putspoznaje" ||
      subtip === "put" ||
      subtip === "pet"
    ) {
      uvodPromptEN = `
SPREAD TYPE: Path of self-knowledge.
Each card is a step/lesson on the path of personal growth.`.trim();
    } else {
      uvodPromptEN = `
SPREAD TYPE: Classic.
General reading aligned to the question.`.trim();
    }
    // START: JUNG — intro (EN)
  } else if (TIP === "jung") {
    uvodPromptEN = `
SPREAD TYPE: Jungian Archetypes (5 cards).
This is a Jungian archetypal analysis (symbolic reflection), not fortune-telling.
Positions:
1) Persona (mask/adaptation)
2) Shadow (repressed material)
3) Core archetype / Self theme (central pattern)
4) Integration step (concrete integration action)
5) Direction (developmental direction — not “what will happen”).`.trim();
    // END: JUNG — intro (EN)


  } else if (TIP === "astrološko") {
    uvodPromptEN = `
SPREAD TYPE: Astrological (12 areas).
Go through all 12 areas; **cards are primary**. Blend transits only where they fit naturally.
${allowTransits ? OBAVEZNO_TRANZITI : ""}
${allowTransits ? FLOW_UKLAPANJE : ""}`.trim();
  } else if (TIP === "drvo") {
    uvodPromptEN = `
SPREAD TYPE: Kabbalistic Tree of Life.
Cover all 10 Sefirot; **cards are primary**, transits are a subtle complement.
${allowTransits ? OBAVEZNO_TRANZITI : ""}
${allowTransits ? FLOW_UKLAPANJE : ""}`.trim();
  } else if (TIP === "keltski") {
    uvodPromptEN = `
SPREAD TYPE: Celtic Cross.
Cover all 10 positions; **cards first**, transits as complement.
${allowTransits ? OBAVEZNO_TRANZITI : ""}
${allowTransits ? FLOW_UKLAPANJE : ""}`.trim();

  }

  // START: uvodPromptFinal — prevent EN Jung intro leakage
  const uvodPromptFinal =
    (TIP === "jung") ? "" : ((QLANG === "sr") ? uvodPrompt : uvodPromptEN);
  // END: uvodPromptFinal — prevent EN Jung intro leakage


  // START: tranziti — anotiraj sa H# (whole-sign po podznaku)
  const tranzitiTekstFinal = allowTransits
    ? annotateTransitsWithHouses(tranzitiTekst, pz)
    : tranzitiTekst;

  const tranzitiBlock = allowTransits
    ? `\nTransitus:\n${tranzitiTekstFinal}\n`
    : "";
  // END: tranziti — anotiraj sa H# (whole-sign po podznaku)

  // Reading date
  const datumOtvaranjaBlok = datumOtvaranja
    ? `\nDatum otvaranja: ${datumOtvaranja}`
    : "";

  // CARDS & POSITIONS — always include orientation, using app-language labels when provided
  let karteOpis = "";
  if (karte && karte.length > 0) {
    if (TIP === "keltski") {
      const KEL_LABELS = keltskePozicije || KELTSKE_POZICIJE;
      karteOpis = karte.map((k, i) => {
        const imeK = k?.ime || k?.label || "?";
        const orijent = k?.reversed ? "↓" : "↑";
        return `${KEL_LABELS[i] || `Pozicija ${i + 1}`}: ${imeK} ${orijent}`;
      }).join('\n');
    } else if (TIP === "drvo") {
      const SEF_SRC = Array.isArray(sefirotiLabels) ? sefirotiLabels : SEFIROTI_NOPAREN;
      karteOpis = karte.map((k, i) => {
        const imeK = k?.ime || k?.label || "?";
        const orijent = k?.reversed ? "↓" : "↑";
        return `${i + 1}. ${SEF_SRC[i] || "Sefira"}: ${imeK} ${orijent}`;
      }).join('\n');
    } else if (TIP === "astrološko") {
      const KUCE_LABELS = Array.isArray(kuceAstroLabels) ? kuceAstroLabels : KUCE_ASTRO;
      karteOpis = karte.map((k, i) => {
        const imeK = k?.ime || k?.label || "?";
        const orijent = k?.reversed ? "↓" : "↑";
        return `${KUCE_LABELS[i] || `Pozicija ${i + 1}`}: ${imeK} ${orijent}`;
      }).join('\n');
      // START: JUNG — labels for 5 positions
    } else if (TIP === "jung") {
      const JUNG_LABELS_SR = [
        "1) Persona",
        "2) Senka",
        "3) Core archetype / Self theme",
        "4) Integracioni korak",
        "5) Pravac",
      ];
      const JUNG_LABELS_EN = [
        "1) Persona",
        "2) Shadow",
        "3) Core archetype / Self theme",
        "4) Integration step",
        "5) Direction",
      ];

      const labels =
        (pozicije && pozicije.length === karte.length)
          ? pozicije
          // START: JUNG labels fallback — use TARGET_LANG headings (JUNG_LEX)
          : [
            `1) ${JUNG_LEX.persona}`,
            `2) ${JUNG_LEX.shadow}`,
            `3) ${JUNG_LEX.core}`,
            `4) ${JUNG_LEX.integration}`,
            `5) ${JUNG_LEX.direction}`,
          ];
      // END: JUNG labels fallback — use TARGET_LANG headings (JUNG_LEX)


      karteOpis = karte.map((k, i) => {
        const imeK = k?.ime || k?.label || "?";
        const orijent = k?.reversed ? "↓" : "↑";
        return `${labels[i] || `Position ${i + 1}`}: ${imeK} ${orijent}`;
      }).join('\n');
      // END: JUNG — labels for 5 positions

    } else if (pozicije && pozicije.length === karte.length) {
      karteOpis = karte.map((k, i) => {
        const imeK = k?.ime || k?.label || "?";
        const orijent = k?.reversed ? "↓" : "↑";
        return `${pozicije[i]}: ${imeK} ${orijent}`;
      }).join('\n');
    } else {
      karteOpis = karte.map((k, i) => {
        const imeK = k?.ime || k?.label || "?";
        const orijent = k?.reversed ? "↓" : "↑";
        return `${i + 1}. ${imeK} ${orijent}`;
      }).join('\n');
    }
  } else {
    karteOpis = "Nije pronađena nijedna izvučena karta.";
  }

  // Follow-up text
  let podpitanjaTekst = "";
  if (podpitanja && podpitanja.length > 0) {
    // START: follow-up structure & anti-dup
    podpitanjaTekst = `
Ovo je **podpitanje** zasnovano na prethodnom tumačenju iznad.
Radi isključivo u okviru istih karata — **ne radi novo čitanje**.
Napiši do ${LIMITI_REC["podpitanje"]} reči u 3 kratke celine:
1) **Jedna rečenica** — direktan odgovor.
2) **Šta je novo** u odnosu na prethodno (2–3 razlike; referiši **karte/pozicije** po imenu, npr. „Kralj pehara u Tiferetu“).
3) **Sledeći korak** — 2–3 praktične preporuke.
Anti-duplikat: izbegni copy–paste; ukloni rečenice koje se podudaraju sa „Prethodno tumačenje“.
Ako je podpitanje suštinski isto kao glavno, fokusiraj se na **vremenski okvir, akciju i resurse** umesto ponavljanja.
Podpitanje: ${podpitanja[0]}
`.trim();
    // END: follow-up structure & anti-dup
  }

  // Suma sumarum — uvek za duža otvaranja
  const needsSuma = ["keltski", "astrološko", "drvo"].includes(TIP);
  let sumarumPravilo = needsSuma
    ? `– Na kraju dodaj kratak odeljak **Suma sumarum** (4–5 rečenica) sa ključnim savetima i zaključcima.`
    : "";

  // START: fix terminologijaRule (avoid tagged template "is not a function")
  const terminologijaRule =
    TIP === "drvo"
      ? `– Pri pominjanju sefirota koristi transliteracije: Keter, Chokhmah, Binah, Chesed, Gevurah, Tiferet, Netzach, Hod, Yesod, Malkhut.`
      : TIP === "astrološko"
        ? `– For the layout, use the EXACT provided labels for areas/positions (do not translate them).
– For transits/natal houses, use only H# (e.g., H9) and never translate H#.`

        : "";
  // END: fix terminologijaRule (avoid tagged template "is not a function")
  // START: MAIN_DIRECTIVE (astro vs jung)
  const MAIN_DIRECTIVE =
    TIP === "jung"
      ? `
Ovo je jungovsko arhetipsko tumačenje kroz tarot karte.

Fokus: analiza, introspekcija i integracija — ne predviđanje budućnosti.
Struktura odgovora mora biti TAČNO pet numerisanih sekcija:

// START: MAIN_DIRECTIVE (jung headings localized via JUNG_LEX)
1) ${JUNG_LEX.persona} — svesni identitet koji osoba pokazuje svetu.
2) ${JUNG_LEX.shadow} — potisnuti aspekti, unutrašnji konflikt, nesvesno ponašanje.
3) ${JUNG_LEX.core} — centralni arhetip i glavna tema ličnog razvoja.
4) ${JUNG_LEX.integration} — praktičan korak ili refleksija koja vodi balansiranju Personae i Senke.
5) ${JUNG_LEX.direction} — simbolički pravac rasta (ne “šta će se desiti”, već “u kom pravcu vodi proces”).
// END: MAIN_DIRECTIVE (jung headings localized via JUNG_LEX)

U svakoj sekciji koristi ton stručnog jungovskog analitičara: reflektivan, topao i jasan.
Ne koristi fraze o budućnosti, predviđanjima, “on/ona te voli”, niti astrologiju.
Završi odgovor pozivom na samoposmatranje, bez dijagnostike ili fatalizma.
`.trim()
      : allowTransits
        ? `
Na osnovu pitanja, napiši jasno i empatično tumačenje **primarno iz karata** (po redosledu i pozicijama).
Tranzite koristi kao dopunu, ali ih **OBAVEZNO ukomponuj uz relevantne karte/pozicije** (min 2 max 4 inline napomene kroz tumačenje).
Na kraju dodaj kratak odeljak **"Transitus"** kao rezime (bez novih izmišljenih aspekata/kuća).
`.trim()
        : `
Na osnovu pitanja, napiši jasno i empatično tumačenje **primarno iz karata** (po redosledu i pozicijama).
**Ne pominji tranzite** niti dodaj odeljak "Transitus".
`.trim();
  // END: MAIN_DIRECTIVE



  // START: hard zabrana tranzita kada nisu prosleđeni
  const NO_TRANSITS_RULE = allowTransits ? "" :
    `– **Ne pominji tranzite/planete/aspekte/efemeride** i ne dodaj odeljak "Transitus", jer tranziti nisu prosleđeni za ovu vrstu otvaranja.`;
  // END: hard zabrana

  // FINAL PROMPT (mixed SR/EN where helpful)
  return `
${LANG_BANNER}
${AXIOM}
${langRuleFinal}

${NO_META}

${identitet}
${identitetFinal}
${labelsNoteText}

// START: user question block (triple-quoted, bez navodnika)
User question (answer in the APP language / TARGET_LANG):

"""
${pitanje}
"""
// END: user question block
${prethodniKontekst}

// START: JUNG-safe astro injection
${astroTekstJungSafe}${houseCheatJungSafe}
// END: JUNG-safe astro injection


${MAIN_DIRECTIVE}
${uvodPromptFinal ? uvodPromptFinal + "\n" : ""}

Tip otvaranja: ${nazivOtvaranja}.

Izvučene karte po pozicijama:

${karteOpis}
${datumOtvaranjaBlok}
${tranzitiBlock}
${podpitanjaTekst}

// START: rules-neutral-greeting-and-sign-asc-first-paragraph
Rules:
– Answer strictly based on the provided cards/positions (do not invent extra cards).
– Use the position meanings where relevant.
– Reply ONLY in TARGET_LANG (APP language): "${QLANG}".

${wordCapRule}
– Poštuj **AKSIOM** iznad svega, čak i ako nešto drugo u promptu implicira suprotno.
${JUNG_ENFORCER ? `\n${JUNG_ENFORCER}\n` : ""}
${ime
      ? `– Pozdrav/obraćanje: prva linija odgovora mora biti tačno: **"${ime},"** (bez drugih reči).`
      : `– Ako ime nije dostupno, započni neutralnim pozdravom na jeziku aplikacije (sr: "Zdravo,", en: "Hello,", de: "Hallo,", tr: "Merhaba,", es: "Hola,", fr: "Bonjour,", pt: "Olá,", id: "Halo,", hi: "नमस्ते,").`

    }
${/* START: astro output line enforce (neutral symbols, no SR leakage) */""}
${TIP === "jung"
      ? ""
      : (astroOutLine
        ? `– If Sun sign and ASC are known: RIGHT AFTER the greeting, on its own line, output EXACTLY this (copy verbatim): "${astroOutLine}". Do NOT rewrite it as a sentence and do NOT add any extra words.`
        : ""
      )
    }
${/* END: astro output line enforce (neutral symbols, no SR leakage) */""}

${/* START: output style guardrails */""}

${TIP === "astrološko"
      ? `– Since this is a 12-area spread: structure the main body as a numbered list 1–12 using the EXACT provided area labels (do not translate them). Each item 1–3 sentences; do not write an essay.`
      : ""
    }

${/* END: output style guardrails */""}


${allowTransits ? '– Ako su dati tranziti: dodaj **min. 2, max. 4** kratke inline napomene uz konkretne karte/pozicije (max 1 po oblasti).' : ''}
${allowTransits ? '– Za **layout pozicije** koristi nazive koje dobiješ u inputu (npr. “11. oblast …”). Za **tranzite/natalne kuće** koristi isključivo oznake **(H#)** ako su date (npr. H9) i **ne prevodi H#** u “X. oblast/kuća”.' : ''}
${allowTransits ? '– “Oblasti” (1–12) se odnose na **pozicije otvaranja / layout** (npr. 1. oblast, 2. oblast...). **Ne dodeljuj oblasti tranzitnim planetama** — njihove natalne kuće su već date kao (H#) u tranzit bloku.' : ''}
${allowTransits ? '– Odeljak **Transitus** je **obavezan** i **≤ 70 reči**; sažmi 2–3 najrelevantnije napomene, bez ponavljanja.' : ''}
${allowTransits ? '– Tranzite koristi ISKLJUČIVO iz prosleđenog “Transitus” bloka. Ne dodaj nove planete/aspekte. Kuće (H#) su dozvoljene ako su već date ili su konzistentno izračunate iz ASC (Whole Sign).' : ''}
${allowTransits ? '– Izuzetak: H# kuće su dozvoljene ako su već anotirane u tranzit bloku (H#) ili su konzistentno izračunate iz ASC (whole-sign).' : ''}
${allowTransits ? `\n${TRANSITS_SCOPE_RULE}\n` : ''}
${allowTransits ? '– Inline tranzit napomene rasporedi kroz tekst (nemoj sve u jednom pasusu) i uvek ih veži za konkretnu kuću/poziciju koja već ima sličnu temu.' : ''}
${allowTransits ? '– Bar **75%** teksta posveti kartama; tranziti su dopuna, ne osnova tumačenja.' : ''}
– Nazive karata piši na jeziku odgovora; ako ulaz sadrži engleske “slugove” (npr. "queenOfSwords"), prevedi ih na standardne lokalne nazive.
– Before sending, perform a **language self-check**: your answer must be in the **APP language (TARGET_LANG)**; if uncertain or you drifted, **translate the entire answer** to TARGET_LANG before sending. **Do not mix languages.**

– **AXIOM FIRST:** While writing, always prioritize the AXIOM above any other preference or hint. If a rule conflicts, follow the AXIOM.
${sumarumPravilo}
${REQUIRED_TRANSITS_MISSING}
${NO_TRANSITS_RULE}
${allowTransits ? TRANSIT_ENFORCER : ''}
${(podpitanja && podpitanja.length > 0) ? FOLLOWUP_ENFORCER : ''}
${gender === "male" ? '– Obraćaj se korisniku u muškom rodu (izbegavaj ženski rod).' : ''}
${gender === "female" ? '– Obraćaj se korisniku u ženskom rodu (izbegavaj muški rod).' : ''}
${!gender ? '– Koristi rodno neutralne formulacije (izbegavaj “pozvan/pozvana”, “spreman/spremna”). Umesto toga: “važno je da…”, “pomaže da…”, “obrati pažnju na…”.' : ''}

${TIP === "jung" ? "" : '– Potpiši se jednom kratkom linijom prevedenom na jezik odgovora (npr. EN: "Yours, Una").'}


// END: rules-neutral-greeting-and-sign-asc-first-paragraph

${CARDS_FIRST_RULE}
${terminologijaRule}

${TIP === "jung"
      ? "Piši kao profesionalni jungovski analitičar simbola — stručno, empatično i bez predikcije."
      : "Piši kao iskusan astro-tarot tumač — toplo i podržavajuće."}


End of message.

`.trim();
}

export const buildPrompt = buildAIPrompt;
export const buildSubPrompt = buildAIPrompt;

// END: EN-prompt hotfix
