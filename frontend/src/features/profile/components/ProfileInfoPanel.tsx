import EditIcon from "@mui/icons-material/Edit";
import { Box, Card, CardContent, Chip, Divider, IconButton, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { UserResponse } from "../api/userApi";
import type { ProfileField } from "../types";
import { formatDateTime } from "../utils/profileFormatters";

type Props = {
    currentUser: UserResponse;
    onFocusField: (field: ProfileField) => void;
};

function InfoRow({ label, value, field, onFocusField }: { label: string; value: ReactNode; field?: ProfileField; onFocusField?: (field: ProfileField) => void }) {
    return (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, py: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, flexShrink: 0 }}>
                {label}
            </Typography>
            <Stack direction="row" sx={{ alignItems: "center", gap: 0.5 }}>
                <Typography variant="body2" sx={{ textAlign: "right" }}>{value}</Typography>
                {field && onFocusField ? (
                    <IconButton
                        size="small"
                        onClick={() => onFocusField(field)}
                        aria-label={`${label} alanını düzenle`}
                        sx={{ ml: 0.25, color: "text.secondary" }}
                    >
                        <EditIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                ) : null}
            </Stack>
        </Box>
    );
}

export function ProfileInfoPanel({ currentUser, onFocusField }: Props) {
    const { t } = useTranslation();
    return (
        <Card sx={{ flex: 1 }}>
            <CardContent>
                <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                    <Box>
                        <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>
                            {t("profile.info.overline")}
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                            {t("profile.info.heading")}
                        </Typography>
                    </Box>
                    <Chip
                        label={currentUser.isActive ? t("common.active") : t("common.passive")}
                        size="small"
                        color={currentUser.isActive ? "success" : "default"}
                    />
                </Stack>
                <Divider sx={{ mb: 1 }} />
                <InfoRow label={t("profile.info.firstName")} value={currentUser.firstName || "-"} field="firstName" onFocusField={onFocusField} />
                <Divider />
                <InfoRow label={t("profile.info.lastName")} value={currentUser.lastName || "-"} field="lastName" onFocusField={onFocusField} />
                <Divider />
                <InfoRow label={t("profile.info.email")} value={currentUser.email || "-"} field="email" onFocusField={onFocusField} />
                <Divider />
                <InfoRow label={t("profile.info.username")} value={currentUser.username || "-"} />
                <Divider />
                <InfoRow
                    label={t("profile.info.role")}
                    value={<Chip label={currentUser.role} size="small" variant="outlined" color={currentUser.role === "ADMIN" ? "secondary" : "default"} />}
                />
                <Divider />
                <InfoRow label={t("profile.info.lastLogin")} value={formatDateTime(currentUser.lastLoginAt)} />
                <Divider />
                <InfoRow label={t("profile.info.registeredAt")} value={formatDateTime(currentUser.createdAt)} />
                <Divider />
                <InfoRow
                    label={t("profile.info.accountStatus")}
                    value={
                        <Typography variant="body2" color={currentUser.isActive ? "success.main" : "text.secondary"} sx={{ fontWeight: 700 }}>
                            {currentUser.isActive ? t("common.active") : t("common.passive")}
                        </Typography>
                    }
                />
            </CardContent>
        </Card>
    );
}
