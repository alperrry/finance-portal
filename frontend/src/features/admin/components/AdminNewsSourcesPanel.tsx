import { Alert, Box, Button, Chip, Link, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { PANEL_HEAD_SX, PANEL_SX } from "../constants/adminStyles";
import type { AdminNewsSource } from "../types/admin.types";
import { formatDateTime } from "../utils/adminFormatters";

interface AdminNewsSourcesPanelProps {
    sources: AdminNewsSource[];
    search: string;
    loading: boolean;
    error: string | null;
    pendingAction: string | null;
    onSearchChange: (value: string) => void;
    onCreate: () => void;
    onEdit: (source: AdminNewsSource) => void;
    onDelete: (source: AdminNewsSource) => void;
    onFetch: (source?: AdminNewsSource) => void;
}

export function AdminNewsSourcesPanel({
    sources,
    search,
    loading,
    error,
    pendingAction,
    onSearchChange,
    onCreate,
    onEdit,
    onDelete,
    onFetch,
}: AdminNewsSourcesPanelProps) {
    return (
        <Paper sx={PANEL_SX}>
            <Box sx={PANEL_HEAD_SX}>
                <Box>
                    <Typography sx={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "text.secondary" }}>
                        RSS Source Management
                    </Typography>
                    <Typography variant="h6" sx={{ mt: 0.5, fontSize: 24, letterSpacing: 0, fontWeight: 700 }}>
                        RSS Kaynakları
                    </Typography>
                </Box>
                <Box sx={{ display: "flex", gap: 1 }}>
                    <Button variant="outlined" size="small" disabled={pendingAction === "fetch-all"} onClick={() => onFetch()}>
                        Tümünden çek
                    </Button>
                    <Button variant="contained" color="secondary" size="small" onClick={onCreate}>
                        Kaynak ekle
                    </Button>
                </Box>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 1.25, p: "16px 22px", borderBottom: "1px solid", borderColor: "divider", alignItems: "center" }}>
                <TextField
                    size="small"
                    value={search}
                    onChange={(event) => onSearchChange(event.target.value)}
                    placeholder="Kaynak adı veya RSS URL ara"
                />
                <Typography sx={{ fontWeight: 700 }}>{sources.length} kaynak</Typography>
            </Box>

            {loading ? <Typography sx={{ p: "22px", color: "text.secondary" }}>RSS kaynakları yükleniyor...</Typography> : null}
            {!loading && error ? <Alert severity="error" sx={{ m: 2 }}>{error}</Alert> : null}
            {!loading && !error && sources.length === 0 ? <Typography sx={{ p: "22px", color: "text.secondary" }}>Bu filtrede kaynak yok.</Typography> : null}

            {!loading && !error && sources.length > 0 ? (
                <TableContainer sx={{ overflowX: "auto" }}>
                    <Table size="small" sx={{ minWidth: 720 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell>Kaynak</TableCell>
                                <TableCell>RSS URL</TableCell>
                                <TableCell>Durum</TableCell>
                                <TableCell>Güncelleme</TableCell>
                                <TableCell>Aksiyon</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {sources.map((source) => (
                                <TableRow key={source.id} sx={{ "&:last-child td": { borderBottom: 0 } }}>
                                    <TableCell><Typography variant="body2" sx={{ fontWeight: 700 }}>{source.name}</Typography></TableCell>
                                    <TableCell sx={{ maxWidth: 320 }}>
                                        <Link href={source.sourceUrl} target="_blank" rel="noreferrer" color="secondary" variant="body2" sx={{ wordBreak: "break-all" }}>
                                            {source.sourceUrl}
                                        </Link>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            size="small"
                                            label={source.active ? "Aktif" : "Pasif"}
                                            sx={{
                                                height: 22,
                                                fontSize: 11,
                                                fontWeight: 700,
                                                bgcolor: source.active ? "rgba(46, 164, 79, 0.12)" : "rgba(220, 53, 69, 0.12)",
                                                color: source.active ? "#1a7a35" : "#9e1818",
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>{formatDateTime(source.updatedAt ?? source.createdAt)}</TableCell>
                                    <TableCell>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                disabled={pendingAction === `fetch-${source.id}`}
                                                onClick={() => onFetch(source)}
                                            >
                                                Çek
                                            </Button>
                                            <Button size="small" variant="outlined" onClick={() => onEdit(source)}>Düzenle</Button>
                                            <Button size="small" variant="outlined" color="error" onClick={() => onDelete(source)}>Sil</Button>
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
