// buildAIPrompt.js

import i18n from '../i18n'; // prilagodi path ako ti je drugacije

/**
 * Funkcija koja pravi prompt za AI tumača tarota
 * @param {Object} params
 * @param {string} params.ime - Ime korisnika (ili fallback)
 * @param {string} params.pitanje - Pitanje korisnika za AI
 * @param {string} [params.dodatniKontekst] - Dodatne info za AI (opciono)
 * @returns {string}
 */
export function buildAIPrompt({ ime, pitanje, dodatniKontekst }) {
  // Preuzmi trenutni jezik aplikacije (primer: 'sr', 'en', 'de', ...)
  const jezikAplikacije = i18n.language || 'sr';

  return `
Korisnik se zove ${ime || 'korisnik'}.

Odgovaraj isključivo na jeziku na kojem je postavljeno pitanje.
Ako je pitanje na ${jezikAplikacije}, odgovori na ${jezikAplikacije}.
Ako je pitanje na drugom jeziku, odgovori na tom jeziku.

${dodatniKontekst ? `Dodatne informacije: ${dodatniKontekst}` : ''}

Pitanje korisnika: "${pitanje}"

Odgovori jasno, empatično i profesionalno, kao tarot tumač.
  `.trim();
}
 
 

 // buildAIPrompt.js
export function buildAIPrompt({ ime, pitanje, dodatniKontekst }) {
  // Ako imaš ime, koristi ga personalizovano
  let pozdrav = ime
    ? `Draga ${ime},`
    : 'Poštovani korisniče,';

  // Prompt koji AI dobija (možeš proširiti kako god želiš)
  return `
${pozdrav}

${dodatniKontekst ? dodatniKontekst + '\n' : ''}
Na osnovu sledećeg pitanja korisnika, napiši detaljno, ali jasno tumačenje tarot karata. 
Koristi topao i podržavajući ton.

Pitanje korisnika: "${pitanje}"

Odgovori kao iskusni tarot tumač, na srpskom jeziku.
  `.trim();
}
