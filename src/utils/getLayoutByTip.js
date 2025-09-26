// START: Migracija getLayoutByTip za React Native
import {
  ASTROLOSKO,
  DVE_KARTE,
  KABALISTICKO,
  KELTSKI_KRST,
  PET_KARATA,
  TRI_KARTE
} from "../data/layoutTemplates";

/**
 * Vraća layout za dati tip otvaranja
 * Svaki layout je niz objekata (jedan placeholder = jedan objekat)
 * Na mobilnom je bitan samo broj placeholdera!
 */
const getLayoutByTip = (tip, subtip) => {
  if (tip === "klasicno") {
    switch (subtip) {
      case "ljubavno":
        return DVE_KARTE.layout;
      case "tri":
        return TRI_KARTE.layout;
      case "pet":
        return PET_KARATA.layout;
      default:
        return DVE_KARTE.layout; // fallback (ili prazno)
     }
  }
  switch (tip) {
    
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


