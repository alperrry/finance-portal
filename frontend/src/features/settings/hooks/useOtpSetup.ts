import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { ApiError } from "../../../services/api/client";
import { useToast } from "../../../components/ToastContext";
import { deleteOtpCredential, setupOtp, verifyOtp, type OtpSetupResponse, type SecurityStatusResponse } from "../../profile/api/userApi";
import type { OtpStep } from "../types";
import { resolveProfileError } from "../utils/settingsFormatters";

export function useOtpSetup(
    onStatusUpdate: (status: SecurityStatusResponse) => void,
) {
    const { showToast } = useToast();
    const { t } = useTranslation();

    const [otpStep, setOtpStep] = useState<OtpStep>("idle");
    const [otpSetupData, setOtpSetupData] = useState<OtpSetupResponse | null>(null);
    const [otpCode, setOtpCode] = useState<string[]>(["", "", "", "", "", ""]);
    const [otpVerifying, setOtpVerifying] = useState(false);
    const [otpError, setOtpError] = useState<string | null>(null);
    const [otpBusyId, setOtpBusyId] = useState<string | null>(null);
    const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);

    const resetOtpFlow = () => {
        setOtpStep("idle");
        setOtpSetupData(null);
        setOtpCode(["", "", "", "", "", ""]);
        setOtpError(null);
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
            onStatusUpdate(status);
            setOtpStep("idle");
            setOtpSetupData(null);
            setOtpCode(["", "", "", "", "", ""]);
            showToast(t("settings.otp.activateSuccess"), "success");
        } catch (err) {
            if (err instanceof ApiError && err.status === 410) {
                setOtpStep("idle");
                setOtpSetupData(null);
                setOtpError(t("settings.otp.setupExpired"));
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

    const handleDeleteOtp = async (credentialId: string) => {
        if (!window.confirm(t("settings.otp.deleteConfirm"))) return;
        setOtpBusyId(credentialId);
        try {
            const nextStatus = await deleteOtpCredential(credentialId);
            onStatusUpdate(nextStatus);
            showToast(t("settings.otp.deleteSuccess"), "success");
        } catch (err) {
            showToast(resolveProfileError(err), "error");
        } finally {
            setOtpBusyId(null);
        }
    };

    const handleContinueToVerify = () => {
        setOtpStep("verify");
        window.requestAnimationFrame(() => otpInputRefs.current[0]?.focus());
    };

    const handleBackToQr = () => {
        setOtpStep("qr");
        setOtpError(null);
        setOtpCode(["", "", "", "", "", ""]);
    };

    return {
        otpStep,
        otpSetupData,
        otpCode,
        otpVerifying,
        otpError,
        otpBusyId,
        otpInputRefs,
        isOtpFlowActive: otpStep === "qr" || otpStep === "verify",
        resetOtpFlow,
        handleStartOtpSetup,
        handleOtpSubmit,
        handleOtpCodeChange,
        handleOtpKeyDown,
        handleOtpPaste,
        handleDeleteOtp,
        handleContinueToVerify,
        handleBackToQr,
    };
}