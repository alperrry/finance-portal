import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    Alert,
    Avatar,
    Box,
    Button,
    Chip,
    FormControl,
    NativeSelect,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
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

const KICKER_SX = {
    fontSize: 11,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    color: "text.secondary",
} as const;

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
        <Box sx={{ display: "grid", gap: 2.25 }}>
            <Paper sx={PANEL_SX}>
                <Box sx={PANEL_HEAD_SX}>
                    <Box>
                        <Typography sx={KICKER_SX}>Kullanıcı Yönetimi</Typography>
                        <Typography variant="h6" sx={{ mt: 0.5, fontSize: 24, letterSpacing: 0, fontWeight: 700 }}>Kullanıcılar</Typography>
                    </Box>
                    <Typography sx={{ fontWeight: 700 }}>{users.length} kayıt</Typography>
                </Box>

                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 160px 160px", gap: 1.25, p: "16px 22px", borderBottom: "1px solid", borderColor: "divider" }}>
                    <TextField
                        size="small"
                        value={filters.search}
                        onChange={(event) => updateFilter("search", event.target.value)}
                        placeholder="İsim, kullanıcı adı veya e-posta ara"
                    />
                    <FormControl size="small">
                        <NativeSelect value={filters.role} onChange={(event) => updateFilter("role", event.target.value)}>
                            <option value="">Tüm roller</option>
                            <option value="ADMIN">Admin</option>
                            <option value="NORMAL_USER">Normal kullanıcı</option>
                        </NativeSelect>
                    </FormControl>
                    <FormControl size="small">
                        <NativeSelect value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
                            <option value="">Tüm durumlar</option>
                            <option value="ACTIVE">Aktif</option>
                            <option value="PASSIVE">Pasif</option>
                        </NativeSelect>
                    </FormControl>
                </Box>

                {loading ? <Typography sx={{ p: "22px", color: "text.secondary" }}>Kullanıcılar yükleniyor...</Typography> : null}
                {!loading && error ? <Alert severity="error" sx={{ m: 2 }}>{error}</Alert> : null}
                {!loading && !error && users.length === 0 ? <Typography sx={{ p: "22px", color: "text.secondary" }}>Bu filtrede kullanıcı yok.</Typography> : null}

                {!loading && !error && users.length > 0 ? (
                    <TableContainer sx={{ overflowX: "auto" }}>
                        <Table size="small" sx={{ minWidth: 900 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Kullanıcı</TableCell>
                                    <TableCell>E-posta</TableCell>
                                    <TableCell>Rol</TableCell>
                                    <TableCell>Durum</TableCell>
                                    <TableCell>Son giriş</TableCell>
                                    <TableCell>2FA</TableCell>
                                    <TableCell>Portföy</TableCell>
                                    <TableCell>Aksiyon</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow
                                        key={user.id}
                                        sx={{
                                            bgcolor: isHighlighted(user.id) ? "rgba(193, 98, 47, 0.07)" : "transparent",
                                            "&:last-child td": { borderBottom: 0 },
                                        }}
                                    >
                                        <TableCell>
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                                                <Avatar sx={{ width: 32, height: 32, bgcolor: "#111", color: "#fff", fontSize: 11, fontWeight: 800 }}>
                                                    {displayName(user).slice(0, 2).toLocaleUpperCase("tr-TR")}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{displayName(user)}</Typography>
                                                    <Typography variant="caption" color="text.secondary">@{user.username}</Typography>
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={user.role === "ADMIN" ? "Admin" : "Normal"}
                                                sx={{
                                                    height: 22,
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    bgcolor: user.role === "ADMIN" ? "rgba(193, 98, 47, 0.12)" : "rgba(17, 17, 17, 0.07)",
                                                    color: user.role === "ADMIN" ? "#7f3d1d" : "text.primary",
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={user.status === "ACTIVE" ? "Aktif" : "Pasif"}
                                                sx={{
                                                    height: 22,
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    bgcolor: user.status === "ACTIVE" ? "rgba(46, 164, 79, 0.12)" : "rgba(220, 53, 69, 0.12)",
                                                    color: user.status === "ACTIVE" ? "#1a7a35" : "#9e1818",
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>{formatDate(user.lastLoginAt)}</TableCell>
                                        <TableCell>{user.twoFactorEnabled ? "Aktif" : "Kapalı"}</TableCell>
                                        <TableCell>{user.portfolioCount ?? "-"}</TableCell>
                                        <TableCell>
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                                                <Button size="small" variant="outlined" onClick={() => navigate(`/admin/users/${user.id}`)}>Detay</Button>
                                                <Button size="small" variant="outlined" onClick={() => setDialog({ type: "role", user })}>Rol</Button>
                                                <Button size="small" variant="outlined" onClick={() => setDialog({ type: "status", user })}>Durum</Button>
                                                <Button size="small" variant="outlined" onClick={() => setDialog({ type: "reset-2fa", user })}>2FA</Button>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : null}
            </Paper>

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
