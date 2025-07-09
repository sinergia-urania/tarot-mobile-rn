// START: Migracija getLayoutByTip za React Native
import {
  ASTROLOSKO,
  DVE_KARTE,
  JEDNA_KARTA,
  KABALISTICKO,
  KELTSKI_KRST,
  LJUBAVNO_OTVARANJE,
  PET_KARATA,
  TRI_KARTE,
} from "../data/layoutTemplates";

/**
 * Vraća layout za dati tip otvaranja
 * Svaki layout je niz objekata (jedan placeholder = jedan objekat)
 * Na mobilnom je bitan samo broj placeholdera!
 */
const getLayoutByTip = (tip) => {
  switch (tip) {
    case "jedna":
    case "karta-dana":
    case "da-ne":
    case "dane":
      return JEDNA_KARTA.layout;
    case "ljubavno":
      return LJUBAVNO_OTVARANJE.layout;
    case "dve":
      return DVE_KARTE.layout;
    case "tri":
      return TRI_KARTE.layout;
    case "pet":
      return PET_KARATA.layout;
    case "keltski":
      return KELTSKI_KRST.layout;
    case "astrološko":
      return ASTROLOSKO.layout;
    case "drvo":
      return KABALISTICKO.layout;
    default:
      return [];
  }
};

export default getLayoutByTip;
// END: Migracija getLayoutByTip za React Native
