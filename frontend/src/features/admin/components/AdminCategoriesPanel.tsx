import { Alert, Box, Button, Chip, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
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
    return (
        <Paper sx={PANEL_SX}>
            <Box sx={PANEL_HEAD_SX}>
                <Box>
                    <Typography sx={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "text.secondary" }}>
                        Category Management
                    </Typography>
                    <Typography variant="h6" sx={{ mt: 0.5, fontSize: 24, letterSpacing: 0, fontWeight: 700 }}>
                        Kategori Yönetimi
                    </Typography>
                </Box>
                <Button variant="contained" color="secondary" size="small" onClick={onCreate}>
                    Kategori ekle
                </Button>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 1.25, p: "16px 22px", borderBottom: "1px solid", borderColor: "divider", alignItems: "center" }}>
                <TextField size="small" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Kategori ara" />
                <Typography sx={{ fontWeight: 700 }}>{categories.length} kategori</Typography>
            </Box>

            {loading ? <Typography sx={{ p: "22px", color: "text.secondary" }}>Kategoriler yükleniyor...</Typography> : null}
            {!loading && error ? <Alert severity="error" sx={{ m: 2 }}>{error}</Alert> : null}
            {!loading && !error && categories.length === 0 ? <Typography sx={{ p: "22px", color: "text.secondary" }}>Bu filtrede kategori yok.</Typography> : null}

            {!loading && !error && categories.length > 0 ? (
                <TableContainer sx={{ overflowX: "auto" }}>
                    <Table size="small" sx={{ minWidth: 680 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell>Kategori</TableCell>
                                <TableCell>Durum</TableCell>
                                <TableCell>Oluşturma</TableCell>
                                <TableCell>Güncelleme</TableCell>
                                <TableCell>Aksiyon</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {categories.map((category) => (
                                <TableRow key={category.id} sx={{ "&:last-child td": { borderBottom: 0 } }}>
                                    <TableCell><Typography variant="body2" sx={{ fontWeight: 700 }}>{category.name}</Typography></TableCell>
                                    <TableCell>
                                        <Chip
                                            size="small"
                                            label={category.active ? "Aktif" : "Pasif"}
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
                                                {category.active ? "Pasifleştir" : "Aktifleştir"}
                                            </Button>
                                            <Button size="small" variant="outlined" onClick={() => onEdit(category)}>Düzenle</Button>
                                            <Button size="small" variant="outlined" color="error" onClick={() => onDelete(category)}>Sil</Button>
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
