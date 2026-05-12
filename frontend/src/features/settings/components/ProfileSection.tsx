import { Alert, Avatar, Box, Button, Card, CardContent, Chip, CircularProgress, Divider, Skeleton, Stack, TextField, Typography } from "@mui/material";
import { useAuth } from "../../../app/auth/AuthContext";
import {
    KEYCLOAK_ACCOUNT_URL,
    formatDate,
    getInitials,
    getRoleLabel,
    openExternal,
} from "../utils/settingsFormatters";
import {useProfileSectionForm} from "../hooks/useProfileSectionForm.ts";



export function ProfileSection() {
    const { currentUser, userLoading, userError, refreshCurrentUser } = useAuth();
    const {
        form, touched, errors, saving, serverError,
        hasChanges, canSubmit,
        updateField, resetForm, handleSubmit,
    } = useProfileSectionForm();

    // geri kalan JSX aynı kalıyor

    if (userLoading && !currentUser) {
        return (
            <Stack direction={{ xs: "column", md: "row" }} sx={{ gap: 2 }}>
                <Card sx={{ flex: 1 }}>
                    <CardContent>
                        <Skeleton variant="text" width="40%" sx={{ mb: 1 }} />
                        <Skeleton variant="circular" width={56} height={56} sx={{ mb: 2 }} />
                        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} variant="text" sx={{ mb: 0.5 }} />)}
                    </CardContent>
                </Card>
                <Card sx={{ flex: 1 }}>
                    <CardContent>
                        <Skeleton variant="text" width="40%" sx={{ mb: 2 }} />
                        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} variant="rectangular" height={40} sx={{ mb: 1, borderRadius: 1 }} />)}
                    </CardContent>
                </Card>
            </Stack>
        );
    }

    if (userError) {
        return (
            <Alert
                severity="error"
                action={<Button size="small" color="inherit" onClick={() => void refreshCurrentUser()}>Tekrar dene</Button>}
            >
                Profil bilgileri alınamadı. {userError}
            </Alert>
        );
    }

    if (!currentUser) return null;

    return (
        <Stack direction={{ xs: "column", md: "row" }} sx={{ gap: 2 }} id="settings-panel-profile" role="tabpanel" aria-labelledby="settings-tab-profile">
            <Card sx={{ flex: 1 }}>
                <CardContent>
                    <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                        <Box>
                            <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>Kimlik Bilgileri</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>Hesap Özeti</Typography>
                        </Box>
                        <Chip label={currentUser.isActive ? "Aktif" : "Pasif"} size="small" color={currentUser.isActive ? "success" : "default"} />
                    </Stack>

                    <Stack direction="row" sx={{ alignItems: "center", gap: 1.5, mb: 2 }}>
                        <Avatar sx={{ bgcolor: "secondary.main", fontWeight: 800, width: 48, height: 48 }}>
                            {getInitials(currentUser)}
                        </Avatar>
                        <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {[currentUser.firstName, currentUser.lastName].filter(Boolean).join(" ") || currentUser.username}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">{currentUser.username}</Typography>
                        </Box>
                    </Stack>

                    <Divider sx={{ mb: 1 }} />
                    {[
                        { label: "Kullanıcı adı", value: currentUser.username || "-" },
                        { label: "E-posta", value: currentUser.email || "-" },
                        { label: "Kayıt tarihi", value: formatDate(currentUser.createdAt) },
                        { label: "Son giriş", value: formatDate(currentUser.lastLoginAt) },
                    ].map(({ label, value }, i) => (
                        <Box key={label}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.75 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{label}</Typography>
                                <Typography variant="body2">{value}</Typography>
                            </Box>
                            {i < 3 && <Divider />}
                        </Box>
                    ))}
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pt: 0.75 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Rol</Typography>
                        <Chip label={getRoleLabel(currentUser.role)} size="small" variant="outlined" color={currentUser.role === "ADMIN" ? "secondary" : "default"} />
                    </Box>
                </CardContent>
            </Card>

            <Card sx={{ flex: 1 }}>
                <CardContent>
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>Profil Güncelleme</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>Düzenlenebilir alanlar</Typography>
                    </Box>

                    <Box component="form" onSubmit={handleSubmit} noValidate>
                        <Stack sx={{ gap: 2 }}>
                            <TextField
                                label="Ad"
                                value={form.firstName}
                                onChange={updateField("firstName")}
                                error={Boolean(touched.firstName && errors.firstName)}
                                helperText={touched.firstName ? errors.firstName : undefined}
                                slotProps={{ htmlInput: { maxLength: 100 } }}
                                size="small"
                                fullWidth
                            />
                            <TextField
                                label="Soyad"
                                value={form.lastName}
                                onChange={updateField("lastName")}
                                error={Boolean(touched.lastName && errors.lastName)}
                                helperText={touched.lastName ? errors.lastName : undefined}
                                slotProps={{ htmlInput: { maxLength: 100 } }}
                                size="small"
                                fullWidth
                            />
                            <TextField
                                label="E-posta"
                                type="email"
                                value={currentUser.email}
                                disabled
                                size="small"
                                fullWidth
                                helperText="E-posta adresi Keycloak Account Console üzerinden değiştirilir."
                            />

                            <Alert
                                severity="info"
                                action={
                                    <Button size="small" color="inherit" onClick={() => openExternal(KEYCLOAK_ACCOUNT_URL)}>
                                        Account Console
                                    </Button>
                                }
                                sx={{ fontSize: "0.75rem" }}
                            >
                                Email'i değiştirmek için Account Console'u kullanın.
                            </Alert>

                            {serverError ? <Alert severity="error">{serverError}</Alert> : null}

                            <Stack direction="row" sx={{ gap: 1 }}>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    color="secondary"
                                    disabled={!canSubmit}
                                    startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
                                >
                                    {saving ? "Güncelleniyor..." : "Profili güncelle"}
                                </Button>
                                <Button type="button" variant="outlined" onClick={resetForm} disabled={!hasChanges || saving}>
                                    Değişiklikleri al
                                </Button>
                            </Stack>
                        </Stack>
                    </Box>
                </CardContent>
            </Card>
        </Stack>
    );
}
