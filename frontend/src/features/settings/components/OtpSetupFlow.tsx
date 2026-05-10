import { Alert, Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { type ClipboardEvent, type KeyboardEvent, type MutableRefObject } from "react";
import type { OtpSetupResponse } from "../../profile/api/userApi";
import type { OtpStep } from "../types";

type Props = {
    otpStep: OtpStep;
    otpSetupData: OtpSetupResponse | null;
    otpCode: string[];
    otpVerifying: boolean;
    otpError: string | null;
    otpInputRefs: MutableRefObject<Array<HTMLInputElement | null>>;
    onCodeChange: (index: number, value: string) => void;
    onKeyDown: (index: number, e: KeyboardEvent<HTMLInputElement>) => void;
    onPaste: (e: ClipboardEvent<HTMLInputElement>) => void;
    onReset: () => void;
    onContinue: () => void;
    onBack: () => void;
    onSubmit: () => void;
};

export function OtpSetupFlow({
    otpStep,
    otpSetupData,
    otpCode,
    otpVerifying,
    otpError,
    otpInputRefs,
    onCodeChange,
    onKeyDown,
    onPaste,
    onReset,
    onContinue,
    onBack,
    onSubmit,
}: Props) {
    if (otpStep === "qr" && otpSetupData) {
        return (
            <Stack sx={{ gap: 2, mt: 1 }}>
                <Box sx={{ display: "flex", justifyContent: "center" }}>
                    <Box
                        component="img"
                        src={otpSetupData.qrCodeDataUrl}
                        alt="TOTP QR kodu"
                        sx={{ width: 180, height: 180, borderRadius: 1 }}
                    />
                </Box>
                <Box>
                    <Typography variant="caption" color="secondary" sx={{ fontWeight: 800 }}>
                        Manuel giriş için kod
                    </Typography>
                    <Stack direction="row" sx={{ alignItems: "center", gap: 1, mt: 0.5 }}>
                        <Typography variant="body2" component="code" sx={{ fontFamily: "monospace", bgcolor: "action.hover", px: 1, py: 0.5, borderRadius: 1, flexGrow: 1, wordBreak: "break-all" }}>
                            {otpSetupData.secret}
                        </Typography>
                        <Button size="small" variant="outlined" onClick={() => void navigator.clipboard.writeText(otpSetupData.secret)}>
                            Kopyala
                        </Button>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                        Authenticator uygulamanızda "Manuel giriş" seçeneği ile yukarıdaki kodu girin veya QR kodu tarayın.
                    </Typography>
                </Box>
                <Stack direction="row" sx={{ gap: 1 }}>
                    <Button variant="outlined" onClick={onReset}>İptal</Button>
                    <Button variant="contained" color="secondary" onClick={onContinue}>Devam</Button>
                </Stack>
            </Stack>
        );
    }

    if (otpStep === "verify") {
        return (
            <Stack sx={{ gap: 2, mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                    Authenticator uygulamanızda görünen 6 haneli kodu girin.
                </Typography>
                <Stack direction="row" sx={{ gap: 1 }}>
                    {otpCode.map((digit, i) => (
                        <Box
                            key={i}
                            component="input"
                            ref={(node: HTMLInputElement | null) => { otpInputRefs.current[i] = node; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            autoComplete="one-time-code"
                            onChange={(e) => onCodeChange(i, e.target.value)}
                            onKeyDown={(e) => onKeyDown(i, e)}
                            onPaste={onPaste}
                            disabled={otpVerifying}
                            sx={{
                                width: 44,
                                height: 48,
                                textAlign: "center",
                                fontSize: "1.2rem",
                                fontWeight: 700,
                                border: "1px solid",
                                borderColor: otpError ? "error.main" : "divider",
                                borderRadius: 1,
                                bgcolor: "background.paper",
                                outline: "none",
                                "&:focus": { borderColor: "primary.main", boxShadow: "0 0 0 2px rgba(0,0,0,0.1)" },
                                "&:disabled": { opacity: 0.5 },
                            }}
                        />
                    ))}
                </Stack>
                {otpError ? <Alert severity="error">{otpError}</Alert> : null}
                <Stack direction="row" sx={{ gap: 1 }}>
                    <Button variant="outlined" onClick={onBack} disabled={otpVerifying}>Geri</Button>
                    <Button
                        variant="contained"
                        color="secondary"
                        onClick={onSubmit}
                        disabled={otpCode.join("").length !== 6 || otpVerifying}
                        startIcon={otpVerifying ? <CircularProgress size={14} color="inherit" /> : undefined}
                    >
                        {otpVerifying ? "Doğrulanıyor..." : "Doğrula"}
                    </Button>
                </Stack>
            </Stack>
        );
    }

    return null;
}
