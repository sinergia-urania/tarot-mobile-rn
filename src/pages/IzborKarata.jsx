import { useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import IzborKarataModal from '../components/IzborKarataModal';
import { allCardKeys } from '../utils/allCardKeys';
import getLayoutByTip from '../utils/getLayoutByTip';
const IzborKarata = () => {
  const route = useRoute();
  const { pitanje, tip } = route.params || {};

  const [layoutTemplate, setLayoutTemplate] = useState([]);

  useEffect(() => {
    if (tip) {
      const layout = getLayoutByTip(tip);
      setLayoutTemplate(layout.length > 0 ? layout : [{}]);
      
    }
  }, [tip]);

  return (
    <View style={styles.container}>
      <IzborKarataModal
        visible={true}
        layoutTemplate={layoutTemplate}
        pitanje={pitanje}
        tip={tip}
        allCardKeys={allCardKeys}
        onClose={() => {}}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#18181b', // prilagodi po želji ili stavi svoju sliku kao RN <ImageBackground>
    paddingBottom: 20,
  },
});

export default IzborKarata;
