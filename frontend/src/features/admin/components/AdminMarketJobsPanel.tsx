import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Typography } from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PANEL_HEAD_SX, PANEL_SX } from "../constants/adminStyles";
import type { AdminMarketBackfillModule } from "../types/admin.types";

const MODULE_JOB_KEY: Record<AdminMarketBackfillModule, string> = {
    fx: "fx",
    stocks: "stock",
    bonds: "bond",
    funds: "fund",
    macro: "macro",
    viop: "viop",
};

const MODULE_LIST: AdminMarketBackfillModule[] = ["fx", "stocks", "bonds", "funds", "macro", "viop"];

interface AdminMarketJobsPanelProps {
    pendingModule: AdminMarketBackfillModule | null;
    clearingModule: AdminMarketBackfillModule | null;
    onTrigger: (module: AdminMarketBackfillModule) => void;
    onClear: (module: AdminMarketBackfillModule) => void;
}

export function AdminMarketJobsPanel({ pendingModule, clearingModule, onTrigger, onClear }: AdminMarketJobsPanelProps) {
    const { t } = useTranslation();
    const [confirmClear, setConfirmClear] = useState<AdminMarketBackfillModule | null>(null);

    const handleConfirmClear = () => {
        if (confirmClear) {
            onClear(confirmClear);
            setConfirmClear(null);
        }
    };

    return (
        <>
            <Paper sx={PANEL_SX}>
                <Box sx={PANEL_HEAD_SX}>
                    <Box>
                        <Typography sx={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "text.secondary" }}>
                            Market Operations
                        </Typography>
                        <Typography variant="h6" sx={{ mt: 0.5, fontSize: 24, letterSpacing: 0, fontWeight: 700 }}>
                            {t("admin.marketJobs.title")}
                        </Typography>
                    </Box>
                    <Typography sx={{ fontWeight: 700 }}>{t("admin.marketJobs.count", { count: MODULE_LIST.length })}</Typography>
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1.75, p: "18px 22px 22px" }}>
                    {MODULE_LIST.map((module) => {
                        const jobKey = MODULE_JOB_KEY[module];
                        const title = t(`admin.marketJobs.jobs.${jobKey}.title` as any) as string;
                        const description = t(`admin.marketJobs.jobs.${jobKey}.description` as any) as string;
                        return (
                            <Paper key={module} elevation={0} sx={{ borderRadius: "18px", p: 2.5, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 2, border: "1px solid", borderColor: "divider", bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(33, 28, 24, 0.7)" : "rgba(255, 255, 255, 0.7)" }}>
                                <Box>
                                    <Typography sx={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "text.secondary", fontFamily: '"JetBrains Mono", monospace' }}>
                                        {module.toLocaleUpperCase("tr-TR")}
                                    </Typography>
                                    <Typography variant="h6" sx={{ mt: 0.5, fontWeight: 700, fontSize: 16 }}>{title}</Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{description}</Typography>
                                </Box>
                                <Box sx={{ display: "flex", gap: 1 }}>
                                    <Button
                                        variant="contained"
                                        color="secondary"
                                        size="small"
                                        disabled={pendingModule === module}
                                        onClick={() => onTrigger(module)}
                                        sx={{ flex: 1 }}
                                    >
                                        {pendingModule === module ? t("admin.marketJobs.backfillStarting") : t("admin.marketJobs.backfillButton")}
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        size="small"
                                        disabled={clearingModule === module}
                                        onClick={() => setConfirmClear(module)}
                                    >
                                        {clearingModule === module ? "..." : t("admin.marketJobs.clear")}
                                    </Button>
                                </Box>
                            </Paper>
                        );
                    })}
                </Box>
            </Paper>

            <Dialog open={confirmClear !== null} onClose={() => setConfirmClear(null)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>{t("admin.marketJobs.clearDialogTitle")}</DialogTitle>
                <DialogContent>
                    <Typography variant="body2">
                        {t("admin.marketJobs.clearDescription", { module: confirmClear?.toUpperCase() ?? "" })}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmClear(null)} size="small">{t("admin.marketJobs.clearCancel")}</Button>
                    <Button onClick={handleConfirmClear} color="error" variant="contained" size="small">
                        {t("admin.marketJobs.clearConfirm")}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
