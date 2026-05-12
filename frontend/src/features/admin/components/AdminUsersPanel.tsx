import { Alert, Avatar, Box, Button, Chip, FormControl, NativeSelect, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { PANEL_HEAD_SX, PANEL_SX } from "../constants/adminStyles";
import type { AdminDialogState } from "./AdminDialogs";
import type { AdminUserListItem, AdminUsersFilter } from "../types/admin.types";
import { displayName } from "../utils/adminFormatters";

interface AdminUsersPanelProps {
    users: AdminUserListItem[];
    filters: AdminUsersFilter;
    loading: boolean;
    error: string | null;
    onFilterChange: (key: keyof AdminUsersFilter, value: string) => void;
    onDetail: (userId: number) => void;
    onDialog: (state: NonNullable<AdminDialogState>) => void;
    isHighlighted: (userId: number) => boolean;
}

function formatDate(value: string | null) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function AdminUsersPanel({
    users,
    filters,
    loading,
    error,
    onFilterChange,
    onDetail,
    onDialog,
    isHighlighted,
}: AdminUsersPanelProps) {
    return (
        <Paper sx={PANEL_SX}>
            <Box sx={PANEL_HEAD_SX}>
                <Box>
                    <Typography sx={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "text.secondary" }}>
                        Kullanıcı Yönetimi
                    </Typography>
                    <Typography variant="h6" sx={{ mt: 0.5, fontSize: 24, letterSpacing: 0, fontWeight: 700 }}>
                        Kullanıcılar
                    </Typography>
                </Box>
                <Typography sx={{ fontWeight: 700 }}>{users.length} kayıt</Typography>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 160px 160px", gap: 1.25, p: "16px 22px", borderBottom: "1px solid", borderColor: "divider" }}>
                <TextField
                    size="small"
                    value={filters.search}
                    onChange={(event) => onFilterChange("search", event.target.value)}
                    placeholder="İsim, kullanıcı adı veya e-posta ara"
                />
                <FormControl size="small">
                    <NativeSelect value={filters.role} onChange={(event) => onFilterChange("role", event.target.value)}>
                        <option value="">Tüm roller</option>
                        <option value="ADMIN">Admin</option>
                        <option value="NORMAL_USER">Normal kullanıcı</option>
                    </NativeSelect>
                </FormControl>
                <FormControl size="small">
                    <NativeSelect value={filters.status} onChange={(event) => onFilterChange("status", event.target.value)}>
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
                                            <Button size="small" variant="outlined" onClick={() => onDetail(user.id)}>Detay</Button>
                                            <Button size="small" variant="outlined" onClick={() => onDialog({ type: "role", user })}>Rol</Button>
                                            <Button size="small" variant="outlined" onClick={() => onDialog({ type: "status", user })}>Durum</Button>
                                            <Button size="small" variant="outlined" onClick={() => onDialog({ type: "reset-2fa", user })}>2FA</Button>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            ) : null}
        </Paper>
    );
}
