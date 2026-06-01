import { Box, Card, CardContent, Tab, Tabs, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SETTINGS_SECTIONS, type SettingsSection } from "../types";

type Props = {
    activeSection: SettingsSection;
};

export function SettingsTabs({ activeSection }: Props) {
    const navigate = useNavigate();
    const { t } = useTranslation();

    return (
        <Card sx={{ width: { xs: "100%", md: 220 }, flexShrink: 0 }}>
            <CardContent sx={{ pb: "8px !important" }}>
                <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>
                    {t("settings.sections.overline")}
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                    {t("nav.settings")}
                </Typography>
            </CardContent>
            <Tabs
                orientation="vertical"
                value={activeSection}
                onChange={(_, value: SettingsSection) => navigate(`/settings/${value}`)}
                aria-label={t("settings.sections.ariaLabel")}
                sx={{ "& .MuiTab-root": { alignItems: "flex-start", textAlign: "left", minHeight: 56, px: 2 } }}
            >
                {SETTINGS_SECTIONS.map((section) => (
                    <Tab
                        key={section.id}
                        value={section.id}
                        label={
                            <Box>
                                <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                                    {t(`settings.tabs.${section.id}.label`)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                    {t(`settings.tabs.${section.id}.description`)}
                                </Typography>
                            </Box>
                        }
                    />
                ))}
            </Tabs>
        </Card>
    );
}
