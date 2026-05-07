package com.alper.backend.admin.dto;

import com.alper.backend.user.model.UserRole;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Kullanıcının rolünü değiştirme isteği.
 *
 * <p>Bu işlem hassas kategorisindedir; {@code reason} alanı zorunlu olup
 * minimum 10 karakter girilmelidir. Audit log'a yazılırken aynen aktarılır.
 *
 * <p>Service katmanında ek iş kuralı kontrolleri yapılır:
 * <ul>
 *   <li>Admin kendi rolünü değiştiremez.</li>
 *   <li>Sistemin son aktif admin'i rolünü düşüremez (en az 1 admin korunur).</li>
 * </ul>
 *
 * @param newRole hedef rol (NORMAL_USER veya ADMIN)
 * @param reason  rol değişiklik gerekçesi (min 10, max 500 karakter)
 */
public record UpdateUserRoleRequest(

        @NotNull(message = "Yeni rol belirtilmelidir.")
        UserRole newRole,

        @NotNull(message = "Rol değişikliği için gerekçe zorunludur.")
        @Size(min = 10, max = 500, message = "Gerekçe 10-500 karakter arasında olmalıdır.")
        String reason
) {
}