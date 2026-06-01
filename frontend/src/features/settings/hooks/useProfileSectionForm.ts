import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../app/auth/AuthContext";
import { useToast } from "../../../components/ToastContext";
import { updateCurrentUser } from "../../profile/api/userApi";
import type { FieldTouched, ProfileField, ProfileForm } from "../types";
import {
    buildForm,
    buildUpdatePayload,
    isPayloadEmpty,
    resolveProfileError,
    validateProfileForm,
} from "../utils/settingsFormatters";

export function useProfileSectionForm() {
    const { currentUser, setCurrentUser } = useAuth();
    const { showToast } = useToast();
    const { t } = useTranslation();

    const [form, setForm] = useState<ProfileForm>({ firstName: "", lastName: "" });
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

    const resetForm = () => {
        setForm(buildForm(currentUser));
        setTouched({});
        setServerError(null);
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
            showToast(t("settings.profile.updateSuccess"), "success");
        } catch (caughtError) {
            const message = resolveProfileError(caughtError);
            setServerError(message);
            showToast(message, "error");
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
        updateField,
        resetForm,
        handleSubmit,
    };
}