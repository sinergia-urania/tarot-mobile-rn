import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { supabase } from '../utils/supabaseClient';

// START: i18n
import { useTranslation } from 'react-i18next';
// END: i18n

// START: plan normalizacija (ProPlus podrška)
import { normalizePlanCanon } from '../constants/plans';
// END: plan normalizacija (ProPlus podrška)

// Pol (gender) opcije
const GENDER_OPCIJE = [
  { label: 'Muški', value: 'male' },
  { label: 'Ženski', value: 'female' },
  { label: 'Drugo', value: 'other' }
];

const ZNAKOVI = [
  { label: '♈ Ovan', value: 'Ovan' },
  { label: '♉ Bik', value: 'Bik' },
  { label: '♊ Blizanci', value: 'Blizanci' },
  { label: '♋ Rak', value: 'Rak' },
  { label: '♌ Lav', value: 'Lav' },
  { label: '♍ Devica', value: 'Devica' },
  { label: '♎ Vaga', value: 'Vaga' },
  { label: '♏ Škorpija', value: 'Škorpija' },
  { label: '♐ Strelac', value: 'Strelac' },
  { label: '♑ Jarac', value: 'Jarac' },
  { label: '♒ Vodolija', value: 'Vodolija' },
  { label: '♓ Ribe', value: 'Ribe' },
];

