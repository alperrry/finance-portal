package com.alper.backend.admin.service;

import com.alper.backend.admin.audit.AdminAudited;
import com.alper.backend.admin.dto.AdminUserDetailResponse;
import com.alper.backend.admin.dto.AdminUserListResponse;
import com.alper.backend.admin.dto.UpdateUserRoleRequest;
import com.alper.backend.admin.dto.UpdateUserStatusRequest;
import com.alper.backend.admin.event.UserChangedEvent;
import com.alper.backend.admin.model.AuditAction;
import com.alper.backend.admin.model.AuditLog;
import com.alper.backend.admin.repository.AuditLogRepository;
import com.alper.backend.admin.security.SelfActionGuard;
import com.alper.backend.common.exception.ErrorCode;
import com.alper.backend.common.exception.NotFoundException;
import com.alper.backend.portfolio.repository.PortfolioRepository;
import com.alper.backend.user.dto.SecurityStatusResponse;
import com.alper.backend.user.model.User;
import com.alper.backend.user.model.UserRole;
import com.alper.backend.user.repository.UserRepository;
import com.alper.backend.user.service.KeycloakAdminService;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Admin paneli kullanıcı yönetimi iş mantığı.
 *
 * <p>Bu servis, {@code AdminUserController}'ın çağırdığı tüm operasyonları
 * uygular. İş kuralı kontrolleri, audit log yazımı ve WebSocket event yayını
 * burada koordine edilir.
 *
 * <p><strong>Audit yazımı:</strong>
 * Hassas işlemler {@link AdminAudited} ile işaretlidir. AOP aspect'i metod
 * çağrılarını yakalayıp audit log'a yazar. Servis kodu içinde manuel
 * {@code AuditService.log()} çağrısı yapılmaz.
 *
 * <p><strong>Event yayını:</strong>
 * Audit yazımı AOP'da otomatik; ancak {@link UserChangedEvent} (canlı tablo
 * güncelleme için) manuel olarak burada publish edilir. Sebep: bu event
 * domain odaklıdır, audit'ten farklı bir amaca hizmet eder.
 *
 * <p><strong>Self-action koruması:</strong>
 * Tüm hassas işlemlerde {@link SelfActionGuard} devreye girer. Admin kendi
 * hesabını değiştirmeye çalışırsa veya son admin'i etkileyecek bir işlem
 * yaparsa {@code ConflictException} fırlatılır.
 */
@Service
@RequiredArgsConstructor
@Log4j2
public class AdminUserService {

    private final UserRepository userRepository;
    private final PortfolioRepository portfolioRepository;
    private final AuditLogRepository auditLogRepository;
    private final KeycloakAdminService keycloakAdminService;
    private final SelfActionGuard selfActionGuard;
    private final ApplicationEventPublisher eventPublisher;

    // =========================================================================
    // READ — Listeleme & Detay
    // =========================================================================

    /**
     * Filtreli, sayfalı kullanıcı listesi döner.
     *
     * <p>Filtreler null ise tüm kullanıcılar döner. {@code search} parametresi
     * username veya email alanında case-insensitive partial match yapar.
     *
     * @param search   isim/email arama metni (null olabilir)
     * @param role     rol filtresi (null olabilir)
     * @param active   aktiflik filtresi (null olabilir)
     * @param pageable sayfalama bilgisi
     */
    @Transactional(readOnly = true)
    public Page<AdminUserListResponse> list(
            String search,
            UserRole role,
            Boolean active,
            Pageable pageable
    ) {
        Page<User> users = userRepository.searchAdminUsers(search, role, active, pageable);
        return users.map(this::toListResponse);
    }

    /**
     * Tek bir kullanıcının detay bilgilerini döner.
     *
     * <p>Hem uygulama veritabanından hem de Keycloak'tan veri çekilir;
     * 2FA durumu Keycloak'tan gelir.
     *
     * @throws NotFoundException kullanıcı bulunamazsa
     */
    @Transactional(readOnly = true)
    public AdminUserDetailResponse getDetail(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException(
                        ErrorCode.NOT_FOUND, "Kullanıcı bulunamadı: " + userId));

        SecurityStatusResponse securityStatus = fetchSecurityStatusSafely(user.getKeycloakId());
        long portfolioCount = portfolioRepository.countByUserId(user.getId());

