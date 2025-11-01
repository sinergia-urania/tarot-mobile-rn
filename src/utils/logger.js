// src/utils/logger.js

// START: centralni logger mute/level
// Čita se iz EAS env-a: EXPO_PUBLIC_LOGS = "1" (default, uključeni) | "0" (isključeni)
export const LOGS_ENABLED = String(process.env.EXPO_PUBLIC_LOGS ?? '1') === '1';

/**
 * Utišava globalni console.* prema opcijama.
 * - Podrazumevano GASI: log, info, debug, trace
 * - Podrazumevano OSTAVLJA: warn, error (da vidiš bitne poruke u produkciji)
 */
export function installConsoleMute({ keepWarnError = true } = {}) {
    // Ako su logovi uključeni — ne radi ništa
    if (LOGS_ENABLED) {
        global.__LOGS_DISABLED__ = false;
        return;
    }

    try {
        // Sačuvaj originalni console ako već nije sačuvan (da bi restore radio)
        if (!global.__ORIG_CONSOLE__) {
            global.__ORIG_CONSOLE__ = {
                log: console.log,
                info: console.info,
                debug: console.debug,
                trace: console.trace,
                warn: console.warn,
                error: console.error,
            };
        }

        const noop = () => { };

        // Utišaj bučne pozive
        console.log = noop;
        console.info = noop;
        console.debug = noop;
        console.trace = noop;

        // Po želji utišaj i warn/error
        if (!keepWarnError) {
            console.warn = noop;
            console.error = noop;
        }

        // Obeleži stanje globalno (korisno za debug ekrane)
        global.__LOGS_DISABLED__ = true;
        global.__LOGS_KEEP_WARN_ERROR__ = !!keepWarnError;
    } catch {
        // no-op (ne ruši app ako konzola nije dostupna iz nekog razloga)
    }
}

/**
 * Vraća originalni console iz memorije (ako je sačuvan).
 */
export function restoreConsole() {
    try {
        const orig = global.__ORIG_CONSOLE__;
        if (!orig) return;

        console.log = orig.log;
        console.info = orig.info;
        console.debug = orig.debug;
        console.trace = orig.trace;
        console.warn = orig.warn;
        console.error = orig.error;

        global.__LOGS_DISABLED__ = false;
        global.__LOGS_KEEP_WARN_ERROR__ = undefined;
    } catch {
        // no-op
    }
}

/**
 * Pomoćno: dohvat trenutnog mute stanja (za debug UI).
 */
export function getConsoleMuteState() {
    return {
        logsEnabledByEnv: LOGS_ENABLED,
        logsCurrentlyMuted: !!global.__LOGS_DISABLED__,
        keepWarnError: !!global.__LOGS_KEEP_WARN_ERROR__,
    };
}
// END: centralni logger mute/level
