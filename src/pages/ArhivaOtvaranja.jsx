import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
// START: DukatiContext (isPro umesto direktnog poređenja sa "pro")
import { useDukati } from "../context/DukatiContext";
// END: DukatiContext (isPro)
import { useTranslation } from "react-i18next";
import { formatDateLocal } from "../utils/formatDate";
// START: ispravna ruta Supabase klijenta
import { supabase } from "../utils/supabaseClient";
// END: ispravna ruta Supabase klijenta
import { useAuth } from "../context/AuthProvider";

// START: normalizacija sesije (kanonska polja za UI)
const normalizeSession = (r = {}) => {
  const question = r.question ?? r.pitanje ?? r.query ?? null;
  const answer =
    r.answer ?? r.ai_answer ?? r.aiAnswer ?? r.response ?? r.result ?? r.odgovor ?? null;
  const subquestion = r.subquestion ?? r.podpitanje ?? r.followup ?? null;
  const subanswer =
    r.subanswer ?? r.followup_answer ?? r.followupAnswer ?? r.odgovor2 ?? null;
  const cards = r.cards ?? r.karte ?? r.drawn_cards ?? r.drawnCards ?? [];
  const type = r.type ?? r.tip ?? r.spread_type ?? null;
  const created_at = r.created_at ?? r.vreme ?? r.createdAt ?? null;
  // START: dodato – subtip za lep prikaz
  const subtip = r.subtip ?? r.subtype ?? r.variant ?? r.kind ?? null;
  // END: dodato – subtip

  return { ...r, question, answer, subquestion, subanswer, cards, type, created_at, subtip };
};
// END: normalizacija

