package com.alper.backend.user.controller;

import com.alper.backend.common.web.ApiResponse;
import com.alper.backend.common.exception.NotFoundException;
import com.alper.backend.user.dto.ChangePasswordRequest;
import com.alper.backend.user.dto.OtpSetupResponse;
import com.alper.backend.user.dto.OtpVerifyRequest;
import com.alper.backend.user.model.User;
import com.alper.backend.user.repository.UserRepository;
import com.alper.backend.user.dto.KeycloakUser;
import com.alper.backend.user.dto.SecurityStatusResponse;
import com.alper.backend.user.dto.UpdateUserRequest;
import com.alper.backend.user.dto.UserResponse;
import com.alper.backend.user.mapper.UserMapper;
import com.alper.backend.user.security.CurrentUser;
import com.alper.backend.user.service.KeycloakAdminService;
import com.alper.backend.user.service.TotpService;
import com.alper.backend.user.service.UserProvisioningService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

/**
 * Oturum açmış son kullanıcının kendi profil ve güvenlik ayarlarını yönettiği uç noktalar.
 *
 * <p>Kullanıcı bilgileri Keycloak'tan {@link KeycloakAdminService} ile çekilir; yerel
 * okumalar {@link UserRepository} üzerinden yapılır; OTP/TOTP kurulumu
 * {@link TotpService} tarafından yürütülür. Tüm uç noktalar JWT'den çıkarılan
 * {@link CurrentUser} bağlamına bağlıdır.</p>
 */
@RestController
@RequestMapping("/api/v1/users")
@Log4j2
@RequiredArgsConstructor
public class UserController {
    private final UserProvisioningService userProvisioningService;
    private final UserMapper userMapper;
    private final UserRepository userRepository;
    private final KeycloakAdminService keycloakAdminService;
    private final TotpService totpService;

    /**
     * Oturum açmış kullanıcının profilini döner.
     *
     * @param user JWT'den çözümlenmiş aktif kullanıcı
     * @return kullanıcı profili gövdesi
     * @throws NotFoundException oturum bağlamı bulunamazsa
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser(@CurrentUser User user) {
        if (user == null) {
            log.warn("Kullanıcı bilgisi alınamadı | currentUser attribute null");
            throw new NotFoundException("Oturum açmış kullanıcı bulunamadı");
        }

        log.debug("Kullanıcı profili döndürülüyor | keycloakId={}", user.getKeycloakId());
        return ResponseEntity.ok(ApiResponse.success(userMapper.toResponse(user)));
    }

    /**
     * Kullanıcı temel profil alanlarını (ad, soyad, e-posta) Keycloak'ta günceller ve
     * yerel kaydı senkronize eder.
     *
     * @param user    aktif kullanıcı
     * @param request güncellenecek alanlar
     * @return güncel profil yanıtı
     * @throws NotFoundException oturum bağlamı bulunamazsa
     */
    @PutMapping("/me")
    @Transactional
    public ResponseEntity<ApiResponse<UserResponse>> updateCurrentUser(
            @CurrentUser User user,
            @Valid @RequestBody UpdateUserRequest request) {

        if (user == null) {
            log.warn("Kullanıcı güncellenemedi | currentUser attribute null");
            throw new NotFoundException("Oturum açmış kullanıcı bulunamadı");
        }

        log.info("Kullanıcı profil güncelleme talebi | keycloakId={}", user.getKeycloakId());

        keycloakAdminService.updateUser(
                user.getKeycloakId(),
                request.getFirstName(),
                request.getLastName(),
                request.getEmail()
        );

        KeycloakUser keycloakUser = keycloakAdminService.getUserById(user.getKeycloakId());
        User updated = userProvisioningService.syncFromKeycloak(user, keycloakUser);

        return ResponseEntity.ok(ApiResponse.success(userMapper.toResponse(updated)));
    }

