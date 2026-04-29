package com.alper.backend.user.controller;

import com.alper.backend.common.web.ApiResponse;
import com.alper.backend.common.exception.NotFoundException;
import com.alper.backend.user.model.User;
import com.alper.backend.user.repository.UserRepository;
import com.alper.backend.user.dto.KeycloakUser;
import com.alper.backend.user.dto.UpdateUserRequest;
import com.alper.backend.user.dto.UserResponse;
import com.alper.backend.user.mapper.UserMapper;
import com.alper.backend.user.security.CurrentUser;
import com.alper.backend.user.service.KeycloakAdminService;
import com.alper.backend.user.service.UserProvisioningService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@Log4j2
@RequiredArgsConstructor
public class UserController {
    private final UserProvisioningService userProvisioningService;
    private final UserMapper userMapper;
    private final UserRepository userRepository;
    private final KeycloakAdminService keycloakAdminService;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser(@CurrentUser User user) {
        if (user == null) {
            log.warn("Kullanıcı bilgisi alınamadı | currentUser attribute null");
            throw new NotFoundException("Oturum açmış kullanıcı bulunamadı");
        }

        log.debug("Kullanıcı profili döndürülüyor | keycloakId={}", user.getKeycloakId());
        return ResponseEntity.ok(ApiResponse.success(userMapper.toResponse(user)));
    }
    @PutMapping("/me")
    @Transactional
    public ResponseEntity<ApiResponse<UserResponse>> updateCurrentUser(
            @CurrentUser User user,
            @Valid @RequestBody UpdateUserRequest request) {

        if (user == null) {
            log.warn("Kullanıcı güncellenemedi | currentUser attribute null");
            throw new NotFoundException("Oturum açmış kullanıcı bulunamadı");
        }

        log.info("Kullanıcı profil güncelleme talebi | keycloakId={}", user.getKeycloakId());

        // 1. Keycloak'ta güncelle
        keycloakAdminService.updateUser(
                user.getKeycloakId(),
                request.getFirstName(),
                request.getLastName(),
                request.getEmail()
        );

        // 2. Keycloak'tan güncel veriyi çek (token'a güvenmiyoruz)
        KeycloakUser keycloakUser = keycloakAdminService.getUserById(user.getKeycloakId());

        // 3. DB'yi bu veriyle güncelle
        User updated = userProvisioningService.syncFromKeycloak(user, keycloakUser);

        return ResponseEntity.ok(ApiResponse.success(userMapper.toResponse(updated)));
    }
}