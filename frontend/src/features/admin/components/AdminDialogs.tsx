import { useState, type FormEvent, type ReactNode } from "react";
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

function validateReason(reason: string) {
    return reason.trim().length >= 10 ? null : "Gerekçe en az 10 karakter olmalı.";
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
    const user = state?.type === "role" ? state.user : null;
    const [error, setError] = useState<string | null>(null);

    if (!user) return null;

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget as HTMLFormElement);
        const role = form.get("role") as AdminUserRole;
        const reason = String(form.get("reason") ?? "");
        const validation = validateReason(reason);
        setError(validation);
        if (validation) return;
        await onSubmit(role, reason.trim());
    };

    return (
        <AdminModal title="Rol Değiştir" kicker={fullName(user)} onClose={onClose}>
            <form key={`${user.id}-${user.role}`} className="admin-dialog-form" onSubmit={submit}>
                <label>
                    <span>Yeni rol</span>
                    <select name="role" defaultValue={user.role}>
                        {ROLE_OPTIONS.map((item) => <option key={item} value={item}>{item === "ADMIN" ? "Admin" : "Normal Kullanıcı"}</option>)}
                    </select>
                </label>
                <ReasonField error={error} />
                <DialogActions pending={pending} onClose={onClose} submitLabel="Rolü kaydet" />
            </form>
        </AdminModal>
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
    const user = state?.type === "status" ? state.user : null;
    const [error, setError] = useState<string | null>(null);

    if (!user) return null;

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget as HTMLFormElement);
        const status = form.get("status") as AdminUserStatus;
        const reason = String(form.get("reason") ?? "");
        const validation = validateReason(reason);
        setError(validation);
        if (validation) return;
        await onSubmit(status, reason.trim());
    };

    return (
        <AdminModal title="Durum Değiştir" kicker={fullName(user)} onClose={onClose}>
            <form key={`${user.id}-${user.status}`} className="admin-dialog-form" onSubmit={submit}>
                <label>
                    <span>Yeni durum</span>
                    <select name="status" defaultValue={user.status}>
                        {STATUS_OPTIONS.map((item) => <option key={item} value={item}>{item === "ACTIVE" ? "Aktif" : "Pasif"}</option>)}
                    </select>
                </label>
                <ReasonField error={error} />
                <DialogActions pending={pending} onClose={onClose} submitLabel="Durumu kaydet" />
            </form>
        </AdminModal>
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
    const user = state?.type === "reset-2fa" ? state.user : null;
    const [error, setError] = useState<string | null>(null);

    if (!user) return null;

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget as HTMLFormElement);
        const reason = String(form.get("reason") ?? "");
        const validation = validateReason(reason);
        setError(validation);
        if (validation) return;
        await onSubmit(reason.trim());
    };

    return (
        <AdminModal title="2FA Sıfırla" kicker={fullName(user)} onClose={onClose}>
            <form key={user.id} className="admin-dialog-form" onSubmit={submit}>
                <p className="admin-dialog-warning">Bu işlem kullanıcının mevcut iki aşamalı doğrulama kurulumunu kaldırır.</p>
                <ReasonField error={error} />
                <DialogActions pending={pending} onClose={onClose} submitLabel="2FA sıfırla" danger />
            </form>
        </AdminModal>
    );
}

function AdminModal({ title, kicker, onClose, children }: { title: string; kicker: string; onClose: () => void; children: ReactNode }) {
    return (
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={onClose}>
            <section className="admin-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
                <div className="admin-modal-head">
                    <div>
                        <span>{kicker}</span>
                        <h2>{title}</h2>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Kapat">×</button>
                </div>
                {children}
            </section>
        </div>
    );
}

function ReasonField({ error }: { error: string | null }) {
    return (
        <label>
            <span>Gerekçe</span>
            <textarea name="reason" placeholder="Bu işlem neden yapılıyor?" rows={4} />
            {error ? <em className="admin-field-error">{error}</em> : null}
        </label>
    );
}

function DialogActions({ pending, onClose, submitLabel, danger = false }: { pending: boolean; onClose: () => void; submitLabel: string; danger?: boolean }) {
    return (
        <div className="admin-dialog-actions">
            <button type="button" className="admin-secondary-btn" onClick={onClose}>Vazgeç</button>
            <button type="submit" className={danger ? "admin-danger-btn" : "admin-primary-btn"} disabled={pending}>
                {pending ? "İşleniyor..." : submitLabel}
            </button>
        </div>
    );
}