    /**
     * Kullanıcının güvenlik durumunu döner (2FA aktif mi, kayıtlı OTP credential'ları vb.).
     *
     * @param user aktif kullanıcı
     * @return güvenlik durumu özeti
     * @throws NotFoundException oturum bağlamı bulunamazsa
     */
    @GetMapping("/me/security")
    public ResponseEntity<ApiResponse<SecurityStatusResponse>> getSecurityStatus(@CurrentUser User user) {
        if (user == null) {
            log.warn("Güvenlik bilgisi alınamadı | currentUser attribute null");
            throw new NotFoundException("Oturum açmış kullanıcı bulunamadı");
        }

        return ResponseEntity.ok(ApiResponse.success(keycloakAdminService.getSecurityStatus(user.getKeycloakId())));
    }

    /**
     * Aktif kullanıcının Keycloak'taki şifresini sıfırlar.
     *
     * @param user    aktif kullanıcı
     * @param request yeni şifre alanını içeren istek
     * @return boş başarı yanıtı
     * @throws NotFoundException oturum bağlamı bulunamazsa
     */
    @PutMapping("/me/password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @CurrentUser User user,
            @Valid @RequestBody ChangePasswordRequest request) {

        if (user == null) {
            log.warn("Şifre güncellenemedi | currentUser attribute null");
            throw new NotFoundException("Oturum açmış kullanıcı bulunamadı");
        }

        keycloakAdminService.resetPassword(user.getKeycloakId(), request.newPassword());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /**
     * TOTP (Google Authenticator vb.) kurulumunu başlatır; QR kodu ve gizli anahtarı döner.
     *
     * @param user aktif kullanıcı
     * @return QR kod ve secret bilgisi
     * @throws NotFoundException oturum bağlamı bulunamazsa
     */
    @PostMapping("/me/security/otp/setup")
    public ResponseEntity<ApiResponse<OtpSetupResponse>> initiateOtpSetup(@CurrentUser User user) {
        if (user == null) {
            log.warn("OTP setup baslatılamadı | currentUser attribute null");
            throw new NotFoundException("Oturum açmış kullanıcı bulunamadı");
        }

        log.info("OTP setup talebi | keycloakId={}", user.getKeycloakId());
        OtpSetupResponse response = totpService.initiateSetup(user.getKeycloakId(), user.getEmail());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * Kullanıcının uygulamasından gelen ilk OTP kodunu doğrular ve TOTP'yi aktifleştirir.
     *
     * @param user    aktif kullanıcı
     * @param request altı haneli OTP kodu
     * @return aktifleşme sonrası güvenlik durumu
     * @throws NotFoundException oturum bağlamı bulunamazsa
     */
    @PostMapping("/me/security/otp/verify")
    public ResponseEntity<ApiResponse<SecurityStatusResponse>> verifyOtp(
            @CurrentUser User user,
            @Valid @RequestBody OtpVerifyRequest request) {

        if (user == null) {
            log.warn("OTP dogrulama yapılamadı | currentUser attribute null");
            throw new NotFoundException("Oturum açmış kullanıcı bulunamadı");
        }

        log.info("OTP dogrulama talebi | keycloakId={}", user.getKeycloakId());
        totpService.verifyAndActivate(user.getKeycloakId(), request.code());
        return ResponseEntity.ok(ApiResponse.success(keycloakAdminService.getSecurityStatus(user.getKeycloakId())));
    }

    /**
     * Kullanıcının kayıtlı bir OTP credential'ını siler (2FA cihazı kaldırma).
     *
     * @param user         aktif kullanıcı
     * @param credentialId Keycloak credential kimliği
     * @return güncel güvenlik durumu
     * @throws NotFoundException oturum bağlamı bulunamazsa
     */
    @DeleteMapping("/me/security/otp/{credentialId}")
    public ResponseEntity<ApiResponse<SecurityStatusResponse>> deleteOtpCredential(
            @CurrentUser User user,
            @PathVariable String credentialId) {

        if (user == null) {
            log.warn("OTP credential silinemedi | currentUser attribute null");
            throw new NotFoundException("Oturum açmış kullanıcı bulunamadı");
        }

        keycloakAdminService.deleteOtpCredential(user.getKeycloakId(), credentialId);
        return ResponseEntity.ok(ApiResponse.success(keycloakAdminService.getSecurityStatus(user.getKeycloakId())));
    }
}
