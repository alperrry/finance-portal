import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode, type RefObject } from "react";
import { ApiError } from "../api/client";
import { updateCurrentUser, type UpdateUserRequest, type UserResponse } from "../api/user";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/ToastContext";
import { KapitalShell } from "../components/layout";
import "./ProfilePage.css";

type ProfileForm = {
    firstName: string;
    lastName: string;
    email: string;
};

type ProfileField = keyof ProfileForm;
type FormErrors = Partial<Record<ProfileField, string>>;
type FieldTouched = Partial<Record<ProfileField, boolean>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY_FORM: ProfileForm = {
    firstName: "",
    lastName: "",
    email: "",
};

function buildForm(user: UserResponse | null): ProfileForm {
    if (!user) return EMPTY_FORM;

    return {
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        email: user.email ?? "",
    };
}

function validateForm(form: ProfileForm): FormErrors {
    const errors: FormErrors = {};

    const validateName = (field: "firstName" | "lastName", label: string) => {
        const value = form[field].trim();

        if (value.length < 1) {
            errors[field] = `${label} 1-100 karakter olmalıdır.`;
            return;
        }

        if (value.length > 100) {
            errors[field] = `${label} en fazla 100 karakter olabilir.`;
        }
    };

    validateName("firstName", "Ad");
    validateName("lastName", "Soyad");

    const email = form.email.trim();
    if (email.length < 1) {
        errors.email = "E-posta zorunludur.";
    } else if (email.length > 255) {
        errors.email = "E-posta en fazla 255 karakter olabilir.";
    } else if (!EMAIL_PATTERN.test(email)) {
        errors.email = "Geçerli bir e-posta adresi girin.";
    }

    return errors;
}

