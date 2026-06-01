package com.alper.backend.user.service;

import com.alper.backend.common.exception.BadRequestException;
import com.alper.backend.common.exception.ConflictException;
import com.alper.backend.common.exception.GoneException;
import com.alper.backend.user.dto.OtpSetupResponse;
import dev.samstevens.totp.code.DefaultCodeGenerator;
import dev.samstevens.totp.code.DefaultCodeVerifier;
import dev.samstevens.totp.code.HashingAlgorithm;
import dev.samstevens.totp.exceptions.QrGenerationException;
import dev.samstevens.totp.qr.QrData;
import dev.samstevens.totp.qr.ZxingPngQrGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import lombok.extern.log4j.Log4j2;
import org.apache.commons.codec.binary.Base32;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Son kullanıcı için TOTP (Time-based One-Time Password) 2FA kurulum akışını yönetir.
 *
 * <p>İki aşamalı çalışır: {@link #initiateSetup(String, String)} bir geçici secret üretip
 * QR kodu döner ve Redis'e (yoksa in-memory map'e) 5 dakikalık TTL ile saklar;
 * {@link #verifyAndActivate(String, String)} kullanıcının uygulamasından gelen kodu
 * doğrular ve Keycloak'a OTP credential olarak yazar. Ham secret formatı Keycloak'ın
 * dahili akışıyla uyumlu lowercase alphanumeric tutulur; kullanıcıya gösterilen ve
 * QR'a gömülen versiyon base32 ile encode edilir.</p>
 */
@Service
@Log4j2
public class TotpService {

    private static final String KEY_PREFIX = "totp-setup:";
    private static final Duration SETUP_TTL = Duration.ofSeconds(300);

    // Keycloak, secretData.value.getBytes(UTF_8)'i HMAC anahtari olarak kullanir.
    // Authenticator app ise QR'daki base32'yi decode ederek ayni baytlari elde eder.
    // Tutarli olmasi icin: ham ASCII-safe secret -> Keycloak'a yaz,
    // base32_encode(secret.getBytes) -> QR ve display'e goster.
    private static final String ALPHANUM = "abcdefghijklmnopqrstuvwxyz0123456789";
    private static final int SECRET_LENGTH = 20;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final KeycloakAdminService keycloakAdminService;
    private final StringRedisTemplate stringRedisTemplate;
    private final Map<String, PendingSetup> localSetups = new ConcurrentHashMap<>();

    public TotpService(ObjectProvider<StringRedisTemplate> stringRedisTemplateProvider,
                       KeycloakAdminService keycloakAdminService) {
        this.stringRedisTemplate = stringRedisTemplateProvider.getIfAvailable();
        this.keycloakAdminService = keycloakAdminService;
    }

    /**
     * Yeni bir TOTP secret üretir, QR kodu ve base32 secret'i döner; ham secret'i kısa süreli
     * cache'e yazar. Kullanıcının 2FA'sı zaten aktifse hata fırlatır.
     *
     * @param keycloakId aktif kullanıcının Keycloak kimliği
     * @param email      QR etiketinde kullanılacak e-posta
     * @return QR data URL'i ve base32 secret
     * @throws ConflictException kullanıcının OTP'si zaten aktifse
     */
    public OtpSetupResponse initiateSetup(String keycloakId, String email) {
        if (keycloakAdminService.getSecurityStatus(keycloakId).otpEnabled()) {
            throw new ConflictException("2FA zaten aktif.");
        }

        // Ham secret: Keycloak'in kendi akisiyla ayni format (lowercase alphanumeric)
        String rawSecret = generateRawSecret();
        // Base32 versiyonu: QR kodu ve kullaniciya gosterilecek
        String base32Secret = toBase32(rawSecret);

        savePendingSetup(keycloakId, rawSecret);
        log.info("TOTP setup baslatildi | keycloakId={}", keycloakId);

        String qrCodeDataUrl = buildQrDataUrl(email, base32Secret);
        return new OtpSetupResponse(qrCodeDataUrl, base32Secret);
    }

    /**
     * Pending secret ile gönderilen kodu doğrular ve Keycloak'a OTP credential olarak yazar.
     *
     * @param keycloakId aktif kullanıcının Keycloak kimliği
     * @param code       authenticator uygulamasından gelen altı haneli kod
     * @throws GoneException       cache'te pending secret yoksa veya TTL dolduysa
     * @throws BadRequestException kod doğrulamayı geçemezse
     */
    public void verifyAndActivate(String keycloakId, String code) {
        String rawSecret = getPendingSetup(keycloakId);
        if (rawSecret == null) {
            throw new GoneException("Setup suresi doldu, yeniden baslatin.");
        }

        // Verifier base32 secret bekliyor; rawSecret'i base32'ye cevir
        String base32Secret = toBase32(rawSecret);
        boolean valid = new DefaultCodeVerifier(new DefaultCodeGenerator(), new SystemTimeProvider())
                .isValidCode(base32Secret, code);
        if (!valid) {
            throw new BadRequestException("Kod hatali, tekrar deneyin.");
        }

        // Keycloak'a ham secret yazilir; Keycloak dogrulamada .getBytes(UTF_8) kullanir
        keycloakAdminService.createOtpCredential(keycloakId, rawSecret);
        deletePendingSetup(keycloakId);
        log.info("TOTP aktive edildi | keycloakId={}", keycloakId);
    }

    private void savePendingSetup(String keycloakId, String rawSecret) {
        String key = KEY_PREFIX + keycloakId;
        if (stringRedisTemplate != null) {
            stringRedisTemplate.opsForValue().set(key, rawSecret, SETUP_TTL);
            return;
        }

        localSetups.put(key, new PendingSetup(rawSecret, Instant.now().plus(SETUP_TTL)));
    }

    private String getPendingSetup(String keycloakId) {
        String key = KEY_PREFIX + keycloakId;
        if (stringRedisTemplate != null) {
            return stringRedisTemplate.opsForValue().get(key);
        }

        PendingSetup pendingSetup = localSetups.get(key);
        if (pendingSetup == null) {
            return null;
        }
        if (pendingSetup.expiresAt().isBefore(Instant.now())) {
            localSetups.remove(key);
            return null;
        }
        return pendingSetup.rawSecret();
    }

    private void deletePendingSetup(String keycloakId) {
        String key = KEY_PREFIX + keycloakId;
        if (stringRedisTemplate != null) {
            stringRedisTemplate.delete(key);
            return;
        }

        localSetups.remove(key);
    }

    private String generateRawSecret() {
        StringBuilder sb = new StringBuilder(SECRET_LENGTH);
        for (int i = 0; i < SECRET_LENGTH; i++) {
            sb.append(ALPHANUM.charAt(SECURE_RANDOM.nextInt(ALPHANUM.length())));
        }
        return sb.toString();
    }

    private String toBase32(String rawSecret) {
        return new Base32().encodeToString(rawSecret.getBytes(StandardCharsets.UTF_8))
                .replace("=", "")
                .toUpperCase();
    }

    private String buildQrDataUrl(String email, String base32Secret) {
        try {
            QrData data = new QrData.Builder()
                    .label(email)
                    .secret(base32Secret)
                    .issuer("Kapital")
                    .algorithm(HashingAlgorithm.SHA1)
                    .digits(6)
                    .period(30)
                    .build();

            byte[] png = new ZxingPngQrGenerator().generate(data);
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(png);
        } catch (QrGenerationException e) {
            log.error("QR kod uretme hatasi | email={}", email, e);
            throw new RuntimeException("QR kod uretilemedi", e);
        }
    }

    private record PendingSetup(String rawSecret, Instant expiresAt) {
    }
}
