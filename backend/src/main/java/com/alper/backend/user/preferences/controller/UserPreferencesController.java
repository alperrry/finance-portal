// =====================================================================
// Controller
// Konum: backend/src/main/java/com/alper/backend/user/preferences/controller/UserPreferencesController.java
//
// VARSAYIMLAR (senin yapından çıkardım, farklıysa söyle):
//  - @CurrentUser ile giriş yapan User enjekte ediliyor
//    (CurrentUser.java + CurrentUserArgumentResolver.java mevcut)
//  - common/web/ApiResponse.java ile response sarılıyor
//  - Base path tarzın /api/... şeklinde
//
// Eğer ApiResponse wrapper'ı yoksa: return tiplerini direkt
// PreferencesResponse yapıp ApiResponse.success(...) çağrılarını kaldır.
// =====================================================================

package com.alper.backend.user.preferences.controller;

import com.alper.backend.common.web.ApiResponse;
import com.alper.backend.user.model.User;
import com.alper.backend.user.preferences.dto.PreferencesResponse;
import com.alper.backend.user.preferences.dto.UpdatePreferencesRequest;
import com.alper.backend.user.preferences.mapper.UserPreferencesMapper;
import com.alper.backend.user.preferences.model.UserPreferences;
import com.alper.backend.user.preferences.service.UserPreferencesService;
import com.alper.backend.user.security.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * Oturum açmış kullanıcının UI tercihlerini (dil, tema, yerleşim vb.) okuma/güncelleme
 * uç noktaları.
 *
 * <p>İşlemler {@link UserPreferencesService} üzerinden gerçekleştirilir.</p>
 */
@RestController
@RequestMapping("/api/v1/me/preferences")
@RequiredArgsConstructor
public class UserPreferencesController {

    private final UserPreferencesService preferencesService;
    private final UserPreferencesMapper preferencesMapper;

    // Giriş yapan kullanıcının tercihlerini getirir (yoksa default oluşturulur).
    @GetMapping
    public ApiResponse<PreferencesResponse> getMyPreferences(@CurrentUser User user) {
        UserPreferences prefs = preferencesService.getOrCreate(user);
        return ApiResponse.success(preferencesMapper.toResponse(prefs));
    }

    // Tercihleri günceller. Tüm alanlar zorunlu (tam güncelleme).
    @PutMapping
    public ApiResponse<PreferencesResponse> updateMyPreferences(
            @CurrentUser User user,
            @Valid @RequestBody UpdatePreferencesRequest request
    ) {
        UserPreferences updated = preferencesService.update(user, preferencesMapper.toPatch(request));
        return ApiResponse.success(preferencesMapper.toResponse(updated));
    }
}