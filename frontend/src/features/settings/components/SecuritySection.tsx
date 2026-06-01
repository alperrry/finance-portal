import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Divider, List, ListItem, ListItemSecondaryAction, ListItemText, Skeleton, Stack, TextField, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { usePasswordForm } from "../hooks/usePasswordForm";
import { useSecurityStatus } from "../hooks/useSecurityStatus";
import { useOtpSetup } from "../hooks/useOtpSetup";
import { formatDate } from "../utils/settingsFormatters";
import { OtpSetupFlow } from "./OtpSetupFlow";

export function SecuritySection() {
    const { t } = useTranslation();
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
                        <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>{t("settings.security.passwordOverline")}</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>{t("settings.security.passwordHeading")}</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {t("settings.security.passwordDesc")}
                    </Typography>
                    <Box component="form" onSubmit={handlePasswordSubmit} noValidate>
                        <Stack sx={{ gap: 2 }}>
                            <TextField
                                label={t("settings.security.newPassword")}
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
                                label={t("settings.security.confirmPassword")}
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
                                {passwordSaving ? t("settings.security.updatingButton") : t("settings.security.updateButton")}
                            </Button>
                        </Stack>
                    </Box>
                </CardContent>
            </Card>

            <Card sx={{ flex: 1 }}>
                <CardContent>
                    <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                        <Box>
                            <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>{t("settings.security.otpOverline")}</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>2FA / OTP</Typography>
                        </Box>
                        <Chip
                            label={securityStatus?.otpEnabled ? t("common.active") : t("common.passive")}
                            size="small"
                            color={securityStatus?.otpEnabled ? "success" : "default"}
                        />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {t("settings.security.otpDesc")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                        {t("settings.security.otpCaption")}
                    </Typography>

                    {securityLoading ? (
                        <Stack sx={{ gap: 1 }}>
                            <Skeleton variant="text" width="60%" />
                            <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
                        </Stack>
                    ) : securityError ? (
                        <Alert
                            severity="error"
                            action={<Button size="small" color="inherit" onClick={() => void loadSecurityStatus()}>{t("common.retry")}</Button>}
                        >
                            {t("settings.security.loadError")} {securityError}
                        </Alert>
                    ) : securityStatus?.otpEnabled ? (
                        <List disablePadding>
                            {securityStatus.otpCredentials.map((credential, i) => (
                                <Box key={credential.id}>
                                    <ListItem disablePadding sx={{ py: 0.75 }}>
                                        <ListItemText
                                            primary={credential.label || "Authenticator"}
                                            secondary={credential.createdAt ? formatDate(new Date(credential.createdAt).toISOString()) : t("settings.security.noRegDate")}
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
                                                {otpBusyId === credential.id ? t("settings.security.removingButton") : t("settings.security.removeButton")}
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
                                {t("settings.security.otpInactiveAlert")}
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
                                {otpStep === "starting" ? t("settings.security.enablingButton") : t("settings.security.enableButton")}
                            </Button>
                        </Stack>
                    )}
                </CardContent>
            </Card>
        </Stack>
    );
}
