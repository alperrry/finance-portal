package com.alper.backend.user.preferences.service;

import com.alper.backend.user.model.User;
import com.alper.backend.user.preferences.model.UserPreferences;
import com.alper.backend.user.preferences.repository.UserPreferencesRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Kullanıcı UI tercihlerinin (dil, tema, layout vb.) read/write iş katmanı.
 *
 * <p>Kayıt yoksa varsayılanlarla oluşturur; mevcutsa kısmi (partial) güncelleme uygular.</p>
 */
@Service
@RequiredArgsConstructor
public class UserPreferencesService {

    private final UserPreferencesRepository preferencesRepository;

    // Kullanıcının tercihlerini getirir; yoksa default oluşturup kaydeder.
    @Transactional
    public UserPreferences getOrCreate(User user) {
        return preferencesRepository
                .findByUserId(user.getId())
                .orElseGet(() -> preferencesRepository.save(UserPreferences.defaultsFor(user)));
    }

    // Mevcut tercihleri günceller (yoksa önce default'tan oluşturur).
    // Not: alan kopyalama / DTO -> entity mapping 3. adımda mapper ile yapılacak;
    // burada sadece "güncellenecek entity'yi getir ve kaydet" akışı kuruldu.
    @Transactional
    public UserPreferences update(User user, PreferencesPatch patch) {
        UserPreferences prefs = getOrCreate(user);

        prefs.setTheme(patch.theme());
        prefs.setLocale(patch.locale());
        prefs.setDensityCompact(patch.densityCompact());
        prefs.setReduceMotion(patch.reduceMotion());

        return preferencesRepository.save(prefs);
    }
}