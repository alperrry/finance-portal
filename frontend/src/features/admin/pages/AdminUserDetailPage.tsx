import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    Alert,
    Avatar,
    Box,
    Button,
    Paper,
    Typography,
} from "@mui/material";
import { useAdminUserAuditTrail } from "../api/useAdminUserAuditTrail";
import { useAdminUserDetail } from "../api/useAdminUserDetail";
import { useResetUser2FA } from "../api/useResetUser2FA";
import { useUpdateUserRole } from "../api/useUpdateUserRole";
import { useUpdateUserStatus } from "../api/useUpdateUserStatus";
import {
    ChangeRoleDialog,
    ChangeStatusDialog,
    Reset2FADialog,
    type AdminDialogState,
} from "../components/AdminDialogs";
import type { AdminUserListItem, AdminUserRole, AdminUserStatus, AuditLogItem } from "../types/admin.types";

const PANEL_SX = {
    borderRadius: "22px",
    overflow: "hidden",
    bgcolor: "rgba(247, 245, 241, 0.92)",
    border: "1px solid",
    borderColor: "rgba(255, 255, 255, 0.72)",
    boxShadow: "0 18px 52px rgba(17, 17, 17, 0.09)",
} as const;

const PANEL_HEAD_SX = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 2,
    p: "20px 22px",
    borderBottom: "1px solid",
    borderColor: "divider",
} as const;

const AUDIT_ITEM_SX = {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 2,
    px: 2.25,
    py: 1.5,
    borderBottom: "1px solid",
    borderColor: "divider",
    "&:last-child": { borderBottom: 0 },
} as const;

function formatDateTime(value: string | null | undefined) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("tr-TR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function displayName(user: AdminUserListItem) {
    return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username;
}

function toDialogUser(user: AdminUserListItem): AdminUserListItem {
    return user;
}

function auditTime(item: AuditLogItem) {
    return formatDateTime(item.createdAt ?? item.timestamp ?? null);
}

