package com.alper.backend.user.security;

import com.alper.backend.user.model.User;
import com.alper.backend.user.service.UserProvisioningService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Log4j2
@RequiredArgsConstructor
public class UserProvisioningFilter extends OncePerRequestFilter {

    public static final String CURRENT_USER_ATTRIBUTE = "currentUser";

    private final UserProvisioningService userProvisioningService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication instanceof JwtAuthenticationToken jwtAuth) {
            Jwt jwt = jwtAuth.getToken();
            try {
                User user = userProvisioningService.provisionFromJwt(jwt);
                request.setAttribute(CURRENT_USER_ATTRIBUTE, user);
            } catch (Exception ex) {
                log.error("Kullanıcı provisioning başarısız | uri={}",
                        request.getRequestURI(), ex);
                userProvisioningService.findExistingFromJwt(jwt)
                        .ifPresent(user -> request.setAttribute(CURRENT_USER_ATTRIBUTE, user));
            }
        }

        filterChain.doFilter(request, response);
    }
}
