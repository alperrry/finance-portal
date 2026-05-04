package com.alper.backend.user.dto;

import com.alper.backend.user.model.UserRole;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Builder
public class UserResponse {

    private Long id;
    private String username;
    private String email;
    private String firstName;
    private String lastName;
    private UserRole role;
    private Boolean isActive;
    private LocalDateTime lastLoginAt;
    private BigDecimal balance;
    private LocalDateTime createdAt;
}
