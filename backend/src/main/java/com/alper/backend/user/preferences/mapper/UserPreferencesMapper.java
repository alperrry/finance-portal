package com.alper.backend.user.preferences.mapper;

import com.alper.backend.user.preferences.dto.PreferencesResponse;
import com.alper.backend.user.preferences.dto.UpdatePreferencesRequest;
import com.alper.backend.user.preferences.model.LocalePreference;
import com.alper.backend.user.preferences.model.ThemePreference;
import com.alper.backend.user.preferences.model.UserPreferences;
import com.alper.backend.user.preferences.service.PreferencesPatch;
import org.springframework.stereotype.Component;

/**
 * Kullanıcı tercihleri için entity, istek ve yanıt nesneleri arasında dönüşüm
 * yapan mapper.
 *
 * <p>API tarafında tema/dil değerleri küçük harfli string, entity tarafında
 * enum olarak tutulur; dönüşümler bu farkı kapatır.</p>
 */
@Component
public class UserPreferencesMapper {

    /**
     * Tercih entity'sini yanıt DTO'suna dönüştürür (enum değerleri küçük harfe çevrilir).
     *
     * @param prefs tercih kaydı
     * @return oluşturulan yanıt DTO'su
     */
    public PreferencesResponse toResponse(UserPreferences prefs) {
        return new PreferencesResponse(
                prefs.getTheme().name().toLowerCase(),
                prefs.getLocale().name().toLowerCase()
        );
    }

    /**
     * Güncelleme isteğini servis katmanının kullandığı patch nesnesine dönüştürür.
     *
     * @param request tema/dil değerlerini içeren istek (regex ile doğrulanmış)
     * @return enum değerlerine çevrilmiş patch
     */
    // Validation regex sayesinde buraya gelen değerlerin geçerli olduğu garanti.
    public PreferencesPatch toPatch(UpdatePreferencesRequest request) {
        return new PreferencesPatch(
                ThemePreference.valueOf(request.theme().toUpperCase()),
                LocalePreference.valueOf(request.locale().toUpperCase())
        );
    }
}