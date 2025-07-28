/// START: ProfilScreen sa polling logikom za profil iz Supabase

import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthProvider';
import { useDukati } from '../context/DukatiContext';

const COINS_FOR_PREMIUM = 5000;

const ProfilScreen = ({ navigation }) => {
  // START: Preuzimanje iz context-a, više nema lokalnog profila
  const { user, logout, profile, fetchProfile } = useAuth();
  const { userPlan, fetchDukatiSaServera } = useDukati();

  // END: Preuzimanje iz context-a

  const [loading, setLoading] = useState(true);
  const [loadingLogout, setLoadingLogout] = useState(false);

  // START: useFocusEffect refresha profil iz context-a
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      let cancelled = false;
      fetchProfile().finally(() => {
        if (!cancelled) setLoading(false);
      });
      return () => { cancelled = true; };
    }, [user])
  );
  // END: useFocusEffect refresha profil iz context-a

  // Prikaz datuma
  function formatJoinDate(dateStr) {
    try {
      const d = new Date(dateStr);
      return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
    } catch {
      return '-';
    }
  }

  // Progress do Premium
  const coins = (profile?.coins !== undefined && profile?.coins !== null) ? profile.coins : 150;
  const status = userPlan ?? profile?.package ?? 'free';

  const joined = profile?.created_at || '-';
  const coinsToPremium = Math.max(COINS_FOR_PREMIUM - coins, 0);
  const progressPercent = Math.min(Math.round((coins / COINS_FOR_PREMIUM) * 100), 100);

  // Logout handler
  const handleLogout = async () => {
    setLoadingLogout(true);
    await logout();
    setLoadingLogout(false);
  };

  // (Stub) za promenu lozinke
  const handleChangePassword = () => {
    alert('Ova funkcija šalje email za promenu lozinke.');
  };

  // (Stub) za gledanje reklame/otključavanje
  const handleWatchAd = () => {
    if (navigation?.navigate) {
      navigation.navigate('AdRewardModal');
    } else {
      alert('Ova funkcionalnost otvara AdRewardModal!');
    }
  };

  // Prikaz avatara ili inicijala
  const renderAvatar = () => {
    if (user?.photoURL) {
      return (
        <Image source={{ uri: user.photoURL }} style={styles.avatarImg} />
      );
    }
    return (
      <View style={styles.avatarFallback}>
        <Text style={styles.avatarInitial}>{profile?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'K'}</Text>
      </View>
    );
  };

  // START: Guard/fallback logika za prikaz
  if (loading) return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <ActivityIndicator color="#a21caf" size="large" />
        <Text style={{ color: "#666", marginTop: 30, textAlign: "center" }}>
          Pripremamo vaš profil... Molimo sačekajte trenutak.
        </Text>
      </View>
    </View>
  );

  if (!user?.id) return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <Text style={{ color: "#666", marginTop: 30, textAlign: "center" }}>
          Niste prijavljeni.
        </Text>
      </View>
    </View>
  );

  if (!profile) return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <Text style={{ color: "#b91c1c", marginVertical: 16 }}>
          Nema profila za ovog korisnika. Prijavite se istim načinom kao i prvi put!
        </Text>
        {/* Dugme za ručno pokušaj ponovo */}
        <TouchableOpacity style={styles.changePassBtn} onPress={() => {
          setLoading(true);
          fetchProfile().finally(() => setLoading(false));
        }}>
          <Text style={styles.changePassBtnText}>Pokušaj ponovo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  // END: Guard/fallback logika za prikaz

  // Prikaz kada sve postoji
  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
          {renderAvatar()}
          <Text style={styles.title}>Tvoj profil</Text>
        </View>
        <Text style={styles.label}>Ime:</Text>
        <Text style={styles.value}>{profile?.username || user?.email || 'Korisnik'}</Text>
        <Text style={styles.label}>Email:</Text>
        <Text style={styles.value}>{user?.email || '-'}</Text>
        <Text style={styles.label}>Član od:</Text>
        <Text style={styles.value}>{formatJoinDate(joined)}</Text>
        <Text style={styles.label}>Nivo naloga:</Text>
        <Text style={[styles.value, statusStyle(status)]}>
          {status === 'premium'
            ? 'Premium'
            : status === 'pro'
              ? 'Pro'
              : 'Free'}
        </Text>
        <View style={styles.coinsBox}>
          <Text style={styles.label}>Dukati:</Text>
          <Text style={styles.coins}>💰 {coins}</Text>
        </View>
        {/* Progress bar ka Premiumu */}
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
        </View>
        <Text style={styles.progressText}>
          Još <Text style={{ fontWeight: 'bold' }}>{coinsToPremium}</Text> dukata do Premium naloga!
        </Text>

        
        {/* Dugme za osvežavanje profila */}
        <TouchableOpacity style={styles.changePassBtn} onPress={() => {
         setLoading(true);
        fetchDukatiSaServera().finally(() => setLoading(false));
        }}>
       <Text style={styles.changePassBtnText}>Osveži status paketa</Text>
       </TouchableOpacity>


        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <TouchableOpacity style={styles.changePassBtn} onPress={handleChangePassword}>
            <Text style={styles.changePassBtnText}>Promeni lozinku</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} disabled={loadingLogout}>
            <Text style={styles.logoutBtnText}>
              {loadingLogout ? 'Odjava...' : 'Odjavi se'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// Dinamički stil za status badge
function statusStyle(status) {
  if (status === 'premium') return { color: '#eab308' };
  if (status === 'pro') return { color: '#2563eb' };
  return { color: '#9ca3af' };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(16,12,36,0.97)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  container: {
    width: '100%',
    maxWidth: 370,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 11,
  },
  avatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#c4b5fd',
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#c4b5fd',
  },
  avatarInitial: {
    color: '#6d28d9',
    fontSize: 26,
    fontWeight: 'bold',
  },
  title: {
    fontWeight: 'bold',
    fontSize: 24,
    color: '#2e1065',
  },
  label: {
    marginTop: 7,
    color: '#555',
    fontSize: 15,
    fontWeight: 'bold',
  },
  value: {
    color: '#222',
    fontSize: 16,
    marginBottom: 2,
  },
  coinsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 5,
    gap: 7,
  },
  coins: {
    color: '#eab308',
    fontWeight: 'bold',
    fontSize: 18,
    marginLeft: 4,
  },
  progressBarBg: {
    width: '100%',
    backgroundColor: '#eee',
    borderRadius: 7,
    height: 11,
    marginTop: 7,
  },
  progressBar: {
    backgroundColor: '#facc15',
    borderRadius: 7,
    height: 11,
  },
  progressText: {
    color: '#666',
    fontSize: 12,
    marginTop: 3,
    marginBottom: 10,
  },
  adBtn: {
    marginTop: 14,
    backgroundColor: '#fef9c3',
    paddingVertical: 11,
    borderRadius: 9,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fde047',
  },
  adBtnText: {
    color: '#b45309',
    fontWeight: 'bold',
    fontSize: 16,
  },
  changePassBtn: {
    flex: 1,
    backgroundColor: '#e0e7ff',
    paddingVertical: 11,
    borderRadius: 9,
    alignItems: 'center',
    marginRight: 4,
  },
  changePassBtnText: {
    color: '#3730a3',
    fontWeight: 'bold',
    fontSize: 15,
  },
  logoutBtn: {
    flex: 1,
    backgroundColor: '#fee2e2',
    paddingVertical: 11,
    borderRadius: 9,
    alignItems: 'center',
    marginLeft: 4,
  },
  logoutBtnText: {
    color: '#b91c1c',
    fontWeight: 'bold',
    fontSize: 15,
  },
});

export default ProfilScreen;

// END: ProfilScreen sa polling logikom za profil iz Supabase
