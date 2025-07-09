import { useNavigation } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthProvider';
import { db } from '../utils/firebase';

const SidebarMenu = ({ visible, onClose }) => {
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const [dukati, setDukati] = useState(null);
  const [status, setStatus] = useState('free');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && user) {
      setLoading(true);
      const docRef = doc(db, 'users', user.uid);
      getDoc(docRef)
        .then(docSnap => {
          if (docSnap.exists()) {
            setDukati(docSnap.data().dukati ?? 0);
            setStatus(docSnap.data().status ?? 'free');
          }
        })
        .finally(() => setLoading(false));
    } else {
      setDukati(null);
      setStatus('free');
    }
  }, [visible, user]);

  // START: Guard za pristup profilu
  const handleProfil = () => {
    if (!user) {
      Alert.alert(
        "Pristup profilu",
        "Da biste videli svoj profil, potrebno je da se prijavite.",
        [
          { text: "Otkaži", style: "cancel" },
          { text: "Prijavi se", onPress: () => navigation.navigate('Login') }
        ]
      );
      onClose();
      return;
    }
    onClose();
    navigation.navigate('Profil');
  };
  // END: Guard za pristup profilu

  // START: Login/Logout logika
  const handleLogout = () => {
    onClose();
    logout();
  };

  const handleLogin = () => {
    onClose();
    navigation.navigate('Login');
  };
  // END: Login/Logout logika

  // Badge za status
  const renderStatusBadge = () => {
    if (!user) return <Text style={styles.statusBadgeGuest}>🟢 Gost</Text>;
    if (status === 'premium') return <Text style={styles.statusBadgePremium}>🟡 Premium</Text>;
    if (status === 'pro') return <Text style={styles.statusBadgePro}>🔵 Pro</Text>;
    return <Text style={styles.statusBadgeFree}>⚪ Free</Text>;
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1} />
      <View style={styles.menu}>

        {/* START: Prikaz korisničkih/gost podataka */}
        <View style={styles.userBox}>
          <Text style={styles.userName}>
            {user?.displayName || user?.email || 'Gost'}
          </Text>
          {user && (
            <Text style={styles.dukati}>
              💰 Dukati: {loading ? <ActivityIndicator color="#facc15" size="small" /> : dukati}
            </Text>
          )}
          <View style={styles.statusBox}>{renderStatusBadge()}</View>
          {!user && (
            <Text style={{ color: "#aaa", marginTop: 5, fontSize: 14 }}>
              Niste prijavljeni. <Text style={{ color: "#facc15" }}>Prijavite se</Text> da biste koristili AI funkcije i skupljali dukate!
            </Text>
          )}
        </View>
        {/* END: Prikaz korisničkih/gost podataka */}

        {/* Meni stavke */}
        <TouchableOpacity style={styles.item} onPress={handleProfil}>
          <Text style={styles.text}>👤 Profil</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.item} onPress={() => { onClose(); navigation.navigate('Podesavanja'); }}>
          <Text style={styles.text}>⚙️ Podešavanja</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.item} onPress={() => { onClose(); navigation.navigate('Faq'); }}>
          <Text style={styles.text}>❓ FAQ</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.item} onPress={() => {
          onClose();
          Linking.openURL('https://play.google.com/store/apps/details?id=tvoja.aplikacija.id');
        }}>
          <Text style={styles.text}>⭐ Oceni aplikaciju</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.item} onPress={() => { onClose(); navigation.navigate('Podeli'); }}>
          <Text style={styles.text}>📤 Podeli</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.item} onPress={() => { onClose(); navigation.navigate('Privatnost'); }}>
          <Text style={styles.text}>📜 Privatnost</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.item} onPress={() => { onClose(); navigation.navigate('Odricanje'); }}>
          <Text style={styles.text}>⚠️ Odricanje</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.item} onPress={() => { onClose(); navigation.navigate('Uslovi'); }}>
          <Text style={styles.text}>📑 Uslovi korišćenja</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.item} onPress={() => { onClose(); navigation.navigate('OAplikaciji'); }}>
          <Text style={styles.text}>💡 O aplikaciji</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.item} onPress={() => { onClose(); navigation.navigate('Kontakt'); }}>
          <Text style={styles.text}>✉️ Kontakt</Text>
        </TouchableOpacity>

        {/* Prikaz login/logout dugmeta u zavisnosti od user-a */}
        {!user ? (
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogin}>
            <Text style={[styles.text, { color: '#4ade80' }]}>Prijavi se</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={[styles.text, { color: '#f87171' }]}>Odjavi se</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={[styles.text, { color: '#facc15' }]}>Zatvori</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  menu: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 260,
    height: '100%',
    backgroundColor: 'black',
    paddingVertical: 36,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOpacity: 0.8,
    elevation: 8,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  userBox: {
    marginBottom: 24,
    alignItems: 'flex-start',
    borderBottomColor: '#232323',
    borderBottomWidth: 1,
    paddingBottom: 16,
  },
  userName: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 2,
  },
  dukati: {
    color: '#facc15',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
  },
  statusBox: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
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
  statusBadgeGuest: {
    color: '#fff',
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingHorizontal: 8,
    fontSize: 14,
  },
  item: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#232323',
  },
  text: {
    color: '#fff',
    fontSize: 17,
  },
  logoutBtn: {
    marginTop: 28,
    alignItems: 'center',
  },
  closeBtn: {
    marginTop: 8,
    alignItems: 'center',
  },
});

export default SidebarMenu;
