import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
// START: add useEffect/useState for completion toggle
// import React, { useMemo } from "react";
import React, { useEffect, useMemo, useState } from "react";
// END: add useEffect/useState for completion toggle
import { useTranslation } from "react-i18next";

// START: parchment background (ImageBackground)
// import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ImageBackground, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
// END: parchment background (ImageBackground)

// START: add AsyncStorage for lesson completion persistence
import AsyncStorage from "@react-native-async-storage/async-storage";
// END: add AsyncStorage for lesson completion persistence

import { getJungLessonById } from "../data/jungLessonsCatalog";
// START: use real Jung questions (the same ones used in JungQuestions flow)
import { jungQuestions } from "../data/jungQuestions";
// END: use real Jung questions

// START: parchment theme tokens
const PARCHMENT = {
    ink: "#2A1F14",
    inkSoft: "rgba(42,31,20,0.74)",
    inkSoft2: "rgba(42,31,20,0.60)",
    cardBg: "rgba(255,255,255,0.62)",
    cardBg2: "rgba(255,255,255,0.52)",
    border: "rgba(60,40,20,0.22)",
    gold: "#B07A2A",
};
// END: parchment theme tokens

export default function JungLessonDetailScreen() {
    // START: include jungQuestions namespace for question/why translations
    const { t } = useTranslation(["lessons", "jungQuestions"]);
    // END: include jungQuestions namespace for question/why translations

    const navigation = useNavigation();
    const route = useRoute();
    const lessonId = route?.params?.lessonId;

    const lesson = useMemo(() => getJungLessonById(lessonId), [lessonId]);
    const prefix = lesson?.i18nPrefix;

    // START: lesson completion toggle (persisted)
    const STORAGE_KEY = "jungLessons.completed.v1";
    const [completedMap, setCompletedMap] = useState({});
    const [progressEnabled, setProgressEnabled] = useState(true);
    const isCompleted = !!(lessonId && completedMap?.[lessonId]);

    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const raw = await AsyncStorage.getItem(STORAGE_KEY);
                const parsed = raw ? JSON.parse(raw) : {};
                if (mounted) setCompletedMap(parsed && typeof parsed === "object" ? parsed : {});
            } catch (e) {
                if (mounted) setProgressEnabled(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [lessonId]);

    const toggleCompleted = async () => {
        if (!lessonId) return;

        const next = { ...(completedMap || {}) };

        if (next[lessonId]) {
            delete next[lessonId];
        } else {
            next[lessonId] = true;
        }

        setCompletedMap(next);

        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch (e) {
            setProgressEnabled(false);
        }
    };
    // END: lesson completion toggle (persisted)

    // START: pick “real” questions for this lesson (same source as the working Jung flow)
    const lessonQuestions = useMemo(() => {
        if (!lessonId) return [];
        return jungQuestions.filter((q) => q.lessonId === lessonId);
    }, [lessonId]);
    // END: pick “real” questions for this lesson

    if (!lesson || !prefix) {
        return (
            // START: parchment wrapper for notFound
            <View style={styles.screen}>
                <ImageBackground
                    source={require("../assets/icons/parchment.webp")}
                    style={styles.paper}
                    imageStyle={styles.paperImage}
                >
                    <View style={styles.container}>
                        <Text style={styles.title}>
                            {t("lessons:jungLessons.detail.notFound", {
                                defaultValue: "Lesson not found.",
                            })}
                        </Text>
                    </View>
                </ImageBackground>
            </View>
            // END: parchment wrapper for notFound
        );
    }

    return (
        // START: parchment layout wrapper
        // <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
        <View style={styles.screen}>
            <ImageBackground
                source={require("../assets/icons/parchment.webp")}
                style={styles.paper}
                imageStyle={styles.paperImage}
            >
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.container}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Top nav */}
                    <View style={styles.topNavRow}>
                        <Pressable
                            onPress={() => navigation.navigate("JungLessons")}
                            style={styles.topNavBtn}
                            hitSlop={10}
                            accessibilityRole="button"
                            accessibilityLabel={t("lessons:jungLessons.detail.backToLessons", {
                                defaultValue: "Back to lessons",
                            })}
                        >
                            {/* START: ink icons for parchment */}
                            {/* <Ionicons name="arrow-back" size={18} color="#FFD700" /> */}
                            <Ionicons name="arrow-back" size={18} color={PARCHMENT.ink} />
                            {/* END: ink icons for parchment */}
                            <Text style={styles.topNavText}>
                                {t("lessons:jungLessons.detail.backToLessons", {
                                    defaultValue: "Back to lessons",
                                })}
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={() => {
                                try {
                                    navigation.popToTop();
                                } catch (e) {
                                    navigation.navigate("Home");
                                }
                            }}
                            style={styles.topNavIconBtn}
                            hitSlop={10}
                            accessibilityRole="button"
                            accessibilityLabel={t("lessons:jungLessons.detail.goHome", {
                                defaultValue: "Home",
                            })}
                        >
                            {/* START: ink icons for parchment */}
                            {/* <Ionicons name="home" size={20} color="#FFD700" /> */}
                            <Ionicons name="home" size={20} color={PARCHMENT.ink} />
                            {/* END: ink icons for parchment */}
                        </Pressable>
                    </View>

                    <Text style={styles.kicker}>
                        {t("lessons:jungLessons.detail.kicker", { defaultValue: "Micro-lesson" })}
                    </Text>

                    <Text style={styles.title}>{t(`lessons:${prefix}.title`, { defaultValue: `${prefix}.title` })}</Text>

                    <Text style={styles.oneLiner}>
                        {t(`lessons:${prefix}.oneLiner`, { defaultValue: `${prefix}.oneLiner` })}
                    </Text>

                    {/* START: completion UI */}
                    <View style={styles.section}>
                        <Pressable
                            onPress={toggleCompleted}
                            style={[styles.completeBtn, isCompleted ? styles.completeBtnDone : null]}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isCompleted }}
                            accessibilityLabel={
                                isCompleted
                                    ? t("lessons:jungLessons.detail.completed", { defaultValue: "Completed ✓" })
                                    : t("lessons:jungLessons.detail.markComplete", { defaultValue: "Mark as complete" })
                            }
                        >
                            <Ionicons
                                name={isCompleted ? "checkmark-circle" : "ellipse-outline"}
                                size={18}
                                color={isCompleted ? "#0CE37F" : PARCHMENT.gold}
                                style={styles.completeIcon}
                            />
                            <Text style={styles.completeText}>
                                {isCompleted
                                    ? t("lessons:jungLessons.detail.completed", { defaultValue: "Completed ✓" })
                                    : t("lessons:jungLessons.detail.markComplete", { defaultValue: "Mark as complete" })}
                            </Text>
                        </Pressable>

                        {!progressEnabled ? (
                            <Text style={styles.progressNote}>
                                {t("lessons:jungLessons.progress.note", {
                                    defaultValue: "Progress tracking is disabled (AsyncStorage not installed).",
                                })}
                            </Text>
                        ) : null}
                    </View>
                    {/* END: completion UI */}

                    {/* Lesson body */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            {t("lessons:jungLessons.detail.lesson", { defaultValue: "Lesson" })}
                        </Text>
                        <Text style={styles.body}>{t(`lessons:${prefix}.body`, { defaultValue: `${prefix}.body` })}</Text>
                    </View>

                    {/* Related arcana */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            {t("lessons:jungLessons.detail.relatedArcana", {
                                defaultValue: "Related Major Arcana",
                            })}
                        </Text>

                        <View style={styles.chips}>
                            {[0, 1, 2].map((i) => (
                                <View key={i} style={styles.chip}>
                                    <Text style={styles.chipText}>{t(`lessons:${prefix}.arcana.${i}`, { defaultValue: "" })}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* START: Replace “Reflection prompts” with real Jung questions for this lesson */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            {t("lessons:jungLessons.detail.prompts", {
                                defaultValue: "Reflection Questions",
                            })}
                        </Text>

                        {lessonQuestions.length ? (
                            lessonQuestions.map((q) => {
                                const qText = q?.questionKey ? t(`jungQuestions:${q.questionKey}`, { defaultValue: "" }) : "";

                                const whyText = q?.whyKey ? t(`jungQuestions:${q.whyKey}`, { defaultValue: "" }) : "";

                                return (
                                    <View key={q.id} style={styles.bulletBlock}>
                                        <View style={styles.bulletRow}>
                                            <Text style={styles.bullet}>•</Text>
                                            <Text style={styles.bulletText}>{qText}</Text>
                                        </View>
                                        {!!whyText ? <Text style={styles.bulletWhy}>{whyText}</Text> : null}
                                    </View>
                                );
                            })
                        ) : (
                            <Text style={styles.body}>
                                {t("lessons:jungLessons.detail.noPrompts", {
                                    defaultValue: "No specific questions for this lesson yet.",
                                })}
                            </Text>
                        )}
                    </View>
                    {/* END: Replace “Reflection prompts” with real Jung questions for this lesson */}

                    {/* Explore (knowledge check / practice) */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            {t("lessons:jungLessons.detail.explore.title", { defaultValue: "Explore" })}
                        </Text>

                        <Pressable
                            onPress={() => navigation.navigate("ZnacenjeKarata")}
                            style={styles.linkCard}
                            accessibilityRole="button"
                            accessibilityLabel={t("lessons:jungLessons.detail.explore.tarotTitle", {
                                defaultValue: "Tarot meanings",
                            })}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={styles.linkTitle}>
                                    {t("lessons:jungLessons.detail.explore.tarotTitle", {
                                        defaultValue: "Tarot meanings",
                                    })}
                                </Text>
                                <Text style={styles.linkSub}>
                                    {t("lessons:jungLessons.detail.explore.tarotSub", {
                                        defaultValue: "Open Major Arcana meanings",
                                    })}
                                </Text>
                            </View>
                            {/* START: ink chevron for parchment */}
                            {/* <Ionicons name="chevron-forward" size={18} color="#FFD700" /> */}
                            <Ionicons name="chevron-forward" size={18} color={PARCHMENT.inkSoft} />
                            {/* END: ink chevron for parchment */}
                        </Pressable>

                        <Pressable
                            onPress={() =>
                                navigation.navigate("JungQuestions", {
                                    tip: "jung",
                                    brojKarata: 5,
                                    lessonId, // BITNO: da može da markira “ovu lekciju”
                                })
                            }
                            style={styles.linkCard}
                            accessibilityRole="button"
                            accessibilityLabel={t("lessons:jungLessons.detail.explore.jungTitle", {
                                defaultValue: "Explore Jung Questions",
                            })}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={styles.linkTitle}>
                                    {t("lessons:jungLessons.detail.explore.jungTitle", {
                                        defaultValue: "Explore Jung Questions",
                                    })}
                                </Text>
                                <Text style={styles.linkSub}>
                                    {t("lessons:jungLessons.detail.explore.jungSub", {
                                        defaultValue: "Pick a question and interpret with cards",
                                    })}
                                </Text>
                                <Text style={styles.priceNote}>
                                    {t("lessons:jungLessons.detail.explore.jungPriceNote", {
                                        defaultValue: "Reading: 100 🪙",
                                    })}
                                </Text>
                            </View>
                            {/* START: ink chevron for parchment */}
                            {/* <Ionicons name="chevron-forward" size={18} color="#FFD700" /> */}
                            <Ionicons name="chevron-forward" size={18} color={PARCHMENT.inkSoft} />
                            {/* END: ink chevron for parchment */}
                        </Pressable>
                    </View>
                </ScrollView>
            </ImageBackground>
        </View>
        // END: parchment layout wrapper
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#0d0d19" },

    // START: parchment frame + transparent scroll
    scroll: { flex: 1, backgroundColor: "transparent" },
    paper: {
        flex: 1,
        margin: 12,
        borderRadius: 18,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
    },
    paperImage: { resizeMode: "cover" },
    // END: parchment frame + transparent scroll

    // Android bottom nav bar safe padding
    container: {
        padding: 16,
        paddingBottom: Platform.select({ android: 120, default: 28 }),
    },

    kicker: {
        fontSize: 12,
        // opacity: 0.7,
        opacity: 1,
        marginBottom: 6,
        // color: "rgba(255,255,255,0.75)",
        color: PARCHMENT.inkSoft,
    },

    // title: { fontSize: 22, fontWeight: "800", color: "white" },
    title: {
        fontSize: 22,
        fontWeight: "900",
        color: PARCHMENT.ink,
        fontFamily: Platform.select({ ios: "Georgia", android: "serif", default: undefined }),
        letterSpacing: 0.2,
    },

    oneLiner: {
        marginTop: 8,
        fontSize: 14,
        // opacity: 0.85,
        opacity: 1,
        lineHeight: 20,
        // color: "rgba(255,255,255,0.85)",
        color: "rgba(42,31,20,0.86)",
    },

    topNavRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    topNavBtn: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 12,
        borderWidth: 1,
        // borderColor: "rgba(255,255,255,0.10)",
        borderColor: PARCHMENT.border,
        // backgroundColor: "rgba(255,255,255,0.04)",
        backgroundColor: PARCHMENT.cardBg2,
    },
    topNavIconBtn: {
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 12,
        borderWidth: 1,
        // borderColor: "rgba(255,255,255,0.10)",
        borderColor: PARCHMENT.border,
        // backgroundColor: "rgba(255,255,255,0.04)",
        backgroundColor: PARCHMENT.cardBg2,
    },
    topNavText: {
        marginLeft: 8,
        // color: "rgba(255,255,255,0.92)",
        color: PARCHMENT.ink,
        fontWeight: "800",
        fontSize: 13,
    },

    // section: { marginTop: 18 },
    section: {
        marginTop: 18,
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: PARCHMENT.border,
        backgroundColor: PARCHMENT.cardBg,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
    },

    sectionTitle: {
        // fontSize: 16,
        fontSize: 15,
        fontWeight: "900",
        marginBottom: 10,
        // color: "white",
        color: PARCHMENT.ink,
        letterSpacing: 0.2,
    },

    body: {
        fontSize: 14,
        lineHeight: 21,
        // opacity: 0.92,
        opacity: 1,
        // color: "rgba(255,255,255,0.86)",
        color: "rgba(42,31,20,0.88)",
    },

    // START: completion button styles
    completeBtn: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        // borderColor: "rgba(255,255,255,0.10)",
        borderColor: PARCHMENT.border,
        // backgroundColor: "rgba(255,255,255,0.04)",
        backgroundColor: "rgba(255,255,255,0.55)",
    },
    completeBtnDone: {
        borderColor: "rgba(12,227,127,0.35)",
        backgroundColor: "rgba(12,227,127,0.08)",
    },
    completeIcon: { marginRight: 10 },
    // completeText: { color: "white", fontWeight: "900", fontSize: 14 },
    completeText: { color: PARCHMENT.ink, fontWeight: "900", fontSize: 14 },
    progressNote: {
        marginTop: 8,
        // color: "rgba(255,255,255,0.65)",
        color: PARCHMENT.inkSoft2,
        fontSize: 12,
        lineHeight: 16,
    },
    // END: completion button styles

    linkCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        // borderColor: "rgba(255,255,255,0.10)",
        borderColor: PARCHMENT.border,
        // backgroundColor: "rgba(255,255,255,0.04)",
        backgroundColor: "rgba(255,255,255,0.55)",
        marginBottom: 10,
    },
    // linkTitle: { color: "white", fontWeight: "900", fontSize: 14 },
    linkTitle: { color: PARCHMENT.ink, fontWeight: "900", fontSize: 14 },
    linkSub: {
        marginTop: 4,
        // color: "rgba(255,255,255,0.75)",
        color: PARCHMENT.inkSoft,
        fontSize: 12,
        lineHeight: 16,
    },
    priceNote: {
        marginTop: 6,
        // color: "rgba(255,215,0,0.90)",
        color: "rgba(176,122,42,0.95)",
        fontSize: 12,
        fontWeight: "900",
    },

    chips: { flexDirection: "row", flexWrap: "wrap" },
    chip: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 999,
        borderWidth: 1,
        // borderColor: "rgba(255,255,255,0.10)",
        borderColor: PARCHMENT.border,
        // backgroundColor: "rgba(255,255,255,0.04)",
        backgroundColor: "rgba(255,255,255,0.50)",
        marginRight: 8,
        marginBottom: 8,
    },
    // chipText: { fontSize: 12, opacity: 0.9, color: "rgba(255,255,255,0.88)" },
    chipText: { fontSize: 12, opacity: 1, color: PARCHMENT.ink, fontWeight: "800" },

    // START: “Reflection questions” bullets
    bulletBlock: { marginBottom: 12 },
    bulletRow: { flexDirection: "row" },
    // bullet: { width: 16, opacity: 0.9, color: "rgba(255,255,255,0.90)" },
    bullet: { width: 16, opacity: 1, color: PARCHMENT.ink },
    bulletText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
        // opacity: 0.9,
        opacity: 1,
        // color: "rgba(255,255,255,0.86)",
        color: "rgba(42,31,20,0.88)",
    },
    bulletWhy: {
        marginLeft: 16,
        marginTop: 6,
        fontSize: 12,
        lineHeight: 18,
        // color: "rgba(255,255,255,0.70)",
        color: PARCHMENT.inkSoft2,
    },
    // END: “Reflection questions” bullets
});
