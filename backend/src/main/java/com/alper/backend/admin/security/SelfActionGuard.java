package com.alper.backend.admin.security;

import com.alper.backend.common.exception.ConflictException;
import com.alper.backend.common.exception.ErrorCode;
import com.alper.backend.user.model.User;
import com.alper.backend.user.model.UserRole;
import com.alper.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Component;

/**
 * Admin'in kendisine zarar verecek işlemleri engelleyen guard.
 *
 * <p>Bu sınıf admin servis katmanından çağrılır ve şu kuralları uygular:
 * <ul>
 *   <li>Bir admin kendi rolünü değiştiremez (kendini Normal Kullanıcı yapamaz).</li>
 *   <li>Bir admin kendi hesabını pasifleştiremez.</li>
 *   <li>Sistemin son aktif admin'inin rolü düşürülemez veya pasifleştirilemez.</li>
 *   <li>Admin kendi 2FA'sını sıfırlayamaz (Sprint 2'de devreye girer).</li>
 * </ul>
 *
 * <p>Bu kontroller production'da yaşanan klasik kazaları önler:
 * "yanlışlıkla son admin'i pasifleştirdim, şimdi sisteme kimse giremiyor"
 * tarzı geri dönüşü zor durumların önüne geçer.
 *
 * <p>İhlal durumunda {@link ConflictException} fırlatılır;
 * {@code GlobalExceptionHandler} bunu HTTP 409 + iş kuralı hata kodu
 * ile yanıtlar.
 */
@Component
@RequiredArgsConstructor
@Log4j2
public class SelfActionGuard {

    private final UserRepository userRepository;


    public void preventSelfAction(User actor, User target, String action) {
        if (actor == null || target == null) {
            return;
        }
        if (actor.getId().equals(target.getId())) {
            log.warn("Admin self-action engellendi. actor={}, action={}",
                    actor.getUsername(), action);
            throw new ConflictException(
                    ErrorCode.BUSINESS_RULE_VIOLATION,
                    "Kendi hesabınız üzerinde bu işlemi yapamazsınız: " + action
            );
        }
    }


    public void ensureNotLastAdmin(User target) {
        if (target == null) {
            return;
        }
        boolean isCurrentlyAdmin = target.getRole() == UserRole.ADMIN
                && Boolean.TRUE.equals(target.getIsActive());
        if (!isCurrentlyAdmin) {
            // Hedef zaten admin değilse veya pasifse, son admin kontrolüne gerek yok
            return;
        }

        long otherActiveAdmins = userRepository.countByRoleAndIsActiveAndIdNot(
                UserRole.ADMIN, true, target.getId()
        );

        if (otherActiveAdmins == 0) {
            log.warn("Son aktif admin korumasi devreye girdi. target={}", target.getUsername());
            throw new ConflictException(
                    ErrorCode.BUSINESS_RULE_VIOLATION,
                    "Sistemde en az bir aktif admin bulunmalıdır. Bu işlem son admin'i etkiler."
            );
        }
    }
}