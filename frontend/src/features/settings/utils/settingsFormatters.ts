import { ApiError } from "../../../services/api/client";
import type { UpdateUserRequest, UserResponse } from "../../profile/api/userApi";
import type { FormErrors, PasswordErrors, PasswordForm, ProfileField, ProfileForm, SettingsSection } from "../types";

export const KEYCLOAK_BASE_URL = import.meta.env.VITE_KEYCLOAK_URL ?? "http://localhost:8080";
export const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM ?? "finance-portal";
export const KEYCLOAK_ACCOUNT_URL = `${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}/account`;

export const EMPTY_FORM: ProfileForm = { firstName: "", lastName: "" };
export const EMPTY_PASSWORD_FORM: PasswordForm = { newPassword: "", confirmPassword: "" };

export function buildForm(user: UserResponse | null): ProfileForm {
    if (!user) return EMPTY_FORM;
    return { firstName: user.firstName ?? "", lastName: user.lastName ?? "" };
}

export function validateProfileForm(form: ProfileForm): FormErrors {
    const errors: FormErrors = {};
    const validate = (field: ProfileField, label: string) => {
        const value = form[field].trim();
        if (value.length < 1) { errors[field] = `${label} 1-100 karakter olmalidir.`; return; }
        if (value.length > 100) { errors[field] = `${label} en fazla 100 karakter olabilir.`; }
    };
    validate("firstName", "Ad");
    validate("lastName", "Soyad");
    return errors;
}

export function buildUpdatePayload(form: ProfileForm, user: UserResponse): UpdateUserRequest {
    const payload: UpdateUserRequest = {};
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    if (firstName !== (user.firstName ?? "").trim()) payload.firstName = firstName;
    if (lastName !== (user.lastName ?? "").trim()) payload.lastName = lastName;
    return payload;
}

export function isPayloadEmpty(payload: UpdateUserRequest) {
    return !payload.firstName && !payload.lastName;
}

export function formatDate(value: string | null | undefined) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("tr-TR", {
        day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
    }).format(date);
}

export function getInitials(user: UserResponse | null) {
    if (!user) return "FP";
    const fullName = [user.firstName, user.lastName].map((v) => v?.trim()).filter(Boolean).join(" ");
    const source = fullName || user.username || user.email || "Finance Portal";
    const parts = source.split(" ").filter(Boolean);
    const initials = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : source.slice(0, 2);
    return initials.toLocaleUpperCase("tr-TR");
}

export function getRoleLabel(role: UserResponse["role"]) {
    return role === "ADMIN" ? "Admin" : "Normal Kullanici";
}

export function resolveProfileError(caughtError: unknown) {
    if (caughtError instanceof ApiError) {
        const message = caughtError.payload?.message || caughtError.message;
        if (caughtError.status === 403) return "Bu isleme yetkiniz yok.";
        if (caughtError.status === 401) return "Oturum sureniz doldu. Lutfen yeniden giris yapin.";
        if (caughtError.status >= 500) return "Sunucuda bir hata olustu. Lutfen tekrar deneyin.";
        return message;
    }
    if (caughtError instanceof Error) return caughtError.message;
    return "Bir hata olustu. Lutfen tekrar deneyin.";
}

export function validatePasswordForm(form: PasswordForm): PasswordErrors {
    const errors: PasswordErrors = {};
    if (form.newPassword.length < 8) errors.newPassword = "Şifre en az 8 karakter olmalıdır.";
    else if (form.newPassword.length > 128) errors.newPassword = "Şifre en fazla 128 karakter olabilir.";
    if (form.confirmPassword !== form.newPassword) errors.confirmPassword = "Şifre tekrarı eşleşmiyor.";
    return errors;
}

export function openExternal(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
}

export function getSectionMeta(section: SettingsSection) {
    if (section === "profile") {
        return {
            kicker: "Hesap Merkezi",
            title: "Profil Ayarlari",
            subtitle: "Keycloak ile yonetilen kimlik bilgileriniz ve uygulama ici profil detaylariniz.",
        };
    }
    if (section === "security") {
        return {
            kicker: "Hesap Merkezi",
            title: "Guvenlik",
            subtitle: "Sifre, iki asamali dogrulama ve hesap koruma ayarlarinizi yonetin.",
        };
    }
    return {
        kicker: "Hesap Merkezi",
        title: "Tercihler",
        subtitle: "Tema, bildirim ve gorunum tercihleriniz tarayicinizda saklanir.",
    };
}
