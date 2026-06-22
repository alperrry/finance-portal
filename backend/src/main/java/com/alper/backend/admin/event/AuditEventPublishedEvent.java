package com.alper.backend.admin.event;

import com.alper.backend.admin.model.AuditLog;

/**
 * Yeni bir denetim (audit) kaydı oluşturulduğunda yayınlanan uygulama olayı.
 *
 * <p>Transaction commit sonrası dinlenir ve kayıt WebSocket üzerinden
 * admin paneline iletilir.</p>
 *
 * @param auditLog oluşturulan denetim kaydı
 */
public record AuditEventPublishedEvent(AuditLog auditLog) {
}