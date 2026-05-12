import { Alert, Box, Paper, Typography } from "@mui/material";
import type { AuditLogItem } from "../types/admin.types";
import { PANEL_SX, PANEL_HEAD_SX, AUDIT_ITEM_SX } from "../constants/adminStyles";
import { auditTime } from "../utils/adminFormatters";

interface UserAuditTrailProps {
    loading: boolean;
    error: string | null;
    data: AuditLogItem[];
}

export function AuditTrail({loading,error,data}:UserAuditTrailProps) {return (

<Paper sx={PANEL_SX}>
    <Box sx={PANEL_HEAD_SX}>
        <Box>
            <Typography sx={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "text.secondary" }}>
                Audit Trail
            </Typography>
            <Typography variant="h6" sx={{ mt: 0.5, fontSize: 24, letterSpacing: 0, fontWeight: 700 }}>
                Son kayıtlar
            </Typography>
        </Box>
    </Box>
    {loading && (
        <Typography sx={{ p: "22px", color: "text.secondary" }}>
            Audit kayıtları yükleniyor...
        </Typography>
    )}
    {!loading && error && (
        <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
    )}
    {!loading && !error && data.length === 0 && (
        <Typography sx={{ p: "22px", color: "text.secondary" }}>Kayıt bulunamadı.</Typography>
    )}
    {!loading && !error && data.length > 0 && (
        <Box>
            {data.slice(0, 8).map((item) => (
                <Box key={item.id} component="article" sx={AUDIT_ITEM_SX}>
                    <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.action}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                            {item.actorUsername ?? "Sistem"}{item.reason ? `: ${item.reason}` : ""}
                        </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                        {auditTime(item)}
                    </Typography>
                </Box>
            ))}
        </Box>
    )}
</Paper>);}