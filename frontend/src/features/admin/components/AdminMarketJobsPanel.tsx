import { Box, Button, Paper, Typography } from "@mui/material";
import { PANEL_HEAD_SX, PANEL_SX } from "../constants/adminStyles";
import type { AdminMarketBackfillModule } from "../types/admin.types";

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

interface AdminMarketJobsPanelProps {
    pendingModule: AdminMarketBackfillModule | null;
    onTrigger: (module: AdminMarketBackfillModule) => void;
}

export function AdminMarketJobsPanel({ pendingModule, onTrigger }: AdminMarketJobsPanelProps) {
    return (
        <Paper sx={PANEL_SX}>
            <Box sx={PANEL_HEAD_SX}>
                <Box>
                    <Typography sx={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "text.secondary" }}>
                        Market Operations
                    </Typography>
                    <Typography variant="h6" sx={{ mt: 0.5, fontSize: 24, letterSpacing: 0, fontWeight: 700 }}>
                        Market İşleri
                    </Typography>
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
                            onClick={() => onTrigger(job.module)}
                        >
                            {pendingModule === job.module ? "Başlatılıyor..." : "Backfill başlat"}
                        </Button>
                    </Paper>
                ))}
            </Box>
        </Paper>
    );
}
