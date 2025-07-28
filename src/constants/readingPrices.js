// src/constants/readingPrices.js

// START: naplata po subtipu (AI logika)
// Ovde se sada cene vezuju samo za subtip, a ne za tip otvaranja!
// Primer: "ljubavno", "tri", "pet"...
export const READING_PRICES = {
  ljubavno: 70,   // 2 karte (ljubavno otvaranje)
  tri: 80,        // 3 karte (prošlost-sadašnjost-budućnost)
  pet: 100,        // 5 karata (put spoznaje)
  keltski: 150,        
  astrološko: 170,    
  drvo: 200,               

};
// END: naplata po subtipu (AI logika)

// Ako ti treba tekstualni prikaz za korisnika:
export const READING_LABELS = {
  ljubavno: "Ljubavno otvaranje (2 karte)",
  tri: "3 karte (Prošlost – Sadašnjost – Budućnost)",
  pet: "5 karata (Put spoznaje)",
  // ...dodaj dalje po potrebi
};
