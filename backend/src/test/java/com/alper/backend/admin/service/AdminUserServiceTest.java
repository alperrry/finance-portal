package com.alper.backend.admin.service;

import com.alper.backend.admin.dto.AdminUserDetailResponse;
import com.alper.backend.admin.dto.AdminUserListResponse;
import com.alper.backend.admin.dto.UpdateUserRoleRequest;
import com.alper.backend.admin.dto.UpdateUserStatusRequest;
import com.alper.backend.admin.repository.AuditLogRepository;
import com.alper.backend.admin.security.SelfActionGuard;
import com.alper.backend.common.exception.ConflictException;
import com.alper.backend.common.exception.NotFoundException;
import com.alper.backend.portfolio.repository.PortfolioRepository;
import com.alper.backend.user.model.User;
import com.alper.backend.user.model.UserRole;
import com.alper.backend.user.repository.UserRepository;
import com.alper.backend.user.service.KeycloakAdminService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("AdminUserService Testleri")
class AdminUserServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private PortfolioRepository portfolioRepository;
    @Mock private AuditLogRepository auditLogRepository;
    @Mock private KeycloakAdminService keycloakAdminService;
    @Mock private SelfActionGuard selfActionGuard;
    @Mock private ApplicationEventPublisher eventPublisher;

    private AdminUserService service;

    private static final String ACTOR_KEYCLOAK_ID = "actor-kc-uuid";
    private static final Long ACTOR_ID = 1L;
    private static final Long TARGET_ID = 2L;

    @BeforeEach
    void setUp() {
        service = new AdminUserService(
                userRepository,
                portfolioRepository,
                auditLogRepository,
                keycloakAdminService,
                selfActionGuard,
                eventPublisher
        );
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    private User buildActor() {
        return User.builder()
                .id(ACTOR_ID)
                .keycloakId(ACTOR_KEYCLOAK_ID)
                .username("admin-user")
                .email("admin@example.com")
                .role(UserRole.ADMIN)
                .isActive(true)
                .build();
    }

    private User buildTarget() {
        return User.builder()
                .id(TARGET_ID)
                .keycloakId("target-kc-uuid")
                .username("target-user")
                .email("target@example.com")
                .role(UserRole.NORMAL_USER)
                .isActive(true)
                .build();
    }

    private void setupSecurityContextWithActor() {
        Jwt jwt = mock(Jwt.class);
        when(jwt.getSubject()).thenReturn(ACTOR_KEYCLOAK_ID);
        when(jwt.getClaims()).thenReturn(Map.of("sub", ACTOR_KEYCLOAK_ID));

        JwtAuthenticationToken auth = mock(JwtAuthenticationToken.class);
        when(auth.getToken()).thenReturn(jwt);

        SecurityContext context = mock(SecurityContext.class);
        when(context.getAuthentication()).thenReturn(auth);

        SecurityContextHolder.setContext(context);
        when(userRepository.findByKeycloakId(ACTOR_KEYCLOAK_ID))
                .thenReturn(Optional.of(buildActor()));
    }

    @Nested
    @DisplayName("Kullanıcı Listeleme")
    class UserListing {

        @Test
        @DisplayName("list — sayfalı kullanıcı listesi döner")
        void list_returnsPagedResults() {
            Pageable pageable = PageRequest.of(0, 10);
            User user = buildTarget();
            Page<User> userPage = new PageImpl<>(List.of(user));

            when(userRepository.searchAdminUsers(null, null, null, pageable)).thenReturn(userPage);
            when(portfolioRepository.countByUserId(TARGET_ID)).thenReturn(2L);

            Page<AdminUserListResponse> result = service.list(null, null, null, pageable);

            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().get(0).username()).isEqualTo("target-user");
        }

        @Test
        @DisplayName("list — rol filtresi iletilir")
        void list_withRoleFilter_filtersCorrectly() {
            Pageable pageable = PageRequest.of(0, 10);
            when(userRepository.searchAdminUsers(null, UserRole.ADMIN, null, pageable))
                    .thenReturn(new PageImpl<>(List.of()));

            Page<AdminUserListResponse> result = service.list(null, UserRole.ADMIN, null, pageable);

            assertThat(result.getContent()).isEmpty();
            verify(userRepository).searchAdminUsers(null, UserRole.ADMIN, null, pageable);
        }
    }

    @Nested
    @DisplayName("Detay Görüntüleme")
    class UserDetail {

        @Test
        @DisplayName("getDetail — kullanıcı detayını döner")
        void getDetail_returnsUserWithAuditTrail() {
            User target = buildTarget();
            when(userRepository.findById(TARGET_ID)).thenReturn(Optional.of(target));
            when(portfolioRepository.countByUserId(TARGET_ID)).thenReturn(3L);
            when(keycloakAdminService.getSecurityStatus(any())).thenReturn(null);

            AdminUserDetailResponse result = service.getDetail(TARGET_ID);

            assertThat(result.id()).isEqualTo(TARGET_ID);
            assertThat(result.username()).isEqualTo("target-user");
            assertThat(result.portfolioCount()).isEqualTo(3L);
        }

        @Test
        @DisplayName("getDetail — kullanıcı bulunamazsa NotFoundException fırlar")
        void getDetail_whenNotFound_throwsNotFound() {
            when(userRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.getDetail(99L))
                    .isInstanceOf(NotFoundException.class)
                    .hasMessageContaining("99");
        }

        @Test
        @DisplayName("getDetail — Keycloak hatası sessizce yutuluİr")
        void getDetail_whenKeycloakFails_returnsDetailWithoutTwoFa() {
            User target = buildTarget();
            when(userRepository.findById(TARGET_ID)).thenReturn(Optional.of(target));
            when(portfolioRepository.countByUserId(TARGET_ID)).thenReturn(0L);
            when(keycloakAdminService.getSecurityStatus(any()))
                    .thenThrow(new RuntimeException("Keycloak bağlantı hatası"));

            AdminUserDetailResponse result = service.getDetail(TARGET_ID);

            assertThat(result.twoFactorEnabled()).isFalse();
        }
    }

    @Nested
    @DisplayName("Rol Güncelleme")
    class RoleUpdate {

        @Test
        @DisplayName("updateRole — izin verilen rol değişikliği uygulanır")
        void updateRole_whenNotSelf_updatesRole() {
            setupSecurityContextWithActor();
            User target = buildTarget();
            UpdateUserRoleRequest req = new UpdateUserRoleRequest(UserRole.ADMIN, "Yetkilendirme gerekli");

            when(userRepository.findById(TARGET_ID)).thenReturn(Optional.of(target));
            when(userRepository.save(any(User.class))).thenReturn(target);
            when(portfolioRepository.countByUserId(TARGET_ID)).thenReturn(0L);
            when(keycloakAdminService.getSecurityStatus(any())).thenReturn(null);

            service.updateRole(TARGET_ID, req);

            verify(userRepository).save(target);
            verify(keycloakAdminService).syncRole(target.getKeycloakId(), UserRole.ADMIN);
        }

        @Test
        @DisplayName("updateRole — self-action guard tetiklenirse ConflictException fırlar")
        void updateRole_whenSelf_throwsConflict() {
            setupSecurityContextWithActor();
            User target = buildActor();
            UpdateUserRoleRequest req = new UpdateUserRoleRequest(UserRole.NORMAL_USER, "Kendimi düşürüyorum");

            when(userRepository.findById(ACTOR_ID)).thenReturn(Optional.of(target));
            doThrow(new ConflictException(
                    com.alper.backend.common.exception.ErrorCode.BUSINESS_RULE_VIOLATION,
                    "Kendi hesabınız üzerinde bu işlemi yapamazsınız"))
                    .when(selfActionGuard).preventSelfAction(any(), any(), any());

            assertThatThrownBy(() -> service.updateRole(ACTOR_ID, req))
                    .isInstanceOf(ConflictException.class);
        }

        @Test
        @DisplayName("updateRole — hedef kullanıcı bulunamazsa NotFoundException fırlar")
        void updateRole_whenTargetNotFound_throwsNotFound() {
            setupSecurityContextWithActor();
            UpdateUserRoleRequest req = new UpdateUserRoleRequest(UserRole.ADMIN, "Yetkilendirme gerekli");
            when(userRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.updateRole(99L, req))
                    .isInstanceOf(NotFoundException.class);
        }
    }

    @Nested
    @DisplayName("Durum Güncelleme")
    class StatusUpdate {

        @Test
        @DisplayName("updateStatus — aktif kullanıcı pasifleştirilebilir")
        void updateStatus_syncsWithKeycloak() {
            setupSecurityContextWithActor();
            User target = buildTarget();
            UpdateUserStatusRequest req = new UpdateUserStatusRequest(false, "Hesap askıya alındı");

            when(userRepository.findById(TARGET_ID)).thenReturn(Optional.of(target));
            when(userRepository.save(any(User.class))).thenReturn(target);
            when(portfolioRepository.countByUserId(TARGET_ID)).thenReturn(0L);
            when(keycloakAdminService.getSecurityStatus(any())).thenReturn(null);

            service.updateStatus(TARGET_ID, req);

            verify(keycloakAdminService).setEnabled(target.getKeycloakId(), false);
        }

        @Test
        @DisplayName("updateStatus — self-action guard tetiklenirse ConflictException fırlar")
        void updateStatus_whenSelf_throwsConflict() {
            setupSecurityContextWithActor();
            User target = buildActor();
            UpdateUserStatusRequest req = new UpdateUserStatusRequest(false, "Kendi hesabımı pasifleştiriyorum");

            when(userRepository.findById(ACTOR_ID)).thenReturn(Optional.of(target));
            doThrow(new ConflictException(
                    com.alper.backend.common.exception.ErrorCode.BUSINESS_RULE_VIOLATION,
                    "Kendi hesabınız üzerinde bu işlemi yapamazsınız"))
                    .when(selfActionGuard).preventSelfAction(any(), any(), any());

            assertThatThrownBy(() -> service.updateStatus(ACTOR_ID, req))
                    .isInstanceOf(ConflictException.class);
        }
    }

    @Nested
    @DisplayName("2FA Sıfırlama")
    class TwoFaReset {

        @Test
        @DisplayName("reset2Fa — hedef kullanıcı bulunamazsa NotFoundException fırlar")
        void reset2Fa_whenTargetNotFound_throwsNotFound() {
            setupSecurityContextWithActor();
            when(userRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.reset2Fa(99L, "Kullanıcı cihazını kaybetti"))
                    .isInstanceOf(NotFoundException.class);
        }

        @Test
        @DisplayName("reset2Fa — self-action guard tetiklenirse ConflictException fırlar")
        void reset2Fa_whenSelf_throwsConflict() {
            setupSecurityContextWithActor();
            User target = buildActor();
            when(userRepository.findById(ACTOR_ID)).thenReturn(Optional.of(target));
            doThrow(new ConflictException(
                    com.alper.backend.common.exception.ErrorCode.BUSINESS_RULE_VIOLATION,
                    "Kendi hesabınız üzerinde bu işlemi yapamazsınız"))
                    .when(selfActionGuard).preventSelfAction(any(), any(), any());

            assertThatThrownBy(() -> service.reset2Fa(ACTOR_ID, "Kendi 2FA'mı sıfırla"))
                    .isInstanceOf(ConflictException.class);
        }
    }

    @Nested
    @DisplayName("Audit Trail")
    class AuditTrail {

        @Test
        @DisplayName("getAuditTrail — kullanıcı bulunamazsa NotFoundException fırlar")
        void getAuditTrail_whenUserNotFound_throwsNotFound() {
            when(userRepository.existsById(99L)).thenReturn(false);

            assertThatThrownBy(() -> service.getAuditTrail(99L, PageRequest.of(0, 10)))
                    .isInstanceOf(NotFoundException.class);
        }

        @Test
        @DisplayName("getAuditTrail — mevcut kullanıcı için audit log döner")
        void getAuditTrail_returnsUserLogs() {
            Pageable pageable = PageRequest.of(0, 10);
            when(userRepository.existsById(TARGET_ID)).thenReturn(true);
            when(auditLogRepository.findByTargetTypeAndTargetIdOrderByCreatedAtDesc(
                    "user", TARGET_ID, pageable)).thenReturn(new PageImpl<>(List.of()));

            var result = service.getAuditTrail(TARGET_ID, pageable);

            assertThat(result).isNotNull();
            verify(auditLogRepository).findByTargetTypeAndTargetIdOrderByCreatedAtDesc(
                    "user", TARGET_ID, pageable);
        }
    }
}
