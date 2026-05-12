import { Alert, Box, Paper, Typography } from "@mui/material";
import { AUDIT_ITEM_SX, PANEL_HEAD_SX, PANEL_SX } from "../constants/adminStyles";
import type { AuditLogItem } from "../types/admin.types";
import { auditTime } from "../utils/adminFormatters";

interface AdminAuditPanelProps {
    title: string;
    loading: boolean;
    error: string | null;
    items: AuditLogItem[];
    getTitle?: (item: AuditLogItem) => string;
    getDescription?: (item: AuditLogItem) => string;
}

function defaultDescription(item: AuditLogItem) {
    const target = item.targetId ? `${item.targetType} #${item.targetId}` : item.targetType || "sistem";
    return `${item.actorUsername ?? "Sistem"} -> ${target}${item.reason ? `: ${item.reason}` : ""}`;
}

export function AdminAuditPanel({
    title,
    loading,
    error,
    items,
    getTitle = (item) => item.action,
    getDescription = defaultDescription,
}: AdminAuditPanelProps) {
    return (
        <Paper sx={PANEL_SX}>
            <Box sx={PANEL_HEAD_SX}>
                <Box>
                    <Typography sx={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "text.secondary" }}>
                        Audit Trail
                    </Typography>
                    <Typography variant="h6" sx={{ mt: 0.5, fontSize: 24, letterSpacing: 0, fontWeight: 700 }}>
                        {title}
                    </Typography>
                </Box>
                <Typography sx={{ fontWeight: 700 }}>{items.length} kayıt</Typography>
            </Box>

            {loading ? <Typography sx={{ p: "22px", color: "text.secondary" }}>Audit kayıtları yükleniyor...</Typography> : null}
            {!loading && error ? <Alert severity="error" sx={{ m: 2 }}>{error}</Alert> : null}
            {!loading && !error && items.length === 0 ? (
                <Typography sx={{ p: "22px", color: "text.secondary" }}>Audit kaydı bulunamadı.</Typography>
            ) : null}
            {!loading && !error && items.length > 0 ? (
                <Box>
                    {items.map((item) => (
                        <Box key={item.id} component="article" sx={AUDIT_ITEM_SX}>
                            <Box>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    {getTitle(item)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                                    {getDescription(item)}
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
    );
}
