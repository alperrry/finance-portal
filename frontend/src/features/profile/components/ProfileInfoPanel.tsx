import EditIcon from "@mui/icons-material/Edit";
import { Box, Card, CardContent, Chip, Divider, IconButton, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
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
    return (
        <Card sx={{ flex: 1 }}>
            <CardContent>
                <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                    <Box>
                        <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>
                            Kullanıcı Bilgileri
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                            Hesap Özeti
                        </Typography>
                    </Box>
                    <Chip
                        label={currentUser.isActive ? "Aktif" : "Pasif"}
                        size="small"
                        color={currentUser.isActive ? "success" : "default"}
                    />
                </Stack>
                <Divider sx={{ mb: 1 }} />
                <InfoRow label="Ad" value={currentUser.firstName || "-"} field="firstName" onFocusField={onFocusField} />
                <Divider />
                <InfoRow label="Soyad" value={currentUser.lastName || "-"} field="lastName" onFocusField={onFocusField} />
                <Divider />
                <InfoRow label="E-posta" value={currentUser.email || "-"} field="email" onFocusField={onFocusField} />
                <Divider />
                <InfoRow label="Kullanıcı adı" value={currentUser.username || "-"} />
                <Divider />
                <InfoRow
                    label="Rol"
                    value={<Chip label={currentUser.role} size="small" variant="outlined" color={currentUser.role === "ADMIN" ? "secondary" : "default"} />}
                />
                <Divider />
                <InfoRow label="Son giriş" value={formatDateTime(currentUser.lastLoginAt)} />
                <Divider />
                <InfoRow label="Kayıt tarihi" value={formatDateTime(currentUser.createdAt)} />
                <Divider />
                <InfoRow
                    label="Hesap durumu"
                    value={
                        <Typography variant="body2" color={currentUser.isActive ? "success.main" : "text.secondary"} sx={{ fontWeight: 700 }}>
                            {currentUser.isActive ? "Aktif" : "Pasif"}
                        </Typography>
                    }
                />
            </CardContent>
        </Card>
    );
}
