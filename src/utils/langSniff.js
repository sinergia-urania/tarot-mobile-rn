/**
 * Hindi/Devanagari “sniff” i mali post-edit helper.
 * Minimalno, bez eksternih zavisnosti.
 *
 * Upotreba:
 *   import { looksHindi, hiPostEdit } from "./langSniff";
 *
 *   if (!looksHindi(output)) {
 *     // prevesti na HI (po tvojoj logici), pa posle malčice “ispeglaj”:
 *     output = hiPostEdit(translatedOutput);
 *   }
 */

/**
 * Proverava da li tekst izgleda kao da je napisan na hindiju (Devanagari).
 * Heuristika: udeo Devanagari znakova >= minShare (podrazumevano ~14%).
 */
export function looksHindi(text, minShare = 0.14) {
    if (!text) return false;
    const devanMatches = text.match(/[\u0900-\u097F]/g) || [];
    const devanCount = devanMatches.length;
    const total = text.length || 1;
    return (devanCount / total) >= minShare;
}

/**
 * Sitne tipfelerske ispravke posle prevoda na hindi (neškodljive).
 * Dodaj/ukloni zamene po potrebi; sve su “safe” i ciljaju česta omaškavanja.
 */
export function hiPostEdit(s) {
    if (!s) return s;
    return String(s)
        // “उतर” → “उत्तर” (često ispadne bez duplog ‘t’)
        .replace(/\bउतर\b/g, "उत्तर")
        // sačuvaj originalne nove redove i whitespace
        .trim();
}
