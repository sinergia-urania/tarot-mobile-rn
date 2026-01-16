import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    FlatList,
    // START: parchment background
    ImageBackground,
    // END: parchment background
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { jungLessonsCatalog } from "../data/jungLessonsCatalog";

// START: optional local progress without hard dependency
let AsyncStorage = null;
try {
    AsyncStorage = require("@react-native-async-storage/async-storage").default;
} catch (e) {
    AsyncStorage = null;
}

// START: support both progress keys (backward compatible)
const COMPLETED_KEY = "jung_lessons_completed_v1"; // (legacy alias, keep)
const COMPLETED_KEY_V1 = "jung_lessons_completed_v1"; // old format: array of lessonIds
const COMPLETED_KEY_V2 = "jungLessons.completed.v1"; // new format: map { [lessonId]: true }
// END: support both progress keys (backward compatible)
// END: optional local progress

async function loadCompletedSet() {
    if (!AsyncStorage) return new Set();

    // START: merge progress from both formats (v1 array + v2 map)
    const rawV1 = await AsyncStorage.getItem(COMPLETED_KEY_V1);
    const rawV2 = await AsyncStorage.getItem(COMPLETED_KEY_V2);

    if (!rawV1 && !rawV2) return new Set();

    try {
        const set = new Set();

        if (rawV1) {
            const arr = JSON.parse(rawV1);
            (Array.isArray(arr) ? arr : []).forEach((id) => set.add(id));
        }

        if (rawV2) {
            const map = JSON.parse(rawV2);
            if (map && typeof map === "object") {
                Object.keys(map).forEach((id) => {
                    if (map[id]) set.add(id);
                });
            }
        }

        return set;
    } catch {
        return new Set();
    }
    // END: merge progress from both formats (v1 array + v2 map)
}

// START: parchment theme tokens
const PARCHMENT = {
    ink: "#2A1F14",
    inkSoft: "rgba(42,31,20,0.74)",
    inkSoft2: "rgba(42,31,20,0.60)",
    border: "rgba(60,40,20,0.22)",
    cardBg: "rgba(255,255,255,0.62)",
    cardBg2: "rgba(255,255,255,0.52)",
    doneBorder: "rgba(12,227,127,0.35)",
    doneBg: "rgba(12,227,127,0.08)",
};
// END: parchment theme tokens

export default function JungLessonsListScreen() {
    // START: use lessons namespace for lesson strings
    const { t } = useTranslation(["lessons", "common"]);
    // END: use lessons namespace
    const navigation = useNavigation();
    const [completed, setCompleted] = useState(new Set());

    const data = useMemo(() => {
        return [...jungLessonsCatalog].sort((a, b) => a.order - b.order);
    }, []);

    useFocusEffect(
        useCallback(() => {
            let mounted = true;
            loadCompletedSet().then((set) => {
                if (mounted) setCompleted(set);
            });
            return () => {
                mounted = false;
            };
        }, [])
    );

    // START: openLesson uses lessonId param (no 'item' reference here)
    const openLesson = (lessonId) => {
        navigation.navigate("JungLessonDetail", { lessonId });
    };
    // END: openLesson

    // START: header progress (x/y + bar)
    const total = data.length;
    const doneCount = completed.size;
    const progress = total ? Math.min(1, doneCount / total) : 0;
    const progressPct = Math.round(progress * 100);
    // END: header progress (x/y + bar)

    return (
        // START: parchment background wrapper
        <View style={styles.screen}>
            <ImageBackground
                source={require("../assets/icons/parchment.webp")}
                style={styles.paper}
                imageStyle={styles.paperImage}
            >
                <View style={styles.container}>
                    <View style={styles.headerRow}>
                        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
                            {/* START: ink icon */}
                            <Ionicons name="arrow-back" size={18} color={PARCHMENT.ink} />
                            {/* END: ink icon */}
                        </Pressable>

                        <View style={{ flex: 1 }}>
                            <Text style={styles.title}>
                                {t("lessons:jungLessons.list.title", { defaultValue: "Jungian Archetypes" })}
                            </Text>
                            <Text style={styles.subtitle}>
                                {t("lessons:jungLessons.list.subtitle", {
                                    defaultValue:
                                        "12 micro-lessons: Tarot as a symbolic mirror of Jungian archetypes.",
                                })}
                            </Text>

                            {/* START: progress row */}
                            <View style={styles.progressRow}>
                                <Text style={styles.progressText}>
                                    {doneCount}/{total}{" "}
                                    {t("common:completed", { defaultValue: "completed" })}
                                </Text>
                                <View style={styles.progressTrack}>
                                    <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
                                </View>
                            </View>
                            {/* END: progress row */}
                        </View>
                    </View>

                    <FlatList
                        data={data}
                        keyExtractor={(x) => x.id}
                        contentContainerStyle={{ paddingTop: 12, paddingBottom: 20 }}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => {
                            const prefix = item.i18nPrefix; // npr. "jungLessons.introArchetypes"
                            const isDone = completed.has(item.id);

                            return (
                                <Pressable onPress={() => openLesson(item.id)} style={styles.card}>
                                    <View style={styles.cardTop}>
                                        <Text style={styles.index}>{String(item.order).padStart(2, "0")}</Text>

                                        {/* START: done badge */}
                                        {isDone ? (
                                            <View style={styles.doneBadge}>
                                                <Text style={styles.done}>✓</Text>
                                            </View>
                                        ) : null}
                                        {/* END: done badge */}
                                    </View>

                                    <Text style={styles.cardTitle}>
                                        {t(`lessons:${prefix}.title`, { defaultValue: `${prefix}.title` })}
                                    </Text>
                                    <Text style={styles.cardOneLiner}>
                                        {t(`lessons:${prefix}.oneLiner`, { defaultValue: `${prefix}.oneLiner` })}
                                    </Text>
                                </Pressable>
                            );
                        }}
                    />

                    {!AsyncStorage ? (
                        <Text style={styles.note}>
                            {t("lessons:jungLessons.progress.note", {
                                defaultValue: "Progress tracking is disabled (AsyncStorage not installed).",
                            })}
                        </Text>
                    ) : null}
                </View>
            </ImageBackground>
        </View>
        // END: parchment background wrapper
    );
}

