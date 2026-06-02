import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { keycloak } from "../auth/keycloak";
import i18n from "../../i18n";
import {
    fetchMyPreferences,
    updateMyPreferences,
    type LocaleValue,
    type PreferencesPayload,
    type ThemeValue,
} from "../../services/api/preferencesApi";
import { UiPreferencesContext } from "./UiPreferencesContext";

// Tipleri preferencesApi ile aynı tutuyoruz; alias olarak yeniden export.
export type ThemePreference = ThemeValue;
export type LocalePreference = LocaleValue;

export type UiPreferencesContextType = {
    theme: ThemePreference;
    locale: LocalePreference;
    resolvedTheme: "light" | "dark";
    setTheme: (theme: ThemePreference) => void;
    setLocale: (locale: LocalePreference) => void;
    resetPreferences: () => void;
    isSyncing: boolean;
};

const STORAGE_THEME = "fp-theme";
const STORAGE_LOCALE = "fp-locale";

export function clearUiPreferencesStorage() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(STORAGE_THEME);
    window.localStorage.removeItem(STORAGE_LOCALE);
}

const DEFAULT_THEME: ThemePreference = "system";
const DEFAULT_LOCALE: LocalePreference = "tr";

const SYNC_DEBOUNCE_MS = 600;

function canUseStorage() {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readStoredTheme(): ThemePreference {
    if (!canUseStorage()) return DEFAULT_THEME;
    const raw = window.localStorage.getItem(STORAGE_THEME);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
    return DEFAULT_THEME;
}

function readStoredLocale(): LocalePreference {
    if (!canUseStorage()) return DEFAULT_LOCALE;
    const raw = window.localStorage.getItem(STORAGE_LOCALE);
    if (raw === "tr" || raw === "en") return raw;
    return DEFAULT_LOCALE;
}


function resolveTheme(theme: ThemePreference, prefersDark: boolean) {
    if (theme === "system") return prefersDark ? "dark" : "light";
    return theme;
}

function payloadToState(payload: PreferencesPayload) {
    return {
        theme: payload.theme,
        locale: payload.locale,
    };
}

function stateToPayload(
    theme: ThemePreference,
    locale: LocalePreference,
): PreferencesPayload {
    return { theme, locale };
}

export function UiPreferencesProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<ThemePreference>(() => readStoredTheme());
    const [locale, setLocale] = useState<LocalePreference>(() => readStoredLocale());
    const [prefersDark, setPrefersDark] = useState(() => {
        if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
    });
    const [isSyncing, setIsSyncing] = useState(false);

    // Sistem teması izleme (matchMedia)
    useEffect(() => {
        if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const onChange = (event: MediaQueryListEvent) => setPrefersDark(event.matches);
        mediaQuery.addEventListener("change", onChange);
        return () => mediaQuery.removeEventListener("change", onChange);
    }, []);

    const resolvedTheme = useMemo(() => resolveTheme(theme, prefersDark), [theme, prefersDark]);

    // localStorage senkron (her değişiklikte hemen yazılır)
    useEffect(() => {
        if (!canUseStorage()) return;
        window.localStorage.setItem(STORAGE_THEME, theme);
    }, [theme]);

    useEffect(() => {
        if (!canUseStorage()) return;
        window.localStorage.setItem(STORAGE_LOCALE, locale);
    }, [locale]);

    useEffect(() => {
        i18n.changeLanguage(locale);
    }, [locale]);

    // DOM class / data-attribute güncelleme
    useEffect(() => {
        const root = document.documentElement;
        root.lang = locale;
        root.classList.toggle("fp-theme-dark", resolvedTheme === "dark");
        root.classList.toggle("fp-theme-light", resolvedTheme === "light");
        root.dataset.fpTheme = resolvedTheme;
    }, [locale, resolvedTheme]);

    // --- Backend senkronizasyonu ---

    // hydratedRef: backend'den ilk çekme bitti mi?
    // false iken hiçbir PUT atılmaz (yoksa hydration sırasında kendi state'imizi geri yollardık).
    const hydratedRef = useRef(false);

    // İlk mount + onAuthSuccess: backend'den çek, state'i ezdir.
    // UiPreferencesProvider, AuthProvider'ın ebeveyniyken mount anında keycloak.authenticated
    // false olabilir (keycloak.init() henüz çözümlenmemiş). onAuthSuccess callback'ine
    // bağlanarak gecikmiş init'i de yakalıyoruz.
    useEffect(() => {
        let cancelled = false;

        const doHydrate = () => {
            if (hydratedRef.current || cancelled) return;
            setIsSyncing(true);
            fetchMyPreferences()
                .then((payload) => {
                    if (cancelled) return;
                    const next = payloadToState(payload);
                    setTheme(next.theme);
                    setLocale(next.locale);
                    hydratedRef.current = true;
                })
                .catch(() => {
                    // apiFetch zaten toast atar; localStorage'daki değerlerle devam.
                })
                .finally(() => {
                    if (!cancelled) setIsSyncing(false);
                });
        };

        // Keycloak init mount'tan önce tamamlandıysa hemen hydrate et
        if (keycloak.authenticated) {
            doHydrate();
        }

        // Keycloak init geç tamamlanırsa yakala
        const prevOnAuthSuccess = keycloak.onAuthSuccess;
        keycloak.onAuthSuccess = () => {
            prevOnAuthSuccess?.();
            doHydrate();
        };

        return () => {
            cancelled = true;
            keycloak.onAuthSuccess = prevOnAuthSuccess;
        };
    }, []);

    // Debounce'lu PUT: hydration tamamlandıktan sonra state değiştikçe backend'e yazar.
    const syncTimerRef = useRef<number | null>(null);
    useEffect(() => {
        if (!hydratedRef.current) return;
        if (!keycloak.authenticated) return;

        if (syncTimerRef.current !== null) {
            window.clearTimeout(syncTimerRef.current);
        }

        syncTimerRef.current = window.setTimeout(() => {
            setIsSyncing(true);
            updateMyPreferences(stateToPayload(theme, locale))
                .catch(() => {
                    // apiFetch toast atar; localStorage zaten güncel, kayıp yok.
                })
                .finally(() => setIsSyncing(false));
        }, SYNC_DEBOUNCE_MS);

        return () => {
            if (syncTimerRef.current !== null) {
                window.clearTimeout(syncTimerRef.current);
            }
        };
    }, [theme, locale]);

    const resetPreferences = useCallback(() => {
        setTheme(DEFAULT_THEME);
        setLocale(DEFAULT_LOCALE);
    }, []);

    const value = useMemo<UiPreferencesContextType>(
        () => ({
            theme,
            locale,
            resolvedTheme,
            setTheme,
            setLocale,
            resetPreferences,
            isSyncing,
        }),
        [theme, locale, resolvedTheme, resetPreferences, isSyncing],
    );

    return <UiPreferencesContext.Provider value={value}>{children}</UiPreferencesContext.Provider>;
}