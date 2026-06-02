package com.alper.backend.user.preferences.service;

import com.alper.backend.user.preferences.model.LocalePreference;
import com.alper.backend.user.preferences.model.ThemePreference;

/**
 * Kullanıcı tercih güncelleme isteğinde gönderilen alanları taşıyan değer nesnesi.
 */
public record PreferencesPatch(
        ThemePreference theme,
        LocalePreference locale
) {}