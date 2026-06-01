import { Alert, Box, Button, Card, CardContent, CircularProgress, Stack, TextField, Typography } from "@mui/material";
import { type ChangeEvent, type FormEvent, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import type { UserResponse } from "../api/userApi";
import type { FieldTouched, FormErrors, ProfileField, ProfileForm } from "../types";

type Props = {
    currentUser: UserResponse;
    form: ProfileForm;
    touched: FieldTouched;
    errors: FormErrors;
    saving: boolean;
    hasChanges: boolean;
    canSubmit: boolean;
    serverError: string | null;
    firstNameRef: RefObject<HTMLInputElement | null>;
    lastNameRef: RefObject<HTMLInputElement | null>;
    emailRef: RefObject<HTMLInputElement | null>;
    onUpdateField: (field: ProfileField) => (event: ChangeEvent<HTMLInputElement>) => void;
    onTouchField: (field: ProfileField) => void;
    onReset: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function ProfileEditForm({
    currentUser,
    form,
    touched,
    errors,
    saving,
    hasChanges,
    canSubmit,
    serverError,
    firstNameRef,
    lastNameRef,
    emailRef,
    onUpdateField,
    onTouchField,
    onReset,
    onSubmit,
}: Props) {
    const { t } = useTranslation();
    return (
        <Card sx={{ flex: 1 }}>
            <CardContent>
                <Box sx={{ mb: 2 }}>
                    <Typography variant="overline" color="secondary" sx={{ fontWeight: 800 }}>
                        {t("profile.editForm.overline")}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                        {t("profile.editForm.heading")}
                    </Typography>
                </Box>

                <Box component="form" onSubmit={onSubmit} noValidate>
                    <Stack sx={{ gap: 2 }}>
                        <TextField
                            inputRef={firstNameRef}
                            label={t("profile.editForm.firstName")}
                            value={form.firstName}
                            onChange={onUpdateField("firstName")}
                            onBlur={() => onTouchField("firstName")}
                            error={Boolean(touched.firstName && errors.firstName)}
                            helperText={touched.firstName ? errors.firstName : undefined}
                            slotProps={{ htmlInput: { maxLength: 100 } }}
                            size="small"
                            fullWidth
                        />
                        <TextField
                            inputRef={lastNameRef}
                            label={t("profile.editForm.lastName")}
                            value={form.lastName}
                            onChange={onUpdateField("lastName")}
                            onBlur={() => onTouchField("lastName")}
                            error={Boolean(touched.lastName && errors.lastName)}
                            helperText={touched.lastName ? errors.lastName : undefined}
                            slotProps={{ htmlInput: { maxLength: 100 } }}
                            size="small"
                            fullWidth
                        />
                        <TextField
                            inputRef={emailRef}
                            label={t("profile.editForm.email")}
                            type="email"
                            value={form.email}
                            onChange={onUpdateField("email")}
                            onBlur={() => onTouchField("email")}
                            error={Boolean(touched.email && errors.email)}
                            helperText={touched.email ? errors.email : undefined}
                            slotProps={{ htmlInput: { maxLength: 255 } }}
                            size="small"
                            fullWidth
                        />
                        <TextField
                            label={t("profile.editForm.username")}
                            value={currentUser.username}
                            disabled
                            size="small"
                            fullWidth
                            helperText={t("profile.editForm.keycloakNote")}
                        />
                        <TextField
                            label={t("profile.editForm.role")}
                            value={currentUser.role}
                            disabled
                            size="small"
                            fullWidth
                            helperText={t("profile.editForm.roleNote")}
                        />

                        {serverError ? <Alert severity="error">{serverError}</Alert> : null}

                        <Stack direction="row" sx={{ gap: 1, pt: 1 }}>
                            <Button
                                type="submit"
                                variant="contained"
                                color="secondary"
                                disabled={!canSubmit}
                                startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
                            >
                                {saving ? t("common.saving") : t("common.save")}
                            </Button>
                            <Button
                                type="button"
                                variant="outlined"
                                onClick={onReset}
                                disabled={saving || !hasChanges}
                            >
                                {t("profile.editForm.cancel")}
                            </Button>
                        </Stack>
                    </Stack>
                </Box>
            </CardContent>
        </Card>
    );
}
