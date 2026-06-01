import { Alert, Avatar, Box, Button, Chip, FormControl, NativeSelect, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
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
    const { t } = useTranslation();
    return (
        <Paper sx={PANEL_SX}>
            <Box sx={PANEL_HEAD_SX}>
                <Box>
                    <Typography sx={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "text.secondary" }}>
                        {t("admin.users.overline")}
                    </Typography>
                    <Typography variant="h6" sx={{ mt: 0.5, fontSize: 24, letterSpacing: 0, fontWeight: 700 }}>
                        {t("admin.users.title")}
                    </Typography>
                </Box>
                <Typography sx={{ fontWeight: 700 }}>{t("admin.users.records", { count: users.length })}</Typography>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 160px 160px", gap: 1.25, p: "16px 22px", borderBottom: "1px solid", borderColor: "divider" }}>
                <TextField
                    size="small"
                    value={filters.search}
                    onChange={(event) => onFilterChange("search", event.target.value)}
                    placeholder={t("admin.users.searchPlaceholder")}
                />
                <FormControl size="small">
                    <NativeSelect value={filters.role} onChange={(event) => onFilterChange("role", event.target.value)}>
                        <option value="">{t("admin.users.allRoles")}</option>
                        <option value="ADMIN">{t("admin.users.roleAdmin")}</option>
                        <option value="NORMAL_USER">{t("admin.users.roleUser")}</option>
                    </NativeSelect>
                </FormControl>
                <FormControl size="small">
                    <NativeSelect value={filters.status} onChange={(event) => onFilterChange("status", event.target.value)}>
                        <option value="">{t("admin.users.allStatuses")}</option>
                        <option value="ACTIVE">{t("admin.users.statusActive")}</option>
                        <option value="PASSIVE">{t("admin.users.statusPassive")}</option>
                    </NativeSelect>
                </FormControl>
            </Box>

            {loading ? <Typography sx={{ p: "22px", color: "text.secondary" }}>{t("admin.users.loading")}</Typography> : null}
            {!loading && error ? <Alert severity="error" sx={{ m: 2 }}>{error}</Alert> : null}
            {!loading && !error && users.length === 0 ? <Typography sx={{ p: "22px", color: "text.secondary" }}>{t("admin.users.empty")}</Typography> : null}

            {!loading && !error && users.length > 0 ? (
                <TableContainer sx={{ overflowX: "auto" }}>
                    <Table size="small" sx={{ minWidth: 900 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell>{t("admin.users.cols.user")}</TableCell>
                                <TableCell>{t("admin.users.cols.email")}</TableCell>
                                <TableCell>{t("admin.users.cols.role")}</TableCell>
                                <TableCell>{t("admin.users.cols.status")}</TableCell>
                                <TableCell>{t("admin.users.cols.lastLogin")}</TableCell>
                                <TableCell>{t("admin.users.cols.tfa")}</TableCell>
                                <TableCell>{t("admin.users.cols.portfolio")}</TableCell>
                                <TableCell>{t("admin.users.cols.action")}</TableCell>
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
                                            <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main", color: "primary.contrastText", fontSize: 11, fontWeight: 800 }}>
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
                                            label={user.role === "ADMIN" ? t("admin.users.roleAdmin") : "Normal"}
                                            sx={{
                                                height: 22,
                                                fontSize: 11,
                                                fontWeight: 700,
                                                bgcolor: user.role === "ADMIN" ? "rgba(193, 98, 47, 0.12)" : (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(17, 17, 17, 0.07)",
                                                color: user.role === "ADMIN" ? "secondary.main" : "text.primary",
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            size="small"
                                            label={user.status === "ACTIVE" ? t("admin.users.statusActive") : t("admin.users.statusPassive")}
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
                                    <TableCell>{user.twoFactorEnabled ? t("admin.users.statusActive") : t("admin.users.statusPassive")}</TableCell>
                                    <TableCell>{user.portfolioCount ?? "-"}</TableCell>
                                    <TableCell>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                                            <Button size="small" variant="outlined" onClick={() => onDetail(user.id)}>{t("admin.users.actions.detail")}</Button>
                                            <Button size="small" variant="outlined" onClick={() => onDialog({ type: "role", user })}>{t("admin.users.actions.role")}</Button>
                                            <Button size="small" variant="outlined" onClick={() => onDialog({ type: "status", user })}>{t("admin.users.actions.status")}</Button>
                                            <Button size="small" variant="outlined" onClick={() => onDialog({ type: "reset-2fa", user })}>{t("admin.users.actions.tfa")}</Button>
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
