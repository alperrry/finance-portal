import { useTranslation } from "react-i18next";
import { Metric } from "./Metric.tsx";
import { Box } from "@mui/material";
import type { AdminUserListItem } from "../types/admin.types.ts";
import { formatDateTime } from "../utils/adminFormatters";

interface UserDetailMetricsProps{
    user: AdminUserListItem
}

export function UserDetailMetrics({user}:UserDetailMetricsProps){
    const { t } = useTranslation();
    return(<Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 1.5 }}>
    <Metric label={t("admin.userDetail.metrics.email")} value={user.email} />
    <Metric label={t("admin.userDetail.metrics.role")} value={user.role === "ADMIN" ? t("admin.userDetail.values.admin") : t("admin.userDetail.values.user")} />
    <Metric label={t("admin.userDetail.metrics.status")} value={user.status === "ACTIVE" ? t("admin.userDetail.values.active") : t("admin.userDetail.values.inactive")} />
    <Metric label={t("admin.userDetail.metrics.tfa")} value={user.twoFactorEnabled ? t("admin.userDetail.values.active") : t("admin.userDetail.values.inactive")} />
    <Metric label={t("admin.userDetail.metrics.createdAt")} value={formatDateTime(user.createdAt)} />
    <Metric label={t("admin.userDetail.metrics.lastLogin")} value={formatDateTime(user.lastLoginAt)} />
    <Metric label={t("admin.userDetail.metrics.portfolio")} value={String(user.portfolioCount ?? "-")} />
</Box>);}
