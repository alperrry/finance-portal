package com.alper.backend.admin.audit;

import com.alper.backend.admin.model.AuditAction;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;


/**
 * Admin servis metotlarını denetim (audit) kaydına tabi tutmak için kullanılan anotasyon.
 *
 * <p>İşaretlenen metotlar {@link AdminAuditAspect} tarafından sarılır ve çağrı
 * sonucunda otomatik olarak bir audit kaydı oluşturulur.</p>
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface AdminAudited {

    /** Kaydedilecek denetim aksiyonu. */
    AuditAction action();

    /** Aksiyonun hedef tipi (örn. "user", "news", "category"). */
    String targetType();
}