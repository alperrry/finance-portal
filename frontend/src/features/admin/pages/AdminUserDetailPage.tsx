import { useNavigate, useParams } from "react-router-dom";
import {
    Alert,
    Box,
    Button,
    Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import {
    ChangeRoleDialog,
    ChangeStatusDialog,
    Reset2FADialog,
} from "../components/AdminDialogs";
import { useAdminUserDetailPage } from "../hooks/useAdminUserDetailPage";
import { UserDetailHeader } from "../components/UserDetailHeader";
import { UserDetailMetrics } from "../components/UserDetailMetrics";
import { AuditTrail } from "../components/AuditTrail";

function parseUserId(raw: string | undefined): number | null {
    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : null;
}

export function AdminUserDetailPage() {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const userId = parseUserId(id);

    const { user, detail, auditTrail, dialogs, handlers, pending } =
        useAdminUserDetailPage(userId);

    if (!userId) {
        return <Alert severity="error" sx={{ m: 2 }}>{t("admin.userDetail.invalidId")}</Alert>;
    }

    return (
        <Box sx={{ display: "grid", gap: 2.25 }}>
            <Box>
                <Button variant="outlined" size="small" onClick={() => navigate("/admin/users")}>
                    {t("admin.userDetail.backButton")}
                </Button>
            </Box>

            {detail.loading && (
                <Typography sx={{ p: "22px", color: "text.secondary" }}>
                    {t("admin.userDetail.loading")}
                </Typography>
            )}
            {!detail.loading && detail.error && (
                <Alert severity="error" sx={{ m: 0 }}>{detail.error}</Alert>
            )}

            {user && (
                <>
                    <UserDetailHeader
                        user={user}
                        onRoleClick={dialogs.openRole}
                        onStatusClick={dialogs.openStatus}
                        onReset2FAClick={dialogs.openReset2FA}
                    />

                    <UserDetailMetrics user={user} />

                    <AuditTrail
                        loading={auditTrail.loading}
                        error={auditTrail.error}
                        data={auditTrail.data}
                    />
                </>
            )}

            <ChangeRoleDialog
                state={dialogs.state}
                pending={pending.role}
                onClose={dialogs.close}
                onSubmit={handlers.onRoleSubmit}
            />
            <ChangeStatusDialog
                state={dialogs.state}
                pending={pending.status}
                onClose={dialogs.close}
                onSubmit={handlers.onStatusSubmit}
            />
            <Reset2FADialog
                state={dialogs.state}
                pending={pending.reset}
                onClose={dialogs.close}
                onSubmit={handlers.onResetSubmit}
            />
        </Box>
    );
}
