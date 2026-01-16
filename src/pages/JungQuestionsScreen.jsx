// src/pages/JungQuestionsScreen.jsx
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
// START: lesson highlight support (useEffect)
import React, { useEffect, useMemo, useState } from "react";
// END: lesson highlight support (useEffect)
import { useTranslation } from "react-i18next";

// START: add Platform for safe bottom padding
// import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";
// END: add Platform for safe bottom padding

// START: safe-area padding for Android/iOS bottom UI
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
// END: safe-area padding for Android/iOS bottom UI

import { jungQuestions } from "../data/jungQuestions";

// START: Jung opening mode support (price + coins)
import { READING_PRICES } from "../constants/readingPrices";
import { useDukati } from "../context/DukatiContext";
// END: Jung opening mode support (price + coins)

export default function JungQuestionsScreen() {
    const { t } = useTranslation(["jungQuestions", "common"]);
    const navigation = useNavigation();
    const route = useRoute();

    const lessonId = route?.params?.lessonId ?? null;

    // START: Jung special opening mode (from "Sva otvaranja")
    const tip = route?.params?.tip ?? null; // TarotOtvaranja šalje tip:"jung"
    const isOpening = tip === "jung";
    const brojKarata = route?.params?.brojKarata ?? 5;

    const { dukati } = useDukati();
    const price = READING_PRICES?.jung ?? 100;

    const [selectedId, setSelectedId] = useState(null);
    // END: Jung special opening mode (from "Sva otvaranja")

    // START: safe bottom padding values (fix CTA behind Android nav bar)
    const insets = useSafeAreaInsets();
    const bottomPad = Math.max(insets?.bottom ?? 0, Platform.OS === "android" ? 20 : 0);
    // END: safe bottom padding values

    // START: if coming from lesson in opening mode, preselect first question from that lesson
    useEffect(() => {
        if (!isOpening) return;
        if (!lessonId) return;
        if (selectedId) return;

        const first = jungQuestions.find((q) => q.lessonId === lessonId);
        if (first) setSelectedId(first.id);
    }, [isOpening, lessonId, selectedId]);
    // END: if coming from lesson in opening mode, preselect first question from that lesson

    const [mode, setMode] = useState(lessonId ? "lesson" : "all"); // "all" | "lesson"

    const data = useMemo(() => {
        // START: Opening mode → uvek svih 30 (bez filtera)
        if (isOpening) return jungQuestions;
        // END: Opening mode → uvek svih 30 (bez filtera)

        if (mode === "lesson" && lessonId) {
            return jungQuestions.filter((q) => q.lessonId === lessonId);
        }
        return jungQuestions;
    }, [mode, lessonId, isOpening]);

    // START: helper – resolve selected question text
    const selected = useMemo(() => {
        if (!selectedId) return null;
        return jungQuestions.find((q) => q.id === selectedId) ?? null;
    }, [selectedId]);

    const selectedQuestionText = useMemo(() => {
        if (!selected) return "";
        if (selected.questionKey) {
            return t(`jungQuestions:${selected.questionKey}`, { defaultValue: "" });
        }
        return selected.question ?? "";
    }, [selected, t]);
    // END: helper – resolve selected question text

    return (
        // START: SafeAreaView wrapper (top/left/right), bottom handled via bottomPad
        <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
            {/* END: SafeAreaView wrapper */}
            <View style={styles.screen}>
                {/* Top bar */}
                <View style={styles.topRow}>
                    <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn} hitSlop={10}>
                        <Ionicons name="arrow-back" size={18} color="#FFD700" />
                    </Pressable>

                    <View style={{ flex: 1 }}>
                        <Text style={styles.title}>
                            {isOpening
                                ? t("jungQuestions:opening.title", { defaultValue: "Jung Archetypes" })
                                : t("jungQuestions:screen.title", { defaultValue: "Jung Questions" })}
                        </Text>

                        <Text style={styles.sub}>
                            {isOpening
                                ? t("jungQuestions:opening.subtitle", {
                                    defaultValue: "Choose one curated question (no custom input).",
                                })
                                : t("jungQuestions:screen.subtitle", {
                                    defaultValue: "30 prompts for reflection (not prediction).",
                                })}
                        </Text>

                        {/* START: optional price hint in opening mode */}
                        {isOpening ? (
                            <Text style={styles.priceHint}>
                                {t("jungQuestions:opening.priceLine", {
                                    defaultValue: "Price: {{price}} • Balance: {{balance}}",
                                    price: `${price} 🪙`,
                                    balance: `${dukati ?? 0} 🪙`,
                                })}
                            </Text>
                        ) : null}
                        {/* END: optional price hint in opening mode */}
                    </View>

                    <Pressable
                        onPress={() => {
                            try {
                                navigation.popToTop();
                            } catch (e) {
                                navigation.navigate("Home");
                            }
                        }}
                        style={styles.iconBtn}
                        hitSlop={10}
                    >
                        <Ionicons name="home" size={20} color="#FFD700" />
                    </Pressable>
                </View>

                {/* START: Filter pills (hide in opening mode) */}
                {!isOpening ? (
                    <View style={styles.pillsRow}>
                        <Pressable
                            onPress={() => setMode("all")}
                            style={[styles.pill, mode === "all" && styles.pillActive]}
                        >
                            <Text style={[styles.pillText, mode === "all" && styles.pillTextActive]}>
                                {t("jungQuestions:screen.filterAll", { defaultValue: "All" })}
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={() => setMode("lesson")}
                            disabled={!lessonId}
                            style={[
                                styles.pill,
                                mode === "lesson" && styles.pillActive,
                                !lessonId && { opacity: 0.4 },
                            ]}
                        >
                            <Text style={[styles.pillText, mode === "lesson" && styles.pillTextActive]}>
                                {t("jungQuestions:screen.filterThisLesson", { defaultValue: "This lesson" })}
                            </Text>
                        </Pressable>
                    </View>
                ) : null}
                {/* END: Filter pills */}

                <FlatList
                    data={data}
                    keyExtractor={(x) => x.id}
                    contentContainerStyle={{
                        paddingTop: 10,
                        // START: keep list content above CTA + Android nav bar
                        // paddingBottom: isOpening ? 120 : 20,
                        paddingBottom: isOpening ? 140 + bottomPad : 20 + bottomPad,
                        // END: keep list content above CTA + Android nav bar
                    }}
                    renderItem={({ item }) => {
                        const qText = item.questionKey
                            ? t(`jungQuestions:${item.questionKey}`, { defaultValue: "" })
                            : item.question ?? "";

                        const whyText = item.whyKey
                            ? t(`jungQuestions:${item.whyKey}`, { defaultValue: "" })
                            : item.why ?? "";

                        // START: Opening mode UI (select question, no "why")
                        if (isOpening) {
                            const active = item.id === selectedId;

                            // START: highlight questions belonging to passed lessonId (if any)
                            const isFromLesson = !!lessonId && item.lessonId === lessonId;
                            // END: highlight questions belonging to passed lessonId (if any)

                            return (
                                <Pressable
                                    onPress={() => setSelectedId(item.id)}
                                    style={[
                                        styles.pickItem,
                                        // START: lesson highlight style
                                        isFromLesson && styles.pickItemLesson,
                                        // END: lesson highlight style
                                        active && styles.pickItemActive,
                                    ]}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.pickText, active && styles.pickTextActive]}>
                                            {qText}
                                        </Text>

                                        {/* START: lesson badge */}
                                        {isFromLesson ? (
                                            <View style={styles.lessonBadge}>
                                                <Text style={styles.lessonBadgeText}>
                                                    {t("jungQuestions:opening.fromLesson", {
                                                        defaultValue: "This lesson",
                                                    })}
                                                </Text>
                                            </View>
                                        ) : null}
                                        {/* END: lesson badge */}
                                    </View>

                                    {active ? (
                                        <Ionicons name="checkmark-circle" size={18} color="#FFD700" />
                                    ) : (
                                        <Ionicons
                                            name="ellipse-outline"
                                            size={18}
                                            color="rgba(255,255,255,0.35)"
                                        />
                                    )}
                                </Pressable>
                            );
                        }
                        // END: Opening mode UI

                        // START: Library mode UI (existing cards with why + tags)
                        return (
                            <View style={styles.card}>
                                <Text style={styles.q}>{qText}</Text>
                                <Text style={styles.why}>{whyText}</Text>

                                {Array.isArray(item.tags) && item.tags.length ? (
                                    <View style={styles.tagsRow}>
                                        {item.tags.slice(0, 4).map((tag) => (
                                            <View key={tag} style={styles.tagChip}>
                                                <Text style={styles.tagText}>{tag}</Text>
                                            </View>
                                        ))}
                                    </View>
                                ) : null}
                            </View>
                        );
                        // END: Library mode UI
                    }}
                />

                {/* START: Opening mode CTA (Choose cards) */}
                {isOpening ? (
                    // START: move CTA above Android nav bar using bottomPad
                    <View style={[styles.bottomBar, { bottom: 16 + bottomPad }]}>
                        {/* END: move CTA above Android nav bar using bottomPad */}
                        <Pressable
                            onPress={() => {
                                if (!selectedId) return;

                                // UX guard: ne puštaj dalje ako nema dovoljno
                                // (prava provera i dalje postoji u IzborKarataModal/flow-u)
                                if ((dukati ?? 0) < price) return;

                                navigation.navigate("IzborKarata", {
                                    tip: "jung",
                                    subtip: selectedId, // ID pitanja (korisno za prompt)
                                    pitanje: selectedQuestionText,
                                    layoutTemplate: Array.from({ length: brojKarata }, () => ({})), // 5 karata
                                });
                            }}
                            disabled={!selectedId || (dukati ?? 0) < price}
                            style={[styles.cta, (!selectedId || (dukati ?? 0) < price) && { opacity: 0.5 }]}
                        >
                            <Text style={styles.ctaText}>
                                {t("jungQuestions:opening.chooseCards", { defaultValue: "Choose cards" })} •{" "}
                                {price} 🪙
                            </Text>
                        </Pressable>
                    </View>
                ) : null}
                {/* END: Opening mode CTA (Choose cards) */}
            </View>
            {/* START: SafeAreaView wrapper */}
        </SafeAreaView>
        // END: SafeAreaView wrapper
    );
}

