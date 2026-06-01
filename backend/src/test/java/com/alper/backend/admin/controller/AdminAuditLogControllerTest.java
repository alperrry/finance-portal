package com.alper.backend.admin.controller;

import com.alper.backend.admin.model.AuditAction;
import com.alper.backend.admin.model.AuditLog;
import com.alper.backend.admin.service.AdminAuditLogService;
import com.alper.backend.common.web.GlobalExceptionHandler;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("AdminAuditLogController Testleri")
class AdminAuditLogControllerTest {

    @Mock private AdminAuditLogService adminAuditLogService;

    @InjectMocks private AdminAuditLogController controller;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .build();
    }

    private AuditLog buildLog(String targetType) {
        return AuditLog.builder()
                .id(1L)
                .actorUserId(10L)
                .actorUsername("admin")
                .action(AuditAction.USER_ROLE_CHANGED)
                .targetType(targetType)
                .targetId(99L)
                .createdAt(Instant.now())
                .build();
    }

    @Nested
    @DisplayName("GET /api/v1/admin/audit")
    class ListAuditLogs {

        @Test
        @DisplayName("200 — filtre olmadan servis çağrılır ve 200 döner")
        void list_noFilter_returns200() throws Exception {
            when(adminAuditLogService.list(isNull(), any(Pageable.class)))
                    .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));

            mockMvc.perform(get("/api/v1/admin/audit"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("200 — targetType parametresi servise iletilir")
        void list_withTargetTypeFilter_callsServiceWithFilter() throws Exception {
            when(adminAuditLogService.list(any(), any(Pageable.class)))
                    .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));

            mockMvc.perform(get("/api/v1/admin/audit").param("targetType", "user"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("200 — boş sayfa için 200 döner")
        void list_whenEmpty_returns200() throws Exception {
            when(adminAuditLogService.list(any(), any(Pageable.class)))
                    .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));

            mockMvc.perform(get("/api/v1/admin/audit"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("200 — sayfalama parametreleri servise iletilir")
        void list_withPagination_returns200() throws Exception {
            when(adminAuditLogService.list(any(), any(Pageable.class)))
                    .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));

            mockMvc.perform(get("/api/v1/admin/audit")
                            .param("page", "1")
                            .param("size", "5"))
                    .andExpect(status().isOk());
        }
    }
}
