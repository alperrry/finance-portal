package com.alper.backend.user.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class KeycloakUser {
    private String keycloakId;
    private String username;
    private String email;
    private String firstName;
    private String lastName;
}