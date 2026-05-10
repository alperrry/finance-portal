import { ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import type { ThemePreference } from "../../../app/providers/UiPreferencesProvider";

type Props = {
    value: ThemePreference;
    resolvedTheme: "light" | "dark";
    onChange: (next: ThemePreference) => void;
};

export function ThemeControl({ value, resolvedTheme, onChange }: Props) {
    const options: Array<{ id: ThemePreference; label: string; hint: string }> = [
        { id: "light", label: "Açık", hint: "Parlak arayüz" },
        { id: "dark", label: "Koyu", hint: "Düşük ışık" },
        { id: "system", label: "Sistem", hint: `Şu an: ${resolvedTheme === "dark" ? "Koyu" : "Açık"}` },
    ];

    return (
        <ToggleButtonGroup
            exclusive
            value={value}
            onChange={(_, next: ThemePreference | null) => { if (next) onChange(next); }}
            aria-label="Tema seçimi"
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
