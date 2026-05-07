import { useState } from "react";
import { ApiError } from "../../../api/client";
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
    const auditQuery = useAdminAuditLogs(MARKET_AUDIT_TARGETS, "market-audit");

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
        <section className="admin-page">
            <div className="admin-panel">
                <div className="admin-panel-head">
                    <div>
                        <span>Market Operations</span>
                        <h2>Market İşleri</h2>
                    </div>
                    <strong>{MARKET_JOBS.length} operasyon</strong>
                </div>
                <div className="admin-job-grid">
                    {MARKET_JOBS.map((job) => (
                        <article className="admin-job-card" key={job.module}>
                            <div>
                                <span>{job.module.toLocaleUpperCase("tr-TR")}</span>
                                <h3>{job.title}</h3>
                                <p>{job.description}</p>
                            </div>
                            <button
                                type="button"
                                className="admin-primary-btn"
                                disabled={pendingModule === job.module}
                                onClick={() => void triggerBackfill(job.module)}
                            >
                                {pendingModule === job.module ? "Başlatılıyor..." : "Backfill başlat"}
                            </button>
                        </article>
                    ))}
                </div>
            </div>

            <div className="admin-panel">
                <div className="admin-panel-head">
                    <div>
                        <span>Audit Trail</span>
                        <h2>Market audit geçmişi</h2>
                    </div>
                    <strong>{auditQuery.data.length} kayıt</strong>
                </div>
                {auditQuery.loading ? <div className="admin-empty">Audit kayıtları yükleniyor...</div> : null}
                {!auditQuery.loading && auditQuery.error ? <div className="admin-error">{auditQuery.error}</div> : null}
                {!auditQuery.loading && !auditQuery.error && auditQuery.data.length === 0 ? <div className="admin-empty">Audit kaydı bulunamadı.</div> : null}
                {!auditQuery.loading && !auditQuery.error && auditQuery.data.length > 0 ? (
                    <div className="admin-audit-list">
                        {auditQuery.data.map((item) => (
                            <article key={item.id}>
                                <div>
                                    <strong>{item.action === "BACKFILL_TRIGGERED" ? "Backfill tetiklendi" : item.action}</strong>
                                    <span>{auditDescription(item)}</span>
                                </div>
                                <time>{formatDateTime(item.createdAt ?? item.timestamp ?? null)}</time>
                            </article>
                        ))}
                    </div>
                ) : null}
            </div>
        </section>
    );
}