export function AdminUserDetailPage() {
    const params = useParams<{ id: string }>();
    const navigate = useNavigate();
    const userId = Number(params.id);
    const validUserId = Number.isFinite(userId) && userId > 0 ? userId : null;
    const detail = useAdminUserDetail(validUserId);
    const auditTrail = useAdminUserAuditTrail(validUserId);
    const [dialog, setDialog] = useState<AdminDialogState>(null);
    const roleMutation = useUpdateUserRole();
    const statusMutation = useUpdateUserStatus();
    const resetMutation = useResetUser2FA();

    const user = detail.data;
    const dialogUser = useMemo(() => (user ? toDialogUser(user) : null), [user]);
    const closeDialog = () => setDialog(null);

    if (!validUserId) {
        return <Alert severity="error" sx={{ m: 2 }}>Geçersiz kullanıcı ID.</Alert>;
    }

    return (
        <Box sx={{ display: "grid", gap: 2.25 }}>
            <Box>
                <Button variant="outlined" size="small" onClick={() => navigate("/admin/users")}>
                    ← Kullanıcılara dön
                </Button>
            </Box>

            {detail.loading ? <Typography sx={{ p: "22px", color: "text.secondary" }}>Kullanıcı detayı yükleniyor...</Typography> : null}
            {!detail.loading && detail.error ? <Alert severity="error" sx={{ m: 0 }}>{detail.error}</Alert> : null}

            {user ? (
                <>
                    <Paper sx={PANEL_SX}>
                        <Box sx={{ p: "22px 24px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                <Avatar sx={{ width: 56, height: 56, bgcolor: "#111", color: "#fff", fontSize: 18, fontWeight: 800 }}>
                                    {displayName(user).slice(0, 2).toLocaleUpperCase("tr-TR")}
                                </Avatar>
                                <Box>
                                    <Typography variant="h5" sx={{ fontWeight: 700 }}>{displayName(user)}</Typography>
                                    <Typography variant="body2" color="text.secondary">@{user.username}</Typography>
                                </Box>
                            </Box>
                            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                                <Button variant="outlined" size="small" onClick={() => setDialog({ type: "role", user: dialogUser ?? user })}>
                                    Rol değiştir
                                </Button>
                                <Button variant="outlined" size="small" onClick={() => setDialog({ type: "status", user: dialogUser ?? user })}>
                                    Durum değiştir
                                </Button>
                                <Button variant="contained" color="error" size="small" onClick={() => setDialog({ type: "reset-2fa", user: dialogUser ?? user })}>
                                    2FA sıfırla
                                </Button>
                            </Box>
                        </Box>
                    </Paper>

                    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 1.5 }}>
                        <Metric label="E-posta" value={user.email} />
                        <Metric label="Rol" value={user.role === "ADMIN" ? "Admin" : "Normal Kullanıcı"} />
                        <Metric label="Durum" value={user.status === "ACTIVE" ? "Aktif" : "Pasif"} />
                        <Metric label="2FA" value={user.twoFactorEnabled ? "Aktif" : "Kapalı"} />
                        <Metric label="Oluşturma" value={formatDateTime(user.createdAt)} />
                        <Metric label="Son giriş" value={formatDateTime(user.lastLoginAt)} />
                        <Metric label="Portföy" value={String(user.portfolioCount ?? "-")} />
                    </Box>

                    <Paper sx={PANEL_SX}>
                        <Box sx={PANEL_HEAD_SX}>
                            <Box>
                                <Typography sx={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "text.secondary" }}>
                                    Audit Trail
                                </Typography>
                                <Typography variant="h6" sx={{ mt: 0.5, fontSize: 24, letterSpacing: 0, fontWeight: 700 }}>Son kayıtlar</Typography>
                            </Box>
                        </Box>
                        {auditTrail.loading ? <Typography sx={{ p: "22px", color: "text.secondary" }}>Audit kayıtları yükleniyor...</Typography> : null}
                        {!auditTrail.loading && auditTrail.error ? <Alert severity="error" sx={{ m: 2 }}>{auditTrail.error}</Alert> : null}
                        {!auditTrail.loading && !auditTrail.error && auditTrail.data.length === 0 ? <Typography sx={{ p: "22px", color: "text.secondary" }}>Kayıt bulunamadı.</Typography> : null}
                        {!auditTrail.loading && !auditTrail.error && auditTrail.data.length > 0 ? (
                            <Box>
                                {auditTrail.data.slice(0, 8).map((item) => (
                                    <Box key={item.id} component="article" sx={AUDIT_ITEM_SX}>
                                        <Box>
                                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.action}</Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                                                {item.actorUsername ?? "Sistem"}{item.reason ? `: ${item.reason}` : ""}
                                            </Typography>
                                        </Box>
                                        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                                            {auditTime(item)}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                        ) : null}
                    </Paper>
                </>
            ) : null}

            <ChangeRoleDialog
                state={dialog}
                pending={roleMutation.pending}
                onClose={closeDialog}
                onSubmit={async (role: AdminUserRole, reason: string) => {
                    if (!dialog?.user) return;
                    await roleMutation.mutate(dialog.user.id, { role, reason });
                    closeDialog();
                }}
            />
            <ChangeStatusDialog
                state={dialog}
                pending={statusMutation.pending}
                onClose={closeDialog}
                onSubmit={async (status: AdminUserStatus, reason: string) => {
                    if (!dialog?.user) return;
                    await statusMutation.mutate(dialog.user.id, { status, reason });
                    closeDialog();
                }}
            />
            <Reset2FADialog
                state={dialog}
                pending={resetMutation.pending}
                onClose={closeDialog}
                onSubmit={async (reason: string) => {
                    if (!dialog?.user) return;
                    await resetMutation.mutate(dialog.user.id, { reason });
                    closeDialog();
                }}
            />
        </Box>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <Paper elevation={0} sx={{ borderRadius: "18px", p: 2, border: "1px solid", borderColor: "divider", bgcolor: "rgba(255,255,255,0.7)" }}>
            <Typography sx={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "text.secondary", fontFamily: '"JetBrains Mono", monospace' }}>
                {label}
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 700, mt: 0.5 }}>{value}</Typography>
        </Paper>
    );
}
