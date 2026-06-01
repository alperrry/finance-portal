import { ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { ThemePreference } from "../../../app/providers/UiPreferencesProvider";

type Props = {
    value: ThemePreference;
    resolvedTheme: "light" | "dark";
    onChange: (next: ThemePreference) => void;
};

export function ThemeControl({ value, resolvedTheme, onChange }: Props) {
    const { t } = useTranslation();

    const options: Array<{ id: ThemePreference; label: string; hint: string }> = [
        { id: "light", label: t("preferences.theme.light.label"), hint: t("preferences.theme.light.hint") },
        { id: "dark", label: t("preferences.theme.dark.label"), hint: t("preferences.theme.dark.hint") },
        {
            id: "system",
            label: t("preferences.theme.system.label"),
            hint: t("preferences.theme.system.hint", {
                current: resolvedTheme === "dark"
                    ? t("preferences.theme.dark.label")
                    : t("preferences.theme.light.label"),
            }),
        },
    ];

    return (
        <ToggleButtonGroup
            exclusive
            value={value}
            onChange={(_, next: ThemePreference | null) => { if (next) onChange(next); }}
            aria-label={t("preferences.theme.ariaLabel")}
            sx={{ flexWrap: "wrap" }}
        >
            {options.map((option) => (
                <ToggleButton key={option.id} value={option.id} sx={{ flexDirection: "column", px: 3, py: 1.5, minWidth: 90 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{option.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{option.hint}</Typography>
                </ToggleButton>
            ))}
        </ToggleButtonGroup>
    );
}