function formatDateTime(value: string | null | undefined) {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    const datePart = new Intl.DateTimeFormat("tr-TR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    })
        .format(date)
        .replaceAll(".", "");
    const timePart = new Intl.DateTimeFormat("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);

    return `${datePart}, ${timePart}`;
}

function trimValue(value: string) {
    return value.trim();
}

function buildUpdatePayload(form: ProfileForm, user: UserResponse): UpdateUserRequest {
    const payload: UpdateUserRequest = {};
    const firstName = trimValue(form.firstName);
    const lastName = trimValue(form.lastName);
    const email = trimValue(form.email);

    if (firstName !== trimValue(user.firstName ?? "")) payload.firstName = firstName;
    if (lastName !== trimValue(user.lastName ?? "")) payload.lastName = lastName;
    if (email !== trimValue(user.email ?? "")) payload.email = email;

    return payload;
}

function isPayloadEmpty(payload: UpdateUserRequest) {
    return !payload.firstName && !payload.lastName && !payload.email;
}

function resolveProfileError(caughtError: unknown) {
    if (caughtError instanceof ApiError) {
        if (caughtError.status === 403) return "Bu işleme yetkiniz yok";
        if (caughtError.status === 400) return caughtError.message || "Form bilgilerini kontrol edin.";
        if (caughtError.status === 401) return "Oturum süreniz doldu. Giriş sayfasına yönlendiriliyorsunuz.";
        if (caughtError.status >= 500) return "Bir hata oluştu, tekrar deneyin";
        return caughtError.message;
    }

    if (caughtError instanceof TypeError) {
        return "Bir hata oluştu, tekrar deneyin";
    }

    if (caughtError instanceof Error) {
        return caughtError.message;
    }

    return "Bir hata oluştu, tekrar deneyin";
}

export default function ProfilePage() {
    const { currentUser, userLoading, userError, refreshCurrentUser, setCurrentUser } = useAuth();
    const { showToast } = useToast();
    const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
    const [touched, setTouched] = useState<FieldTouched>({});
    const [serverError, setServerError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const firstNameRef = useRef<HTMLInputElement>(null);
    const lastNameRef = useRef<HTMLInputElement>(null);
    const emailRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!currentUser) return;

        setForm(buildForm(currentUser));
        setTouched({});
        setServerError(null);
    }, [currentUser]);

    const errors = useMemo(() => validateForm(form), [form]);
    const payload = useMemo<UpdateUserRequest>(() => (currentUser ? buildUpdatePayload(form, currentUser) : {}), [form, currentUser]);
    const hasChanges = currentUser ? !isPayloadEmpty(payload) : false;
    const hasErrors = Object.keys(errors).length > 0;
    const canSubmit = Boolean(currentUser && hasChanges && !hasErrors && !saving);

    const updateField = (field: ProfileField) => (event: ChangeEvent<HTMLInputElement>) => {
        const { value } = event.target;
        setForm((current) => ({ ...current, [field]: value }));
        setTouched((current) => ({ ...current, [field]: true }));
        setServerError(null);
    };

    const touchField = (field: ProfileField) => {
        setTouched((current) => ({ ...current, [field]: true }));
    };

    const focusField = (field: ProfileField) => {
        const refs: Record<ProfileField, RefObject<HTMLInputElement | null>> = {
            firstName: firstNameRef,
            lastName: lastNameRef,
            email: emailRef,
        };

        refs[field].current?.focus();
        refs[field].current?.select();
        touchField(field);
    };

    const resetForm = () => {
        setForm(buildForm(currentUser));
        setTouched({});
        setServerError(null);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setTouched({ firstName: true, lastName: true, email: true });

        if (!currentUser || hasErrors || isPayloadEmpty(payload)) return;

        setSaving(true);
        setServerError(null);

        try {
            const updatedUser = await updateCurrentUser(payload);
            setCurrentUser(updatedUser);
            setForm(buildForm(updatedUser));
            setTouched({});
            showToast("Profiliniz güncellendi", "success");
        } catch (caughtError) {
            setServerError(resolveProfileError(caughtError));
        } finally {
            setSaving(false);
        }
    };

    const renderFieldError = (field: ProfileField) => {
        if (!touched[field] || !errors[field]) return null;
        return <span className="profile-field-error">{errors[field]}</span>;
    };

    const renderInfoRow = (label: string, value: ReactNode, field?: ProfileField) => (
        <div className={`profile-info-row ${field ? "editable" : ""}`.trim()}>
            <span className="profile-info-label">{label}</span>
            <span className="profile-info-value">
                {value}
                {field ? (
                    <button className="profile-edit-icon" type="button" onClick={() => focusField(field)} aria-label={`${label} alanını düzenle`}>
                        <span aria-hidden="true">✎</span>
                    </button>
                ) : null}
            </span>
        </div>
    );

    const reloadProfile = () => {
        setServerError(null);
        void refreshCurrentUser();
    };

    return (
        <KapitalShell activePage="profile" showCategories={false}>
            <div className="profile-page">
                <div className="profile-layout">
                    <section className="profile-hero">
                        <div>
                            <div className="profile-kicker">Hesap Merkezi</div>
                            <h1 className="profile-title">Profilim</h1>
                        </div>
                        {currentUser?.role === "ADMIN" ? <span className="profile-role-badge admin">Admin</span> : null}
                    </section>

                    {userError ? (
                        <div className="profile-status-card error">
                            <div>
                                <strong>Profil bilgileri alınamadı.</strong>
                                <span>{userError}</span>
                            </div>
                            <button className="profile-inline-btn" type="button" onClick={reloadProfile}>
                                Tekrar dene
                            </button>
                        </div>
                    ) : null}

                    {userLoading && !currentUser ? (
                        <section className="profile-grid">
                            <article className="profile-panel">
                                <div className="profile-skeleton-line short" />
                                <div className="profile-skeleton-block" />
                                <div className="profile-skeleton-block" />
                                <div className="profile-skeleton-block" />
                            </article>
                            <article className="profile-panel">
                                <div className="profile-skeleton-line short" />
                                <div className="profile-skeleton-block" />
                                <div className="profile-skeleton-block" />
                                <div className="profile-skeleton-block" />
                            </article>
                        </section>
                    ) : null}

                    {currentUser ? (
                        <section className="profile-grid">
                            <article className="profile-panel">
                                <div className="profile-panel-head">
                                    <div>
                                        <div className="profile-panel-kicker">Kullanıcı Bilgileri</div>
                                        <h2 className="profile-panel-title">Hesap Özeti</h2>
                                    </div>
                                    <span className={`profile-status-pill ${currentUser.isActive ? "active" : "passive"}`.trim()}>
                                        {currentUser.isActive ? "Aktif" : "Pasif"}
                                    </span>
                                </div>

                                <div className="profile-info-list">
                                    {renderInfoRow("Ad", currentUser.firstName || "-", "firstName")}
                                    {renderInfoRow("Soyad", currentUser.lastName || "-", "lastName")}
                                    {renderInfoRow("E-posta", currentUser.email || "-", "email")}
                                    {renderInfoRow("Kullanıcı adı", currentUser.username || "-")}
                                    {renderInfoRow(
                                        "Rol",
                                        <span className={`profile-role-badge ${currentUser.role === "ADMIN" ? "admin" : "neutral"}`.trim()}>
                                            {currentUser.role}
                                        </span>,
                                    )}
                                    {renderInfoRow("Son giriş tarihi", formatDateTime(currentUser.lastLoginAt))}
                                    {renderInfoRow("Kayıt tarihi", formatDateTime(currentUser.createdAt))}
                                    {renderInfoRow(
                                        "Hesap durumu",
                                        <span className={`profile-status-text ${currentUser.isActive ? "active" : "passive"}`.trim()}>
                                            {currentUser.isActive ? "Aktif" : "Pasif"}
                                        </span>,
                                    )}
                                </div>
                            </article>

                            <article className="profile-panel">
                                <div className="profile-panel-head">
                                    <div>
                                        <div className="profile-panel-kicker">Bilgi Düzenleme</div>
                                        <h2 className="profile-panel-title">Profili Düzenle</h2>
                                    </div>
                                </div>

                                <form className="profile-form" onSubmit={handleSubmit} noValidate>
                                    <label className="profile-field" htmlFor="profile-first-name">
                                        <span>Ad</span>
                                        <input
                                            ref={firstNameRef}
                                            id="profile-first-name"
                                            value={form.firstName}
                                            onChange={updateField("firstName")}
                                            onBlur={() => touchField("firstName")}
                                            className={touched.firstName && errors.firstName ? "invalid" : ""}
                                            maxLength={100}
                                        />
                                        {renderFieldError("firstName")}
                                    </label>

                                    <label className="profile-field" htmlFor="profile-last-name">
                                        <span>Soyad</span>
                                        <input
                                            ref={lastNameRef}
                                            id="profile-last-name"
                                            value={form.lastName}
                                            onChange={updateField("lastName")}
                                            onBlur={() => touchField("lastName")}
                                            className={touched.lastName && errors.lastName ? "invalid" : ""}
                                            maxLength={100}
                                        />
                                        {renderFieldError("lastName")}
                                    </label>

                                    <label className="profile-field" htmlFor="profile-email">
                                        <span>E-posta</span>
                                        <input
                                            ref={emailRef}
                                            id="profile-email"
                                            type="email"
                                            value={form.email}
                                            onChange={updateField("email")}
                                            onBlur={() => touchField("email")}
                                            className={touched.email && errors.email ? "invalid" : ""}
                                            maxLength={255}
                                        />
                                        {renderFieldError("email")}
                                    </label>

                                    <label className="profile-field disabled" htmlFor="profile-username">
                                        <span>Kullanıcı adı</span>
                                        <input id="profile-username" value={currentUser.username} disabled />
                                        <small>Bu alan Keycloak'tan yönetilir.</small>
                                    </label>

                                    <label className="profile-field disabled" htmlFor="profile-role">
                                        <span>Rol</span>
                                        <input id="profile-role" value={currentUser.role} disabled />
                                        <small>Rol sadece admin panelinden değiştirilebilir.</small>
                                    </label>

                                    {serverError ? <div className="profile-form-error">{serverError}</div> : null}

                                    <div className="profile-form-actions">
                                        <button className="profile-save-btn" type="submit" disabled={!canSubmit}>
                                            {saving ? "Kaydediliyor..." : "Kaydet"}
                                        </button>
                                        <button className="profile-cancel-btn" type="button" onClick={resetForm} disabled={saving || !hasChanges}>
                                            İptal
                                        </button>
                                    </div>
                                </form>
                            </article>
                        </section>
                    ) : null}
                </div>
            </div>
        </KapitalShell>
    );
}