const ProfilModal = ({
  visible,
  onClose,
  user,
  profile,
  dukati,
  status,
  loading,
  fetchProfile,
  logout,
}) => {
  const insets = useSafeAreaInsets();

  // START: i18n hook + helpers
  const { t, i18n } = useTranslation(['common']);
  const localeMap = {
    sr: 'sr-RS',
    en: 'en-US',
    es: 'es-ES',
    pt: 'pt-PT',
    de: 'de-DE',
    hi: 'hi-IN',
    fr: 'fr-FR',
    tr: 'tr-TR',
    id: 'id-ID',
  };
  const uiLocale = localeMap[i18n.language?.slice(0, 2)] || 'sr-RS';
  // END: i18n hook + helpers

  // Lokalni state za astropodatke
  const [datumRodjenja, setDatumRodjenja] = useState(profile?.datumrodjenja ? new Date(profile.datumrodjenja) : null);
  const [prikaziDatePicker, setPrikaziDatePicker] = useState(false);

  const [znak, setZnak] = useState(profile?.znak || null);
  const [openZnak, setOpenZnak] = useState(false);

  const [podznak, setPodznak] = useState(profile?.podznak || null);
  const [openPodznak, setOpenPodznak] = useState(false);

  // State za pol (gender)
  const [gender, setGender] = useState(profile?.gender || "male");
  const [openGender, setOpenGender] = useState(false);

  // State za ime
  const [displayName, setDisplayName] = useState(profile?.display_name || "");

  useEffect(() => {
    setDatumRodjenja(profile?.datumrodjenja ? new Date(profile.datumrodjenja) : null);
    setZnak(profile?.znak || null);
    setPodznak(profile?.podznak || null);
    setGender(profile?.gender || "male");
    setDisplayName(profile?.display_name || "");
  }, [profile]);

  // START: i18n – items za dropdown-e (ne koristimo hardkodovane konstante)
  const genderOpcijeI18n = [
    { label: t('common:profile.gender.male', { defaultValue: 'Muški' }), value: 'male' },
    { label: t('common:profile.gender.female', { defaultValue: 'Ženski' }), value: 'female' },
    { label: t('common:profile.gender.other', { defaultValue: 'Drugo' }), value: 'other' },
  ];

  const znakoviI18n = [
    { value: 'Ovan', label: t('common:astrology.signs.aries', { defaultValue: '♈ Ovan' }) },
    { value: 'Bik', label: t('common:astrology.signs.taurus', { defaultValue: '♉ Bik' }) },
    { value: 'Blizanci', label: t('common:astrology.signs.gemini', { defaultValue: '♊ Blizanci' }) },
    { value: 'Rak', label: t('common:astrology.signs.cancer', { defaultValue: '♋ Rak' }) },
    { value: 'Lav', label: t('common:astrology.signs.leo', { defaultValue: '♌ Lav' }) },
    { value: 'Devica', label: t('common:astrology.signs.virgo', { defaultValue: '♍ Devica' }) },
    { value: 'Vaga', label: t('common:astrology.signs.libra', { defaultValue: '♎ Vaga' }) },
    { value: 'Škorpija', label: t('common:astrology.signs.scorpio', { defaultValue: '♏ Škorpija' }) },
    { value: 'Strelac', label: t('common:astrology.signs.sagittarius', { defaultValue: '♐ Strelac' }) },
    { value: 'Jarac', label: t('common:astrology.signs.capricorn', { defaultValue: '♑ Jarac' }) },
    { value: 'Vodolija', label: t('common:astrology.signs.aquarius', { defaultValue: '♒ Vodolija' }) },
    { value: 'Ribe', label: t('common:astrology.signs.pisces', { defaultValue: '♓ Ribe' }) },
  ];
  // END: i18n – items za dropdown-e

  const sacuvajProfil = async () => {
    if (!displayName.trim()) {
      // START: i18n alert
      alert(t('common:errors.nameRequired', { defaultValue: 'Ime ne može biti prazno!' }));
      // END: i18n alert
      return;
    }
    const toYMD = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;

    const dataToSend = {
      display_name: displayName.trim(),
      datumrodjenja: datumRodjenja ? toYMD(datumRodjenja) : null,
      znak,
      podznak,
      gender,
    };

    const { error } = await supabase
      .from('profiles')
      .update(dataToSend)
      .eq('id', user.id);

    if (error) {
      // START: i18n alert
      alert(t('common:errors.profileSaveFailed', { defaultValue: 'Greška pri čuvanju profila.' }));
      // END: i18n alert
    } else {
      // START: i18n alert
      alert(t('common:messages.profileSaved', { defaultValue: 'Profil je sačuvan!' }));
      // END: i18n alert
      fetchProfile && fetchProfile();
    }
  };

  // Dinamički badge za status
  const statusBadge = () => {
    // START: ProPlus podrška + kanonikalizacija statusa
    const canon = normalizePlanCanon(status);
    if (canon === 'premium') {
      return (
        <Text style={styles.statusBadgePremium}>
          🟡 {t('common:membership.packages.premium', { defaultValue: 'Premium' })}
        </Text>
      );
    }
    if (canon === 'proplus') {
      return (
        <Text style={styles.statusBadgePro}>
          🔵 {t('common:membership.packages.proplus', { defaultValue: 'ProPlus' })}
        </Text>
      );
    }
    if (canon === 'pro') {
      return (
        <Text style={styles.statusBadgePro}>
          🔵 {t('common:membership.packages.pro', { defaultValue: 'Pro' })}
        </Text>
      );
    }
    return (
      <Text style={styles.statusBadgeFree}>
        ⚪ {t('common:membership.packages.free', { defaultValue: 'Free' })}
      </Text>
    );
    // END: ProPlus podrška + kanonikalizacija statusa
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* START: overlay + kartica sa max visinom i ScrollView */}
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { paddingBottom: 12 + insets.bottom }]}>
          <ScrollView
            contentContainerStyle={{ padding: 24, paddingBottom: 32 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
          >
            <Text style={styles.sectionTitle}>
              {t('common:profile.title', { defaultValue: '👤 Profil' })}
            </Text>

            {/* --- Ime korisnika (edit) --- */}
            <Text style={styles.sectionText}>
              {t('common:profile.nameLabel', { defaultValue: 'Ime:' })}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder={t('common:placeholders.enterName', { defaultValue: 'Unesi ime' })}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: "#facc15",
                  borderRadius: 8,
                  backgroundColor: "#232323",
                  color: "#fff",
                  fontSize: 16,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                }}
                placeholderTextColor="#ccc"
                autoCapitalize="words"
              />
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
              <Text style={styles.sectionText}>
                {t('common:labels.coins', { defaultValue: t('common:accessibility.coins', { defaultValue: 'Dukati' }) })}
                :{' '}
              </Text>
              {loading ? (
                <ActivityIndicator color="#facc15" size="small" />
              ) : (
                <Text style={styles.sectionText}>{dukati}</Text>
              )}
            </View>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={styles.sectionText}>
                {t('common:labels.status', { defaultValue: 'Status:' })}{' '}
              </Text>
              {statusBadge()}
            </View>

            {/* --- Pol korisnika --- */}
            <Text style={styles.sectionText}>
              {t('common:profile.gender.label', { defaultValue: 'Pol:' })}
            </Text>
            <DropDownPicker
              open={openGender}
              setOpen={setOpenGender}
              value={gender}
              setValue={setGender}
              items={genderOpcijeI18n}
              listMode="MODAL"
              placeholder={t('common:placeholders.selectGender', { defaultValue: 'Izaberi pol' })}
              style={{ marginBottom: openGender ? 60 : 8, zIndex: 4000 }}
              zIndex={4000}
              zIndexInverse={1100}
            />

            {/* --- Astropodaci unos/prikaz --- */}
            <View style={{ marginTop: 12, marginBottom: 6 }}>
              <Text style={styles.sectionText}>
                {t('common:profile.birthDate', { defaultValue: 'Datum rođenja:' })}
              </Text>
              <TouchableOpacity onPress={() => setPrikaziDatePicker(true)} style={{ marginBottom: 10 }}>
                <Text style={styles.sectionText}>
                  {datumRodjenja
                    ? datumRodjenja.toLocaleDateString(uiLocale)
                    : t('common:placeholders.pickDate', { defaultValue: 'Izaberi datum' })}
                </Text>
              </TouchableOpacity>

              {prikaziDatePicker && (
                <DateTimePickerModal
                  isVisible={prikaziDatePicker}
                  mode="date"
                  date={datumRodjenja || new Date(1990, 0, 1)}
                  maximumDate={new Date()}
                  onConfirm={(date) => {
                    setDatumRodjenja(date);
                    setPrikaziDatePicker(false);
                  }}
                  onCancel={() => setPrikaziDatePicker(false)}
                  // START: i18n – dodela locale-a pickeru
                  locale={i18n.language?.slice(0, 2) || 'sr'}
                // END: i18n – dodela locale-a pickeru
                />
              )}

              <Text style={styles.sectionText}>
                {t('common:profile.sunSign', { defaultValue: 'Znak:' })}
              </Text>
              <DropDownPicker
                open={openZnak}
                setOpen={setOpenZnak}
                value={znak}
                setValue={setZnak}
                items={znakoviI18n}
                listMode="MODAL"
                placeholder={t('common:placeholders.pickSign', { defaultValue: 'Izaberi znak' })}
                style={{ marginBottom: openZnak ? 60 : 8, zIndex: 3000 }}
                zIndex={3000}
                zIndexInverse={1000}
              />

              <Text style={styles.sectionText}>
                {t('common:profile.ascendant', { defaultValue: 'Podznak:' })}
              </Text>
              <DropDownPicker
                open={openPodznak}
                setOpen={setOpenPodznak}
                value={podznak}
                setValue={setPodznak}
                items={znakoviI18n}
                listMode="MODAL"
                placeholder={t('common:placeholders.pickAscendant', { defaultValue: 'Izaberi podznak' })}
                style={{ marginBottom: openPodznak ? 60 : 8, zIndex: 2000 }}
                zIndex={2000}
                zIndexInverse={900}
              />
            </View>

            <TouchableOpacity style={styles.sectionCloseBtn} onPress={sacuvajProfil}>
              <Text style={{ color: '#facc15' }}>
                {t('common:buttons.saveProfile', { defaultValue: 'Sačuvaj profil' })}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sectionCloseBtn} onPress={onClose}>
              <Text style={{ color: '#facc15' }}>
                {t('common:buttons.close', { defaultValue: 'Zatvori' })}
              </Text>
            </TouchableOpacity>

            {user && (
              <TouchableOpacity
                style={styles.logoutBtn}
                onPress={async () => {
                  await logout();
                  onClose();
                }}
              >
                <Text style={{ color: '#f87171' }}>
                  {t('common:buttons.logout', { defaultValue: 'Odjavi se' })}
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
      {/* END: overlay + kartica sa max visinom i ScrollView */}
    </Modal>
  );
};

const styles = StyleSheet.create({
  // START: novi layout za modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '92%',
    maxHeight: '85%',
    backgroundColor: '#171717',
    borderRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.6,
    elevation: 12,
    overflow: 'hidden',
  },
  // END: novi layout za modal
  sectionTitle: {
    color: '#facc15',
    fontSize: 21,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  sectionText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 14,
  },
  sectionCloseBtn: {
    marginTop: 16,
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#333',
  },
  logoutBtn: {
    marginTop: 14,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#311',
  },
  statusBadgeFree: {
    color: '#fff',
    backgroundColor: '#222',
    borderRadius: 8,
    paddingHorizontal: 8,
    fontSize: 14,
  },
  statusBadgePremium: {
    color: '#fff',
    backgroundColor: '#eab308',
    borderRadius: 8,
    paddingHorizontal: 8,
    fontSize: 14,
  },
  statusBadgePro: {
    color: '#fff',
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 8,
    fontSize: 14,
  },
  // Dodaj još stilova po potrebi...
});

export default ProfilModal;
