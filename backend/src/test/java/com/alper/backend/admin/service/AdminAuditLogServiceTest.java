package com.alper.backend.admin.service;

import com.alper.backend.admin.model.AuditAction;
import com.alper.backend.admin.model.AuditLog;
import com.alper.backend.admin.repository.AuditLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AdminAuditLogService Testleri")
class AdminAuditLogServiceTest {

    @Mock private AuditLogRepository auditLogRepository;

    private AdminAuditLogService service;

    @BeforeEach
    void setUp() {
        service = new AdminAuditLogService(auditLogRepository);
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
    @DisplayName("targetTypes filtresi")
    class TargetTypeFilter {

        @Test
        @DisplayName("targetTypes dolu ise repository'ye filtreli sorgu gider")
        void list_withTargetTypes_callsFilteredQuery() {
            Pageable pageable = PageRequest.of(0, 10);
            List<String> types = List.of("user", "source");
            Page<AuditLog> expected = new PageImpl<>(List.of(buildLog("user")));
            when(auditLogRepository.findByTargetTypeInOrderByCreatedAtDesc(types, pageable))
                    .thenReturn(expected);

            Page<AuditLog> result = service.list(types, pageable);

            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().get(0).getTargetType()).isEqualTo("user");
            verify(auditLogRepository).findByTargetTypeInOrderByCreatedAtDesc(types, pageable);
        }

        @Test
        @DisplayName("targetTypes null ise tüm kayıtlar döner")
        void list_withNullTargetTypes_callsUnfilteredQuery() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<AuditLog> expected = new PageImpl<>(List.of(buildLog("user"), buildLog("source")));
            when(auditLogRepository.findAllByOrderByCreatedAtDesc(pageable)).thenReturn(expected);

            Page<AuditLog> result = service.list(null, pageable);

            assertThat(result.getContent()).hasSize(2);
            verify(auditLogRepository).findAllByOrderByCreatedAtDesc(pageable);
        }

        @Test
        @DisplayName("targetTypes boş liste ise tüm kayıtlar döner")
        void list_withEmptyTargetTypes_callsUnfilteredQuery() {
            Pageable pageable = PageRequest.of(0, 5);
            Page<AuditLog> expected = new PageImpl<>(List.of(buildLog("category")));
            when(auditLogRepository.findAllByOrderByCreatedAtDesc(pageable)).thenReturn(expected);

            Page<AuditLog> result = service.list(List.of(), pageable);

            verify(auditLogRepository).findAllByOrderByCreatedAtDesc(pageable);
            assertThat(result).isNotNull();
        }

        @Test
        @DisplayName("targetTypes yalnızca boşluk string içeriyorsa filtre atlanır")
        void list_withBlankOnlyTargetTypes_callsUnfilteredQuery() {
            Pageable pageable = PageRequest.of(0, 5);
            Page<AuditLog> expected = new PageImpl<>(List.of());
            when(auditLogRepository.findAllByOrderByCreatedAtDesc(pageable)).thenReturn(expected);

            Page<AuditLog> result = service.list(List.of("  ", ""), pageable);

            verify(auditLogRepository).findAllByOrderByCreatedAtDesc(pageable);
        }
    }

    @Nested
    @DisplayName("Sayfalama")
    class Pagination {

        @Test
        @DisplayName("Pageable doğru şekilde iletilir")
        void list_returnsPagedResults() {
            Pageable pageable = PageRequest.of(2, 20);
            Page<AuditLog> expected = new PageImpl<>(List.of(), pageable, 0);
            when(auditLogRepository.findAllByOrderByCreatedAtDesc(pageable)).thenReturn(expected);

            Page<AuditLog> result = service.list(null, pageable);

            assertThat(result).isNotNull();
            verify(auditLogRepository).findAllByOrderByCreatedAtDesc(pageable);
        }
    }
}
