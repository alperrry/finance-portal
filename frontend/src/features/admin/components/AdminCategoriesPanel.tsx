import { Alert, Box, Button, Chip, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { PANEL_HEAD_SX, PANEL_SX } from "../constants/adminStyles";
import type { AdminCategory } from "../types/admin.types";
import { formatDateTime } from "../utils/adminFormatters";

interface AdminCategoriesPanelProps {
    categories: AdminCategory[];
    search: string;
    loading: boolean;
    error: string | null;
    pendingAction: string | null;
    onSearchChange: (value: string) => void;
    onCreate: () => void;
    onEdit: (category: AdminCategory) => void;
    onDelete: (category: AdminCategory) => void;
    onToggle: (category: AdminCategory) => void;
}

export function AdminCategoriesPanel({
    categories,
    search,
    loading,
    error,
    pendingAction,
    onSearchChange,
    onCreate,
    onEdit,
    onDelete,
    onToggle,
}: AdminCategoriesPanelProps) {
    const { t } = useTranslation();
    return (
        <Paper sx={PANEL_SX}>
            <Box sx={PANEL_HEAD_SX}>
                <Box>
                    <Typography sx={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "text.secondary" }}>
                        Category Management
                    </Typography>
                    <Typography variant="h6" sx={{ mt: 0.5, fontSize: 24, letterSpacing: 0, fontWeight: 700 }}>
                        {t("admin.categories.title")}
                    </Typography>
                </Box>
                <Button variant="contained" color="secondary" size="small" onClick={onCreate}>
                    {t("admin.categories.addButton")}
                </Button>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 1.25, p: "16px 22px", borderBottom: "1px solid", borderColor: "divider", alignItems: "center" }}>
                <TextField size="small" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder={t("admin.categories.searchPlaceholder")} />
                <Typography sx={{ fontWeight: 700 }}>{t("admin.categories.count", { count: categories.length })}</Typography>
            </Box>

            {loading ? <Typography sx={{ p: "22px", color: "text.secondary" }}>{t("admin.categories.loading")}</Typography> : null}
            {!loading && error ? <Alert severity="error" sx={{ m: 2 }}>{error}</Alert> : null}
            {!loading && !error && categories.length === 0 ? <Typography sx={{ p: "22px", color: "text.secondary" }}>{t("admin.categories.empty")}</Typography> : null}

            {!loading && !error && categories.length > 0 ? (
                <TableContainer sx={{ overflowX: "auto" }}>
                    <Table size="small" sx={{ minWidth: 680 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell>{t("admin.categories.cols.category")}</TableCell>
                                <TableCell>{t("admin.categories.cols.status")}</TableCell>
                                <TableCell>{t("admin.categories.cols.created")}</TableCell>
                                <TableCell>{t("admin.categories.cols.updated")}</TableCell>
                                <TableCell>{t("admin.categories.cols.action")}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {categories.map((category) => (
                                <TableRow key={category.id} sx={{ "&:last-child td": { borderBottom: 0 } }}>
                                    <TableCell><Typography variant="body2" sx={{ fontWeight: 700 }}>{category.name}</Typography></TableCell>
                                    <TableCell>
                                        <Chip
                                            size="small"
                                            label={category.active ? t("admin.users.statusActive") : t("admin.users.statusPassive")}
                                            sx={{
                                                height: 22,
                                                fontSize: 11,
                                                fontWeight: 700,
                                                bgcolor: category.active ? "rgba(46, 164, 79, 0.12)" : "rgba(220, 53, 69, 0.12)",
                                                color: category.active ? "#1a7a35" : "#9e1818",
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>{formatDateTime(category.createdAt)}</TableCell>
                                    <TableCell>{formatDateTime(category.updatedAt)}</TableCell>
                                    <TableCell>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                disabled={pendingAction === `toggle-${category.id}`}
                                                onClick={() => onToggle(category)}
                                            >
                                                {category.active ? t("admin.categories.actions.deactivate") : t("admin.categories.actions.activate")}
                                            </Button>
                                            <Button size="small" variant="outlined" onClick={() => onEdit(category)}>{t("admin.categories.actions.edit")}</Button>
                                            <Button size="small" variant="outlined" color="error" onClick={() => onDelete(category)}>{t("admin.categories.actions.delete")}</Button>
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
