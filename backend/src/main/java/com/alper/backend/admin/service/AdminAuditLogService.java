package com.alper.backend.admin.service;

import com.alper.backend.admin.model.AuditLog;
import com.alper.backend.admin.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminAuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Transactional(readOnly = true)
    public Page<AuditLog> list(List<String> targetTypes, Pageable pageable) {
        if (targetTypes == null || targetTypes.isEmpty()) {
            return auditLogRepository.findAllByOrderByCreatedAtDesc(pageable);
        }
        List<String> normalizedTargetTypes = targetTypes.stream()
                .filter(value -> value != null && !value.isBlank())
                .map(String::trim)
                .distinct()
                .toList();
        if (normalizedTargetTypes.isEmpty()) {
            return auditLogRepository.findAllByOrderByCreatedAtDesc(pageable);
        }
        return auditLogRepository.findByTargetTypeInOrderByCreatedAtDesc(normalizedTargetTypes, pageable);
    }
}
