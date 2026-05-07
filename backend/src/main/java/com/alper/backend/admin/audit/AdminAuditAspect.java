package com.alper.backend.admin.audit;

import com.alper.backend.user.model.User;
import com.alper.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;


@Aspect
@Component
@RequiredArgsConstructor
@Log4j2
public class AdminAuditAspect {

    private final AuditService auditService;
    private final UserRepository userRepository;

    @Around("@annotation(adminAudited)")
    public Object aroundAuditedMethod(
            ProceedingJoinPoint joinPoint,
            AdminAudited adminAudited
    ) throws Throwable {

        Object[] args = joinPoint.getArgs();
        Long targetId = extractTargetId(args);
        String reason = extractReason(args);

        // Before state — hedef "user" ise, mevcut state'i snapshot olarak al
        Object beforeState = captureBeforeState(adminAudited.targetType(), targetId);

        // Asıl iş mantığını çalıştır
        Object result = joinPoint.proceed();

        // After state — başarıdan sonraki güncel state
        Object afterState = captureAfterState(adminAudited.targetType(), targetId);

        try {
            User actor = resolveActor();
            if (actor == null) {
                Method method = ((MethodSignature) joinPoint.getSignature()).getMethod();
                log.warn("Audit aktörü çözülemedi, log atlanıyor. method={}.{}",
                        method.getDeclaringClass().getSimpleName(), method.getName());
                return result;
            }

            auditService.log(
                    actor.getId(),
                    actor.getUsername(),
                    adminAudited.action(),
                    adminAudited.targetType(),
                    targetId,
                    afterState,
                    beforeState,
                    afterState,
                    reason
            );
        } catch (Exception e) {
            // Audit yazımı asıl iş mantığını engellemez — sadece log'la
            log.error("Audit log yazılamadı, iş mantığı etkilenmedi. action={}, target={}:{}",
                    adminAudited.action(), adminAudited.targetType(), targetId, e);
        }

        return result;
    }


    private Long extractTargetId(Object[] args) {
        for (Object arg : args) {
            if (arg instanceof Long id) {
                return id;
            }
        }
        return null;
    }


    private String extractReason(Object[] args) {
        for (Object arg : args) {
            if (arg == null) {
                continue;
            }
            try {
                Method reasonMethod = arg.getClass().getMethod("reason");
                Object value = reasonMethod.invoke(arg);
                if (value instanceof String s && !s.isBlank()) {
                    return s;
                }
            } catch (NoSuchMethodException ignored) {
                // Bu argümanın reason'ı yok, sıradakine bak
            } catch (Exception e) {
                log.debug("reason() çağrısı başarısız. arg={}", arg.getClass(), e);
            }
        }
        return null;
    }


    private Object captureBeforeState(String targetType, Long targetId) {
        if (targetId == null) {
            return null;
        }
        if ("user".equals(targetType)) {
            return userRepository.findById(targetId)
                    .map(this::toUserSnapshot)
                    .orElse(null);
        }
        return null;
    }

    private Object captureAfterState(String targetType, Long targetId) {
        if (targetId == null) {
            return null;
        }
        if ("user".equals(targetType)) {
            return userRepository.findById(targetId)
                    .map(this::toUserSnapshot)
                    .orElse(null);
        }
        return null;
    }


    private User resolveActor() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (!(auth instanceof JwtAuthenticationToken jwtAuth)) {
                return null;
            }
            Jwt jwt = jwtAuth.getToken();
            String keycloakId = jwt.getSubject();
            if (keycloakId == null || keycloakId.isBlank()) {
                return null;
            }
            return userRepository.findByKeycloakId(keycloakId).orElse(null);
        } catch (Exception e) {
            log.debug("SecurityContext'ten aktör çözümlenemedi.", e);
            return null;
        }
    }


    private Object toUserSnapshot(User user) {
        return new UserSnapshot(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole() != null ? user.getRole().name() : null,
                user.getIsActive() != null && user.getIsActive()
        );
    }


    private record UserSnapshot(
            Long id,
            String username,
            String email,
            String role,
            boolean active
    ) {}
}