import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthProvider';
import MembershipModal from "../pages/MembershipModal";


// START: DukatiContext centralizovan import
import { useDukati } from '../context/DukatiContext';
// END

// --- MODALI SEKCIJA ---
const ProfilModal = ({ visible, onClose, user, dukati, status, loading, handleLogout }) => (
  <Modal visible={visible} transparent animationType="slide">
    <View style={styles.sectionModal}>
      <Text style={styles.sectionTitle}>👤 Profil</Text>
      <Text style={styles.sectionText}>Ime: {user?.user_metadata?.displayName || user?.email || "Gost"}</Text>
      {user && <Text style={styles.sectionText}>💰 Dukati: {loading ? <ActivityIndicator color="#facc15" size="small" /> : dukati}</Text>}
      <Text style={styles.sectionText}>Status: {status}</Text>
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

  

  // START: Loading sada dolazi iz DukatiContext-a
  const { setDukati: setGlobalDukati, loading, dukati: contextDukati,userPlan } = useDukati();
  // END

  // State za aktivnu sekciju (za modal sekcije)
  const [activeSection, setActiveSection] = useState(null);
  const [showMembershipModal, setShowMembershipModal] = useState(false);

  // Resetuj sekciju kad se zatvori sidebar
  useEffect(() => {
    if (!visible) setActiveSection(null);
  }, [visible]);

  
  // Logout
  const handleLogout = async () => {
    setActiveSection(null);
    onClose();
    await logout();
    
    setGlobalDukati(0); // Resetuj i globalni context pri odjavi
    
  };

  // Login
  const handleLogin = () => {
    onClose();
    navigation.navigate('Login');
  };

  // Badge za status
  const renderStatusBadge = () => {
    if (!user) return <Text style={styles.statusBadgeGuest}>🟢 Gost</Text>;
    if (userPlan === 'premium') return <Text style={styles.statusBadgePremium}>🟡 Premium</Text>;
    if (userPlan === 'pro') return <Text style={styles.statusBadgePro}>🔵 Pro</Text>;
    return <Text style={styles.statusBadgeFree}>⚪ Free</Text>;

  };

  //Guard prikaz za loading/gosta
  const renderUserBox = () => {
    if (loading && user) { // loading prikaz samo za registrovanog korisnika
      return (
        <View style={styles.userBox}>
          <ActivityIndicator color="#facc15" size="small" style={{ marginVertical: 6 }} />
        </View>
      );
    }
    if (!user) { // gost
      return (
        <View style={styles.userBox}>
          <Text style={styles.userName}>Gost</Text>
          <View style={styles.statusBox}>{renderStatusBadge()}</View>
          <Text style={{ color: "#aaa", marginTop: 5, fontSize: 14 }}>
            Niste prijavljeni. <Text style={{ color: "#facc15" }}>Prijavite se</Text> da biste koristili AI funkcije i skupljali dukate!
          </Text>
        </View>
      );
    }
    // registrovan korisnik, sve ok
    return (
      <View style={styles.userBox}>
        <Text style={styles.userName}>
          {user?.user_metadata?.displayName || user?.email || 'Gost'}
        </Text>
        <Text style={styles.dukati}>
          {/* Prikaz dukata koristi contextDukati kao fallback */}
          💰 Dukati: {contextDukati ?? '-'}

        </Text>
        <View style={styles.statusBox}>{renderStatusBadge()}</View>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1} />
      <View style={styles.menu}>
        {renderUserBox()}

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
        <TouchableOpacity
        style={styles.item}
        onPress={() => setShowMembershipModal(true)}
       >
        <Text style={[styles.text, { color: "#ffd700", fontWeight: "bold" }]}>
         💎 Pristup i paketi
        </Text>
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
        dukati={contextDukati ?? '-'}
        status={userPlan ?? 'free'}
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
        <MembershipModal
       visible={showMembershipModal}
        onClose={() => setShowMembershipModal(false)}
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
            });
          } catch (error) { }
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
