import { Box, Button, Card, CardContent, Divider, FormControl, InputLabel, MenuItem, Select, Stack, Typography } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import { useTranslation } from "react-i18next";
import {
    type DisplayPreferences,
    type LocalePreference,
    type ThemePreference,
} from "../../../app/providers/UiPreferencesProvider";
import { useUiPreferences } from "../../../app/providers/UiPreferencesContext";
import { useToast } from "../../../components/ToastContext";
import { ThemeControl } from "./ThemeControl";
import { ToggleRow } from "./ToggleRow";

export function PreferencesSection() {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const { theme, locale, display, resolvedTheme, setTheme, setLocale, setDisplay, resetPreferences } =
        useUiPreferences();

    const updateTheme = (next: ThemePreference) => {
        if (next === theme) return;
        setTheme(next);
        showToast(t("preferences.saved"), "success");
    };

    const updateLocale = (event: SelectChangeEvent) => {
        const next = event.target.value as LocalePreference;
        if (next === locale) return;
        setLocale(next);
        showToast(t("preferences.saved"), "success");
    };

    const updateDisplay = (next: DisplayPreferences) => {
        setDisplay(next);
        showToast(t("preferences.saved"), "success");
    };

    const handleReset = () => {
        resetPreferences();
        showToast(t("preferences.reset"), "info");
    };

    return (
        <Box id="settings-panel-preferences" role="tabpanel" aria-labelledby="settings-tab-preferences">
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" }, gap: 2, mb: 2 }}>
                <Card>
                    <CardContent>
                        <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>{t("preferences.theme.label")}</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2, mb: 1 }}>{t("preferences.theme.heading")}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {t("preferences.theme.description")}
                        </Typography>
                        <ThemeControl value={theme} resolvedTheme={resolvedTheme} onChange={updateTheme} />
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>{t("preferences.language.label")}</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2, mb: 2 }}>{t("preferences.language.heading")}</Typography>
                        <FormControl size="small" fullWidth>
                            <InputLabel id="settings-locale-label">{t("preferences.language.selectLabel")}</InputLabel>
                            <Select
                                labelId="settings-locale-label"
                                id="settings-locale"
                                value={locale}
                                label={t("preferences.language.selectLabel")}
                                onChange={updateLocale}
                            >
                                <MenuItem value="tr">{t("preferences.language.options.tr")}</MenuItem>
                                <MenuItem value="en">{t("preferences.language.options.en")}</MenuItem>
                            </Select>
                        </FormControl>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>{t("preferences.display.label")}</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2, mb: 1 }}>{t("preferences.display.heading")}</Typography>
                        <Divider sx={{ mb: 0.5 }} />
                        <ToggleRow
                            title={t("preferences.display.denseMode.title")}
                            description={t("preferences.display.denseMode.description")}
                            checked={display.densityMode}
                            onToggle={() => updateDisplay({ ...display, densityMode: !display.densityMode })}
                        />
                        <ToggleRow
                            title={t("preferences.display.reduceMotion.title")}
                            description={t("preferences.display.reduceMotion.description")}
                            checked={display.reduceMotion}
                            onToggle={() => updateDisplay({ ...display, reduceMotion: !display.reduceMotion })}
                        />
                    </CardContent>
                </Card>
            </Box>

            <Stack direction="row" sx={{ justifyContent: "flex-end" }}>
                <Button variant="outlined" onClick={handleReset}>
                    {t("preferences.resetButton")}
                </Button>
            </Stack>
        </Box>
    );
}