const ArhivaOtvaranja = () => {
  const navigation = useNavigation();
  // START: koristimo isPro (pokriva i 'pro' i 'proplus')
  const { isPro } = useDukati();
  // END: koristimo isPro
  const { t } = useTranslation(["common"]);

  // START: userId iz Auth providera
  const { user } = useAuth();
  const userId = user?.id || null;
  // END: userId iz Auth providera

  const [otvaranja, setOtvaranja] = useState([]);
  const [loading, setLoading] = useState(true);

  // START: keyset + fallback state
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [localFallback, setLocalFallback] = useState([]); // AsyncStorage prikaz ako cloud nema redove
  const [showImportBanner, setShowImportBanner] = useState(false); // ponudi migraciju
  const [importing, setImporting] = useState(false);
  const PAGE = 20;
  // END: keyset + fallback state

  // START: prettyType (raw + subtip) – hvata “tri/ljubavno/pet” i klasično
  const prettyType = (raw, sub) => {
    const r = String(raw || "").toLowerCase().trim();
    const s = String(sub || "").toLowerCase().trim();
    const tokens = (r + " " + s).split(/[^a-zčćšđž0-9-]+/i).filter(Boolean);

    // direktni podtipovi ili klasično+subtip
    if (["tri", "proslost", "proslost-sadasnjost-buducnost"].some(k => tokens.includes(k))) {
      return t("common:classic.options.pastPresentFuture", {
        defaultValue: "Prošlost – Sadašnjost – Budućnost",
      });
    }
    if (["ljubavno", "love"].some(k => tokens.includes(k))) {
      return t("common:detail.loveReading", { defaultValue: "Ljubavno čitanje" });
    }
    if (["pet", "put", "putspoznaje", "path", "path-of-insight"].some(k => tokens.includes(k))) {
      return t("common:detail.pathOfInsightReading", { defaultValue: "Put spoznaje" });
    }

    if (["klasicno", "klasično", "classic"].includes(r)) {
      return t("common:detail.classic", { defaultValue: "Classic spread" });
    }
    if (["drvo", "kabbalah", "kabalisticko", "kabalističko", "tree", "tree of life"].includes(r)) {
      return t("common:detail.kabbalisticTree", { defaultValue: "Kabbalistic Tree of Life" });
    }
    if (["astrološko", "astrolosko", "astro", "astrological", "astrological spread"].includes(r)) {
      return t("common:detail.astrologicalSpread", { defaultValue: "Astrological spread" });
    }
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

    return raw || t("common:labels.spread", { defaultValue: "Spread" });
  };
  // END: prettyType

  // START: helper – lokalna arhiva (poslednjih 30 dana)
  const getLocalBackup = async () => {
    try {
      const raw = await AsyncStorage.getItem("arhiva_otvaranja");
      let data = raw ? JSON.parse(raw) : [];
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      data = data
        .filter((o) => !o.vreme || o.vreme >= cutoff)
        .sort((a, b) => (b.vreme || 0) - (a.vreme || 0));
      return data.map(normalizeSession);
    } catch {
      return [];
    }
  };
  // END: helper – lokalna arhiva

  // START: initial load (pro+ korisnici) — Supabase keyset uz 30d filter
  useEffect(() => {
    if (!isPro) {
      navigation.goBack();
      return;
    }
    if (!userId) return;
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPro, userId]);
  // END: initial load

  // START: keyset: initial
  const loadInitial = async () => {
    setLoading(true);
    setHasMore(true);
    setCursor(null);

    const cutoffISO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("tarot_sessions")
      .select("*", { count: "exact" }) // 🚀 uzmi sve kolone, pa posle normalizuj
      .eq("user_id", userId)
      .gte("created_at", cutoffISO)
      .order("created_at", { ascending: false })
      .limit(PAGE);

    if (error) {
      if (__DEV__) console.log("[arhiva][initial][error]", error.message);
      setOtvaranja([]);
      setHasMore(false);
      setCursor(null);
      const local = await getLocalBackup();
      setLocalFallback(local);
      setShowImportBanner(false);
      setLoading(false);
      return;
    }

    const rows = (data ?? []).map(normalizeSession);
    setOtvaranja(rows);

    const local = await getLocalBackup();
    setLocalFallback(local);
    setShowImportBanner(!rows.length && local.length > 0);

    setCursor(rows.length ? rows[rows.length - 1].created_at : null);
    setHasMore(rows.length === PAGE);
    setLoading(false);
  };
  // END: keyset: initial

  // START: keyset: loadMore
  const loadMore = async () => {
    if (!hasMore || loadingMore || !userId) return;
    setLoadingMore(true);

    const cutoffISO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    let q = supabase
      .from("tarot_sessions")
      .select("*") // isto — sve kolone
      .eq("user_id", userId)
      .gte("created_at", cutoffISO)
      .order("created_at", { ascending: false })
      .limit(PAGE);

    if (cursor) q = q.lt("created_at", cursor);

    const { data, error } = await q;

    if (error) {
      if (__DEV__) console.log("[arhiva][more][error]", error.message);
      setLoadingMore(false);
      return;
    }

    const rows = (data ?? []).map(normalizeSession);
    setOtvaranja((prev) => [...prev, ...rows]);
    setCursor(rows.length ? rows[rows.length - 1].created_at : cursor);
    setHasMore(rows.length === PAGE);
    setLoadingMore(false);
  };
  // END: keyset: loadMore

  // START: pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitial();
    setRefreshing(false);
  };
  // END: pull-to-refresh

  // START: 1-klik migracija (AsyncStorage -> Supabase)
  const importLocalToCloud = async () => {
    if (!userId || !localFallback.length) return;
    setImporting(true);
    try {
      const rows = localFallback.map((o) => {
        const ts = o.created_at ?? o.vreme ?? Date.now();
        const createdISO = new Date(ts).toISOString();
        return {
          user_id: userId,
          question: o.question ?? "",
          answer: o.answer ?? null,
          created_at: createdISO,
          type: o.type ?? null,
          cards: o.cards ?? null, // ako kolona postoji u bazi — OK; ako ne, PostgREST ignoriše dodatna svojstva pri insertu
          subquestion: o.subquestion ?? null,
          subanswer: o.subanswer ?? null,
        };
      });

      const { error } = await supabase.from("tarot_sessions").insert(rows);
      if (error) throw error;

      await loadInitial();
      setShowImportBanner(false);
      await AsyncStorage.setItem("arhiva_migrated", "1");
    } catch (e) {
      if (__DEV__) console.log("[arhiva][import][err]", e?.message || e);
    } finally {
      setImporting(false);
    }
  };
  // END: 1-klik migracija

  const renderOtvaranje = ({ item }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() => navigation.navigate("DetaljOtvaranja", { otvaranje: normalizeSession(item) })}
    >
      <Text style={styles.type}>{prettyType(item.type, item.subtip)}</Text>
      <Text style={styles.q}>{item.question}</Text>
      <Text style={styles.date}>{formatDateLocal(item.created_at)}</Text>
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

  // prazno samo ako ni cloud ni lokal nemaju ništa
  if (!otvaranja.length && !localFallback.length) {
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

  const listData = otvaranja.length ? otvaranja : localFallback;

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

      {/* Import baner (samo kad nema cloud redova a ima lokalnih) */}
      {showImportBanner && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            {t("common:history.localFound", {
              defaultValue: "Pronađena je lokalna arhiva na ovom uređaju. Uvesti u cloud?",
            })}
          </Text>
          <TouchableOpacity style={styles.bannerBtn} onPress={importLocalToCloud} disabled={importing}>
            {importing ? (
              <ActivityIndicator color="#222" />
            ) : (
              <Text style={styles.bannerBtnText}>
                {t("common:buttons.import", { defaultValue: "Uvezi" })}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={listData}
        keyExtractor={(item, idx) => String(item.id ?? item.created_at ?? idx)}
        renderItem={renderOtvaranje}
        contentContainerStyle={{ paddingBottom: 20 }}
        initialNumToRender={PAGE}
        windowSize={5}
        removeClippedSubviews
        onEndReached={otvaranja.length ? loadMore : undefined}
        onEndReachedThreshold={0.6}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListFooterComponent={
          otvaranja.length && loadingMore ? (
            <View style={{ paddingVertical: 16, alignItems: "center" }}>
              <ActivityIndicator color="#FFD700" />
            </View>
          ) : null
        }
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
  // baner za uvoz
  banner: {
    backgroundColor: "#ffd70022",
    borderColor: "#FFD700",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bannerText: { color: "#FFD700", flex: 1, paddingRight: 8 },
  bannerBtn: {
    backgroundColor: "#FFD700",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bannerBtnText: { color: "#222", fontWeight: "bold" },
});

export default ArhivaOtvaranja;
