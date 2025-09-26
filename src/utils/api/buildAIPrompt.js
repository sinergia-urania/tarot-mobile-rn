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
  "1. kuća (Ličnost)",
  "2. kuća (Finansije)",
  "3. kuća (Komunikacija)",
  "4. kuća (Dom i porodica)",
  "5. kuća (Kreativnost)",
  "6. kuća (Zdravlje)",
  "7. kuća (Partnerstva)",
  "8. kuća (Transformacija)",
  "9. kuća (Putovanja i uverenja)",
  "10. kuća (Karijera)",
  "11. kuća (Prijatelji i zajednica)",
  "12. kuća (Podsvest)"
];

// NOTE: keep spread names in EN so the whole prompt stays English (ostavljamo kako jeste)
const NAZIVI_OTVARANJA = {
  // subtipovi klasičnog
  "ljubavno": "Love spread",
  "proslost-sadasnjost-buducnost": "Past–Present–Future",
  "putspoznaje": "Path of self-knowledge",
  // glavni tipovi
  "keltski": "Celtic Cross",
  "astrološko": "Astrological spread (12 houses)",
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

// START: light-rollback — skraćujemo/isključujemo dugačke EN napomene (ne brišemo, samo komentarišemo)
// const TRANSITS_NOTE = `...`;
// const GLYPH_LEGEND = `...`;
// END: light-rollback

// START: SOFT — tranziti kao diskretna dopuna, bez fiksnog broja
const OBAVEZNO_TRANZITI = `
Ako su dati tranziti: **uklopi ih samo kad prirodno dopunjuju konkretnu kartu/poziciju/kuću**.
– Prioritet je tumačenje karata; tranziti su *kratka dopuna* (≈25% teksta max).
– Ako je poznat podznak, mapiraj znak→kuća (ASC=1) i po potrebi navedi kuću (npr. „Mars u Vagi — 12. kuća / H12“).
`.trim();
// END: SOFT

// START: SOFT — "flow" bez rigidnih kvota
const FLOW_UKLAPANJE = `
Inline stil (poželjno, ali bez forsiranja):
– cilj **2–3 kratke inline napomene u celom tekstu**, max **1 po kući**; preskoči ako ne deluje prirodno;
– piši ih u istoj rečenici gde tumačiš kartu (zagrada ili crtica), npr. „… — Mars u Vagi (11. kuća) smiruje ton“;
– **lokalizuj kuće u jeziku odgovora** (sr: „11. kuća“, en: „11th house“, it: „11ª casa / Casa 11“); **H#** koristi samo ako je nužno radi jasnoće;
– **ne započinji pasus tranzitom** i **ne piši rečenice koje su samo o tranzitu** bez reference na kartu;
–  odeljak **Transitus** neka bude kratak (≤ 70 reči) i sažme 2–3 najrelevantnije napomene (bez ponavljanja).
`.trim();
// END: SOFT

// START: light-rollback — srpska verzija „karte su primarne“
const CARDS_FIRST_RULE = `VAŽNO: Karte su primarne. Tranziti su dopuna i ne zamenjuju karte. Ako nema karata, traži novo otvaranje.`.trim();
// END: light-rollback

// SR jezičko pravilo
const langRule = `
Odgovaraj ISKLJUČIVO na jeziku na kom je postavljeno pitanje.
Ako zaista ne možeš da ga prepoznaš ili nije podržan, koristi jezik aplikacije: "{jezikAplikacije}".
Ne objašnjavaj ova pravila u odgovoru.
`.trim();

// HARD: zabrana meta/disclaimera
const NO_META = `
Ne piši meta-iskaze o tome da si AI, o jezičkim sposobnostima ili ograničenjima.
Ne koristi fraze tipa: "Kao AI model…" ili "Mogu da odgovorim samo na…".
Počni direktno sa tumačenjem, bez uvodnih odricanja.
`.trim();

// AKSIOM — pravila nad svim pravilima
const AXIOM = `
AKSIOM — poštuj pre svega:
1) Uvek odgovaraj na jeziku pitanja (izuzetak samo ako ga zaista ne prepoznaješ/podržavaš — tada koristi jezik aplikacije).
2) Bez meta/disclaimera u tekstu.
3) Karte su primarne; tranzite koristi kao kratku, prirodnu dopunu uz konkretne karte/pozicije/kuće.
   Ako je poznat ASC, mapiraj znak→kuća (ASC=1) i po potrebi navedi kuću (H#).
   Ako nema karata, ljubazno zatraži novo otvaranje (ne piši čisto astro odgovor).
`.trim();

// START: transits eligibility map (ko sme tranzite)
const TRANSIT_ELIGIBLE_TIPS = new Set(["keltski", "astrološko", "drvo"]);
// END: transits eligibility map

// START: transits required map (ova tri uvek idu sa tranzitima)
const TRANSIT_REQUIRED_TIPS = new Set(["keltski", "astrološko", "drvo"]);
// END: transits required map

// START: minimalna detekcija SR vs non-SR + LANG banner
const detectSr = (q = "") => /[čćšžđČĆŠŽĐ]|[ЉЊЂЋЏА-Яа-я]/.test(q);
// START: glyph mape za znakove (neutralni simboli za sve jezike)
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
  return r;
}
// END: normalize tip

