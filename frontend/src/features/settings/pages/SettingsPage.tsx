import { Box, Stack } from "@mui/material";
import { Navigate, useParams } from "react-router-dom";
import { KapitalShell } from "../../../components/layout";
import { PageHeader } from "../../../components/ui/PageHeader";
import { SectionPanel } from "../../../components/ui/SectionPanel";
import { PreferencesSection } from "../components/PreferencesSection";
import { ProfileSection } from "../components/ProfileSection";
import { SecuritySection } from "../components/SecuritySection";
import { SettingsTabs } from "../components/SettingsTabs";
import { SETTINGS_SECTIONS, type SettingsSection } from "../types";
import { getSectionMeta } from "../utils/settingsFormatters";

export default function SettingsPage() {
    const params = useParams<{ section?: string }>();

    const section = params.section as SettingsSection | undefined;
    const isValidSection = SETTINGS_SECTIONS.some((item) => item.id === section);

    if (!section || !isValidSection) {
        return <Navigate to="/settings/profile" replace />;
    }

    const meta = getSectionMeta(section);

    return (
        <KapitalShell activePage="settings" showCategories={false}>
            <Box sx={{ p: { xs: 2, md: 3 } }}>
                <SectionPanel sx={{ mb: 3 }}>
                    <PageHeader kicker={meta.kicker} title={meta.title} subtitle={meta.subtitle} />
                </SectionPanel>

                <Stack direction={{ xs: "column", md: "row" }} sx={{ gap: 3, alignItems: "flex-start" }}>
                    <SettingsTabs activeSection={section} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        {section === "profile" ? <ProfileSection /> : null}
                        {section === "security" ? <SecuritySection /> : null}
                        {section === "preferences" ? <PreferencesSection /> : null}
                    </Box>
                </Stack>
            </Box>
        </KapitalShell>
    );
}
