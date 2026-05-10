import { createContext, useContext } from "react";
import type { UiPreferencesContextType } from "./UiPreferencesProvider";

export const UiPreferencesContext = createContext<UiPreferencesContextType | null>(null);

export function useUiPreferences() {
    const context = useContext(UiPreferencesContext);
    if (!context) {
        throw new Error("useUiPreferences must be used within UiPreferencesProvider");
    }

    return context;
}
