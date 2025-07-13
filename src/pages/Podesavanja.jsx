// START: Dodavanje Back dugmeta (strelica) u Podesavanja.jsx

// START: Nova podešavanja - obrnutih karata, notifikacije, jezik
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';

import { Modal, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import SoundSettings from '../components/SoundSettings';
import { useAuth } from '../context/AuthProvider'; // ili odakle već vučeš user podatke
import { updateDisplayName } from "../utils/auth"; // vidi da li je tu ili ga dodaj


// START: Dropdown modal helper
const LANGUAGES = [
  { code: 'sr', label: '🇷🇸 Srpski' },
  { code: 'en', label: '🇬🇧 English' },
  { code: 'es', label: '🇪🇸 Español' },
  { code: 'pt', label: '🇵🇹 Português' },
  { code: 'de', label: '🇩🇪 Deutsch' },
  { code: 'hi', label: '🇮🇳 हिन्दी' },
];

const Podesavanja = () => {
  const navigation = useNavigation();

  // Switch/ceker stanja, default ON
  const [reversed, setReversed] = useState(true);
  const [notifications, setNotifications] = useState(true);
    const { user, refreshUser } = useAuth(); // koristi tvoj context ili hook za user-a
    const [editing, setEditing] = useState(false);
    const [displayName, setDisplayName] = useState(user?.displayName || "");
    const [inputName, setInputName] = useState(displayName);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
     setDisplayName(user?.displayName || "");
     setInputName(user?.displayName || "");
    },   [user?.displayName]);


    const handleSave = async () => {
    if (!inputName.trim()) {
    Alert.alert("Greška", "Ime ne može biti prazno!");
    return;
    }
     setSaving(true);
    try {
    await updateDisplayName(inputName);
    setDisplayName(inputName);
    setEditing(false);
    Alert.alert("Uspeh", "Ime je ažurirano!");
    if (refreshUser) refreshUser();
     } catch (err) {
    Alert.alert("Greška", "Došlo je do greške prilikom izmene imena.");
     }
    setSaving(false);
    };

  // Jezik dropdown
  const [langModal, setLangModal] = useState(false);
  const [language, setLanguage] = useState('sr');
  const languageLabel = LANGUAGES.find(l => l.code === language)?.label || 'Jezik';

  return (
    <View style={styles.container}>
      {/* Back dugme (strelica) */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backIcon}>←</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Podešavanja</Text>
      <View style={styles.section}>
       <Text style={styles.label}>Trenutno ime:</Text>
       {user?.user_metadata?.displayName
         ? <Text style={styles.displayName}>{user.user_metadata.displayName}</Text>
         : <Text style={styles.displayNamePrazno}>Niste uneli ime</Text>
       }

       {!editing ? (
       <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
       <Text style={styles.editText}>Promeni ime</Text>
        </TouchableOpacity>
        ) : (
        <View style={styles.inputRow}>
        <TextInput
        value={inputName}
        onChangeText={setInputName}
        placeholder="Novo ime"
        style={styles.input}
        editable={!saving}
       />
         <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
           <Text style={styles.saveText}>{saving ? "..." : "Sačuvaj"}</Text>
          </TouchableOpacity>
        </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Zvuk</Text>
        <SoundSettings />

        {/* START: Switch za Obrnute karte */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleText}>Obrnute karte</Text>
          <Switch
            value={reversed}
            onValueChange={setReversed}
            thumbColor={reversed ? "#facc15" : "#333"}
            trackColor={{ false: "#444", true: "#facc15" }}
          />
        </View>
        {/* END: Switch za Obrnute karte */}

        {/* START: Switch za Notifikacije */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleText}>Notifikacije</Text>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            thumbColor={notifications ? "#facc15" : "#333"}
            trackColor={{ false: "#444", true: "#facc15" }}
          />
        </View>
        {/* END: Switch za Notifikacije */}

        {/* START: Jezik dropdown */}
        <TouchableOpacity
          style={styles.langDropdown}
          onPress={() => setLangModal(true)}
        >
          <Text style={styles.toggleText}>Jezik:</Text>
          <Text style={styles.selectedLang}>{languageLabel} ▼</Text>
        </TouchableOpacity>
        {/* END: Jezik dropdown */}

        {/* Modal za izbor jezika */}
        <Modal
          visible={langModal}
          transparent
          animationType="fade"
          onRequestClose={() => setLangModal(false)}
        >
          <View style={styles.langModalBg}>
            <View style={styles.langModalBox}>
              <Text style={styles.sectionTitle}>Izaberi jezik</Text>
              {LANGUAGES.map(lang => (
                <TouchableOpacity
                  key={lang.code}
                  style={styles.langOption}
                  onPress={() => {
                    setLanguage(lang.code);
                    setLangModal(false);
                  }}
                >
                  <Text style={styles.selectedLang}>{lang.label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={() => setLangModal(false)}>
                <Text style={[styles.selectedLang, { color: '#facc15', marginTop: 16 }]}>Zatvori</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        {/* KRAJ: Modal za izbor jezika */}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
    padding: 20,
  },
  backBtn: {
    position: 'absolute',
    top: 28,
    left: 18,
    zIndex: 2,
    padding: 6,
    borderRadius: 18,
  },
  backIcon: {
    fontSize: 26,
    color: '#facc15',
    fontWeight: 'bold',
  },
  title: {
    color: '#facc15',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    alignSelf: 'center',
    letterSpacing: 1.3,
    marginTop: 8,
  },
  section: {
    backgroundColor: '#222127',
    borderRadius: 14,
    padding: 18,
    marginBottom: 28,
    shadowColor: '#c9ad6a',
    shadowOpacity: 0.10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    color: '#fffbe7',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
    letterSpacing: 1.1,
  },
  // Stilovi za switch redove
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 10,
  },
  toggleText: {
    color: '#fff',
    fontSize: 16,
  },
  // Dropdown jezik
  langDropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    backgroundColor: '#232323',
    padding: 10,
    borderRadius: 8,
  },
  selectedLang: {
    color: '#facc15',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Modal za izbor jezika
  langModalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.56)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  langModalBox: {
    width: 250,
    backgroundColor: '#232323',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },
  langOption: {
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
    borderBottomColor: '#393939',
    borderBottomWidth: 1,
 
  },
  label: {
  color: "#facc15",
  fontSize: 16,
  fontWeight: "bold",
  marginBottom: 2,
  },
  displayName: {
  color: "#fff",
  fontSize: 18,
  marginBottom: 6,
  fontWeight: "600",
  },
  editBtn: {
  backgroundColor: "#eab308",
  borderRadius: 7,
  paddingHorizontal: 15,
  paddingVertical: 6,
  },
  editText: {
  color: "#232323",
  fontWeight: "bold",
  fontSize: 15,
  },
  inputRow: {
  flexDirection: "row",
  alignItems: "center",
  marginTop: 4,
  },
  input: {
  minWidth: 110,
  maxWidth: 180,
  backgroundColor: "#232323",
  color: "#fff",
  borderRadius: 7,
  borderWidth: 2,
  borderColor: "#facc15",  
  backgroundColor: "#5a4949ff",
  paddingVertical: 6,
  paddingHorizontal: 10,
  fontSize: 16,
  marginRight: 8,
  },
  saveBtn: {
  backgroundColor: "#facc15",
  borderRadius: 7,
  paddingHorizontal: 10,
  paddingVertical: 6,
  },
  saveText: {
  color: "#232323",
  fontWeight: "bold",
  fontSize: 15,
 },
 displayNamePrazno: {
  color: "#aaa",
  fontSize: 18,
  marginBottom: 6,
  fontWeight: "600",
 },


});

export default Podesavanja;
// END: Nova podešavanja - obrnutih karata, notifikacije, jezik
