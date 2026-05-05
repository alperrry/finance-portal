import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
    type ClipboardEvent,
    type FormEvent,
    type KeyboardEvent,
    type MutableRefObject,
} from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import {
    changeCurrentUserPassword,
    deleteOtpCredential,
    fetchSecurityStatus,
    setupOtp,
    updateCurrentUser,
    verifyOtp,
    type OtpSetupResponse,
    type SecurityStatusResponse,
    type UpdateUserRequest,
    type UserResponse,
} from "../api/user";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/ToastContext";
import { KapitalShell } from "../components/layout";
import {
    type DisplayPreferences,
    type LocalePreference,
    type NotificationPreferences,
    type ThemePreference,
} from "../preferences/UiPreferencesContext";
import { useUiPreferences } from "../preferences/UiPreferencesContextValue";
import "./SettingsPage.css";

type SettingsSection = "profile" | "security" | "preferences";
type ProfileForm = {
    firstName: string;
    lastName: string;
};
type PasswordForm = {
    newPassword: string;
    confirmPassword: string;
};
type ProfileField = keyof ProfileForm;
type FormErrors = Partial<Record<ProfileField, string>>;
type FieldTouched = Partial<Record<ProfileField, boolean>>;
type PasswordErrors = Partial<Record<keyof PasswordForm, string>>;

const SETTINGS_SECTIONS: Array<{ id: SettingsSection; label: string; description: string }> = [
    { id: "profile", label: "Profil", description: "Kullanici bilgileri" },
    { id: "security", label: "Guvenlik", description: "Sifre ve 2FA" },
    { id: "preferences", label: "Tercihler", description: "Tema ve bildirimler" },
];

const KEYCLOAK_BASE_URL = import.meta.env.VITE_KEYCLOAK_URL ?? "http://localhost:8080";
const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM ?? "finance-portal";
const KEYCLOAK_ACCOUNT_URL = `${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}/account`;

const EMPTY_FORM: ProfileForm = {
    firstName: "",
    lastName: "",
};

const EMPTY_PASSWORD_FORM: PasswordForm = {
    newPassword: "",
    confirmPassword: "",
};

function buildForm(user: UserResponse | null): ProfileForm {
    if (!user) return EMPTY_FORM;

    return {
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
    };
}

function validateProfileForm(form: ProfileForm): FormErrors {
    const errors: FormErrors = {};

    const validate = (field: ProfileField, label: string) => {
        const value = form[field].trim();

        // Backend UpdateUserRequest bos string kabul etmiyor; bu nedenle name alanlarini required tutuyoruz.
        if (value.length < 1) {
            errors[field] = `${label} 1-100 karakter olmalidir.`;
            return;
        }

        if (value.length > 100) {
            errors[field] = `${label} en fazla 100 karakter olabilir.`;
        }
    };

    validate("firstName", "Ad");
    validate("lastName", "Soyad");

    return errors;
}

function buildUpdatePayload(form: ProfileForm, user: UserResponse): UpdateUserRequest {
    const payload: UpdateUserRequest = {};
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();

    if (firstName !== (user.firstName ?? "").trim()) payload.firstName = firstName;
    if (lastName !== (user.lastName ?? "").trim()) payload.lastName = lastName;

    return payload;
}

function isPayloadEmpty(payload: UpdateUserRequest) {
    return !payload.firstName && !payload.lastName;
}

