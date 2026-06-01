import { useMemo, type ReactNode } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { trTR, enUS } from "@mui/material/locale";
import { useUiPreferences } from "./UiPreferencesContext";
import { kapitalTheme, kapitalDarkTheme } from "../../theme/kapitalTheme";

export function AppThemeProvider({ children }: { children: ReactNode }) {
    const { resolvedTheme, locale } = useUiPreferences();

    const theme = useMemo(() => {
        const base = resolvedTheme === "dark" ? kapitalDarkTheme : kapitalTheme;
        const muiLocale = locale === "tr" ? trTR : enUS;
        return createTheme(base, muiLocale);
    }, [resolvedTheme, locale]);

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
        </ThemeProvider>
    );
}
