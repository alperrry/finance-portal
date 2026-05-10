import type { ReactNode } from "react";
import { ThemeProvider } from "@mui/material";
import { useUiPreferences } from "./UiPreferencesContext";
import { kapitalDarkTheme, kapitalTheme } from "../../theme/kapitalTheme";

export function ThemeSelector({ children }: { children: ReactNode }) {
    const { resolvedTheme } = useUiPreferences();
    return (
        <ThemeProvider theme={resolvedTheme === "dark" ? kapitalDarkTheme : kapitalTheme}>
            {children}
        </ThemeProvider>
    );
}
