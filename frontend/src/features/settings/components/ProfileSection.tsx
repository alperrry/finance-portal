import { Alert, Avatar, Box, Button, Card, CardContent, Chip, CircularProgress, Divider, Skeleton, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useAuth } from "../../../app/auth/AuthContext";
import { useToast } from "../../../components/ToastContext";
import { updateCurrentUser } from "../../profile/api/userApi";
import type { FieldTouched, ProfileField, ProfileForm } from "../types";
import {
    KEYCLOAK_ACCOUNT_URL,
    buildForm,
    buildUpdatePayload,
    formatDate,
    getInitials,
    getRoleLabel,
    isPayloadEmpty,
    openExternal,
    resolveProfileError,
    validateProfileForm,
} from "../utils/settingsFormatters";

export function ProfileSection() {
    const { currentUser, userLoading, userError, refreshCurrentUser, setCurrentUser } = useAuth();
    const { showToast } = useToast();
    const [form, setForm] = useState<ProfileForm>({ firstName: "", lastName: "" });
    const [touched, setTouched] = useState<FieldTouched>({});
    const [serverError, setServerError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!currentUser) return;
        setForm(buildForm(currentUser));
        setTouched({});
        setServerError(null);
    }, [currentUser]);

    const errors = useMemo(() => validateProfileForm(form), [form]);
    const payload = useMemo(() => (currentUser ? buildUpdatePayload(form, currentUser) : {}), [form, currentUser]);
    const hasChanges = currentUser ? !isPayloadEmpty(payload) : false;
    const canSubmit = Boolean(currentUser && hasChanges && Object.keys(errors).length === 0 && !saving);

    const updateField = (field: ProfileField) => (event: ChangeEvent<HTMLInputElement>) => {
        setForm((current) => ({ ...current, [field]: event.target.value }));
        setTouched((current) => ({ ...current, [field]: true }));
        setServerError(null);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setTouched({ firstName: true, lastName: true });
        if (!currentUser || !canSubmit) return;
        setSaving(true);
        setServerError(null);
        try {
            const updatedUser = await updateCurrentUser(payload);
            setCurrentUser(updatedUser);
            setForm(buildForm(updatedUser));
            setTouched({});
            showToast("Profil güncellendi", "success");
        } catch (caughtError) {
            const message = resolveProfileError(caughtError);
            setServerError(message);
            showToast(message, "error");
        } finally {
            setSaving(false);
        }
    };

    const resetForm = () => { setForm(buildForm(currentUser)); setTouched({}); setServerError(null); };

    if (userLoading && !currentUser) {
        return (
            <Stack direction={{ xs: "column", md: "row" }} gap={2}>
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
        <Stack direction={{ xs: "column", md: "row" }} gap={2} id="settings-panel-profile" role="tabpanel" aria-labelledby="settings-tab-profile">
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
                                onBlur={() => setTouched((c) => ({ ...c, firstName: true }))}
                                error={Boolean(touched.firstName && errors.firstName)}
                                helperText={touched.firstName ? errors.firstName : undefined}
                                inputProps={{ maxLength: 100 }}
                                size="small"
                                fullWidth
                            />
                            <TextField
                                label="Soyad"
                                value={form.lastName}
                                onChange={updateField("lastName")}
                                onBlur={() => setTouched((c) => ({ ...c, lastName: true }))}
                                error={Boolean(touched.lastName && errors.lastName)}
                                helperText={touched.lastName ? errors.lastName : undefined}
                                inputProps={{ maxLength: 100 }}
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
