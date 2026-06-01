package com.alper.backend.user.dto;

import java.util.List;

/**
 * Kullanıcının 2FA ve şifre durumunu özetleyen güvenlik durumunu döndürür.
 */
public record SecurityStatusResponse(
        boolean otpEnabled,
        List<OtpCredential> otpCredentials
) {


    public record OtpCredential(
            String id,
            String label,
            Long createdAt
    ) {
    }
}
