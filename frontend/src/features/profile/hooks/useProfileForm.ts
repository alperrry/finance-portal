import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useAuth } from "../../../app/auth/AuthContext";
import { useToast } from "../../../components/ToastContext";
import i18n from "../../../i18n";
import { updateCurrentUser } from "../api/userApi";
import type { FieldTouched, ProfileField, ProfileForm } from "../types";
import {
    EMPTY_FORM,
    buildForm,
    buildUpdatePayload,
    isPayloadEmpty,
    resolveProfileError,
    validateForm,
} from "../utils/profileFormatters";

export function useProfileForm() {
    const { currentUser, setCurrentUser } = useAuth();
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
    const payload = useMemo(
        () => (currentUser ? buildUpdatePayload(form, currentUser) : {}),
        [form, currentUser],
    );
    const hasChanges = currentUser ? !isPayloadEmpty(payload) : false;
    const canSubmit = Boolean(
        currentUser && hasChanges && Object.keys(errors).length === 0 && !saving,
    );

    const updateField = (field: ProfileField) => (event: ChangeEvent<HTMLInputElement>) => {
        setForm((cur) => ({ ...cur, [field]: event.target.value }));
        setTouched((cur) => ({ ...cur, [field]: true }));
        setServerError(null);
    };

    const touchField = (field: ProfileField) => {
        setTouched((cur) => ({ ...cur, [field]: true }));
    };

    const focusField = (field: ProfileField) => {
        const ref = field === "firstName" ? firstNameRef : field === "lastName" ? lastNameRef : emailRef;
        ref.current?.focus();
        ref.current?.select();
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
        if (!currentUser || !canSubmit) return;
        setSaving(true);
        setServerError(null);
        try {
            const updatedUser = await updateCurrentUser(payload);
            setCurrentUser(updatedUser);
            setForm(buildForm(updatedUser));
            setTouched({});
            showToast(i18n.t("profile.errors.updateSuccess"), "success");
        } catch (caughtError) {
            setServerError(resolveProfileError(caughtError));
        } finally {
            setSaving(false);
        }
    };

    return {
        form,
        touched,
        errors,
        saving,
        serverError,
        hasChanges,
        canSubmit,
        firstNameRef,
        lastNameRef,
        emailRef,
        updateField,
        touchField,
        focusField,
        resetForm,
        handleSubmit,
    };
}