import {Metric} from "./Metric.tsx";
import {Box} from "@mui/material";
import type {AdminUserListItem} from "../types/admin.types.ts";
import { formatDateTime } from "../utils/adminFormatters";

interface UserDetailMetricsProps{
    user: AdminUserListItem
}


export function UserDetailMetrics({user}:UserDetailMetricsProps){return(<Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 1.5 }}>
    <Metric label="E-posta" value={user.email} />
    <Metric label="Rol" value={user.role === "ADMIN" ? "Admin" : "Normal Kullanıcı"} />
    <Metric label="Durum" value={user.status === "ACTIVE" ? "Aktif" : "Pasif"} />
    <Metric label="2FA" value={user.twoFactorEnabled ? "Aktif" : "Kapalı"} />
    <Metric label="Oluşturma" value={formatDateTime(user.createdAt)} />
    <Metric label="Son giriş" value={formatDateTime(user.lastLoginAt)} />
    <Metric label="Portföy" value={String(user.portfolioCount ?? "-")} />
</Box>);}