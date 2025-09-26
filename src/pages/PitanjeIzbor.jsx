import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useRef, useState } from "react";
// START: i18n hook (common + questions)
import { useTranslation } from 'react-i18next'; // 👈 NOVO
// END: i18n hook (common + questions)
// START: Modal import za OblastModal
import { InteractionManager, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
// END: Modal import za OblastModal
// START: lokalni klik SFX (expo-audio) samo za ovaj ekran
import { createAudioPlayer } from 'expo-audio';
const _clickSound = require('../assets/sounds/hover-click.mp3');
let _player = null;
const playClickOnceLocal = async () => {
  try {
    if (!_player) {
      _player = createAudioPlayer(_clickSound);
      _player.loop = false;
      _player.volume = 1;
    }
    await _player.seekTo(0);
    _player.play();
  } catch { }
};
// END: lokalni klik SFX (expo-audio) samo za ovaj ekran
import TarotHeader from "../components/TarotHeader";

// START: ✅ NOVO – import za guardovani baner i userPlan
import { useDukati } from "../context/DukatiContext";
import { AdBannerIfEligible } from "../utils/ads";
// END: ✅ NOVO – import za guardovani baner i userPlan

// START: Implementacija OblastModal (umesto stuba)
function OblastModal({ oblast, visible, onClose, onSelect }) {
  const { t } = useTranslation(['common']);
  if (!oblast) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>
            <Text style={styles.ikona}>{oblast.ikonica}</Text> {oblast.naziv} <Text style={styles.ikona}>{oblast.ikonica}</Text>
          </Text>

          {(oblast.pitanja || []).map((p, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.questionBtn}
              // START: klik SFX na izbor pitanja
              onPress={async () => { await playClickOnceLocal(); onSelect?.(p); }}
              // END: klik SFX na izbor pitanja
              activeOpacity={0.9}
            >
              <Text style={styles.questionText}>{p}</Text>
            </TouchableOpacity>
          ))}

          {/* START: klik SFX na Zatvori */}
          <TouchableOpacity style={styles.closeBtn} onPress={async () => { await playClickOnceLocal(); onClose?.(); }}>
            <Text style={{ color: '#facc15', fontWeight: 'bold' }}>
              {t('common:buttons.close', { defaultValue: 'Zatvori' })}
            </Text>
          </TouchableOpacity>
          {/* END: klik SFX na Zatvori */}
        </View>
      </View>
    </Modal>
  );
}
// END: Implementacija OblastModal (umesto stuba)

