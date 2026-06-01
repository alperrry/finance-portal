import { useState, type FormEvent } from "react";
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    NativeSelect,
    TextField,
    Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import type { AdminUserListItem, AdminUserRole, AdminUserStatus } from "../types/admin.types";

type DialogType = "role" | "status" | "reset-2fa";

export type AdminDialogState = {
    type: DialogType;
    user: AdminUserListItem;
} | null;

const ROLE_OPTIONS: AdminUserRole[] = ["NORMAL_USER", "ADMIN"];
const STATUS_OPTIONS: AdminUserStatus[] = ["ACTIVE", "PASSIVE"];

function fullName(user: AdminUserListItem) {
    return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username;
}

export function ChangeRoleDialog({
    state,
    pending,
    onClose,
    onSubmit,
}: {
    state: AdminDialogState;
    pending: boolean;
    onClose: () => void;
    onSubmit: (role: AdminUserRole, reason: string) => Promise<void>;
}) {
    const { t } = useTranslation();
    const user = state?.type === "role" ? state.user : null;
    const [role, setRole] = useState<AdminUserRole>(user?.role ?? "NORMAL_USER");
    const [reason, setReason] = useState("");
    const [error, setError] = useState<string | null>(null);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        const err = reason.trim().length >= 10 ? null : t("admin.dialogs.reasonMinError");
        setError(err);
        if (err) return;
        await onSubmit(role, reason.trim());
        setReason("");
        setError(null);
    };

    return (
        <Dialog open={!!user} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{user ? fullName(user) : ""}</Typography>
                {t("admin.dialogs.roleTitle")}
            </DialogTitle>
            <Box component="form" onSubmit={submit}>
                <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <FormControl fullWidth size="small">
                        <InputLabel htmlFor="role-select">{t("admin.dialogs.roleLabel")}</InputLabel>
                        <NativeSelect
                            inputProps={{ id: "role-select", name: "role" }}
                            value={role}
                            onChange={(e) => setRole(e.target.value as AdminUserRole)}
                        >
                            {ROLE_OPTIONS.map((item) => (
                                <option key={item} value={item}>{item === "ADMIN" ? t("admin.dialogs.roleAdmin") : t("admin.dialogs.roleUser")}</option>
                            ))}
                        </NativeSelect>
                    </FormControl>
                    <TextField
                        label={t("admin.dialogs.reasonLabel")}
                        value={reason}
                        onChange={(e) => { setReason(e.target.value); setError(null); }}
                        multiline
                        rows={4}
                        fullWidth
                        size="small"
                        error={!!error}
                        helperText={error ?? undefined}
                        placeholder={t("admin.dialogs.reasonPlaceholder")}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} variant="outlined" size="small">{t("admin.dialogs.cancel")}</Button>
                    <Button type="submit" variant="contained" color="secondary" size="small" disabled={pending}>
                        {pending ? t("admin.dialogs.processing") : t("admin.dialogs.roleSave")}
                    </Button>
                </DialogActions>
            </Box>
        </Dialog>
    );
}

export function ChangeStatusDialog({
    state,
    pending,
    onClose,
    onSubmit,
}: {
    state: AdminDialogState;
    pending: boolean;
    onClose: () => void;
    onSubmit: (status: AdminUserStatus, reason: string) => Promise<void>;
}) {
    const { t } = useTranslation();
    const user = state?.type === "status" ? state.user : null;
    const [status, setStatus] = useState<AdminUserStatus>(user?.status ?? "ACTIVE");
    const [reason, setReason] = useState("");
    const [error, setError] = useState<string | null>(null);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        const err = reason.trim().length >= 10 ? null : t("admin.dialogs.reasonMinError");
        setError(err);
        if (err) return;
        await onSubmit(status, reason.trim());
        setReason("");
        setError(null);
    };

    return (
        <Dialog open={!!user} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{user ? fullName(user) : ""}</Typography>
                {t("admin.dialogs.statusTitle")}
            </DialogTitle>
            <Box component="form" onSubmit={submit}>
                <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <FormControl fullWidth size="small">
                        <InputLabel htmlFor="status-select">{t("admin.dialogs.statusLabel")}</InputLabel>
                        <NativeSelect
                            inputProps={{ id: "status-select", name: "status" }}
                            value={status}
                            onChange={(e) => setStatus(e.target.value as AdminUserStatus)}
                        >
                            {STATUS_OPTIONS.map((item) => (
                                <option key={item} value={item}>{item === "ACTIVE" ? t("admin.dialogs.statusActive") : t("admin.dialogs.statusPassive")}</option>
                            ))}
                        </NativeSelect>
                    </FormControl>
                    <TextField
                        label={t("admin.dialogs.reasonLabel")}
                        value={reason}
                        onChange={(e) => { setReason(e.target.value); setError(null); }}
                        multiline
                        rows={4}
                        fullWidth
                        size="small"
                        error={!!error}
                        helperText={error ?? undefined}
                        placeholder={t("admin.dialogs.reasonPlaceholder")}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} variant="outlined" size="small">{t("admin.dialogs.cancel")}</Button>
                    <Button type="submit" variant="contained" color="secondary" size="small" disabled={pending}>
                        {pending ? t("admin.dialogs.processing") : t("admin.dialogs.statusSave")}
                    </Button>
                </DialogActions>
            </Box>
        </Dialog>
    );
}

export function Reset2FADialog({
    state,
    pending,
    onClose,
    onSubmit,
}: {
    state: AdminDialogState;
    pending: boolean;
    onClose: () => void;
    onSubmit: (reason: string) => Promise<void>;
}) {
    const { t } = useTranslation();
    const user = state?.type === "reset-2fa" ? state.user : null;
    const [reason, setReason] = useState("");
    const [error, setError] = useState<string | null>(null);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        const err = reason.trim().length >= 10 ? null : t("admin.dialogs.reasonMinError");
        setError(err);
        if (err) return;
        await onSubmit(reason.trim());
        setReason("");
        setError(null);
    };

    return (
        <Dialog open={!!user} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{user ? fullName(user) : ""}</Typography>
                {t("admin.dialogs.tfaTitle")}
            </DialogTitle>
            <Box component="form" onSubmit={submit}>
                <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Alert severity="warning" sx={{ fontSize: "0.8rem" }}>
                        {t("admin.dialogs.tfaAlert")}
                    </Alert>
                    <TextField
                        label={t("admin.dialogs.reasonLabel")}
                        value={reason}
                        onChange={(e) => { setReason(e.target.value); setError(null); }}
                        multiline
                        rows={4}
                        fullWidth
                        size="small"
                        error={!!error}
                        helperText={error ?? undefined}
                        placeholder={t("admin.dialogs.reasonPlaceholder")}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} variant="outlined" size="small">{t("admin.dialogs.cancel")}</Button>
                    <Button type="submit" variant="contained" color="error" size="small" disabled={pending}>
                        {pending ? t("admin.dialogs.processing") : t("admin.dialogs.tfaSave")}
                    </Button>
                </DialogActions>
            </Box>
        </Dialog>
    );
}
