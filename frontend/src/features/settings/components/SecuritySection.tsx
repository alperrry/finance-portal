import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Divider, List, ListItem, ListItemSecondaryAction, ListItemText, Skeleton, Stack, TextField, Typography } from "@mui/material";
import { usePasswordForm } from "../hooks/usePasswordForm";
import { useSecurityStatus } from "../hooks/useSecurityStatus";
import { useOtpSetup } from "../hooks/useOtpSetup";
import { formatDate } from "../utils/settingsFormatters";
import { OtpSetupFlow } from "./OtpSetupFlow";

export function SecuritySection() {
    const { securityStatus, setSecurityStatus, securityLoading, securityError, loadSecurityStatus } = useSecurityStatus();
    const {
        passwordForm, passwordTouched, passwordErrors, passwordError,
        passwordSaving, passwordCanSubmit,
        updatePasswordField, touchPasswordField, handlePasswordSubmit,
    } = usePasswordForm();
    const {
        otpStep, otpSetupData, otpCode, otpVerifying, otpError, otpBusyId,
        otpInputRefs, isOtpFlowActive,
        resetOtpFlow, handleStartOtpSetup, handleOtpCodeChange,
        handleOtpKeyDown, handleOtpPaste, handleDeleteOtp,
        handleContinueToVerify, handleBackToQr, handleOtpSubmit,
    } = useOtpSetup(setSecurityStatus);

    return (
        <Stack direction={{ xs: "column", md: "row" }} sx={{ gap: 2 }} id="settings-panel-security" role="tabpanel" aria-labelledby="settings-tab-security">
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
                                onBlur={() => touchPasswordField("newPassword")}
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
                                onBlur={() => touchPasswordField("confirmPassword")}
                                error={Boolean(passwordTouched.confirmPassword && passwordErrors.confirmPassword)}
                                helperText={passwordTouched.confirmPassword ? passwordErrors.confirmPassword : undefined}
                                autoComplete="new-password"
                                size="small"
                                fullWidth
                            />
                            {passwordError && <Alert severity="error">{passwordError}</Alert>}
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
                                            slotProps={{
                                                primary: { variant: "body2", sx: { fontWeight: 700 } },
                                                secondary: { variant: "caption" },
                                            }}
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
                            onContinue={handleContinueToVerify}
                            onBack={handleBackToQr}
                            onSubmit={() => void handleOtpSubmit(otpCode.join(""))}
                        />
                    ) : (
                        <Stack sx={{ gap: 1 }}>
                            <Alert severity="info" sx={{ alignItems: "center" }}>
                                2FA henüz aktif değil. Google Authenticator veya benzeri bir uygulama ile hesabınızı koruyun.
                            </Alert>
                            {otpError && <Alert severity="error">{otpError}</Alert>}
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