package com.alper.backend.user.dto;

import lombok.Builder;
import lombok.Getter;

/**
 * Keycloak admin API'sinden alınan kullanıcı temsilini taşır.
 */
@Getter
@Builder
public class KeycloakUser {
    private String keycloakId;
    private String username;
    private String email;
    private String firstName;
    private String lastName;
}