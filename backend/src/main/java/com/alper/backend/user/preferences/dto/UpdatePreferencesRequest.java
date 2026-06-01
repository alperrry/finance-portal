package com.alper.backend.user.preferences.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/**
 * Kullanıcı arayüz tercihleri güncelleme isteğini taşır.
 */
public record UpdatePreferencesRequest(

        @NotNull(message = "theme zorunludur")
        @Pattern(regexp = "light|dark|system", message = "theme: light, dark veya system olmalı")
        String theme,

        @NotNull(message = "locale zorunludur")
        @Pattern(regexp = "tr|en", message = "locale: tr veya en olmalı")
        String locale,

        @NotNull(message = "densityCompact zorunludur")
        Boolean densityCompact,

        @NotNull(message = "reduceMotion zorunludur")
        Boolean reduceMotion
) {}