export default function PitanjeIzbor() {
  const navigation = useNavigation();
  const route = useRoute();
  const { layoutTemplate, tip, subtip } = route.params || {};
  const { t } = useTranslation();

  const [pitanje, setPitanje] = useState("");
  const [openModal, setOpenModal] = useState(null);

  const pressLockRef = useRef(false);
  // START: handleNastavi sa opcionim isključenjem zvuka (da izbegnemo dupli klik)
  const handleNastavi = async (suppressSound = false) => {
    const q = pitanje.trim();
    if (!q) return;
    if (pressLockRef.current) return;
    pressLockRef.current = true;
    if (!suppressSound) { await playClickOnceLocal(); }
    InteractionManager.runAfterInteractions(() => {
      navigation.navigate("IzborKarata", {
        layoutTemplate,
        pitanje: q,
        tip,
        tipOtvaranja: subtip,
        subtip,
      });
      setTimeout(() => (pressLockRef.current = false), 300);
    });
  };
  // END: handleNastavi sa opcionim isključenjem zvuka (da izbegnemo dupli klik)

  // 👇 Učitaj kategorije iz i18n
  const categoriesObj = t('categories', { ns: 'questions', returnObjects: true }) || {};
  const categories = Object.entries(categoriesObj).map(([key, v]) => ({
    key,
    naziv: v.name,
    ikonica: v.icon,
    pitanja: v.items || [],
  }));

  // Filter za "ljubavno" — prikaži samo ljubavnu kategoriju
  const prikazOblasti =
    subtip === "ljubavno"
      ? categories.filter((o) => o.key === "love")
      : categories;

  // START: ✅ NOVO – pribavi userPlan + mapiraj na session/profile za guard
  const { userPlan } = useDukati(); // 'guest' | 'gost' | 'free' | 'premium' | 'pro'
  const isGuest = userPlan === 'guest' || userPlan === 'gost';
  const sessionLike = isGuest ? null : { uid: 'local-session' };
  const profileLike = { subscription_tier: userPlan };
  // END: ✅ NOVO – pribavi userPlan + mapiraj na session/profile za guard

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <TarotHeader
        showBack={true}
        onBack={() => navigation.goBack()}
        showHome={true}
        onHome={() => navigation.navigate("Home")}
        showMenu={false}
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.container}>
          {/* START: intro poruka iz i18n (poseban ključ za ovaj ekran) */}
          <Text style={styles.infoMsg}>
            {t('common:questions.introBlurb', {
              defaultValue: 'Izaberi neku od tema i primera pitanja ili postavi svoje pitanje AI tumaču.'
            })}
          </Text>
          {/* END: intro poruka iz i18n */}

          <View style={styles.oblastiCol}>
            {prikazOblasti.map((oblast, idx) => (
              <View key={oblast.key} style={{ width: "100%" }}>
                <TouchableOpacity
                  style={styles.oblastBtn}
                  // START: klik SFX na otvaranje modala oblasti
                  onPress={async () => { await playClickOnceLocal(); setOpenModal(idx); }}
                  // END: klik SFX na otvaranje modala oblasti
                  activeOpacity={0.87}
                >
                  <Text style={styles.oblastText}>
                    <Text style={styles.ikona}>{oblast.ikonica}</Text> {oblast.naziv} <Text style={styles.ikona}>{oblast.ikonica}</Text>
                  </Text>
                </TouchableOpacity>

                <OblastModal
                  oblast={oblast}
                  visible={openModal === idx}
                  onClose={() => setOpenModal(null)}
                  onSelect={(p) => {
                    setPitanje(p);
                    // START: zatvori modal pre navigacije
                    setOpenModal(null);
                    // END: zatvori modal pre navigacije
                    // START: izbegni dupli zvuk — modal klik već svira
                    setTimeout(() => handleNastavi(true), 200);
                    // END: izbegni dupli zvuk — modal klik već svira
                  }}
                />
              </View>
            ))}
          </View>

          <Text style={styles.subTitle}>{t('labels.orTypeYourQuestion', { defaultValue: 'Ili unesi svoje pitanje' })}</Text>
          <TextInput
            value={pitanje}
            onChangeText={setPitanje}
            placeholder={t('placeholders.enterQuestion', { defaultValue: 'Unesi pitanje' })}
            placeholderTextColor="#aaa"
            style={styles.input}
          />
          {/* START: Aktiviraj dugme samo na osnovu unetog pitanja */}
          <TouchableOpacity
            style={[styles.nastaviBtn, !pitanje.trim() && { opacity: 0.6 }]}
            onPress={() => handleNastavi(false)}
            disabled={!pitanje.trim()}
          >
            <Text style={styles.nastaviText}>{t('labels.chooseCards', { defaultValue: 'Izbor karata' })}</Text>
          </TouchableOpacity>
          {/* END: Aktiviraj dugme samo na osnovu unetog pitanja */}

          {/* START: ✅ NOVO – nenametljiv banner ispod dugmeta (skriva se premium/pro) */}
          <View style={styles.inlineBanner}>
            <AdBannerIfEligible session={sessionLike} profile={profileLike} />
          </View>
          {/* END: ✅ NOVO – nenametljiv banner ispod dugmeta */}
        </View>
      </ScrollView>
    </View>
  );
}

// ... styles ostaju tvoji ...

const styles = StyleSheet.create({
  stickyHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "#000",
    borderBottomWidth: 1,
    borderBottomColor: "#ffd700",
  },
  container: {
    maxWidth: 400,
    width: "100%",
    alignSelf: "center",
    padding: 20,
    paddingTop: 8,
  },
  infoMsg: {
    color: "#ffd700",
    backgroundColor: "#19191e",
    fontSize: 17,
    fontWeight: "bold",
    padding: 12,
    marginBottom: 18,
    borderRadius: 10,
    textAlign: "center",
  },
  oblastiCol: {
    flexDirection: "column",
    gap: 12,
    alignItems: "center",
    marginBottom: 28,
  },
  oblastBtn: {
    backgroundColor: "#111a",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ffd700",
    paddingVertical: 14,
    marginBottom: 10,
  },
  oblastText: {
    fontSize: 18,
    color: "#ffd700",
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 1,
  },
  ikona: { fontSize: 20, color: "#ffd700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#1c1c28",
    borderRadius: 14,
    padding: 22,
    width: 320,
    maxWidth: "90%",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 19,
    color: "#ffd700",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
  },
  questionBtn: {
    backgroundColor: "#282842",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 6,
    width: 250,
    alignItems: "center",
  },
  questionText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },
  closeBtn: {
    alignSelf: "center",
    marginTop: 8,
  },
  subTitle: {
    fontSize: 16,
    color: "#fff",
    marginBottom: 8,
    textAlign: "center",
    marginTop: 24,
    fontWeight: "bold",
  },
  input: {
    backgroundColor: "#1a1a1a",
    borderRadius: 9,
    color: "#ffd700",
    borderWidth: 1,
    borderColor: "#ffd700",
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 16,
    marginBottom: 18,
    width: "100%",
    alignSelf: "center",
  },
  nastaviBtn: {
    backgroundColor: "#ffd700",
    borderRadius: 9,
    paddingVertical: 13,
    alignItems: "center",
    marginBottom: 18,
  },
  nastaviText: {
    color: "#222",
    fontWeight: "bold",
    fontSize: 17,
  },
  // START: ✅ NOVO – stil za inline banner (mala margina, centriran)
  inlineBanner: {
    marginTop: 8,
    alignItems: 'center',
  },
  // END: ✅ NOVO – stil za inline banner
});
