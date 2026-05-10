import { useState } from "react";
import { Alert, Box, Button, Paper, Typography } from "@mui/material";
import { ApiError } from "../../../services/api/client";
import { useToast } from "../../../components/ToastContext";
import { triggerAdminMarketBackfill } from "../api/adminApi";
import { invalidateAdminQuery } from "../api/adminQueryBus";
import { useAdminAuditLogs } from "../api/useAdminAuditLogs";
import type { AdminMarketBackfillModule, AuditLogItem } from "../types/admin.types";

const MARKET_AUDIT_TARGETS = ["market"];

const MARKET_JOBS: Array<{
    module: AdminMarketBackfillModule;
    title: string;
    description: string;
}> = [
    { module: "fx", title: "Döviz backfill", description: "TCMB geçmiş kur verilerini tamamlar." },
    { module: "stocks", title: "Hisse backfill", description: "Yahoo Finance geçmiş hisse verilerini tamamlar." },
    { module: "bonds", title: "Tahvil backfill", description: "TCMB EVDS tahvil geçmişini tamamlar." },
    { module: "funds", title: "Fon backfill", description: "TEFAS geçmiş fon fiyatlarını tamamlar." },
];

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

const AUDIT_ITEM_SX = {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 2,
    px: 2.25,
    py: 1.5,
    borderBottom: "1px solid",
    borderColor: "divider",
    "&:last-child": { borderBottom: 0 },
} as const;

function resolveError(error: unknown, fallback: string) {
    if (error instanceof ApiError) return error.payload?.message || error.message || fallback;
    if (error instanceof Error) return error.message;
    return fallback;
}

function formatDateTime(value: string | null) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("tr-TR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function auditDescription(item: AuditLogItem) {
    const target = item.targetId ? `${item.targetType} #${item.targetId}` : item.targetType || "market";
    return `${item.actorUsername ?? "Sistem"} -> ${target}${item.reason ? `: ${item.reason}` : ""}`;
}

export function AdminMarketJobsPage() {
    const { showToast } = useToast();
    const [pendingModule, setPendingModule] = useState<AdminMarketBackfillModule | null>(null);
    const auditQuery = useAdminAuditLogs(MARKET_AUDIT_TARGETS);

    const triggerBackfill = async (module: AdminMarketBackfillModule) => {
        setPendingModule(module);
        try {
            const response = await triggerAdminMarketBackfill(module);
            showToast(response.message, response.status === "ALREADY_RUNNING" ? "info" : "success");
            invalidateAdminQuery({ scope: "market-audit" });
        } catch (caughtError) {
            showToast(resolveError(caughtError, "Backfill başlatılamadı."), "error");
        } finally {
            setPendingModule(null);
        }
    };

    return (
        <Box sx={{ display: "grid", gap: 2.25 }}>
            <Paper sx={PANEL_SX}>
                <Box sx={PANEL_HEAD_SX}>
                    <Box>
                        <Typography sx={KICKER_SX}>Market Operations</Typography>
                        <Typography variant="h6" sx={{ mt: 0.5, fontSize: 24, letterSpacing: 0, fontWeight: 700 }}>Market İşleri</Typography>
                    </Box>
                    <Typography sx={{ fontWeight: 700 }}>{MARKET_JOBS.length} operasyon</Typography>
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1.75, p: "18px 22px 22px" }}>
                    {MARKET_JOBS.map((job) => (
                        <Paper key={job.module} elevation={0} sx={{ borderRadius: "18px", p: 2.5, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 2, border: "1px solid", borderColor: "divider", bgcolor: "rgba(255,255,255,0.7)" }}>
                            <Box>
                                <Typography sx={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "text.secondary", fontFamily: '"JetBrains Mono", monospace' }}>
                                    {job.module.toLocaleUpperCase("tr-TR")}
                                </Typography>
                                <Typography variant="h6" sx={{ mt: 0.5, fontWeight: 700, fontSize: 16 }}>{job.title}</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{job.description}</Typography>
                            </Box>
                            <Button
                                variant="contained"
                                color="secondary"
                                size="small"
                                disabled={pendingModule === job.module}
                                onClick={() => void triggerBackfill(job.module)}
                            >
                                {pendingModule === job.module ? "Başlatılıyor..." : "Backfill başlat"}
                            </Button>
                        </Paper>
                    ))}
                </Box>
            </Paper>

            <Paper sx={PANEL_SX}>
                <Box sx={PANEL_HEAD_SX}>
                    <Box>
                        <Typography sx={KICKER_SX}>Audit Trail</Typography>
                        <Typography variant="h6" sx={{ mt: 0.5, fontSize: 24, letterSpacing: 0, fontWeight: 700 }}>Market audit geçmişi</Typography>
                    </Box>
                    <Typography sx={{ fontWeight: 700 }}>{auditQuery.data.length} kayıt</Typography>
                </Box>
                {auditQuery.loading ? <Typography sx={{ p: "22px", color: "text.secondary" }}>Audit kayıtları yükleniyor...</Typography> : null}
                {!auditQuery.loading && auditQuery.error ? <Alert severity="error" sx={{ m: 2 }}>{auditQuery.error}</Alert> : null}
                {!auditQuery.loading && !auditQuery.error && auditQuery.data.length === 0 ? <Typography sx={{ p: "22px", color: "text.secondary" }}>Audit kaydı bulunamadı.</Typography> : null}
                {!auditQuery.loading && !auditQuery.error && auditQuery.data.length > 0 ? (
                    <Box>
                        {auditQuery.data.map((item) => (
                            <Box key={item.id} component="article" sx={AUDIT_ITEM_SX}>
                                <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                        {item.action === "BACKFILL_TRIGGERED" ? "Backfill tetiklendi" : item.action}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                                        {auditDescription(item)}
                                    </Typography>
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                                    {formatDateTime(item.createdAt ?? item.timestamp ?? null)}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                ) : null}
            </Paper>
        </Box>
    );
}
