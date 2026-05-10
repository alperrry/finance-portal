import { ApiError } from "../../../services/api/client";
import type { UpdateUserRequest, UserResponse } from "../api/userApi";
import type { FormErrors, ProfileField, ProfileForm } from "../types";

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EMPTY_FORM: ProfileForm = { firstName: "", lastName: "", email: "" };

export function buildForm(user: UserResponse | null): ProfileForm {
    if (!user) return EMPTY_FORM;
    return { firstName: user.firstName ?? "", lastName: user.lastName ?? "", email: user.email ?? "" };
}

export function validateForm(form: ProfileForm): FormErrors {
    const errors: FormErrors = {};
    const validateName = (field: "firstName" | "lastName", label: string) => {
        const value = form[field].trim();
        if (value.length < 1) { errors[field] = `${label} 1-100 karakter olmalıdır.`; return; }
        if (value.length > 100) { errors[field] = `${label} en fazla 100 karakter olabilir.`; }
    };
    validateName("firstName", "Ad");
    validateName("lastName", "Soyad");
    const email = form.email.trim();
    if (email.length < 1) errors.email = "E-posta zorunludur.";
    else if (email.length > 255) errors.email = "E-posta en fazla 255 karakter olabilir.";
    else if (!EMAIL_PATTERN.test(email)) errors.email = "Geçerli bir e-posta adresi girin.";
    return errors;
}

export function formatDateTime(value: string | null | undefined) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    const datePart = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" }).format(date).replaceAll(".", "");
    const timePart = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(date);
    return `${datePart}, ${timePart}`;
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

export function resolveProfileError(caughtError: unknown): string {
    if (caughtError instanceof ApiError) {
        if (caughtError.status === 403) return "Bu işleme yetkiniz yok";
        if (caughtError.status === 400) return caughtError.message || "Form bilgilerini kontrol edin.";
        if (caughtError.status === 401) return "Oturum süreniz doldu. Giriş sayfasına yönlendiriliyorsunuz.";
        if (caughtError.status >= 500) return "Bir hata oluştu, tekrar deneyin";
        return caughtError.message;
    }
    if (caughtError instanceof Error) return caughtError.message;
    return "Bir hata oluştu, tekrar deneyin";
}

export function getFieldRef(
    field: ProfileField,
    firstNameRef: React.RefObject<HTMLInputElement | null>,
    lastNameRef: React.RefObject<HTMLInputElement | null>,
    emailRef: React.RefObject<HTMLInputElement | null>,
) {
    if (field === "firstName") return firstNameRef;
    if (field === "lastName") return lastNameRef;
    return emailRef;
}
