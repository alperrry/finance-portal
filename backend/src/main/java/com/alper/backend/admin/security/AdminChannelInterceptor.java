package com.alper.backend.admin.security;

import com.alper.backend.admin.websocket.AdminWebSocketTopics;
import com.alper.backend.user.model.UserRole;
import lombok.extern.log4j.Log4j2;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;


@Component
@Log4j2
public class AdminChannelInterceptor implements ChannelInterceptor {

    /** Spring Security'nin role authority prefix'i. */
    private static final String ROLE_PREFIX = "ROLE_";

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);

        // Sadece SUBSCRIBE komutlarında kontrol yapılır.
        // CONNECT, SEND, vb. diğer komutlar üst interceptor'a bırakılır.
        if (!StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            return message;
        }

        String destination = accessor.getDestination();
        if (destination == null || !destination.startsWith(AdminWebSocketTopics.PREFIX)) {
            // Admin topic'i değilse bizi ilgilendirmiyor.
            return message;
        }

        Authentication auth = (Authentication) accessor.getUser();
        if (auth == null || !auth.isAuthenticated()) {
            log.warn("Yetkisiz admin topic subscribe denemesi (auth yok). destination={}",
                    destination);
            throw new MessageDeliveryException("Authentication gereklidir.");
        }

        if (!hasAdminRole(auth)) {
            log.warn("Yetkisiz admin topic subscribe denemesi. user={}, destination={}",
                    auth.getName(), destination);
            throw new MessageDeliveryException("Bu kanalı dinlemek için ADMIN yetkisi gereklidir.");
        }

        log.debug("Admin topic subscribe başarılı. user={}, destination={}",
                auth.getName(), destination);
        return message;
    }

    /**
     * Authentication objesi içinde ADMIN rolü olup olmadığını kontrol eder.
     */
    private boolean hasAdminRole(Authentication auth) {
        String adminAuthority = ROLE_PREFIX + UserRole.ADMIN.name();
        return auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(adminAuthority::equals);
    }
}