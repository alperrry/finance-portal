import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "../../../components/ToastContext";
import { changeCurrentUserPassword } from "../../profile/api/userApi";
import type { PasswordForm } from "../types";
import { EMPTY_PASSWORD_FORM, resolveProfileError, validatePasswordForm } from "../utils/settingsFormatters";

export function usePasswordForm() {
    const { showToast } = useToast();
    const { t } = useTranslation();
    const [passwordForm, setPasswordForm] = useState<PasswordForm>(EMPTY_PASSWORD_FORM);
    const [passwordTouched, setPasswordTouched] = useState<Partial<Record<keyof PasswordForm, boolean>>>({});
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [passwordSaving, setPasswordSaving] = useState(false);

    const passwordErrors = useMemo(() => validatePasswordForm(passwordForm), [passwordForm]);
    const passwordCanSubmit =
        passwordForm.newPassword.length > 0 &&
        passwordForm.confirmPassword.length > 0 &&
        Object.keys(passwordErrors).length === 0 &&
        !passwordSaving;

    const updatePasswordField = (field: keyof PasswordForm) => (event: ChangeEvent<HTMLInputElement>) => {
        setPasswordForm((cur) => ({ ...cur, [field]: event.target.value }));
        setPasswordTouched((cur) => ({ ...cur, [field]: true }));
        setPasswordError(null);
    };

    const touchPasswordField = (field: keyof PasswordForm) => {
        setPasswordTouched((cur) => ({ ...cur, [field]: true }));
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
            showToast(t("settings.security.updateSuccess"), "success");
        } catch (err) {
            setPasswordError(resolveProfileError(err));
        } finally {
            setPasswordSaving(false);
        }
    };

    return {
        passwordForm,
        passwordTouched,
        passwordErrors,
        passwordError,
        passwordSaving,
        passwordCanSubmit,
        updatePasswordField,
        touchPasswordField,
        handlePasswordSubmit,
    };
}