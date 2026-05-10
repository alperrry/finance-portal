export type ProfileForm = {
    firstName: string;
    lastName: string;
    email: string;
};

export type ProfileField = keyof ProfileForm;
export type FormErrors = Partial<Record<ProfileField, string>>;
export type FieldTouched = Partial<Record<ProfileField, boolean>>;
