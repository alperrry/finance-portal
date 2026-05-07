package com.alper.backend.common.websocket;

import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.lang.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * STOMP CONNECT frame'inde gelen "Authorization: Bearer ..." header'ını doğrular ve
 * geçerli ise StompHeaderAccessor üzerine Principal set eder. Sonraki SUBSCRIBE / SEND
 * komutlarında kullanıcı kimliği bu Principal üzerinden taşınır.
 *
 * <p>Geçersiz veya eksik token durumunda MessagingException fırlatılarak handshake reddedilir.
 * Bu sayede /topic/* dahil hiçbir destinasyona anonim abone olunamaz.</p>
 */
@Component
@RequiredArgsConstructor
@Log4j2
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtDecoder jwtDecoder;
    private final JwtAuthenticationConverter jwtAuthenticationConverter;

    @Override
    public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            authenticate(accessor);
        } else if (requiresAuthenticatedUser(accessor.getCommand()) && accessor.getUser() == null) {
            log.warn("WebSocket: kimlik doğrulanmamış kullanıcı erişim denedi. command={}", accessor.getCommand());
            throw new MessagingException("Kimlik doğrulanmamış WebSocket isteği reddedildi.");
        }

        return message;
    }

    private void authenticate(StompHeaderAccessor accessor) {
        List<String> authHeaders = accessor.getNativeHeader(AUTHORIZATION_HEADER);

        if (authHeaders == null || authHeaders.isEmpty()) {
            log.warn("WebSocket CONNECT reddedildi: Authorization header bulunamadı.");
            throw new MessagingException("Authorization header zorunludur.");
        }

        String authHeader = authHeaders.get(0);
        if (authHeader == null || !authHeader.startsWith(BEARER_PREFIX)) {
            log.warn("WebSocket CONNECT reddedildi: Bearer token formatı geçersiz.");
            throw new MessagingException("Geçersiz Authorization header formatı.");
        }

        String token = authHeader.substring(BEARER_PREFIX.length()).trim();

        try {
            Jwt jwt = jwtDecoder.decode(token);
            AbstractAuthenticationToken authentication = jwtAuthenticationConverter.convert(jwt);
            accessor.setUser(authentication);
            log.debug("WebSocket CONNECT başarılı. subject={}", jwt.getSubject());
        } catch (JwtException e) {
            log.warn("WebSocket CONNECT reddedildi: JWT doğrulanamadı.", e);
            throw new MessagingException("Geçersiz JWT.", e);
        }
    }

    private boolean requiresAuthenticatedUser(StompCommand command) {
        return StompCommand.SUBSCRIBE.equals(command)
                || StompCommand.SEND.equals(command)
                || StompCommand.UNSUBSCRIBE.equals(command);
    }
}