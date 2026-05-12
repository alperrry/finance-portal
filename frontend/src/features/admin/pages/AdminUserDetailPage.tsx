import { useNavigate, useParams } from "react-router-dom";
// AdminUserDetailPage.tsx
import {
    Alert,
    Box,
    Button,
    Typography,
} from "@mui/material";
import {
    ChangeRoleDialog,
    ChangeStatusDialog,
    Reset2FADialog,
} from "../components/AdminDialogs";
import { useAdminUserDetailPage } from "../hooks/useAdminUserDetailPage";
import { UserDetailHeader } from "../components/UserDetailHeader";
import { UserDetailMetrics } from "../components/UserDetailMetrics";
import { AuditTrail } from "../components/AuditTrail";
// ─── Yardımcılar ─────────────────────────────────────────────────────────────

function parseUserId(raw: string | undefined): number | null {
    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : null;
}



// ─── Sayfa ───────────────────────────────────────────────────────────────────

export function AdminUserDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const userId = parseUserId(id);

    const { user, detail, auditTrail, dialogs, handlers, pending } =
        useAdminUserDetailPage(userId);

    if (!userId) {
        return <Alert severity="error" sx={{ m: 2 }}>Geçersiz kullanıcı ID.</Alert>;
    }

    return (
        <Box sx={{ display: "grid", gap: 2.25 }}>
            <Box>
                <Button variant="outlined" size="small" onClick={() => navigate("/admin/users")}>
                    ← Kullanıcılara dön
                </Button>
            </Box>

            {detail.loading && (
                <Typography sx={{ p: "22px", color: "text.secondary" }}>
                    Kullanıcı detayı yükleniyor...
                </Typography>
            )}
            {!detail.loading && detail.error && (
                <Alert severity="error" sx={{ m: 0 }}>{detail.error}</Alert>
            )}

            {user && (
                <>
                    {/* Başlık: avatar + isim + aksiyon butonları */}
                    <UserDetailHeader
                        user={user}
                        onRoleClick={dialogs.openRole}
                        onStatusClick={dialogs.openStatus}
                        onReset2FAClick={dialogs.openReset2FA}
                    />

                    {/* Metrik kartları */}
                    <UserDetailMetrics user={user} />

                    {/* Audit trail */}
                    <AuditTrail
                        loading={auditTrail.loading}
                        error={auditTrail.error}
                        data={auditTrail.data}
                    />
                </>
            )}

            {/* Dialog'lar */}
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


