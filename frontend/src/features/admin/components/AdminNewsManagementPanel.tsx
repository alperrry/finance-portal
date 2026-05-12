import type { SyntheticEvent } from "react";
import { Alert, Box, Button, Chip, FormControl, NativeSelect, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { PANEL_HEAD_SX, PANEL_SX } from "../constants/adminStyles";
import type { AdminCategory, AdminNewsQuery, AdminNewsSource, AdminNewsStatus, AdminPageResponse, AdminNewsSummary } from "../types/admin.types";
import { formatDateTime, newsStatusLabel } from "../utils/adminFormatters";
import { AdminPagination } from "./AdminPagination";

const NEWS_STATUSES: AdminNewsStatus[] = ["published", "archived", "removed"];

const STATUS_COLORS: Record<AdminNewsStatus, { bgcolor: string; color: string }> = {
    published: { bgcolor: "rgba(46, 164, 79, 0.12)", color: "#1a7a35" },
    archived: { bgcolor: "rgba(100, 100, 100, 0.12)", color: "#555" },
    removed: { bgcolor: "rgba(220, 53, 69, 0.12)", color: "#9e1818" },
};

interface AdminNewsManagementPanelProps {
    query: AdminNewsQuery;
    news: AdminPageResponse<AdminNewsSummary>;
    loading: boolean;
    error: string | null;
    categories: AdminCategory[];
    sources: AdminNewsSource[];
    onFilterChange: (key: keyof AdminNewsQuery, value: string) => void;
    onStatusDialog: (news: AdminNewsSummary) => void;
    onCategoriesDialog: (news: AdminNewsSummary) => void;
}

export function AdminNewsManagementPanel({
    query,
    news,
    loading,
    error,
    categories,
    sources,
    onFilterChange,
    onStatusDialog,
    onCategoriesDialog,
}: AdminNewsManagementPanelProps) {
    return (
        <Paper sx={PANEL_SX}>
            <Box sx={PANEL_HEAD_SX}>
                <Box>
                    <Typography sx={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "text.secondary" }}>
                        News Management
                    </Typography>
                    <Typography variant="h6" sx={{ mt: 0.5, fontSize: 24, letterSpacing: 0, fontWeight: 700 }}>
                        Haber Yönetimi
                    </Typography>
                </Box>
                <Typography sx={{ fontWeight: 700 }}>{news.totalElements} haber</Typography>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr repeat(4, 160px)", gap: 1.25, p: "16px 22px", borderBottom: "1px solid", borderColor: "divider" }}>
                <TextField
                    size="small"
                    value={query.search}
                    onChange={(event) => onFilterChange("search", event.target.value)}
                    placeholder="Başlık, içerik veya URL ara"
                />
                <FormControl size="small">
                    <NativeSelect value={query.status} onChange={(event) => onFilterChange("status", event.target.value)}>
                        <option value="">Tüm durumlar</option>
                        {NEWS_STATUSES.map((status) => <option key={status} value={status}>{newsStatusLabel(status)}</option>)}
                    </NativeSelect>
                </FormControl>
                <FormControl size="small">
                    <NativeSelect value={query.sourceId} onChange={(event) => onFilterChange("sourceId", event.target.value)}>
                        <option value="">Tüm kaynaklar</option>
                        {sources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}
                    </NativeSelect>
                </FormControl>
                <FormControl size="small">
                    <NativeSelect value={query.categoryId} onChange={(event) => onFilterChange("categoryId", event.target.value)}>
                        <option value="">Tüm kategoriler</option>
                        {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </NativeSelect>
                </FormControl>
                <FormControl size="small">
                    <NativeSelect value={query.size} onChange={(event) => onFilterChange("size", event.target.value)}>
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="50">50</option>
                    </NativeSelect>
                </FormControl>
            </Box>

            {loading ? <Typography sx={{ p: "22px", color: "text.secondary" }}>Haberler yükleniyor...</Typography> : null}
            {!loading && error ? <Alert severity="error" sx={{ m: 2 }}>{error}</Alert> : null}
            {!loading && !error && news.content.length === 0 ? <Typography sx={{ p: "22px", color: "text.secondary" }}>Bu filtrede haber yok.</Typography> : null}

            {!loading && !error && news.content.length > 0 ? (
                <>
                    <TableContainer sx={{ overflowX: "auto" }}>
                        <Table size="small" sx={{ minWidth: 900 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Haber</TableCell>
                                    <TableCell>Kaynak</TableCell>
                                    <TableCell>Kategoriler</TableCell>
                                    <TableCell>Durum</TableCell>
                                    <TableCell>Yayın</TableCell>
                                    <TableCell>Aksiyon</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {news.content.map((item) => (
                                    <TableRow key={item.id} sx={{ "&:last-child td": { borderBottom: 0 } }}>
                                        <TableCell sx={{ maxWidth: 380 }}>
                                            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, minWidth: 300 }}>
                                                {item.imageUrl ? (
                                                    <Box
                                                        component="img"
                                                        src={item.imageUrl}
                                                        alt=""
                                                        loading="lazy"
                                                        referrerPolicy="no-referrer"
                                                        onError={(event: SyntheticEvent<HTMLImageElement>) => {
                                                            event.currentTarget.hidden = true;
                                                        }}
                                                        sx={{ width: 74, height: 54, objectFit: "cover", borderRadius: 1, border: "1px solid", borderColor: "divider", flexShrink: 0 }}
                                                    />
                                                ) : null}
                                                <Box sx={{ minWidth: 0 }}>
                                                    <Typography variant="body2" sx={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                        {item.title}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                        {item.canonicalUrl ?? "-"}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell>{item.source?.name ?? "-"}</TableCell>
                                        <TableCell>
                                            <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                                                {item.categories.length > 0 ? item.categories.map((category) => (
                                                    <Chip
                                                        key={category.id}
                                                        size="small"
                                                        label={category.name}
                                                        sx={{ height: 20, fontSize: 10, fontWeight: 600, bgcolor: "rgba(17,17,17,0.07)" }}
                                                    />
                                                )) : "-"}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={newsStatusLabel(item.status)}
                                                sx={{ height: 22, fontSize: 11, fontWeight: 700, ...STATUS_COLORS[item.status] }}
                                            />
                                        </TableCell>
                                        <TableCell>{formatDateTime(item.publishedAt)}</TableCell>
                                        <TableCell>
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                                                <Button size="small" variant="outlined" onClick={() => onStatusDialog(item)}>Durum</Button>
                                                <Button size="small" variant="outlined" onClick={() => onCategoriesDialog(item)}>Kategori</Button>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <AdminPagination page={query.page} totalPages={news.totalPages} onPage={(page) => onFilterChange("page", String(page))} />
                </>
            ) : null}
        </Paper>
    );
}
