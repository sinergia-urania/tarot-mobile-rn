// src/utils/getTranzitiZaPeriod.js

import tranziti2025 from '../assets/tranziti/tranziti-2025.json';
import tranziti2026 from '../assets/tranziti/tranziti-2026.json';
import tranziti2027 from '../assets/tranziti/tranziti-2027.json';
import tranziti2028 from '../assets/tranziti/tranziti-2028.json';

const TRANZITI = {
  "2025": tranziti2025,
  "2026": tranziti2026,
  "2027": tranziti2027,
  "2028": tranziti2028,
};

/**
 * BACKCOMPAT: tvoj stari helper – ostavljam ga netaknutog.
 * Vraća sve planete za SVAKI dan u zadatom intervalu (vrlo “verbozno”).
 */
export const getTranzitiZaPeriod = (datumPitanja, brojDana = 30) => {
  const rezultati = [];
  for (let i = 0; i < brojDana; i++) {
    const d = new Date(datumPitanja);
    d.setDate(d.getDate() + i);
    const isoDatum = d.toISOString().slice(0, 10);
    const godina = isoDatum.slice(0, 4);

    const sviTranziti = TRANZITI[godina] || {};
    const tranziti = sviTranziti[isoDatum];
    if (!tranziti) continue;

    const detalji = Object.entries(tranziti)
      .map(([planet, pozicija]) => `${planet} ${pozicija}`)
      .join(', ');

    rezultati.push(`${isoDatum}: ${detalji}`);
  }
  return rezultati.join('\n');
};

/* ------------------------- NOVO: ADVANCED HELPER ------------------------- */

const parsePozicija = (s = '') => {
  // Očekuje formu: "Devica 5.9°" / "Vaga 0.2°" ...
  const m = String(s).match(/^(.+?)\s+([\d.]+)°$/);
  if (!m) return null;
  const znak = m[1].trim();
  const deg = parseFloat(m[2]);
  return Number.isFinite(deg) ? { znak, deg } : null;
};

// START: GLYPH-MAPE ZA SYMBOL FORMAT
const PLANET_GLYPHS = {
  'Sunce': '☉', 'Mesec': '☽', 'Merkur': '☿', 'Venera': '♀', 'Mars': '♂',
  'Jupiter': '♃', 'Saturn': '♄', 'Uran': '♅', 'Neptun': '♆', 'Pluton': '♇',
};
const ZNAK_GLYPHS = {
  'Ovan': '♈', 'Bik': '♉', 'Blizanci': '♊', 'Rak': '♋', 'Lav': '♌',
  'Devica': '♍', 'Vaga': '♎', 'Škorpija': '♏', 'Skorpija': '♏', // fallback bez kvačice
  'Strelac': '♐', 'Jarac': '♑', 'Vodolija': '♒', 'Ribe': '♓',
};
// END: GLYPH-MAPE ZA SYMBOL FORMAT

// START: IZMENA: formatPlanet sad podržava 'format' = 'full' | 'symbol'
const formatPlanet = (dayMap, planet, round = 1, format = 'full') => {
  const raw = dayMap?.[planet];
  if (!raw) return null;
  const parsed = parsePozicija(raw);
  if (!parsed) return null;
  const { znak, deg } = parsed;
  const fixed = round > 0 ? deg.toFixed(round) : String(Math.round(deg));
  if (format === 'symbol') {
    const p = PLANET_GLYPHS[planet] || planet;
    const z = ZNAK_GLYPHS[znak] || znak;
    return `${p} ${z} ${fixed}°`;
  }
  return `${planet} ${znak} ${fixed}°`;
};
// END: IZMENA: formatPlanet

const iso = (d) => d.toISOString().slice(0, 10);

const pickDayMap = (dateISO) => {
  const y = dateISO.slice(0, 4);
  return (TRANZITI[y] || {})[dateISO] || null;
};

/**
 * Napredni, štedljiv ispis tranzita:
 * - header sa sporim planetama (Jupiter..Pluton) samo jednom (na prvom dostupnom danu)
 * - dnevni snapshot-i samo za brze planete sa korakom (dayStep)
 */
export function getTranzitiZaPeriodAdvanced(
  datumStartISO,
  {
    brojDana = 30,
    dayStep = 3,
    includeMoon = false, // ako ga želiš, dodaj 'Mesec' u fastPlanets ili podigni ovaj flag
    slowPlanets = ['Jupiter', 'Saturn', 'Uran', 'Neptun', 'Pluton'],
    fastPlanets = ['Sunce', 'Merkur', 'Venera', 'Mars'],
    roundDegreesTo = 1,
    headerLabel = 'Spore planete (baza za period):',
    // START: NOVI PARAMETAR – format
    format = 'full', // 'full' ili 'symbol'
    // END: NOVI PARAMETAR – format
  } = {}
) {
  if (!datumStartISO) return '';

  // 1) Header na PRVOM dostupnom danu u opsegu
  let headerLine = '';
  let firstAvailableISO = null;

  for (let i = 0; i < brojDana; i++) {
    const d = new Date(datumStartISO);
    d.setDate(d.getDate() + i);
    const dayISO = iso(d);
    const map = pickDayMap(dayISO);
    if (map) {
      firstAvailableISO = dayISO;
      const parts = slowPlanets
        .map((p) => formatPlanet(map, p, roundDegreesTo, format))
        .filter(Boolean);
      if (parts.length) {
        // START: IZMENA – ako nema headerLabel (''), ispiši samo liste
        headerLine = headerLabel ? `${headerLabel} ${parts.join(', ')}` : parts.join(', ');
        // END: IZMENA
      }
      break;
    }
  }

  // 2) Dnevni snapshot-i (step)
  const lines = [];
  for (let i = 0; i < brojDana; i += Math.max(1, dayStep)) {
    const d = new Date(datumStartISO);
    d.setDate(d.getDate() + i);
    const dayISO = iso(d);
    const map = pickDayMap(dayISO);
    if (!map) continue;

    // ako želiš Mesec bez dodavanja u fastPlanets listu, ovde ga možeš ubaciti
    const planetsToday = includeMoon
      ? Array.from(new Set(['Mesec', ...fastPlanets]))
      : fastPlanets;

    const todays = planetsToday
      .map((p) => formatPlanet(map, p, roundDegreesTo, format))
      .filter(Boolean);

    if (todays.length) {
      lines.push(`${dayISO}: ${todays.join(', ')}`);
    }
  }

  return [headerLine, ...lines].filter(Boolean).join('\n');
}
