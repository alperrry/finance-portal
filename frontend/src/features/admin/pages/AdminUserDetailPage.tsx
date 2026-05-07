import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
        return <div className="admin-error">Geçersiz kullanıcı ID.</div>;
    }

    return (
        <section className="admin-page">
            <button type="button" className="admin-secondary-btn inline" onClick={() => navigate("/admin/users")}>Kullanıcılara dön</button>

            {detail.loading ? <div className="admin-empty">Kullanıcı detayı yükleniyor...</div> : null}
            {!detail.loading && detail.error ? <div className="admin-error">{detail.error}</div> : null}

            {user ? (
                <>
                    <div className="admin-detail-hero">
                        <div className="admin-user-cell large">
                            <span>{displayName(user).slice(0, 2).toLocaleUpperCase("tr-TR")}</span>
                            <div>
                                <h2>{displayName(user)}</h2>
                                <small>@{user.username}</small>
                            </div>
                        </div>
                        <div className="admin-detail-actions">
                            <button type="button" className="admin-secondary-btn" onClick={() => setDialog({ type: "role", user: dialogUser ?? user })}>Rol değiştir</button>
                            <button type="button" className="admin-secondary-btn" onClick={() => setDialog({ type: "status", user: dialogUser ?? user })}>Durum değiştir</button>
                            <button type="button" className="admin-danger-btn" onClick={() => setDialog({ type: "reset-2fa", user: dialogUser ?? user })}>2FA sıfırla</button>
                        </div>
                    </div>

                    <div className="admin-metrics-grid">
                        <Metric label="E-posta" value={user.email} />
                        <Metric label="Rol" value={user.role === "ADMIN" ? "Admin" : "Normal Kullanıcı"} />
                        <Metric label="Durum" value={user.status === "ACTIVE" ? "Aktif" : "Pasif"} />
                        <Metric label="2FA" value={user.twoFactorEnabled ? "Aktif" : "Kapalı"} />
                        <Metric label="Oluşturma" value={formatDateTime(user.createdAt)} />
                        <Metric label="Son giriş" value={formatDateTime(user.lastLoginAt)} />
                        <Metric label="Portföy" value={String(user.portfolioCount ?? "-")} />
                    </div>

                    <section className="admin-panel">
                        <div className="admin-panel-head">
                            <div>
                                <span>Audit Trail</span>
                                <h2>Son kayıtlar</h2>
                            </div>
                        </div>
                        {auditTrail.loading ? <div className="admin-empty">Audit kayıtları yükleniyor...</div> : null}
                        {!auditTrail.loading && auditTrail.error ? <div className="admin-error">{auditTrail.error}</div> : null}
                        {!auditTrail.loading && !auditTrail.error && auditTrail.data.length === 0 ? <div className="admin-empty">Kayıt bulunamadı.</div> : null}
                        {!auditTrail.loading && !auditTrail.error && auditTrail.data.length > 0 ? (
                            <div className="admin-audit-list">
                                {auditTrail.data.slice(0, 8).map((item) => (
                                    <article key={item.id}>
                                        <div>
                                            <strong>{item.action}</strong>
                                            <span>{item.actorUsername ?? "Sistem"}{item.reason ? `: ${item.reason}` : ""}</span>
                                        </div>
                                        <time>{auditTime(item)}</time>
                                    </article>
                                ))}
                            </div>
                        ) : null}
                    </section>
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
        </section>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <article className="admin-metric">
            <span>{label}</span>
            <strong>{value}</strong>
        </article>
    );
}