/**
 * Build the full AI prompt, with positions/labels coming in app language.
 * Model autodetekcija jezika odgovora; fallback = jezik aplikacije.
 */
export function buildAIPrompt({
  ime,
  gender,
  pitanje,
  dodatniKontekst,
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

  // START: QLANG + LANG_BANNER
  const QLANG = jezikPitanja
    ? String(jezikPitanja).split('-')[0]   // npr. "sr-RS" → "sr"
    : (detectSr(pitanje) ? 'sr' : null);
  const LANG_BANNER = ""; // bez bannera koji “zakucava” jezik
  // END: QLANG + LANG_BANNER

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

  // Missing astro hint
  let napomenaProfil = "";

  // START: da li su tranziti dozvoljeni (TIP + realan tekst tranzita) i obavezni
  const mustHaveTransits = TRANSIT_REQUIRED_TIPS.has(TIP);
  const allowTransits = TRANSIT_ELIGIBLE_TIPS.has(TIP) && !!tranzitiTekst;
  const REQUIRED_TRANSITS_MISSING = (mustHaveTransits && !tranzitiTekst)
    ? '– Za ovo otvaranje su tranziti **obavezni**, ali nisu prosleđeni: **ne pominji tranzite/efemeride/aspekte** niti dodaj odeljak "Transitus". Radi tumačenje isključivo iz karata.'
    : '';
  // END: da li su tranziti dozvoljeni (TIP + realan tekst tranzita) i obavezni

  // START: identitet — bez pominjanja tranzita ako nisu dozvoljeni
  const identitet = `
Odgovaraš kao Una — empatična astro-tarot savetnica. Prvo tumačiš **izvučene karte**.${allowTransits ? " Ako su dati tranziti, suptilno ih uklapaš uz kontekst pitanja i pozicije." : ""}
${allowTransits ? "Ako je poznat podznak, tretiraj ga kao 1. kuću (ASC=1) i znakove tranzita mapiraj po redu Zodijaka." : "Ako je poznat podznak, tretiraj ga kao 1. kuću (ASC=1)."}
`.trim();
  // END: identitet

  // Labels note (SR/EN po QLANG)
  const labelsNoteText =
    QLANG === 'sr'
      ? "Napomena: Pozicije/kuće/sefiroti mogu biti na jeziku aplikacije — možeš ih prevesti ili zadržati neutralno numerisanje. Karte ostaju primarne."
      : "Note: Positions/houses/Sefirot labels may be in the app language — you may translate them or keep neutral numbering. Cards remain primary.";

  // START: Astro info block — uvek simbolički (neutralan za sve jezike)
  let astroInfo = '';
  const sunSign = zn && zn !== 'unknown' ? `☉ ${SIGN_GLYPHS[zn] || zn}` : null;
  const ascSign = pz && pz !== 'unknown' ? `ASC ${SIGN_GLYPHS[pz] || pz}` : null;
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
    ? '\nMapiranje znak→kuća po ASC (simbolički):\n' +
    Object.entries(ascMap).map(([s, h]) => `${s} → ${h}. kuća`).join(', ') +
    '\nOvo koristi prilikom navođenja kuća u tekstu.'
    : '';

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
  } else if (TIP === "astrološko") {
    uvodPrompt = `
TIP OTVARANJA: Astrološko (12 kuća).
Prođi svih 12 kuća; **karte su primarne**. Tranzite uklopi gde prirodno pašu.
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
  } else if (TIP === "astrološko") {
    uvodPromptEN = `
SPREAD TYPE: Astrological (12 houses).
Go through all 12 houses; **cards are primary**. Blend transits only where they fit naturally.
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
  const uvodPromptFinal =
    QLANG === 'sr' ? uvodPrompt
      : QLANG === 'en' ? uvodPromptEN
        : ""; // ne guramo uvod na “nepoznatom” jeziku
  // END: EN/SR varijante uvoda

  // Transits block (input za model; odeljak u odgovoru je dozvoljen, ali nije obavezan)
  const tranzitiBlock = allowTransits
    ? `\nTransitus:\n${tranzitiTekst}\n`
    : "";

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
    podpitanjaTekst = `
Ovo je podpitanje na osnovu prethodnog tumačenja.
Ne ponavljaj celu analizu; daj kratak, direktan odgovor i smernicu (max ${LIMITI_REC["podpitanje"]} reči).
Podpitanje: ${podpitanja[0]}
`.trim();
  }

  // Suma sumarum — uvek za duža otvaranja
  const needsSuma = ["keltski", "astrološko", "drvo"].includes(TIP);
  let sumarumPravilo = needsSuma
    ? `– Na kraju dodaj kratak odeljak **Suma sumarum** (4–5 rečenica) sa ključnim savetima i zaključcima.`
    : "";

  const terminologijaRule =
    TIP === "drvo"
      ? `– Pri pominjanju sefirota koristi transliteracije: Keter, Chokhmah, Binah, Chesed, Gevurah, Tiferet, Netzach, Hod, Yesod, Malkhut.`
      : TIP === "astrološko"
        ? `– Pri pominjanju kuća, piši u jeziku odgovora („1. kuća“ / “1st house”), bez drugog jezika u zagradama.`
        : "";

  // START: drop imeHint to avoid Serbian anchoring
  const imeHint = '';
  // END: drop imeHint to avoid Serbian anchoring

  // START: direktiva glavnog odgovora (bez tranzita ako nisu dozvoljeni)
  const MAIN_DIRECTIVE = allowTransits
    ? `Na osnovu pitanja, napiši jasno i empatično tumačenje **primarno iz karata** (po redosledu i pozicijama). Tranzite koristi samo kao dopunu tamo gde prirodno pašu.`
    : `Na osnovu pitanja, napiši jasno i empatično tumačenje **primarno iz karata** (po redosledu i pozicijama). **Ne pominji tranzite** niti dodaj odeljak "Transitus".`;
  // END: direktiva

  // START: hard zabrana tranzita kada nisu prosleđeni
  const NO_TRANSITS_RULE = allowTransits ? "" :
    `– **Ne pominji tranzite/planete/aspekte/efemeride** i ne dodaj odeljak "Transitus", jer tranziti nisu prosleđeni za ovu vrstu otvaranja.`;
  // END: hard zabrana

  // FINAL PROMPT (mixed SR/EN where helpful)
  return `
${LANG_BANNER}
${AXIOM}
${langRule}
${NO_META}

${napomenaProfil}
${identitet}

${labelsNoteText}

// START: user question block (triple-quoted, bez navodnika)
User question (answer in the same language):
"""
${pitanje}
"""
// END: user question block
${prethodniKontekst}

${astroTekst}${houseCheat}
${MAIN_DIRECTIVE}

${uvodPromptFinal ? uvodPromptFinal + "\n" : ""}

Tip otvaranja: ${nazivOtvaranja}.

Izvučene karte po pozicijama:

${karteOpis}
${datumOtvaranjaBlok}
${tranzitiBlock}
${imeHint}
${podpitanjaTekst}

// START: rules-neutral-greeting-and-sign-asc-first-paragraph
Pravila:
– Odgovaraj isključivo na osnovu navedenih karata/pozicija (ne izmišljaj dodatne karte).
– Analiziraj pozicije karata tamo gde ima smisla.
– Odgovori **na jeziku pitanja**; ako nije podržan, koristi jezik aplikacije ("${jezikAplikacije}").
${wordCapRule}
– Poštuj **AKSIOM** iznad svega, čak i ako nešto drugo u promptu implicira suprotno.
${ime
      ? `– Pozdrav/obraćanje: prva linija odgovora mora biti tačno: **"${ime},"** (bez drugih reči).`
      : `– Ako ime nije dostupno, započni **neutralnim pozdravom u jeziku pitanja** (sr: "Zdravo,", en: "Hello,", it: "Ciao,").`
    }
– Ako su poznati Sunčev znak i Podznak (ASC), **ukratko ih napiši u prvom pasusu** i veži za temu pitanja (npr. "Kao ${znak} sa ASC ${podznak}, …"). Nemoj izmišljati ako nisu poznati.
${allowTransits ? '– Ako su dati tranziti: dodaj **2–3** kratke inline napomene uz konkretne karte/pozicije (max 1 po kući); ako ne deluje prirodno – preskoči.' : ''}
${allowTransits ? '– Pri navođenju kuće koristi **lokalizovan oblik u jeziku odgovora** (sr: „11. kuća“, en: „11th house“, it: „11ª casa / Casa 11“); **H#** samo ako je nužno radi jasnoće.' : ''}
${allowTransits ? '– Odeljak **Transitus** je opcion i **≤ 70 reči**; služi kao sažetak 2–3 napomene, bez ponavljanja.' : ''}
${allowTransits ? '– Bar **75%** teksta posveti kartama; tranziti su dopuna, ne osnova tumačenja.' : ''}
– Nazive karata piši na jeziku odgovora; ako ulaz sadrži engleske “slugove” (npr. "queenOfSwords"), prevedi ih na standardne lokalne nazive.
– Before sending, perform a **language self-check**: your answer must be in the **same language as the question**; if uncertain or you drifted, **translate the entire answer** to the question's language before sending. **Do not mix languages.**
– **AXIOM FIRST:** While writing, always prioritize the AXIOM above any other preference or hint. If a rule conflicts, follow the AXIOM.
${sumarumPravilo}
${REQUIRED_TRANSITS_MISSING}
${NO_TRANSITS_RULE}
– Potpiši se jednom kratkom linijom prevedenom na jezik odgovora (npr. EN: "Yours, Una"). "Suma sumarum" ostaje doslovno.

// END: rules-neutral-greeting-and-sign-asc-first-paragraph

${CARDS_FIRST_RULE}
${terminologijaRule}

Piši kao iskusan astro-tarot tumač — toplo i podržavajuće.

Kraj poruke.
`.trim();
}

export const buildPrompt = buildAIPrompt;
export const buildSubPrompt = buildAIPrompt;

// END: EN-prompt hotfix