const styles = StyleSheet.create({
    // START: SafeAreaView base
    safe: { flex: 1, backgroundColor: "#0d0d19" },
    // END: SafeAreaView base

    screen: { flex: 1, backgroundColor: "#0d0d19", padding: 16 },

    topRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },

    // START: unify icon button style with rest of app
    // iconBtn: {
    //     width: 40,
    //     height: 40,
    //     borderRadius: 12,
    //     alignItems: "center",
    //     justifyContent: "center",
    //     backgroundColor: "rgba(255,255,255,0.06)",
    // },
    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.10)",
        backgroundColor: "rgba(255,255,255,0.04)",
    },
    // END: unify icon button style with rest of app

    title: { color: "white", fontSize: 20, fontWeight: "900" },
    sub: { marginTop: 6, color: "rgba(255,255,255,0.75)", fontSize: 13 },

    // START: opening price hint
    priceHint: { marginTop: 6, color: "rgba(255,215,0,0.85)", fontSize: 12, fontWeight: "800" },
    // END: opening price hint

    pillsRow: { flexDirection: "row", gap: 10, marginTop: 14 },
    pill: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
        backgroundColor: "rgba(255,255,255,0.04)",
    },
    pillActive: { borderColor: "#FFD70055", backgroundColor: "rgba(255,215,0,0.10)" },
    pillText: { color: "rgba(255,255,255,0.75)", fontWeight: "800", fontSize: 12 },
    pillTextActive: { color: "#FFD700" },

    // START: Library cards (existing)
    card: {
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.10)",
        backgroundColor: "rgba(255,255,255,0.04)",
        marginBottom: 10,
    },
    q: { color: "white", fontSize: 14, fontWeight: "900", lineHeight: 19 },
    why: { marginTop: 6, color: "rgba(255,255,255,0.78)", fontSize: 13, lineHeight: 18 },

    tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },

    // START: slightly softer tags to match new cards
    // tagChip: {
    //     paddingVertical: 4,
    //     paddingHorizontal: 8,
    //     borderRadius: 999,
    //     borderWidth: 1,
    //     borderColor: "rgba(255,255,255,0.12)",
    //     backgroundColor: "rgba(0,0,0,0.25)",
    // },
    tagChip: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
        backgroundColor: "rgba(255,255,255,0.04)",
    },
    // END: slightly softer tags to match new cards
    tagText: { color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: "800" },
    // END: Library cards

    // START: Opening pick items (selectable list)
    pickItem: {
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.10)",
        backgroundColor: "rgba(255,255,255,0.04)",
        marginBottom: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },

    // START: lesson highlight styles (opening mode)
    pickItemLesson: {
        borderColor: "rgba(255,215,0,0.28)",
        backgroundColor: "rgba(255,215,0,0.05)",
    },
    lessonBadge: {
        alignSelf: "flex-start",
        marginTop: 8,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 999,
        backgroundColor: "rgba(255,215,0,0.10)",
        borderWidth: 1,
        borderColor: "rgba(255,215,0,0.25)",
    },
    lessonBadgeText: {
        color: "rgba(255,215,0,0.95)",
        fontSize: 12,
        fontWeight: "800",
    },
    // END: lesson highlight styles (opening mode)

    pickItemActive: {
        borderColor: "rgba(255,215,0,0.55)",
        backgroundColor: "rgba(255,215,0,0.08)",
    },
    pickText: { color: "rgba(255,255,255,0.92)", fontSize: 14, fontWeight: "900", lineHeight: 19 },
    pickTextActive: { color: "white" },
    // END: Opening pick items

    // START: Opening CTA bar (with subtle "glass" container)
    // bottomBar: { position: "absolute", left: 16, right: 16, bottom: 16 },
    bottomBar: {
        position: "absolute",
        left: 16,
        right: 16,
        bottom: 16,
        padding: 10,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.10)",
        backgroundColor: "rgba(13,13,25,0.92)",
    },
    // cta: { backgroundColor: "#FFD700", borderRadius: 14, paddingVertical: 16, alignItems: "center" },
    cta: {
        backgroundColor: "#FFD700",
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
    },
    ctaText: { color: "#111", fontWeight: "900", fontSize: 16 },
    // END: Opening CTA bar
});
