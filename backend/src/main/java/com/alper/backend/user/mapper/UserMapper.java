package com.alper.backend.user.mapper;

import com.alper.backend.user.model.User;
import com.alper.backend.user.dto.UserResponse;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

    public UserResponse toResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .role(user.getRole())
                .isActive(user.getIsActive())
                .lastLoginAt(user.getLastLoginAt())
                .balance(user.getBalance())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
