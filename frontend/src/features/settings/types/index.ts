export type SettingsSection = "profile" | "security" | "preferences";
export type OtpStep = "idle" | "starting" | "qr" | "verify";

export type ProfileForm = {
    firstName: string;
    lastName: string;
    email: string;
};

export type PasswordForm = {
    newPassword: string;
    confirmPassword: string;
};

export type ProfileField = keyof ProfileForm;
export type FormErrors = Partial<Record<ProfileField, string>>;
export type FieldTouched = Partial<Record<ProfileField, boolean>>;
export type PasswordErrors = Partial<Record<keyof PasswordForm, string>>;

export const SETTINGS_SECTIONS: Array<{ id: SettingsSection }> = [
    { id: "profile" },
    { id: "security" },
    { id: "preferences" },
];