        return AdminUserDetailResponse.builder()
                .id(user.getId())
                .keycloakId(user.getKeycloakId())
                .username(user.getUsername())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .role(user.getRole())
                .active(Boolean.TRUE.equals(user.getIsActive()))
                .twoFactorEnabled(securityStatus != null && securityStatus.otpEnabled())
                .lastLoginAt(toInstant(user.getLastLoginAt()))
                .portfolioCount(portfolioCount)
                .totalPortfolioValue(null)
                .createdAt(toInstant(user.getCreatedAt()))
                .updatedAt(toInstant(user.getUpdatedAt()))
                .build();
    }

    /**
     * Belirli bir kullanıcı üzerinde yapılmış tüm audit kayıtlarını döner.
     *
     * <p>User Detail sayfasındaki "Audit Trail" tab'ı için kullanılır.
     */
    @Transactional(readOnly = true)
    public Page<AuditLog> getAuditTrail(Long userId, Pageable pageable) {
        // Kullanıcının var olduğunu doğrula
        if (!userRepository.existsById(userId)) {
            throw new NotFoundException(ErrorCode.NOT_FOUND, "Kullanıcı bulunamadı: " + userId);
        }
        return auditLogRepository.findByTargetTypeAndTargetIdOrderByCreatedAtDesc(
                "user", userId, pageable);
    }

    // =========================================================================
    // WRITE — Hassas işlemler (audit'li)
    // =========================================================================

    /**
     * Bir kullanıcının rolünü değiştirir.
     *
     * <p>İş kuralları:
     * <ul>
     *   <li>Admin kendi rolünü değiştiremez.</li>
     *   <li>Son aktif admin'in rolü düşürülemez.</li>
     *   <li>Yeni rol mevcut rolle aynıysa işlem no-op'tur ama yine de audit'e yazılır
     *       (admin "rol değiştirmeyi denedim" izi kalır).</li>
     * </ul>
     *
     * <p>Keycloak tarafında da rol senkronize edilir; başarısız olursa
     * uygulama veritabanı transaction'ı rollback olur.
     */
    @Transactional
    @AdminAudited(action = AuditAction.USER_ROLE_CHANGED, targetType = "user")
    public AdminUserDetailResponse updateRole(Long userId, UpdateUserRoleRequest request) {
        User actor = resolveActorOrThrow();
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException(
                        ErrorCode.NOT_FOUND, "Kullanıcı bulunamadı: " + userId));

        selfActionGuard.preventSelfAction(actor, target, "rol değiştirme");

        UserRole oldRole = target.getRole();
        UserRole newRole = request.newRole();

        // Eğer rol düşürülüyorsa son admin koruması devreye girer
        if (oldRole == UserRole.ADMIN && newRole != UserRole.ADMIN) {
            selfActionGuard.ensureNotLastAdmin(target);
        }

        target.setRole(newRole);
        userRepository.save(target);

        keycloakAdminService.syncRole(target.getKeycloakId(), newRole);

        log.info("Kullanıcı rolü değiştirildi. userId={}, {} -> {}, by={}",
                userId, oldRole, newRole, actor.getUsername());

        eventPublisher.publishEvent(
                UserChangedEvent.roleChanged(userId, oldRole, newRole, actor.getId())
        );

        return getDetail(userId);
    }

    /**
     * Bir kullanıcının aktif/pasif durumunu değiştirir.
     *
     * <p>Pasifleştirilen kullanıcı Keycloak'ta da disable edilir; mevcut
     * session'ları sonlandırılır ve sisteme giremez. Tekrar aktif edildiğinde
     * normal şekilde giriş yapabilir.
     *
     * <p>İş kuralları:
     * <ul>
     *   <li>Admin kendi hesabını pasifleştiremez.</li>
     *   <li>Son aktif admin pasifleştirilemez.</li>
     * </ul>
     */
    @Transactional
    @AdminAudited(action = AuditAction.USER_STATUS_CHANGED, targetType = "user")
    public AdminUserDetailResponse updateStatus(Long userId, UpdateUserStatusRequest request) {
        User actor = resolveActorOrThrow();
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException(
                        ErrorCode.NOT_FOUND, "Kullanıcı bulunamadı: " + userId));

        selfActionGuard.preventSelfAction(actor, target, "hesap durumu değiştirme");

        boolean oldActive = Boolean.TRUE.equals(target.getIsActive());
        boolean newActive = Boolean.TRUE.equals(request.active());

        // Aktif admin pasifleştiriliyorsa son admin koruması devreye girer
        if (oldActive && !newActive) {
            selfActionGuard.ensureNotLastAdmin(target);
        }

        target.setIsActive(newActive);
        userRepository.save(target);

        keycloakAdminService.setEnabled(target.getKeycloakId(), newActive);

        log.info("Kullanıcı durumu değiştirildi. userId={}, {} -> {}, by={}",
                userId, oldActive, newActive, actor.getUsername());

        eventPublisher.publishEvent(
                UserChangedEvent.statusChanged(userId, oldActive, newActive, actor.getId())
        );

        return getDetail(userId);
    }

    @Transactional
    @AdminAudited(action = AuditAction.USER_2FA_RESET, targetType = "user")
    public void reset2Fa(Long userId, String reason) {
        User actor = resolveActorOrThrow();
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException(
                        ErrorCode.NOT_FOUND, "Kullanıcı bulunamadı: " + userId));

        selfActionGuard.preventSelfAction(actor, target, "2FA sıfırlama");

        SecurityStatusResponse securityStatus = fetchSecurityStatusSafely(target.getKeycloakId());
        if (securityStatus != null) {
            securityStatus.otpCredentials().forEach((credential) ->
                    keycloakAdminService.deleteOtpCredential(target.getKeycloakId(), credential.id()));
        }

        log.info("Kullanıcı 2FA sıfırlandı. userId={}, by={}, reason={}",
                userId, actor.getUsername(), reason);

        eventPublisher.publishEvent(
                UserChangedEvent.updated(userId, actor.getId())
        );
    }

    // =========================================================================
    // Yardımcı metodlar
    // =========================================================================

    private AdminUserListResponse toListResponse(User user) {
        long portfolioCount = portfolioRepository.countByUserId(user.getId());
        return AdminUserListResponse.builder()
                .id(user.getId())
                .keycloakId(user.getKeycloakId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole())
                .active(Boolean.TRUE.equals(user.getIsActive()))
                .twoFactorEnabled(false) // Liste için Keycloak'a sorgu atılmaz; performans
                .lastLoginAt(toInstant(user.getLastLoginAt()))
                .portfolioCount(portfolioCount)
                .createdAt(toInstant(user.getCreatedAt()))
                .build();
    }

    /**
     * Keycloak security status'ünü sessiz çekme. Hata olursa null döner —
     * detay sayfası yine açılır, sadece 2FA/session bilgileri eksik olur.
     */
    private SecurityStatusResponse fetchSecurityStatusSafely(String keycloakId) {
        try {
            return keycloakAdminService.getSecurityStatus(keycloakId);
        } catch (Exception e) {
            log.warn("Keycloak security status alınamadı. keycloakId={}", keycloakId, e);
            return null;
        }
    }

    /**
     * SecurityContext üzerinden işlemi yapan admin'i çözer.
     * Bulamazsa {@link NotFoundException} fırlatır — admin endpoint'lerine
     * authenticated user olmadan erişilemez zaten, bu durum normalde olmaz.
     */
    private User resolveActorOrThrow() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!(auth instanceof JwtAuthenticationToken jwtAuth)) {
            throw new NotFoundException(ErrorCode.NOT_FOUND, "Aktif oturum bulunamadı");
        }
        Jwt jwt = jwtAuth.getToken();
        String keycloakId = jwt.getSubject();
        return userRepository.findByKeycloakId(keycloakId)
                .orElseThrow(() -> new NotFoundException(
                        ErrorCode.NOT_FOUND, "Aktif kullanıcı veritabanında bulunamadı"));
    }

    /**
     * {@code LocalDateTime} alanlarını {@code Instant}'a çevirir.
     * User entity'si LocalDateTime kullanıyor; DTO'lar Instant kullanıyor.
     */
    private java.time.Instant toInstant(java.time.LocalDateTime ldt) {
        return ldt == null ? null : ldt.atZone(java.time.ZoneOffset.UTC).toInstant();
    }
}
