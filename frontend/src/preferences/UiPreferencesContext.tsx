import {
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { UiPreferencesContext } from "./UiPreferencesContextValue";

export type ThemePreference = "light" | "dark" | "system";
export type LocalePreference = "tr" | "en";

export type NotificationPreferences = {
    email: boolean;
    browser: boolean;
    sounds: boolean;
};

export type DisplayPreferences = {
    densityMode: boolean;
    reduceMotion: boolean;
};

export type UiPreferencesContextType = {
    theme: ThemePreference;
    locale: LocalePreference;
    notifications: NotificationPreferences;
    display: DisplayPreferences;
    resolvedTheme: "light" | "dark";
    setTheme: (theme: ThemePreference) => void;
    setLocale: (locale: LocalePreference) => void;
    setNotifications: (notifications: NotificationPreferences) => void;
    setDisplay: (display: DisplayPreferences) => void;
    resetPreferences: () => void;
};

const STORAGE_THEME = "fp-theme";
const STORAGE_LOCALE = "fp-locale";
const STORAGE_NOTIFICATIONS = "fp-notifications";
const STORAGE_DISPLAY = "fp-display";

const DEFAULT_THEME: ThemePreference = "system";
const DEFAULT_LOCALE: LocalePreference = "tr";
const DEFAULT_NOTIFICATIONS: NotificationPreferences = {
    email: true,
    browser: false,
    sounds: true,
};
const DEFAULT_DISPLAY: DisplayPreferences = {
    densityMode: false,
    reduceMotion: false,
};

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

function readStoredJson<T>(key: string, fallback: T): T {
    if (!canUseStorage()) return fallback;

    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;

    try {
        return { ...fallback, ...(JSON.parse(raw) as Partial<T>) };
    } catch {
        return fallback;
    }
}

function resolveTheme(theme: ThemePreference, prefersDark: boolean) {
    if (theme === "system") return prefersDark ? "dark" : "light";
    return theme;
}

export function UiPreferencesProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<ThemePreference>(() => readStoredTheme());
    const [locale, setLocale] = useState<LocalePreference>(() => readStoredLocale());
    const [notifications, setNotifications] = useState<NotificationPreferences>(() =>
        readStoredJson<NotificationPreferences>(STORAGE_NOTIFICATIONS, DEFAULT_NOTIFICATIONS),
    );
    const [display, setDisplay] = useState<DisplayPreferences>(() =>
        readStoredJson<DisplayPreferences>(STORAGE_DISPLAY, DEFAULT_DISPLAY),
    );
    const [prefersDark, setPrefersDark] = useState(() => {
        if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
    });

    useEffect(() => {
        if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const onChange = (event: MediaQueryListEvent) => setPrefersDark(event.matches);

        mediaQuery.addEventListener("change", onChange);
        return () => mediaQuery.removeEventListener("change", onChange);
    }, []);

    const resolvedTheme = useMemo(() => resolveTheme(theme, prefersDark), [theme, prefersDark]);

    useEffect(() => {
        if (!canUseStorage()) return;
        window.localStorage.setItem(STORAGE_THEME, theme);
    }, [theme]);

    useEffect(() => {
        if (!canUseStorage()) return;
        window.localStorage.setItem(STORAGE_LOCALE, locale);
    }, [locale]);

    useEffect(() => {
        if (!canUseStorage()) return;
        window.localStorage.setItem(STORAGE_NOTIFICATIONS, JSON.stringify(notifications));
    }, [notifications]);

    useEffect(() => {
        if (!canUseStorage()) return;
        window.localStorage.setItem(STORAGE_DISPLAY, JSON.stringify(display));
    }, [display]);

    useEffect(() => {
        const root = document.documentElement;

        root.lang = locale;
        root.classList.toggle("fp-theme-dark", resolvedTheme === "dark");
        root.classList.toggle("fp-theme-light", resolvedTheme === "light");
        root.classList.toggle("fp-density-compact", display.densityMode);
        root.classList.toggle("fp-reduce-motion", display.reduceMotion);
        root.dataset.fpTheme = resolvedTheme;
    }, [display.densityMode, display.reduceMotion, locale, resolvedTheme]);

    const resetPreferences = () => {
        setTheme(DEFAULT_THEME);
        setLocale(DEFAULT_LOCALE);
        setNotifications(DEFAULT_NOTIFICATIONS);
        setDisplay(DEFAULT_DISPLAY);

        if (!canUseStorage()) return;
        window.localStorage.removeItem(STORAGE_THEME);
        window.localStorage.removeItem(STORAGE_LOCALE);
        window.localStorage.removeItem(STORAGE_NOTIFICATIONS);
        window.localStorage.removeItem(STORAGE_DISPLAY);
    };

    const value = useMemo<UiPreferencesContextType>(
        () => ({
            theme,
            locale,
            notifications,
            display,
            resolvedTheme,
            setTheme,
            setLocale,
            setNotifications,
            setDisplay,
            resetPreferences,
        }),
        [theme, locale, notifications, display, resolvedTheme],
    );

    return <UiPreferencesContext.Provider value={value}>{children}</UiPreferencesContext.Provider>;
}
