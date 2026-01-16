// src/data/jungLessonsCatalog.js

// START: Jung lessons catalog (maps lessonId -> i18n prefix for lessons.json)
export const jungLessonsCatalog = [
    { id: "intro-archetypes", order: 1, i18nPrefix: "jungLessons.introArchetypes" },
    { id: "persona", order: 2, i18nPrefix: "jungLessons.persona" },
    { id: "shadow", order: 3, i18nPrefix: "jungLessons.shadow" },
    { id: "anima-animus", order: 4, i18nPrefix: "jungLessons.animaAnimus" },
    { id: "self", order: 5, i18nPrefix: "jungLessons.self" },
    { id: "individuation", order: 6, i18nPrefix: "jungLessons.individuation" },
    { id: "hero", order: 7, i18nPrefix: "jungLessons.hero" },
    { id: "wise-guide", order: 8, i18nPrefix: "jungLessons.wiseGuide" },
    { id: "trickster", order: 9, i18nPrefix: "jungLessons.trickster" },
    { id: "great-mother", order: 10, i18nPrefix: "jungLessons.greatMother" },
    { id: "death-renewal", order: 11, i18nPrefix: "jungLessons.deathRenewal" },
    { id: "projection", order: 12, i18nPrefix: "jungLessons.projection" },
];

export const getJungLessonById = (lessonId) =>
    jungLessonsCatalog.find((l) => l.id === lessonId);
// END: Jung lessons catalog
