package com.alper.backend.admin.event;

import com.alper.backend.admin.model.AuditLog;

public record AuditEventPublishedEvent(AuditLog auditLog) {
}