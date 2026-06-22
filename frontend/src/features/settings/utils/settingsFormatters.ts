import i18n from "../../../i18n";
import { ApiError } from "../../../services/api/client";
import type { UpdateUserRequest, UserResponse } from "../../profile/api/userApi";
import type { FormErrors, PasswordErrors, PasswordForm, ProfileField, ProfileForm, SettingsSection } from "../types";

export const KEYCLOAK_BASE_URL = import.meta.env.VITE_KEYCLOAK_URL ?? "http://localhost:8080";
export const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM ?? "finance-portal";
export const KEYCLOAK_ACCOUNT_URL = `${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}/account`;

export const EMPTY_FORM: ProfileForm = { firstName: "", lastName: "", email: "" };
export const EMPTY_PASSWORD_FORM: PasswordForm = { newPassword: "", confirmPassword: "" };

// Basit RFC-uyumlu e-posta deseni (backend @Email ile uyumlu, son doğrulama Keycloak'ta).
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function buildForm(user: UserResponse | null): ProfileForm {
    if (!user) return EMPTY_FORM;
    return { firstName: user.firstName ?? "", lastName: user.lastName ?? "", email: user.email ?? "" };
}

export function validateProfileForm(form: ProfileForm): FormErrors {
    const errors: FormErrors = {};
    const validate = (field: ProfileField, label: string) => {
        const value = form[field].trim();
        if (value.length < 1) { errors[field] = i18n.t("settings.validation.fieldLength", { label }); return; }
        if (value.length > 100) { errors[field] = i18n.t("settings.validation.fieldMaxLength", { label }); }
    };
    validate("firstName", i18n.t("settings.validation.firstName"));
    validate("lastName", i18n.t("settings.validation.lastName"));

    const email = form.email.trim();
    if (email.length < 1) errors.email = i18n.t("settings.validation.emailRequired");
    else if (email.length > 255) errors.email = i18n.t("settings.validation.emailMaxLength");
    else if (!EMAIL_PATTERN.test(email)) errors.email = i18n.t("settings.validation.emailInvalid");

    return errors;
}

export function buildUpdatePayload(form: ProfileForm, user: UserResponse): UpdateUserRequest {
    const payload: UpdateUserRequest = {};
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const email = form.email.trim();
    if (firstName !== (user.firstName ?? "").trim()) payload.firstName = firstName;
    if (lastName !== (user.lastName ?? "").trim()) payload.lastName = lastName;
    if (email !== (user.email ?? "").trim()) payload.email = email;
    return payload;
}

export function isPayloadEmpty(payload: UpdateUserRequest) {
    return !payload.firstName && !payload.lastName && !payload.email;
}

export function formatDate(value: string | null | undefined) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    const locale = i18n.language === "tr" ? "tr-TR" : "en-US";
    return new Intl.DateTimeFormat(locale, {
        day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
    }).format(date);
}

export function getInitials(user: UserResponse | null) {
    if (!user) return "FP";
    const fullName = [user.firstName, user.lastName].map((v) => v?.trim()).filter(Boolean).join(" ");
    const source = fullName || user.username || user.email || "Finance Portal";
    const parts = source.split(" ").filter(Boolean);
    const initials = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : source.slice(0, 2);
    const locale = i18n.language === "tr" ? "tr-TR" : "en-US";
    return initials.toLocaleUpperCase(locale);
}

export function getRoleLabel(role: UserResponse["role"]) {
    return role === "ADMIN" ? i18n.t("settings.roles.admin") : i18n.t("settings.roles.user");
}

export function resolveProfileError(caughtError: unknown) {
    if (caughtError instanceof ApiError) {
        const message = caughtError.payload?.message || caughtError.message;
        if (caughtError.status === 403) return i18n.t("settings.errors.noPermission");
        if (caughtError.status === 401) return i18n.t("settings.errors.sessionExpired");
        if (caughtError.status >= 500) return i18n.t("settings.errors.serverError");
        return message;
    }
    if (caughtError instanceof Error) return caughtError.message;
    return i18n.t("settings.errors.genericError");
}

export function validatePasswordForm(form: PasswordForm): PasswordErrors {
    const errors: PasswordErrors = {};
    if (form.newPassword.length < 8) errors.newPassword = i18n.t("settings.validation.passwordMin");
    else if (form.newPassword.length > 128) errors.newPassword = i18n.t("settings.validation.passwordMax");
    if (form.confirmPassword !== form.newPassword) errors.confirmPassword = i18n.t("settings.validation.passwordMismatch");
    return errors;
}

export function openExternal(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
}

export function getSectionMeta(section: SettingsSection) {
    const kicker = i18n.t("settings.kicker");
    if (section === "profile") {
        return {
            kicker,
            title: i18n.t("settings.sectionMeta.profileTitle"),
            subtitle: i18n.t("settings.sectionMeta.profileDesc"),
        };
    }
    if (section === "security") {
        return {
            kicker,
            title: i18n.t("settings.sectionMeta.securityTitle"),
            subtitle: i18n.t("settings.sectionMeta.securityDesc"),
        };
    }
    return {
        kicker,
        title: i18n.t("settings.sectionMeta.preferencesTitle"),
        subtitle: i18n.t("settings.sectionMeta.preferencesDesc"),
    };
}
