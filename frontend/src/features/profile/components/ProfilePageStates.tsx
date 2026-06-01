import { Alert, Button, Card, CardContent, Skeleton, Stack } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { UserResponse } from "../api/userApi";
import { ProfileEditForm } from "./ProfileEditForm";
import { ProfileInfoPanel } from "./ProfileInfoPanel";
import type { useProfileForm } from "../hooks/useProfileForm";

type ProfileFormState = ReturnType<typeof useProfileForm>;

interface ProfileErrorAlertProps {
    error: string;
    onRetry: () => void;
}

export function ProfileErrorAlert({ error, onRetry }: ProfileErrorAlertProps) {
    const { t } = useTranslation();
    return (
        <Alert
            severity="error"
            sx={{ mb: 2 }}
            action={<Button size="small" color="inherit" onClick={onRetry}>{t("common.retry")}</Button>}
        >
            {t("profile.errors.loadFailed")} {error}
        </Alert>
    );
}

export function ProfileLoadingSkeleton() {
    return (
        <Stack direction={{ xs: "column", md: "row" }} sx={{ gap: 3 }}>
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
    );
}

interface ProfilePanelsProps {
    currentUser: UserResponse;
    formState: ProfileFormState;
}

export function ProfilePanels({ currentUser, formState }: ProfilePanelsProps) {
    return (
        <Stack direction={{ xs: "column", md: "row" }} sx={{ gap: 3, alignItems: "flex-start" }}>
            <ProfileInfoPanel currentUser={currentUser} onFocusField={formState.focusField} />
            <ProfileEditForm
                currentUser={currentUser}
                form={formState.form}
                touched={formState.touched}
                errors={formState.errors}
                saving={formState.saving}
                hasChanges={formState.hasChanges}
                canSubmit={formState.canSubmit}
                serverError={formState.serverError}
                firstNameRef={formState.firstNameRef}
                lastNameRef={formState.lastNameRef}
                emailRef={formState.emailRef}
                onUpdateField={formState.updateField}
                onTouchField={formState.touchField}
                onReset={formState.resetForm}
                onSubmit={formState.handleSubmit}
            />
        </Stack>
    );
}
