package com.alper.backend.user.preferences.mapper;

import com.alper.backend.user.preferences.dto.PreferencesResponse;
import com.alper.backend.user.preferences.dto.UpdatePreferencesRequest;
import com.alper.backend.user.preferences.model.LocalePreference;
import com.alper.backend.user.preferences.model.ThemePreference;
import com.alper.backend.user.preferences.model.UserPreferences;
import com.alper.backend.user.preferences.service.PreferencesPatch;
import org.springframework.stereotype.Component;

@Component
public class UserPreferencesMapper {

    // Entity -> Response (enum'u küçük harfe çevirerek)
    public PreferencesResponse toResponse(UserPreferences prefs) {
        return new PreferencesResponse(
                prefs.getTheme().name().toLowerCase(),
                prefs.getLocale().name().toLowerCase()
        );
    }

    // Request -> Patch (string'i enum'a çevirerek). Validation regex sayesinde
    // buraya gelen değerlerin geçerli olduğu garanti; yine de güvenli çeviriyoruz.
    public PreferencesPatch toPatch(UpdatePreferencesRequest request) {
        return new PreferencesPatch(
                ThemePreference.valueOf(request.theme().toUpperCase()),
                LocalePreference.valueOf(request.locale().toUpperCase())
        );
    }
}