package com.alper.backend.admin.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Kullanıcının aktif/pasif durumunu değiştirme isteği.
 *
 * <p>Hassas kategoride bir işlemdir; {@code reason} alanı zorunludur.
 *
 * <p>Service katmanında ek iş kuralı kontrolleri:
 * <ul>
 *   <li>Admin kendi hesabını pasifleştiremez.</li>
 *   <li>Sistemin son aktif admin'i pasifleştirilemez.</li>
 * </ul>
 *
 * <p>Pasifleştirilen kullanıcılar Keycloak tarafından da disable edilir;
 * mevcut session'ları sonlandırılır. Bu işlem geri alınabilir — kullanıcı
 * tekrar aktif edildiğinde hesabı normal şekilde çalışmaya devam eder.
 *
 * @param active hedef durum (true = aktif, false = pasif)
 * @param reason gerekçe (min 10, max 500 karakter)
 */
public record UpdateUserStatusRequest(

        @NotNull(message = "Aktiflik durumu belirtilmelidir.")
        Boolean active,

        @NotNull(message = "Durum değişikliği için gerekçe zorunludur.")
        @Size(min = 10, max = 500, message = "Gerekçe 10-500 karakter arasında olmalıdır.")
        String reason
) {
}