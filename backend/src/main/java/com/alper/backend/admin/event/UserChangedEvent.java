package com.alper.backend.admin.event;

import com.alper.backend.user.model.UserRole;


public record UserChangedEvent(
        Long userId,
        Action action,
        UserRole oldRole,
        UserRole newRole,
        Boolean oldActive,
        Boolean newActive,
        Long actorUserId
) {

    /**
     * UserChangedEvent'in temsil ettiği değişiklik tipi.
     */
    public enum Action {
        ROLE_CHANGED,
        STATUS_CHANGED,
        UPDATED
    }

    // ---------------------------------------------------------------------
    // Factory metodları — kullanım yerinde okunabilirlik için
    // ---------------------------------------------------------------------

    /**
     * Rol değişikliği event'i oluşturur.
     */
    public static UserChangedEvent roleChanged(
            Long userId,
            UserRole oldRole,
            UserRole newRole,
            Long actorUserId
    ) {
        return new UserChangedEvent(
                userId, Action.ROLE_CHANGED,
                oldRole, newRole,
                null, null,
                actorUserId
        );
    }

    /**
     * Durum (aktif/pasif) değişikliği event'i oluşturur.
     */
    public static UserChangedEvent statusChanged(
            Long userId,
            boolean oldActive,
            boolean newActive,
            Long actorUserId
    ) {
        return new UserChangedEvent(
                userId, Action.STATUS_CHANGED,
                null, null,
                oldActive, newActive,
                actorUserId
        );
    }

    public static UserChangedEvent updated(
            Long userId,
            Long actorUserId
    ) {
        return new UserChangedEvent(
                userId, Action.UPDATED,
                null, null,
                null, null,
                actorUserId
        );
    }
}
