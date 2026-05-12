import { Box, Chip } from "@mui/material";
import { useAuth } from "../../../app/auth/AuthContext";
import { KapitalShell } from "../../../components/layout";
import { PageHeader } from "../../../components/ui";
import { SectionPanel } from "../../../components/ui";
import { ProfileErrorAlert, ProfileLoadingSkeleton, ProfilePanels } from "../components/ProfilePageStates";
import { useProfileForm } from "../hooks/useProfileForm";

export default function ProfilePage() {
    const { currentUser, userLoading, userError, refreshCurrentUser } = useAuth();
    const formState = useProfileForm();

    return (
        <KapitalShell activePage="profile" showCategories={false}>
            <Box sx={{ p: { xs: 2, md: 3 } }}>
                <SectionPanel sx={{ mb: 3 }}>
                    <PageHeader
                        kicker="Hesap Merkezi"
                        title="Profilim"
                        actions={currentUser?.role === "ADMIN" ? <Chip label="Admin" color="secondary" size="small" /> : undefined}
                    />
                </SectionPanel>

                {userError ? <ProfileErrorAlert error={userError} onRetry={() => void refreshCurrentUser()} /> : null}

                {userLoading && !currentUser ? <ProfileLoadingSkeleton /> : null}

                {currentUser ? <ProfilePanels currentUser={currentUser} formState={formState} /> : null}
            </Box>
        </KapitalShell>
    );
}
