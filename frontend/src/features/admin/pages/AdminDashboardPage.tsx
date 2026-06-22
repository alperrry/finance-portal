import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MetricCard } from "../../../components/ui/MetricCard";
import { SectionPanel } from "../../../components/ui/SectionPanel";
import { DataState } from "../../../components/ui/DataState";
import { PageHeader } from "../../../components/ui/PageHeader";
import { AdminAuditPanel } from "../components/AdminAuditPanel";
import { useAdminDashboard } from "../api/useAdminDashboard";
import { useAdminAuditLogs } from "../api/useAdminAuditLogs";

const MODULES = ["stocks", "funds", "fx", "bonds", "viop", "macro"] as const;

export function AdminDashboardPage() {
    const { t } = useTranslation();
    const { data, loading, error } = useAdminDashboard();
    const audit = useAdminAuditLogs(["user", "news", "category", "source", "market"]);
    const counts = data?.counts;

    const freshnessByModule = new Map((data?.marketFreshness ?? []).map((m) => [m.module, m]));

    return (
        <Box sx={{ display: "grid", gap: 2.25 }}>
            <PageHeader
                kicker={t("admin.dashboard.kicker")}
                title={t("admin.dashboard.title")}
                subtitle={t("admin.dashboard.subtitle")}
            />

            {/* KPI özet kartları */}
            <DataState loading={loading} error={error}>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 2 }}>
                    <MetricCard
                        label={t("admin.dashboard.kpi.users")}
                        value={counts?.totalUsers ?? "—"}
                        note={t("admin.dashboard.kpi.usersNote", { active: counts?.activeUsers ?? 0, admins: counts?.adminUsers ?? 0 })}
                    />
                    <MetricCard
                        label={t("admin.dashboard.kpi.news")}
                        value={counts?.totalNews ?? "—"}
                        note={t("admin.dashboard.kpi.newsNote", { published: counts?.publishedNews ?? 0 })}
                        delta={counts ? t("admin.dashboard.kpi.last24", { count: counts.news24h }) : undefined}
                        tone={counts && counts.news24h > 0 ? "up" : "neutral"}
                    />
                    <MetricCard
                        label={t("admin.dashboard.kpi.sources")}
                        value={counts ? `${counts.activeSources}/${counts.totalSources}` : "—"}
                        note={t("admin.dashboard.kpi.sourcesNote")}
                    />
                    <MetricCard
                        label={t("admin.dashboard.kpi.audit")}
                        value={counts?.audit24h ?? "—"}
                        note={t("admin.dashboard.kpi.auditNote")}
                    />
                </Box>
            </DataState>

            {/* Operasyonel sağlık — piyasa veri tazeliği */}
            <SectionPanel>
                <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>{t("admin.dashboard.health.overline")}</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>{t("admin.dashboard.health.title")}</Typography>
                <DataState loading={loading} error={error}>
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" }, gap: 1.5 }}>
                        {MODULES.map((module) => {
                            const m = freshnessByModule.get(module);
                            const stale = m?.stale ?? true;
                            return (
                                <Box key={module} sx={{ border: "1px solid", borderColor: stale ? "error.light" : "divider", borderRadius: 2, p: 2 }}>
                                    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 0.75, gap: 1 }}>
                                        <Typography sx={{ fontWeight: 800 }}>{t(`admin.dashboard.modules.${module}`)}</Typography>
                                        <Chip
                                            size="small"
                                            label={stale ? t("admin.dashboard.health.stale") : t("admin.dashboard.health.fresh")}
                                            color={stale ? "error" : "success"}
                                            variant={stale ? "filled" : "outlined"}
                                        />
                                    </Stack>
                                    <Typography variant="body2" color="text.secondary">
                                        {t("admin.dashboard.health.lastUpdated")}: {m?.lastUpdated ?? "—"}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {t("admin.dashboard.health.records")}: {(m?.recordCount ?? 0).toLocaleString("tr-TR")}
                                    </Typography>
                                </Box>
                            );
                        })}
                    </Box>
                </DataState>
            </SectionPanel>

            {/* Canlı audit akışı */}
            <AdminAuditPanel
                title={t("admin.dashboard.activity")}
                loading={audit.loading}
                error={audit.error}
                items={audit.data}
            />

            {/* Hızlı yönetim kısayolları */}
            <SectionPanel>
                <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>{t("admin.dashboard.shortcuts.overline")}</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>{t("admin.dashboard.shortcuts.title")}</Typography>
                <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
                    <Button component={RouterLink} to="/admin/users" variant="outlined">{t("admin.nav.users")}</Button>
                    <Button component={RouterLink} to="/admin/news" variant="outlined">{t("admin.nav.newsManagement")}</Button>
                    <Button component={RouterLink} to="/admin/news-sources" variant="outlined">{t("admin.nav.rssSources")}</Button>
                    <Button component={RouterLink} to="/admin/categories" variant="outlined">{t("admin.nav.categoryManagement")}</Button>
                    <Button component={RouterLink} to="/admin/market-jobs" variant="outlined">{t("admin.nav.marketJobs")}</Button>
                </Stack>
            </SectionPanel>
        </Box>
    );
}