function formatDate(value: string | null | undefined) {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("tr-TR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function getInitials(user: UserResponse | null) {
    if (!user) return "FP";

    const fullName = [user.firstName, user.lastName]
        .map((value) => value?.trim())
        .filter(Boolean)
        .join(" ");

    const source = fullName || user.username || user.email || "Finance Portal";
    const parts = source.split(" ").filter(Boolean);
    const initials = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : source.slice(0, 2);
    return initials.toLocaleUpperCase("tr-TR");
}

function getRoleLabel(role: UserResponse["role"]) {
    return role === "ADMIN" ? "Admin" : "Normal Kullanici";
}

function resolveProfileError(caughtError: unknown) {
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

function validatePasswordForm(form: PasswordForm): PasswordErrors {
    const errors: PasswordErrors = {};

    if (form.newPassword.length < 8) {
        errors.newPassword = "Şifre en az 8 karakter olmalıdır.";
    } else if (form.newPassword.length > 128) {
        errors.newPassword = "Şifre en fazla 128 karakter olabilir.";
    }

    if (form.confirmPassword !== form.newPassword) {
        errors.confirmPassword = "Şifre tekrarı eşleşmiyor.";
    }

    return errors;
}

function openExternal(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
}

function getSectionMeta(section: SettingsSection) {
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

function SettingsTabs({
    activeSection,
    tabRefs,
}: {
    activeSection: SettingsSection;
    tabRefs: MutableRefObject<Array<HTMLButtonElement | null>>;
}) {
    const navigate = useNavigate();

    const focusSection = (index: number) => {
        tabRefs.current[index]?.focus();
    };

    const navigateToSection = (section: SettingsSection) => {
        navigate(`/settings/${section}`);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
        const lastIndex = SETTINGS_SECTIONS.length - 1;

        switch (event.key) {
            case "ArrowRight":
            case "ArrowDown": {
                event.preventDefault();
                const nextIndex = index === lastIndex ? 0 : index + 1;
                navigateToSection(SETTINGS_SECTIONS[nextIndex].id);
                window.requestAnimationFrame(() => focusSection(nextIndex));
                break;
            }
            case "ArrowLeft":
            case "ArrowUp": {
                event.preventDefault();
                const nextIndex = index === 0 ? lastIndex : index - 1;
                navigateToSection(SETTINGS_SECTIONS[nextIndex].id);
                window.requestAnimationFrame(() => focusSection(nextIndex));
                break;
            }
            case "Home": {
                event.preventDefault();
                navigateToSection(SETTINGS_SECTIONS[0].id);
                window.requestAnimationFrame(() => focusSection(0));
                break;
            }
            case "End": {
                event.preventDefault();
                navigateToSection(SETTINGS_SECTIONS[lastIndex].id);
                window.requestAnimationFrame(() => focusSection(lastIndex));
                break;
            }
            case "Enter":
            case " ": {
                event.preventDefault();
                navigateToSection(SETTINGS_SECTIONS[index].id);
                break;
            }
            default:
                break;
        }
    };

    return (
        <aside className="settings-tabs-wrap">
            <div className="settings-tabs-card">
                <div className="settings-tabs-head">
                    <span className="settings-card-kicker">Bolumler</span>
                    <h2 className="settings-tabs-title">Ayarlar</h2>
                </div>

                <div className="settings-tablist" role="tablist" aria-label="Ayarlar bolumleri">
                    {SETTINGS_SECTIONS.map((section, index) => {
                        const active = activeSection === section.id;
                        return (
                            <button
                                key={section.id}
                                ref={(node) => {
                                    tabRefs.current[index] = node;
                                }}
                                id={`settings-tab-${section.id}`}
                                className={`settings-tab ${active ? "active" : ""}`.trim()}
                                type="button"
                                role="tab"
                                tabIndex={active ? 0 : -1}
                                aria-selected={active}
                                aria-controls={`settings-panel-${section.id}`}
                                onClick={() => navigateToSection(section.id)}
                                onKeyDown={(event) => handleKeyDown(event, index)}
                            >
                                <span className="settings-tab-label">{section.label}</span>
                                <span className="settings-tab-copy">{section.description}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </aside>
    );
}

function ProfileSection() {
    const { currentUser, userLoading, userError, refreshCurrentUser, setCurrentUser } = useAuth();
    const { showToast } = useToast();
    const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
    const [touched, setTouched] = useState<FieldTouched>({});
    const [serverError, setServerError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!currentUser) return;
        setForm(buildForm(currentUser));
        setTouched({});
        setServerError(null);
    }, [currentUser]);

    const errors = useMemo(() => validateProfileForm(form), [form]);
    const payload = useMemo<UpdateUserRequest>(
        () => (currentUser ? buildUpdatePayload(form, currentUser) : {}),
        [form, currentUser],
    );
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

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setTouched({ firstName: true, lastName: true });

        if (!currentUser || !canSubmit) return;

        setSaving(true);
        setServerError(null);

        try {
            const updatedUser = await updateCurrentUser(payload);
            setCurrentUser(updatedUser);
            setForm(buildForm(updatedUser));
            setTouched({});
            showToast("Profil guncellendi", "success");
        } catch (caughtError) {
            const message = resolveProfileError(caughtError);
            setServerError(message);
            showToast(message, "error");
        } finally {
            setSaving(false);
        }
    };

    const resetForm = () => {
        setForm(buildForm(currentUser));
        setTouched({});
        setServerError(null);
    };

    const renderFieldError = (field: ProfileField) => {
        if (!touched[field] || !errors[field]) return null;
        return <span className="settings-field-error">{errors[field]}</span>;
    };

    if (userLoading && !currentUser) {
        return (
            <section className="settings-panel-content">
                <div className="settings-grid settings-grid-profile">
                    <article className="settings-card">
                        <div className="settings-skeleton-line short" />
                        <div className="settings-skeleton-avatar" />
                        <div className="settings-skeleton-block" />
                        <div className="settings-skeleton-block" />
                        <div className="settings-skeleton-block" />
                    </article>
                    <article className="settings-card">
                        <div className="settings-skeleton-line short" />
                        <div className="settings-skeleton-block" />
                        <div className="settings-skeleton-block" />
                        <div className="settings-skeleton-block" />
                    </article>
                </div>
            </section>
        );
    }

    if (userError) {
        return (
            <section className="settings-panel-content">
                <div className="settings-status-card error">
                    <div>
                        <strong>Profil bilgileri alinamadi.</strong>
                        <span>{userError}</span>
                    </div>
                    <button className="settings-inline-btn" type="button" onClick={() => void refreshCurrentUser()}>
                        Tekrar dene
                    </button>
                </div>
            </section>
        );
    }

    if (!currentUser) return null;

    return (
        <section className="settings-panel-content" id="settings-panel-profile" role="tabpanel" aria-labelledby="settings-tab-profile">
            <div className="settings-grid settings-grid-profile">
                <article className="settings-card">
                    <div className="settings-card-head">
                        <div>
                            <span className="settings-card-kicker">Kimlik Bilgileri</span>
                            <h3 className="settings-card-title">Hesap ozeti</h3>
                        </div>
                        <span className={`settings-status-pill ${currentUser.isActive ? "active" : "passive"}`.trim()}>
                            {currentUser.isActive ? "Aktif" : "Pasif"}
                        </span>
                    </div>

                    <div className="settings-avatar-block">
                        <div className="settings-avatar-circle" aria-hidden="true">
                            {getInitials(currentUser)}
                        </div>
                        <div className="settings-avatar-copy">
                            <strong>{[currentUser.firstName, currentUser.lastName].filter(Boolean).join(" ") || currentUser.username}</strong>
                            <span>{currentUser.username}</span>
                        </div>
                    </div>

                    <div className="settings-info-list">
                        <div className="settings-info-row">
                            <span className="settings-info-label">Kullanici adi</span>
                            <span className="settings-info-value">{currentUser.username || "-"}</span>
                        </div>
                        <div className="settings-info-row">
                            <span className="settings-info-label">E-posta</span>
                            <span className="settings-info-value">{currentUser.email || "-"}</span>
                        </div>
                        <div className="settings-info-row">
                            <span className="settings-info-label">Rol</span>
                            <span className={`settings-role-badge ${currentUser.role === "ADMIN" ? "admin" : "neutral"}`.trim()}>
                                {getRoleLabel(currentUser.role)}
                            </span>
                        </div>
                        <div className="settings-info-row">
                            <span className="settings-info-label">Kayit tarihi</span>
                            <span className="settings-info-value">{formatDate(currentUser.createdAt)}</span>
                        </div>
                        <div className="settings-info-row">
                            <span className="settings-info-label">Son giris</span>
                            <span className="settings-info-value">{formatDate(currentUser.lastLoginAt)}</span>
                        </div>
                    </div>
                </article>

                <article className="settings-card">
                    <div className="settings-card-head">
                        <div>
                            <span className="settings-card-kicker">Profil Guncelleme</span>
                            <h3 className="settings-card-title">Duzenlenebilir alanlar</h3>
                        </div>
                    </div>

                    <form className="settings-form" onSubmit={handleSubmit} noValidate>
                        <label className="settings-field" htmlFor="settings-first-name">
                            <span>Ad</span>
                            <input
                                id="settings-first-name"
                                value={form.firstName}
                                onChange={updateField("firstName")}
                                onBlur={() => touchField("firstName")}
                                className={touched.firstName && errors.firstName ? "invalid" : ""}
                                maxLength={100}
                            />
                            {renderFieldError("firstName")}
                        </label>

                        <label className="settings-field" htmlFor="settings-last-name">
                            <span>Soyad</span>
                            <input
                                id="settings-last-name"
                                value={form.lastName}
                                onChange={updateField("lastName")}
                                onBlur={() => touchField("lastName")}
                                className={touched.lastName && errors.lastName ? "invalid" : ""}
                                maxLength={100}
                            />
                            {renderFieldError("lastName")}
                        </label>

                        <label className="settings-field disabled" htmlFor="settings-email">
                            <span>E-posta</span>
                            <input id="settings-email" type="email" value={currentUser.email} disabled readOnly />
                            <small>E-posta adresi Keycloak Account Console uzerinden degistirilir.</small>
                        </label>

                        <div className="settings-inline-note">
                            <div>
                                <strong>Email'i degistirmek icin Account Console'u kullanin.</strong>
                                <span>Degisiklik bir sonraki backend isteginde otomatik senkronize edilir.</span>
                            </div>
                            <button className="settings-inline-btn" type="button" onClick={() => openExternal(KEYCLOAK_ACCOUNT_URL)}>
                                Account Console
                            </button>
                        </div>

                        {serverError ? <div className="settings-form-error">{serverError}</div> : null}

                        <div className="settings-form-actions">
                            <button className="settings-primary-btn" type="submit" disabled={!canSubmit}>
                                {saving ? "Guncelleniyor..." : "Profili guncelle"}
                            </button>
                            <button className="settings-secondary-btn" type="button" onClick={resetForm} disabled={!hasChanges || saving}>
                                Degisiklikleri al
                            </button>
                        </div>
                    </form>
                </article>
            </div>
        </section>
    );
}

function SecuritySection() {
    const { showToast } = useToast();
    const [passwordForm, setPasswordForm] = useState<PasswordForm>(EMPTY_PASSWORD_FORM);
    const [passwordTouched, setPasswordTouched] = useState<Partial<Record<keyof PasswordForm, boolean>>>({});
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [securityStatus, setSecurityStatus] = useState<SecurityStatusResponse | null>(null);
    const [securityLoading, setSecurityLoading] = useState(true);
    const [securityError, setSecurityError] = useState<string | null>(null);
    const [otpBusyId, setOtpBusyId] = useState<string | null>(null);

    const [otpStep, setOtpStep] = useState<"idle" | "starting" | "qr" | "verify">("idle");
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

    useEffect(() => {
        void loadSecurityStatus();
    }, []);

    const updatePasswordField = (field: keyof PasswordForm) => (event: ChangeEvent<HTMLInputElement>) => {
        setPasswordForm((current) => ({ ...current, [field]: event.target.value }));
        setPasswordTouched((current) => ({ ...current, [field]: true }));
        setPasswordError(null);
    };

    const renderPasswordError = (field: keyof PasswordForm) => {
        if (!passwordTouched[field] || !passwordErrors[field]) return null;
        return <span className="settings-field-error">{passwordErrors[field]}</span>;
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
            showToast("Iki asamali dogrulama aktive edildi", "success");
        } catch (err) {
            if (err instanceof ApiError && err.status === 410) {
                setOtpStep("idle");
                setOtpSetupData(null);
                setOtpError("Setup suresi doldu, yeniden baslatin.");
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
        if (digit && index < 5) {
            otpInputRefs.current[index + 1]?.focus();
        }
        if (digit && index === 5 && next.join("").length === 6) {
            void handleOtpSubmit(next.join(""));
        }
    };

    const handleOtpKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !otpCode[index] && index > 0) {
            otpInputRefs.current[index - 1]?.focus();
        }
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

    return (
        <section className="settings-panel-content" id="settings-panel-security" role="tabpanel" aria-labelledby="settings-tab-security">
            <div className="settings-grid settings-grid-security">
                <article className="settings-card">
                    <div className="settings-card-head">
                        <div>
                            <span className="settings-card-kicker">Sifre</span>
                            <h3 className="settings-card-title">Sifre degistirme</h3>
                        </div>
                    </div>
                    <p className="settings-card-copy">
                        Yeni şifrenizi bu sayfadan belirleyin. Değişiklik Keycloak hesabınıza doğrudan uygulanır.
                    </p>
                    <form className="settings-form" onSubmit={handlePasswordSubmit} noValidate>
                        <label className="settings-field" htmlFor="settings-new-password">
                            <span>Yeni Şifre</span>
                            <input
                                id="settings-new-password"
                                type="password"
                                value={passwordForm.newPassword}
                                onChange={updatePasswordField("newPassword")}
                                onBlur={() => setPasswordTouched((current) => ({ ...current, newPassword: true }))}
                                autoComplete="new-password"
                                className={passwordTouched.newPassword && passwordErrors.newPassword ? "invalid" : ""}
                            />
                            {renderPasswordError("newPassword")}
                        </label>
                        <label className="settings-field" htmlFor="settings-confirm-password">
                            <span>Şifre Tekrarı</span>
                            <input
                                id="settings-confirm-password"
                                type="password"
                                value={passwordForm.confirmPassword}
                                onChange={updatePasswordField("confirmPassword")}
                                onBlur={() => setPasswordTouched((current) => ({ ...current, confirmPassword: true }))}
                                autoComplete="new-password"
                                className={passwordTouched.confirmPassword && passwordErrors.confirmPassword ? "invalid" : ""}
                            />
                            {renderPasswordError("confirmPassword")}
                        </label>

                        {passwordError ? <div className="settings-form-error">{passwordError}</div> : null}

                        <div className="settings-form-actions">
                            <button className="settings-primary-btn" type="submit" disabled={!passwordCanSubmit}>
                                {passwordSaving ? "Güncelleniyor..." : "Şifreyi güncelle"}
                            </button>
                        </div>
                    </form>
                </article>

                <article className="settings-card">
                    <div className="settings-card-head">
                        <div>
                            <span className="settings-card-kicker">Iki Asamali Dogrulama</span>
                            <h3 className="settings-card-title">2FA / OTP</h3>
                        </div>
                        <span className={`settings-status-pill ${securityStatus?.otpEnabled ? "active" : "passive"}`}>
                            {securityStatus?.otpEnabled ? "Aktif" : "Pasif"}
                        </span>
                    </div>
                    <p className="settings-card-copy">
                        Hesabiniza ekstra guvenlik katmani ekleyin. Authenticator uygulamasi ile her giriste 6 haneli kod isteyebiliriz.
                    </p>
                    <p className="settings-card-muted">
                        Mevcut OTP cihazlarınızı bu sayfadan görüntüleyebilir ve kaldırabilirsiniz.
                    </p>

                    {securityLoading ? (
                        <div className="settings-inline-note compact">
                            <div>
                                <strong>Durum okunuyor</strong>
                                <span>Keycloak güvenlik bilgileri alınıyor.</span>
                            </div>
                        </div>
                    ) : securityError ? (
                        <div className="settings-status-card error">
                            <div>
                                <strong>Güvenlik bilgileri alınamadı</strong>
                                <span>{securityError}</span>
                            </div>
                            <button className="settings-inline-btn" type="button" onClick={() => void loadSecurityStatus()}>
                                Tekrar dene
                            </button>
                        </div>
                    ) : securityStatus?.otpEnabled ? (
                        <div className="settings-credential-list">
                            {securityStatus.otpCredentials.map((credential) => (
                                <div key={credential.id} className="settings-credential-row">
                                    <div>
                                        <strong>{credential.label || "Authenticator"}</strong>
                                        <span>{credential.createdAt ? formatDate(new Date(credential.createdAt).toISOString()) : "Kayıt tarihi yok"}</span>
                                    </div>
                                    <button
                                        className="settings-secondary-btn danger"
                                        type="button"
                                        disabled={otpBusyId === credential.id}
                                        onClick={() => void handleDeleteOtp(credential.id)}
                                    >
                                        {otpBusyId === credential.id ? "Kaldırılıyor..." : "Kaldır"}
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : otpStep === "qr" && otpSetupData ? (
                        <div className="otp-setup-flow">
                            <div className="otp-setup-qr-block">
                                <img src={otpSetupData.qrCodeDataUrl} alt="TOTP QR kodu" className="otp-setup-qr-img" />
                            </div>
                            <div className="otp-setup-secret-block">
                                <span className="settings-card-kicker">Manuel giris icin kod</span>
                                <div className="otp-setup-secret-row">
                                    <code className="otp-setup-secret">{otpSetupData.secret}</code>
                                    <button
                                        className="settings-inline-btn"
                                        type="button"
                                        onClick={() => void navigator.clipboard.writeText(otpSetupData.secret)}
                                    >
                                        Kopyala
                                    </button>
                                </div>
                                <p className="settings-card-muted">
                                    Authenticator uygulamanizda "Manuel giris" secenegi ile yukardaki kodu girin veya QR kodu tarayin.
                                </p>
                            </div>
                            <div className="settings-action-row">
                                <button className="settings-secondary-btn" type="button" onClick={resetOtpFlow}>
                                    Iptal
                                </button>
                                <button
                                    className="settings-primary-btn"
                                    type="button"
                                    onClick={() => {
                                        setOtpStep("verify");
                                        window.requestAnimationFrame(() => otpInputRefs.current[0]?.focus());
                                    }}
                                >
                                    Devam
                                </button>
                            </div>
                        </div>
                    ) : otpStep === "verify" ? (
                        <div className="otp-setup-flow">
                            <p className="settings-card-copy">Authenticator uygulamanizda gorunen 6 haneli kodu girin.</p>
                            <div className="otp-digit-row">
                                {otpCode.map((digit, i) => (
                                    <input
                                        key={i}
                                        ref={(node) => {
                                            otpInputRefs.current[i] = node;
                                        }}
                                        className={`otp-digit-input${otpError ? " invalid" : ""}`}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        autoComplete="one-time-code"
                                        onChange={(e) => handleOtpCodeChange(i, e.target.value)}
                                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                        onPaste={handleOtpPaste}
                                        disabled={otpVerifying}
                                    />
                                ))}
                            </div>
                            {otpError ? <div className="settings-form-error">{otpError}</div> : null}
                            <div className="settings-action-row">
                                <button
                                    className="settings-secondary-btn"
                                    type="button"
                                    onClick={() => {
                                        setOtpStep("qr");
                                        setOtpError(null);
                                        setOtpCode(["", "", "", "", "", ""]);
                                    }}
                                    disabled={otpVerifying}
                                >
                                    Geri
                                </button>
                                <button
                                    className="settings-primary-btn"
                                    type="button"
                                    onClick={() => void handleOtpSubmit(otpCode.join(""))}
                                    disabled={otpCode.join("").length !== 6 || otpVerifying}
                                >
                                    {otpVerifying ? "Dogrulanıyor..." : "Dogrula"}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="settings-inline-note compact">
                                <div>
                                    <strong>2FA henuz aktif degil.</strong>
                                    <span>Google Authenticator veya benzeri bir uygulama ile hesabinizi koruyun.</span>
                                </div>
                                <button
                                    className="settings-primary-btn"
                                    type="button"
                                    onClick={() => void handleStartOtpSetup()}
                                    disabled={otpStep === "starting"}
                                >
                                    {otpStep === "starting" ? "Hazirlaniyor..." : "Etkinlestir"}
                                </button>
                            </div>
                            {otpError ? <div className="settings-form-error otp-idle-error">{otpError}</div> : null}
                        </>
                    )}
                </article>
            </div>
        </section>
    );
}

function ThemeControl({
    value,
    resolvedTheme,
    onChange,
}: {
    value: ThemePreference;
    resolvedTheme: "light" | "dark";
    onChange: (next: ThemePreference) => void;
}) {
    const options: Array<{ id: ThemePreference; label: string; hint: string }> = [
        { id: "light", label: "Acik", hint: "Parlak arayuz" },
        { id: "dark", label: "Koyu", hint: "Dusuk isik" },
        { id: "system", label: "Sistem", hint: `Su an: ${resolvedTheme === "dark" ? "Koyu" : "Acik"}` },
    ];

    return (
        <div className="settings-segmented" role="radiogroup" aria-label="Tema secimi">
            {options.map((option) => {
                const checked = value === option.id;
                return (
                    <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        className={`settings-segment ${checked ? "active" : ""}`.trim()}
                        onClick={() => onChange(option.id)}
                    >
                        <span>{option.label}</span>
                        <small>{option.hint}</small>
                    </button>
                );
            })}
        </div>
    );
}

function ToggleRow({
    title,
    description,
    checked,
    onToggle,
}: {
    title: string;
    description: string;
    checked: boolean;
    onToggle: () => void;
}) {
    return (
        <div className="settings-toggle-row">
            <div className="settings-toggle-copy">
                <strong>{title}</strong>
                <span>{description}</span>
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                className={`settings-switch ${checked ? "active" : ""}`.trim()}
                onClick={onToggle}
            >
                <span className="settings-switch-thumb" aria-hidden="true" />
            </button>
        </div>
    );
}

function PreferencesSection() {
    const { showToast } = useToast();
    const {
        theme,
        locale,
        notifications,
        display,
        resolvedTheme,
        setTheme,
        setLocale,
        setNotifications,
        setDisplay,
        resetPreferences,
    } = useUiPreferences();

    const updateTheme = (next: ThemePreference) => {
        if (next === theme) return;
        setTheme(next);
        showToast("Tercih kaydedildi", "success");
    };

    const updateLocale = (event: ChangeEvent<HTMLSelectElement>) => {
        const next = event.target.value as LocalePreference;
        if (next === locale) return;
        setLocale(next);
        showToast("Tercih kaydedildi", "success");
    };

    const updateNotifications = (next: NotificationPreferences) => {
        setNotifications(next);
        showToast("Tercih kaydedildi", "success");
    };

    const updateDisplay = (next: DisplayPreferences) => {
        setDisplay(next);
        showToast("Tercih kaydedildi", "success");
    };

    const handleReset = () => {
        resetPreferences();
        showToast("Tercihler sifirlandi", "info");
    };

    return (
        <section className="settings-panel-content" id="settings-panel-preferences" role="tabpanel" aria-labelledby="settings-tab-preferences">
            <div className="settings-grid settings-grid-preferences">
                <article className="settings-card">
                    <div className="settings-card-head">
                        <div>
                            <span className="settings-card-kicker">Tema</span>
                            <h3 className="settings-card-title">Gorunus modu</h3>
                        </div>
                    </div>
                    <p className="settings-card-copy">Tema degisikligi aninda uygulanir ve sonraki acilislarda korunur.</p>
                    <ThemeControl value={theme} resolvedTheme={resolvedTheme} onChange={updateTheme} />
                </article>

                <article className="settings-card">
                    <div className="settings-card-head">
                        <div>
                            <span className="settings-card-kicker">Dil</span>
                            <h3 className="settings-card-title">Arayuz dili</h3>
                        </div>
                    </div>
                    <label className="settings-field" htmlFor="settings-locale">
                        <span>Dil secimi</span>
                        <select id="settings-locale" value={locale} onChange={updateLocale}>
                            <option value="tr">Turkce</option>
                            <option value="en">English</option>
                        </select>
                        {/* TODO: Gercek i18n altyapisi eklendiginde bu preference metin cevirilerine baglanacak. */}
                        <small>Su an bu secim sadece localStorage'a yazilir; tam i18n entegrasyonu sonraki asamaya birakildi.</small>
                    </label>
                </article>

                <article className="settings-card">
                    <div className="settings-card-head">
                        <div>
                            <span className="settings-card-kicker">Bildirimler</span>
                            <h3 className="settings-card-title">Uyari tercihleri</h3>
                        </div>
                    </div>
                    <div className="settings-toggle-list">
                        <ToggleRow
                            title="Email bildirimleri"
                            description="Haber ozeti ve portfoy hareketleri icin e-posta tercihi."
                            checked={notifications.email}
                            onToggle={() =>
                                updateNotifications({
                                    ...notifications,
                                    email: !notifications.email,
                                })
                            }
                        />
                        <ToggleRow
                            title="Tarayici bildirimleri"
                            description="Gercek zamanli uyarilar icin tarayici tercih kaydi."
                            checked={notifications.browser}
                            onToggle={() =>
                                updateNotifications({
                                    ...notifications,
                                    browser: !notifications.browser,
                                })
                            }
                        />
                        <ToggleRow
                            title="Islem onay sesleri"
                            description="Portfoy veya emir benzeri aksiyonlar icin ses tercihi."
                            checked={notifications.sounds}
                            onToggle={() =>
                                updateNotifications({
                                    ...notifications,
                                    sounds: !notifications.sounds,
                                })
                            }
                        />
                    </div>
                </article>

                <article className="settings-card">
                    <div className="settings-card-head">
                        <div>
                            <span className="settings-card-kicker">Gorunum</span>
                            <h3 className="settings-card-title">Kullanim rahatligi</h3>
                        </div>
                    </div>
                    <div className="settings-toggle-list">
                        <ToggleRow
                            title="Yogun mod"
                            description="Daha kompakt bosluklar ve daha sik gorunum."
                            checked={display.densityMode}
                            onToggle={() =>
                                updateDisplay({
                                    ...display,
                                    densityMode: !display.densityMode,
                                })
                            }
                        />
                        <ToggleRow
                            title="Animasyonlari azalt"
                            description="Hareket miktarini dusurur; erisilebilirlik icin yararlidir."
                            checked={display.reduceMotion}
                            onToggle={() =>
                                updateDisplay({
                                    ...display,
                                    reduceMotion: !display.reduceMotion,
                                })
                            }
                        />
                    </div>
                </article>
            </div>

            <div className="settings-footer-actions">
                <button className="settings-secondary-btn" type="button" onClick={handleReset}>
                    Tercihleri sifirla
                </button>
            </div>
        </section>
    );
}

export default function SettingsPage() {
    const params = useParams<{ section?: string }>();
    const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

    const section = params.section as SettingsSection | undefined;
    const isValidSection = SETTINGS_SECTIONS.some((item) => item.id === section);

    if (!section || !isValidSection) {
        return <Navigate to="/settings/profile" replace />;
    }

    const meta = getSectionMeta(section);

    return (
        <KapitalShell activePage="settings" showCategories={false}>
            <div className="settings-page">
                <div className="settings-layout">
                    <section className="settings-hero">
                        <div>
                            <div className="settings-hero-kicker">{meta.kicker}</div>
                            <h1 className="settings-hero-title">{meta.title}</h1>
                            <p className="settings-hero-subtitle">{meta.subtitle}</p>
                        </div>
                    </section>

                    <div className="settings-body">
                        <SettingsTabs activeSection={section} tabRefs={tabRefs} />
                        <div className="settings-panel">
                            {section === "profile" ? <ProfileSection /> : null}
                            {section === "security" ? <SecuritySection /> : null}
                            {section === "preferences" ? <PreferencesSection /> : null}
                        </div>
                    </div>
                </div>
            </div>
        </KapitalShell>
    );
}
