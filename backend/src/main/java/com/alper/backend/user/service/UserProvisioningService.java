package com.alper.backend.user.service;

import com.alper.backend.user.model.User;
import com.alper.backend.user.model.UserRole;
import com.alper.backend.user.repository.UserRepository;
import com.alper.backend.user.dto.KeycloakUser;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

@Service
@Log4j2
@RequiredArgsConstructor
public class UserProvisioningService {

    private final UserRepository userRepository;


    @Transactional
    public User provisionFromJwt(Jwt jwt) {
        String keycloakId = resolveKeycloakId(jwt)
                .orElseThrow(() -> new IllegalArgumentException("JWT 'sub' claim'i bulunamadı"));

        String username = jwt.getClaimAsString("preferred_username");
        String email = jwt.getClaimAsString("email");
        String firstName = jwt.getClaimAsString("given_name");
        String lastName = jwt.getClaimAsString("family_name");
        UserRole role = extractRole(jwt);

        return userRepository.findByKeycloakId(keycloakId)
                .map(existing -> updateIfChanged(existing, username, email, firstName, lastName, role))
                .or(() -> findExistingIdentity(username, email)
                        .map(existing -> claimExistingIdentity(existing, keycloakId, username, email, firstName, lastName, role)))
                .orElseGet(() -> createNew(keycloakId, username, email, firstName, lastName, role));
    }

    @Transactional(readOnly = true)
    public Optional<User> findExistingFromJwt(Jwt jwt) {
        return resolveKeycloakId(jwt)
                .flatMap(userRepository::findByKeycloakId)
                .or(() -> findExistingIdentity(
                        jwt.getClaimAsString("preferred_username"),
                        jwt.getClaimAsString("email")));
    }

    private Optional<String> resolveKeycloakId(Jwt jwt) {
        String keycloakId = jwt.getSubject();
        if (keycloakId == null || keycloakId.isBlank()) {
            return Optional.empty();
        }
        return Optional.of(keycloakId);
    }

    private Optional<User> findExistingIdentity(String username, String email) {
        if (username != null && !username.isBlank()) {
            Optional<User> byUsername = userRepository.findByUsername(username);
            if (byUsername.isPresent()) {
                return byUsername;
            }
        }

        if (email != null && !email.isBlank()) {
            return userRepository.findByEmail(email);
        }

        return Optional.empty();
    }

    private User claimExistingIdentity(User user, String keycloakId, String username, String email,
                                       String firstName, String lastName, UserRole role) {
        log.warn("Mevcut kullanıcı yeni Keycloak kimliği ile eşleştiriliyor | userId={} | oldKeycloakId={} | newKeycloakId={}",
                user.getId(), user.getKeycloakId(), keycloakId);
        user.setKeycloakId(keycloakId);
        return updateIfChanged(user, username, email, firstName, lastName, role);
    }

    private User createNew(String keycloakId, String username, String email,
                           String firstName, String lastName, UserRole role) {
        User user = User.builder()
                .keycloakId(keycloakId)
                .username(username)
                .email(email)
                .firstName(firstName)
                .lastName(lastName)
                .role(role)
                .isActive(true)
                .lastLoginAt(LocalDateTime.now())
                .build();

        User saved = userRepository.save(user);
        log.info("Yeni kullanıcı oluşturuldu | keycloakId={} | username={} | role={}",
                keycloakId, username, role);
        return saved;
    }
    @Transactional
    public User syncFromKeycloak(User existingUser, KeycloakUser keycloakUser) {
        if (keycloakUser.getUsername() != null) {
            existingUser.setUsername(keycloakUser.getUsername());
        }
        if (keycloakUser.getEmail() != null) {
            existingUser.setEmail(keycloakUser.getEmail());
        }
        existingUser.setFirstName(keycloakUser.getFirstName());
        existingUser.setLastName(keycloakUser.getLastName());

        User saved = userRepository.save(existingUser);
        log.info("DB kullanıcısı Keycloak ile senkronize edildi | keycloakId={}",
                existingUser.getKeycloakId());
        return saved;
    }
    private User updateIfChanged(User user, String username, String email,
                                 String firstName, String lastName, UserRole role) {
        boolean changed = false;

        if (!Objects.equals(user.getUsername(), username) && username != null) {
            user.setUsername(username);
            changed = true;
        }
        if (!Objects.equals(user.getEmail(), email) && email != null) {
            user.setEmail(email);
            changed = true;
        }
        if (!Objects.equals(user.getFirstName(), firstName)) {
            user.setFirstName(firstName);
            changed = true;
        }
        if (!Objects.equals(user.getLastName(), lastName)) {
            user.setLastName(lastName);
            changed = true;
        }
        if (user.getRole() != role) {
            user.setRole(role);
            changed = true;
            log.info("Kullanıcı rolü güncellendi | keycloakId={} | yeniRol={}",
                    user.getKeycloakId(), role);
        }

        if (changed) {
            user.setLastLoginAt(LocalDateTime.now());
            log.debug("Kullanıcı bilgileri Keycloak ile senkronize edildi | keycloakId={}",
                    user.getKeycloakId());
            return userRepository.save(user);
        }

        return user;
    }

    @SuppressWarnings("unchecked")
    private UserRole extractRole(Jwt jwt) {
        Map<String, Object> realmAccess = jwt.getClaim("realm_access");
        if (realmAccess == null) {
            return UserRole.NORMAL_USER;
        }

        Object rolesObj = realmAccess.get("roles");
        if (!(rolesObj instanceof List)) {
            return UserRole.NORMAL_USER;
        }

        List<String> roles = (List<String>) rolesObj;
        if (roles.contains("ADMIN")) {
            return UserRole.ADMIN;
        }
        return UserRole.NORMAL_USER;
    }
}
