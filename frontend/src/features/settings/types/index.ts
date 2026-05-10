export type SettingsSection = "profile" | "security" | "preferences";
export type OtpStep = "idle" | "starting" | "qr" | "verify";

export type ProfileForm = {
    firstName: string;
    lastName: string;
};

export type PasswordForm = {
    newPassword: string;
    confirmPassword: string;
};

export type ProfileField = keyof ProfileForm;
export type FormErrors = Partial<Record<ProfileField, string>>;
export type FieldTouched = Partial<Record<ProfileField, boolean>>;
export type PasswordErrors = Partial<Record<keyof PasswordForm, string>>;

export const SETTINGS_SECTIONS: Array<{ id: SettingsSection; label: string; description: string }> = [
    { id: "profile", label: "Profil", description: "Kullanici bilgileri" },
    { id: "security", label: "Guvenlik", description: "Sifre ve 2FA" },
    { id: "preferences", label: "Tercihler", description: "Tema ve bildirimler" },
];
