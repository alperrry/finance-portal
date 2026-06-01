package com.alper.backend.user.preferences.dto;

/**
 * Kullanıcının kayıtlı arayüz tercihlerini API yanıtı olarak döndürür.
 */
public record PreferencesResponse(
        String theme,           // "light" | "dark" | "system"
        String locale,          // "tr" | "en"
        boolean densityCompact,
        boolean reduceMotion
) {}
