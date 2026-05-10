import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Divider, List, ListItem, ListItemSecondaryAction, ListItemText, Skeleton, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import { ApiError } from "../../../services/api/client";
import { useToast } from "../../../components/ToastContext";
import {
    changeCurrentUserPassword,
    deleteOtpCredential,
    fetchSecurityStatus,
    setupOtp,
    verifyOtp,
    type OtpSetupResponse,
    type SecurityStatusResponse,
} from "../../profile/api/userApi";
import type { OtpStep, PasswordForm } from "../types";
import { EMPTY_PASSWORD_FORM, formatDate, resolveProfileError, validatePasswordForm } from "../utils/settingsFormatters";
import { OtpSetupFlow } from "./OtpSetupFlow";

export function SecuritySection() {
    const { showToast } = useToast();
    const [passwordForm, setPasswordForm] = useState<PasswordForm>(EMPTY_PASSWORD_FORM);
    const [passwordTouched, setPasswordTouched] = useState<Partial<Record<keyof PasswordForm, boolean>>>({});
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [securityStatus, setSecurityStatus] = useState<SecurityStatusResponse | null>(null);
    const [securityLoading, setSecurityLoading] = useState(true);
    const [securityError, setSecurityError] = useState<string | null>(null);
    const [otpBusyId, setOtpBusyId] = useState<string | null>(null);

    const [otpStep, setOtpStep] = useState<OtpStep>("idle");
    const [otpSetupData, setOtpSetupData] = useState<OtpSetupResponse | null>(null);
    const [otpCode, setOtpCode] = useState<string[]>(["", "", "", "", "", ""]);
    const [otpVerifying, setOtpVerifying] = useState(false);
    const [otpError, setOtpError] = useState<string | null>(null);
    const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);

    const passwordErrors = useMemo(() => validatePasswordForm(passwordForm), [passwordForm]);
    const passwordCanSubmit =
        passwordForm.newPassword.length > 0 &&
        passwordForm.confirmPassword.length > 0 &&
        Object.keys(passwordErrors).length === 0 &&
        !passwordSaving;

    const loadSecurityStatus = async () => {
        setSecurityLoading(true);
        setSecurityError(null);
        try {
            setSecurityStatus(await fetchSecurityStatus());
        } catch (caughtError) {
            setSecurityError(resolveProfileError(caughtError));
        } finally {
            setSecurityLoading(false);
        }
    };

    useEffect(() => { void loadSecurityStatus(); }, []);

    const updatePasswordField = (field: keyof PasswordForm) => (event: ChangeEvent<HTMLInputElement>) => {
        setPasswordForm((current) => ({ ...current, [field]: event.target.value }));
        setPasswordTouched((current) => ({ ...current, [field]: true }));
        setPasswordError(null);
    };

    const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setPasswordTouched({ newPassword: true, confirmPassword: true });
        if (!passwordCanSubmit) return;
        setPasswordSaving(true);
        setPasswordError(null);
        try {
            await changeCurrentUserPassword(passwordForm.newPassword);
            setPasswordForm(EMPTY_PASSWORD_FORM);
            setPasswordTouched({});
            showToast("Şifre güncellendi", "success");
        } catch (caughtError) {
            setPasswordError(resolveProfileError(caughtError));
        } finally {
            setPasswordSaving(false);
        }
    };

    const handleDeleteOtp = async (credentialId: string) => {
        if (!window.confirm("İki aşamalı doğrulama bu cihaz için kaldırılsın mı?")) return;
        setOtpBusyId(credentialId);
        setSecurityError(null);
        try {
            const nextStatus = await deleteOtpCredential(credentialId);
            setSecurityStatus(nextStatus);
            showToast("İki aşamalı doğrulama kaldırıldı", "success");
        } catch (caughtError) {
            setSecurityError(resolveProfileError(caughtError));
        } finally {
            setOtpBusyId(null);
        }
    };

    const handleStartOtpSetup = async () => {
        setOtpStep("starting");
        setOtpError(null);
        try {
            const data = await setupOtp();
            setOtpSetupData(data);
            setOtpStep("qr");
        } catch (err) {
            setOtpStep("idle");
            setOtpError(resolveProfileError(err));
        }
    };

    const handleOtpSubmit = async (code: string) => {
        if (code.length !== 6 || otpVerifying) return;
        setOtpVerifying(true);
        setOtpError(null);
        try {
            const status = await verifyOtp(code);
            setSecurityStatus(status);
            setOtpStep("idle");
            setOtpSetupData(null);
            setOtpCode(["", "", "", "", "", ""]);
            showToast("İki aşamalı doğrulama aktive edildi", "success");
        } catch (err) {
            if (err instanceof ApiError && err.status === 410) {
                setOtpStep("idle");
                setOtpSetupData(null);
                setOtpError("Setup süresi doldu, yeniden başlatın.");
            } else {
                setOtpError(resolveProfileError(err));
            }
            setOtpCode(["", "", "", "", "", ""]);
            window.requestAnimationFrame(() => otpInputRefs.current[0]?.focus());
        } finally {
            setOtpVerifying(false);
        }
    };

    const handleOtpCodeChange = (index: number, rawValue: string) => {
        const digit = rawValue.replace(/\D/g, "").slice(-1);
        const next = otpCode.map((d, i) => (i === index ? digit : d));
        setOtpCode(next);
        setOtpError(null);
        if (digit && index < 5) otpInputRefs.current[index + 1]?.focus();
        if (digit && index === 5 && next.join("").length === 6) void handleOtpSubmit(next.join(""));
    };

    const handleOtpKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !otpCode[index] && index > 0) otpInputRefs.current[index - 1]?.focus();
    };

    const handleOtpPaste = (e: ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        if (!digits) return;
        const next = ["", "", "", "", "", ""];
        for (let i = 0; i < digits.length; i++) next[i] = digits[i];
        setOtpCode(next);
        const focusIdx = Math.min(digits.length, 5);
        otpInputRefs.current[focusIdx]?.focus();
        if (digits.length === 6) void handleOtpSubmit(digits);
    };

    const resetOtpFlow = () => {
        setOtpStep("idle");
        setOtpSetupData(null);
        setOtpCode(["", "", "", "", "", ""]);
        setOtpError(null);
    };

    const isOtpFlowActive = otpStep === "qr" || otpStep === "verify";

    return (
        <Stack direction={{ xs: "column", md: "row" }} gap={2} id="settings-panel-security" role="tabpanel" aria-labelledby="settings-tab-security">
            <Card sx={{ flex: 1 }}>
                <CardContent>
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>Şifre</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>Şifre değiştirme</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Yeni şifrenizi bu sayfadan belirleyin. Değişiklik Keycloak hesabınıza doğrudan uygulanır.
                    </Typography>
                    <Box component="form" onSubmit={handlePasswordSubmit} noValidate>
                        <Stack sx={{ gap: 2 }}>
                            <TextField
                                label="Yeni Şifre"
                                type="password"
                                value={passwordForm.newPassword}
                                onChange={updatePasswordField("newPassword")}
                                onBlur={() => setPasswordTouched((c) => ({ ...c, newPassword: true }))}
                                error={Boolean(passwordTouched.newPassword && passwordErrors.newPassword)}
                                helperText={passwordTouched.newPassword ? passwordErrors.newPassword : undefined}
                                autoComplete="new-password"
                                size="small"
                                fullWidth
                            />
                            <TextField
                                label="Şifre Tekrarı"
                                type="password"
                                value={passwordForm.confirmPassword}
                                onChange={updatePasswordField("confirmPassword")}
                                onBlur={() => setPasswordTouched((c) => ({ ...c, confirmPassword: true }))}
                                error={Boolean(passwordTouched.confirmPassword && passwordErrors.confirmPassword)}
                                helperText={passwordTouched.confirmPassword ? passwordErrors.confirmPassword : undefined}
                                autoComplete="new-password"
                                size="small"
                                fullWidth
                            />
                            {passwordError ? <Alert severity="error">{passwordError}</Alert> : null}
                            <Button
                                type="submit"
                                variant="contained"
                                color="secondary"
                                disabled={!passwordCanSubmit}
                                startIcon={passwordSaving ? <CircularProgress size={14} color="inherit" /> : undefined}
                                sx={{ alignSelf: "flex-start" }}
                            >
                                {passwordSaving ? "Güncelleniyor..." : "Şifreyi güncelle"}
                            </Button>
                        </Stack>
                    </Box>
                </CardContent>
            </Card>

            <Card sx={{ flex: 1 }}>
                <CardContent>
                    <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                        <Box>
                            <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>İki Aşamalı Doğrulama</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>2FA / OTP</Typography>
                        </Box>
                        <Chip
                            label={securityStatus?.otpEnabled ? "Aktif" : "Pasif"}
                            size="small"
                            color={securityStatus?.otpEnabled ? "success" : "default"}
                        />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Hesabınıza ekstra güvenlik katmanı ekleyin. Authenticator uygulaması ile her girişte 6 haneli kod isteyebiliriz.
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                        Mevcut OTP cihazlarınızı bu sayfadan görüntüleyebilir ve kaldırabilirsiniz.
                    </Typography>

                    {securityLoading ? (
                        <Stack sx={{ gap: 1 }}>
                            <Skeleton variant="text" width="60%" />
                            <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
                        </Stack>
                    ) : securityError ? (
                        <Alert
                            severity="error"
                            action={<Button size="small" color="inherit" onClick={() => void loadSecurityStatus()}>Tekrar dene</Button>}
                        >
                            Güvenlik bilgileri alınamadı. {securityError}
                        </Alert>
                    ) : securityStatus?.otpEnabled ? (
                        <List disablePadding>
                            {securityStatus.otpCredentials.map((credential, i) => (
                                <Box key={credential.id}>
                                    <ListItem disablePadding sx={{ py: 0.75 }}>
                                        <ListItemText
                                            primary={credential.label || "Authenticator"}
                                            secondary={credential.createdAt ? formatDate(new Date(credential.createdAt).toISOString()) : "Kayıt tarihi yok"}
                                            primaryTypographyProps={{ variant: "body2", fontWeight: 700 }}
                                            secondaryTypographyProps={{ variant: "caption" }}
                                        />
                                        <ListItemSecondaryAction>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                color="error"
                                                disabled={otpBusyId === credential.id}
                                                onClick={() => void handleDeleteOtp(credential.id)}
                                            >
                                                {otpBusyId === credential.id ? "Kaldırılıyor..." : "Kaldır"}
                                            </Button>
                                        </ListItemSecondaryAction>
                                    </ListItem>
                                    {i < securityStatus.otpCredentials.length - 1 && <Divider />}
                                </Box>
                            ))}
                        </List>
                    ) : isOtpFlowActive ? (
                        <OtpSetupFlow
                            otpStep={otpStep}
                            otpSetupData={otpSetupData}
                            otpCode={otpCode}
                            otpVerifying={otpVerifying}
                            otpError={otpError}
                            otpInputRefs={otpInputRefs}
                            onCodeChange={handleOtpCodeChange}
                            onKeyDown={handleOtpKeyDown}
                            onPaste={handleOtpPaste}
                            onReset={resetOtpFlow}
                            onContinue={() => {
                                setOtpStep("verify");
                                window.requestAnimationFrame(() => otpInputRefs.current[0]?.focus());
                            }}
                            onBack={() => { setOtpStep("qr"); setOtpError(null); setOtpCode(["", "", "", "", "", ""]); }}
                            onSubmit={() => void handleOtpSubmit(otpCode.join(""))}
                        />
                    ) : (
                        <Stack sx={{ gap: 1 }}>
                            <Alert severity="info" sx={{ alignItems: "center" }}>
                                2FA henüz aktif değil. Google Authenticator veya benzeri bir uygulama ile hesabınızı koruyun.
                            </Alert>
                            {otpError ? <Alert severity="error">{otpError}</Alert> : null}
                            <Button
                                variant="contained"
                                color="secondary"
                                onClick={() => void handleStartOtpSetup()}
                                disabled={otpStep === "starting"}
                                startIcon={otpStep === "starting" ? <CircularProgress size={14} color="inherit" /> : undefined}
                                sx={{ alignSelf: "flex-start" }}
                            >
                                {otpStep === "starting" ? "Hazırlanıyor..." : "Etkinleştir"}
                            </Button>
                        </Stack>
                    )}
                </CardContent>
            </Card>
        </Stack>
    );
}
