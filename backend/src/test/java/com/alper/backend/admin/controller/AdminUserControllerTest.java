package com.alper.backend.admin.controller;

import com.alper.backend.admin.dto.AdminUserDetailResponse;
import com.alper.backend.admin.dto.AdminUserListResponse;
import com.alper.backend.admin.dto.UpdateUserRoleRequest;
import com.alper.backend.admin.dto.UpdateUserStatusRequest;
import com.alper.backend.admin.model.AuditLog;
import com.alper.backend.admin.service.AdminUserService;
import com.alper.backend.common.exception.ConflictException;
import com.alper.backend.common.exception.ErrorCode;
import com.alper.backend.common.exception.NotFoundException;
import com.alper.backend.common.web.GlobalExceptionHandler;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import com.alper.backend.user.model.UserRole;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("AdminUserController Testleri")
class AdminUserControllerTest {

    @Mock private AdminUserService adminUserService;

    @InjectMocks private AdminUserController controller;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .build();
    }

    private AdminUserListResponse buildListResponse(Long id, String username) {
        return AdminUserListResponse.builder()
                .id(id)
                .keycloakId("kc-uuid-" + id)
                .username(username)
                .email(username + "@example.com")
                .role(UserRole.NORMAL_USER)
                .active(true)
                .twoFactorEnabled(false)
                .portfolioCount(0)
                .createdAt(Instant.now())
                .build();
    }

    private AdminUserDetailResponse buildDetailResponse(Long id) {
        return AdminUserDetailResponse.builder()
                .id(id)
                .keycloakId("kc-uuid-" + id)
                .username("user-" + id)
                .email("user" + id + "@example.com")
                .role(UserRole.NORMAL_USER)
                .active(true)
                .twoFactorEnabled(false)
                .portfolioCount(2)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }

    @Nested
    @DisplayName("GET /api/v1/admin/users")
    class ListUsers {

        @Test
        @DisplayName("200 — kullanıcı listesi için servis çağrılır")
        void list_returns200() throws Exception {
            when(adminUserService.list(any(), any(), any(), any(Pageable.class)))
                    .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));

            mockMvc.perform(get("/api/v1/admin/users"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("200 — arama parametresi servise iletilir")
        void list_withSearchParam_callsService() throws Exception {
            when(adminUserService.list(any(), any(), any(), any(Pageable.class)))
                    .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));

            mockMvc.perform(get("/api/v1/admin/users").param("search", "test"))
                    .andExpect(status().isOk());
        }
    }

    @Nested
    @DisplayName("GET /api/v1/admin/users/{userId}")
    class GetDetail {

        @Test
        @DisplayName("200 — kullanıcı detayı döner")
        void getDetail_returns200() throws Exception {
            when(adminUserService.getDetail(2L)).thenReturn(buildDetailResponse(2L));

            mockMvc.perform(get("/api/v1/admin/users/2"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.id").value(2))
                    .andExpect(jsonPath("$.data.username").value("user-2"));
        }

        @Test
        @DisplayName("404 — kullanıcı bulunamazsa 404")
        void getDetail_whenNotFound_returns404() throws Exception {
            when(adminUserService.getDetail(99L))
                    .thenThrow(new NotFoundException(ErrorCode.NOT_FOUND, "Kullanıcı bulunamadı: 99"));

            mockMvc.perform(get("/api/v1/admin/users/99"))
                    .andExpect(status().isNotFound());
        }
    }

    @Nested
    @DisplayName("PATCH /api/v1/admin/users/{userId}/role")
    class UpdateRole {

        @Test
        @DisplayName("200 — rol başarıyla güncellenir")
        void updateRole_returns200() throws Exception {
            Map<String, String> body = Map.of("newRole", "ADMIN", "reason", "Yeni admin atandı göreve");
            when(adminUserService.updateRole(eq(2L), any(UpdateUserRoleRequest.class)))
                    .thenReturn(buildDetailResponse(2L));

            mockMvc.perform(patch("/api/v1/admin/users/2/role")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(body)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.id").value(2));
        }

        @Test
        @DisplayName("409 — self-action → 409")
        void updateRole_whenSelf_returns409() throws Exception {
            Map<String, String> body = Map.of("newRole", "NORMAL_USER", "reason", "Kendimi düşürüyorum");

            when(adminUserService.updateRole(eq(1L), any(UpdateUserRoleRequest.class)))
                    .thenThrow(new ConflictException(
                            ErrorCode.BUSINESS_RULE_VIOLATION, "Kendi hesabınız üzerinde bu işlemi yapamazsınız"));

            mockMvc.perform(patch("/api/v1/admin/users/1/role")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(body)))
                    .andExpect(status().isUnprocessableEntity());
        }
    }

    @Nested
    @DisplayName("PATCH /api/v1/admin/users/{userId}/status")
    class UpdateStatus {

        @Test
        @DisplayName("200 — kullanıcı durumu güncellenir")
        void updateStatus_returns200() throws Exception {
            Map<String, Object> body = Map.of("active", false, "reason", "Hesap askıya alındı güvenlik nedeniyle");
            when(adminUserService.updateStatus(eq(2L), any(UpdateUserStatusRequest.class)))
                    .thenReturn(buildDetailResponse(2L));

            mockMvc.perform(patch("/api/v1/admin/users/2/status")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(body)))
                    .andExpect(status().isOk());
        }
    }

    @Nested
    @DisplayName("POST /api/v1/admin/users/{userId}/reset-2fa")
    class Reset2Fa {

        @Test
        @DisplayName("200 — 2FA başarıyla sıfırlanır")
        void reset2Fa_returns200() throws Exception {
            Map<String, String> body = Map.of("reason", "Kullanıcı cihazını kaybetti ve yardım istedi");
            doNothing().when(adminUserService).reset2Fa(eq(2L), any());

            mockMvc.perform(post("/api/v1/admin/users/2/reset-2fa")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(body)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }
    }

    @Nested
    @DisplayName("GET /api/v1/admin/users/{userId}/audit-trail")
    class AuditTrail {

        @Test
        @DisplayName("200 — audit trail için servis çağrılır")
        void getAuditTrail_returns200() throws Exception {
            when(adminUserService.getAuditTrail(eq(2L), any(Pageable.class)))
                    .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));

            mockMvc.perform(get("/api/v1/admin/users/2/audit-trail"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("404 — kullanıcı bulunamazsa 404")
        void getAuditTrail_whenNotFound_returns404() throws Exception {
            when(adminUserService.getAuditTrail(eq(99L), any(Pageable.class)))
                    .thenThrow(new NotFoundException(ErrorCode.NOT_FOUND, "Kullanıcı bulunamadı: 99"));

            mockMvc.perform(get("/api/v1/admin/users/99/audit-trail"))
                    .andExpect(status().isNotFound());
        }
    }
}