const styles = StyleSheet.create({
    // START: parchment frame + transparent container
    screen: { flex: 1, backgroundColor: "#0d0d19" },
    paper: {
        flex: 1,
        margin: 12,
        borderRadius: 18,
        overflow: "hidden",
    },
    paperImage: { resizeMode: "cover" },
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: "transparent",
    },
    // END: parchment frame + transparent container

    headerRow: { flexDirection: "row", alignItems: "flex-start" },

    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        // START: paper button style
        backgroundColor: PARCHMENT.cardBg2,
        borderWidth: 1,
        borderColor: PARCHMENT.border,
        // END: paper button style
        marginRight: 12,
    },

    // START: ink typography
    title: {
        color: PARCHMENT.ink,
        fontSize: 22,
        fontWeight: "900",
        letterSpacing: 0.2,
    },
    subtitle: {
        marginTop: 6,
        color: PARCHMENT.inkSoft,
        fontSize: 13,
        lineHeight: 18,
    },
    // END: ink typography

    // START: progress styles
    progressRow: { marginTop: 10 },
    progressText: { color: PARCHMENT.inkSoft2, fontSize: 12, fontWeight: "800" },
    progressTrack: {
        marginTop: 6,
        height: 8,
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.45)",
        overflow: "hidden",
        borderWidth: 1,
        borderColor: PARCHMENT.border,
    },
    progressFill: {
        height: "100%",
        backgroundColor: "rgba(42,31,20,0.55)",
    },
    // END: progress styles

    // START: paper cards
    card: {
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: PARCHMENT.border,
        backgroundColor: PARCHMENT.cardBg,
        marginBottom: 12,

        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
    },
    // END: paper cards

    cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    index: { color: PARCHMENT.inkSoft, fontSize: 12, fontWeight: "800" },

    // START: done badge
    doneBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: PARCHMENT.doneBorder,
        backgroundColor: PARCHMENT.doneBg,
    },
    done: { color: "#0CE37F", fontSize: 14, fontWeight: "900" },
    // END: done badge

    cardTitle: { marginTop: 8, color: PARCHMENT.ink, fontSize: 16, fontWeight: "900" },
    cardOneLiner: { marginTop: 6, color: PARCHMENT.inkSoft, fontSize: 13, lineHeight: 18 },

    note: { marginTop: 10, color: PARCHMENT.inkSoft2, fontSize: 12 },
});
