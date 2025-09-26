import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useDukati } from "../context/DukatiContext";
import { formatDateLocal } from "../utils/formatDate";
// i18n
import { useTranslation } from "react-i18next";

const ArhivaOtvaranja = () => {
  const navigation = useNavigation();
  const { userPlan } = useDukati();
  const { t } = useTranslation(["common"]);

  const [otvaranja, setOtvaranja] = useState([]);
  const [loading, setLoading] = useState(true);

  // mapiranje “raw” tipova u lepe, lokalizovane labele
  const prettyType = (raw) => {
    // START: proširen mapping + normalize
    const r = String(raw || "").toLowerCase().trim();

    if (["klasicno", "klasično", "classic"].includes(r)) {
      return t("common:detail.classic", { defaultValue: "Classic spread" });
    }
    if (["drvo", "kabbalah", "kabalisticko", "kabalističko", "tree", "tree of life"].includes(r)) {
      return t("common:detail.kabbalisticTree", { defaultValue: "Kabbalistic Tree of Life" });
    }
    if (["astrološko", "astrolosko", "astro", "astrological", "astrological spread"].includes(r)) {
      return t("common:detail.astrologicalSpread", { defaultValue: "Astrological spread" });
    }
    // Celtic Cross (keltski)
    if (
      [
        "keltski",
        "keltski krst",
        "keltski-krst",
        "celtic",
        "celtic cross",
        "celtic-cross",
        "celt",
        "celtic spread",
      ].includes(r)
    ) {
      return t("common:detail.celticCross", { defaultValue: "Celtic Cross" });
    }

    // fallback
    return raw || t("common:labels.spread", { defaultValue: "Spread" });
    // END: proširen mapping + normalize
  };

  useEffect(() => {
    if (userPlan !== "pro") {
      navigation.goBack();
      return;
    }
    const fetchOtvaranja = async () => {
      setLoading(true);
      try {
        const raw = await AsyncStorage.getItem("arhiva_otvaranja");
        let data = raw ? JSON.parse(raw) : [];
        // poslednjih 30 dana
        const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
        data = data
          .filter((o) => !o.vreme || o.vreme >= cutoff)
          .sort((a, b) => (b.vreme || 0) - (a.vreme || 0));
        setOtvaranja(data);
      } catch {
        setOtvaranja([]);
      }
      setLoading(false);
    };
    fetchOtvaranja();
  }, [userPlan]);

  const renderOtvaranje = ({ item }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() => navigation.navigate("DetaljOtvaranja", { otvaranje: item })}
    >
      <Text style={styles.type}>{prettyType(item.type)}</Text>
      <Text style={styles.q}>{item.question}</Text>
      <Text style={styles.date}>{formatDateLocal(item.created_at || item.vreme)}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={{ color: "#FFD700", marginTop: 12 }}>
          {t("common:messages.loading", { defaultValue: "Loading..." })}
        </Text>
      </View>
    );
  }

  if (!otvaranja.length) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: "#fff", fontSize: 18, textAlign: "center" }}>
          {t("common:history.empty30Days", {
            defaultValue: "No readings in the last 30 days.",
          })}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Close */}
      <View style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "center" }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Text style={{ color: "#FFD700", fontSize: 30, fontWeight: "bold" }}>×</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>
        {t("common:home.menu.history", { defaultValue: "Readings archive" })}
      </Text>

      <FlatList
        data={otvaranja}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderOtvaranje}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#18161a", padding: 14 },
  title: { color: "#FFD700", fontSize: 22, fontWeight: "bold", marginBottom: 12, textAlign: "center" },
  item: {
    backgroundColor: "#fff1",
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
  },
  type: { color: "#FFD700", fontWeight: "bold", fontSize: 15 },
  q: { color: "#fff", fontSize: 15, marginTop: 2 },
  date: { color: "#ffd700", fontSize: 13, marginTop: 6, fontStyle: "italic" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#18161a" },
  closeBtn: {
    padding: 2,
    paddingHorizontal: 10,
    alignSelf: "flex-end",
    marginBottom: -24,
    zIndex: 10,
  },
});

export default ArhivaOtvaranja;
