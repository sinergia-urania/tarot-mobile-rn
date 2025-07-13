import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthProvider';

// --- MODALI SEKCIJA ---
const ProfilModal = ({ visible, onClose, user, dukati, status, loading, handleLogout }) => (
  <Modal visible={visible} transparent animationType="slide">
    <View style={styles.sectionModal}>
      <Text style={styles.sectionTitle}>👤 Profil</Text>
      <Text style={styles.sectionText}>Ime: {user?.user_metadata?.displayName || user?.email || "Gost"}</Text>
      {user && <Text style={styles.sectionText}>💰 Dukati: {loading ? <ActivityIndicator color="#facc15" size="small" /> : dukati}</Text>}
      <Text style={styles.sectionText}>Status: {status}</Text>
      {/* Ovde možeš dodati još info po želji */}
      <TouchableOpacity style={styles.sectionCloseBtn} onPress={onClose}>
        <Text style={[styles.text, { color: '#facc15' }]}>Zatvori</Text>
      </TouchableOpacity>
      {user && (
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={[styles.text, { color: '#f87171' }]}>Odjavi se</Text>
        </TouchableOpacity>
      )}
    </View>
  </Modal>
);



// PRAVNA DOKUMENTA – sada ima Odricanje, Uslovi, Kontakt
const PravnaModal = ({ visible, onClose, navigation }) => (
  <Modal visible={visible} transparent animationType="slide">
    <View style={styles.sectionModal}>
      <Text style={styles.sectionTitle}>📜 Pravna dokumenta</Text>
      <TouchableOpacity onPress={() => { onClose(); navigation.navigate('Odricanje'); }}>
        <Text style={styles.sectionText}>- Odricanje od odgovornosti</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => { onClose(); navigation.navigate('Uslovi'); }}>
        <Text style={styles.sectionText}>- Uslovi korišćenja</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => { onClose(); navigation.navigate('Kontakt'); }}>
        <Text style={styles.sectionText}>- Kontakt</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.sectionCloseBtn} onPress={onClose}>
        <Text style={[styles.text, { color: '#facc15' }]}>Zatvori</Text>
      </TouchableOpacity>
    </View>
  </Modal>
);

// --- KRAJ MODALA SEKCIJA ---

const SidebarMenu = ({ visible, onClose }) => {
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const [dukati, setDukati] = useState(null);
  const [status, setStatus] = useState('free');
  const [loading, setLoading] = useState(false);

  // State za aktivnu sekciju (za modal sekcije)
  const [activeSection, setActiveSection] = useState(null);

  // Resetuj sekciju kad se zatvori sidebar
  useEffect(() => {
    if (!visible) setActiveSection(null);
  }, [visible]);

  // Supabase placeholder logika (umesto Firebase)
  useEffect(() => {
    if (visible && user) {
      setLoading(true);
      setTimeout(() => {
        setDukati(0);
        setStatus('free');
        setLoading(false);
      }, 600);
    } else {
      setDukati(null);
      setStatus('free');
    }
  }, [visible, user]);

  // Logout
  const handleLogout = () => {
    setActiveSection(null);
    onClose();
    logout();
  };

  // Login
  const handleLogin = () => {
    onClose();
    navigation.navigate('Login');
  };

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

        {/* Prikaz korisničkih/gost podataka */}
        <View style={styles.userBox}>
          <Text style={styles.userName}>
            {user?.user_metadata?.displayName || user?.email || 'Gost'}

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
        {/* Kraj korisničkih/gost podataka */}

        {/* Glavne sekcije menija */}
        <TouchableOpacity style={styles.item} onPress={() => setActiveSection('profil')}>
          <Text style={styles.text}>👤 Profil</Text>
        </TouchableOpacity>
        <TouchableOpacity
         style={styles.item}
         onPress={() => {
         onClose();
         navigation.navigate('Podesavanja');
        }}
        >
         <Text style={styles.text}>⚙️ Podešavanja</Text>
        </TouchableOpacity>

         <TouchableOpacity
          style={styles.item}
           onPress={() => {
           onClose();
           navigation.navigate('OAplikaciji');
          }}
        >
        <Text style={styles.text}>📖 O aplikaciji</Text>
         </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={() => setActiveSection('podrzi')}>
          <Text style={styles.text}>🌟 Podrži aplikaciju</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.item} onPress={() => setActiveSection('pravna')}>
          <Text style={styles.text}>📜 Pravna dokumenta</Text>
        </TouchableOpacity>

        {/* Prikaz login/logout dugmeta */}
        {!user ? (
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogin}>
            <Text style={[styles.text, { color: '#4ade80' }]}>Prijavi se</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={[styles.text, { color: '#facc15' }]}>Zatvori</Text>
        </TouchableOpacity>

        {/* MODALI SEKCIJA */}
        <ProfilModal
          visible={activeSection === 'profil'}
          onClose={() => setActiveSection(null)}
          user={user}
          dukati={dukati}
          status={status}
          loading={loading}
          handleLogout={handleLogout}
        />
        
        <PodrziModal
          visible={activeSection === 'podrzi'}
          onClose={() => setActiveSection(null)}
          navigation={navigation}
        />
        <PravnaModal
          visible={activeSection === 'pravna'}
          onClose={() => setActiveSection(null)}
          navigation={navigation}
        />
      </View>
    </Modal>
  );
};

const PodrziModal = ({ visible, onClose }) => (
  <Modal visible={visible} transparent animationType="slide">
    <View style={styles.sectionModal}>
      <Text style={styles.sectionTitle}>🌟 Podrži aplikaciju</Text>
      <TouchableOpacity
        onPress={() => {
          Linking.openURL('https://play.google.com/store/apps/details?id=com.mare82.tarotmobile');
        }}
      >
        <Text style={styles.sectionText}>- Oceni nas</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={async () => {
          try {
            await Share.share({
              message: 'Probaj Tarot AI aplikaciju! https://play.google.com/store/apps/details?id=com.mare82.tarotmobile'
,
            });
          } catch (error) {}
        }}
      >
        <Text style={styles.sectionText}>- Podeli prijateljima</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.sectionCloseBtn} onPress={onClose}>
        <Text style={[styles.text, { color: '#facc15' }]}>Zatvori</Text>
      </TouchableOpacity>
    </View>
  </Modal>
);
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
  // --- Stilovi za sekcione modale ---
  sectionModal: {
    position: 'absolute',
    top: 56,
    left: 28,
    width: 240,
    minHeight: 300,
    backgroundColor: '#171717',
    borderRadius: 18,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.6,
    elevation: 12,
    alignItems: 'flex-start',
  },
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
});

export default SidebarMenu;



