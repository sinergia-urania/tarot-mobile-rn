import { useFocusEffect, useRoute } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import IzborKarataModal from '../components/IzborKarataModal';
import { allCardKeys } from '../utils/allCardKeys';


// START: State i efekt za sveže mešanje karata prilikom svakog otvaranja stranice
const IzborKarata = () => {
  const route = useRoute();
  const { pitanje, tip, subtip, layoutTemplate } = route.params || {};
  const [shuffleId, setShuffleId] = useState(Date.now());

  useFocusEffect(
    useCallback(() => {
      setShuffleId(Date.now());
    }, [tip, pitanje])
  );

  return (
    <View style={styles.container}>
      <IzborKarataModal
        visible={true}
        layoutTemplate={layoutTemplate}      // <-- KLJUČNO: prosleđuješ šta ti je stiglo kroz params!
        pitanje={pitanje}
        tip={tip}
        subtip={subtip}
        allCardKeys={allCardKeys}
        shuffleId={shuffleId}
        onClose={() => {}}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
});

export default IzborKarata;