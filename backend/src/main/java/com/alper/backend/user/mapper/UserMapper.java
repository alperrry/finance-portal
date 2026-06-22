package com.alper.backend.user.mapper;

import com.alper.backend.user.model.User;
import com.alper.backend.user.dto.UserResponse;
import org.springframework.stereotype.Component;

/**
 * Kullanıcı entity'lerini ({@link User}) API yanıt DTO'suna dönüştüren mapper.
 */
@Component
public class UserMapper {

    /**
     * Kullanıcı entity'sini yanıt DTO'suna dönüştürür.
     *
     * @param user kullanıcı kaydı
     * @return oluşturulan yanıt DTO'su
     */
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
                .createdAt(user.getCreatedAt())
                .build();
    }
}
