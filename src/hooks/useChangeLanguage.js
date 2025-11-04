// START: useChangeLanguage hook (single source of truth za jezik)
import { useCallback, useState } from 'react';
import i18n from '../../i18n';
import { supabase } from '../utils/supabaseClient';

/**
 * useChangeLanguage
 * - Menja i18n jezik na nivou app-a
 * - Ako je korisnik ulogovan, upisuje vrednost u profiles.language
 * - Vraća { changeLanguage, isChanging, current }
 */
export default function useChangeLanguage() {
    const [isChanging, setIsChanging] = useState(false);

    const changeLanguage = useCallback(async (lng) => {
        const short = (lng || 'en').slice(0, 2);
        setIsChanging(true);
        try {
            // 1) i18n promene (samo ako je drugačiji)
            if (i18n.language?.slice(0, 2) !== short) {
                await i18n.changeLanguage(short);
            }

            // 2) pokušaj upisa u profil (ako postoji user)
            const { data, error: userErr } = await supabase.auth.getUser();
            if (userErr) {
                console.warn('[useChangeLanguage] getUser error:', userErr);
            }
            const userId = data?.user?.id;

            if (userId) {
                const { error: upErr } = await supabase
                    .from('profiles')
                    .update({ language: short }) // nema updated_at kolone u šemi
                    .eq('id', userId);

                if (upErr) {
                    console.warn('[useChangeLanguage] update profiles.language failed:', upErr);
                }
            }

            return short;
        } catch (e) {
            console.warn('[useChangeLanguage] changeLanguage failed:', e);
            throw e;
        } finally {
            setIsChanging(false);
        }
    }, []);

    return {
        changeLanguage,
        isChanging,
        current: i18n.language?.slice(0, 2) || 'en',
    };
}
// END: useChangeLanguage hook (single source of truth za jezik)
