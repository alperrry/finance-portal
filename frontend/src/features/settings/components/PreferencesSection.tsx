import { Box, Button, Card, CardContent, Divider, FormControl, InputLabel, MenuItem, Select, Stack, Typography } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import {
    type DisplayPreferences,
    type LocalePreference,
    type NotificationPreferences,
    type ThemePreference,
} from "../../../app/providers/UiPreferencesProvider";
import { useUiPreferences } from "../../../app/providers/UiPreferencesContext";
import { useToast } from "../../../components/ToastContext";
import { ThemeControl } from "./ThemeControl";
import { ToggleRow } from "./ToggleRow";

export function PreferencesSection() {
    const { showToast } = useToast();
    const { theme, locale, notifications, display, resolvedTheme, setTheme, setLocale, setNotifications, setDisplay, resetPreferences } =
        useUiPreferences();

    const updateTheme = (next: ThemePreference) => {
        if (next === theme) return;
        setTheme(next);
        showToast("Tercih kaydedildi", "success");
    };

    const updateLocale = (event: SelectChangeEvent) => {
        const next = event.target.value as LocalePreference;
        if (next === locale) return;
        setLocale(next);
        showToast("Tercih kaydedildi", "success");
    };

    const updateNotifications = (next: NotificationPreferences) => {
        setNotifications(next);
        showToast("Tercih kaydedildi", "success");
    };

    const updateDisplay = (next: DisplayPreferences) => {
        setDisplay(next);
        showToast("Tercih kaydedildi", "success");
    };

    const handleReset = () => {
        resetPreferences();
        showToast("Tercihler sıfırlandı", "info");
    };

    return (
        <Box id="settings-panel-preferences" role="tabpanel" aria-labelledby="settings-tab-preferences">
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" }, gap: 2, mb: 2 }}>
                <Card>
                    <CardContent>
                        <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>Tema</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2, mb: 1 }}>Görünüm modu</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Tema değişikliği anında uygulanır ve sonraki açılışlarda korunur.
                        </Typography>
                        <ThemeControl value={theme} resolvedTheme={resolvedTheme} onChange={updateTheme} />
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>Dil</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2, mb: 2 }}>Arayüz dili</Typography>
                        <FormControl size="small" fullWidth>
                            <InputLabel id="settings-locale-label">Dil seçimi</InputLabel>
                            <Select
                                labelId="settings-locale-label"
                                id="settings-locale"
                                value={locale}
                                label="Dil seçimi"
                                onChange={updateLocale}
                            >
                                <MenuItem value="tr">Türkçe</MenuItem>
                                <MenuItem value="en">English</MenuItem>
                            </Select>
                        </FormControl>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                            Şu an bu seçim sadece localStorage'a yazılır; tam i18n entegrasyonu sonraki aşamaya bırakıldı.
                        </Typography>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>Bildirimler</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2, mb: 1 }}>Uyarı tercihleri</Typography>
                        <Divider sx={{ mb: 0.5 }} />
                        <ToggleRow
                            title="Email bildirimleri"
                            description="Haber özeti ve portföy hareketleri için e-posta tercihi."
                            checked={notifications.email}
                            onToggle={() => updateNotifications({ ...notifications, email: !notifications.email })}
                        />
                        <ToggleRow
                            title="Tarayıcı bildirimleri"
                            description="Gerçek zamanlı uyarılar için tarayıcı tercih kaydı."
                            checked={notifications.browser}
                            onToggle={() => updateNotifications({ ...notifications, browser: !notifications.browser })}
                        />
                        <ToggleRow
                            title="İşlem onay sesleri"
                            description="Portföy veya emir benzeri aksiyonlar için ses tercihi."
                            checked={notifications.sounds}
                            onToggle={() => updateNotifications({ ...notifications, sounds: !notifications.sounds })}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>Görünüm</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2, mb: 1 }}>Kullanım rahatlığı</Typography>
                        <Divider sx={{ mb: 0.5 }} />
                        <ToggleRow
                            title="Yoğun mod"
                            description="Daha kompakt boşluklar ve daha sık görünüm."
                            checked={display.densityMode}
                            onToggle={() => updateDisplay({ ...display, densityMode: !display.densityMode })}
                        />
                        <ToggleRow
                            title="Animasyonları azalt"
                            description="Hareket miktarını düşürür; erişilebilirlik için yararlıdır."
                            checked={display.reduceMotion}
                            onToggle={() => updateDisplay({ ...display, reduceMotion: !display.reduceMotion })}
                        />
                    </CardContent>
                </Card>
            </Box>

            <Stack direction="row" sx={{ justifyContent: "flex-end" }}>
                <Button variant="outlined" onClick={handleReset}>
                    Tercihleri sıfırla
                </Button>
            </Stack>
        </Box>
    );
}
