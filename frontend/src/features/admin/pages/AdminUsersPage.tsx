import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAdminUsers, useFilteredAdminUsers } from "../api/useAdminUsers";
import { useResetUser2FA } from "../api/useResetUser2FA";
import { useUpdateUserRole } from "../api/useUpdateUserRole";
import { useUpdateUserStatus } from "../api/useUpdateUserStatus";
import {
    ChangeRoleDialog,
    ChangeStatusDialog,
    Reset2FADialog,
    type AdminDialogState,
} from "../components/AdminDialogs";
import type { AdminUserListItem, AdminUserRole, AdminUserStatus, AdminUsersFilter } from "../types/admin.types";
import { useUserUpdates } from "../websocket/useUserUpdates";

function displayName(user: AdminUserListItem) {
    return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username;
}

function formatDate(value: string | null) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function readFilters(params: URLSearchParams): AdminUsersFilter {
    const role = params.get("role");
    const status = params.get("status");
    return {
        search: params.get("search") ?? "",
        role: role === "ADMIN" || role === "NORMAL_USER" ? role : "",
        status: status === "ACTIVE" || status === "PASSIVE" ? status : "",
    };
}

export function AdminUsersPage() {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const filters = useMemo(() => readFilters(params), [params]);
    const { data, loading, error } = useAdminUsers();
    const users = useFilteredAdminUsers(data, filters);
    const { isHighlighted } = useUserUpdates();
    const [dialog, setDialog] = useState<AdminDialogState>(null);
    const roleMutation = useUpdateUserRole();
    const statusMutation = useUpdateUserStatus();
    const resetMutation = useResetUser2FA();

    const updateFilter = (key: keyof AdminUsersFilter, value: string) => {
        const next = new URLSearchParams(params);
        if (value) next.set(key, value);
        else next.delete(key);
        setParams(next, { replace: true });
    };

    const closeDialog = () => setDialog(null);

    return (
        <section className="admin-page">
            <div className="admin-panel">
                <div className="admin-panel-head">
                    <div>
                        <span>Kullanıcı Yönetimi</span>
                        <h2>Kullanıcılar</h2>
                    </div>
                    <strong>{users.length} kayıt</strong>
                </div>
                <div className="admin-filter-bar">
                    <input value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} placeholder="İsim, kullanıcı adı veya e-posta ara" />
                    <select value={filters.role} onChange={(event) => updateFilter("role", event.target.value)}>
                        <option value="">Tüm roller</option>
                        <option value="ADMIN">Admin</option>
                        <option value="NORMAL_USER">Normal kullanıcı</option>
                    </select>
                    <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
                        <option value="">Tüm durumlar</option>
                        <option value="ACTIVE">Aktif</option>
                        <option value="PASSIVE">Pasif</option>
                    </select>
                </div>

                {loading ? <div className="admin-empty">Kullanıcılar yükleniyor...</div> : null}
                {!loading && error ? <div className="admin-error">{error}</div> : null}
                {!loading && !error && users.length === 0 ? <div className="admin-empty">Bu filtrede kullanıcı yok.</div> : null}

                {!loading && !error && users.length > 0 ? (
                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Kullanıcı</th>
                                    <th>E-posta</th>
                                    <th>Rol</th>
                                    <th>Durum</th>
                                    <th>Son giriş</th>
                                    <th>2FA</th>
                                    <th>Portföy</th>
                                    <th>Aksiyon</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id} className={isHighlighted(user.id) ? "highlight" : ""}>
                                        <td>
                                            <div className="admin-user-cell">
                                                <span>{displayName(user).slice(0, 2).toLocaleUpperCase("tr-TR")}</span>
                                                <div>
                                                    <strong>{displayName(user)}</strong>
                                                    <small>@{user.username}</small>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{user.email}</td>
                                        <td><span className={`admin-pill role-${user.role.toLowerCase()}`}>{user.role === "ADMIN" ? "Admin" : "Normal"}</span></td>
                                        <td><span className={`admin-pill status-${user.status.toLowerCase()}`}>{user.status === "ACTIVE" ? "Aktif" : "Pasif"}</span></td>
                                        <td>{formatDate(user.lastLoginAt)}</td>
                                        <td>{user.twoFactorEnabled ? "Aktif" : "Kapalı"}</td>
                                        <td>{user.portfolioCount ?? "-"}</td>
                                        <td>
                                            <div className="admin-row-actions">
                                                <button type="button" onClick={() => navigate(`/admin/users/${user.id}`)}>Detay</button>
                                                <button type="button" onClick={() => setDialog({ type: "role", user })}>Rol</button>
                                                <button type="button" onClick={() => setDialog({ type: "status", user })}>Durum</button>
                                                <button type="button" onClick={() => setDialog({ type: "reset-2fa", user })}>2FA</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : null}
            </div>

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
