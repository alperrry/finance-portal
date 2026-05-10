import { Alert, Box, Button, Card, CardContent, Chip, Skeleton, Stack } from "@mui/material";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useAuth } from "../../../app/auth/AuthContext";
import { useToast } from "../../../components/ToastContext";
import { KapitalShell } from "../../../components/layout";
import { PageHeader } from "../../../components/ui/PageHeader";
import { SectionPanel } from "../../../components/ui/SectionPanel";
import { updateCurrentUser } from "../api/userApi";
import { ProfileEditForm } from "../components/ProfileEditForm";
import { ProfileInfoPanel } from "../components/ProfileInfoPanel";
import type { FieldTouched, ProfileField, ProfileForm } from "../types";
import { EMPTY_FORM, buildForm, buildUpdatePayload, isPayloadEmpty, resolveProfileError, validateForm } from "../utils/profileFormatters";

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
    const payload = useMemo(() => (currentUser ? buildUpdatePayload(form, currentUser) : {}), [form, currentUser]);
    const hasChanges = currentUser ? !isPayloadEmpty(payload) : false;
    const canSubmit = Boolean(currentUser && hasChanges && Object.keys(errors).length === 0 && !saving);

    const updateField = (field: ProfileField) => (event: ChangeEvent<HTMLInputElement>) => {
        setForm((current) => ({ ...current, [field]: event.target.value }));
        setTouched((current) => ({ ...current, [field]: true }));
        setServerError(null);
    };

    const touchField = (field: ProfileField) => { setTouched((current) => ({ ...current, [field]: true })); };

    const focusField = (field: ProfileField) => {
        const ref = field === "firstName" ? firstNameRef : field === "lastName" ? lastNameRef : emailRef;
        ref.current?.focus();
        ref.current?.select();
        touchField(field);
    };

    const resetForm = () => { setForm(buildForm(currentUser)); setTouched({}); setServerError(null); };

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
            showToast("Profiliniz güncellendi", "success");
        } catch (caughtError) {
            setServerError(resolveProfileError(caughtError));
        } finally {
            setSaving(false);
        }
    };

    return (
        <KapitalShell activePage="profile" showCategories={false}>
            <Box sx={{ p: { xs: 2, md: 3 } }}>
                <SectionPanel sx={{ mb: 3 }}>
                    <PageHeader
                        kicker="Hesap Merkezi"
                        title="Profilim"
                        actions={currentUser?.role === "ADMIN" ? <Chip label="Admin" color="secondary" size="small" /> : undefined}
                    />
                </SectionPanel>

                {userError ? (
                    <Alert
                        severity="error"
                        sx={{ mb: 2 }}
                        action={
                            <Button size="small" color="inherit" onClick={() => { setServerError(null); void refreshCurrentUser(); }}>
                                Tekrar dene
                            </Button>
                        }
                    >
                        Profil bilgileri alınamadı. {userError}
                    </Alert>
                ) : null}

                {userLoading && !currentUser ? (
                    <Stack direction={{ xs: "column", md: "row" }} gap={3}>
                        <Card sx={{ flex: 1 }}>
                            <CardContent>
                                <Skeleton variant="text" width="40%" sx={{ mb: 1 }} />
                                <Skeleton variant="text" width="60%" sx={{ mb: 2 }} />
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Skeleton key={i} variant="text" sx={{ mb: 0.5 }} />
                                ))}
                            </CardContent>
                        </Card>
                        <Card sx={{ flex: 1 }}>
                            <CardContent>
                                <Skeleton variant="text" width="40%" sx={{ mb: 1 }} />
                                <Skeleton variant="text" width="60%" sx={{ mb: 2 }} />
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <Skeleton key={i} variant="rectangular" height={40} sx={{ mb: 1, borderRadius: 1 }} />
                                ))}
                            </CardContent>
                        </Card>
                    </Stack>
                ) : null}

                {currentUser ? (
                    <Stack direction={{ xs: "column", md: "row" }} gap={3} alignItems="flex-start">
                        <ProfileInfoPanel currentUser={currentUser} onFocusField={focusField} />
                        <ProfileEditForm
                            currentUser={currentUser}
                            form={form}
                            touched={touched}
                            errors={errors}
                            saving={saving}
                            hasChanges={hasChanges}
                            canSubmit={canSubmit}
                            serverError={serverError}
                            firstNameRef={firstNameRef}
                            lastNameRef={lastNameRef}
                            emailRef={emailRef}
                            onUpdateField={updateField}
                            onTouchField={touchField}
                            onReset={resetForm}
                            onSubmit={handleSubmit}
                        />
                    </Stack>
                ) : null}
            </Box>
        </KapitalShell>
    );
}
